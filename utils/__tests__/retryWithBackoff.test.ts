/**
 * Tests for retry logic with exponential backoff
 * Requirements: 2.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  retryWithBackoff,
  isTransientError,
  isValidationError,
} from '../retryWithBackoff';

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('isTransientError', () => {
    it('should identify network errors as transient', () => {
      const networkError = new TypeError('fetch failed');
      expect(isTransientError(networkError)).toBe(true);
    });

    it('should identify connection errors as transient', () => {
      const connectionError = new Error('network connection failed');
      expect(isTransientError(connectionError)).toBe(true);
    });

    it('should identify timeout errors as transient', () => {
      const timeoutError = new Error('request timeout');
      expect(isTransientError(timeoutError)).toBe(true);
    });

    it('should identify Supabase connection errors as transient', () => {
      const supabaseError = { code: '08000', message: 'Connection exception' };
      expect(isTransientError(supabaseError)).toBe(true);
    });

    it('should not identify validation errors as transient', () => {
      const validationError = new Error('validation failed');
      expect(isTransientError(validationError)).toBe(false);
    });

    it('should not identify null/undefined as transient', () => {
      expect(isTransientError(null)).toBe(false);
      expect(isTransientError(undefined)).toBe(false);
    });
  });

  describe('isValidationError', () => {
    it('should identify unique constraint violations as validation errors', () => {
      const error = { code: '23505', message: 'duplicate key value' };
      expect(isValidationError(error)).toBe(true);
    });

    it('should identify foreign key violations as validation errors', () => {
      const error = { code: '23503', message: 'foreign key constraint' };
      expect(isValidationError(error)).toBe(true);
    });

    it('should identify RLS policy errors as validation errors', () => {
      const error = { code: '42501', message: 'insufficient privilege' };
      expect(isValidationError(error)).toBe(true);
    });

    it('should identify not null violations as validation errors', () => {
      const error = { code: '23502', message: 'null value in column' };
      expect(isValidationError(error)).toBe(true);
    });

    it('should not identify network errors as validation errors', () => {
      const error = new Error('network timeout');
      expect(isValidationError(error)).toBe(false);
    });

    it('should not identify null/undefined as validation errors', () => {
      expect(isValidationError(null)).toBe(false);
      expect(isValidationError(undefined)).toBe(false);
    });
  });

  describe('retry logic', () => {
    it('should succeed on first attempt if no error', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(mockFn);

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(1);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry transient errors up to 3 times', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('network timeout'))
        .mockRejectedValueOnce(new Error('network timeout'))
        .mockResolvedValue('success');

      const promise = retryWithBackoff(mockFn);

      // Fast-forward through delays
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(3);
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should not retry validation errors', async () => {
      const validationError = { code: '23505', message: 'duplicate key' };
      const mockFn = vi.fn().mockRejectedValue(validationError);

      const result = await retryWithBackoff(mockFn);

      expect(result.success).toBe(false);
      expect(result.error).toBe(validationError);
      expect(result.attempts).toBe(1);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should fail after max retries for transient errors', async () => {
      const networkError = new Error('network timeout');
      const mockFn = vi.fn().mockRejectedValue(networkError);

      const promise = retryWithBackoff(mockFn, { maxRetries: 2 });

      // Fast-forward through delays
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toBe(networkError);
      expect(result.attempts).toBe(3); // Initial + 2 retries
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff delays', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('network timeout'))
        .mockRejectedValueOnce(new Error('network timeout'))
        .mockResolvedValue('success');

      const promise = retryWithBackoff(mockFn, {
        initialDelayMs: 100,
        backoffMultiplier: 2,
      });

      // First retry should wait 100ms
      await vi.advanceTimersByTimeAsync(100);
      expect(mockFn).toHaveBeenCalledTimes(2);

      // Second retry should wait 200ms (100 * 2^1)
      await vi.advanceTimersByTimeAsync(200);
      expect(mockFn).toHaveBeenCalledTimes(3);

      const result = await promise;
      expect(result.success).toBe(true);
    });

    it('should respect max delay', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('network timeout'))
        .mockRejectedValueOnce(new Error('network timeout'))
        .mockResolvedValue('success');

      const promise = retryWithBackoff(mockFn, {
        initialDelayMs: 1000,
        maxDelayMs: 1500,
        backoffMultiplier: 3,
      });

      // First retry: 1000ms
      await vi.advanceTimersByTimeAsync(1000);
      expect(mockFn).toHaveBeenCalledTimes(2);

      // Second retry: should be capped at 1500ms (not 3000ms)
      await vi.advanceTimersByTimeAsync(1500);
      expect(mockFn).toHaveBeenCalledTimes(3);

      const result = await promise;
      expect(result.success).toBe(true);
    });

    it('should use custom shouldRetry function', async () => {
      const customError = new Error('custom error');
      const mockFn = vi.fn().mockRejectedValue(customError);

      const shouldRetry = (error: unknown) => {
        return error instanceof Error && error.message === 'custom error';
      };

      const promise = retryWithBackoff(mockFn, {
        maxRetries: 1,
        shouldRetry,
      });

      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(2); // Initial + 1 retry
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should handle non-retryable errors immediately', async () => {
      const nonRetryableError = new Error('some other error');
      const mockFn = vi.fn().mockRejectedValue(nonRetryableError);

      const result = await retryWithBackoff(mockFn);

      expect(result.success).toBe(false);
      expect(result.error).toBe(nonRetryableError);
      expect(result.attempts).toBe(1);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle synchronous errors', async () => {
      const mockFn = vi.fn().mockImplementation(() => {
        throw new Error('sync error');
      });

      const result = await retryWithBackoff(mockFn);

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
    });

    it('should handle undefined return values', async () => {
      const mockFn = vi.fn().mockResolvedValue(undefined);

      const result = await retryWithBackoff(mockFn);

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
      expect(result.attempts).toBe(1);
    });

    it('should handle zero max retries', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('network timeout'));

      const result = await retryWithBackoff(mockFn, { maxRetries: 0 });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });
});
