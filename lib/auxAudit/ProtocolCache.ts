/**
 * Protocol Cache Service
 * 
 * Caches protocol discovery results to improve performance and reduce
 * redundant network requests. Uses Redis in production, in-memory fallback
 * for development.
 * 
 * Cache Strategy:
 * - Key: domain-based (e.g., "protocol:example.com")
 * - TTL: 24 hours (86400 seconds)
 * - Storage: Redis (production) or Map (development)
 */

import { createRedisClient } from '../a2a/redisAdapter';
import type { ProtocolStatus } from './types';

/**
 * Cache entry structure
 */
interface CacheEntry {
  protocols: ProtocolStatus[];
  cachedAt: number;
}

/**
 * Protocol Cache Service
 */
export class ProtocolCache {
  private redis: ReturnType<typeof createRedisClient>;
  private readonly TTL_SECONDS = 86400; // 24 hours
  private readonly CACHE_PREFIX = 'aux:protocol:';
  
  constructor() {
    this.redis = createRedisClient();
  }
  
  /**
   * Generate cache key from URL
   * Extracts domain and normalizes it for consistent caching
   * 
   * @param url - Target URL
   * @returns Cache key
   */
  private generateCacheKey(url: string): string {
    try {
      // Normalize URL
      const normalizedUrl = url.startsWith('http://') || url.startsWith('https://')
        ? url
        : `https://${url}`;
      
      // Extract domain (hostname)
      const urlObj = new URL(normalizedUrl);
      const domain = urlObj.hostname.toLowerCase();
      
      return `${this.CACHE_PREFIX}${domain}`;
    } catch {
      // If URL parsing fails, use the raw URL as key
      return `${this.CACHE_PREFIX}${url.toLowerCase()}`;
    }
  }
  
  /**
   * Get cached protocol results
   * 
   * @param url - Target URL
   * @returns Cached protocols or null if not found/expired
   */
  async get(url: string): Promise<ProtocolStatus[] | null> {
    try {
      const key = this.generateCacheKey(url);
      const data = await this.redis.get(key);
      
      if (!data) {
        return null;
      }
      
      const entry: CacheEntry = JSON.parse(data);
      
      // Verify cache hasn't expired (double-check even though Redis handles TTL)
      const age = Date.now() - entry.cachedAt;
      if (age > this.TTL_SECONDS * 1000) {
        await this.redis.del(key);
        return null;
      }
      
      return entry.protocols;
    } catch (error) {
      console.error('Protocol cache get error:', error);
      return null;
    }
  }
  
  /**
   * Set protocol results in cache
   * 
   * @param url - Target URL
   * @param protocols - Protocol discovery results
   */
  async set(url: string, protocols: ProtocolStatus[]): Promise<void> {
    try {
      const key = this.generateCacheKey(url);
      const entry: CacheEntry = {
        protocols,
        cachedAt: Date.now()
      };
      
      await this.redis.set(key, JSON.stringify(entry), { EX: this.TTL_SECONDS });
    } catch (error) {
      console.error('Protocol cache set error:', error);
      // Don't throw - caching is not critical
    }
  }
  
  /**
   * Invalidate cache for a specific URL
   * 
   * @param url - Target URL
   */
  async invalidate(url: string): Promise<void> {
    try {
      const key = this.generateCacheKey(url);
      await this.redis.del(key);
    } catch (error) {
      console.error('Protocol cache invalidate error:', error);
    }
  }
  
  /**
   * Check if cache entry exists for URL
   * 
   * @param url - Target URL
   * @returns True if cached entry exists
   */
  async has(url: string): Promise<boolean> {
    try {
      const key = this.generateCacheKey(url);
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('Protocol cache has error:', error);
      return false;
    }
  }
  
  /**
   * Get TTL (time to live) for cached entry
   * 
   * @param url - Target URL
   * @returns Remaining TTL in seconds, or -1 if no expiry, -2 if expired/not found
   */
  async getTTL(url: string): Promise<number> {
    try {
      const key = this.generateCacheKey(url);
      return await this.redis.ttl(key);
    } catch (error) {
      console.error('Protocol cache TTL error:', error);
      return -2;
    }
  }
  
  /**
   * Clear all protocol cache entries
   * Use with caution - primarily for testing
   */
  async clear(): Promise<void> {
    try {
      const keys = await this.redis.keys(`${this.CACHE_PREFIX}*`);
      for (const key of keys) {
        await this.redis.del(key);
      }
    } catch (error) {
      console.error('Protocol cache clear error:', error);
    }
  }
}
