/**
 * DataLoader Pattern Implementation
 * Batches and caches database queries to prevent N+1 problems
 * Based on Facebook's DataLoader pattern
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';

// Database table row types
type Profile = Database['public']['Tables']['profiles']['Row'];
type KnowledgeGraph = any; // Database['public']['Tables']['knowledge_graphs']['Row'];
type Citation = any; // Database['public']['Tables']['citations']['Row'];
type APIKey = any; // Database['public']['Tables']['api_keys']['Row'];
type Audit = Database['public']['Tables']['audits']['Row'];

export interface DataLoaderOptions<K, V> {
  batchFn: (keys: K[]) => Promise<V[]>;
  maxBatchSize?: number;
  cacheKeyFn?: (key: K) => string;
  cache?: boolean;
}

export class DataLoader<K, V> {
  private batchFn: (keys: K[]) => Promise<V[]>;
  private maxBatchSize: number;
  private cacheKeyFn: (key: K) => string;
  private cache: Map<string, Promise<V>>;
  private queue: Array<{
    key: K;
    resolve: (value: V) => void;
    reject: (error: Error) => void;
  }>;
  private batchScheduled: boolean;
  private cacheEnabled: boolean;

  constructor(options: DataLoaderOptions<K, V>) {
    this.batchFn = options.batchFn;
    this.maxBatchSize = options.maxBatchSize || 100;
    this.cacheKeyFn = options.cacheKeyFn || ((key: K) => JSON.stringify(key));
    this.cache = new Map();
    this.queue = [];
    this.batchScheduled = false;
    this.cacheEnabled = options.cache !== false;
  }

  /**
   * Load a single value by key
   */
  async load(key: K): Promise<V> {
    const cacheKey = this.cacheKeyFn(key);

    // Check cache first
    if (this.cacheEnabled && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Create promise for this key
    const promise = new Promise<V>((resolve, reject) => {
      this.queue.push({ key, resolve, reject });

      // Schedule batch execution
      if (!this.batchScheduled) {
        this.batchScheduled = true;
        process.nextTick(() => this.executeBatch());
      }
    });

    // Cache the promise
    if (this.cacheEnabled) {
      this.cache.set(cacheKey, promise);
    }

    return promise;
  }

  /**
   * Load multiple values by keys
   */
  async loadMany(keys: K[]): Promise<V[]> {
    return Promise.all(keys.map(key => this.load(key)));
  }

  /**
   * Clear cache for specific key
   */
  clear(key: K): void {
    const cacheKey = this.cacheKeyFn(key);
    this.cache.delete(cacheKey);
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Prime cache with value
   */
  prime(key: K, value: V): void {
    const cacheKey = this.cacheKeyFn(key);
    this.cache.set(cacheKey, Promise.resolve(value));
  }

  /**
   * Execute batched queries
   */
  private async executeBatch(): Promise<void> {
    this.batchScheduled = false;

    // Get current queue and reset
    const queue = this.queue.slice();
    this.queue = [];

    if (queue.length === 0) return;

    // Split into batches if needed
    const batches: typeof queue[] = [];
    for (let i = 0; i < queue.length; i += this.maxBatchSize) {
      batches.push(queue.slice(i, i + this.maxBatchSize));
    }

    // Execute each batch
    for (const batch of batches) {
      try {
        const keys = batch.map(item => item.key);
        const values = await this.batchFn(keys);

        // Resolve each promise
        batch.forEach((item, index) => {
          if (values[index] !== undefined) {
            item.resolve(values[index]);
          } else {
            item.reject(new Error(`No value found for key: ${JSON.stringify(item.key)}`));
          }
        });
      } catch (error) {
        // Reject all promises in batch
        batch.forEach(item => {
          item.reject(error as Error);
        });
      }
    }
  }
}

/**
 * Create DataLoader for profiles
 */
export function createProfileLoader(supabase: SupabaseClient<Database>) {
  return new DataLoader<string, Profile | undefined>({
    batchFn: async (userIds: string[]) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (error) throw error;

      // Create map for O(1) lookup
      const profileMap = new Map(data.map((profile: any) => [profile.id, profile]));

      // Return in same order as input keys
      return userIds.map(id => profileMap.get(id));
    },
    cacheKeyFn: (userId: string) => `profile:${userId}`,
  });
}

/**
 * Create DataLoader for knowledge graphs
 */
export function createKnowledgeGraphLoader(supabase: SupabaseClient<Database>) {
  return new DataLoader<string, KnowledgeGraph | undefined>({
    batchFn: async (kgIds: string[]) => {
      const { data, error } = await supabase
        .from('knowledge_graphs')
        .select('*')
        .in('id', kgIds)
        .is('deleted_at', null);

      if (error) throw error;

      const kgMap = new Map(data.map((kg: any) => [kg.id, kg]));
      return kgIds.map(id => kgMap.get(id));
    },
    cacheKeyFn: (kgId: string) => `kg:${kgId}`,
  });
}

/**
 * Create DataLoader for citations by knowledge graph
 */
export function createCitationsByKGLoader(supabase: SupabaseClient<Database>) {
  return new DataLoader<string, Citation[]>({
    batchFn: async (kgIds: string[]) => {
      const { data, error } = await supabase
        .from('citations')
        .select('*')
        .in('knowledge_graph_id', kgIds)
        .is('deleted_at', null)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      // Group citations by knowledge_graph_id
      const citationsByKG = new Map<string, Citation[]>();
      data.forEach((citation: any) => {
        const kgId = citation.knowledge_graph_id;
        if (!citationsByKG.has(kgId)) {
          citationsByKG.set(kgId, []);
        }
        citationsByKG.get(kgId)!.push(citation);
      });

      // Return in same order as input keys
      return kgIds.map(id => citationsByKG.get(id) || []);
    },
    cacheKeyFn: (kgId: string) => `citations:kg:${kgId}`,
  });
}

/**
 * Create DataLoader for API keys
 */
export function createAPIKeyLoader(supabase: SupabaseClient<Database>) {
  return new DataLoader<string, APIKey | undefined>({
    batchFn: async (keyIds: string[]) => {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .in('id', keyIds)
        .eq('revoked', false);

      if (error) throw error;

      const keyMap = new Map((data as any).map((key: any) => [key.id, key]));
      return keyIds.map(id => keyMap.get(id));
    },
    cacheKeyFn: (keyId: string) => `apikey:${keyId}`,
  });
}

/**
 * Create DataLoader for audits by user
 */
export function createAuditsByUserLoader(supabase: SupabaseClient<Database>) {
  return new DataLoader<string, Audit[]>({
    batchFn: async (userIds: string[]) => {
      const { data, error } = await supabase
        .from('audits')
        .select('*')
        .in('user_id', userIds)
        .is('deleted_at', null)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Group audits by user_id
      const auditsByUser = new Map<string, Audit[]>();
      (data as any).forEach((audit: any) => {
        const userId = audit.user_id;
        if (!auditsByUser.has(userId)) {
          auditsByUser.set(userId, []);
        }
        auditsByUser.get(userId)!.push(audit);
      });

      return userIds.map(id => auditsByUser.get(id) || []);
    },
    cacheKeyFn: (userId: string) => `audits:user:${userId}`,
  });
}

/**
 * DataLoader context for request-scoped loaders
 */
export interface DataLoaderContext {
  profileLoader: DataLoader<string, Profile | undefined>;
  knowledgeGraphLoader: DataLoader<string, KnowledgeGraph | undefined>;
  citationsByKGLoader: DataLoader<string, Citation[]>;
  apiKeyLoader: DataLoader<string, APIKey | undefined>;
  auditsByUserLoader: DataLoader<string, Audit[]>;
}

/**
 * Create DataLoader context for a request
 */
export function createDataLoaderContext(supabase: SupabaseClient<Database>): DataLoaderContext {
  return {
    profileLoader: createProfileLoader(supabase),
    knowledgeGraphLoader: createKnowledgeGraphLoader(supabase),
    citationsByKGLoader: createCitationsByKGLoader(supabase),
    apiKeyLoader: createAPIKeyLoader(supabase),
    auditsByUserLoader: createAuditsByUserLoader(supabase),
  };
}
