/**
 * Example: Cache Monitoring
 * 
 * Shows how to track cache metrics
 */

import { recordCacheAccess, cacheOperationDuration } from '../index';
import type { Redis } from 'ioredis';

/**
 * Wrapper for Redis operations with metrics
 */
export class MetricsRedisWrapper {
  constructor(
    private redis: Redis,
    private cacheName: string = 'default'
  ) {}
  
  async get(key: string): Promise<string | null> {
    const startTime = Date.now();
    
    try {
      const value = await this.redis.get(key);
      const duration = (Date.now() - startTime) / 1000;
      
      // Record cache hit or miss
      recordCacheAccess(this.cacheName, value !== null, duration);
      
      return value;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      recordCacheAccess(this.cacheName, false, duration);
      throw error;
    }
  }
  
  async set(key: string, value: string, ttl?: number): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (ttl) {
        await this.redis.setex(key, ttl, value);
      } else {
        await this.redis.set(key, value);
      }
      
      const duration = (Date.now() - startTime) / 1000;
      cacheOperationDuration.observe(
        { operation: 'set', cache_name: this.cacheName },
        duration
      );
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      cacheOperationDuration.observe(
        { operation: 'set', cache_name: this.cacheName },
        duration
      );
      throw error;
    }
  }
  
  async del(key: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.redis.del(key);
      
      const duration = (Date.now() - startTime) / 1000;
      cacheOperationDuration.observe(
        { operation: 'delete', cache_name: this.cacheName },
        duration
      );
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      cacheOperationDuration.observe(
        { operation: 'delete', cache_name: this.cacheName },
        duration
      );
      throw error;
    }
  }
}

/**
 * Example usage
 */
export async function cacheExample(redis: Redis) {
  const cache = new MetricsRedisWrapper(redis, 'user-profiles');
  
  // Get with automatic metrics
  const user = await cache.get('user:123');
  
  if (!user) {
    // Cache miss - fetch from database
    const userData = await fetchUserFromDb('123');
    
    // Set with automatic metrics
    await cache.set('user:123', JSON.stringify(userData), 3600);
  }
  
  return user;
}

async function fetchUserFromDb(id: string) {
  return { id, name: 'John Doe' };
}
