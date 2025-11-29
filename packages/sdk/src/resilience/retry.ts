import { DEFAULT_RETRY_CONFIG, RETRYABLE_STATUS_CODES } from '../utils/constants.js';
import {
  TimeoutError,
  NetworkError,
  RateLimitError,
  ServerError,
} from '../errors/types.js';
import { AnterosError } from '../errors/base.js';

export interface RetryConfig {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  multiplier?: number;
  jitterFactor?: number;
}

export class RetryStrategy {
  private readonly maxAttempts: number;
  private readonly initialDelay: number;
  private readonly maxDelay: number;
  private readonly multiplier: number;
  private readonly jitterFactor: number;

  constructor(config: RetryConfig = {}) {
    this.maxAttempts = config.maxAttempts ?? DEFAULT_RETRY_CONFIG.maxAttempts;
    this.initialDelay = config.initialDelay ?? DEFAULT_RETRY_CONFIG.initialDelay;
    this.maxDelay = config.maxDelay ?? DEFAULT_RETRY_CONFIG.maxDelay;
    this.multiplier = config.multiplier ?? DEFAULT_RETRY_CONFIG.multiplier;
    this.jitterFactor = config.jitterFactor ?? DEFAULT_RETRY_CONFIG.jitterFactor;
  }

  /**
   * Execute function with retry logic
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    let retryAfter: number | undefined;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt >= this.maxAttempts) {
          break;
        }

        if (!this.shouldRetry(error)) {
          throw error;
        }

        // Extract Retry-After from RateLimitError
        if (error instanceof RateLimitError && error.retryAfter) {
          retryAfter = error.retryAfter;
        }

        const delay = retryAfter ?? this.calculateDelay(attempt);
        await this.sleep(delay);
        retryAfter = undefined;
      }
    }

    throw lastError;
  }

  /**
   * Determine if error should trigger retry
   */
  private shouldRetry(error: unknown): boolean {
    if (error instanceof TimeoutError) {
      return true;
    }

    if (error instanceof NetworkError) {
      return true;
    }

    if (error instanceof RateLimitError) {
      return true;
    }

    if (error instanceof ServerError) {
      return true;
    }

    if (error instanceof AnterosError) {
      return RETRYABLE_STATUS_CODES.has(error.status);
    }

    return false;
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.initialDelay * Math.pow(this.multiplier, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, this.maxDelay);
    
    // Add random jitter (±jitterFactor)
    const jitterRange = cappedDelay * this.jitterFactor;
    const jitter = (Math.random() * 2 - 1) * jitterRange;
    
    return Math.max(0, cappedDelay + jitter);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
