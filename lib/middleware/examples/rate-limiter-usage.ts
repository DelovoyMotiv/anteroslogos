/**
 * Rate Limiter Usage Examples
 * Demonstrates various ways to use the rate limiting middleware
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withRateLimit } from '../rateLimiter';

// =====================================================
// EXAMPLE 1: Basic Usage (Default Configuration)
// =====================================================

/**
 * Apply default rate limiting:
 * - 60 req/min for authenticated users
 * - 10 req/min for anonymous users
 */
async function basicHandler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ message: 'Success' });
}

export const basicExample = withRateLimit(basicHandler);

// =====================================================
// EXAMPLE 2: Custom Limits
// =====================================================

/**
 * Override default limits for specific endpoints
 */
async function customLimitsHandler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ message: 'High-traffic endpoint' });
}

export const customLimitsExample = withRateLimit(customLimitsHandler, {
  authenticatedConfig: {
    requestsPerMinute: 100, // Higher limit for authenticated
    burstSize: 120,
  },
  anonymousConfig: {
    requestsPerMinute: 20, // Higher limit for anonymous
    burstSize: 25,
  },
});

// =====================================================
// EXAMPLE 3: API Key-Based Rate Limiting
// =====================================================

/**
 * Rate limit by API key instead of IP address
 */
async function apiKeyHandler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    res.status(401).json({ error: 'API key required' });
    return;
  }

  res.status(200).json({ message: 'API key authenticated' });
}

export const apiKeyExample = withRateLimit(apiKeyHandler, {
  getIdentifier: (req) => {
    const apiKey = req.headers['x-api-key'] as string;
    return apiKey || 'anonymous';
  },
});

// =====================================================
// EXAMPLE 4: Custom Tier Logic
// =====================================================

/**
 * Custom logic to determine rate limit tier
 * (e.g., based on user subscription level)
 */
async function customTierHandler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ message: 'Custom tier logic' });
}

export const customTierExample = withRateLimit(customTierHandler, {
  getTier: (req) => {
    const userTier = req.headers['x-user-tier'] as string;
    
    // Premium users get authenticated limits
    if (userTier === 'premium' || userTier === 'enterprise') {
      return 'authenticated';
    }
    
    // Free users get anonymous limits
    return 'anonymous';
  },
});

// =====================================================
// EXAMPLE 5: Skip Rate Limiting for Certain Requests
// =====================================================

/**
 * Skip rate limiting for health checks and internal requests
 */
async function skipHandler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.url === '/api/health') {
    res.status(200).json({ status: 'healthy' });
    return;
  }

  res.status(200).json({ message: 'Regular endpoint' });
}

export const skipExample = withRateLimit(skipHandler, {
  skip: (req) => {
    // Skip rate limiting for health checks
    if (req.url === '/api/health') return true;
    
    // Skip for internal requests
    const internalToken = req.headers['x-internal-token'];
    if (internalToken === process.env.INTERNAL_TOKEN) return true;
    
    return false;
  },
});

// =====================================================
// EXAMPLE 6: Strict Rate Limiting (No Burst)
// =====================================================

/**
 * Strict rate limiting with minimal burst allowance
 * Useful for expensive operations
 */
async function strictHandler(_req: VercelRequest, res: VercelResponse) {
  // Expensive operation (e.g., AI model inference)
  res.status(200).json({ message: 'Expensive operation completed' });
}

export const strictExample = withRateLimit(strictHandler, {
  authenticatedConfig: {
    requestsPerMinute: 10,
    burstSize: 10, // No burst allowance
  },
  anonymousConfig: {
    requestsPerMinute: 2,
    burstSize: 2, // No burst allowance
  },
});

// =====================================================
// EXAMPLE 7: Generous Rate Limiting (Large Burst)
// =====================================================

/**
 * Generous rate limiting with large burst allowance
 * Useful for batch operations
 */
async function generousHandler(_req: VercelRequest, res: VercelResponse) {
  // Batch operation
  res.status(200).json({ message: 'Batch operation completed' });
}

export const generousExample = withRateLimit(generousHandler, {
  authenticatedConfig: {
    requestsPerMinute: 60,
    burstSize: 200, // Allow large bursts
  },
  anonymousConfig: {
    requestsPerMinute: 10,
    burstSize: 50, // Allow moderate bursts
  },
});

// =====================================================
// EXAMPLE 8: Combined with Other Middleware
// =====================================================

import { compose } from '../../validation/middleware';
import { withCors } from '../../validation/middleware';
import { withCsrfProtection } from '../../security/csrf';

/**
 * Combine rate limiting with other middleware
 */
async function combinedHandler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ message: 'Protected endpoint' });
}

export const combinedExample = (compose as any)(
  withCors,
  withRateLimit,
  (handler: any) => withCsrfProtection(handler, {
    excludeMethods: ['GET', 'OPTIONS'],
  })
)(combinedHandler);

// =====================================================
// EXAMPLE 9: User-Specific Rate Limiting
// =====================================================

/**
 * Rate limit per user ID (requires authentication)
 */
import { isRequestWithUser } from '../../../types/lib.types';

async function userSpecificHandler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const userId = isRequestWithUser(req) ? req.user?.id : undefined;
  
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  res.status(200).json({ message: 'User-specific endpoint' });
}

export const userSpecificExample = withRateLimit(userSpecificHandler, {
  getIdentifier: (req) => {
    // Use user ID if authenticated, otherwise fall back to IP
    const userId = isRequestWithUser(req) ? req.user?.id : undefined;
    if (userId) return `user:${userId}`;
    
    const ip = req.headers['x-forwarded-for'] as string;
    return ip?.split(',')[0]?.trim() || 'unknown';
  },
});

// =====================================================
// EXAMPLE 10: Dynamic Rate Limiting Based on Time
// =====================================================

/**
 * Different rate limits during peak hours
 */
async function dynamicHandler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ message: 'Dynamic rate limiting' });
}

export const dynamicExample = withRateLimit(dynamicHandler, {
  authenticatedConfig: (() => {
    const hour = new Date().getHours();
    const isPeakHours = hour >= 9 && hour <= 17; // 9 AM - 5 PM
    
    return isPeakHours
      ? { requestsPerMinute: 30, burstSize: 40 } // Lower during peak
      : { requestsPerMinute: 100, burstSize: 120 }; // Higher off-peak
  })(),
});

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

import {
  checkRateLimit,
  resetRateLimit,
  getRateLimitStats,
} from '../rateLimiter';

/**
 * Check rate limit status without consuming tokens
 */
export async function checkUserRateLimit(userId: string) {
  const result = checkRateLimit(`user:${userId}`, 'authenticated');
  
  console.log(`User ${userId} rate limit status:`, {
    allowed: result.allowed,
    remaining: result.remaining,
    limit: result.limit,
    resetAt: new Date(result.resetAt).toISOString(),
  });
  
  return result;
}

/**
 * Reset rate limit for a user (e.g., after subscription upgrade)
 */
export async function resetUserRateLimit(userId: string) {
  resetRateLimit(`user:${userId}`);
  console.log(`Rate limit reset for user ${userId}`);
}

/**
 * Get detailed rate limit statistics
 */
export async function getUserRateLimitStats(userId: string) {
  const stats = getRateLimitStats(`user:${userId}`, 'authenticated');
  
  console.log(`User ${userId} rate limit stats:`, {
    currentTokens: stats.tokens,
    capacity: stats.capacity,
    refillRate: `${stats.refillRate} tokens/second`,
    limit: `${stats.limit} requests/minute`,
  });
  
  return stats;
}

/**
 * Monitor rate limit usage across all users
 */
export async function monitorRateLimitUsage(userIds: string[]) {
  const usage = await Promise.all(
    userIds.map(async (userId) => {
      const stats = getRateLimitStats(`user:${userId}`, 'authenticated');
      return {
        userId,
        tokensUsed: stats.capacity - stats.tokens,
        tokensRemaining: stats.tokens,
        utilizationPercent: ((stats.capacity - stats.tokens) / stats.capacity) * 100,
      };
    })
  );
  
  // Sort by utilization (highest first)
  usage.sort((a, b) => b.utilizationPercent - a.utilizationPercent);
  
  console.log('Top rate limit users:', usage.slice(0, 10));
  
  return usage;
}
