/**
 * Rate Limiter
 * Sliding window rate limiting for API keys and users
 * Uses Supabase for distributed state (can be upgraded to Redis for scale)
 */

import { supabase } from '../supabase';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number; // Unix timestamp
  retryAfter?: number; // Seconds
}

interface RateLimitBucket {
  key: string;
  count: number;
  window_start: string;
  expires_at: string;
}

/**
 * Check rate limit using sliding window algorithm
 * @param key - Unique identifier (api_key_id, user_id, etc)
 * @param limit - Max requests per window
 * @param windowMs - Time window in milliseconds
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  try {
    const now = Date.now();
    const windowStart = new Date(now - windowMs);
    const expiresAt = new Date(now + windowMs);

    // Get or create bucket
    const { data: bucket, error: fetchError } = await supabase
      .from('rate_limit_buckets')
      .select('*')
      .eq('key', key)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Rate limit fetch error:', fetchError);
      // Fail open (allow request) on error
      return {
        allowed: true,
        remaining: limit - 1,
        reset: Math.floor((now + windowMs) / 1000),
      };
    }

    // Calculate current count in window
    let currentCount = 0;
    if (bucket) {
      const bucketWindowStart = new Date(bucket.window_start).getTime();
      
      // If bucket is still in current window, use its count
      if (bucketWindowStart >= windowStart.getTime()) {
        currentCount = bucket.count;
      }
    }

    // Check if limit exceeded
    if (currentCount >= limit) {
      const reset = bucket
        ? Math.floor(new Date(bucket.expires_at).getTime() / 1000)
        : Math.floor((now + windowMs) / 1000);

      return {
        allowed: false,
        remaining: 0,
        reset,
        retryAfter: Math.ceil((reset * 1000 - now) / 1000),
      };
    }

    // Increment count
    const newCount = currentCount + 1;

    if (bucket && new Date(bucket.window_start).getTime() >= windowStart.getTime()) {
      // Update existing bucket
      await supabase
        .from('rate_limit_buckets')
        .update({ count: newCount })
        .eq('key', key);
    } else {
      // Create new bucket
      await supabase
        .from('rate_limit_buckets')
        .upsert({
          key,
          count: newCount,
          window_start: windowStart.toISOString(),
          expires_at: expiresAt.toISOString(),
        });
    }

    return {
      allowed: true,
      remaining: limit - newCount,
      reset: Math.floor(expiresAt.getTime() / 1000),
    };
  } catch (error) {
    console.error('checkRateLimit error:', error);
    // Fail open on error
    return {
      allowed: true,
      remaining: limit - 1,
      reset: Math.floor((Date.now() + windowMs) / 1000),
    };
  }
}

/**
 * Check API key rate limits (per-minute and per-hour)
 */
export async function checkAPIKeyRateLimit(
  apiKeyId: string,
  perMinute: number,
  perHour: number
): Promise<RateLimitResult> {
  // Check per-minute limit
  const minuteLimit = await checkRateLimit(
    `api_key:${apiKeyId}:minute`,
    perMinute,
    60 * 1000 // 1 minute
  );

  if (!minuteLimit.allowed) {
    return minuteLimit;
  }

  // Check per-hour limit
  const hourLimit = await checkRateLimit(
    `api_key:${apiKeyId}:hour`,
    perHour,
    60 * 60 * 1000 // 1 hour
  );

  if (!hourLimit.allowed) {
    return hourLimit;
  }

  // Return most restrictive limit
  return {
    allowed: true,
    remaining: Math.min(minuteLimit.remaining, hourLimit.remaining),
    reset: Math.min(minuteLimit.reset, hourLimit.reset),
  };
}

/**
 * Check user rate limits (for free tier daily limits)
 */
export async function checkUserRateLimit(
  userId: string,
  dailyLimit: number
): Promise<RateLimitResult> {
  return await checkRateLimit(
    `user:${userId}:day`,
    dailyLimit,
    24 * 60 * 60 * 1000 // 24 hours
  );
}

/**
 * Get current rate limit status without incrementing
 */
export async function getRateLimitStatus(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  try {
    const now = Date.now();
    const windowStart = new Date(now - windowMs);

    const { data: bucket } = await supabase
      .from('rate_limit_buckets')
      .select('*')
      .eq('key', key)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (!bucket) {
      return {
        allowed: true,
        remaining: limit,
        reset: Math.floor((now + windowMs) / 1000),
      };
    }

    const bucketWindowStart = new Date(bucket.window_start).getTime();
    const currentCount = bucketWindowStart >= windowStart.getTime() ? bucket.count : 0;

    return {
      allowed: currentCount < limit,
      remaining: Math.max(0, limit - currentCount),
      reset: Math.floor(new Date(bucket.expires_at).getTime() / 1000),
      retryAfter: currentCount >= limit
        ? Math.ceil((new Date(bucket.expires_at).getTime() - now) / 1000)
        : undefined,
    };
  } catch (error) {
    console.error('getRateLimitStatus error:', error);
    return {
      allowed: true,
      remaining: limit,
      reset: Math.floor((Date.now() + windowMs) / 1000),
    };
  }
}

/**
 * Reset rate limit for a key (admin/testing only)
 */
export async function resetRateLimit(key: string): Promise<void> {
  try {
    await supabase.from('rate_limit_buckets').delete().eq('key', key);
  } catch (error) {
    console.error('resetRateLimit error:', error);
  }
}

/**
 * Cleanup expired buckets (run periodically)
 */
export async function cleanupExpiredBuckets(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('rate_limit_buckets')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select();

    if (error) {
      console.error('cleanupExpiredBuckets error:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('cleanupExpiredBuckets error:', error);
    return 0;
  }
}

/**
 * Create rate_limit_buckets table if not exists
 * This can be added to migration 003 or run separately
 */
export const RATE_LIMIT_TABLE_SQL = `
-- Rate limit buckets table
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limit_expires 
  ON public.rate_limit_buckets(expires_at);

-- RLS policies (service role only)
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access"
  ON public.rate_limit_buckets
  FOR ALL
  USING (auth.role() = 'service_role');
`;
