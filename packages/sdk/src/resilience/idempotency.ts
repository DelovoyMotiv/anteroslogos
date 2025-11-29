import { generateHash } from '../utils/stable-stringify.js';
import { IDEMPOTENCY_TTL } from '../utils/constants.js';

interface CacheEntry<T> {
  promise: Promise<T>;
  timestamp: number;
}

export class IdempotencyManager {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private readonly ttl: number;
  private readonly maxCacheSize: number;
  private cleanupInterval: ReturnType<typeof setInterval> | undefined;

  constructor(ttl: number = IDEMPOTENCY_TTL, maxCacheSize: number = 1000) {
    this.ttl = ttl;
    this.maxCacheSize = maxCacheSize;
    
    // Start periodic cleanup every 60 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
    
    // Unref in Node.js to prevent hanging process
    if (typeof (this.cleanupInterval as any).unref === 'function') {
      (this.cleanupInterval as any).unref();
    }
  }

  /**
   * Execute function with idempotency protection
   * Concurrent requests with identical keys will share the same promise
   */
  async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Check cache size limit
    if (this.cache.size >= this.maxCacheSize) {
      this.cleanup();
    }

    const existing = this.cache.get(key);
    
    if (existing) {
      return existing.promise as Promise<T>;
    }

    // Store start time for accurate TTL calculation
    const startTime = Date.now();
    
    const promise = fn().finally(() => {
      // Schedule removal after TTL from when request started
      const elapsed = Date.now() - startTime;
      const remainingTTL = Math.max(0, this.ttl - elapsed);
      
      setTimeout(() => {
        this.cache.delete(key);
      }, remainingTTL);
    });

    this.cache.set(key, {
      promise,
      timestamp: startTime,
    });

    return promise;
  }

  /**
   * Generate idempotency key from method name and parameters
   */
  async generateKey(method: string, params: unknown): Promise<string> {
    const hash = await generateHash({ method, params });
    return `${method}:${hash}`;
  }

  /**
   * Remove expired entries from cache
   * Uses LRU eviction if cache is full
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // First pass: remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
    }

    // If still over limit, remove oldest entries (LRU)
    if (this.cache.size >= this.maxCacheSize) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, Math.floor(this.maxCacheSize * 0.2));
      for (const [key] of toRemove) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached entries and stop cleanup interval
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Destroy manager and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval !== undefined) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.cache.clear();
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics for monitoring
   */
  getStats(): { size: number; maxSize: number; ttl: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      ttl: this.ttl,
    };
  }
}
