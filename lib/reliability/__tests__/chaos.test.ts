/**
 * Chaos Engineering Tests
 * 
 * Tests system behavior under failure conditions:
 * - Network failures
 * - Database downtime
 * - Circuit breaker behavior
 * - Graceful degradation
 * 
 * **Feature: production-audit-improvements**
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MinimalSupabaseClient } from '../../../types/lib.types';
import {
  withRetry,
  CircuitBreaker,
  CircuitBreakerState,
  NetworkError,
  DatabaseError,
  TimeoutError,
  withOptimisticLock,
} from '../index';

describe('Chaos Engineering Tests', () => {
  describe('Network Failure Injection', () => {
    it('should handle intermittent network failures with retry', async () => {
      let attempts = 0;
      const operation = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new NetworkError('ECONNRESET', undefined, true);
        }
        return 'success';
      });
      
      const result = await withRetry(operation, {
        maxAttempts: 5,
        baseDelay: 10,
      });
      
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });
    
    it('should fail after exhausting retries on persistent network failure', async () => {
      const operation = vi.fn().mockRejectedValue(
        new NetworkError('ETIMEDOUT', undefined, true)
      );
      
      await expect(
        withRetry(operation, {
          maxAttempts: 3,
          baseDelay: 10,
        })
      ).rejects.toThrow('ETIMEDOUT');
      
      expect(operation).toHaveBeenCalledTimes(3);
    });
    
    it('should handle network timeout with exponential backoff', async () => {
      const delays: number[] = [];
      let attempts = 0;
      
      const operation = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 4) {
          throw new TimeoutError('Request timeout');
        }
        return 'success';
      });
      
      const result = await withRetry(operation, {
        maxAttempts: 5,
        baseDelay: 100,
        jitter: false,
        onRetry: (_, __, delay) => {
          delays.push(delay);
        },
      });
      
      expect(result).toBe('success');
      expect(delays).toHaveLength(3);
      // Verify exponential backoff: 100, 200, 400
      expect(delays[0]).toBe(100);
      expect(delays[1]).toBe(200);
      expect(delays[2]).toBe(400);
    });
  });
  
  describe('Database Downtime Simulation', () => {
    it('should handle database connection failures with retry', async () => {
      let attempts = 0;
      const operation = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new DatabaseError('Connection refused');
        }
        return { id: '123', data: 'success' };
      });
      
      const result = await withRetry(operation, {
        maxAttempts: 5,
        baseDelay: 10,
      });
      
      expect(result).toEqual({ id: '123', data: 'success' });
      expect(attempts).toBe(3);
    });
    
    it('should handle database deadlock with retry', async () => {
      let attempts = 0;
      const operation = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 2) {
          throw new DatabaseError('Deadlock detected');
        }
        return { success: true };
      });
      
      const result = await withRetry(operation, {
        maxAttempts: 3,
        baseDelay: 10,
      });
      
      expect(result).toEqual({ success: true });
      expect(attempts).toBe(2);
    });
    
    it('should fail gracefully on persistent database failure', async () => {
      const operation = vi.fn().mockRejectedValue(
        new DatabaseError('Database is down')
      );
      
      await expect(
        withRetry(operation, {
          maxAttempts: 3,
          baseDelay: 10,
        })
      ).rejects.toThrow('Database is down');
    });
  });
  
  describe('Circuit Breaker Behavior Under Load', () => {
    it('should open circuit after threshold failures', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        timeout: 1000,
      });
      
      const operation = vi.fn().mockRejectedValue(new Error('Service unavailable'));
      
      // Cause 3 failures to open circuit
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(operation)).rejects.toThrow();
      }
      
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);
      expect(operation).toHaveBeenCalledTimes(3);
    });
    
    it('should reject requests immediately when circuit is open', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        timeout: 1000,
      });
      
      const operation = vi.fn().mockRejectedValue(new Error('Failure'));
      
      // Open the circuit
      await expect(breaker.execute(operation)).rejects.toThrow();
      await expect(breaker.execute(operation)).rejects.toThrow();
      
      expect(breaker.isOpen()).toBe(true);
      
      // Next request should be rejected without calling operation
      const callCount = operation.mock.calls.length;
      await expect(breaker.execute(operation)).rejects.toThrow('Circuit breaker is OPEN');
      expect(operation).toHaveBeenCalledTimes(callCount); // No additional call
    });
    
    it('should transition through states correctly during recovery', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        timeout: 500,
        successThreshold: 2,
      });
      
      const operation = vi.fn().mockRejectedValue(new Error('Failure'));
      
      // Open the circuit
      await expect(breaker.execute(operation)).rejects.toThrow();
      await expect(breaker.execute(operation)).rejects.toThrow();
      expect(breaker.isOpen()).toBe(true);
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Should transition to HALF_OPEN and succeed
      operation.mockResolvedValue('success');
      await breaker.execute(operation);
      expect(breaker.isHalfOpen()).toBe(true);
      
      // Second success should close circuit
      await breaker.execute(operation);
      expect(breaker.isClosed()).toBe(true);
    });
    
    it('should reopen circuit on failure in half-open state', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        timeout: 500,
      });
      
      const operation = vi.fn().mockRejectedValue(new Error('Failure'));
      
      // Open the circuit
      await expect(breaker.execute(operation)).rejects.toThrow();
      await expect(breaker.execute(operation)).rejects.toThrow();
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Fail in HALF_OPEN state
      await expect(breaker.execute(operation)).rejects.toThrow('Failure');
      
      // Should be OPEN again
      expect(breaker.isOpen()).toBe(true);
    });
  });
  
  describe('Graceful Degradation', () => {
    it('should continue operating with degraded functionality', async () => {
      const primaryOperation = vi.fn().mockRejectedValue(
        new Error('Primary service down')
      );
      
      const fallbackOperation = vi.fn().mockResolvedValue({
        data: 'fallback',
        degraded: true,
      });
      
      // Try primary, fall back on failure
      let result;
      try {
        result = await primaryOperation();
      } catch {
        result = await fallbackOperation();
      }
      
      expect(result).toEqual({ data: 'fallback', degraded: true });
      expect(fallbackOperation).toHaveBeenCalled();
    });
    
    it('should handle partial system failure with circuit breakers', async () => {
      const serviceA = new CircuitBreaker({ failureThreshold: 2, name: 'service-a' });
      const serviceB = new CircuitBreaker({ failureThreshold: 2, name: 'service-b' });
      
      const operationA = vi.fn().mockRejectedValue(new Error('Service A down'));
      const operationB = vi.fn().mockResolvedValue('Service B working');
      
      // Service A fails and opens circuit
      await expect(serviceA.execute(operationA)).rejects.toThrow();
      await expect(serviceA.execute(operationA)).rejects.toThrow();
      
      // Service B continues working
      const resultB = await serviceB.execute(operationB);
      
      expect(serviceA.isOpen()).toBe(true);
      expect(serviceB.isClosed()).toBe(true);
      expect(resultB).toBe('Service B working');
    });
  });
  
  describe('Concurrent Failure Scenarios', () => {
    it('should handle concurrent requests during failures', async () => {
      let successCount = 0;
      let failureCount = 0;
      
      const operation = vi.fn().mockImplementation(async () => {
        // Simulate 50% failure rate
        if (Math.random() < 0.5) {
          throw new NetworkError('Random failure', undefined, true);
        }
        return 'success';
      });
      
      // Execute 20 concurrent requests with retry
      const promises = Array(20).fill(0).map(() =>
        withRetry(operation, {
          maxAttempts: 5,
          baseDelay: 10,
        })
          .then(() => successCount++)
          .catch(() => failureCount++)
      );
      
      await Promise.all(promises);
      
      // Most should succeed due to retries
      expect(successCount).toBeGreaterThan(failureCount);
    });
    
    it('should handle race conditions with optimistic locking', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: '123', balance: 1000, version: 1 },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockImplementation(() => {
                    // Simulate version conflict on first attempt
                    const callCount = mockSupabase.from().update().eq().eq().select().single.mock.calls.length;
                    if (callCount === 1) {
                      return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
                    }
                    return Promise.resolve({
                      data: { id: '123', balance: 900, version: 2 },
                      error: null,
                    });
                  }),
                }),
              }),
            }),
          }),
        }),
      };
      
      const result = await withOptimisticLock(
        mockSupabase as MinimalSupabaseClient,
        'accounts',
        '123',
        async (record) => ({ balance: record.balance - 100 }),
        3
      );
      
      // Should succeed on retry
      expect(result.success).toBe(true);
      expect(result.data?.balance).toBe(900);
    });
  });
  
  describe('Cascading Failure Prevention', () => {
    it('should prevent cascading failures with circuit breakers', async () => {
      const breakers = [
        new CircuitBreaker({ failureThreshold: 2, name: 'service-1' }),
        new CircuitBreaker({ failureThreshold: 2, name: 'service-2' }),
        new CircuitBreaker({ failureThreshold: 2, name: 'service-3' }),
      ];
      
      const operations = breakers.map((_, i) =>
        vi.fn().mockRejectedValue(new Error(`Service ${i + 1} down`))
      );
      
      // All services fail
      for (let i = 0; i < breakers.length; i++) {
        await expect(breakers[i].execute(operations[i])).rejects.toThrow();
        await expect(breakers[i].execute(operations[i])).rejects.toThrow();
      }
      
      // All circuits should be open
      expect(breakers.every(b => b.isOpen())).toBe(true);
      
      // Further requests should be rejected immediately
      const callCounts = operations.map(op => op.mock.calls.length);
      
      for (let i = 0; i < breakers.length; i++) {
        await expect(breakers[i].execute(operations[i])).rejects.toThrow('Circuit breaker is OPEN');
      }
      
      // Operations should not have been called again
      operations.forEach((op, i) => {
        expect(op).toHaveBeenCalledTimes(callCounts[i]);
      });
    });
  });
  
  describe('Recovery Scenarios', () => {
    it('should recover from temporary failures', async () => {
      let isDown = true;
      
      const operation = vi.fn().mockImplementation(async () => {
        if (isDown) {
          throw new NetworkError('Service temporarily down', undefined, true);
        }
        return 'success';
      });
      
      // Start retry in background
      const promise = withRetry(operation, {
        maxAttempts: 10,
        baseDelay: 50,
      });
      
      // Simulate service recovery after 200ms
      setTimeout(() => {
        isDown = false;
      }, 200);
      
      const result = await promise;
      
      expect(result).toBe('success');
      expect(operation.mock.calls.length).toBeGreaterThan(1);
    });
    
    it('should handle flapping services', async () => {
      let callCount = 0;
      
      const operation = vi.fn().mockImplementation(async () => {
        callCount++;
        // Alternate between success and failure
        if (callCount % 2 === 0) {
          throw new Error('Flapping');
        }
        return 'success';
      });
      
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
      });
      
      // Execute multiple times
      const results = [];
      for (let i = 0; i < 6; i++) {
        try {
          const result = await breaker.execute(operation);
          results.push({ success: true, result });
        } catch (error) {
          results.push({ success: false, error });
        }
      }
      
      // Should have mix of successes and failures
      const successes = results.filter(r => r.success).length;
      const failures = results.filter(r => !r.success).length;
      
      expect(successes).toBeGreaterThan(0);
      expect(failures).toBeGreaterThan(0);
    });
  });
});
