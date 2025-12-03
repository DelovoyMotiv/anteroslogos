/**
 * Integration Tests for Rate Limiter
 * Tests rate limiting with realistic API scenarios
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  withRateLimit,
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

function createMockResponse(): {
  res: VercelResponse;
  getStatus: () => number | undefined;
  getJson: () => any;
  getHeaders: () => Record<string, string>;
} {
  let statusCode: number | undefined;
  let jsonData: any;
  const headers: Record<string, string> = {};

  const res = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (data: any) => {
      jsonData = data;
      return res;
    },
    setHeader: (key: string, value: string) => {
      headers[key] = value;
    },
  } as unknown as VercelResponse;

  return {
    res,
    getStatus: () => statusCode,
    getJson: () => jsonData,
    getHeaders: () => headers,
  };
}

describe('Rate Limiter - Integration Tests', () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  afterEach(() => {
    clearAllRateLimits();
    stopRateLimitCleanup();
  });

  describe('Anonymous User Flow', () => {
    it('should enforce 10 req/min limit for anonymous users', async () => {
      const handler = async (req: VercelRequest, res: VercelResponse) => {
        res.status(200).json({ success: true });
      };

      const middleware = withRateLimit(handler);
      const ip = '203.0.113.100';

      let successCount = 0;
      let blockedCount = 0;

      // Make 20 requests
      for (let i = 0; i < 20; i++) {
        const req = createMockRequest({
          headers: { 'x-forwarded-for': ip },
        });
        const { res, getStatus } = createMockResponse();

        await middleware(req, res);

        if (getStatus() === 200) {
          successCount++;
        } else if (getStatus() === 429) {
          blockedCount++;
        }
      }

      // Should allow ~15 requests (10 + burst of 5)
      expect(successCount).toBeGreaterThanOrEqual(10);
      expect(successCount).toBeLessThanOrEqual(15);
      expect(blockedCount).toBeGreaterThan(0);
      expect(successCount + blockedCount).toBe(20);
    });

    it('should include proper error message in 429 response', async () => {
      const handler = async (req: VercelRequest, res: VercelResponse) => {
        res.status(200).json({ success: true });
      };

      const middleware = withRateLimit(handler, {
        anonymousConfig: { requestsPerMinute: 1, burstSize: 1 },
      });

      const ip = '203.0.113.101';

      // First request succeeds
      const req1 = createMockRequest({
        headers: { 'x-forwarded-for': ip },
      });
      const mock1 = createMockResponse();
      await middleware(req1, mock1.res);
      expect(mock1.getStatus()).toBe(200);

      // Second request blocked
      const req2 = createMockRequest({
        headers: { 'x-forwarded-for': ip },
      });
      const mock2 = createMockResponse();
      await middleware(req2, mock2.res);

      expect(mock2.getStatus()).toBe(429);
      const json = mock2.getJson();
      expect(json).toMatchObject({
        error: 'Rate limit exceeded',
        message: expect.stringContaining('Too many requests'),
        retryAfter: expect.any(Number),
        limit: 1,
      });
    });
  });

  describe('Authenticated User Flow', () => {
    it('should enforce 60 req/min limit for authenticated users', async () => {
      const handler = async (req: VercelRequest, res: VercelResponse) => {
        res.status(200).json({ success: true });
      };

      const middleware = withRateLimit(handler);
      const ip = '203.0.113.102';

      let successCount = 0;

      // Make 70 requests with auth token
      for (let i = 0; i < 70; i++) {
        const req = createMockRequest({
          headers: {
            'x-forwarded-for': ip,
            authorization: 'Bearer valid-token-123',
          },
        });
        const { res, getStatus } = createMockResponse();

        await middleware(req, res);

        if (getStatus() === 200) {
          successCount++;
        }
      }

      // Should allow ~80 requests (60 + burst of 20)
      expect(successCount).toBeGreaterThanOrEqual(60);
      expect(successCount).toBeLessThanOrEqual(80);
    });

    it('should allow significantly more requests than anonymous', async () => {
      const handler = async (req: VercelRequest, res: VercelResponse) => {
        res.status(200).json({ success: true });
      };

      const middleware = withRateLimit(handler);

      // Anonymous user
      const anonIp = '203.0.113.103';
      let anonSuccess = 0;
      for (let i = 0; i < 20; i++) {
        const req = createMockRequest({
          headers: { 'x-forwarded-for': anonIp },
        });
        const { res, getStatus } = createMockResponse();
        await middleware(req, res);
        if (getStatus() === 200) anonSuccess++;
      }

      // Authenticated user
      const authIp = '203.0.113.104';
      let authSuccess = 0;
      for (let i = 0; i < 20; i++) {
        const req = createMockRequest({
          headers: {
            'x-forwarded-for': authIp,
            authorization: 'Bearer token',
          },
        });
        const { res, getStatus } = createMockResponse();
        await middleware(req, res);
        if (getStatus() === 200) authSuccess++;
      }

      // Authenticated should succeed more
      expect(authSuccess).toBeGreaterThan(anonSuccess);
      expect(authSuccess).toBe(20); // All should succeed
    });
  });

  describe('HTTP Headers', () => {
    it('should set all required rate limit headers', async () => {
      const handler = async (req: VercelRequest, res: VercelResponse) => {
        res.status(200).json({ success: true });
      };

      const middleware = withRateLimit(handler);
      const req = createMockRequest({
        headers: { 'x-forwarded-for': '203.0.113.105' },
      });
      const { res, getHeaders } = createMockResponse();

      await middleware(req, res);

      const headers = getHeaders();
      expect(headers['X-RateLimit-Limit']).toBeDefined();
      expect(headers['X-RateLimit-Remaining']).toBeDefined();
      expect(headers['X-RateLimit-Reset']).toBeDefined();

      // Validate header values
      expect(parseInt(headers['X-RateLimit-Limit'])).toBeGreaterThan(0);
      expect(parseInt(headers['X-RateLimit-Remaining'])).toBeGreaterThanOrEqual(0);
      expect(parseInt(headers['X-RateLimit-Reset'])).toBeGreaterThan(Date.now() / 1000);
    });

    it('should set Retry-After header on 429 responses', async () => {
      const handler = async (req: VercelRequest, res: VercelResponse) => {
        res.status(200).json({ success: true });
      };

      const middleware = withRateLimit(handler, {
        anonymousConfig: { requestsPerMinute: 1, burstSize: 1 },
      });

      const ip = '203.0.113.106';

      // Exhaust limit
      await middleware(
        createMockRequest({ headers: { 'x-forwarded-for': ip } }),
        createMockResponse().res
      );

      // Get 429
      const req2 = createMockRequest({
        headers: { 'x-forwarded-for': ip },
      });
      const { res, getStatus, getHeaders } = createMockResponse();
      await middleware(req2, res);

      expect(getStatus()).toBe(429);
      const headers = getHeaders();
      expect(headers['Retry-After']).toBeDefined();
      expect(parseInt(headers['Retry-After'])).toBeGreaterThan(0);
    });

    it('should decrement remaining count with each request', async () => {
      const handler = async (req: VercelRequest, res: VercelResponse) => {
        res.status(200).json({ success: true });
      };

      const middleware = withRateLimit(handler);
      const ip = '203.0.113.107';

      const remainingCounts: number[] = [];

      for (let i = 0; i < 5; i++) {
        const req = createMockRequest({
          headers: { 'x-forwarded-for': ip },
        });
        const { res, getHeaders } = createMockResponse();
        await middleware(req, res);

        const remaining = parseInt(getHeaders()['X-RateLimit-Remaining']);
        remainingCounts.push(remaining);
      }

      // Each request should decrease remaining count
      for (let i = 1; i < remainingCounts.length; i++) {
        expect(remainingCounts[i]).toBeLessThan(remainingCounts[i - 1]);
      }
    });
  });

  describe('Multiple IPs', () => {
    it('should track rate limits independently per IP', async () => {
      const handler = async (req: VercelRequest, res: VercelResponse) => {
        res.status(200).json({ success: true });
      };

      const middleware = withRateLimit(handler, {
        anonymousConfig: { requestsPerMinute: 2, burstSize: 2 },
      });

      const ip1 = '203.0.113.108';
      const ip2 = '203.0.113.109';

      // Exhaust IP1
      await middleware(
        createMockRequest({ headers: { 'x-forwarded-for': ip1 } }),
        createMockResponse().res
      );
      await middleware(
        createMockRequest({ headers: { 'x-forwarded-for': ip1 } }),
        createMockResponse().res
      );

      // IP1 should be blocked
      const ip1Mock = createMockResponse();
      await middleware(
        createMockRequest({ headers: { 'x-forwarded-for': ip1 } }),
        ip1Mock.res
      );
      expect(ip1Mock.getStatus()).toBe(429);

      // IP2 should still work
      const ip2Mock = createMockResponse();
      await middleware(
        createMockRequest({ headers: { 'x-forwarded-for': ip2 } }),
        ip2Mock.res
      );
      expect(ip2Mock.getStatus()).toBe(200);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing IP gracefully', async () => {
      const handler = async (req: VercelRequest, res: VercelResponse) => {
        res.status(200).json({ success: true });
      };

      const middleware = withRateLimit(handler);
      const req = createMockRequest({ headers: {} });
      const { res, getStatus } = createMockResponse();

      await middleware(req, res);

      // Should still apply rate limiting (using 'unknown' as identifier)
      expect(getStatus()).toBe(200);
    });

    it('should handle malformed Authorization header', async () => {
      const handler = async (req: VercelRequest, res: VercelResponse) => {
        res.status(200).json({ success: true });
      };

      const middleware = withRateLimit(handler);
      const req = createMockRequest({
        headers: {
          'x-forwarded-for': '203.0.113.110',
          authorization: 'InvalidFormat',
        },
      });
      const { res, getStatus } = createMockResponse();

      await middleware(req, res);

      // Should treat as anonymous
      expect(getStatus()).toBe(200);
    });

    it('should handle empty Bearer token', async () => {
      const handler = async (req: VercelRequest, res: VercelResponse) => {
        res.status(200).json({ success: true });
      };

      const middleware = withRateLimit(handler);
      const req = createMockRequest({
        headers: {
          'x-forwarded-for': '203.0.113.111',
          authorization: 'Bearer ',
        },
      });
      const { res, getHeaders } = createMockResponse();

      await middleware(req, res);

      // Should treat as anonymous (10 req/min)
      const limit = parseInt(getHeaders()['X-RateLimit-Limit']);
      expect(limit).toBe(RATE_LIMIT_CONFIGS.anonymous.requestsPerMinute);
    });
  });
});
