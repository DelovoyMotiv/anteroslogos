/**
 * Cache Service for Agent Middleware
 * Provides Redis-based caching with graceful degradation
 * 
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 8.4**
 */

import { Redis } from '@upstash/redis';
import type { CachedResult, WrapResponse } from '../../types/agent-middleware.types';
import { generateCacheKey } from './utils';
import { logger } from '../a2a/logger';

/**
 * CacheService class
 * Handles caching of extraction results with Redis backend
 */
export class CacheService {
  private redis: Redis | null = null;
  private readonly ttl: number = 86400; // 24 hours in seconds
  private readonly enabled: boolean;

  /**
   * Creates a new CacheService instance
   * 
   * @param redisUrl - Redis connection URL (optional)
   * @param redisToken - Redis authentication token (optional, for Upstash)
   */
  constructor(redisUrl?: string, redisToken?: string) {
    // Check if Redis is configured
    this.enabled = !!(redisUrl && redisToken);

    if (this.enabled) {
      try {
        this.redis = new Redis({
          url: redisUrl!,
          token: redisToken!,
        });
      } catch (error) {
        console.error('[CacheService] Failed to initialize Redis:', error);
        this.enabled = false;
        this.redis = null;
      }
    } else {
      console.warn('[CacheService] Redis not configured, caching disabled');
    }
  }

  /**
   * Retrieves a cached result by URL
   * 
   * @param url - The URL to retrieve from cache
   * @param requestId - Optional request ID for tracking
   * @returns Cached result or null if not found
   * 
   * **Validates: Requirements 4.2, 8.4**
   */
  async get(url: string, requestId?: string): Promise<CachedResult | null> {
    if (!this.enabled || !this.redis) {
      return null;
    }

    try {
      const key = this.generateKey(url);
      const cached = await this.redis.get<CachedResult>(key);

      if (!cached) {
        // Cache miss
        logger.debug('Cache miss', {
          cache_action: 'miss',
          cache_key: key,
          url,
          request_id: requestId,
          tags: ['cache', 'miss'],
        });
        return null;
      }

      // Check if expired (additional safety check)
      const expiresAt = new Date(cached.expires_at);
      if (expiresAt < new Date()) {
        // Expired, delete it
        logger.debug('Cache entry expired', {
          cache_action: 'eviction',
          cache_key: key,
          url,
          expires_at: cached.expires_at,
          request_id: requestId,
          tags: ['cache', 'eviction', 'expired'],
        });
        
        await this.invalidate(url, requestId).catch(() => {
          // Ignore invalidation errors
        });
        return null;
      }

      // Cache hit
      logger.debug('Cache hit', {
        cache_action: 'hit',
        cache_key: key,
        url,
        cached_at: cached.cached_at,
        request_id: requestId,
        tags: ['cache', 'hit'],
      });

      return cached;
    } catch (error) {
      // Graceful degradation: log error and return null
      logger.error('Cache get operation failed', {
        cache_action: 'error',
        url,
        request_id: requestId,
        tags: ['cache', 'error'],
      }, error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Stores a result in cache with TTL
   * 
   * @param url - The URL to cache
   * @param data - The response data to cache
   * @param ttl - Time-to-live in seconds (default: 24 hours)
   * @param requestId - Optional request ID for tracking
   * 
   * **Validates: Requirements 4.1, 8.4**
   */
  async set(url: string, data: WrapResponse, ttl?: number, requestId?: string): Promise<void> {
    if (!this.enabled || !this.redis) {
      return;
    }

    try {
      const key = this.generateKey(url);
      const cacheTtl = ttl || this.ttl;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + cacheTtl * 1000);

      const cachedResult: CachedResult = {
        data,
        cached_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      };

      // Store with TTL
      await this.redis.set(key, cachedResult, {
        ex: cacheTtl,
      });

      // Log cache set operation
      logger.debug('Cache set', {
        cache_action: 'set',
        cache_key: key,
        url,
        ttl_seconds: cacheTtl,
        expires_at: expiresAt.toISOString(),
        request_id: requestId,
        tags: ['cache', 'set'],
      });
    } catch (error) {
      // Graceful degradation: log error but don't throw
      logger.error('Cache set operation failed', {
        cache_action: 'error',
        url,
        request_id: requestId,
        tags: ['cache', 'error'],
      }, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Generates a cache key for a URL
   * Uses SHA-256 hash of normalized URL
   * 
   * @param url - The URL to generate a key for
   * @returns Cache key string
   */
  generateKey(url: string): string {
    return generateCacheKey(url);
  }

  /**
   * Manually invalidates a cached entry
   * 
   * @param url - The URL to invalidate
   * @param requestId - Optional request ID for tracking
   * 
   * **Validates: Requirements 8.4**
   */
  async invalidate(url: string, requestId?: string): Promise<void> {
    if (!this.enabled || !this.redis) {
      return;
    }

    try {
      const key = this.generateKey(url);
      await this.redis.del(key);

      // Log cache invalidation
      logger.debug('Cache invalidated', {
        cache_action: 'invalidate',
        cache_key: key,
        url,
        request_id: requestId,
        tags: ['cache', 'invalidate'],
      });
    } catch (error) {
      // Graceful degradation: log error but don't throw
      logger.error('Cache invalidation failed', {
        cache_action: 'error',
        url,
        request_id: requestId,
        tags: ['cache', 'error'],
      }, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Checks if caching is enabled
   * 
   * @returns true if Redis is configured and connected
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Gets the configured TTL
   * 
   * @returns TTL in seconds
   */
  getTTL(): number {
    return this.ttl;
  }
}

/**
 * Creates a new CacheService instance from environment variables
 * 
 * @returns CacheService instance
 */
export function createCacheService(): CacheService {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  return new CacheService(redisUrl, redisToken);
}
