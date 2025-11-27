/**
 * UAP Rate Limiter
 * Token bucket algorithm with per-agent limits
 * 
 * @module src/protocols/uap/transport/rateLimiter
 * @version 1.0.0
 */

import { DIDString } from '../types';

// =====================================================
// TYPES
// =====================================================

export interface RateLimitConfig {
  /** Maximum tokens in bucket */
  capacity: number;
  /** Tokens added per second */
  refillRate: number;
  /** Cost per request */
  costPerRequest: number;
  /** Enable burst mode */
  allowBurst: boolean;
}

export interface TokenBucket {
  /** Current token count */
  tokens: number;
  /** Last refill timestamp */
  lastRefill: number;
  /** Total requests */
  totalRequests: number;
  /** Rejected requests */
  rejectedRequests: number;
}

export interface RateLimitResult {
  /** Request allowed */
  allowed: boolean;
  /** Current token count */
  tokensRemaining: number;
  /** Time until next token (ms) */
  retryAfter?: number;
  /** Rate limit exceeded reason */
  reason?: string;
}

// =====================================================
// DEFAULT CONFIGS
// =====================================================

export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  handshake: {
    capacity: 10,
    refillRate: 1, // 1 token/sec = 60 handshakes/min
    costPerRequest: 1,
    allowBurst: true,
  },
  request: {
    capacity: 100,
    refillRate: 10, // 10 tokens/sec = 600 requests/min
    costPerRequest: 1,
    allowBurst: true,
  },
  streaming: {
    capacity: 1000,
    refillRate: 100, // 100 tokens/sec = 6000 messages/min
    costPerRequest: 1,
    allowBurst: false,
  },
};

// =====================================================
// RATE LIMITER
// =====================================================

export class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private config: Map<string, RateLimitConfig> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(configs: Record<string, RateLimitConfig> = DEFAULT_RATE_LIMITS) {
    // Initialize configs
    for (const [key, config] of Object.entries(configs)) {
      this.config.set(key, config);
    }

    // Start cleanup task (every 5 minutes)
    this.startCleanup();

    console.log('[RateLimiter] Initialized with configs:', Object.keys(configs));
  }

  /**
   * Check if request is allowed
   * Consumes tokens if allowed
   */
  async checkLimit(
    agentDid: DIDString,
    limitType: string = 'request'
  ): Promise<RateLimitResult> {
    const config = this.config.get(limitType);
    if (!config) {
      return {
        allowed: true,
        tokensRemaining: Infinity,
        reason: 'No rate limit configured',
      };
    }

    const bucketKey = `${agentDid}:${limitType}`;
    let bucket = this.buckets.get(bucketKey);

    // Initialize bucket if not exists
    if (!bucket) {
      bucket = {
        tokens: config.capacity,
        lastRefill: Date.now(),
        totalRequests: 0,
        rejectedRequests: 0,
      };
      this.buckets.set(bucketKey, bucket);
    }

    // Refill tokens
    const now = Date.now();
    const timeSinceRefill = (now - bucket.lastRefill) / 1000; // seconds
    const tokensToAdd = timeSinceRefill * config.refillRate;

    bucket.tokens = Math.min(config.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Check if enough tokens
    if (bucket.tokens >= config.costPerRequest) {
      // Consume tokens
      bucket.tokens -= config.costPerRequest;
      bucket.totalRequests++;

      return {
        allowed: true,
        tokensRemaining: Math.floor(bucket.tokens),
      };
    }

    // Rate limit exceeded
    bucket.rejectedRequests++;

    // Calculate retry after (time until next token available)
    const tokensNeeded = config.costPerRequest - bucket.tokens;
    const retryAfter = Math.ceil((tokensNeeded / config.refillRate) * 1000);

    return {
      allowed: false,
      tokensRemaining: 0,
      retryAfter,
      reason: `Rate limit exceeded for ${limitType}`,
    };
  }

  /**
   * Get bucket statistics for agent
   */
  getBucketStats(agentDid: DIDString, limitType: string): TokenBucket | null {
    const bucketKey = `${agentDid}:${limitType}`;
    return this.buckets.get(bucketKey) || null;
  }

  /**
   * Reset bucket for agent
   */
  resetBucket(agentDid: DIDString, limitType: string): void {
    const bucketKey = `${agentDid}:${limitType}`;
    this.buckets.delete(bucketKey);
    console.log(`[RateLimiter] Reset bucket: ${bucketKey}`);
  }

  /**
   * Get all buckets for agent
   */
  getAgentBuckets(agentDid: DIDString): Map<string, TokenBucket> {
    const agentBuckets = new Map<string, TokenBucket>();

    for (const [key, bucket] of this.buckets.entries()) {
      if (key.startsWith(`${agentDid}:`)) {
        const limitType = key.split(':')[1];
        agentBuckets.set(limitType, bucket);
      }
    }

    return agentBuckets;
  }

  /**
   * Update rate limit config
   */
  updateConfig(limitType: string, config: RateLimitConfig): void {
    this.config.set(limitType, config);
    console.log(`[RateLimiter] Updated config for ${limitType}:`, config);
  }

  /**
   * Cleanup stale buckets
   * Removes buckets inactive for > 1 hour
   */
  private cleanup(): void {
    const now = Date.now();
    const staleThreshold = 60 * 60 * 1000; // 1 hour
    let removed = 0;

    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > staleThreshold) {
        this.buckets.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[RateLimiter] Cleanup: removed ${removed} stale buckets`);
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get global statistics
   */
  getGlobalStats(): {
    totalBuckets: number;
    totalRequests: number;
    totalRejected: number;
    configs: Record<string, RateLimitConfig>;
  } {
    let totalRequests = 0;
    let totalRejected = 0;

    for (const bucket of this.buckets.values()) {
      totalRequests += bucket.totalRequests;
      totalRejected += bucket.rejectedRequests;
    }

    return {
      totalBuckets: this.buckets.size,
      totalRequests,
      totalRejected,
      configs: Object.fromEntries(this.config.entries()),
    };
  }

  /**
   * Shutdown rate limiter
   */
  shutdown(): void {
    this.stopCleanup();
    this.buckets.clear();
    console.log('[RateLimiter] Shutdown complete');
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let rateLimiterInstance: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter();
  }
  return rateLimiterInstance;
}

export function initRateLimiter(
  configs?: Record<string, RateLimitConfig>
): RateLimiter {
  if (rateLimiterInstance) {
    rateLimiterInstance.shutdown();
  }
  rateLimiterInstance = new RateLimiter(configs);
  return rateLimiterInstance;
}

export default RateLimiter;
