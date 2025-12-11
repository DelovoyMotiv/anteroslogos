/**
 * Factory Pattern for Error Creation
 * 
 * Centralizes error creation logic and ensures consistent error handling
 * across the application. Provides type-safe error creation with proper
 * correlation IDs and metadata.
 * 
 * @module lib/patterns/ErrorFactory
 */

import {
  ApplicationError,
  SecurityError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  DatabaseError,
  ExternalServiceError,
  NetworkError,
  RateLimitError,
  NotFoundError,
  ConflictError,
} from '../reliability/errors';
import type { ZodError } from 'zod';

/**
 * Error type enumeration for factory
 */
export enum ErrorType {
  SECURITY = 'security',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  DATABASE = 'database',
  EXTERNAL_SERVICE = 'external_service',
  NETWORK = 'network',
  RATE_LIMIT = 'rate_limit',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  GENERIC = 'generic',
}

/**
 * Error creation options
 */
export interface ErrorOptions {
  message: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
  cause?: Error;
}

/**
 * Security error options
 */
export interface SecurityErrorOptions extends ErrorOptions {
  securityContext?: Record<string, unknown>;
}

/**
 * Validation error options
 */
export interface ValidationErrorOptions extends ErrorOptions {
  zodError?: ZodError;
  validationErrors?: Record<string, string[]>;
}

/**
 * Database error options
 */
export interface DatabaseErrorOptions extends ErrorOptions {
  query?: string;
  table?: string;
  operation?: string;
}

/**
 * External service error options
 */
export interface ExternalServiceErrorOptions extends ErrorOptions {
  service: string;
  retryable?: boolean;
  statusCode?: number;
}

/**
 * Network error options
 */
export interface NetworkErrorOptions extends ErrorOptions {
  url?: string;
  method?: string;
  statusCode?: number;
}

/**
 * Rate limit error options
 */
export interface RateLimitErrorOptions extends ErrorOptions {
  limit: number;
  window: number;
  retryAfter?: number;
}

/**
 * Not found error options
 */
export interface NotFoundErrorOptions extends ErrorOptions {
  resource: string;
  identifier?: string;
}

/**
 * Conflict error options
 */
export interface ConflictErrorOptions extends ErrorOptions {
  resource: string;
  conflictType?: string;
}

/**
 * Error Factory
 * 
 * Provides centralized error creation with consistent correlation IDs
 * and metadata handling.
 * 
 * @example
 * ```typescript
 * const factory = new ErrorFactory();
 * 
 * // Create validation error
 * const error = factory.createValidationError({
 *   message: 'Invalid input',
 *   zodError: validationResult.error,
 * });
 * 
 * // Create database error
 * const dbError = factory.createDatabaseError({
 *   message: 'Query failed',
 *   query: 'SELECT * FROM users',
 *   table: 'users',
 * });
 * ```
 */
export class ErrorFactory {
  private correlationIdGenerator: () => string;

  constructor(correlationIdGenerator?: () => string) {
    this.correlationIdGenerator = correlationIdGenerator || this.defaultCorrelationIdGenerator;
  }

  /**
   * Default correlation ID generator
   */
  private defaultCorrelationIdGenerator(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Create error by type
   */
  createError(type: ErrorType, options: ErrorOptions): ApplicationError {
    const correlationId = options.correlationId || this.correlationIdGenerator();

    switch (type) {
      case ErrorType.SECURITY:
        return new SecurityError(options.message, correlationId, options.metadata);
      
      case ErrorType.AUTHENTICATION:
        return new AuthenticationError(options.message, correlationId, options.metadata);
      
      case ErrorType.AUTHORIZATION:
        return new AuthorizationError(options.message, correlationId, options.metadata);
      
      case ErrorType.VALIDATION:
        return new ValidationError(
          options.message,
          correlationId,
          (options as ValidationErrorOptions).zodError
        );
      
      case ErrorType.DATABASE:
        return new DatabaseError(
          options.message,
          correlationId,
          options.cause || new Error(options.message)
        );
      
      case ErrorType.EXTERNAL_SERVICE: {
        const extOptions = options as ExternalServiceErrorOptions;
        return new ExternalServiceError(
          extOptions.message,
          correlationId,
          extOptions.service,
          extOptions.retryable ?? true
        );
      }
      
      case ErrorType.NETWORK: {
        return new NetworkError(
          options.message,
          correlationId,
          true,
          options.metadata
        );
      }
      
      case ErrorType.RATE_LIMIT: {
        const rateLimitOptions = options as RateLimitErrorOptions;
        return new RateLimitError(
          rateLimitOptions.message,
          correlationId,
          rateLimitOptions.retryAfter
        );
      }
      
      case ErrorType.NOT_FOUND: {
        const notFoundOptions = options as NotFoundErrorOptions;
        return new NotFoundError(
          notFoundOptions.message,
          correlationId,
          notFoundOptions.resource
        );
      }
      
      case ErrorType.CONFLICT: {
        const conflictOptions = options as ConflictErrorOptions;
        return new ConflictError(
          conflictOptions.message,
          correlationId,
          { resource: conflictOptions.resource, conflictType: conflictOptions.conflictType, ...conflictOptions.metadata }
        );
      }
      
      case ErrorType.GENERIC:
      default: {
        const genericOptions = typeof options === 'string' ? { message: options } : options;
        return new ApplicationError(
          genericOptions.message,
          'APPLICATION_ERROR',
          500,
          correlationId,
          (genericOptions as any).metadata as Record<string, unknown> | undefined
        );
      }
    }
  }

  /**
   * Create security error
   */
  createSecurityError(options: SecurityErrorOptions): SecurityError {
    const correlationId = options.correlationId || this.correlationIdGenerator();
    return new SecurityError(
      options.message,
      correlationId,
      { ...options.metadata, ...options.securityContext }
    );
  }

  /**
   * Create authentication error
   */
  createAuthenticationError(options: ErrorOptions): AuthenticationError {
    const correlationId = options.correlationId || this.correlationIdGenerator();
    return new AuthenticationError(options.message, correlationId, options.metadata);
  }

  /**
   * Create authorization error
   */
  createAuthorizationError(options: ErrorOptions): AuthorizationError {
    const correlationId = options.correlationId || this.correlationIdGenerator();
    return new AuthorizationError(options.message, correlationId, options.metadata);
  }

  /**
   * Create validation error
   */
  createValidationError(options: ValidationErrorOptions): ValidationError {
    const correlationId = options.correlationId || this.correlationIdGenerator();
    return new ValidationError(
      options.message,
      correlationId,
      options.zodError
    );
  }

  /**
   * Create database error
   */
  createDatabaseError(options: DatabaseErrorOptions): DatabaseError {
    const correlationId = options.correlationId || this.correlationIdGenerator();
    const error = new DatabaseError(
      options.message,
      correlationId,
      options.cause || new Error(options.message)
    );
    
    return error;
  }

  /**
   * Create external service error
   */
  createExternalServiceError(options: ExternalServiceErrorOptions): ExternalServiceError {
    const correlationId = options.correlationId || this.correlationIdGenerator();
    return new ExternalServiceError(
      options.message,
      correlationId,
      options.service,
      options.retryable ?? true
    );
  }

  /**
   * Create network error
   */
  createNetworkError(options: NetworkErrorOptions): NetworkError {
    const correlationId = options.correlationId || this.correlationIdGenerator();
    const metadata = {
      ...options.metadata,
      url: options.url,
      method: options.method,
      statusCode: options.statusCode,
    };
    return new NetworkError(
      options.message,
      correlationId,
      true,
      metadata
    );
  }

  /**
   * Create rate limit error
   */
  createRateLimitError(options: RateLimitErrorOptions): RateLimitError {
    const correlationId = options.correlationId || this.correlationIdGenerator();
    return new RateLimitError(
      options.message,
      correlationId,
      options.retryAfter
    );
  }

  /**
   * Create not found error
   */
  createNotFoundError(options: NotFoundErrorOptions): NotFoundError {
    const correlationId = options.correlationId || this.correlationIdGenerator();
    return new NotFoundError(
      options.message,
      correlationId,
      options.resource
    );
  }

  /**
   * Create conflict error
   */
  createConflictError(options: ConflictErrorOptions): ConflictError {
    const correlationId = options.correlationId || this.correlationIdGenerator();
    return new ConflictError(
      options.message,
      correlationId,
      { resource: options.resource, conflictType: options.conflictType, ...options.metadata }
    );
  }

  /**
   * Wrap an unknown error into ApplicationError
   */
  wrapError(error: unknown, context?: Record<string, unknown>): ApplicationError {
    const correlationId = this.correlationIdGenerator();

    if (error instanceof ApplicationError) {
      return error;
    }

    if (error instanceof Error) {
      return new ApplicationError(
        error.message,
        'WRAPPED_ERROR',
        500,
        correlationId,
        { ...context, originalError: error.name, stack: error.stack }
      );
    }

    return new ApplicationError(
      String(error),
      'UNKNOWN_ERROR',
      500,
      correlationId,
      context
    );
  }
}

/**
 * Global error factory instance
 */
export const errorFactory = new ErrorFactory();

/**
 * Create error factory with custom correlation ID generator
 */
export function createErrorFactory(correlationIdGenerator: () => string): ErrorFactory {
  return new ErrorFactory(correlationIdGenerator);
}
