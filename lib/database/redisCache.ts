/**
 * Redis Caching Layer
 * High-performance caching for hot data with automatic invalidation
 * Production-ready with connection pooling and error handling
 */

// @ts-expect-error - redis types may not be available in all environments
import { createClient, RedisClientType } from 'redis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
}

export class RedisCache {
  private client: RedisClientType | null = null;
  private connected: boolean = false;
  private stats: { hits: number; misses: number } = { hits: 0, misses: 0 };
  private defaultTTL: number = 3600; // 1 hour default
  private keyPrefix: string = 'anoteros:';

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Redis connection
   */
  private async initialize(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL || process.env.VITE_REDIS_URL;
      
      if (!redisUrl) {
        console.warn('Redis not configured: Missing REDIS_URL. Caching disabled.');
        return;
      }

      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries: number) => {
            if (retries > 10) {
              console.error('Redis: Max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            // Exponential backoff: 100ms, 200ms, 400ms, ...
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.client.on('error', (err: Error) => {
        console.error('Redis Client Error:', err);
        this.connected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis: Connected');
        this.connected = true;
      });

      this.client.on('disconnect', () => {
        console.log('Redis: Disconnected');
        this.connected = false;
      });

      await this.client.connect();
    } catch (error) {
      console.error('Redis initialization error:', error);
      this.client = null;
      this.connected = false;
    }
  }

  /**
   * Check if Redis is connected
   */
  isConnected(): boolean {
    return this.connected && this.client !== null;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected()) {
      this.stats.misses++;
      return null;
    }

    try {
      const fullKey = this.keyPrefix + key;
      const value = await this.client!.get(fullKey);

      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Redis get error:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    try {
      const fullKey = this.keyPrefix + key;
      const serialized = JSON.stringify(value);
      const ttl = options?.ttl || this.defaultTTL;

      await this.client!.setEx(fullKey, ttl, serialized);
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    try {
      const fullKey = this.keyPrefix + key;
      await this.client!.del(fullKey);
      return true;
    } catch (error) {
      console.error('Redis del error:', error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern
   */
  async delPattern(pattern: string): Promise<number> {
    if (!this.isConnected()) {
      return 0;
    }

    try {
      const fullPattern = this.keyPrefix + pattern;
      const keys = await this.client!.keys(fullPattern);
      
      if (keys.length === 0) return 0;

      await this.client!.del(keys);
      return keys.length;
    } catch (error) {
      console.error('Redis delPattern error:', error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    try {
      const fullKey = this.keyPrefix + key;
      const result = await this.client!.exists(fullKey);
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  /**
   * Get or set pattern (cache-aside)
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch from source
    const value = await fetchFn();

    // Store in cache (fire and forget)
    this.set(key, value, options).catch(err => {
      console.error('Cache set error in getOrSet:', err);
    });

    return value;
  }

  /**
   * Increment counter
   */
  async incr(key: string): Promise<number> {
    if (!this.isConnected()) {
      return 0;
    }

    try {
      const fullKey = this.keyPrefix + key;
      return await this.client!.incr(fullKey);
    } catch (error) {
      console.error('Redis incr error:', error);
      return 0;
    }
  }

  /**
   * Decrement counter
   */
  async decr(key: string): Promise<number> {
    if (!this.isConnected()) {
      return 0;
    }

    try {
      const fullKey = this.keyPrefix + key;
      return await this.client!.decr(fullKey);
    } catch (error) {
      console.error('Redis decr error:', error);
      return 0;
    }
  }

  /**
   * Set expiration on key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    try {
      const fullKey = this.keyPrefix + key;
      await this.client!.expire(fullKey, seconds);
      return true;
    } catch (error) {
      console.error('Redis expire error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      totalRequests,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Flush all cache
   */
  async flushAll(): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    try {
      await this.client!.flushAll();
      return true;
    } catch (error) {
      console.error('Redis flushAll error:', error);
      return false;
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.connected = false;
    }
  }
}

// Singleton instance
let cacheInstance: RedisCache | null = null;

/**
 * Get Redis cache instance
 */
export function getRedisCache(): RedisCache {
  if (!cacheInstance) {
    cacheInstance = new RedisCache();
  }
  return cacheInstance;
}

/**
 * Cache key generators for common patterns
 */
export const CacheKeys = {
  profile: (userId: string) => `profile:${userId}`,
  knowledgeGraph: (kgId: string) => `kg:${kgId}`,
  currentKG: (userId: string, domain: string) => `kg:current:${userId}:${domain}`,
  citations: (kgId: string) => `citations:kg:${kgId}`,
  audit: (auditId: string) => `audit:${auditId}`,
  userAudits: (userId: string) => `audits:user:${userId}`,
  apiKey: (keyId: string) => `apikey:${keyId}`,
  globalEntity: (normalizedName: string) => `global:entity:${normalizedName}`,
  usageStats: (userId: string, date: string) => `usage:${userId}:${date}`,
  subscription: (userId: string) => `subscription:${userId}`,
};

/**
 * Cache TTL constants (in seconds)
 */
export const CacheTTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
  WEEK: 604800, // 7 days
};

/**
 * Invalidation strategies
 */
export const CacheInvalidation = {
  /**
   * Invalidate profile cache
   */
  async profile(userId: string): Promise<void> {
    const cache = getRedisCache();
    await cache.del(CacheKeys.profile(userId));
  },

  /**
   * Invalidate knowledge graph cache
   */
  async knowledgeGraph(userId: string, domain: string): Promise<void> {
    const cache = getRedisCache();
    await cache.delPattern(`kg:*:${userId}:${domain}`);
  },

  /**
   * Invalidate citations cache
   */
  async citations(kgId: string): Promise<void> {
    const cache = getRedisCache();
    await cache.del(CacheKeys.citations(kgId));
  },

  /**
   * Invalidate user audits cache
   */
  async userAudits(userId: string): Promise<void> {
    const cache = getRedisCache();
    await cache.delPattern(`audits:user:${userId}*`);
  },

  /**
   * Invalidate all user-related caches
   */
  async allUserData(userId: string): Promise<void> {
    const cache = getRedisCache();
    await Promise.all([
      cache.del(CacheKeys.profile(userId)),
      cache.delPattern(`kg:*:${userId}:*`),
      cache.delPattern(`audits:user:${userId}*`),
      cache.delPattern(`usage:${userId}:*`),
    ]);
  },
};
