/**
 * Tests for Error Factory Pattern
 */

import { describe, it, expect } from 'vitest';
import {
  ErrorFactory,
  ErrorType,
  errorFactory,
  createErrorFactory,
} from '../ErrorFactory';
import {
  SecurityError,
  ValidationError,
  DatabaseError,
  ExternalServiceError,
  NotFoundError,
} from '../../reliability/errors';

describe('ErrorFactory', () => {
  describe('createError', () => {
    it('should create security error', () => {
      const factory = new ErrorFactory();
      const error = factory.createError(ErrorType.SECURITY, {
        message: 'Unauthorized access',
      });

      expect(error).toBeInstanceOf(SecurityError);
      expect(error.message).toBe('Unauthorized access');
      expect(error.correlationId).toMatch(/^err_/);
    });

    it('should create validation error', () => {
      const factory = new ErrorFactory();
      const error = factory.createError(ErrorType.VALIDATION, {
        message: 'Invalid input',
      });

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Invalid input');
    });

    it('should create database error', () => {
      const factory = new ErrorFactory();
      const error = factory.createError(ErrorType.DATABASE, {
        message: 'Query failed',
        cause: new Error('Connection timeout'),
      });

      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.message).toBe('Query failed');
    });

    it('should create external service error', () => {
      const factory = new ErrorFactory();
      const error = factory.createExternalServiceError({
        message: 'API call failed',
        service: 'stripe',
        retryable: true,
      });

      expect(error).toBeInstanceOf(ExternalServiceError);
      expect(error.message).toBe('API call failed');
      expect(error.metadata?.service).toBe('stripe');
    });

    it('should create not found error', () => {
      const factory = new ErrorFactory();
      const error = factory.createNotFoundError({
        message: 'User not found',
        resource: 'user',
        identifier: '123',
      });

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe('User not found');
    });
  });

  describe('custom correlation ID generator', () => {
    it('should use custom correlation ID generator', () => {
      let counter = 0;
      const factory = createErrorFactory(() => `custom_${++counter}`);

      const error1 = factory.createError(ErrorType.GENERIC, {
        message: 'Error 1',
      });
      const error2 = factory.createError(ErrorType.GENERIC, {
        message: 'Error 2',
      });

      expect(error1.correlationId).toBe('custom_1');
      expect(error2.correlationId).toBe('custom_2');
    });
  });

  describe('wrapError', () => {
    it('should wrap unknown error', () => {
      const factory = new ErrorFactory();
      const wrapped = factory.wrapError('Something went wrong');

      expect(wrapped.message).toBe('Something went wrong');
      expect(wrapped.correlationId).toMatch(/^err_/);
    });

    it('should wrap Error instance', () => {
      const factory = new ErrorFactory();
      const original = new Error('Original error');
      const wrapped = factory.wrapError(original);

      expect(wrapped.message).toBe('Original error');
      expect(wrapped.metadata?.originalError).toBe('Error');
    });

    it('should not wrap ApplicationError', () => {
      const factory = new ErrorFactory();
      const original = factory.createError(ErrorType.SECURITY, {
        message: 'Security error',
      });
      const wrapped = factory.wrapError(original);

      expect(wrapped).toBe(original);
    });
  });

  describe('global error factory', () => {
    it('should provide global instance', () => {
      const error = errorFactory.createError(ErrorType.GENERIC, {
        message: 'Test error',
      });

      expect(error.message).toBe('Test error');
    });
  });

  describe('metadata handling', () => {
    it('should include metadata in errors', () => {
      const factory = new ErrorFactory();
      const error = factory.createDatabaseError({
        message: 'Query failed',
        query: 'SELECT * FROM users',
        table: 'users',
        operation: 'SELECT',
        metadata: {
          userId: '123',
        },
      });

      // DatabaseError stores metadata in a specific format
      expect(error.metadata).toBeDefined();
      expect(error.metadata?.query).toBe('SELECT * FROM users');
      expect(error.metadata?.table).toBe('users');
      expect(error.metadata?.operation).toBe('SELECT');
      expect(error.metadata?.userId).toBe('123');
    });
  });
});
