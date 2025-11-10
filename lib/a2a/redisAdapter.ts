/**
 * Redis Adapter - Production persistence layer
 * Replaces in-memory Map() storage with Redis
 * Compatible with existing interfaces
 */

import type { RegisteredAgent } from './agentRegistry';
import type { A2ARateLimitConfig } from './protocol';

// =====================================================
// TYPES
// =====================================================

interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number; NX?: boolean }): Promise<string | null>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, field: string, value: string): Promise<number>;
  hdel(key: string, field: string): Promise<number>;
  hgetall(key: string): Promise<Record<string, string>>;
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  scan(cursor: number, options?: { MATCH?: string; COUNT?: number }): Promise<[string, string[]]>;
}

// =====================================================
// REDIS CLIENT FACTORY
// =====================================================

/**
 * Create Redis client
 * Uses ioredis in production, mock for development
 */
export function createRedisClient(): RedisClient {
  // Check if Redis URL is configured
  const redisUrl = process.env.REDIS_URL || process.env.VITE_REDIS_URL;
  
  if (redisUrl) {
    // Production: Use real Redis
    try {
      const Redis = require('ioredis');
      const client = new Redis(redisUrl, {
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
      });
      
      client.on('error', (err: Error) => {
        console.error('Redis connection error:', err);
      });
      
      client.on('connect', () => {
        console.log('✅ Redis connected');
      });
      
      return client;
    } catch (error) {
      console.warn('Redis module not found, using in-memory fallback');
      return createMockRedisClient();
    }
  }
  
  // Development: Use in-memory mock
  console.warn('No REDIS_URL configured, using in-memory storage (not production-safe)');
  return createMockRedisClient();
}

/**
 * Mock Redis client for development
 * Compatible with Redis interface
 */
function createMockRedisClient(): RedisClient {
  const storage = new Map<string, string>();
  const hashes = new Map<string, Map<string, string>>();
  const expiries = new Map<string, number>();
  
  // Cleanup expired keys every minute
  setInterval(() => {
    const now = Date.now();
    for (const [key, expiry] of expiries.entries()) {
      if (expiry < now) {
        storage.delete(key);
        hashes.delete(key);
        expiries.delete(key);
      }
    }
  }, 60000);
  
  return {
    async get(key: string): Promise<string | null> {
      const expiry = expiries.get(key);
      if (expiry && expiry < Date.now()) {
        storage.delete(key);
        expiries.delete(key);
        return null;
      }
      return storage.get(key) || null;
    },
    
    async set(key: string, value: string, options?: { EX?: number; NX?: boolean }): Promise<string | null> {
      if (options?.NX && storage.has(key)) {
        return null; // Key exists, NX mode
      }
      
      storage.set(key, value);
      
      if (options?.EX) {
        expiries.set(key, Date.now() + (options.EX * 1000));
      }
      
      return 'OK';
    },
    
    async del(key: string): Promise<number> {
      const existed = storage.has(key) || hashes.has(key);
      storage.delete(key);
      hashes.delete(key);
      expiries.delete(key);
      return existed ? 1 : 0;
    },
    
    async exists(key: string): Promise<number> {
      return storage.has(key) || hashes.has(key) ? 1 : 0;
    },
    
    async hget(key: string, field: string): Promise<string | null> {
      const hash = hashes.get(key);
      return hash?.get(field) || null;
    },
    
    async hset(key: string, field: string, value: string): Promise<number> {
      let hash = hashes.get(key);
      if (!hash) {
        hash = new Map();
        hashes.set(key, hash);
      }
      const isNew = !hash.has(field);
      hash.set(field, value);
      return isNew ? 1 : 0;
    },
    
    async hdel(key: string, field: string): Promise<number> {
      const hash = hashes.get(key);
      if (!hash) return 0;
      const existed = hash.has(field);
      hash.delete(field);
      if (hash.size === 0) {
        hashes.delete(key);
      }
      return existed ? 1 : 0;
    },
    
    async hgetall(key: string): Promise<Record<string, string>> {
      const hash = hashes.get(key);
      if (!hash) return {};
      return Object.fromEntries(hash.entries());
    },
    
    async incr(key: string): Promise<number> {
      const current = parseInt(storage.get(key) || '0', 10);
      const next = current + 1;
      storage.set(key, next.toString());
      return next;
    },
    
    async decr(key: string): Promise<number> {
      const current = parseInt(storage.get(key) || '0', 10);
      const next = current - 1;
      storage.set(key, next.toString());
      return next;
    },
    
    async expire(key: string, seconds: number): Promise<number> {
      if (!storage.has(key) && !hashes.has(key)) {
        return 0;
      }
      expiries.set(key, Date.now() + (seconds * 1000));
      return 1;
    },
    
    async ttl(key: string): Promise<number> {
      const expiry = expiries.get(key);
      if (!expiry) return -1; // No expiry set
      const remaining = Math.floor((expiry - Date.now()) / 1000);
      return remaining > 0 ? remaining : -2; // -2 means expired
    },
    
    async keys(pattern: string): Promise<string[]> {
      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
      const allKeys = [...storage.keys(), ...hashes.keys()];
      return allKeys.filter(key => regex.test(key));
    },
    
    async scan(cursor: number, options?: { MATCH?: string; COUNT?: number }): Promise<[string, string[]]> {
      const allKeys = [...storage.keys(), ...hashes.keys()];
      const count = options?.COUNT || 10;
      const start = cursor;
      const end = Math.min(start + count, allKeys.length);
      
      let keys = allKeys.slice(start, end);
      
      if (options?.MATCH) {
        const regex = new RegExp('^' + options.MATCH.replace('*', '.*') + '$');
        keys = keys.filter(key => regex.test(key));
      }
      
      const nextCursor = end >= allKeys.length ? '0' : end.toString();
      return [nextCursor, keys];
    },
  };
}

// =====================================================
// AGENT REGISTRY PERSISTENCE
// =====================================================

export class RedisAgentRegistry {
  constructor(private redis: RedisClient) {}
  
  private agentKey(id: string): string {
    return `agent:${id}`;
  }
  
  private apiKeyIndexKey(apiKey: string): string {
    return `agent_api_key:${apiKey}`;
  }
  
  private nameIndexKey(name: string): string {
    return `agent_name:${name.toLowerCase()}`;
  }
  
  async saveAgent(agent: RegisteredAgent): Promise<void> {
    await this.redis.set(this.agentKey(agent.id), JSON.stringify(agent));
    
    if (agent.api_key) {
      await this.redis.set(this.apiKeyIndexKey(agent.api_key), agent.id);
    }
    
    await this.redis.set(this.nameIndexKey(agent.name), agent.id);
  }
  
  async getAgent(id: string): Promise<RegisteredAgent | null> {
    const data = await this.redis.get(this.agentKey(id));
    return data ? JSON.parse(data) : null;
  }
  
  async getAgentByApiKey(apiKey: string): Promise<RegisteredAgent | null> {
    const agentId = await this.redis.get(this.apiKeyIndexKey(apiKey));
    if (!agentId) return null;
    return this.getAgent(agentId);
  }
  
  async getAgentByName(name: string): Promise<RegisteredAgent | null> {
    const agentId = await this.redis.get(this.nameIndexKey(name));
    if (!agentId) return null;
    return this.getAgent(agentId);
  }
  
  async updateAgent(id: string, updates: Partial<RegisteredAgent>): Promise<boolean> {
    const agent = await this.getAgent(id);
    if (!agent) return false;
    
    const updated = { ...agent, ...updates };
    await this.saveAgent(updated);
    return true;
  }
  
  async deleteAgent(id: string): Promise<boolean> {
    const agent = await this.getAgent(id);
    if (!agent) return false;
    
    await this.redis.del(this.agentKey(id));
    if (agent.api_key) {
      await this.redis.del(this.apiKeyIndexKey(agent.api_key));
    }
    await this.redis.del(this.nameIndexKey(agent.name));
    
    return true;
  }
}

// =====================================================
// CACHE PERSISTENCE
// =====================================================

export class RedisCache {
  constructor(private redis: RedisClient) {}
  
  private cacheKey(namespace: string, identifier: string): string {
    return `cache:${namespace}:${identifier}`;
  }
  
  async set<T>(namespace: string, identifier: string, value: T, ttlSeconds?: number): Promise<void> {
    const key = this.cacheKey(namespace, identifier);
    const data = JSON.stringify({
      value,
      created_at: Date.now(),
      etag: this.generateETag(value),
    });
    
    if (ttlSeconds) {
      await this.redis.set(key, data, { EX: ttlSeconds });
    } else {
      await this.redis.set(key, data);
    }
  }
  
  async get<T>(namespace: string, identifier: string): Promise<{ value: T; etag: string } | null> {
    const key = this.cacheKey(namespace, identifier);
    const data = await this.redis.get(key);
    
    if (!data) return null;
    
    try {
      const parsed = JSON.parse(data);
      return {
        value: parsed.value,
        etag: parsed.etag,
      };
    } catch {
      return null;
    }
  }
  
  async delete(namespace: string, identifier: string): Promise<boolean> {
    const key = this.cacheKey(namespace, identifier);
    const result = await this.redis.del(key);
    return result > 0;
  }
  
  async has(namespace: string, identifier: string): Promise<boolean> {
    const key = this.cacheKey(namespace, identifier);
    const result = await this.redis.exists(key);
    return result > 0;
  }
  
  private generateETag(value: any): string {
    const json = JSON.stringify(value);
    let hash = 0;
    for (let i = 0; i < json.length; i++) {
      const char = json.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `"${Math.abs(hash).toString(36)}"`;
  }
}

// =====================================================
// RATE LIMITER PERSISTENCE
// =====================================================

export class RedisRateLimiter {
  constructor(private redis: RedisClient) {}
  
  private bucketKey(apiKey: string): string {
    return `ratelimit:${apiKey}`;
  }
  
  async getTokens(apiKey: string): Promise<number> {
    const data = await this.redis.hget(this.bucketKey(apiKey), 'tokens');
    return data ? parseFloat(data) : 0;
  }
  
  async setTokens(apiKey: string, tokens: number): Promise<void> {
    await this.redis.hset(this.bucketKey(apiKey), 'tokens', tokens.toString());
  }
  
  async getLastRefill(apiKey: string): Promise<number> {
    const data = await this.redis.hget(this.bucketKey(apiKey), 'lastRefill');
    return data ? parseInt(data, 10) : Date.now();
  }
  
  async setLastRefill(apiKey: string, timestamp: number): Promise<void> {
    await this.redis.hset(this.bucketKey(apiKey), 'lastRefill', timestamp.toString());
  }
  
  async getConcurrent(apiKey: string): Promise<number> {
    const data = await this.redis.hget(this.bucketKey(apiKey), 'concurrent');
    return data ? parseInt(data, 10) : 0;
  }
  
  async incrementConcurrent(apiKey: string): Promise<number> {
    const key = `${this.bucketKey(apiKey)}:concurrent`;
    return await this.redis.incr(key);
  }
  
  async decrementConcurrent(apiKey: string): Promise<number> {
    const key = `${this.bucketKey(apiKey)}:concurrent`;
    const value = await this.redis.decr(key);
    // Ensure it doesn't go negative
    if (value < 0) {
      await this.redis.set(key, '0');
      return 0;
    }
    return value;
  }
  
  async setConfig(apiKey: string, config: A2ARateLimitConfig): Promise<void> {
    const configKey = `ratelimit:config:${apiKey}`;
    await this.redis.set(configKey, JSON.stringify(config));
  }
  
  async getConfig(apiKey: string): Promise<A2ARateLimitConfig | null> {
    const configKey = `ratelimit:config:${apiKey}`;
    const data = await this.redis.get(configKey);
    return data ? JSON.parse(data) : null;
  }
  
  async reset(apiKey: string): Promise<void> {
    await this.redis.del(this.bucketKey(apiKey));
  }
}

// =====================================================
// QUEUE PERSISTENCE
// =====================================================

export class RedisQueue {
  constructor(private redis: RedisClient) {}
  
  private jobKey(jobId: string): string {
    return `queue:job:${jobId}`;
  }
  
  private queueKey(priority: 'high' | 'normal' | 'low'): string {
    return `queue:${priority}`;
  }
  
  async enqueue(jobId: string, priority: 'high' | 'normal' | 'low', jobData: any): Promise<void> {
    await this.redis.set(this.jobKey(jobId), JSON.stringify(jobData));
    // Use list for FIFO queue
    await this.redis.hset(this.queueKey(priority), jobId, Date.now().toString());
  }
  
  async dequeue(): Promise<{ jobId: string; data: any } | null> {
    // Check queues in priority order
    for (const priority of ['high', 'normal', 'low'] as const) {
      const queueKey = this.queueKey(priority);
      const jobs = await this.redis.hgetall(queueKey);
      
      if (Object.keys(jobs).length === 0) continue;
      
      // Get oldest job
      const sorted = Object.entries(jobs).sort((a, b) => parseInt(a[1]) - parseInt(b[1]));
      const [jobId] = sorted[0];
      
      // Get job data
      const dataStr = await this.redis.get(this.jobKey(jobId));
      if (!dataStr) continue;
      
      // Remove from queue
      await this.redis.hdel(queueKey, jobId);
      
      return {
        jobId,
        data: JSON.parse(dataStr),
      };
    }
    
    return null;
  }
  
  async getJob(jobId: string): Promise<any | null> {
    const data = await this.redis.get(this.jobKey(jobId));
    return data ? JSON.parse(data) : null;
  }
  
  async updateJob(jobId: string, updates: any): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) return;
    
    const updated = { ...job, ...updates };
    await this.redis.set(this.jobKey(jobId), JSON.stringify(updated));
  }
  
  async deleteJob(jobId: string): Promise<void> {
    await this.redis.del(this.jobKey(jobId));
    
    // Remove from all queues
    for (const priority of ['high', 'normal', 'low'] as const) {
      await this.redis.hdel(this.queueKey(priority), jobId);
    }
  }
}

// =====================================================
// EXPORT
// =====================================================

export type { RedisClient };
