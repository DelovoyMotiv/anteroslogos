/**
 * Tests for Agent API Rate Limiter
 * 
 * Validates rate limiting functionality including:
 * - Per-API-key rate limits
 * - Global rate limits
 * - Rate limit headers
 * - Retry-After header
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkRateLimit,
  recordRateLimitAttempt,
  getRateLimitHeaders,
  getRateLimitMessage,
} from '../agentRateLimiter';

// Mock supabase
vi.mock('../../supabase', () => ({
  supabase: null, // Fail open in tests
}));

// Mock logger
vi.mock('../../a2a/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Agent Rate Limiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    it('should allow requests when supabase is not configured', async () => {
      const result = await checkRateLimit('test-api-key-123');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
      expect(result.limit).toBeGreaterThan(0);
      expect(result.reset).toBeInstanceOf(Date);
    });

    it('should return rate limit result with proper structure', async () => {
      const result = await checkRateLimit('test-api-key-123', 'req_123');

      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('remaining');
      expect(result).toHaveProperty('reset');
      expect(typeof result.allowed).toBe('boolean');
      expect(typeof result.limit).toBe('number');
      expect(typeof result.remaining).toBe('number');
      expect(result.reset).toBeInstanceOf(Date);
    });
  });

  describe('recordRateLimitAttempt', () => {
    it('should not throw when recording attempt', async () => {
      await expect(
        recordRateLimitAttempt('test-api-key-123', 'req_123')
      ).resolves.not.toThrow();
    });
  });

  describe('getRateLimitHeaders', () => {
    it('should return proper rate limit headers', () => {
      const result = {
        allowed: true,
        limit: 100,
        remaining: 50,
        reset: new Date('2024-01-15T10:30:00Z'),
      };

      const headers = getRateLimitHeaders(result);

      expect(headers).toHaveProperty('X-RateLimit-Limit');
      expect(headers).toHaveProperty('X-RateLimit-Remaining');
      expect(headers).toHaveProperty('X-RateLimit-Reset');
      expect(headers['X-RateLimit-Limit']).toBe('100');
      expect(headers['X-RateLimit-Remaining']).toBe('50');
      expect(headers['X-RateLimit-Reset']).toBe(
        String(Math.floor(new Date('2024-01-15T10:30:00Z').getTime() / 1000))
      );
    });

    it('should include Retry-After header when retryAfter is present', () => {
      const result = {
        allowed: false,
        limit: 100,
        remaining: 0,
        reset: new Date('2024-01-15T10:30:00Z'),
        retryAfter: 60,
      };

      const headers = getRateLimitHeaders(result);

      expect(headers).toHaveProperty('Retry-After');
      expect(headers['Retry-After']).toBe('60');
    });

    it('should not include Retry-After header when retryAfter is not present', () => {
      const result = {
        allowed: true,
        limit: 100,
        remaining: 50,
        reset: new Date('2024-01-15T10:30:00Z'),
      };

      const headers = getRateLimitHeaders(result);

      expect(headers).not.toHaveProperty('Retry-After');
    });
  });

  describe('getRateLimitMessage', () => {
    it('should return message with seconds for short retry periods', () => {
      const result = {
        allowed: false,
        limit: 100,
        remaining: 0,
        reset: new Date(),
        retryAfter: 30,
      };

      const message = getRateLimitMessage(result);

      expect(message).toContain('30 seconds');
    });

    it('should return message with minutes for longer retry periods', () => {
      const result = {
        allowed: false,
        limit: 100,
        remaining: 0,
        reset: new Date(),
        retryAfter: 120,
      };

      const message = getRateLimitMessage(result);

      expect(message).toContain('2 minutes');
    });

    it('should return generic message when no retryAfter', () => {
      const result = {
        allowed: false,
        limit: 100,
        remaining: 0,
        reset: new Date(),
      };

      const message = getRateLimitMessage(result);

      expect(message).toContain('Rate limit exceeded');
    });
  });
});
