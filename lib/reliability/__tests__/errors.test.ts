/**
 * Tests for Custom Error Classes
 * 
 * **Feature: production-audit-improvements, Property 21: Typed Error Handling**
 * **Validates: Requirements 5.4**
 */

import { describe, it, expect } from 'vitest';
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
  CircuitBreakerError,
  TimeoutError,
  isRetryableError,
  getCorrelationId,
} from '../errors';

describe('Custom Error Classes', () => {
  describe('ApplicationError', () => {
    it('should create error with all properties', () => {
      const error = new ApplicationError(
        'Test error',
        'TEST_ERROR',
        500,
        'corr-123',
        { key: 'value' }
      );
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.correlationId).toBe('corr-123');
      expect(error.metadata).toEqual({ key: 'value' });
      expect(error.timestamp).toBeInstanceOf(Date);
    });
    
    it('should generate correlation ID if not provided', () => {
      const error = new ApplicationError('Test', 'TEST', 500);
      expect(error.correlationId).toBeTruthy();
      expect(error.correlationId).toMatch(/^[0-9a-f-]{36}$/);
    });
    
    it('should convert to JSON', () => {
      const error = new ApplicationError('Test', 'TEST', 500, 'corr-123');
      const json = error.toJSON();
      
      expect(json.name).toBe('ApplicationError');
      expect(json.message).toBe('Test');
      expect(json.code).toBe('TEST');
      expect(json.statusCode).toBe(500);
      expect(json.correlationId).toBe('corr-123');
      expect(json.stack).toBeTruthy();
    });
    
    it('should convert to API response without stack', () => {
      const error = new ApplicationError('Test', 'TEST', 500, 'corr-123', { detail: 'info' });
      const response = error.toAPIResponse();
      
      expect(response.error).toBe('ApplicationError');
      expect(response.message).toBe('Test');
      expect(response.code).toBe('TEST');
      expect(response.correlationId).toBe('corr-123');
      expect(response.details).toEqual({ detail: 'info' });
      expect(response).not.toHaveProperty('stack');
    });
  });
  
  describe('SecurityError', () => {
    it('should create security error with 403 status', () => {
      const error = new SecurityError('Access denied');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('SECURITY_ERROR');
    });
  });
  
  describe('AuthenticationError', () => {
    it('should create authentication error with 401 status', () => {
      const error = new AuthenticationError('Invalid credentials');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
    });
  });
  
  describe('AuthorizationError', () => {
    it('should create authorization error with 403 status', () => {
      const error = new AuthorizationError('Insufficient permissions');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('AUTHORIZATION_ERROR');
    });
  });
  
  describe('ValidationError', () => {
    it('should create validation error with 400 status', () => {
      const error = new ValidationError('Invalid input', undefined, { field: 'email' });
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.errors).toEqual({ field: 'email' });
    });
  });
  
  describe('DatabaseError', () => {
    it('should create database error with original error', () => {
      const originalError = new Error('Connection failed');
      const error = new DatabaseError('DB error', undefined, originalError);
      
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.originalError).toBe(originalError);
      expect(error.metadata?.originalError).toBe('Connection failed');
    });
  });
  
  describe('ExternalServiceError', () => {
    it('should create external service error with retryable flag', () => {
      const error = new ExternalServiceError('API failed', undefined, 'stripe', true);
      
      expect(error.statusCode).toBe(502);
      expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
      expect(error.service).toBe('stripe');
      expect(error.retryable).toBe(true);
    });
  });
  
  describe('NetworkError', () => {
    it('should create network error with retryable flag', () => {
      const error = new NetworkError('Timeout', undefined, true);
      
      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.retryable).toBe(true);
    });
  });
  
  describe('RateLimitError', () => {
    it('should create rate limit error with retry after', () => {
      const error = new RateLimitError('Too many requests', undefined, 60);
      
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_ERROR');
      expect(error.retryAfter).toBe(60);
    });
  });
  
  describe('NotFoundError', () => {
    it('should create not found error with resource', () => {
      const error = new NotFoundError('User not found', undefined, 'user');
      
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.resource).toBe('user');
    });
  });
  
  describe('ConflictError', () => {
    it('should create conflict error', () => {
      const error = new ConflictError('Resource already exists');
      
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });
  });
  
  describe('CircuitBreakerError', () => {
    it('should create circuit breaker error', () => {
      const error = new CircuitBreakerError('Circuit open', undefined, 'api');
      
      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('CIRCUIT_BREAKER_OPEN');
      expect(error.service).toBe('api');
    });
  });
  
  describe('TimeoutError', () => {
    it('should create timeout error', () => {
      const error = new TimeoutError('Operation timed out', undefined, 5000);
      
      expect(error.statusCode).toBe(504);
      expect(error.code).toBe('TIMEOUT');
      expect(error.timeoutMs).toBe(5000);
    });
  });
  
  describe('isRetryableError', () => {
    it('should identify retryable external service errors', () => {
      const error = new ExternalServiceError('API failed', undefined, 'api', true);
      expect(isRetryableError(error)).toBe(true);
    });
    
    it('should identify non-retryable external service errors', () => {
      const error = new ExternalServiceError('API failed', undefined, 'api', false);
      expect(isRetryableError(error)).toBe(false);
    });
    
    it('should identify retryable network errors', () => {
      const error = new NetworkError('Timeout', undefined, true);
      expect(isRetryableError(error)).toBe(true);
    });
    
    it('should identify retryable timeout errors', () => {
      const error = new TimeoutError('Timeout');
      expect(isRetryableError(error)).toBe(true);
    });
    
    it('should identify retryable database errors', () => {
      const error = new DatabaseError('Connection timeout');
      expect(isRetryableError(error)).toBe(true);
    });
    
    it('should identify non-retryable validation errors', () => {
      const error = new ValidationError('Invalid input');
      expect(isRetryableError(error)).toBe(false);
    });
    
    it('should identify retryable error codes', () => {
      const error = new Error('ECONNRESET');
      expect(isRetryableError(error)).toBe(true);
    });
  });
  
  describe('getCorrelationId', () => {
    it('should extract correlation ID from ApplicationError', () => {
      const error = new ApplicationError('Test', 'TEST', 500, 'corr-123');
      expect(getCorrelationId(error)).toBe('corr-123');
    });
    
    it('should generate new correlation ID for non-ApplicationError', () => {
      const error = new Error('Test');
      const correlationId = getCorrelationId(error);
      expect(correlationId).toMatch(/^[0-9a-f-]{36}$/);
    });
  });
});
