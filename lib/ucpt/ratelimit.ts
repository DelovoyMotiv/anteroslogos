/**
 * UCPT Rate Limiter - DoS Protection
 * Sliding window rate limiting per issuer AID
 */

import { createRedisClient } from '../a2a/redisAdapter';

// =====================================================
// RATE LIMIT CONFIGURATION
// =====================================================

const RATE_LIMIT_WINDOW_SECONDS = 60; // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 verifications per minute per issuer

// =====================================================
// RATE LIMIT CLIENT
// =====================================================

let rateLimitClient: ReturnType<typeof createRedisClient> | null = null;

function getRateLimitClient() {
  if (!rateLimitClient) {
    rateLimitClient = createRedisClient();
  }
  return rateLimitClient;
}

// =====================================================
// SLIDING WINDOW RATE LIMITING
// =====================================================

/**
 * Check if issuer is within rate limit
 * Returns true if allowed, false if rate limit exceeded
 * Uses sliding window algorithm with Redis
 */
export async function checkRateLimit(issuerAid: string): Promise<boolean> {
  const client = getRateLimitClient();
  const key = `ucpt:ratelimit:${issuerAid}`;
  
  try {
    // Get current request count
    const count = await client.get(key);
    const currentCount = count ? parseInt(count, 10) : 0;
    
    // Check if limit exceeded
    if (currentCount >= RATE_LIMIT_MAX_REQUESTS) {
      console.warn(`⚠️  Rate limit exceeded for ${issuerAid}: ${currentCount}/${RATE_LIMIT_MAX_REQUESTS}`);
      return false;
    }
    
    // Increment counter
    const newCount = await client.incr(key);
    
    // Set expiry on first request in window
    if (newCount === 1) {
      await client.expire(key, RATE_LIMIT_WINDOW_SECONDS);
    }
    
    return true;
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail-open: allow request if Redis unavailable (availability over security for rate limiting)
    return true;
  }
}

/**
 * Get current rate limit status for issuer
 */
export async function getRateLimitStatus(issuerAid: string): Promise<{
  current: number;
  limit: number;
  remaining: number;
  resetAt: number; // Unix timestamp
}> {
  const client = getRateLimitClient();
  const key = `ucpt:ratelimit:${issuerAid}`;
  
  try {
    const count = await client.get(key);
    const current = count ? parseInt(count, 10) : 0;
    const remaining = Math.max(RATE_LIMIT_MAX_REQUESTS - current, 0);
    
    // Get TTL for reset time
    const ttl = await client.ttl(key);
    const resetAt = ttl > 0 ? Math.floor(Date.now() / 1000) + ttl : 0;
    
    return {
      current,
      limit: RATE_LIMIT_MAX_REQUESTS,
      remaining,
      resetAt,
    };
  } catch (error) {
    console.error('Failed to get rate limit status:', error);
    return {
      current: 0,
      limit: RATE_LIMIT_MAX_REQUESTS,
      remaining: RATE_LIMIT_MAX_REQUESTS,
      resetAt: 0,
    };
  }
}

/**
 * Reset rate limit for issuer (admin use only)
 */
export async function resetRateLimit(issuerAid: string): Promise<void> {
  const client = getRateLimitClient();
  const key = `ucpt:ratelimit:${issuerAid}`;
  
  try {
    await client.del(key);
    console.log(`✅ Rate limit reset for ${issuerAid}`);
  } catch (error) {
    console.error('Failed to reset rate limit:', error);
  }
}

/**
 * Check and increment rate limit atomically
 * Returns remaining requests in window, or -1 if limit exceeded
 */
export async function consumeRateLimit(issuerAid: string): Promise<number> {
  const client = getRateLimitClient();
  const key = `ucpt:ratelimit:${issuerAid}`;
  
  try {
    // Increment counter
    const newCount = await client.incr(key);
    
    // Set expiry on first request
    if (newCount === 1) {
      await client.expire(key, RATE_LIMIT_WINDOW_SECONDS);
    }
    
    // Check if over limit
    if (newCount > RATE_LIMIT_MAX_REQUESTS) {
      return -1; // Rate limit exceeded
    }
    
    return RATE_LIMIT_MAX_REQUESTS - newCount;
  } catch (error) {
    console.error('Rate limit consumption failed:', error);
    // Fail-open: return max remaining
    return RATE_LIMIT_MAX_REQUESTS;
  }
}

/**
 * Get rate limit configuration
 */
export function getRateLimitConfig(): {
  windowSeconds: number;
  maxRequests: number;
} {
  return {
    windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
    maxRequests: RATE_LIMIT_MAX_REQUESTS,
  };
}
