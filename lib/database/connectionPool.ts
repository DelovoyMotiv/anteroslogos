/**
 * Database Connection Pooling Configuration
 * Optimizes database connections for high-load scenarios
 * Production-ready with monitoring and health checks
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';

export interface PoolConfig {
  minConnections: number;
  maxConnections: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
  statementTimeoutMs: number;
}

export interface PoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  totalRequests: number;
  avgResponseTime: number;
}

/**
 * Connection pool manager for Supabase
 */
export class ConnectionPool {
  private config: PoolConfig;
  private clients: SupabaseClient<Database>[] = [];
  private availableClients: SupabaseClient<Database>[] = [];
  private stats: {
    totalRequests: number;
    totalResponseTime: number;
    waitingRequests: number;
  } = {
    totalRequests: 0,
    totalResponseTime: 0,
    waitingRequests: 0,
  };

  constructor(config?: Partial<PoolConfig>) {
    this.config = {
      minConnections: config?.minConnections || 2,
      maxConnections: config?.maxConnections || 10,
      idleTimeoutMs: config?.idleTimeoutMs || 30000,
      connectionTimeoutMs: config?.connectionTimeoutMs || 5000,
      statementTimeoutMs: config?.statementTimeoutMs || 30000,
    };

    this.initialize();
  }

  /**
   * Initialize connection pool
   */
  private initialize(): void {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase not configured for connection pooling');
      return;
    }

    // Create minimum connections
    for (let i = 0; i < this.config.minConnections; i++) {
      const client = this.createClient(supabaseUrl, supabaseKey);
      this.clients.push(client);
      this.availableClients.push(client);
    }

    console.log(`Connection pool initialized with ${this.config.minConnections} connections`);
  }

  /**
   * Create a new Supabase client
   */
  private createClient(url: string, key: string): SupabaseClient<Database> {
    return createClient<Database>(url, key, {
      auth: {
        autoRefreshToken: true,
        persistSession: false, // Server-side, no session persistence
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'X-Client-Info': 'anoteros-connection-pool',
        },
      },
    });
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(): Promise<SupabaseClient<Database>> {
    const startTime = Date.now();
    this.stats.waitingRequests++;

    try {
      // Try to get available connection
      if (this.availableClients.length > 0) {
        const client = this.availableClients.pop()!;
        this.stats.waitingRequests--;
        this.stats.totalRequests++;
        return client;
      }

      // Create new connection if under max
      if (this.clients.length < this.config.maxConnections) {
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Supabase not configured');
        }

        const client = this.createClient(supabaseUrl, supabaseKey);
        this.clients.push(client);
        this.stats.waitingRequests--;
        this.stats.totalRequests++;
        return client;
      }

      // Wait for available connection
      const client = await this.waitForConnection();
      this.stats.waitingRequests--;
      this.stats.totalRequests++;
      
      const responseTime = Date.now() - startTime;
      this.stats.totalResponseTime += responseTime;
      
      return client;
    } catch (error) {
      this.stats.waitingRequests--;
      throw error;
    }
  }

  /**
   * Release a connection back to the pool
   */
  release(client: SupabaseClient<Database>): void {
    if (!this.clients.includes(client)) {
      console.warn('Attempted to release unknown client');
      return;
    }

    this.availableClients.push(client);
  }

  /**
   * Wait for an available connection
   */
  private async waitForConnection(): Promise<SupabaseClient<Database>> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout: No available connections'));
      }, this.config.connectionTimeoutMs);

      const checkInterval = setInterval(() => {
        if (this.availableClients.length > 0) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          resolve(this.availableClients.pop()!);
        }
      }, 100);
    });
  }

  /**
   * Execute query with automatic connection management
   */
  async execute<T>(
    queryFn: (client: SupabaseClient<Database>) => Promise<T>
  ): Promise<T> {
    const client = await this.acquire();
    
    try {
      const result = await queryFn(client);
      return result;
    } finally {
      this.release(client);
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): PoolStats {
    const avgResponseTime = this.stats.totalRequests > 0
      ? this.stats.totalResponseTime / this.stats.totalRequests
      : 0;

    return {
      totalConnections: this.clients.length,
      activeConnections: this.clients.length - this.availableClients.length,
      idleConnections: this.availableClients.length,
      waitingRequests: this.stats.waitingRequests,
      totalRequests: this.stats.totalRequests,
      avgResponseTime,
    };
  }

  /**
   * Health check for pool
   */
  async healthCheck(): Promise<boolean> {
    try {
      const client = await this.acquire();
      
      // Simple query to test connection
      const { error } = await client.from('profiles').select('id').limit(1);
      
      this.release(client);
      
      return !error;
    } catch (error) {
      console.error('Connection pool health check failed:', error);
      return false;
    }
  }

  /**
   * Drain pool (close all connections)
   */
  async drain(): Promise<void> {
    console.log('Draining connection pool...');
    
    // Wait for all active connections to be released
    while (this.availableClients.length < this.clients.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Clear all connections
    this.clients = [];
    this.availableClients = [];
    
    console.log('Connection pool drained');
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      totalResponseTime: 0,
      waitingRequests: 0,
    };
  }
}

// Singleton instance
let poolInstance: ConnectionPool | null = null;

/**
 * Get connection pool instance
 */
export function getConnectionPool(config?: Partial<PoolConfig>): ConnectionPool {
  if (!poolInstance) {
    poolInstance = new ConnectionPool(config);
  }
  return poolInstance;
}

/**
 * Supabase connection pooler configuration
 * For use with Supabase's built-in connection pooler
 */
export const SupabasePoolerConfig = {
  /**
   * Transaction mode pooler URL
   * Use for short-lived transactions
   */
  getTransactionUrl(): string {
    const url = process.env.SUPABASE_POOLER_URL || process.env.VITE_SUPABASE_POOLER_URL;
    if (!url) {
      throw new Error('SUPABASE_POOLER_URL not configured');
    }
    return url.replace('5432', '6543'); // Pooler port
  },

  /**
   * Session mode pooler URL
   * Use for long-lived connections
   */
  getSessionUrl(): string {
    const url = process.env.SUPABASE_POOLER_URL || process.env.VITE_SUPABASE_POOLER_URL;
    if (!url) {
      throw new Error('SUPABASE_POOLER_URL not configured');
    }
    return url.replace('5432', '5432'); // Direct connection port
  },

  /**
   * Recommended pool sizes based on plan
   */
  getRecommendedPoolSize(plan: 'free' | 'pro' | 'agency'): PoolConfig {
    const configs = {
      free: {
        minConnections: 2,
        maxConnections: 5,
        idleTimeoutMs: 30000,
        connectionTimeoutMs: 5000,
        statementTimeoutMs: 30000,
      },
      pro: {
        minConnections: 5,
        maxConnections: 20,
        idleTimeoutMs: 60000,
        connectionTimeoutMs: 10000,
        statementTimeoutMs: 60000,
      },
      agency: {
        minConnections: 10,
        maxConnections: 50,
        idleTimeoutMs: 120000,
        connectionTimeoutMs: 15000,
        statementTimeoutMs: 120000,
      },
    };

    return configs[plan];
  },
};

/**
 * Monitor connection pool health
 */
export async function monitorConnectionPool(
  pool: ConnectionPool,
  intervalMs: number = 60000
): Promise<() => void> {
  const interval = setInterval(async () => {
    const stats = pool.getStats();
    const healthy = await pool.healthCheck();

    console.log('Connection Pool Stats:', {
      ...stats,
      healthy,
      timestamp: new Date().toISOString(),
    });

    // Alert if pool is unhealthy
    if (!healthy) {
      console.error('Connection pool health check failed!');
    }

    // Alert if too many waiting requests
    if (stats.waitingRequests > 10) {
      console.warn(`High number of waiting requests: ${stats.waitingRequests}`);
    }

    // Alert if average response time is high
    if (stats.avgResponseTime > 1000) {
      console.warn(`High average response time: ${stats.avgResponseTime}ms`);
    }
  }, intervalMs);

  // Return cleanup function
  return () => clearInterval(interval);
}
