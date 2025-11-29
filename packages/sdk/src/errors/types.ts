import { AnterosError } from './base.js';

/**
 * Validation error for invalid request parameters
 */
export class ValidationError extends AnterosError {
  constructor(message: string, public readonly errors: unknown[]) {
    super(message, 400, 'VALIDATION_ERROR', { errors });
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error for invalid or missing API key
 */
export class AuthenticationError extends AnterosError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

/**
 * Payment required error (HTTP 402)
 */
export class PaymentRequiredError extends AnterosError {
  constructor(
    message: string = 'Payment required',
    public readonly invoice?: {
      invoiceId: string;
      amount: number;
      recipientAddress: string;
      memoHash: string;
      expiresAt: string;
    }
  ) {
    super(message, 402, 'PAYMENT_REQUIRED', invoice);
    this.name = 'PaymentRequiredError';
  }
}

/**
 * Authorization error for insufficient permissions
 */
export class AuthorizationError extends AnterosError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

/**
 * Resource not found error
 */
export class NotFoundError extends AnterosError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends AnterosError {
  constructor(
    message: string = 'Rate limit exceeded',
    public readonly retryAfter?: number
  ) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', { retryAfter });
    this.name = 'RateLimitError';
  }
}

/**
 * Server error (5xx)
 */
export class ServerError extends AnterosError {
  constructor(message: string = 'Internal server error', status: number = 500) {
    super(message, status, 'SERVER_ERROR');
    this.name = 'ServerError';
  }
}

/**
 * Request timeout error
 */
export class TimeoutError extends AnterosError {
  constructor(message: string = 'Request timeout', public readonly timeoutMs: number) {
    super(message, 408, 'TIMEOUT', { timeoutMs });
    this.name = 'TimeoutError';
  }
}

/**
 * Network error (connection failed, DNS resolution, etc.)
 */
export class NetworkError extends AnterosError {
  public override readonly cause?: Error;

  constructor(message: string = 'Network error', cause?: Error) {
    super(message, 0, 'NETWORK_ERROR', { cause: cause?.message });
    this.name = 'NetworkError';
    if (cause) {
      this.cause = cause;
    }
  }
}

/**
 * Circuit breaker open error
 */
export class CircuitOpenError extends AnterosError {
  constructor(message: string = 'Circuit breaker open', public readonly retryAfterMs: number) {
    super(message, 503, 'CIRCUIT_OPEN', { retryAfterMs });
    this.name = 'CircuitOpenError';
  }
}

/**
 * Parse HTTP response error into typed error class
 */
export function parseError(status: number, body: unknown, headers?: Headers): AnterosError {
  const errorBody = typeof body === 'object' && body !== null ? body : {};
  const message =
    (errorBody as { message?: string }).message ||
    (errorBody as { error?: string }).error ||
    `HTTP ${status} error`;

  switch (status) {
    case 400: {
      const errors = (errorBody as { errors?: unknown[] }).errors || [];
      return new ValidationError(message, errors);
    }
    case 401:
      return new AuthenticationError(message);
    case 402: {
      const invoice = (errorBody as { invoice?: unknown }).invoice;
      return new PaymentRequiredError(
        message,
        invoice && typeof invoice === 'object'
          ? (invoice as PaymentRequiredError['invoice'])
          : undefined
      );
    }
    case 403:
      return new AuthorizationError(message);
    case 404:
      return new NotFoundError(message);
    case 429: {
      const retryAfter = headers?.get('retry-after');
      const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
      return new RateLimitError(
        message,
        retryAfterSeconds ? retryAfterSeconds * 1000 : undefined
      );
    }
    case 408:
      return new TimeoutError(message, 60000);
    default:
      if (status >= 500) {
        return new ServerError(message, status);
      }
      return new AnterosError(message, status, 'UNKNOWN_ERROR', errorBody);
  }
}
