/**
 * Structured Logging Module
 * 
 * Exports:
 * - logger: Main logger instance
 * - Correlation ID utilities
 * - Middleware for Express/Vercel
 * - Sensitive data masking
 */

export {
  logger,
  generateCorrelationId,
  getCorrelationId,
  withCorrelationId,
  withCorrelationIdAsync,
  createChildLogger,
  LogLevel,
  maskSensitiveData,
  maskSensitiveString,
  type LogEntry,
  type LogLevel as LogLevelType,
} from './logger';

export {
  correlationIdMiddleware,
  addCorrelationId,
  getRequestCorrelationId,
  CORRELATION_ID_HEADER,
} from './middleware';
