/**
 * Unit Tests for Rate Limiter
 * Tests token bucket algorithm, rate limit enforcement, and HTTP headers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  withRateLimit,
  checkRateLimit,
  resetRateLimit,
  getRateLimitStats,
  clearAllRateLimits,
  stopRateLimitCleanup,
  RATE_LIMIT_CONFIGS,
} from '../rateLimiter';

// Mock request/response helpers
function createMockRequest(overrides: Partial<VercelRequest> = {}): VercelRequest {
  return {
    method: 'GET',
    url: '/api/test',
    headers: {},
    query: {},
    body: {},
    ...overrides,
  } as VercelRequest;
}

function createMockResponse(): VercelResponse {
  const headers: Record<string, string> = {};
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn((key: string, value: string) => {
      headers[key] = value;
    }),
    getHeader: vi.fn((key: string) => headers[key]),
    _headers: headers,
  } as unknown as VercelResponse;

  return res;
}

describe('Rate Limiter - Token Bucket Algorithm', () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  afterEach(() => {
    clearAllRateLimits();
    stopRateLimitCleanup();
  });

  describe('Token Bucket Mechanics', () => {
    it('should allow requests when tokens are available', async () => {
      const req = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });
      const res = createMockResponse();
      const handler = vi.fn();

      const middleware = withRateLimit(handler);
      await middleware(req, res);

      expect(handler).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(429);
    });

    it('should block requests when tokens are exhausted', async () => {
      const req = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.2' },
      });
      const res = createMockResponse();
      const handler = vi.fn();

      const middleware = withRateLimit(handler, {
        anonymousConfig: { requestsPerMinute: 2, burstSize: 2 },
      });

      // First two requests should succeed
      await middleware(req, res);
      await middleware(req, res);
      expect(handler).toHaveBeenCalledTimes(2);

      // Third request should be blocked
      const res3 = createMockResponse();
      await middleware(req, res3);
      expect(res3.status).toHaveBeenCalledWith(429);
      expect(handler).toHaveBeenCalledTimes(2); // Still only 2
    });

    it('should refill tokens over time', async () => {
      vi.useFakeTimers();

      const req = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.3' },
      });
      const handler = vi.fn();

      const middleware = withRateLimit(handler, {
        anonymousConfig: { requestsPerMinute: 60, burstSize: 2 },
      });

      // Exhaust tokens
      await middleware(req, createMockResponse());
      await middleware(req, createMockResponse());

      // Should be blocked
      const res3 = createMockResponse();
      await middleware(req, res3);
      expect(res3.status).toHaveBeenCalledWith(429);

      // Advance time by 1 second (should refill 1 token at 60/min = 1/sec)
      vi.advanceTimersByTime(1000);

      // Should now succeed
      const res4 = createMockResponse();
      await middleware(req, res4);
      expect(res4.status).not.toHaveBeenCalledWith(429);

      vi.useRealTimers();
    });
  });

  describe('Authenticated vs Anonymous Limits', () => {
    it('should apply 60 req/min limit for authenticated users', async () => {
      const req = createMockRequest({
        headers: {
          'x-forwarded-for': '192.168.1.4',
          authorization: 'Bearer valid-token',
        },
      });

      const result = checkRateLimit('192.168.1.4', 'authenticated');
      expect(result.limit).toBe(60);
    });

    it('should apply 10 req/min limit for anonymous users', async () => {
      const req = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.5' },
      });

      const result = checkRateLimit('192.168.1.5', 'anonymous');
      expect(result.limit).toBe(10);
    });

    it('should allow more requests for authenticated users', async () => {
      const anonReq = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.6' },
      });
      const authReq = createMockRequest({
        headers: {
          'x-forwarded-for': '192.168.1.7',
          authorization: 'Bearer token',
        },
      });

      const handler = vi.fn();
      const middleware = withRateLimit(handler);

      // Anonymous user - should hit limit quickly
      for (let i = 0; i < 15; i++) {
        await middleware(anonReq, createMockResponse());
      }
      const anonResult = createMockResponse();
      await middleware(anonReq, anonResult);
      expect(anonResult.status).toHaveBeenCalledWith(429);

      // Authenticated user - should still have tokens
      const authResult = createMockResponse();
      await middleware(authReq, authResult);
      expect(authResult.status).not.toHaveBeenCalledWith(429);
    });
  });

  describe('HTTP Headers', () => {
    it('should set X-RateLimit-* headers on all responses', async () => {
      const req = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.8' },
      });
      const res = createMockResponse();
      const handler = vi.fn();

      const middleware = withRateLimit(handler);
      await middleware(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(String));
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
    });

    it('should set Retry-After header on 429 responses', async () => {
      const req = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.9' },
      });
      const handler = vi.fn();

      const middleware = withRateLimit(handler, {
        anonymousConfig: { requestsPerMinute: 1, burstSize: 1 },
      });

      // Exhaust tokens
      await middleware(req, createMockResponse());

      // Should get 429 with Retry-After
      const res2 = createMockResponse();
      await middleware(req, res2);

      expect(res2.status).toHaveBeenCalledWith(429);
      expect(res2.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
    });

    it('should include retryAfter in 429 response body', async () => {
      const req = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.10' },
      });
      const handler = vi.fn();

      const middleware = withRateLimit(handler, {
        anonymousConfig: { requestsPerMinute: 1, burstSize: 1 },
      });

      // Exhaust tokens
      await middleware(req, createMockResponse());

      // Check 429 response body
      const res2 = createMockResponse();
      await middleware(req, res2);

      expect(res2.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Rate limit exceeded',
          retryAfter: expect.any(Number),
          limit: expect.any(Number),
        })
      );
    });
  });

  describe('IP Address Extraction', () => {
    it('should extract IP from x-forwarded-for header', async () => {
      const req = createMockRequest({
        headers: { 'x-forwarded-for': '203.0.113.1, 198.51.100.1' },
      });
      const handler = vi.fn();

      const middleware = withRateLimit(handler);
      await middleware(req, createMockResponse());

      // Check that rate limit is applied to first IP
      const stats = getRateLimitStats('203.0.113.1', 'anonymous');
      expect(stats.tokens).toBeLessThan(stats.capacity);
    });

    it('should extract IP from x-real-ip header', async () => {
      const req = createMockRequest({
        headers: { 'x-real-ip': '203.0.113.2' },
      });
      const handler = vi.fn();

      const middleware = withRateLimit(handler);
      await middleware(req, createMockResponse());

      const stats = getRateLimitStats('203.0.113.2', 'anonymous');
      expect(stats.tokens).toBeLessThan(stats.capacity);
    });

    it('should extract IP from cf-connecting-ip header', async () => {
      const req = createMockRequest({
        headers: { 'cf-connecting-ip': '203.0.113.3' },
      });
      const handler = vi.fn();

      const middleware = withRateLimit(handler);
      await middleware(req, createMockResponse());

      const stats = getRateLimitStats('203.0.113.3', 'anonymous');
      expect(stats.tokens).toBeLessThan(stats.capacity);
    });
  });

  describe('Custom Options', () => {
    it('should support custom identifier function', async () => {
      const req = createMockRequest({
        headers: { 'x-api-key': 'custom-key-123' },
      });
      const handler = vi.fn();

      const middleware = withRateLimit(handler, {
        getIdentifier: (req) => req.headers['x-api-key'] as string,
      });

      await middleware(req, createMockResponse());

      const stats = getRateLimitStats('custom-key-123', 'anonymous');
      expect(stats.tokens).toBeLessThan(stats.capacity);
    });

    it('should support custom tier function', async () => {
      const req = createMockRequest({
        headers: { 'x-user-tier': 'premium' },
      });
      const handler = vi.fn();

      const middleware = withRateLimit(handler, {
        getTier: (req) =>
          req.headers['x-user-tier'] === 'premium' ? 'authenticated' : 'anonymous',
      });

      await middleware(req, createMockResponse());

      // Should use authenticated limits
      const res = createMockResponse();
      expect(res._headers['X-RateLimit-Limit']).toBeUndefined();
    });

    it('should support skip function', async () => {
      const req = createMockRequest({
        url: '/api/health',
      });
      const handler = vi.fn();

      const middleware = withRateLimit(handler, {
        skip: (req) => req.url === '/api/health',
      });

      // Should skip rate limiting
      await middleware(req, createMockResponse());
      expect(handler).toHaveBeenCalled();

      // Stats should not be affected
      const stats = getRateLimitStats('unknown', 'anonymous');
      expect(stats.tokens).toBe(stats.capacity);
    });
  });

  describe('Utility Functions', () => {
    it('checkRateLimit should not consume tokens', () => {
      const result1 = checkRateLimit('test-ip', 'anonymous');
      const result2 = checkRateLimit('test-ip', 'anonymous');

      expect(result1.remaining).toBe(result2.remaining);
    });

    it('resetRateLimit should clear bucket', async () => {
      const req = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.11' },
      });
      const handler = vi.fn();

      const middleware = withRateLimit(handler, {
        anonymousConfig: { requestsPerMinute: 2, burstSize: 2 },
      });

      // Exhaust tokens
      await middleware(req, createMockResponse());
      await middleware(req, createMockResponse());

      // Should be blocked
      const res3 = createMockResponse();
      await middleware(req, res3);
      expect(res3.status).toHaveBeenCalledWith(429);

      // Reset
      resetRateLimit('192.168.1.11');

      // Should now succeed
      const res4 = createMockResponse();
      await middleware(req, res4);
      expect(res4.status).not.toHaveBeenCalledWith(429);
    });

    it('getRateLimitStats should return current bucket state', async () => {
      const req = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.12' },
      });
      const handler = vi.fn();

      const middleware = withRateLimit(handler);
      await middleware(req, createMockResponse());

      const stats = getRateLimitStats('192.168.1.12', 'anonymous');
      expect(stats.tokens).toBeLessThan(stats.capacity);
      expect(stats.limit).toBe(RATE_LIMIT_CONFIGS.anonymous.requestsPerMinute);
    });
  });
});
