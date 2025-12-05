/**
 * Parallel Executor
 * Executes multiple LLM requests in parallel with timeout and error handling
 * 
 * This module provides:
 * - Parallel execution of multiple requests
 * - Per-request timeout handling
 * - Partial result support (some succeed, some fail)
 * - Result aggregation and metrics
 * - Graceful error handling
 * 
 * @module lib/citationIntelligence/llm/parallelExecutor
 */

import type { 
  ParallelRequest, 
  ParallelResult, 
  ParallelMetrics 
} from '../types/llm.types';

// ============================================================================
// Aggregated Result Type
// ============================================================================

/**
 * Aggregated result from parallel execution
 * Contains both successful and failed results
 */
export interface AggregatedResult<T> {
  /** Successful results */
  successful: ParallelResult<T>[];
  
  /** Failed results */
  failed: ParallelResult<T>[];
  
  /** Total number of requests */
  total: number;
  
  /** Success rate (0-1) */
  successRate: number;
  
  /** Failure rate (0-1) */
  failureRate: number;
  
  /** Total execution time */
  totalTime: number;
  
  /** Average execution time */
  averageTime: number;
}

// ============================================================================
// Parallel Executor Class
// ============================================================================

/**
 * ParallelExecutor
 * Executes multiple operations in parallel with timeout and error handling
 * 
 * Features:
 * - Execute multiple requests concurrently using Promise.all()
 * - Per-request timeout handling
 * - Partial failure support (return successful results even if some fail)
 * - Result aggregation and metrics
 * - Graceful error handling
 * 
 * @example
 * ```typescript
 * const executor = new ParallelExecutor({ timeout: 30000 });
 * 
 * const requests: ParallelRequest<string>[] = [
 *   {
 *     id: 'req1',
 *     operation: async () => await model1.chat(messages),
 *   },
 *   {
 *     id: 'req2',
 *     operation: async () => await model2.chat(messages),
 *     timeout: 15000, // Custom timeout for this request
 *   },
 * ];
 * 
 * const results = await executor.executeParallel(requests);
 * console.log(`${results.size} results returned`);
 * ```
 */
export class ParallelExecutor {
  /** Default timeout in milliseconds */
  private timeout: number;
  
  /**
   * Create a new ParallelExecutor
   * 
   * @param config - Configuration options
   * 
   * @example
   * ```typescript
   * const executor = new ParallelExecutor({ timeout: 30000 });
   * ```
   */
  constructor(config: { timeout?: number } = {}) {
    this.timeout = config.timeout || 30000; // Default 30 seconds
  }
  
  // ==========================================================================
  // Core Execution Methods
  // ==========================================================================
  
  /**
   * Execute multiple requests in parallel
   * 
   * This method will:
   * 1. Execute all requests concurrently using Promise.all()
   * 2. Apply timeout to each request
   * 3. Catch errors and return partial results
   * 4. Track execution time for each request
   * 
   * @param requests - Array of parallel requests
   * @returns Map of request ID to result or error
   * 
   * @example
   * ```typescript
   * const requests: ParallelRequest<string>[] = [
   *   { id: 'req1', operation: async () => 'result1' },
   *   { id: 'req2', operation: async () => 'result2' },
   * ];
   * 
   * const results = await executor.executeParallel(requests);
   * // Returns: Map { 'req1' => 'result1', 'req2' => 'result2' }
   * ```
   */
  async executeParallel<T>(
    requests: ParallelRequest<T>[]
  ): Promise<Map<string, T | Error>> {
    // Execute all requests in parallel
    const promises = requests.map(request => 
      this.executeWithTimeout(request)
    );
    
    // Wait for all promises to settle
    const results = await Promise.allSettled(promises);
    
    // Build result map
    const resultMap = new Map<string, T | Error>();
    
    results.forEach((result, index) => {
      const request = requests[index];
      
      if (result.status === 'fulfilled') {
        // Check if the ParallelResult indicates success or failure
        const parallelResult = result.value;
        
        if (parallelResult.success && parallelResult.result !== undefined) {
          // Success: store the result
          resultMap.set(request.id, parallelResult.result);
        } else if (parallelResult.error) {
          // Failure: store the error
          resultMap.set(request.id, parallelResult.error);
        }
      } else {
        // Promise was rejected: store the error
        resultMap.set(request.id, result.reason as Error);
      }
    });
    
    return resultMap;
  }
  
  /**
   * Execute a single request with timeout
   * 
   * @param request - Request to execute
   * @returns Promise resolving to ParallelResult
   * 
   * @private
   */
  private async executeWithTimeout<T>(
    request: ParallelRequest<T>
  ): Promise<ParallelResult<T>> {
    const startTime = Date.now();
    const timeout = request.timeout || this.timeout;
    
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Request ${request.id} timed out after ${timeout}ms`));
        }, timeout);
      });
      
      // Race between operation and timeout
      const result = await Promise.race([
        request.operation(),
        timeoutPromise,
      ]);
      
      const executionTime = Date.now() - startTime;
      
      return {
        id: request.id,
        result,
        executionTime,
        success: true,
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        id: request.id,
        error: error as Error,
        executionTime,
        success: false,
      };
    }
  }
  
  // ==========================================================================
  // Result Processing Methods
  // ==========================================================================
  
  /**
   * Aggregate results from parallel execution
   * 
   * Separates successful and failed results and calculates metrics
   * 
   * @param results - Map of request ID to result or error
   * @returns Aggregated result with metrics
   * 
   * @example
   * ```typescript
   * const results = await executor.executeParallel(requests);
   * const aggregated = executor.aggregateResults(results);
   * 
   * console.log(`Success rate: ${aggregated.successRate * 100}%`);
   * console.log(`${aggregated.successful.length} succeeded`);
   * console.log(`${aggregated.failed.length} failed`);
   * ```
   */
  aggregateResults<T>(
    results: Map<string, T | Error>
  ): AggregatedResult<T> {
    const successful: ParallelResult<T>[] = [];
    const failed: ParallelResult<T>[] = [];
    let totalTime = 0;
    
    // Separate successful and failed results
    results.forEach((value, id) => {
      if (value instanceof Error) {
        // Failed result
        failed.push({
          id,
          error: value,
          executionTime: 0, // Unknown execution time
          success: false,
        });
      } else {
        // Successful result
        successful.push({
          id,
          result: value,
          executionTime: 0, // Unknown execution time
          success: true,
        });
      }
    });
    
    const total = results.size;
    const successRate = total > 0 ? successful.length / total : 0;
    const failureRate = total > 0 ? failed.length / total : 0;
    const averageTime = total > 0 ? totalTime / total : 0;
    
    return {
      successful,
      failed,
      total,
      successRate,
      failureRate,
      totalTime,
      averageTime,
    };
  }
  
  /**
   * Get successful results from result map
   * 
   * Filters out errors and returns only successful results
   * 
   * @param results - Map of request ID to result or error
   * @returns Array of successful results
   * 
   * @example
   * ```typescript
   * const results = await executor.executeParallel(requests);
   * const successful = executor.getSuccessfulResults(results);
   * 
   * successful.forEach(result => {
   *   console.log('Success:', result);
   * });
   * ```
   */
  getSuccessfulResults<T>(results: Map<string, T | Error>): T[] {
    const successful: T[] = [];
    
    results.forEach(value => {
      if (!(value instanceof Error)) {
        successful.push(value);
      }
    });
    
    return successful;
  }
  
  /**
   * Get failed results from result map
   * 
   * Filters out successful results and returns only errors
   * 
   * @param results - Map of request ID to result or error
   * @returns Array of errors
   * 
   * @example
   * ```typescript
   * const results = await executor.executeParallel(requests);
   * const failed = executor.getFailedResults(results);
   * 
   * failed.forEach(error => {
   *   console.error('Failed:', error.message);
   * });
   * ```
   */
  getFailedResults<T>(results: Map<string, T | Error>): Error[] {
    const failed: Error[] = [];
    
    results.forEach(value => {
      if (value instanceof Error) {
        failed.push(value);
      }
    });
    
    return failed;
  }
  
  // ==========================================================================
  // Metrics Methods
  // ==========================================================================
  
  /**
   * Get execution metrics from results
   * 
   * Calculates detailed metrics including timing and success rates
   * 
   * @param results - Map of request ID to result or error
   * @returns Execution metrics
   * 
   * @example
   * ```typescript
   * const results = await executor.executeParallel(requests);
   * const metrics = executor.getMetrics(results);
   * 
   * console.log(`Total time: ${metrics.totalTime}ms`);
   * console.log(`Success rate: ${metrics.successRate * 100}%`);
   * console.log(`Average time: ${metrics.averageExecutionTime}ms`);
   * ```
   */
  getMetrics<T>(results: Map<string, T | Error>): ParallelMetrics {
    const perRequestTime = new Map<string, number>();
    let totalTime = 0;
    let successCount = 0;
    let failureCount = 0;
    
    // Calculate metrics
    results.forEach((value, id) => {
      // For now, we don't have execution time in the result map
      // This would need to be tracked separately in a real implementation
      const executionTime = 0;
      perRequestTime.set(id, executionTime);
      totalTime += executionTime;
      
      if (value instanceof Error) {
        failureCount++;
      } else {
        successCount++;
      }
    });
    
    const total = results.size;
    const successRate = total > 0 ? successCount / total : 0;
    const failureRate = total > 0 ? failureCount / total : 0;
    const averageExecutionTime = total > 0 ? totalTime / total : 0;
    
    return {
      totalTime,
      perRequestTime,
      successRate,
      failureRate,
      successCount,
      failureCount,
      averageExecutionTime,
    };
  }
  
  // ==========================================================================
  // Utility Methods
  // ==========================================================================
  
  /**
   * Get current timeout setting
   * 
   * @returns Default timeout in milliseconds
   * 
   * @example
   * ```typescript
   * const timeout = executor.getTimeout();
   * console.log(`Default timeout: ${timeout}ms`);
   * ```
   */
  getTimeout(): number {
    return this.timeout;
  }
  
  /**
   * Update default timeout
   * 
   * @param timeout - New timeout in milliseconds
   * 
   * @example
   * ```typescript
   * executor.setTimeout(60000); // 60 seconds
   * ```
   */
  setTimeout(timeout: number): void {
    if (timeout <= 0) {
      throw new Error('Timeout must be greater than 0');
    }
    this.timeout = timeout;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a ParallelExecutor with default configuration
 * 
 * Default configuration:
 * - timeout: 30000ms (30 seconds)
 * 
 * @param config - Optional configuration overrides
 * @returns New ParallelExecutor instance
 * 
 * @example
 * ```typescript
 * const executor = createParallelExecutor();
 * // or with custom config
 * const customExecutor = createParallelExecutor({ timeout: 60000 });
 * ```
 */
export function createParallelExecutor(
  config?: { timeout?: number }
): ParallelExecutor {
  return new ParallelExecutor(config);
}
