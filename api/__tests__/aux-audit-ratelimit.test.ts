/**
 * AUX Audit API Rate Limiting Tests
 * 
 * Tests rate limiting enforcement for POST /api/audit/aux endpoint
 * Requirement 13.5: Per-IP rate limiting
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler from '../audit/aux';
import { createMockRequest, createMockResponse } from './helpers';
import { clearAllRateLimits } from '../../lib/middleware/rateLimiter';

describe('POST /api/audit/aux - Rate Limiting', () => {
  beforeEach(() => {
    // Clear all mocks and rate limits before each test
    vi.clearAllMocks();
    clearAllRateLimits();
    
    // Mock fetch to avoid actual network calls
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
  });

  afterEach(() => {
    // Clean up rate limits after each test
    clearAllRateLimits();
  });

  describe('Anonymous User Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { url: 'https://example.com' },
        headers: {
          'x-forwarded-for': '192.168.1.100',
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      // Should not be rate limited (first request)
      expect(res.statusCode).not.toBe(429);
      
      // Should have rate limit headers
      expect(res.headers['x-ratelimit-limit']).toBeDefined();
      expect(res.headers['x-ratelimit-remaining']).toBeDefined();
      expect(res.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('should enforce rate limit for anonymous users (10 req/min)', async () => {
      const ipAddress = '192.168.1.101';
      
      // Make 15 requests (burst capacity) - should all succeed
      for (let i = 0; i < 15; i++) {
        const req = createMockRequest({
          method: 'POST',
          body: { url: 'https://example.com' },
          headers: {
            'x-forwarded-for': ipAddress,
          },
        });
        const res = createMockResponse();

        await handler(req, res);
        
        // First 15 requests should not be rate limited (burst capacity)
        expect(res.statusCode).not.toBe(429);
      }
      
      // 16th request should be rate limited
      const req = createMockRequest({
        method: 'POST',
        body: { url: 'https://example.com' },
        headers: {
          'x-forwarded-for': ipAddress,
        },
      });
      const res = createMockResponse();

      await handler(req, res);
      
      expect(res.statusCode).toBe(429);
      expect(res.jsonData).toMatchObject({
        error: 'Rate limit exceeded',
      });
    });

    it('should return 429 with retry information', async () => {
      const ipAddress = '192.168.1.102';
      
      // Exhaust rate limit (burst capacity is 15)
      for (let i = 0; i < 15; i++) {
        const req = createMockRequest({
          method: 'POST',
          body: { url: 'https://example.com' },
          headers: {
            'x-forwarded-for': ipAddress,
          },
        });
        const res = createMockResponse();
        await handler(req, res);
      }
      
      // Next request should be rate limited
      const req = createMockRequest({
        method: 'POST',
        body: { url: 'https://example.com' },
        headers: {
          'x-forwarded-for': ipAddress,
        },
      });
      const res = createMockResponse();

      await handler(req, res);
      
      expect(res.statusCode).toBe(429);
      expect(res.jsonData).toMatchObject({
        error: 'Rate limit exceeded',
        retryAfter: expect.any(Number),
        limit: 10,
        resetAt: expect.any(String),
      });
      
      // Should have Retry-After header
      expect(res.headers['retry-after']).toBeDefined();
    });
  });

  describe('Authenticated User Rate Limiting', () => {
    it('should have higher rate limit for authenticated users (60 req/min)', async () => {
      const ipAddress = '192.168.1.103';
      
      // Make 80 requests with auth header (burst capacity) - should all succeed
      for (let i = 0; i < 80; i++) {
        const req = createMockRequest({
          method: 'POST',
          body: { url: 'https://example.com' },
          headers: {
            'x-forwarded-for': ipAddress,
            'authorization': 'Bearer test-token-12345',
          },
        });
        const res = createMockResponse();

        await handler(req, res);
        
        // First 80 requests should not be rate limited (burst capacity)
        expect(res.statusCode).not.toBe(429);
      }
      
      // 81st request should be rate limited
      const req = createMockRequest({
        method: 'POST',
        body: { url: 'https://example.com' },
        headers: {
          'x-forwarded-for': ipAddress,
          'authorization': 'Bearer test-token-12345',
        },
      });
      const res = createMockResponse();

      await handler(req, res);
      
      expect(res.statusCode).toBe(429);
      expect(res.jsonData.limit).toBe(60);
    });
  });

  describe('Per-IP Isolation', () => {
    it('should track rate limits separately per IP', async () => {
      const ip1 = '192.168.1.104';
      const ip2 = '192.168.1.105';
      
      // Exhaust rate limit for IP1 (burst capacity is 15)
      for (let i = 0; i < 15; i++) {
        const req = createMockRequest({
          method: 'POST',
          body: { url: 'https://example.com' },
          headers: {
            'x-forwarded-for': ip1,
          },
        });
        const res = createMockResponse();
        await handler(req, res);
      }
      
      // IP1 should be rate limited
      const req1 = createMockRequest({
        method: 'POST',
        body: { url: 'https://example.com' },
        headers: {
          'x-forwarded-for': ip1,
        },
      });
      const res1 = createMockResponse();
      await handler(req1, res1);
      expect(res1.statusCode).toBe(429);
      
      // IP2 should still be allowed
      const req2 = createMockRequest({
        method: 'POST',
        body: { url: 'https://example.com' },
        headers: {
          'x-forwarded-for': ip2,
        },
      });
      const res2 = createMockResponse();
      await handler(req2, res2);
      expect(res2.statusCode).not.toBe(429);
    });
  });

  describe('Rate Limit Headers', () => {
    it('should include rate limit headers on successful requests', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { url: 'https://example.com' },
        headers: {
          'x-forwarded-for': '192.168.1.106',
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.headers['x-ratelimit-limit']).toBe('10');
      expect(res.headers['x-ratelimit-remaining']).toBeDefined();
      expect(res.headers['x-ratelimit-reset']).toBeDefined();
      
      const remaining = parseInt(res.headers['x-ratelimit-remaining'] as string);
      expect(remaining).toBeLessThan(15); // Burst capacity is 15
      expect(remaining).toBeGreaterThanOrEqual(0);
    });

    it('should include rate limit headers on rate limited requests', async () => {
      const ipAddress = '192.168.1.107';
      
      // Exhaust rate limit (burst capacity is 15)
      for (let i = 0; i < 15; i++) {
        const req = createMockRequest({
          method: 'POST',
          body: { url: 'https://example.com' },
          headers: {
            'x-forwarded-for': ipAddress,
          },
        });
        const res = createMockResponse();
        await handler(req, res);
      }
      
      // Rate limited request
      const req = createMockRequest({
        method: 'POST',
        body: { url: 'https://example.com' },
        headers: {
          'x-forwarded-for': ipAddress,
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(429);
      expect(res.headers['x-ratelimit-limit']).toBe('10');
      expect(res.headers['x-ratelimit-remaining']).toBe('0');
      expect(res.headers['x-ratelimit-reset']).toBeDefined();
      expect(res.headers['retry-after']).toBeDefined();
    });
  });

  describe('OPTIONS Request Exemption', () => {
    it('should not rate limit OPTIONS requests', async () => {
      const ipAddress = '192.168.1.108';
      
      // Exhaust rate limit with POST requests (burst capacity is 15)
      for (let i = 0; i < 15; i++) {
        const req = createMockRequest({
          method: 'POST',
          body: { url: 'https://example.com' },
          headers: {
            'x-forwarded-for': ipAddress,
          },
        });
        const res = createMockResponse();
        await handler(req, res);
      }
      
      // OPTIONS request should still work
      const req = createMockRequest({
        method: 'OPTIONS',
        headers: {
          'x-forwarded-for': ipAddress,
        },
      });
      const res = createMockResponse();

      await handler(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.ended).toBe(true);
    });
  });
});
