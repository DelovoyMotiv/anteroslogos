/**
 * Production-Grade Rate Limiter - Token Bucket Algorithm
 * Implements per-IP rate limiting with different tiers for authenticated/anonymous users
 * 
 * Features:
 * - Token bucket algorithm for smooth rate limiting
 * - Separate limits for authenticated (60 req/min) and anonymous (10 req/min) users
 * - Proper HTTP headers (X-RateLimit-*, Retry-After)
 * - Automatic token refill
 * - Memory-efficient cleanup of expired buckets
 * 
 * @module lib/middleware/rateLimiter
 * @version 1.0.0
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// =====================================================
// TYPES
// =====================================================

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number; // tokens per second
}

interface RateLimitConfig {
  requestsPerMinute: number;
  burstSize: number; // max tokens in bucket
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number; // seconds
  limit: number;
}

// =====================================================
// CONFIGURATION
// =====================================================

/**
 * Rate limit configurations per tier
 */
export const RATE_LIMIT_CONFIGS = {
  authenticated: {
    requestsPerMinute: 60,
    burstSize: 80, // Allow small bursts
  },
  anonymous: {
    requestsPerMinute: 10,
    burstSize: 15, // Allow small bursts
  },
} as const;

// =====================================================
// TOKEN BUCKET IMPLEMENTATION
// =====================================================

/**
 * In-memory token bucket store
 * For production with multiple instances, use Redis
 */
class TokenBucketStore {
  private buckets: Map<string, TokenBucket> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired buckets every 5 minutes
    this.startCleanup();
  }

  /**
   * Get or create bucket for identifier
   */
  getBucket(identifier: string, config: RateLimitConfig): TokenBucket {
    let bucket = this.buckets.get(identifier);

    if (!bucket) {
      bucket = {
        tokens: config.burstSize,
        lastRefill: Date.now(),
        capacity: config.burstSize,
        refillRate: config.requestsPerMinute / 60, // tokens per second
      };
      this.buckets.set(identifier, bucket);
    }

    return bucket;
  }

  /**
   * Refill tokens based on elapsed time
   */
  refillBucket(bucket: TokenBucket): void {
    const now = Date.now();
    const elapsedSeconds = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = elapsedSeconds * bucket.refillRate;

    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  /**
   * Try to consume tokens from bucket
   */
  tryConsume(identifier: string, config: RateLimitConfig, cost: number = 1): RateLimitResult {
    const bucket = this.getBucket(identifier, config);
    this.refillBucket(bucket);

    const now = Date.now();
    const limit = config.requestsPerMinute;

    // Check if enough tokens available
    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;

      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        resetAt: now + 60000, // 1 minute from now
        limit,
      };
    }

    // Not enough tokens - calculate retry time
    const tokensNeeded = cost - bucket.tokens;
    const retryAfter = Math.ceil(tokensNeeded / bucket.refillRate);

    return {
      allowed: false,
      remaining: 0,
      resetAt: now + 60000,
      retryAfter,
      limit,
    };
  }

  /**
   * Reset bucket for identifier
   */
  reset(identifier: string): void {
    this.buckets.delete(identifier);
  }

  /**
   * Get current bucket stats
   */
  getStats(identifier: string, config: RateLimitConfig): {
    tokens: number;
    capacity: number;
    refillRate: number;
  } {
    const bucket = this.getBucket(identifier, config);
    this.refillBucket(bucket);

    return {
      tokens: Math.floor(bucket.tokens),
      capacity: bucket.capacity,
      refillRate: bucket.refillRate,
    };
  }

  /**
   * Start periodic cleanup of expired buckets
   */
  private startCleanup(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const maxAge = 60 * 60 * 1000; // 1 hour

      for (const [key, bucket] of this.buckets.entries()) {
        if (now - bucket.lastRefill > maxAge) {
          this.buckets.delete(key);
        }
      }
    }, 5 * 60 * 1000); // Run every 5 minutes

    // Don't prevent process from exiting
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Stop cleanup interval (for testing)
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clear all buckets (for testing)
   */
  clear(): void {
    this.buckets.clear();
  }
}

// =====================================================
// GLOBAL STORE INSTANCE
// =====================================================

const globalStore = new TokenBucketStore();

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Extract client IP from request
 */
function getClientIp(req: VercelRequest): string {
  // Try various headers in order of preference
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',');
    return ips[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return typeof realIp === 'string' ? realIp : realIp[0];
  }

  const cfConnectingIp = req.headers['cf-connecting-ip'];
  if (cfConnectingIp) {
    return typeof cfConnectingIp === 'string' ? cfConnectingIp : cfConnectingIp[0];
  }

  return 'unknown';
}

/**
 * Check if request is authenticated
 */
function isAuthenticated(req: VercelRequest): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader) return false;

  // Check for Bearer token
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return token.length > 0;
  }

  return false;
}

/**
 * Get rate limit tier for request
 */
function getRateLimitTier(req: VercelRequest): 'authenticated' | 'anonymous' {
  return isAuthenticated(req) ? 'authenticated' : 'anonymous';
}

/**
 * Set rate limit headers on response
 */
function setRateLimitHeaders(
  res: VercelResponse,
  result: RateLimitResult
): void {
  res.setHeader('X-RateLimit-Limit', result.limit.toString());
  res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
  res.setHeader('X-RateLimit-Reset', Math.floor(result.resetAt / 1000).toString());

  if (!result.allowed && result.retryAfter) {
    res.setHeader('Retry-After', result.retryAfter.toString());
  }
}

// =====================================================
// MIDDLEWARE
// =====================================================

export interface RateLimitOptions {
  /**
   * Override default config for authenticated users
   */
  authenticatedConfig?: Partial<RateLimitConfig>;

  /**
   * Override default config for anonymous users
   */
  anonymousConfig?: Partial<RateLimitConfig>;

  /**
   * Custom identifier function (default: IP address)
   */
  getIdentifier?: (req: VercelRequest) => string;

  /**
   * Custom tier function (default: check Authorization header)
   */
  getTier?: (req: VercelRequest) => 'authenticated' | 'anonymous';

  /**
   * Skip rate limiting for certain requests
   */
  skip?: (req: VercelRequest) => boolean;
}

/**
 * Rate limiting middleware using token bucket algorithm
 * 
 * @example
 * ```typescript
 * export default withRateLimit(handler);
 * 
 * // With custom config
 * export default withRateLimit(handler, {
 *   authenticatedConfig: { requestsPerMinute: 100 },
 *   anonymousConfig: { requestsPerMinute: 20 }
 * });
 * ```
 */
export function withRateLimit(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void,
  options: RateLimitOptions = {}
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    // Skip rate limiting if specified
    if (options.skip && options.skip(req)) {
      return handler(req, res);
    }

    // Get identifier (default: IP address)
    const identifier = options.getIdentifier
      ? options.getIdentifier(req)
      : getClientIp(req);

    // Get tier (default: check auth header)
    const tier = options.getTier
      ? options.getTier(req)
      : getRateLimitTier(req);

    // Get config for tier
    const baseConfig = RATE_LIMIT_CONFIGS[tier];
    const config: RateLimitConfig = {
      ...baseConfig,
      ...(tier === 'authenticated' ? options.authenticatedConfig : options.anonymousConfig),
    };

    // Try to consume token
    const result = globalStore.tryConsume(identifier, config);

    // Set rate limit headers
    setRateLimitHeaders(res, result);

    // Check if allowed
    if (!result.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter,
        limit: result.limit,
        resetAt: new Date(result.resetAt).toISOString(),
      });
    }

    // Continue to handler
    return handler(req, res);
  };
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Check rate limit without consuming tokens
 */
export function checkRateLimit(
  identifier: string,
  tier: 'authenticated' | 'anonymous' = 'anonymous'
): RateLimitResult {
  const config = RATE_LIMIT_CONFIGS[tier];
  const bucket = globalStore.getBucket(identifier, config);
  globalStore.refillBucket(bucket);

  const now = Date.now();

  return {
    allowed: bucket.tokens >= 1,
    remaining: Math.floor(bucket.tokens),
    resetAt: now + 60000,
    limit: config.requestsPerMinute,
  };
}

/**
 * Reset rate limit for identifier
 */
export function resetRateLimit(identifier: string): void {
  globalStore.reset(identifier);
}

/**
 * Get rate limit stats for identifier
 */
export function getRateLimitStats(
  identifier: string,
  tier: 'authenticated' | 'anonymous' = 'anonymous'
): {
  tokens: number;
  capacity: number;
  refillRate: number;
  limit: number;
} {
  const config = RATE_LIMIT_CONFIGS[tier];
  const stats = globalStore.getStats(identifier, config);

  return {
    ...stats,
    limit: config.requestsPerMinute,
  };
}

/**
 * Clear all rate limit data (for testing)
 */
export function clearAllRateLimits(): void {
  globalStore.clear();
}

/**
 * Stop cleanup interval (for testing)
 */
export function stopRateLimitCleanup(): void {
  globalStore.stopCleanup();
}
