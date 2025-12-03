/**
 * Custom Error Classes for Production-Ready Error Handling
 * 
 * Features:
 * - Typed error hierarchy
 * - Correlation ID tracking
 * - Structured metadata
 * - HTTP status code mapping
 * 
 * **Feature: production-audit-improvements, Property 21: Typed Error Handling**
 * **Validates: Requirements 5.4**
 * 
 * @module lib/reliability/errors
 */

import { randomUUID } from 'crypto';

/**
 * Base application error class with correlation ID and metadata
 */
export class ApplicationError extends Error {
  public readonly correlationId: string;
  public readonly timestamp: Date;

  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    correlationId?: string,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.correlationId = correlationId || randomUUID();
    this.timestamp = new Date();
    
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON for logging/API responses
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      correlationId: this.correlationId,
      timestamp: this.timestamp.toISOString(),
      metadata: this.metadata,
      stack: this.stack,
    };
  }

  /**
   * Get safe error response for API (without stack trace)
   */
  toAPIResponse(): Record<string, unknown> {
    return {
      error: this.name,
      message: this.message,
      code: this.code,
      correlationId: this.correlationId,
      ...(this.metadata && { details: this.metadata }),
    };
  }
}

/**
 * Security-related errors (authentication, authorization, CSRF, etc.)
 */
export class SecurityError extends ApplicationError {
  constructor(
    message: string,
    correlationId?: string,
    metadata?: Record<string, unknown>
  ) {
    super(message, 'SECURITY_ERROR', 403, correlationId, metadata);
  }
}

/**
 * Authentication errors (invalid credentials, expired tokens, etc.)
 */
export class AuthenticationError extends ApplicationError {
  constructor(
    message: string,
    correlationId?: string,
    metadata?: Record<string, unknown>
  ) {
    super(message, 'AUTHENTICATION_ERROR', 401, correlationId, metadata);
  }
}

/**
 * Authorization errors (insufficient permissions)
 */
export class AuthorizationError extends ApplicationError {
  constructor(
    message: string,
    correlationId?: string,
    metadata?: Record<string, unknown>
  ) {
    super(message, 'AUTHORIZATION_ERROR', 403, correlationId, metadata);
  }
}

/**
 * Input validation errors (Zod validation failures, invalid parameters)
 */
export class ValidationError extends ApplicationError {
  constructor(
    message: string,
    correlationId?: string,
    public readonly errors?: unknown
  ) {
    super(
      message,
      'VALIDATION_ERROR',
      400,
      correlationId,
      errors ? { validationErrors: errors } : undefined
    );
  }
}

/**
 * Database operation errors (connection failures, query errors, constraint violations)
 */
export class DatabaseError extends ApplicationError {
  constructor(
    message: string,
    correlationId?: string,
    public readonly originalError?: Error
  ) {
    super(
      message,
      'DATABASE_ERROR',
      500,
      correlationId,
      originalError ? { originalError: originalError.message } : undefined
    );
  }
}

/**
 * External service errors (API calls, webhooks, third-party integrations)
 */
export class ExternalServiceError extends ApplicationError {
  constructor(
    message: string,
    correlationId?: string,
    public readonly service?: string,
    public readonly retryable: boolean = true
  ) {
    super(
      message,
      'EXTERNAL_SERVICE_ERROR',
      502,
      correlationId,
      { service, retryable }
    );
  }
}

/**
 * Network-related errors (timeouts, connection refused, DNS failures)
 */
export class NetworkError extends ApplicationError {
  constructor(
    message: string,
    correlationId?: string,
    public readonly retryable: boolean = true,
    metadata?: Record<string, unknown>
  ) {
    super(
      message,
      'NETWORK_ERROR',
      503,
      correlationId,
      { retryable, ...metadata }
    );
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends ApplicationError {
  constructor(
    message: string,
    correlationId?: string,
    public readonly retryAfter?: number
  ) {
    super(
      message,
      'RATE_LIMIT_ERROR',
      429,
      correlationId,
      retryAfter ? { retryAfter } : undefined
    );
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends ApplicationError {
  constructor(
    message: string,
    correlationId?: string,
    public readonly resource?: string
  ) {
    super(
      message,
      'NOT_FOUND',
      404,
      correlationId,
      resource ? { resource } : undefined
    );
  }
}

/**
 * Conflict errors (duplicate resources, concurrent modifications)
 */
export class ConflictError extends ApplicationError {
  constructor(
    message: string,
    correlationId?: string,
    metadata?: Record<string, unknown>
  ) {
    super(message, 'CONFLICT', 409, correlationId, metadata);
  }
}

/**
 * Circuit breaker open errors
 */
export class CircuitBreakerError extends ApplicationError {
  constructor(
    message: string,
    correlationId?: string,
    public readonly service?: string
  ) {
    super(
      message,
      'CIRCUIT_BREAKER_OPEN',
      503,
      correlationId,
      { service }
    );
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends ApplicationError {
  constructor(
    message: string,
    correlationId?: string,
    public readonly timeoutMs?: number
  ) {
    super(
      message,
      'TIMEOUT',
      504,
      correlationId,
      timeoutMs ? { timeoutMs } : undefined
    );
  }
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof ExternalServiceError) {
    return error.retryable;
  }
  
  if (error instanceof NetworkError) {
    return error.retryable;
  }
  
  if (error instanceof TimeoutError) {
    return true;
  }
  
  if (error instanceof DatabaseError) {
    // Some database errors are retryable (connection issues, deadlocks)
    const message = error.message.toLowerCase();
    return (
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('deadlock') ||
      message.includes('lock wait timeout')
    );
  }
  
  // Check for common retryable error codes
  if (error instanceof Error) {
    const message = error.message;
    const retryableCodes = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNREFUSED',
      'EPIPE',
      'EHOSTUNREACH',
    ];
    
    return retryableCodes.some(code => message.includes(code));
  }
  
  return false;
}

/**
 * Extract correlation ID from error or generate new one
 */
export function getCorrelationId(error: unknown): string {
  if (error instanceof ApplicationError) {
    return error.correlationId;
  }
  return randomUUID();
}
