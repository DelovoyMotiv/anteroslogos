/**
 * Retry Logic with Exponential Backoff and Jitter
 * 
 * Features:
 * - Exponential backoff with configurable base
 * - Jitter to prevent thundering herd
 * - Max retry count (default: 3)
 * - Idempotency key support
 * - Retryable error detection
 * 
 * **Feature: production-audit-improvements, Property 19: Automatic Retry on Transient Failures**
 * **Validates: Requirements 5.3**
 * 
 * @module lib/reliability/retry
 */

import { isRetryableError } from './errors';

/**
 * Retry configuration options
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts: number;
  
  /** Base delay in milliseconds (default: 1000) */
  baseDelay: number;
  
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelay: number;
  
  /** Exponential base for backoff calculation (default: 2) */
  exponentialBase: number;
  
  /** Add jitter to prevent thundering herd (default: true) */
  jitter: boolean;
  
  /** List of retryable error codes/types */
  retryableErrors?: string[];
  
  /** Custom function to determine if error is retryable */
  isRetryable?: (error: unknown) => boolean;
  
  /** Callback invoked before each retry attempt */
  onRetry?: (error: unknown, attempt: number, delay: number) => void;
  
  /** Idempotency key for the operation */
  idempotencyKey?: string;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  exponentialBase: 2,
  jitter: true,
};

/**
 * Calculate delay with exponential backoff and optional jitter
 */
export function calculateDelay(
  attempt: number,
  config: RetryConfig
): number {
  // Calculate exponential backoff: baseDelay * (exponentialBase ^ attempt)
  let delay = Math.min(
    config.baseDelay * Math.pow(config.exponentialBase, attempt),
    config.maxDelay
  );
  
  // Add jitter: multiply by random value between 0.5 and 1.0
  if (config.jitter) {
    delay = delay * (0.5 + Math.random() * 0.5);
  }
  
  return Math.floor(delay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff
 * 
 * @param operation - Async function to retry
 * @param config - Retry configuration
 * @returns Promise resolving to operation result
 * @throws Last error if all retries exhausted
 * 
 * @example
 * ```typescript
 * const result = await withRetry(
 *   async () => {
 *     return await fetch('https://api.example.com/data');
 *   },
 *   {
 *     maxAttempts: 3,
 *     baseDelay: 1000,
 *     onRetry: (error, attempt, delay) => {
 *       console.log(`Retry attempt ${attempt} after ${delay}ms: ${error.message}`);
 *     }
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const fullConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const isRetryableFn = fullConfig.isRetryable || isRetryableError;
  
  let lastError: unknown;
  
  for (let attempt = 0; attempt < fullConfig.maxAttempts; attempt++) {
    try {
      // Execute the operation
      const result = await operation();
      return result;
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      const shouldRetry = isRetryableFn(error);
      const isLastAttempt = attempt === fullConfig.maxAttempts - 1;
      
      if (!shouldRetry || isLastAttempt) {
        // Don't retry non-retryable errors or if this was the last attempt
        throw error;
      }
      
      // Calculate delay for next attempt
      const delay = calculateDelay(attempt, fullConfig);
      
      // Invoke retry callback if provided
      if (fullConfig.onRetry) {
        fullConfig.onRetry(error, attempt + 1, delay);
      }
      
      // Wait before retrying
      await sleep(delay);
    }
  }
  
  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Retry configuration for database operations
 */
export const DATABASE_RETRY_CONFIG: Partial<RetryConfig> = {
  maxAttempts: 3,
  baseDelay: 500,
  maxDelay: 5000,
  exponentialBase: 2,
  jitter: true,
};

/**
 * Retry configuration for external API calls
 */
export const API_RETRY_CONFIG: Partial<RetryConfig> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  exponentialBase: 2,
  jitter: true,
};

/**
 * Retry configuration for network operations
 */
export const NETWORK_RETRY_CONFIG: Partial<RetryConfig> = {
  maxAttempts: 5,
  baseDelay: 2000,
  maxDelay: 30000,
  exponentialBase: 2,
  jitter: true,
};

/**
 * Idempotency key manager for retry operations
 */
export class IdempotencyKeyManager {
  private keys: Map<string, { result: unknown; timestamp: number }> = new Map();
  private readonly ttlMs: number;
  
  constructor(ttlMs: number = 3600000) { // 1 hour default
    this.ttlMs = ttlMs;
  }
  
  /**
   * Check if operation with this key has been executed
   */
  has(key: string): boolean {
    this.cleanup();
    return this.keys.has(key);
  }
  
  /**
   * Get cached result for idempotency key
   */
  get<T>(key: string): T | undefined {
    this.cleanup();
    const entry = this.keys.get(key);
    return entry?.result as T | undefined;
  }
  
  /**
   * Store result for idempotency key
   */
  set(key: string, result: unknown): void {
    this.keys.set(key, {
      result,
      timestamp: Date.now(),
    });
  }
  
  /**
   * Remove expired keys
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.keys.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.keys.delete(key);
      }
    }
  }
  
  /**
   * Clear all keys
   */
  clear(): void {
    this.keys.clear();
  }
}

/**
 * Global idempotency key manager instance
 */
export const globalIdempotencyManager = new IdempotencyKeyManager();

/**
 * Retry operation with idempotency key support
 * 
 * If the operation has already been executed with this key, returns cached result.
 * Otherwise, executes the operation and caches the result.
 * 
 * @param key - Idempotency key
 * @param operation - Async function to execute
 * @param config - Retry configuration
 * @returns Promise resolving to operation result
 */
export async function withRetryAndIdempotency<T>(
  key: string,
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  // Check if we've already executed this operation
  if (globalIdempotencyManager.has(key)) {
    const cached = globalIdempotencyManager.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }
  }
  
  // Execute with retry
  const result = await withRetry(operation, {
    ...config,
    idempotencyKey: key,
  });
  
  // Cache the result
  globalIdempotencyManager.set(key, result);
  
  return result;
}
