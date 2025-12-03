/**
 * Tests for Retry Logic
 * 
 * **Feature: production-audit-improvements, Property 19: Automatic Retry on Transient Failures**
 * **Validates: Requirements 5.3**
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  withRetry,
  calculateDelay,
  DEFAULT_RETRY_CONFIG,
  IdempotencyKeyManager,
  withRetryAndIdempotency,
  globalIdempotencyManager,
} from '../retry';
import { NetworkError, ValidationError } from '../errors';

describe('Retry Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('calculateDelay', () => {
    it('should calculate exponential backoff', () => {
      const config = { ...DEFAULT_RETRY_CONFIG, jitter: false };
      
      expect(calculateDelay(0, config)).toBe(1000);
      expect(calculateDelay(1, config)).toBe(2000);
      expect(calculateDelay(2, config)).toBe(4000);
      expect(calculateDelay(3, config)).toBe(8000);
    });
    
    it('should respect max delay', () => {
      const config = { ...DEFAULT_RETRY_CONFIG, jitter: false, maxDelay: 5000 };
      
      expect(calculateDelay(10, config)).toBe(5000);
    });
    
    it('should add jitter', () => {
      const config = { ...DEFAULT_RETRY_CONFIG, jitter: true };
      const delay = calculateDelay(1, config);
      
      // With jitter, delay should be between 1000 and 2000
      expect(delay).toBeGreaterThanOrEqual(1000);
      expect(delay).toBeLessThanOrEqual(2000);
    });
  });
  
  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await withRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });
    
    it('should retry on retryable error', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new NetworkError('Timeout', undefined, true))
        .mockResolvedValue('success');
      
      const result = await withRetry(operation, {
        maxAttempts: 3,
        baseDelay: 10, // Short delay for testing
      });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
    
    it('should not retry on non-retryable error', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new ValidationError('Invalid input'));
      
      await expect(withRetry(operation)).rejects.toThrow('Invalid input');
      expect(operation).toHaveBeenCalledTimes(1);
    });
    
    it('should exhaust retries and throw last error', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new NetworkError('Timeout', undefined, true));
      
      await expect(
        withRetry(operation, {
          maxAttempts: 3,
          baseDelay: 10,
        })
      ).rejects.toThrow('Timeout');
      
      expect(operation).toHaveBeenCalledTimes(3);
    });
    
    it('should call onRetry callback', async () => {
      const onRetry = vi.fn();
      const operation = vi.fn()
        .mockRejectedValueOnce(new NetworkError('Timeout', undefined, true))
        .mockResolvedValue('success');
      
      await withRetry(operation, {
        maxAttempts: 3,
        baseDelay: 10,
        onRetry,
      });
      
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(
        expect.any(NetworkError),
        1,
        expect.any(Number)
      );
    });
    
    it('should use custom isRetryable function', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Custom error'))
        .mockResolvedValue('success');
      
      const isRetryable = vi.fn().mockReturnValue(true);
      
      const result = await withRetry(operation, {
        maxAttempts: 3,
        baseDelay: 10,
        isRetryable,
      });
      
      expect(result).toBe('success');
      expect(isRetryable).toHaveBeenCalledWith(expect.any(Error));
    });
  });
  
  describe('IdempotencyKeyManager', () => {
    let manager: IdempotencyKeyManager;
    
    beforeEach(() => {
      manager = new IdempotencyKeyManager(1000); // 1 second TTL for testing
    });
    
    it('should store and retrieve results', () => {
      manager.set('key1', 'value1');
      
      expect(manager.has('key1')).toBe(true);
      expect(manager.get('key1')).toBe('value1');
    });
    
    it('should return undefined for non-existent keys', () => {
      expect(manager.has('nonexistent')).toBe(false);
      expect(manager.get('nonexistent')).toBeUndefined();
    });
    
    it('should expire old keys', async () => {
      manager.set('key1', 'value1');
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(manager.has('key1')).toBe(false);
    });
    
    it('should clear all keys', () => {
      manager.set('key1', 'value1');
      manager.set('key2', 'value2');
      
      manager.clear();
      
      expect(manager.has('key1')).toBe(false);
      expect(manager.has('key2')).toBe(false);
    });
  });
  
  describe('withRetryAndIdempotency', () => {
    beforeEach(() => {
      globalIdempotencyManager.clear();
    });
    
    it('should execute operation and cache result', async () => {
      const operation = vi.fn().mockResolvedValue('result');
      
      const result = await withRetryAndIdempotency('key1', operation);
      
      expect(result).toBe('result');
      expect(operation).toHaveBeenCalledTimes(1);
    });
    
    it('should return cached result on second call', async () => {
      const operation = vi.fn().mockResolvedValue('result');
      
      const result1 = await withRetryAndIdempotency('key1', operation);
      const result2 = await withRetryAndIdempotency('key1', operation);
      
      expect(result1).toBe('result');
      expect(result2).toBe('result');
      expect(operation).toHaveBeenCalledTimes(1); // Only called once
    });
    
    it('should retry on failure and cache successful result', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new NetworkError('Timeout', undefined, true))
        .mockResolvedValue('result');
      
      const result = await withRetryAndIdempotency('key1', operation, {
        maxAttempts: 3,
        baseDelay: 10,
      });
      
      expect(result).toBe('result');
      expect(operation).toHaveBeenCalledTimes(2);
      
      // Second call should use cache
      const result2 = await withRetryAndIdempotency('key1', operation);
      expect(result2).toBe('result');
      expect(operation).toHaveBeenCalledTimes(2); // Still only 2 calls
    });
  });
});
