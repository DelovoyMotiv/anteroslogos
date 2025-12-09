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
