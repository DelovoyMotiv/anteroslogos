/**
 * Error handling utilities for Agent Middleware
 * Provides error codes, messages, and response builders
 */

import type { ErrorResponse } from '../../types/agent-middleware.types';
import { ErrorCode } from '../../types/agent-middleware.types';

/**
 * HTTP status codes for different error types
 */
export const ERROR_STATUS_CODES: Record<ErrorCode, number> = {
  [ErrorCode.ERR_URL_UNREACHABLE]: 422,
  [ErrorCode.ERR_BOT_BLOCKED]: 422,
  [ErrorCode.ERR_DOM_UNREADABLE]: 422,
  [ErrorCode.ERR_TIMEOUT]: 422,
  [ErrorCode.ERR_CSR_TIMEOUT]: 422,
  [ErrorCode.ERR_WAF_BLOCK]: 422,
  [ErrorCode.ERR_SCHEMA_NESTED]: 422,
  [ErrorCode.ERR_REDIRECT_LOOP]: 422,
  [ErrorCode.ERR_INVALID_URL]: 400,
  [ErrorCode.ERR_AUTH_MISSING]: 401,
  [ErrorCode.ERR_AUTH_INVALID]: 401,
  [ErrorCode.ERR_QUOTA_EXCEEDED]: 402,
  [ErrorCode.ERR_RATE_LIMIT]: 429,
  [ErrorCode.ERR_INTERNAL]: 500,
};

/**
 * Default error messages for each error code
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.ERR_URL_UNREACHABLE]: 'The target URL cannot be reached',
  [ErrorCode.ERR_BOT_BLOCKED]: 'The target site blocks bot access',
  [ErrorCode.ERR_DOM_UNREADABLE]: 'The HTML content could not be parsed',
  [ErrorCode.ERR_TIMEOUT]: 'The extraction request timed out',
  [ErrorCode.ERR_CSR_TIMEOUT]: 'JavaScript execution timed out',
  [ErrorCode.ERR_WAF_BLOCK]: 'Request blocked by Web Application Firewall or CAPTCHA',
  [ErrorCode.ERR_SCHEMA_NESTED]: 'Failed to parse nested JSON-LD schema',
  [ErrorCode.ERR_REDIRECT_LOOP]: 'Detected circular redirect chain',
  [ErrorCode.ERR_INVALID_URL]: 'The provided URL is invalid',
  [ErrorCode.ERR_AUTH_MISSING]: 'Authorization header is missing',
  [ErrorCode.ERR_AUTH_INVALID]: 'The provided Bearer token is invalid',
  [ErrorCode.ERR_QUOTA_EXCEEDED]: 'API key quota has been exceeded',
  [ErrorCode.ERR_RATE_LIMIT]: 'Rate limit exceeded',
  [ErrorCode.ERR_INTERNAL]: 'An internal server error occurred',
};

/**
 * Recovery actions for each error code
 */
export const ERROR_RECOVERY_ACTIONS: Record<ErrorCode, string> = {
  [ErrorCode.ERR_URL_UNREACHABLE]: 'Verify the URL is correct and accessible',
  [ErrorCode.ERR_BOT_BLOCKED]: 'Contact the site owner or use an alternative method',
  [ErrorCode.ERR_DOM_UNREADABLE]: 'Check if the URL returns valid HTML',
  [ErrorCode.ERR_TIMEOUT]: 'Retry with a longer timeout or use fast mode',
  [ErrorCode.ERR_CSR_TIMEOUT]: 'The site may be too slow or complex, try with a longer timeout',
  [ErrorCode.ERR_WAF_BLOCK]: 'The site has advanced bot protection, manual access may be required',
  [ErrorCode.ERR_SCHEMA_NESTED]: 'The JSON-LD structure is too complex or malformed',
  [ErrorCode.ERR_REDIRECT_LOOP]: 'The URL has a circular redirect, check the site configuration',
  [ErrorCode.ERR_INVALID_URL]: 'Provide a valid HTTP or HTTPS URL',
  [ErrorCode.ERR_AUTH_MISSING]: 'Include a Bearer token in the Authorization header',
  [ErrorCode.ERR_AUTH_INVALID]: 'Verify your API key is correct and active',
  [ErrorCode.ERR_QUOTA_EXCEEDED]: 'Upgrade your plan or wait for quota reset',
  [ErrorCode.ERR_RATE_LIMIT]: 'Wait for the rate limit window to reset',
  [ErrorCode.ERR_INTERNAL]: 'Retry the request or contact support',
};

/**
 * Creates a standardized error response
 * 
 * @param code - Error code
 * @param message - Optional custom error message
 * @param details - Optional additional error details
 * @returns ErrorResponse object
 */
export function createErrorResponse(
  code: ErrorCode,
  message?: string,
  details?: Record<string, unknown>
): ErrorResponse {
  return {
    error: {
      code,
      message: message || ERROR_MESSAGES[code],
      details: {
        timestamp: new Date().toISOString(),
        ...details,
      },
    },
  };
}

/**
 * Gets the HTTP status code for an error code
 * 
 * @param code - Error code
 * @returns HTTP status code
 */
export function getStatusCode(code: ErrorCode): number {
  return ERROR_STATUS_CODES[code];
}

/**
 * Gets the recovery action for an error code
 * 
 * @param code - Error code
 * @returns Recovery action string
 */
export function getRecoveryAction(code: ErrorCode): string {
  return ERROR_RECOVERY_ACTIONS[code];
}

/**
 * Custom error class for agent middleware errors
 */
export class AgentMiddlewareError extends Error {
  constructor(
    public code: ErrorCode,
    message?: string,
    public details?: Record<string, unknown>
  ) {
    super(message || ERROR_MESSAGES[code]);
    this.name = 'AgentMiddlewareError';
  }

  /**
   * Converts the error to an ErrorResponse
   */
  toResponse(): ErrorResponse {
    return createErrorResponse(this.code, this.message, this.details);
  }

  /**
   * Gets the HTTP status code for this error
   */
  getStatusCode(): number {
    return getStatusCode(this.code);
  }

  /**
   * Gets the recovery action for this error
   */
  getRecoveryAction(): string {
    return getRecoveryAction(this.code);
  }
}

/**
 * Type guard to check if an error is an AgentMiddlewareError
 */
export function isAgentMiddlewareError(error: unknown): error is AgentMiddlewareError {
  return error instanceof AgentMiddlewareError;
}

/**
 * Retry strategy configuration
 */
export interface RetryStrategy {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  shouldRetry: (error: Error, attempt: number) => boolean;
}

/**
 * Retry context for tracking retry attempts
 */
export interface RetryContext {
  url?: string;
  timestamp: string;
  attempts: number;
  errors: Array<{
    attempt: number;
    error: string;
    code?: ErrorCode;
    timestamp: string;
  }>;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG = {
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'],
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
};

/**
 * ErrorHandler class with retry logic and exponential backoff
 */
export class ErrorHandler {
  private logger?: (message: string, context?: Record<string, unknown>) => void;

  constructor(logger?: (message: string, context?: Record<string, unknown>) => void) {
    this.logger = logger;
  }

  /**
   * Executes a function with retry logic and exponential backoff
   * 
   * @param fn - Function to execute
   * @param strategy - Retry strategy configuration
   * @param context - Optional context for error tracking
   * @returns Result of the function
   * @throws AgentMiddlewareError after all retries exhausted
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    strategy: RetryStrategy,
    context?: { url?: string }
  ): Promise<T> {
    const retryContext: RetryContext = {
      url: context?.url,
      timestamp: new Date().toISOString(),
      attempts: 0,
      errors: [],
    };

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < strategy.maxAttempts; attempt++) {
      retryContext.attempts = attempt + 1;

      try {
        const result = await fn();
        
        // Log successful retry if not first attempt
        if (attempt > 0) {
          this.log('Retry succeeded', {
            attempt: attempt + 1,
            totalAttempts: strategy.maxAttempts,
            url: context?.url,
          });
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Record error in context
        retryContext.errors.push({
          attempt: attempt + 1,
          error: lastError.message,
          code: isAgentMiddlewareError(lastError) ? lastError.code : undefined,
          timestamp: new Date().toISOString(),
        });

        // Check if we should retry
        if (!strategy.shouldRetry(lastError, attempt)) {
          this.log('Error not retryable', {
            error: lastError.message,
            attempt: attempt + 1,
            url: context?.url,
          });
          throw this.wrapError(lastError, retryContext);
        }

        // Don't delay after last attempt
        if (attempt < strategy.maxAttempts - 1) {
          const delay = this.calculateDelay(attempt, strategy.baseDelay, strategy.maxDelay);
          
          this.log('Retrying after delay', {
            attempt: attempt + 1,
            delay,
            maxAttempts: strategy.maxAttempts,
            url: context?.url,
          });
          
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    this.log('All retries exhausted', {
      attempts: retryContext.attempts,
      url: context?.url,
      errors: retryContext.errors,
    });

    throw this.wrapError(lastError!, retryContext);
  }

  /**
   * Calculates exponential backoff delay
   * 
   * @param attempt - Current attempt number (0-indexed)
   * @param baseDelay - Base delay in milliseconds
   * @param maxDelay - Maximum delay in milliseconds
   * @returns Delay in milliseconds
   */
  private calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    return Math.min(exponentialDelay, maxDelay);
  }

  /**
   * Sleeps for specified milliseconds
   * 
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wraps an error with retry context
   * 
   * @param error - Original error
   * @param retryContext - Retry context
   * @returns AgentMiddlewareError with context
   */
  private wrapError(error: Error, retryContext: RetryContext): AgentMiddlewareError {
    if (isAgentMiddlewareError(error)) {
      // Add retry context to existing AgentMiddlewareError
      return new AgentMiddlewareError(
        error.code,
        error.message,
        {
          ...error.details,
          retryContext,
        }
      );
    }

    // Wrap generic error
    return new AgentMiddlewareError(
      ErrorCode.ERR_INTERNAL,
      error.message,
      {
        originalError: error.name,
        retryContext,
      }
    );
  }

  /**
   * Logs a message with optional context
   * 
   * @param message - Log message
   * @param context - Optional context
   */
  private log(message: string, context?: Record<string, unknown>): void {
    if (this.logger) {
      this.logger(message, context);
    }
  }

  /**
   * Creates a retry strategy for HTTP timeout errors (408)
   * 
   * @param maxAttempts - Maximum retry attempts (default: 3)
   * @returns RetryStrategy
   */
  static createTimeoutRetryStrategy(maxAttempts: number = 3): RetryStrategy {
    return {
      maxAttempts,
      baseDelay: 1000,
      maxDelay: 10000,
      shouldRetry: (error: Error) => {
        if (isAgentMiddlewareError(error)) {
          return error.code === ErrorCode.ERR_TIMEOUT || 
                 error.code === ErrorCode.ERR_CSR_TIMEOUT;
        }
        return error.name === 'AbortError' || error.message.includes('timeout');
      },
    };
  }

  /**
   * Creates a retry strategy for rate limit errors (429)
   * 
   * @param maxAttempts - Maximum retry attempts (default: 3)
   * @returns RetryStrategy
   */
  static createRateLimitRetryStrategy(maxAttempts: number = 3): RetryStrategy {
    return {
      maxAttempts,
      baseDelay: 1000,
      maxDelay: 10000,
      shouldRetry: (error: Error) => {
        if (isAgentMiddlewareError(error)) {
          return error.code === ErrorCode.ERR_RATE_LIMIT;
        }
        return false;
      },
    };
  }

  /**
   * Creates a retry strategy for server errors (5xx)
   * 
   * @param maxAttempts - Maximum retry attempts (default: 3)
   * @returns RetryStrategy
   */
  static createServerErrorRetryStrategy(maxAttempts: number = 3): RetryStrategy {
    return {
      maxAttempts,
      baseDelay: 1000,
      maxDelay: 10000,
      shouldRetry: (error: Error, attempt: number) => {
        if (isAgentMiddlewareError(error)) {
          const statusCode = error.getStatusCode();
          return statusCode >= 500 && statusCode < 600;
        }
        return false;
      },
    };
  }

  /**
   * Creates a retry strategy for bot blocking (403)
   * 
   * @param maxAttempts - Maximum retry attempts (default: 3)
   * @returns RetryStrategy
   */
  static createBotBlockRetryStrategy(maxAttempts: number = 3): RetryStrategy {
    return {
      maxAttempts,
      baseDelay: 1000,
      maxDelay: 10000,
      shouldRetry: (error: Error) => {
        if (isAgentMiddlewareError(error)) {
          return error.code === ErrorCode.ERR_BOT_BLOCKED;
        }
        return false;
      },
    };
  }

  /**
   * Creates a general retry strategy for network errors
   * 
   * @param maxAttempts - Maximum retry attempts (default: 3)
   * @returns RetryStrategy
   */
  static createNetworkErrorRetryStrategy(maxAttempts: number = 3): RetryStrategy {
    return {
      maxAttempts,
      baseDelay: 1000,
      maxDelay: 10000,
      shouldRetry: (error: Error) => {
        if (isAgentMiddlewareError(error)) {
          return error.code === ErrorCode.ERR_URL_UNREACHABLE ||
                 error.code === ErrorCode.ERR_TIMEOUT ||
                 error.code === ErrorCode.ERR_BOT_BLOCKED;
        }
        
        // Check for common network error names
        const networkErrors = ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED'];
        return networkErrors.some(errName => error.message.includes(errName));
      },
    };
  }
}
