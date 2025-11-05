/**
 * A2A Rate Limiter - Token Bucket Algorithm
 * Production-ready rate limiting for high-load scenarios
 * Supports concurrent request limiting and burst handling
 */

import { A2AError, A2AErrorCode, type A2ARateLimitConfig, RATE_LIMITS } from './protocol';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  concurrent: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * In-Memory Rate Limiter (for production, use Redis)
 */
export class A2ARateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private configs: Map<string, A2ARateLimitConfig> = new Map();
  
  constructor() {
    // Cleanup expired buckets every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }
  
  /**
   * Set rate limit config for API key
   */
  setConfig(apiKey: string, config: A2ARateLimitConfig): void {
    this.configs.set(apiKey, config);
  }
  
  /**
   * Get config for API key (defaults to free tier)
   */
  getConfig(apiKey: string): A2ARateLimitConfig {
    return this.configs.get(apiKey) || RATE_LIMITS.free;
  }
  
  /**
   * Check if request is allowed (token bucket algorithm)
   */
  async checkLimit(apiKey: string, cost: number = 1): Promise<RateLimitResult> {
    const config = this.getConfig(apiKey);
    const bucket = this.getBucket(apiKey);
    const now = Date.now();
    
    // Refill tokens based on time elapsed
    this.refillBucket(bucket, config, now);
    
    // Check if enough tokens available
    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        resetAt: this.getResetTime(now, config),
      };
    }
    
    // Not enough tokens - calculate retry time
    const tokensNeeded = cost - bucket.tokens;
    const refillRate = config.requests_per_minute / 60; // tokens per second
    const retryAfter = Math.ceil(tokensNeeded / refillRate);
    
    return {
      allowed: false,
      remaining: 0,
      resetAt: this.getResetTime(now, config),
      retryAfter,
    };
  }
  
  /**
   * Check concurrent request limit
   */
  async checkConcurrent(apiKey: string): Promise<boolean> {
    const config = this.getConfig(apiKey);
    const bucket = this.getBucket(apiKey);
    
    return bucket.concurrent < config.max_concurrent;
  }
  
  /**
   * Increment concurrent counter
   */
  async incrementConcurrent(apiKey: string): Promise<void> {
    const bucket = this.getBucket(apiKey);
    bucket.concurrent++;
  }
  
  /**
   * Decrement concurrent counter
   */
  async decrementConcurrent(apiKey: string): Promise<void> {
    const bucket = this.getBucket(apiKey);
    bucket.concurrent = Math.max(0, bucket.concurrent - 1);
  }
  
  /**
   * Get or create bucket for API key
   */
  private getBucket(apiKey: string): TokenBucket {
    let bucket = this.buckets.get(apiKey);
    
    if (!bucket) {
      const config = this.getConfig(apiKey);
      bucket = {
        tokens: config.burst_size,
        lastRefill: Date.now(),
        concurrent: 0,
      };
      this.buckets.set(apiKey, bucket);
    }
    
    return bucket;
  }
  
  /**
   * Refill tokens based on elapsed time
   */
  private refillBucket(
    bucket: TokenBucket,
    config: A2ARateLimitConfig,
    now: number
  ): void {
    const elapsed = (now - bucket.lastRefill) / 1000; // seconds
    const refillRate = config.requests_per_minute / 60; // tokens per second
    const tokensToAdd = elapsed * refillRate;
    
    bucket.tokens = Math.min(
      config.burst_size,
      bucket.tokens + tokensToAdd
    );
    bucket.lastRefill = now;
  }
  
  /**
   * Calculate reset time
   */
  private getResetTime(now: number, _config: A2ARateLimitConfig): number {
    return now + (60 * 1000); // 1 minute from now
  }
  
  /**
   * Cleanup expired buckets
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour
    
    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > maxAge && bucket.concurrent === 0) {
        this.buckets.delete(key);
      }
    }
  }
  
  /**
   * Reset bucket for API key
   */
  async reset(apiKey: string): Promise<void> {
    this.buckets.delete(apiKey);
  }
  
  /**
   * Get current stats for API key
   */
  async getStats(apiKey: string): Promise<{
    tokens: number;
    concurrent: number;
    config: A2ARateLimitConfig;
  }> {
    const config = this.getConfig(apiKey);
    const bucket = this.getBucket(apiKey);
    const now = Date.now();
    
    this.refillBucket(bucket, config, now);
    
    return {
      tokens: Math.floor(bucket.tokens),
      concurrent: bucket.concurrent,
      config,
    };
  }
}

/**
 * Middleware wrapper for rate limiting
 */
export async function withRateLimit<T>(
  rateLimiter: A2ARateLimiter,
  apiKey: string,
  fn: () => Promise<T>
): Promise<T> {
  // Check rate limit
  const limitResult = await rateLimiter.checkLimit(apiKey);
  
  if (!limitResult.allowed) {
    throw new A2AError(
      A2AErrorCode.RATE_LIMIT_EXCEEDED,
      `Rate limit exceeded. Try again in ${limitResult.retryAfter} seconds.`,
      {
        remaining: limitResult.remaining,
        resetAt: limitResult.resetAt,
        retryAfter: limitResult.retryAfter,
      }
    );
  }
  
  // Check concurrent limit
  const concurrentAllowed = await rateLimiter.checkConcurrent(apiKey);
  
  if (!concurrentAllowed) {
    throw new A2AError(
      A2AErrorCode.CONCURRENT_LIMIT_EXCEEDED,
      'Too many concurrent requests. Please wait for existing requests to complete.',
      {
        maxConcurrent: rateLimiter.getConfig(apiKey).max_concurrent,
      }
    );
  }
  
  // Increment concurrent counter
  await rateLimiter.incrementConcurrent(apiKey);
  
  try {
    // Execute function
    const result = await fn();
    return result;
  } finally {
    // Always decrement, even on error
    await rateLimiter.decrementConcurrent(apiKey);
  }
}

/**
 * Global rate limiter instance
 */
export const globalRateLimiter = new A2ARateLimiter();

/**
 * Convenience function for checking rate limit
 */
export async function checkRateLimit(apiKey: string, tier: string): Promise<RateLimitResult & { limit: number }> {
  // Set config based on tier if not already set
  const config = RATE_LIMITS[tier] || RATE_LIMITS.free;
  globalRateLimiter.setConfig(apiKey, config);
  
  const result = await globalRateLimiter.checkLimit(apiKey);
  return {
    ...result,
    limit: config.requests_per_minute,
  };
}
