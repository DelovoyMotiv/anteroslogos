/**
 * A2A Cache Layer - Response Caching for Performance
 * Production-ready with TTL, ETag support, and cache warming
 */

import type { A2AAuditResult } from './protocol';

// =====================================================
// TYPES
// =====================================================

interface CacheEntry<T = any> {
  key: string;
  value: T;
  etag: string;
  created_at: number;
  expires_at: number;
  hit_count: number;
  size_bytes: number;
}

interface CacheStats {
  total_entries: number;
  total_size_bytes: number;
  hits: number;
  misses: number;
  hit_rate: number;
  evictions: number;
}

// =====================================================
// CACHE STORAGE
// =====================================================

class CacheStorage {
  private cache: Map<string, CacheEntry> = new Map();
  private stats: CacheStats = {
    total_entries: 0,
    total_size_bytes: 0,
    hits: 0,
    misses: 0,
    hit_rate: 0,
    evictions: 0,
  };
  
  // Default TTL: 1 hour
  private defaultTTL = 60 * 60 * 1000;
  
  // Max cache size: 100MB
  private maxSizeBytes = 100 * 1024 * 1024;
  
  /**
   * Generate cache key
   */
  private generateKey(namespace: string, identifier: string): string {
    return `${namespace}:${identifier}`;
  }
  
  /**
   * Generate ETag
   */
  private generateETag(value: any): string {
    const json = JSON.stringify(value);
    let hash = 0;
    for (let i = 0; i < json.length; i++) {
      const char = json.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `"${Math.abs(hash).toString(36)}"`;
  }
  
  /**
   * Calculate size in bytes
   */
  private calculateSize(value: any): number {
    return new Blob([JSON.stringify(value)]).size;
  }
  
  /**
   * Evict expired entries
   */
  private evictExpired(): number {
    const now = Date.now();
    let evicted = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires_at < now) {
        this.cache.delete(key);
        this.stats.total_size_bytes -= entry.size_bytes;
        evicted++;
      }
    }
    
    this.stats.evictions += evicted;
    this.stats.total_entries = this.cache.size;
    
    return evicted;
  }
  
  /**
   * Evict least recently used entries if cache is full
   */
  private evictLRU(): number {
    if (this.stats.total_size_bytes <= this.maxSizeBytes) {
      return 0;
    }
    
    // Sort by hit_count (ascending) and created_at (oldest first)
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => {
        if (a[1].hit_count !== b[1].hit_count) {
          return a[1].hit_count - b[1].hit_count;
        }
        return a[1].created_at - b[1].created_at;
      });
    
    let evicted = 0;
    
    // Evict until we're under 80% of max size
    const targetSize = this.maxSizeBytes * 0.8;
    
    for (const [key, entry] of entries) {
      if (this.stats.total_size_bytes <= targetSize) {
        break;
      }
      
      this.cache.delete(key);
      this.stats.total_size_bytes -= entry.size_bytes;
      evicted++;
    }
    
    this.stats.evictions += evicted;
    this.stats.total_entries = this.cache.size;
    
    return evicted;
  }
  
  /**
   * Set cache entry
   */
  set<T>(namespace: string, identifier: string, value: T, ttl?: number): CacheEntry<T> {
    const key = this.generateKey(namespace, identifier);
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);
    const etag = this.generateETag(value);
    const sizeBytes = this.calculateSize(value);
    
    const entry: CacheEntry<T> = {
      key,
      value,
      etag,
      created_at: now,
      expires_at: expiresAt,
      hit_count: 0,
      size_bytes: sizeBytes,
    };
    
    // Remove old entry if exists
    const oldEntry = this.cache.get(key);
    if (oldEntry) {
      this.stats.total_size_bytes -= oldEntry.size_bytes;
    }
    
    // Add new entry
    this.cache.set(key, entry);
    this.stats.total_size_bytes += sizeBytes;
    this.stats.total_entries = this.cache.size;
    
    // Evict if necessary
    this.evictLRU();
    
    return entry;
  }
  
  /**
   * Get cache entry
   */
  get<T>(namespace: string, identifier: string): CacheEntry<T> | null {
    const key = this.generateKey(namespace, identifier);
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
    
    // Check if expired
    if (entry.expires_at < Date.now()) {
      this.cache.delete(key);
      this.stats.total_size_bytes -= entry.size_bytes;
      this.stats.total_entries = this.cache.size;
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
    
    // Update hit count
    entry.hit_count++;
    this.cache.set(key, entry);
    
    this.stats.hits++;
    this.updateHitRate();
    
    return entry;
  }
  
  /**
   * Delete cache entry
   */
  delete(namespace: string, identifier: string): boolean {
    const key = this.generateKey(namespace, identifier);
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }
    
    this.cache.delete(key);
    this.stats.total_size_bytes -= entry.size_bytes;
    this.stats.total_entries = this.cache.size;
    
    return true;
  }
  
  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats.total_entries = 0;
    this.stats.total_size_bytes = 0;
  }
  
  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }
  
  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hit_rate = total > 0 ? this.stats.hits / total : 0;
  }
  
  /**
   * Run cleanup (evict expired entries)
   */
  cleanup(): number {
    return this.evictExpired();
  }
}

// Global cache storage
const cacheStorage = new CacheStorage();

// Auto-cleanup every 5 minutes
setInterval(() => {
  const evicted = cacheStorage.cleanup();
  if (evicted > 0) {
    console.log(`🧹 Evicted ${evicted} expired cache entries`);
  }
}, 5 * 60 * 1000);

// =====================================================
// PUBLIC API
// =====================================================

/**
 * Cache audit result
 */
export function cacheAuditResult(url: string, result: A2AAuditResult, ttl?: number): string {
  const entry = cacheStorage.set('audit', url, result, ttl);
  console.log(`💾 Cached audit result for ${url} (ETag: ${entry.etag})`);
  return entry.etag;
}

/**
 * Get cached audit result
 */
export function getCachedAuditResult(url: string): { result: A2AAuditResult; etag: string } | null {
  const entry = cacheStorage.get<A2AAuditResult>('audit', url);
  
  if (!entry) {
    console.log(`❌ Cache miss for ${url}`);
    return null;
  }
  
  console.log(`✅ Cache hit for ${url} (ETag: ${entry.etag})`);
  return {
    result: entry.value,
    etag: entry.etag,
  };
}

/**
 * Check if cached result exists and is valid
 */
export function hasCachedAuditResult(url: string, clientETag?: string): boolean {
  const entry = cacheStorage.get<A2AAuditResult>('audit', url);
  
  if (!entry) {
    return false;
  }
  
  // If client provided ETag, check if it matches
  if (clientETag) {
    return entry.etag === clientETag;
  }
  
  return true;
}

/**
 * Invalidate cached audit result
 */
export function invalidateCachedAuditResult(url: string): boolean {
  const deleted = cacheStorage.delete('audit', url);
  
  if (deleted) {
    console.log(`🗑️  Invalidated cache for ${url}`);
  }
  
  return deleted;
}

/**
 * Cache global insights
 */
export function cacheGlobalInsights(insights: any, ttl?: number): string {
  const entry = cacheStorage.set('insights', 'global', insights, ttl || 24 * 60 * 60 * 1000); // 24 hours default
  console.log(`💾 Cached global insights (ETag: ${entry.etag})`);
  return entry.etag;
}

/**
 * Get cached global insights
 */
export function getCachedGlobalInsights(): { insights: any; etag: string } | null {
  const entry = cacheStorage.get<any>('insights', 'global');
  
  if (!entry) {
    console.log(`❌ Cache miss for global insights`);
    return null;
  }
  
  console.log(`✅ Cache hit for global insights (ETag: ${entry.etag})`);
  return {
    insights: entry.value,
    etag: entry.etag,
  };
}

/**
 * Cache industry insights
 */
export function cacheIndustryInsights(industry: string, insights: any, ttl?: number): string {
  const entry = cacheStorage.set('insights', `industry:${industry}`, insights, ttl || 12 * 60 * 60 * 1000); // 12 hours default
  console.log(`💾 Cached insights for industry ${industry} (ETag: ${entry.etag})`);
  return entry.etag;
}

/**
 * Get cached industry insights
 */
export function getCachedIndustryInsights(industry: string): { insights: any; etag: string } | null {
  const entry = cacheStorage.get<any>('insights', `industry:${industry}`);
  
  if (!entry) {
    console.log(`❌ Cache miss for industry ${industry}`);
    return null;
  }
  
  console.log(`✅ Cache hit for industry ${industry} (ETag: ${entry.etag})`);
  return {
    insights: entry.value,
    etag: entry.etag,
  };
}

/**
 * Cache domain trends
 */
export function cacheDomainTrends(domain: string, trends: any, ttl?: number): string {
  const entry = cacheStorage.set('trends', domain, trends, ttl || 6 * 60 * 60 * 1000); // 6 hours default
  console.log(`💾 Cached trends for domain ${domain} (ETag: ${entry.etag})`);
  return entry.etag;
}

/**
 * Get cached domain trends
 */
export function getCachedDomainTrends(domain: string): { trends: any; etag: string } | null {
  const entry = cacheStorage.get<any>('trends', domain);
  
  if (!entry) {
    console.log(`❌ Cache miss for domain ${domain}`);
    return null;
  }
  
  console.log(`✅ Cache hit for domain ${domain} (ETag: ${entry.etag})`);
  return {
    trends: entry.value,
    etag: entry.etag,
  };
}

/**
 * Get cache statistics
 */
export function getCacheStats(): CacheStats {
  return cacheStorage.getStats();
}

/**
 * Clear entire cache
 */
export function clearCache(): void {
  cacheStorage.clear();
  console.log('🗑️  Cache cleared');
}

/**
 * Warm cache with pre-computed data
 */
export async function warmCache(warmingFunction: () => Promise<void>): Promise<void> {
  console.log('🔥 Warming cache...');
  
  try {
    await warmingFunction();
    console.log('✅ Cache warming completed');
  } catch (error) {
    console.error('❌ Cache warming failed:', error);
  }
}

/**
 * Cache middleware for Express/Vercel
 */
export function cacheMiddleware(options: {
  namespace: string;
  keyGenerator: (req: any) => string;
  ttl?: number;
}) {
  return async (req: any, res: any, next: any) => {
    const key = options.keyGenerator(req);
    const cached = cacheStorage.get(options.namespace, key);
    
    if (cached) {
      // Set ETag header
      res.setHeader('ETag', cached.etag);
      
      // Check if client has same ETag
      const clientETag = req.headers['if-none-match'];
      if (clientETag === cached.etag) {
        return res.status(304).send(); // Not Modified
      }
      
      // Return cached response
      return res.json(cached.value);
    }
    
    // Intercept response to cache it
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      const entry = cacheStorage.set(options.namespace, key, body, options.ttl);
      res.setHeader('ETag', entry.etag);
      return originalJson(body);
    };
    
    next();
  };
}
