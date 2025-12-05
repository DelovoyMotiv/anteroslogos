/**
 * Unit tests for ParallelExecutor
 * 
 * Tests:
 * - Executes requests in parallel
 * - Returns partial results on failure
 * - Respects timeout per request
 * - Aggregates results correctly
 * - Calculates metrics accurately
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ParallelExecutor, createParallelExecutor } from '../parallelExecutor';
import type { ParallelRequest } from '../../types/llm.types';

describe('ParallelExecutor', () => {
  let executor: ParallelExecutor;
  
  beforeEach(() => {
    executor = new ParallelExecutor({ timeout: 5000 });
  });
  
  // ==========================================================================
  // Constructor Tests
  // ==========================================================================
  
  describe('constructor', () => {
    it('should create executor with default timeout', () => {
      const exec = new ParallelExecutor();
      expect(exec.getTimeout()).toBe(30000);
    });
    
    it('should create executor with custom timeout', () => {
      const exec = new ParallelExecutor({ timeout: 10000 });
      expect(exec.getTimeout()).toBe(10000);
    });
  });
  
  // ==========================================================================
  // Parallel Execution Tests
  // ==========================================================================
  
  describe('executeParallel', () => {
    it('should execute requests in parallel', async () => {
      const startTime = Date.now();
      
      const requests: ParallelRequest<string>[] = [
        {
          id: 'req1',
          operation: async () => {
            await sleep(100);
            return 'result1';
          },
        },
        {
          id: 'req2',
          operation: async () => {
            await sleep(100);
            return 'result2';
          },
        },
        {
          id: 'req3',
          operation: async () => {
            await sleep(100);
            return 'result3';
          },
        },
      ];
      
      const results = await executor.executeParallel(requests);
      const elapsed = Date.now() - startTime;
      
      // Should complete in ~100ms (parallel), not ~300ms (sequential)
      expect(elapsed).toBeLessThan(200);
      
      // All requests should succeed
      expect(results.size).toBe(3);
      expect(results.get('req1')).toBe('result1');
      expect(results.get('req2')).toBe('result2');
      expect(results.get('req3')).toBe('result3');
    });
    
    it('should return partial results on failure', async () => {
      const requests: ParallelRequest<string>[] = [
        {
          id: 'req1',
          operation: async () => 'success1',
        },
        {
          id: 'req2',
          operation: async () => {
            throw new Error('Request failed');
          },
        },
        {
          id: 'req3',
          operation: async () => 'success3',
        },
      ];
      
      const results = await executor.executeParallel(requests);
      
      // Should return all results (including failures)
      expect(results.size).toBe(3);
      
      // Successful results
      expect(results.get('req1')).toBe('success1');
      expect(results.get('req3')).toBe('success3');
      
      // Failed result should be an Error
      const failedResult = results.get('req2');
      expect(failedResult).toBeInstanceOf(Error);
      expect((failedResult as Error).message).toBe('Request failed');
    });
    
    it('should respect timeout per request', async () => {
      const requests: ParallelRequest<string>[] = [
        {
          id: 'req1',
          operation: async () => {
            await sleep(100);
            return 'fast';
          },
          timeout: 200, // Should succeed
        },
        {
          id: 'req2',
          operation: async () => {
            await sleep(500);
            return 'slow';
          },
          timeout: 100, // Should timeout
        },
      ];
      
      const results = await executor.executeParallel(requests);
      
      // Fast request should succeed
      expect(results.get('req1')).toBe('fast');
      
      // Slow request should timeout
      const slowResult = results.get('req2');
      expect(slowResult).toBeInstanceOf(Error);
      expect((slowResult as Error).message).toContain('timed out');
    });
    
    it('should use default timeout if not specified', async () => {
      const exec = new ParallelExecutor({ timeout: 100 });
      
      const requests: ParallelRequest<string>[] = [
        {
          id: 'req1',
          operation: async () => {
            await sleep(200);
            return 'result';
          },
          // No timeout specified, should use default (100ms)
        },
      ];
      
      const results = await exec.executeParallel(requests);
      
      // Should timeout with default timeout
      const result = results.get('req1');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain('timed out');
    });
    
    it('should handle empty request array', async () => {
      const results = await executor.executeParallel([]);
      expect(results.size).toBe(0);
    });
  });
  
  // ==========================================================================
  // Result Aggregation Tests
  // ==========================================================================
  
  describe('aggregateResults', () => {
    it('should aggregate results correctly', () => {
      const results = new Map<string, string | Error>();
      results.set('req1', 'success1');
      results.set('req2', new Error('failed'));
      results.set('req3', 'success3');
      
      const aggregated = executor.aggregateResults(results);
      
      expect(aggregated.total).toBe(3);
      expect(aggregated.successful.length).toBe(2);
      expect(aggregated.failed.length).toBe(1);
      expect(aggregated.successRate).toBe(2 / 3);
      expect(aggregated.failureRate).toBe(1 / 3);
    });
    
    it('should handle all successful results', () => {
      const results = new Map<string, string | Error>();
      results.set('req1', 'success1');
      results.set('req2', 'success2');
      
      const aggregated = executor.aggregateResults(results);
      
      expect(aggregated.successful.length).toBe(2);
      expect(aggregated.failed.length).toBe(0);
      expect(aggregated.successRate).toBe(1);
      expect(aggregated.failureRate).toBe(0);
    });
    
    it('should handle all failed results', () => {
      const results = new Map<string, string | Error>();
      results.set('req1', new Error('failed1'));
      results.set('req2', new Error('failed2'));
      
      const aggregated = executor.aggregateResults(results);
      
      expect(aggregated.successful.length).toBe(0);
      expect(aggregated.failed.length).toBe(2);
      expect(aggregated.successRate).toBe(0);
      expect(aggregated.failureRate).toBe(1);
    });
    
    it('should handle empty results', () => {
      const results = new Map<string, string | Error>();
      
      const aggregated = executor.aggregateResults(results);
      
      expect(aggregated.total).toBe(0);
      expect(aggregated.successful.length).toBe(0);
      expect(aggregated.failed.length).toBe(0);
      expect(aggregated.successRate).toBe(0);
      expect(aggregated.failureRate).toBe(0);
    });
  });
  
  // ==========================================================================
  // Result Filtering Tests
  // ==========================================================================
  
  describe('getSuccessfulResults', () => {
    it('should return only successful results', () => {
      const results = new Map<string, string | Error>();
      results.set('req1', 'success1');
      results.set('req2', new Error('failed'));
      results.set('req3', 'success3');
      
      const successful = executor.getSuccessfulResults(results);
      
      expect(successful).toHaveLength(2);
      expect(successful).toContain('success1');
      expect(successful).toContain('success3');
    });
    
    it('should return empty array if no successful results', () => {
      const results = new Map<string, string | Error>();
      results.set('req1', new Error('failed1'));
      results.set('req2', new Error('failed2'));
      
      const successful = executor.getSuccessfulResults(results);
      
      expect(successful).toHaveLength(0);
    });
  });
  
  describe('getFailedResults', () => {
    it('should return only failed results', () => {
      const results = new Map<string, string | Error>();
      results.set('req1', 'success1');
      results.set('req2', new Error('failed1'));
      results.set('req3', new Error('failed2'));
      
      const failed = executor.getFailedResults(results);
      
      expect(failed).toHaveLength(2);
      expect(failed[0]).toBeInstanceOf(Error);
      expect(failed[1]).toBeInstanceOf(Error);
    });
    
    it('should return empty array if no failed results', () => {
      const results = new Map<string, string | Error>();
      results.set('req1', 'success1');
      results.set('req2', 'success2');
      
      const failed = executor.getFailedResults(results);
      
      expect(failed).toHaveLength(0);
    });
  });
  
  // ==========================================================================
  // Metrics Tests
  // ==========================================================================
  
  describe('getMetrics', () => {
    it('should calculate metrics accurately', () => {
      const results = new Map<string, string | Error>();
      results.set('req1', 'success1');
      results.set('req2', new Error('failed'));
      results.set('req3', 'success3');
      results.set('req4', 'success4');
      
      const metrics = executor.getMetrics(results);
      
      expect(metrics.successCount).toBe(3);
      expect(metrics.failureCount).toBe(1);
      expect(metrics.successRate).toBe(0.75);
      expect(metrics.failureRate).toBe(0.25);
      expect(metrics.perRequestTime.size).toBe(4);
    });
    
    it('should handle empty results', () => {
      const results = new Map<string, string | Error>();
      
      const metrics = executor.getMetrics(results);
      
      expect(metrics.successCount).toBe(0);
      expect(metrics.failureCount).toBe(0);
      expect(metrics.successRate).toBe(0);
      expect(metrics.failureRate).toBe(0);
      expect(metrics.averageExecutionTime).toBe(0);
    });
  });
  
  // ==========================================================================
  // Configuration Tests
  // ==========================================================================
  
  describe('setTimeout', () => {
    it('should update timeout', () => {
      executor.setTimeout(10000);
      expect(executor.getTimeout()).toBe(10000);
    });
    
    it('should throw error for invalid timeout', () => {
      expect(() => executor.setTimeout(0)).toThrow('Timeout must be greater than 0');
      expect(() => executor.setTimeout(-1000)).toThrow('Timeout must be greater than 0');
    });
  });
  
  // ==========================================================================
  // Factory Function Tests
  // ==========================================================================
  
  describe('createParallelExecutor', () => {
    it('should create executor with default config', () => {
      const exec = createParallelExecutor();
      expect(exec).toBeInstanceOf(ParallelExecutor);
      expect(exec.getTimeout()).toBe(30000);
    });
    
    it('should create executor with custom config', () => {
      const exec = createParallelExecutor({ timeout: 15000 });
      expect(exec).toBeInstanceOf(ParallelExecutor);
      expect(exec.getTimeout()).toBe(15000);
    });
  });
  
  // ==========================================================================
  // Integration Tests
  // ==========================================================================
  
  describe('integration', () => {
    it('should handle mixed success and failure with timeouts', async () => {
      const requests: ParallelRequest<string>[] = [
        {
          id: 'fast-success',
          operation: async () => {
            await sleep(50);
            return 'fast';
          },
          timeout: 100,
        },
        {
          id: 'slow-timeout',
          operation: async () => {
            await sleep(200);
            return 'slow';
          },
          timeout: 100,
        },
        {
          id: 'error',
          operation: async () => {
            throw new Error('Intentional error');
          },
        },
        {
          id: 'success',
          operation: async () => 'success',
        },
      ];
      
      const results = await executor.executeParallel(requests);
      
      // Check individual results
      expect(results.get('fast-success')).toBe('fast');
      expect(results.get('success')).toBe('success');
      
      const timeoutResult = results.get('slow-timeout');
      expect(timeoutResult).toBeInstanceOf(Error);
      
      const errorResult = results.get('error');
      expect(errorResult).toBeInstanceOf(Error);
      expect((errorResult as Error).message).toBe('Intentional error');
      
      // Check aggregated results
      const aggregated = executor.aggregateResults(results);
      expect(aggregated.successful.length).toBe(2);
      expect(aggregated.failed.length).toBe(2);
      expect(aggregated.successRate).toBe(0.5);
      
      // Check metrics
      const metrics = executor.getMetrics(results);
      expect(metrics.successCount).toBe(2);
      expect(metrics.failureCount).toBe(2);
    });
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
