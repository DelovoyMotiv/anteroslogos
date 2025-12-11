/**
 * Structured Logging Module
 * 
 * Implements structured JSON logging with:
 * - Correlation ID propagation
 * - Sensitive data masking
 * - Multiple log levels
 * - Production-ready configuration
 * 
 * **Feature: production-audit-improvements, Property 39: Structured JSON Logging**
 * **Feature: production-audit-improvements, Property 40: Correlation ID Propagation**
 * **Feature: production-audit-improvements, Property 41: No PII in Logs**
 * **Validates: Requirements 8.1**
 */

import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';

// Async local storage for correlation ID
const correlationIdStorage = new AsyncLocalStorage<string>();

// Sensitive data patterns to mask
const SENSITIVE_PATTERNS = [
  // API keys and tokens (more flexible pattern)
  /api[_\s-]?key[s]?["\s:=]+([a-zA-Z0-9_-]{10,})/gi,
  /bearer\s+([a-zA-Z0-9_.]{20,})/gi,
  /token["\s:=]+([a-zA-Z0-9_.]{10,})/gi,
  
  // Passwords (match "password: value" or "password=value" or "password is value")
  /password[\s:=]+(?:is\s+)?([^\s"',}]+)/gi,
  /passwd["\s:=]+([^\s"',}]+)/gi,
  /pwd["\s:=]+([^\s"',}]+)/gi,
  
  // Email addresses
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
  
  // Credit card numbers (flexible pattern for various formats)
  /\b\d{4}[\s-]?\d{3,4}[\s-]?\d{3,4}[\s-]?\d{4}\b/g,
  
  // SSN (US)
  /\b\d{3}-\d{2}-\d{4}\b/g,
  
  // Phone numbers
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  
  // IP addresses (sometimes PII)
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  
  // JWT tokens
  /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
];

// PII field names to mask
const PII_FIELDS = new Set([
  'password',
  'passwd',
  'pwd',
  'secret',
  'apiKey',
  'api_key',
  'token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'authorization',
  'cookie',
  'email',
  'phone',
  'ssn',
  'creditCard',
  'credit_card',
  'cardNumber',
  'card_number',
  'cvv',
  'pin',
  'address',
  'ipAddress',
  'ip_address',
  'ip',
]);

/**
 * Mask sensitive data in strings
 */
function maskSensitiveString(str: string): string {
  let masked = str;
  
  for (const pattern of SENSITIVE_PATTERNS) {
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;
    
    masked = masked.replace(pattern, (match, ...args) => {
      // args contains captured groups, offset, and full string
      const capturedGroups = args.slice(0, -2).filter(g => g !== undefined);
      
      if (capturedGroups.length > 0) {
        // Mask the captured group(s)
        let result = match;
        for (const group of capturedGroups) {
          const maskLength = Math.min(group.length, 8);
          result = result.replace(group, '*'.repeat(maskLength));
        }
        return result;
      }
      
      // Mask the entire match
      return '*'.repeat(Math.min(match.length, 8));
    });
  }
  
  return masked;
}

import type { JSONValue, JSONObject } from '../../types/common.types';
import { isJSONValue, toJSONValue as convertToJSONValue } from '../utils/typeGuards';

/**
 * Recursively mask sensitive data in objects
 */
function maskSensitiveData(obj: unknown): JSONValue {
  if (obj === null) {
    return null;
  }
  
  if (obj === undefined) {
    return null;
  }
  
  if (typeof obj === 'string') {
    return maskSensitiveString(obj);
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (typeof obj !== 'object') {
    // For non-JSON types, convert to string
    return String(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => maskSensitiveData(item));
  }
  
  const masked: Record<string, JSONValue> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Check if field name indicates PII
    if (PII_FIELDS.has(key) || PII_FIELDS.has(lowerKey)) {
      masked[key] = '***MASKED***';
    } else if (typeof value === 'string') {
      masked[key] = maskSensitiveString(value);
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value);
    } else if (value === undefined) {
      masked[key] = null;
    } else {
      masked[key] = maskSensitiveData(value);
    }
  }
  
  return masked;
}

/**
 * Custom serializer that masks sensitive data
 * @internal - Reserved for future use
 * 
 * Commented out to avoid unused variable warning.
 * Uncomment when custom serialization is needed.
 */
// const sensitiveDataSerializer = (obj: unknown): JSONValue => {
//   return maskSensitiveData(obj) as JSONValue;
// };

/**
 * Create logger instance with configuration
 */
function createLogger() {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  const baseConfig: pino.LoggerOptions = {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    
    // Add correlation ID to every log
    mixin() {
      const correlationId = correlationIdStorage.getStore();
      return correlationId ? { correlationId } : {};
    },
    
    // Serialize errors properly
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
      req: (req: unknown) => {
        // Mask sensitive data in request
        const reqObj = req as Record<string, unknown>;
        const masked = maskSensitiveData({
          id: reqObj.id,
          method: reqObj.method,
          url: reqObj.url,
          headers: reqObj.headers,
          remoteAddress: reqObj.remoteAddress,
          remotePort: reqObj.remotePort,
        });
        // Ensure return value is JSONValue compatible
        return isJSONValue(masked) ? masked : convertToJSONValue(masked);
      },
      res: (res: unknown) => {
        const resObj = res as Record<string, unknown>;
        const result = {
          statusCode: resObj.statusCode,
          headers: resObj.headers,
        };
        return isJSONValue(result) ? result : convertToJSONValue(result);
      },
    },
    
    // Redact sensitive fields
    redact: {
      paths: [
        'password',
        'passwd',
        'pwd',
        'secret',
        'apiKey',
        'api_key',
        'token',
        'accessToken',
        'access_token',
        'refreshToken',
        'refresh_token',
        'authorization',
        'cookie',
        '*.password',
        '*.passwd',
        '*.pwd',
        '*.secret',
        '*.apiKey',
        '*.api_key',
        '*.token',
        '*.accessToken',
        '*.access_token',
        '*.refreshToken',
        '*.refresh_token',
        '*.authorization',
        '*.cookie',
      ],
      censor: '***REDACTED***',
    },
  };
  
  // In development, use pretty printing
  if (isDevelopment) {
    return pino({
      ...baseConfig,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    });
  }
  
  // In production, use JSON format
  return pino(baseConfig);
}

// Create singleton logger instance
export const logger = createLogger();

/**
 * Generate a correlation ID
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Get current correlation ID from context
 */
export function getCorrelationId(): string | undefined {
  return correlationIdStorage.getStore();
}

/**
 * Run a function with a correlation ID context
 */
export function withCorrelationId<T>(
  correlationId: string,
  fn: () => T
): T {
  return correlationIdStorage.run(correlationId, fn);
}

/**
 * Run an async function with a correlation ID context
 */
export async function withCorrelationIdAsync<T>(
  correlationId: string,
  fn: () => Promise<T>
): Promise<T> {
  return correlationIdStorage.run(correlationId, fn);
}

/**
 * Create a child logger with additional context
 */
export function createChildLogger(context: JSONObject) {
  const masked = maskSensitiveData(context);
  // Ensure the masked data is JSONValue compatible before passing to pino
  const safeContext = isJSONValue(masked) ? masked : convertToJSONValue(masked);
  return logger.child(safeContext as any);
}

/**
 * Log levels
 */
export const LogLevel = {
  TRACE: 'trace',
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal',
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

/**
 * Structured log entry
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  correlationId?: string;
  timestamp?: string;
  [key: string]: JSONValue | undefined;
}

/**
 * Export mask function for testing
 */
export { maskSensitiveData, maskSensitiveString };
