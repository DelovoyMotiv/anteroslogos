/**
 * Retry Handler
 * Enhanced retry logic with exponential backoff and circuit breaker pattern
 * 
 * This module provides:
 * - Exponential backoff with jitter for retries
 * - Circuit breaker pattern to prevent cascading failures
 * - Configurable retry strategies per error type
 * - Fallback model selection on failure
 * - Comprehensive retry metrics and logging
 * 
 * @module lib/citationIntelligence/llm/retryHandler
 */

import type { 
  RetryConfig, 
  CircuitBreakerState, 
  RetryMetrics,
  ErrorType 
} from '../types/llm.types';
import { LLMError } from '../types/llm.types';

// ============================================================================
// Circuit Breaker Class
// ============================================================================

/**
 * Circuit breaker state management
 * Prevents cascading failures by opening circuit after threshold failures
 */
class CircuitBreaker {
  /** Current circuit state */
  private state: CircuitBreakerState = 'closed';
  
  /** Consecutive failure count */
  private failureCount: number = 0;
  
  /** Timestamp when circuit was opened */
  private openedAt?: Date;
  
  /** Failure threshold before opening circuit */
  private threshold: number;
  
  /** Timeout before attempting half-open (milliseconds) */
  private timeout: number;
  
  /** Last failure timestamp */
  private lastFailure?: Date;
  
  /**
   * Create a new CircuitBreaker
   * 
   * @param threshold - Number of consecutive failures before opening
   * @param timeout - Milliseconds before attempting half-open
   */
  constructor(threshold: number, timeout: number) {
    this.threshold = threshold;
    this.timeout = timeout;
  }
  
  /**
   * Get current circuit state
   */
  getState(): CircuitBreakerState {
    // Check if we should transition from open to half-open
    if (this.state === 'open' && this.openedAt) {
      const elapsed = Date.now() - this.openedAt.getTime();
      if (elapsed >= this.timeout) {
        this.state = 'half-open';
      }
    }
    
    return this.state;
  }
  
  /**
   * Record a successful operation
   */
  recordSuccess(): void {
    this.failureCount = 0;
    this.lastFailure = undefined;
    
    // Close circuit if it was half-open
    if (this.state === 'half-open') {
      this.state = 'closed';
      this.openedAt = undefined;
    }
  }
  
  /**
   * Record a failed operation
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailure = new Date();
    
    // Open circuit if threshold reached
    if (this.failureCount >= this.threshold) {
      this.open();
    }
  }
  
  /**
   * Open the circuit
   */
  open(): void {
    this.state = 'open';
    this.openedAt = new Date();
  }
  
  /**
   * Close the circuit
   */
  close(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.openedAt = undefined;
    this.lastFailure = undefined;
  }
  
  /**
   * Check if circuit is open
   */
  isOpen(): boolean {
    return this.getState() === 'open';
  }
  
  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }
  
  /**
   * Get last failure timestamp
   */
  getLastFailure(): Date | undefined {
    return this.lastFailure;
  }
  
  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.openedAt = undefined;
    this.lastFailure = undefined;
  }
}

// ============================================================================
// Retry Handler Class
// ============================================================================

/**
 * RetryHandler
 * Handles retry logic with exponential backoff and circuit breaker
 * 
 * Features:
 * - Exponential backoff with configurable base and max delays
 * - Random jitter to prevent thundering herd
 * - Circuit breaker to prevent cascading failures
 * - Configurable retry strategies per error type
 * - Comprehensive metrics tracking
 * - Fallback model selection on failure
 * 
 * @example
 * ```typescript
 * const handler = new RetryHandler({
 *   maxRetries: 3,
 *   baseDelay: 1000,
 *   maxDelay: 32000,
 *   exponentialBackoff: true,
 *   jitter: true,
 *   circuitBreakerThreshold: 5,
 *   circuitBreakerTimeout: 60000,
 *   retryableErrors: [ErrorType.RATE_LIMIT, ErrorType.TIMEOUT, ErrorType.SERVER_ERROR]
 * });
 * 
 * // Execute operation with retry
 * const result = await handler.executeWithRetry(async () => {
 *   return await apiCall();
 * });
 * ```
 */
export class RetryHandler {
  /** Maximum number of retry attempts */
  private maxRetries: number;
  
  /** Base delay in milliseconds */
  private baseDelay: number;
  
  /** Maximum delay in milliseconds */
  private maxDelay: number;
  
  /** Enable exponential backoff */
  private exponentialBackoff: boolean;
  
  /** Add random jitter to delays */
  private jitter: boolean;
  
  /** Circuit breaker instance */
  private circuitBreaker: CircuitBreaker;
  
  /** Error types that should trigger retry */
  private retryableErrors: Set<ErrorType>;
  
  /** Retry metrics */
  private metrics: {
    totalRetries: number;
    successfulRetries: number;
    failedRetries: number;
    totalDelay: number;
  };
  
  /**
   * Create a new RetryHandler
   * 
   * @param config - Retry configuration
   * 
   * @example
   * ```typescript
   * const handler = new RetryHandler({
   *   maxRetries: 3,
   *   baseDelay: 1000,
   *   maxDelay: 32000,
   *   exponentialBackoff: true,
   *   jitter: true,
   *   circuitBreakerThreshold: 5,
   *   circuitBreakerTimeout: 60000,
   *   retryableErrors: [ErrorType.RATE_LIMIT, ErrorType.TIMEOUT, ErrorType.SERVER_ERROR]
   * });
   * ```
   */
  constructor(config: RetryConfig) {
    this.maxRetries = config.maxRetries;
    this.baseDelay = config.baseDelay;
    this.maxDelay = config.maxDelay;
    this.exponentialBackoff = config.exponentialBackoff;
    this.jitter = config.jitter;
    
    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker(
      config.circuitBreakerThreshold,
      config.circuitBreakerTimeout
    );
    
    // Initialize retryable errors set
    this.retryableErrors = new Set(config.retryableErrors);
    
    // Initialize metrics
    this.metrics = {
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      totalDelay: 0,
    };
  }
  
  // ==========================================================================
  // Core Retry Methods
  // ==========================================================================
  
  /**
   * Execute an operation with retry logic
   * 
   * This method will:
   * 1. Check if circuit breaker is open
   * 2. Execute the operation
   * 3. If it fails with a retryable error, retry with backoff
   * 4. Track metrics and update circuit breaker
   * 
   * @param operation - Async operation to execute
   * @param context - Optional context for logging
   * @returns Promise resolving to operation result
   * @throws Error if all retries exhausted or non-retryable error
   * 
   * @example
   * ```typescript
   * const result = await handler.executeWithRetry(async () => {
   *   return await fetch('https://api.example.com/data');
   * }, { operationName: 'fetchData' });
   * ```
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context?: { operationName?: string; metadata?: Record<string, any> }
  ): Promise<T> {
    // Check if circuit breaker is open
    if (this.isCircuitOpen()) {
      const error = new Error(
        `Circuit breaker is open. Last failure: ${this.circuitBreaker.getLastFailure()?.toISOString()}`
      );
      throw error;
    }
    
    let lastError: Error | undefined;
    let attempt = 0;
    
    while (attempt <= this.maxRetries) {
      try {
        // Execute operation
        const result = await operation();
        
        // Success! Record it and return
        this.circuitBreaker.recordSuccess();
        
        // Track successful retry if this wasn't the first attempt
        if (attempt > 0) {
          this.metrics.successfulRetries++;
        }
        
        return result;
        
      } catch (error) {
        lastError = error as Error;
        
        // Check if we should retry
        if (!this.shouldRetry(error as Error)) {
          // Non-retryable error, fail immediately
          this.circuitBreaker.recordFailure();
          throw error;
        }
        
        // Check if we've exhausted retries
        if (attempt >= this.maxRetries) {
          // No more retries, fail
          this.circuitBreaker.recordFailure();
          this.metrics.failedRetries++;
          break;
        }
        
        // Calculate backoff delay
        const delay = this.calculateBackoff(attempt);
        
        // Log retry attempt
        console.warn(
          `[RetryHandler] Retry attempt ${attempt + 1}/${this.maxRetries} ` +
          `after ${delay}ms delay. Error: ${(error as Error).message}`,
          context
        );
        
        // Track metrics
        this.metrics.totalRetries++;
        this.metrics.totalDelay += delay;
        
        // Wait before retrying
        await this.sleep(delay);
        
        // Increment attempt counter
        attempt++;
      }
    }
    
    // All retries exhausted
    throw new Error(
      `Operation failed after ${this.maxRetries} retries. Last error: ${lastError?.message}`
    );
  }
  
  /**
   * Calculate backoff delay for retry attempt
   * 
   * Uses exponential backoff with optional jitter:
   * - Linear: baseDelay * (attempt + 1)
   * - Exponential: baseDelay * (2 ^ attempt)
   * - Jitter: Add random value between 0 and delay * 0.1
   * 
   * @param attempt - Current attempt number (0-indexed)
   * @returns Delay in milliseconds
   * 
   * @example
   * ```typescript
   * const delay = handler.calculateBackoff(0); // First retry
   * // With baseDelay=1000, exponential=true, jitter=true:
   * // Returns: ~1000ms + random(0-100ms)
   * 
   * const delay2 = handler.calculateBackoff(2); // Third retry
   * // Returns: ~4000ms + random(0-400ms)
   * ```
   */
  calculateBackoff(attempt: number): number {
    let delay: number;
    
    if (this.exponentialBackoff) {
      // Exponential backoff: baseDelay * (2 ^ attempt)
      delay = this.baseDelay * Math.pow(2, attempt);
    } else {
      // Linear backoff: baseDelay * (attempt + 1)
      delay = this.baseDelay * (attempt + 1);
    }
    
    // Cap at maxDelay
    delay = Math.min(delay, this.maxDelay);
    
    // Add jitter if enabled
    if (this.jitter) {
      // Add random value between 0 and 10% of delay
      const jitterAmount = Math.random() * delay * 0.1;
      delay += jitterAmount;
    }
    
    return Math.floor(delay);
  }
  
  /**
   * Check if an error should trigger a retry
   * 
   * Retryable errors:
   * - Rate limit (429)
   * - Timeout (408)
   * - Server error (500-599)
   * - Network error
   * 
   * Non-retryable errors:
   * - Authentication error (401)
   * - Invalid request (400)
   * - Not found (404)
   * 
   * @param error - Error to check
   * @returns True if error is retryable
   * 
   * @example
   * ```typescript
   * const error = new Error('Rate limit exceeded');
   * error.statusCode = 429;
   * 
   * if (handler.shouldRetry(error)) {
   *   // Will retry
   * }
   * ```
   */
  shouldRetry(error: Error): boolean {
    // Check if error is an LLMError with error code
    if (error instanceof LLMError) {
      return this.retryableErrors.has(error.code);
    }
    
    // Check for HTTP status code
    const statusCode = (error as any).statusCode || (error as any).status;
    
    if (statusCode) {
      // Rate limit errors (429)
      if (statusCode === 429) {
        return this.retryableErrors.has(429);
      }
      
      // Timeout errors (408)
      if (statusCode === 408) {
        return this.retryableErrors.has(408);
      }
      
      // Server errors (500-599)
      if (statusCode >= 500 && statusCode < 600) {
        return this.retryableErrors.has(500);
      }
      
      // Client errors (400-499) are generally not retryable
      if (statusCode >= 400 && statusCode < 500) {
        return false;
      }
    }
    
    // Check for network errors
    const errorMessage = error.message.toLowerCase();
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('econnrefused') ||
      errorMessage.includes('enotfound')
    ) {
      return this.retryableErrors.has(0); // NETWORK_ERROR
    }
    
    // Default: don't retry unknown errors
    return false;
  }
  
  // ==========================================================================
  // Circuit Breaker Methods
  // ==========================================================================
  
  /**
   * Open the circuit breaker
   * 
   * Call this to manually open the circuit and prevent further requests
   * 
   * @example
   * ```typescript
   * handler.openCircuit();
   * ```
   */
  openCircuit(): void {
    this.circuitBreaker.open();
  }
  
  /**
   * Close the circuit breaker
   * 
   * Call this to manually close the circuit and allow requests
   * 
   * @example
   * ```typescript
   * handler.closeCircuit();
   * ```
   */
  closeCircuit(): void {
    this.circuitBreaker.close();
  }
  
  /**
   * Check if circuit breaker is open
   * 
   * @returns True if circuit is open
   * 
   * @example
   * ```typescript
   * if (handler.isCircuitOpen()) {
   *   console.log('Circuit is open, requests will be rejected');
   * }
   * ```
   */
  isCircuitOpen(): boolean {
    return this.circuitBreaker.isOpen();
  }
  
  /**
   * Get circuit breaker state
   * 
   * @returns Current circuit state
   * 
   * @example
   * ```typescript
   * const state = handler.getCircuitState();
   * console.log(`Circuit is ${state}`);
   * ```
   */
  getCircuitState(): CircuitBreakerState {
    return this.circuitBreaker.getState();
  }
  
  /**
   * Reset circuit breaker
   * 
   * Resets failure count and closes circuit
   * 
   * @example
   * ```typescript
   * handler.resetCircuit();
   * ```
   */
  resetCircuit(): void {
    this.circuitBreaker.reset();
  }
  
  // ==========================================================================
  // Metrics Methods
  // ==========================================================================
  
  /**
   * Get retry metrics
   * 
   * @returns Current retry metrics
   * 
   * @example
   * ```typescript
   * const metrics = handler.getMetrics();
   * console.log(`Total retries: ${metrics.totalRetries}`);
   * console.log(`Success rate: ${metrics.successfulRetries / metrics.totalRetries}`);
   * ```
   */
  getMetrics(): RetryMetrics {
    return {
      totalRetries: this.metrics.totalRetries,
      successfulRetries: this.metrics.successfulRetries,
      failedRetries: this.metrics.failedRetries,
      circuitBreakerState: this.circuitBreaker.getState(),
      consecutiveFailures: this.circuitBreaker.getFailureCount(),
      lastFailure: this.circuitBreaker.getLastFailure(),
      averageRetryDelay: this.metrics.totalRetries > 0
        ? this.metrics.totalDelay / this.metrics.totalRetries
        : 0,
    };
  }
  
  /**
   * Reset metrics
   * 
   * Resets all retry metrics to zero
   * 
   * @example
   * ```typescript
   * handler.resetMetrics();
   * ```
   */
  resetMetrics(): void {
    this.metrics = {
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      totalDelay: 0,
    };
  }
  
  // ==========================================================================
  // Utility Methods
  // ==========================================================================
  
  /**
   * Sleep for specified milliseconds
   * 
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after delay
   * 
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get configuration
   * 
   * @returns Current retry configuration
   * 
   * @example
   * ```typescript
   * const config = handler.getConfig();
   * console.log(`Max retries: ${config.maxRetries}`);
   * ```
   */
  getConfig(): {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    exponentialBackoff: boolean;
    jitter: boolean;
  } {
    return {
      maxRetries: this.maxRetries,
      baseDelay: this.baseDelay,
      maxDelay: this.maxDelay,
      exponentialBackoff: this.exponentialBackoff,
      jitter: this.jitter,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a RetryHandler with default configuration
 * 
 * Default configuration:
 * - maxRetries: 3
 * - baseDelay: 1000ms
 * - maxDelay: 32000ms
 * - exponentialBackoff: true
 * - jitter: true
 * - circuitBreakerThreshold: 5
 * - circuitBreakerTimeout: 60000ms (60 seconds)
 * - retryableErrors: [RATE_LIMIT, TIMEOUT, SERVER_ERROR, NETWORK_ERROR]
 * 
 * @param overrides - Optional configuration overrides
 * @returns New RetryHandler instance
 * 
 * @example
 * ```typescript
 * const handler = createRetryHandler();
 * // or with custom config
 * const customHandler = createRetryHandler({
 *   maxRetries: 5,
 *   baseDelay: 2000
 * });
 * ```
 */
export function createRetryHandler(
  overrides?: Partial<RetryConfig>
): RetryHandler {
  const defaultConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 32000,
    exponentialBackoff: true,
    jitter: true,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 60000, // 60 seconds
    retryableErrors: [429, 408, 500, 0], // RATE_LIMIT, TIMEOUT, SERVER_ERROR, NETWORK_ERROR
  };
  
  return new RetryHandler({
    ...defaultConfig,
    ...overrides,
  });
}
