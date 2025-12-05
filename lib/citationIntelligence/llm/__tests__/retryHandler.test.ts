/**
 * Retry Handler Tests
 * Unit tests for RetryHandler class
 * 
 * Tests cover:
 * - Retry logic with exponential backoff
 * - Circuit breaker pattern
 * - Error type handling
 * - Metrics tracking
 * - Configuration options
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RetryHandler, createRetryHandler } from '../retryHandler';
import { ErrorType, LLMError } from '../../types/llm.types';

describe('RetryHandler', () => {
  let handler: RetryHandler;
  
  beforeEach(() => {
    // Create handler with fast delays for testing
    handler = createRetryHandler({
      maxRetries: 3,
      baseDelay: 100,
      maxDelay: 1000,
      exponentialBackoff: true,
      jitter: false, // Disable jitter for predictable tests
      circuitBreakerThreshold: 3,
      circuitBreakerTimeout: 1000,
      retryableErrors: [ErrorType.RATE_LIMIT, ErrorType.TIMEOUT, ErrorType.SERVER_ERROR, ErrorType.NETWORK_ERROR],
    });
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  // ==========================================================================
  // Basic Retry Logic Tests
  // ==========================================================================
  
  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await handler.executeWithRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });
    
    it('should retry on rate limit error', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new LLMError('Rate limit', ErrorType.RATE_LIMIT, 429, true))
        .mockResolvedValueOnce('success');
      
      const result = await handler.executeWithRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
    
    it('should retry on timeout error', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new LLMError('Timeout', ErrorType.TIMEOUT, 408, true))
        .mockResolvedValueOnce('success');
      
      const result = await handler.executeWithRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
    
    it('should retry on server error', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new LLMError('Server error', ErrorType.SERVER_ERROR, 500, true))
        .mockResolvedValueOnce('success');
      
      const result = await handler.executeWithRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
    
    it('should not retry on auth error', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new LLMError('Auth failed', ErrorType.AUTH_ERROR, 401, false));
      
      await expect(handler.executeWithRetry(operation)).rejects.toThrow('Auth failed');
      expect(operation).toHaveBeenCalledTimes(1);
    });
    
    it('should not retry on invalid request error', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new LLMError('Invalid request', ErrorType.INVALID_REQUEST, 400, false));
      
      await expect(handler.executeWithRetry(operation)).rejects.toThrow('Invalid request');
      expect(operation).toHaveBeenCalledTimes(1);
    });
    
    it('should retry up to maxRetries times', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new LLMError('Server error', ErrorType.SERVER_ERROR, 500, true));
      
      await expect(handler.executeWithRetry(operation)).rejects.toThrow('Operation failed after 3 retries');
      expect(operation).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });
    
    it('should succeed after multiple retries', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new LLMError('Error 1', ErrorType.SERVER_ERROR, 500, true))
        .mockRejectedValueOnce(new LLMError('Error 2', ErrorType.SERVER_ERROR, 500, true))
        .mockResolvedValueOnce('success');
      
      const result = await handler.executeWithRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });
  
  // ==========================================================================
  // Backoff Calculation Tests
  // ==========================================================================
  
  describe('calculateBackoff', () => {
    it('should calculate exponential backoff correctly', () => {
      const handler = createRetryHandler({
        baseDelay: 1000,
        maxDelay: 32000,
        exponentialBackoff: true,
        jitter: false,
      });
      
      expect(handler.calculateBackoff(0)).toBe(1000);  // 1000 * 2^0 = 1000
      expect(handler.calculateBackoff(1)).toBe(2000);  // 1000 * 2^1 = 2000
      expect(handler.calculateBackoff(2)).toBe(4000);  // 1000 * 2^2 = 4000
      expect(handler.calculateBackoff(3)).toBe(8000);  // 1000 * 2^3 = 8000
      expect(handler.calculateBackoff(4)).toBe(16000); // 1000 * 2^4 = 16000
      expect(handler.calculateBackoff(5)).toBe(32000); // 1000 * 2^5 = 32000 (capped at maxDelay)
      expect(handler.calculateBackoff(6)).toBe(32000); // Still capped at maxDelay
    });
    
    it('should calculate linear backoff when exponential is disabled', () => {
      const handler = createRetryHandler({
        baseDelay: 1000,
        maxDelay: 32000,
        exponentialBackoff: false,
        jitter: false,
      });
      
      expect(handler.calculateBackoff(0)).toBe(1000); // 1000 * 1 = 1000
      expect(handler.calculateBackoff(1)).toBe(2000); // 1000 * 2 = 2000
      expect(handler.calculateBackoff(2)).toBe(3000); // 1000 * 3 = 3000
      expect(handler.calculateBackoff(3)).toBe(4000); // 1000 * 4 = 4000
    });
    
    it('should add jitter when enabled', () => {
      const handler = createRetryHandler({
        baseDelay: 1000,
        maxDelay: 32000,
        exponentialBackoff: true,
        jitter: true,
      });
      
      // With jitter, delay should be between base and base * 1.1
      const delay = handler.calculateBackoff(0);
      expect(delay).toBeGreaterThanOrEqual(1000);
      expect(delay).toBeLessThanOrEqual(1100);
    });
    
    it('should respect maxDelay cap', () => {
      const handler = createRetryHandler({
        baseDelay: 1000,
        maxDelay: 5000,
        exponentialBackoff: true,
        jitter: false,
      });
      
      expect(handler.calculateBackoff(10)).toBe(5000); // Would be 1024000, but capped at 5000
    });
  });
  
  // ==========================================================================
  // Error Type Detection Tests
  // ==========================================================================
  
  describe('shouldRetry', () => {
    it('should retry on rate limit error (429)', () => {
      const error = new Error('Rate limit exceeded');
      (error as any).statusCode = 429;
      
      expect(handler.shouldRetry(error)).toBe(true);
    });
    
    it('should retry on timeout error (408)', () => {
      const error = new Error('Request timeout');
      (error as any).statusCode = 408;
      
      expect(handler.shouldRetry(error)).toBe(true);
    });
    
    it('should retry on server error (500)', () => {
      const error = new Error('Internal server error');
      (error as any).statusCode = 500;
      
      expect(handler.shouldRetry(error)).toBe(true);
    });
    
    it('should retry on server error (503)', () => {
      const error = new Error('Service unavailable');
      (error as any).statusCode = 503;
      
      expect(handler.shouldRetry(error)).toBe(true);
    });
    
    it('should not retry on auth error (401)', () => {
      const error = new Error('Unauthorized');
      (error as any).statusCode = 401;
      
      expect(handler.shouldRetry(error)).toBe(false);
    });
    
    it('should not retry on bad request (400)', () => {
      const error = new Error('Bad request');
      (error as any).statusCode = 400;
      
      expect(handler.shouldRetry(error)).toBe(false);
    });
    
    it('should not retry on not found (404)', () => {
      const error = new Error('Not found');
      (error as any).statusCode = 404;
      
      expect(handler.shouldRetry(error)).toBe(false);
    });
    
    it('should retry on network error', () => {
      const error = new Error('Network error: ECONNREFUSED');
      
      expect(handler.shouldRetry(error)).toBe(true);
    });
    
    it('should retry on timeout message', () => {
      const error = new Error('Request timeout');
      
      expect(handler.shouldRetry(error)).toBe(true);
    });
    
    it('should not retry on unknown error', () => {
      const error = new Error('Unknown error');
      
      expect(handler.shouldRetry(error)).toBe(false);
    });
    
    it('should handle LLMError with error code', () => {
      const retryableError = new LLMError('Rate limit', ErrorType.RATE_LIMIT, 429, true);
      const nonRetryableError = new LLMError('Auth failed', ErrorType.AUTH_ERROR, 401, false);
      
      expect(handler.shouldRetry(retryableError)).toBe(true);
      expect(handler.shouldRetry(nonRetryableError)).toBe(false);
    });
  });
  
  // ==========================================================================
  // Circuit Breaker Tests
  // ==========================================================================
  
  describe('Circuit Breaker', () => {
    it('should open circuit after threshold failures', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new LLMError('Server error', ErrorType.SERVER_ERROR, 500, true));
      
      // First failure
      await expect(handler.executeWithRetry(operation)).rejects.toThrow();
      expect(handler.getCircuitState()).toBe('closed');
      
      // Second failure
      await expect(handler.executeWithRetry(operation)).rejects.toThrow();
      expect(handler.getCircuitState()).toBe('closed');
      
      // Third failure - should open circuit
      await expect(handler.executeWithRetry(operation)).rejects.toThrow();
      expect(handler.getCircuitState()).toBe('open');
      expect(handler.isCircuitOpen()).toBe(true);
    });
    
    it('should reject requests when circuit is open', async () => {
      // Open circuit manually
      handler.openCircuit();
      
      const operation = vi.fn().mockResolvedValue('success');
      
      await expect(handler.executeWithRetry(operation)).rejects.toThrow('Circuit breaker is open');
      expect(operation).not.toHaveBeenCalled();
    });
    
    it('should transition to half-open after timeout', async () => {
      // Create handler with short timeout for testing
      const handler = createRetryHandler({
        maxRetries: 0, // No retries to speed up test
        circuitBreakerThreshold: 1,
        circuitBreakerTimeout: 100, // 100ms timeout
      });
      
      // Trigger circuit open
      const failingOp = vi.fn()
        .mockRejectedValue(new LLMError('Error', ErrorType.SERVER_ERROR, 500, true));
      await expect(handler.executeWithRetry(failingOp)).rejects.toThrow();
      
      expect(handler.getCircuitState()).toBe('open');
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should be half-open now
      expect(handler.getCircuitState()).toBe('half-open');
    }, 10000); // 10 second timeout for this test
    
    it('should close circuit on successful request in half-open state', async () => {
      // Create handler with short timeout
      const handler = createRetryHandler({
        maxRetries: 0, // No retries to speed up test
        circuitBreakerThreshold: 1,
        circuitBreakerTimeout: 100,
      });
      
      // Open circuit
      const failingOp = vi.fn()
        .mockRejectedValue(new LLMError('Error', ErrorType.SERVER_ERROR, 500, true));
      await expect(handler.executeWithRetry(failingOp)).rejects.toThrow();
      
      // Wait for half-open
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(handler.getCircuitState()).toBe('half-open');
      
      // Successful request should close circuit
      const successOp = vi.fn().mockResolvedValue('success');
      await handler.executeWithRetry(successOp);
      
      expect(handler.getCircuitState()).toBe('closed');
    }, 10000); // 10 second timeout for this test
    
    it('should manually close circuit', () => {
      handler.openCircuit();
      expect(handler.isCircuitOpen()).toBe(true);
      
      handler.closeCircuit();
      expect(handler.isCircuitOpen()).toBe(false);
      expect(handler.getCircuitState()).toBe('closed');
    });
    
    it('should reset circuit breaker', async () => {
      // Cause some failures
      const operation = vi.fn()
        .mockRejectedValue(new LLMError('Error', ErrorType.SERVER_ERROR, 500, true));
      
      await expect(handler.executeWithRetry(operation)).rejects.toThrow();
      await expect(handler.executeWithRetry(operation)).rejects.toThrow();
      
      const metrics = handler.getMetrics();
      expect(metrics.consecutiveFailures).toBeGreaterThan(0);
      
      // Reset
      handler.resetCircuit();
      
      const metricsAfter = handler.getMetrics();
      expect(metricsAfter.consecutiveFailures).toBe(0);
      expect(handler.getCircuitState()).toBe('closed');
    });
  });
  
  // ==========================================================================
  // Metrics Tests
  // ==========================================================================
  
  describe('Metrics', () => {
    it('should track successful retries', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new LLMError('Error', ErrorType.SERVER_ERROR, 500, true))
        .mockResolvedValueOnce('success');
      
      await handler.executeWithRetry(operation);
      
      const metrics = handler.getMetrics();
      expect(metrics.totalRetries).toBe(1);
      expect(metrics.successfulRetries).toBe(1);
      expect(metrics.failedRetries).toBe(0);
    });
    
    it('should track failed retries', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new LLMError('Error', ErrorType.SERVER_ERROR, 500, true));
      
      await expect(handler.executeWithRetry(operation)).rejects.toThrow();
      
      const metrics = handler.getMetrics();
      expect(metrics.totalRetries).toBe(3); // 3 retry attempts
      expect(metrics.successfulRetries).toBe(0);
      expect(metrics.failedRetries).toBe(1);
    });
    
    it('should track average retry delay', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new LLMError('Error', ErrorType.SERVER_ERROR, 500, true))
        .mockResolvedValueOnce('success');
      
      await handler.executeWithRetry(operation);
      
      const metrics = handler.getMetrics();
      expect(metrics.averageRetryDelay).toBeGreaterThan(0);
    });
    
    it('should track consecutive failures', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new LLMError('Error', ErrorType.SERVER_ERROR, 500, true));
      
      await expect(handler.executeWithRetry(operation)).rejects.toThrow();
      
      const metrics = handler.getMetrics();
      expect(metrics.consecutiveFailures).toBeGreaterThan(0);
    });
    
    it('should track last failure timestamp', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new LLMError('Error', ErrorType.SERVER_ERROR, 500, true));
      
      await expect(handler.executeWithRetry(operation)).rejects.toThrow();
      
      const metrics = handler.getMetrics();
      expect(metrics.lastFailure).toBeInstanceOf(Date);
    });
    
    it('should reset metrics', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new LLMError('Error', ErrorType.SERVER_ERROR, 500, true))
        .mockResolvedValueOnce('success');
      
      await handler.executeWithRetry(operation);
      
      let metrics = handler.getMetrics();
      expect(metrics.totalRetries).toBeGreaterThan(0);
      
      handler.resetMetrics();
      
      metrics = handler.getMetrics();
      expect(metrics.totalRetries).toBe(0);
      expect(metrics.successfulRetries).toBe(0);
      expect(metrics.failedRetries).toBe(0);
    });
  });
  
  // ==========================================================================
  // Configuration Tests
  // ==========================================================================
  
  describe('Configuration', () => {
    it('should use provided configuration', () => {
      const handler = createRetryHandler({
        maxRetries: 5,
        baseDelay: 2000,
        maxDelay: 64000,
        exponentialBackoff: false,
        jitter: false,
      });
      
      const config = handler.getConfig();
      expect(config.maxRetries).toBe(5);
      expect(config.baseDelay).toBe(2000);
      expect(config.maxDelay).toBe(64000);
      expect(config.exponentialBackoff).toBe(false);
      expect(config.jitter).toBe(false);
    });
    
    it('should use default configuration', () => {
      const handler = createRetryHandler();
      
      const config = handler.getConfig();
      expect(config.maxRetries).toBe(3);
      expect(config.baseDelay).toBe(1000);
      expect(config.maxDelay).toBe(32000);
      expect(config.exponentialBackoff).toBe(true);
      expect(config.jitter).toBe(true);
    });
  });
  
  // ==========================================================================
  // Integration Tests
  // ==========================================================================
  
  describe('Integration', () => {
    it('should handle complex retry scenario', async () => {
      let attemptCount = 0;
      const operation = vi.fn().mockImplementation(async () => {
        attemptCount++;
        
        if (attemptCount === 1) {
          throw new LLMError('Rate limit', ErrorType.RATE_LIMIT, 429, true);
        } else if (attemptCount === 2) {
          throw new LLMError('Timeout', ErrorType.TIMEOUT, 408, true);
        } else if (attemptCount === 3) {
          return 'success';
        }
        
        throw new Error('Should not reach here');
      });
      
      const result = await handler.executeWithRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
      
      const metrics = handler.getMetrics();
      expect(metrics.totalRetries).toBe(2);
      expect(metrics.successfulRetries).toBe(1);
    });
    
    it('should handle mixed success and failure', async () => {
      // First operation succeeds
      const op1 = vi.fn().mockResolvedValue('success1');
      await handler.executeWithRetry(op1);
      
      // Second operation fails
      const op2 = vi.fn()
        .mockRejectedValue(new LLMError('Error', ErrorType.SERVER_ERROR, 500, true));
      await expect(handler.executeWithRetry(op2)).rejects.toThrow();
      
      // Third operation succeeds after retry
      const op3 = vi.fn()
        .mockRejectedValueOnce(new LLMError('Error', ErrorType.SERVER_ERROR, 500, true))
        .mockResolvedValueOnce('success3');
      await handler.executeWithRetry(op3);
      
      const metrics = handler.getMetrics();
      expect(metrics.totalRetries).toBeGreaterThan(0);
      expect(metrics.successfulRetries).toBeGreaterThan(0);
      expect(metrics.failedRetries).toBeGreaterThan(0);
    });
  });
});
