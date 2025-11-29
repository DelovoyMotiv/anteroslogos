/**
 * SDK version for User-Agent header
 */
export const SDK_VERSION = '1.0.0';

/**
 * Default API base URL
 */
export const DEFAULT_BASE_URL = 'https://anoteroslogos.com';

/**
 * Default timeout for HTTP requests in milliseconds
 */
export const DEFAULT_TIMEOUT = 60000;

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 60000,
  multiplier: 2,
  jitterFactor: 0.25,
} as const;

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_CONFIG = {
  failureThreshold: 5,
  timeout: 60000,
} as const;

/**
 * Idempotency cache TTL in milliseconds
 */
export const IDEMPOTENCY_TTL = 300000; // 5 minutes

/**
 * HTTP status codes that should trigger retry
 */
export const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

/**
 * Environment variable for API key
 */
export const API_KEY_ENV_VAR = 'ANTEROS_API_KEY';
