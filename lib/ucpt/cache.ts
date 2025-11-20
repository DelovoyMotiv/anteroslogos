/**
 * UCPT Result Cache - Redis-backed LRU cache
 * Cache key: SHA3-512(input_hash + graph_commit + tool)
 */

import { createRedisClient } from '../a2a/redisAdapter';
import { sha3_512 } from '@noble/hashes/sha3.js';
import { base64urlEncode } from './serializer';
import type { UCPTCacheKey, UCPTCacheEntry, SerializedUCPT } from './types';

// =====================================================
// CACHE CLIENT
// =====================================================

let cacheClient: ReturnType<typeof createRedisClient> | null = null;

function getCacheClient() {
  if (!cacheClient) {
    cacheClient = createRedisClient();
  }
  return cacheClient;
}

// =====================================================
// CACHE KEY COMPUTATION
// =====================================================

/**
 * Compute cache key from input hash, graph commit, and tool name
 * Returns SHA3-512(input_hash + graph_commit + tool)
 */
function computeCacheKey(key: UCPTCacheKey): string {
  const composite = `${key.input_hash}:${key.graph_commit}:${key.tool}`;
  const bytes = Buffer.from(composite, 'utf-8');
  const hash = sha3_512(bytes);
  return base64urlEncode(hash);
}

// =====================================================
// CACHE OPERATIONS
// =====================================================

/**
 * Get cached result
 * Returns null if not found or expired
 */
export async function getCachedResult(key: UCPTCacheKey): Promise<UCPTCacheEntry | null> {
  const client = getCacheClient();
  const cacheKey = computeCacheKey(key);
  const redisKey = `ucpt:cache:${cacheKey}`;
  
  try {
    const value = await client.get(redisKey);
    if (!value) {
      return null;
    }
    
    // Parse cached entry
    const entry = JSON.parse(value) as UCPTCacheEntry;
    
    // Increment hit count
    const hitCountStr = await client.hget(redisKey + ':meta', 'hit_count');
    const hitCount = hitCountStr ? parseInt(hitCountStr, 10) + 1 : 1;
    await client.hset(redisKey + ':meta', 'hit_count', hitCount.toString());
    
    console.log(`✅ Cache hit: ${cacheKey.slice(0, 16)}... (hits: ${hitCount})`);
    
    return {
      ...entry,
      hit_count: hitCount,
    };
  } catch (error) {
    console.error('Cache get failed:', error);
    return null;
  }
}

/**
 * Cache result with UCPT token
 * TTL in seconds (default: 1 hour)
 */
export async function cacheResult(
  key: UCPTCacheKey,
  result: unknown,
  ucpt: SerializedUCPT,
  ttl: number = 3600
): Promise<void> {
  const client = getCacheClient();
  const cacheKey = computeCacheKey(key);
  const redisKey = `ucpt:cache:${cacheKey}`;
  
  try {
    const entry: UCPTCacheEntry = {
      result,
      ucpt,
      cached_at: Math.floor(Date.now() / 1000),
      hit_count: 0,
    };
    
    const value = JSON.stringify(entry);
    
    // Store with TTL
    await client.set(redisKey, value, { EX: ttl });
    
    // Store metadata for monitoring
    await client.hset(redisKey + ':meta', 'hit_count', '0');
    await client.expire(redisKey + ':meta', ttl);
    
    console.log(`✅ Cached result: ${cacheKey.slice(0, 16)}... (TTL: ${ttl}s)`);
  } catch (error) {
    console.error('Cache set failed:', error);
    // Non-critical: don't throw, just log
  }
}

/**
 * Invalidate cache entry
 */
export async function invalidateCacheEntry(key: UCPTCacheKey): Promise<void> {
  const client = getCacheClient();
  const cacheKey = computeCacheKey(key);
  const redisKey = `ucpt:cache:${cacheKey}`;
  
  try {
    await client.del(redisKey);
    await client.del(redisKey + ':meta');
    console.log(`✅ Invalidated cache: ${cacheKey.slice(0, 16)}...`);
  } catch (error) {
    console.error('Cache invalidation failed:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(key: UCPTCacheKey): Promise<{
  exists: boolean;
  hit_count: number;
  ttl: number;
  cached_at?: number;
} | null> {
  const client = getCacheClient();
  const cacheKey = computeCacheKey(key);
  const redisKey = `ucpt:cache:${cacheKey}`;
  
  try {
    const exists = await client.exists(redisKey);
    if (exists === 0) {
      return {
        exists: false,
        hit_count: 0,
        ttl: 0,
      };
    }
    
    const value = await client.get(redisKey);
    const ttl = await client.ttl(redisKey);
    const hitCount = await client.hget(redisKey + ':meta', 'hit_count');
    
    const entry = value ? JSON.parse(value) as UCPTCacheEntry : null;
    
    return {
      exists: true,
      hit_count: hitCount ? parseInt(hitCount, 10) : 0,
      ttl,
      cached_at: entry?.cached_at,
    };
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return null;
  }
}

/**
 * Clear all cache entries (admin use only)
 */
export async function clearAllCache(): Promise<number> {
  const client = getCacheClient();
  
  try {
    const keys = await client.keys('ucpt:cache:*');
    if (keys.length === 0) {
      return 0;
    }
    
    let deleted = 0;
    for (const key of keys) {
      await client.del(key);
      deleted++;
    }
    
    console.log(`✅ Cleared ${deleted} cache entries`);
    return deleted;
  } catch (error) {
    console.error('Failed to clear cache:', error);
    return 0;
  }
}

/**
 * Check if result is cached
 */
export async function isCached(key: UCPTCacheKey): Promise<boolean> {
  const client = getCacheClient();
  const cacheKey = computeCacheKey(key);
  const redisKey = `ucpt:cache:${cacheKey}`;
  
  try {
    const exists = await client.exists(redisKey);
    return exists === 1;
  } catch (error) {
    console.error('Cache exists check failed:', error);
    return false;
  }
}
