/**
 * Retry utility with exponential backoff
 * Implements retry logic for transient failures
 * Requirements: 2.1
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown) => boolean;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: unknown;
  attempts: number;
}

/**
 * Determines if an error is a transient network error that should be retried
 */
export function isTransientError(error: unknown): boolean {
  if (!error) return false;

  // Check for network-related errors
  if (error instanceof TypeError) {
    const message = error.message.toLowerCase();
    return (
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('connection')
    );
  }

  // Check for Error objects with network-related messages
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('fetch failed') ||
      message.includes('connection') ||
      message.includes('econnrefused') ||
      message.includes('enotfound')
    );
  }

  // Check for Supabase-specific transient errors
  if (typeof error === 'object' && error !== null) {
    const err = error as { code?: string; message?: string };
    
    // Network-related error codes
    if (err.code) {
      const transientCodes = [
        'PGRST301', // Connection timeout
        '08000', // Connection exception
        '08003', // Connection does not exist
        '08006', // Connection failure
        '57P03', // Cannot connect now
      ];
      if (transientCodes.includes(err.code)) {
        return true;
      }
    }

    // Check message for network issues
    if (err.message) {
      const message = err.message.toLowerCase();
      return (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('connection')
      );
    }
  }

  return false;
}

/**
 * Determines if an error is a validation error that should NOT be retried
 */
export function isValidationError(error: unknown): boolean {
  if (!error) return false;

  if (typeof error === 'object' && error !== null) {
    const err = error as { code?: string; message?: string };
    
    // Database constraint violations - don't retry
    if (err.code) {
      const validationCodes = [
        '23505', // Unique constraint violation
        '23503', // Foreign key violation
        '23502', // Not null violation
        '23514', // Check constraint violation
        '42501', // Insufficient privilege (RLS)
        '42P01', // Undefined table
        '42703', // Undefined column
      ];
      if (validationCodes.includes(err.code)) {
        return true;
      }
    }

    // Check for validation-related messages
    if (err.message) {
      const message = err.message.toLowerCase();
      return (
        message.includes('validation') ||
        message.includes('invalid') ||
        message.includes('constraint') ||
        message.includes('permission denied') ||
        message.includes('not found')
      );
    }
  }

  return false;
}

/**
 * Executes a function with retry logic and exponential backoff
 * 
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns Promise with retry result
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    backoffMultiplier = 2,
    shouldRetry = isTransientError,
  } = options;

  let lastError: unknown;
  let attempts = 0;

  for (let i = 0; i <= maxRetries; i++) {
    attempts = i + 1;

    try {
      const data = await fn();
      return {
        success: true,
        data,
        attempts,
      };
    } catch (error) {
      lastError = error;

      // Don't retry validation errors
      if (isValidationError(error)) {
        console.log(`Validation error detected, skipping retry (attempt ${attempts}/${maxRetries + 1})`);
        return {
          success: false,
          error,
          attempts,
        };
      }

      // Check if we should retry this error
      if (!shouldRetry(error)) {
        console.log(`Non-retryable error detected (attempt ${attempts}/${maxRetries + 1})`);
        return {
          success: false,
          error,
          attempts,
        };
      }

      // If this was the last attempt, don't wait
      if (i === maxRetries) {
        console.log(`Max retries reached (${maxRetries + 1} attempts)`);
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, i),
        maxDelayMs
      );

      console.log(
        `Transient error detected, retrying in ${delay}ms (attempt ${attempts}/${maxRetries + 1})`,
        error instanceof Error ? error.message : error
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: lastError,
    attempts,
  };
}
