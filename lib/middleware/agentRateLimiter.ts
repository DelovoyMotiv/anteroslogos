/**
 * Agent API Rate Limiter
 * 
 * Implements rate limiting for the Agent Middleware API with:
 * - Per-API-key rate limits (100 requests/minute)
 * - Global rate limits (1000 requests/minute)
 * - Standard rate limit headers (X-RateLimit-*)
 * - Retry-After header for exceeded limits
 * 
 * **Validates: Requirements 6.5**
 */

import { supabase } from '../supabase';
import { logger } from '../a2a/logger';

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

/**
 * Rate limit result with headers
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number; // seconds until can retry
}

/**
 * Rate limit headers to add to response
 */
export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'Retry-After'?: string;
}

/**
 * Rate limit configurations
 */
const RATE_LIMITS = {
  perApiKey: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  global: {
    maxRequests: 1000,
    windowMs: 60 * 1000, // 1 minute
  },
} as const;

/**
 * Generate rate limit key
 */
function generateKey(identifier: string, scope: 'api-key' | 'global'): string {
  const timestamp = Math.floor(Date.now() / RATE_LIMITS.perApiKey.windowMs);
  return `agent:ratelimit:${scope}:${identifier}:${timestamp}`;
}

/**
 * Check rate limit for a given identifier
 */
async function checkLimit(
  identifier: string,
  config: RateLimitConfig,
  scope: 'api-key' | 'global'
): Promise<RateLimitResult> {
  try {
    if (!supabase) {
      // Fail open in development if supabase not configured
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        reset: new Date(Date.now() + config.windowMs),
      };
    }

    const key = generateKey(identifier, scope);
    const now = new Date();
    const windowStart = new Date(Math.floor(now.getTime() / config.windowMs) * config.windowMs);
    const reset = new Date(windowStart.getTime() + config.windowMs);

    // Get current count for this window
    type BucketRow = { count: number; window_start: string };
    const { data: bucket } = await supabase
      .from('rate_limit_buckets')
      .select('count, window_start')
      .eq('key', key)
      .gte('expires_at', now.toISOString())
      .maybeSingle();

    const currentCount = (bucket as BucketRow | null)?.count || 0;
    const remaining = Math.max(0, config.maxRequests - currentCount - 1);

    // Check if limit exceeded
    if (currentCount >= config.maxRequests) {
      const retryAfter = Math.ceil((reset.getTime() - now.getTime()) / 1000);
      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        reset,
        retryAfter,
      };
    }

    return {
      allowed: true,
      limit: config.maxRequests,
      remaining,
      reset,
    };
  } catch (error) {
    logger.error('Rate limit check failed', { identifier, scope }, error as Error);
    // Fail open on error
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      reset: new Date(Date.now() + config.windowMs),
    };
  }
}

/**
 * Record a rate limit attempt (increment counter)
 */
async function recordAttempt(
  identifier: string,
  config: RateLimitConfig,
  scope: 'api-key' | 'global'
): Promise<void> {
  try {
    if (!supabase) return;

    const key = generateKey(identifier, scope);
    const now = new Date();
    const windowStart = new Date(Math.floor(now.getTime() / config.windowMs) * config.windowMs);
    const expiresAt = new Date(windowStart.getTime() + config.windowMs);

    // Try to increment existing bucket
    type BucketRow = { count: number; window_start: string };
    const { data: existing } = await supabase
      .from('rate_limit_buckets')
      .select('count, window_start')
      .eq('key', key)
      .gte('expires_at', now.toISOString())
      .maybeSingle();

    if (existing) {
      const bucket = existing as BucketRow;
      // Increment existing bucket
      await supabase
        .from('rate_limit_buckets')
        .update({ count: bucket.count + 1 } as never)
        .eq('key', key)
        .eq('window_start', bucket.window_start);
    } else {
      // Create new bucket
      await supabase
        .from('rate_limit_buckets')
        .insert({
          key,
          count: 1,
          window_start: windowStart.toISOString(),
          expires_at: expiresAt.toISOString(),
        } as never);
    }
  } catch (error) {
    logger.error('Failed to record rate limit attempt', { identifier, scope }, error as Error);
    // Non-critical, continue
  }
}

/**
 * Check rate limit for API key
 * Returns the most restrictive result (per-key or global)
 */
export async function checkRateLimit(
  apiKeyId: string,
  requestId?: string
): Promise<RateLimitResult> {
  // Check per-API-key limit
  const perKeyResult = await checkLimit(
    apiKeyId,
    RATE_LIMITS.perApiKey,
    'api-key'
  );

  // Check global limit
  const globalResult = await checkLimit(
    'global',
    RATE_LIMITS.global,
    'global'
  );

  // Return the most restrictive result
  const result = !perKeyResult.allowed ? perKeyResult : 
                 !globalResult.allowed ? globalResult : 
                 perKeyResult.remaining < globalResult.remaining ? perKeyResult : globalResult;

  // Log rate limit check
  logger.debug('Rate limit check', {
    api_key_id: apiKeyId,
    request_id: requestId,
    allowed: result.allowed,
    remaining: result.remaining,
    limit: result.limit,
    tags: ['agent-api', 'rate-limit'],
  });

  return result;
}

/**
 * Record rate limit attempt for both per-key and global limits
 */
export async function recordRateLimitAttempt(
  apiKeyId: string,
  requestId?: string
): Promise<void> {
  // Record per-API-key attempt
  await recordAttempt(apiKeyId, RATE_LIMITS.perApiKey, 'api-key');

  // Record global attempt
  await recordAttempt('global', RATE_LIMITS.global, 'global');

  logger.debug('Rate limit attempt recorded', {
    api_key_id: apiKeyId,
    request_id: requestId,
    tags: ['agent-api', 'rate-limit'],
  });
}

/**
 * Convert rate limit result to HTTP headers
 */
export function getRateLimitHeaders(result: RateLimitResult): RateLimitHeaders {
  const headers: RateLimitHeaders = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.reset.getTime() / 1000)),
  };

  if (result.retryAfter) {
    headers['Retry-After'] = String(result.retryAfter);
  }

  return headers;
}

/**
 * Get human-readable rate limit error message
 */
export function getRateLimitMessage(result: RateLimitResult): string {
  if (result.retryAfter) {
    if (result.retryAfter < 60) {
      return `Rate limit exceeded. Please wait ${result.retryAfter} seconds before trying again.`;
    }
    const minutes = Math.ceil(result.retryAfter / 60);
    return `Rate limit exceeded. Please wait ${minutes} minute${minutes > 1 ? 's' : ''} before trying again.`;
  }
  return 'Rate limit exceeded. Please try again later.';
}
