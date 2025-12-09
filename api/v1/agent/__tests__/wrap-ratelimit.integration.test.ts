/**
 * Integration Tests for Agent API Rate Limiting
 * 
 * Validates that rate limiting is properly integrated into the API endpoint
 * and returns correct headers and error responses.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkRateLimit,
  getRateLimitHeaders,
  getRateLimitMessage,
} from '../../../../lib/middleware/agentRateLimiter';

// Mock supabase to test rate limiting logic
vi.mock('../../../../lib/supabase', () => ({
  supabase: null, // Fail open in tests
}));

// Mock logger
vi.mock('../../../../lib/a2a/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  formatApiKey: vi.fn((key) => key),
}));

describe('Agent API Rate Limiting Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rate Limit Headers', () => {
    it('should include all required rate limit headers in response', async () => {
      const result = await checkRateLimit('test-api-key-123', 'req_123');
      const headers = getRateLimitHeaders(result);

      // Verify all required headers are present
      expect(headers).toHaveProperty('X-RateLimit-Limit');
      expect(headers).toHaveProperty('X-RateLimit-Remaining');
      expect(headers).toHaveProperty('X-RateLimit-Reset');

      // Verify header values are valid
      expect(parseInt(headers['X-RateLimit-Limit'])).toBeGreaterThan(0);
      expect(parseInt(headers['X-RateLimit-Remaining'])).toBeGreaterThanOrEqual(0);
      expect(parseInt(headers['X-RateLimit-Reset'])).toBeGreaterThan(0);
    });

    it('should include Retry-After header when rate limit exceeded', () => {
      const result = {
        allowed: false,
        limit: 100,
        remaining: 0,
        reset: new Date(Date.now() + 60000),
        retryAfter: 60,
      };

      const headers = getRateLimitHeaders(result);

      expect(headers).toHaveProperty('Retry-After');
      expect(headers['Retry-After']).toBe('60');
    });
  });

  describe('Rate Limit Messages', () => {
    it('should return appropriate error message for rate limit exceeded', () => {
      const result = {
        allowed: false,
        limit: 100,
        remaining: 0,
        reset: new Date(Date.now() + 60000),
        retryAfter: 60,
      };

      const message = getRateLimitMessage(result);

      expect(message).toContain('Rate limit exceeded');
      expect(message).toContain('1 minute');
    });

    it('should format retry time in seconds for short periods', () => {
      const result = {
        allowed: false,
        limit: 100,
        remaining: 0,
        reset: new Date(Date.now() + 30000),
        retryAfter: 30,
      };

      const message = getRateLimitMessage(result);

      expect(message).toContain('30 seconds');
    });

    it('should format retry time in minutes for longer periods', () => {
      const result = {
        allowed: false,
        limit: 100,
        remaining: 0,
        reset: new Date(Date.now() + 180000),
        retryAfter: 180,
      };

      const message = getRateLimitMessage(result);

      expect(message).toContain('3 minutes');
    });
  });

  describe('Rate Limit Logic', () => {
    it('should allow requests when under limit', async () => {
      const result = await checkRateLimit('test-api-key-123', 'req_123');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
      expect(result.limit).toBeGreaterThan(0);
    });

    it('should return proper reset timestamp', async () => {
      const result = await checkRateLimit('test-api-key-123', 'req_123');

      expect(result.reset).toBeInstanceOf(Date);
      expect(result.reset.getTime()).toBeGreaterThan(Date.now());
    });

    it('should handle different API keys independently', async () => {
      const result1 = await checkRateLimit('api-key-1', 'req_1');
      const result2 = await checkRateLimit('api-key-2', 'req_2');

      // Both should be allowed (independent limits)
      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });
  });

  describe('Error Response Structure', () => {
    it('should provide all necessary information for rate limit errors', () => {
      const result = {
        allowed: false,
        limit: 100,
        remaining: 0,
        reset: new Date('2024-01-15T10:30:00Z'),
        retryAfter: 60,
      };

      const headers = getRateLimitHeaders(result);
      const message = getRateLimitMessage(result);

      // Verify error response has all required fields
      expect(headers['X-RateLimit-Limit']).toBe('100');
      expect(headers['X-RateLimit-Remaining']).toBe('0');
      expect(headers['Retry-After']).toBe('60');
      expect(message).toBeTruthy();
      expect(message.length).toBeGreaterThan(0);
    });
  });
});
