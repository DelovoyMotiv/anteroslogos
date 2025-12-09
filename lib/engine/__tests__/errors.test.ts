/**
 * Unit tests for error handling utilities
 * 
 * Tests error response builders, status code mappings, and error classes
 */

import { describe, test, expect } from 'vitest';
import {
  AgentMiddlewareError,
  createErrorResponse,
  getStatusCode,
  getRecoveryAction,
  isAgentMiddlewareError,
  ERROR_STATUS_CODES,
  ERROR_MESSAGES,
  ERROR_RECOVERY_ACTIONS,
} from '../errors';
import { ErrorCode } from '../../../types/agent-middleware.types';

describe('Error Handling Utilities', () => {
  
  // ==========================================================================
  // Error Code Mappings
  // ==========================================================================
  
  test('ERROR_STATUS_CODES contains all error codes', () => {
    const errorCodes = Object.values(ErrorCode);
    
    errorCodes.forEach(code => {
      expect(ERROR_STATUS_CODES[code]).toBeDefined();
      expect(typeof ERROR_STATUS_CODES[code]).toBe('number');
    });
  });
  
  test('ERROR_MESSAGES contains all error codes', () => {
    const errorCodes = Object.values(ErrorCode);
    
    errorCodes.forEach(code => {
      expect(ERROR_MESSAGES[code]).toBeDefined();
      expect(typeof ERROR_MESSAGES[code]).toBe('string');
      expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0);
    });
  });
  
  test('ERROR_RECOVERY_ACTIONS contains all error codes', () => {
    const errorCodes = Object.values(ErrorCode);
    
    errorCodes.forEach(code => {
      expect(ERROR_RECOVERY_ACTIONS[code]).toBeDefined();
      expect(typeof ERROR_RECOVERY_ACTIONS[code]).toBe('string');
      expect(ERROR_RECOVERY_ACTIONS[code].length).toBeGreaterThan(0);
    });
  });
  
  // ==========================================================================
  // Status Code Mappings
  // ==========================================================================
  
  test('ERR_URL_UNREACHABLE maps to HTTP 422', () => {
    expect(getStatusCode(ErrorCode.ERR_URL_UNREACHABLE)).toBe(422);
  });
  
  test('ERR_BOT_BLOCKED maps to HTTP 422', () => {
    expect(getStatusCode(ErrorCode.ERR_BOT_BLOCKED)).toBe(422);
  });
  
  test('ERR_DOM_UNREADABLE maps to HTTP 422', () => {
    expect(getStatusCode(ErrorCode.ERR_DOM_UNREADABLE)).toBe(422);
  });
  
  test('ERR_TIMEOUT maps to HTTP 422', () => {
    expect(getStatusCode(ErrorCode.ERR_TIMEOUT)).toBe(422);
  });
  
  test('ERR_INVALID_URL maps to HTTP 400', () => {
    expect(getStatusCode(ErrorCode.ERR_INVALID_URL)).toBe(400);
  });
  
  test('ERR_AUTH_MISSING maps to HTTP 401', () => {
    expect(getStatusCode(ErrorCode.ERR_AUTH_MISSING)).toBe(401);
  });
  
  test('ERR_AUTH_INVALID maps to HTTP 401', () => {
    expect(getStatusCode(ErrorCode.ERR_AUTH_INVALID)).toBe(401);
  });
  
  test('ERR_QUOTA_EXCEEDED maps to HTTP 402', () => {
    expect(getStatusCode(ErrorCode.ERR_QUOTA_EXCEEDED)).toBe(402);
  });
  
  test('ERR_RATE_LIMIT maps to HTTP 429', () => {
    expect(getStatusCode(ErrorCode.ERR_RATE_LIMIT)).toBe(429);
  });
  
  test('ERR_INTERNAL maps to HTTP 500', () => {
    expect(getStatusCode(ErrorCode.ERR_INTERNAL)).toBe(500);
  });
  
  // ==========================================================================
  // createErrorResponse
  // ==========================================================================
  
  test('createErrorResponse creates valid error response', () => {
    const response = createErrorResponse(
      ErrorCode.ERR_INVALID_URL,
      'Custom message',
      { url: 'https://example.com' }
    );
    
    expect(response.error).toBeDefined();
    expect(response.error.code).toBe(ErrorCode.ERR_INVALID_URL);
    expect(response.error.message).toBe('Custom message');
    expect(response.error.details).toBeDefined();
    expect(response.error.details?.timestamp).toBeDefined();
    expect(response.error.details?.url).toBe('https://example.com');
  });
  
  test('createErrorResponse uses default message when not provided', () => {
    const response = createErrorResponse(ErrorCode.ERR_TIMEOUT);
    
    expect(response.error.message).toBe(ERROR_MESSAGES[ErrorCode.ERR_TIMEOUT]);
  });
  
  test('createErrorResponse includes timestamp in ISO 8601 format', () => {
    const response = createErrorResponse(ErrorCode.ERR_INTERNAL);
    
    expect(response.error.details?.timestamp).toBeDefined();
    const timestamp = response.error.details?.timestamp as string;
    
    // Verify ISO 8601 format
    const iso8601Pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    expect(iso8601Pattern.test(timestamp)).toBe(true);
  });
  
  // ==========================================================================
  // AgentMiddlewareError Class
  // ==========================================================================
  
  test('AgentMiddlewareError creates error with code', () => {
    const error = new AgentMiddlewareError(ErrorCode.ERR_BOT_BLOCKED);
    
    expect(error.code).toBe(ErrorCode.ERR_BOT_BLOCKED);
    expect(error.message).toBe(ERROR_MESSAGES[ErrorCode.ERR_BOT_BLOCKED]);
    expect(error.name).toBe('AgentMiddlewareError');
  });
  
  test('AgentMiddlewareError accepts custom message', () => {
    const customMessage = 'Custom error message';
    const error = new AgentMiddlewareError(
      ErrorCode.ERR_DOM_UNREADABLE,
      customMessage
    );
    
    expect(error.message).toBe(customMessage);
  });
  
  test('AgentMiddlewareError accepts details', () => {
    const details = { url: 'https://example.com', attempt: 3 };
    const error = new AgentMiddlewareError(
      ErrorCode.ERR_URL_UNREACHABLE,
      undefined,
      details
    );
    
    expect(error.details).toEqual(details);
  });
  
  test('AgentMiddlewareError.toResponse() creates valid response', () => {
    const error = new AgentMiddlewareError(
      ErrorCode.ERR_QUOTA_EXCEEDED,
      'Quota exceeded',
      { remaining: 0 }
    );
    
    const response = error.toResponse();
    
    expect(response.error.code).toBe(ErrorCode.ERR_QUOTA_EXCEEDED);
    expect(response.error.message).toBe('Quota exceeded');
    expect(response.error.details?.remaining).toBe(0);
  });
  
  test('AgentMiddlewareError.getStatusCode() returns correct status', () => {
    const error = new AgentMiddlewareError(ErrorCode.ERR_AUTH_INVALID);
    
    expect(error.getStatusCode()).toBe(401);
  });
  
  test('AgentMiddlewareError.getRecoveryAction() returns action', () => {
    const error = new AgentMiddlewareError(ErrorCode.ERR_RATE_LIMIT);
    
    const action = error.getRecoveryAction();
    expect(action).toBe(ERROR_RECOVERY_ACTIONS[ErrorCode.ERR_RATE_LIMIT]);
    expect(action.length).toBeGreaterThan(0);
  });
  
  // ==========================================================================
  // Type Guards
  // ==========================================================================
  
  test('isAgentMiddlewareError identifies AgentMiddlewareError', () => {
    const error = new AgentMiddlewareError(ErrorCode.ERR_INTERNAL);
    
    expect(isAgentMiddlewareError(error)).toBe(true);
  });
  
  test('isAgentMiddlewareError rejects regular Error', () => {
    const error = new Error('Regular error');
    
    expect(isAgentMiddlewareError(error)).toBe(false);
  });
  
  test('isAgentMiddlewareError rejects non-error values', () => {
    expect(isAgentMiddlewareError(null)).toBe(false);
    expect(isAgentMiddlewareError(undefined)).toBe(false);
    expect(isAgentMiddlewareError('error')).toBe(false);
    expect(isAgentMiddlewareError({})).toBe(false);
  });
  
  // ==========================================================================
  // Recovery Actions
  // ==========================================================================
  
  test('getRecoveryAction returns actionable guidance', () => {
    const errorCodes = Object.values(ErrorCode);
    
    errorCodes.forEach(code => {
      const action = getRecoveryAction(code);
      
      expect(action).toBeDefined();
      expect(typeof action).toBe('string');
      expect(action.length).toBeGreaterThan(10); // Should be meaningful
    });
  });
});
