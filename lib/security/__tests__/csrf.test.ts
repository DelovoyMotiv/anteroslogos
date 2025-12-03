/**
 * CSRF Protection Tests
 * Unit tests for CSRF token generation, validation, and middleware
 * 
 * @module lib/security/__tests__/csrf.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  generateCsrfToken,
  validateCsrfToken,
  consumeCsrfToken,
  withCsrfProtection,
  setCsrfCookie,
  getCsrfTokenFromCookie,
  getCsrfTokenFromHeader,
  validateOrigin,
} from '../csrf';

// =====================================================
// MOCK HELPERS
// =====================================================

function createMockRequest(overrides: Partial<VercelRequest> = {}): VercelRequest {
  return {
    method: 'POST',
    url: 'http://localhost:3000/api/test',
    headers: {
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      'x-csrf-token': '',
      ...overrides.headers,
    },
    body: {},
    query: {},
    cookies: {},
    ...overrides,
  } as VercelRequest;
}

function createMockResponse(): VercelResponse {
  const headers: Record<string, string | string[]> = {};
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn((name: string, value: string | string[]) => {
      headers[name] = value;
    }),
    getHeader: vi.fn((name: string) => headers[name]),
    headers,
  } as unknown as VercelResponse;
  return res;
}

// =====================================================
// TOKEN GENERATION TESTS
// =====================================================

describe('generateCsrfToken', () => {
  it('should generate a valid CSRF token', () => {
    const token = generateCsrfToken();
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
    expect(token.split(':').length).toBeGreaterThanOrEqual(3);
  });
  
  it('should generate unique tokens', () => {
    const token1 = generateCsrfToken();
    const token2 = generateCsrfToken();
    
    expect(token1).not.toBe(token2);
  });
  
  it('should include session ID when provided', () => {
    const sessionId = 'test-session-123';
    const token = generateCsrfToken(sessionId);
    
    expect(token).toContain(sessionId);
  });
  
  it('should generate tokens that pass validation', () => {
    const token = generateCsrfToken();
    const validation = validateCsrfToken(token);
    
    expect(validation.valid).toBe(true);
    expect(validation.reason).toBeUndefined();
  });
});

// =====================================================
// TOKEN VALIDATION TESTS
// =====================================================

describe('validateCsrfToken', () => {
  it('should validate a valid token', () => {
    const token = generateCsrfToken();
    const validation = validateCsrfToken(token);
    
    expect(validation.valid).toBe(true);
  });
  
  it('should reject empty token', () => {
    const validation = validateCsrfToken('');
    
    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe('Token is missing');
  });
  
  it('should reject malformed token', () => {
    const validation = validateCsrfToken('invalid-token');
    
    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe('Token format is invalid');
  });
  
  it('should reject token with invalid signature', () => {
    const token = generateCsrfToken();
    const tamperedToken = token.replace(/[a-f0-9]$/, 'x');
    const validation = validateCsrfToken(tamperedToken);
    
    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe('Token signature is invalid');
  });
  
  it('should reject expired token', () => {
    // Create a token with old timestamp
    const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
    const parts = generateCsrfToken().split(':');
    parts[1] = oldTimestamp.toString();
    const expiredToken = parts.join(':');
    
    const validation = validateCsrfToken(expiredToken);
    
    expect(validation.valid).toBe(false);
  });
  
  it('should validate token with matching session ID', () => {
    const sessionId = 'test-session-123';
    const token = generateCsrfToken(sessionId);
    const validation = validateCsrfToken(token, sessionId);
    
    expect(validation.valid).toBe(true);
  });
  
  it('should reject token with mismatched session ID', () => {
    const token = generateCsrfToken('session-1');
    const validation = validateCsrfToken(token, 'session-2');
    
    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe('Token session mismatch');
  });
});

// =====================================================
// TOKEN CONSUMPTION TESTS
// =====================================================

describe('consumeCsrfToken', () => {
  it('should invalidate token after consumption', () => {
    const token = generateCsrfToken();
    
    // Token should be valid before consumption
    expect(validateCsrfToken(token).valid).toBe(true);
    
    // Consume token
    consumeCsrfToken(token);
    
    // Token should be invalid after consumption
    expect(validateCsrfToken(token).valid).toBe(false);
  });
  
  it('should handle invalid token gracefully', () => {
    expect(() => consumeCsrfToken('invalid-token')).not.toThrow();
    expect(() => consumeCsrfToken('')).not.toThrow();
  });
});

// =====================================================
// COOKIE TESTS
// =====================================================

describe('setCsrfCookie', () => {
  it('should set cookie with secure options', () => {
    const res = createMockResponse();
    const token = generateCsrfToken();
    
    setCsrfCookie(res, token);
    
    expect(res.setHeader).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining('csrf_token=')
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining('HttpOnly')
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining('SameSite=Strict')
    );
  });
});

describe('getCsrfTokenFromCookie', () => {
  it('should extract token from cookie header', () => {
    const token = generateCsrfToken();
    const req = createMockRequest({
      headers: {
        cookie: `csrf_token=${token}; other=value`,
      },
    });
    
    const extracted = getCsrfTokenFromCookie(req);
    expect(extracted).toBe(token);
  });
  
  it('should return null when cookie is missing', () => {
    const req = createMockRequest({ headers: {} });
    const extracted = getCsrfTokenFromCookie(req);
    expect(extracted).toBeNull();
  });
});

describe('getCsrfTokenFromHeader', () => {
  it('should extract token from header', () => {
    const token = generateCsrfToken();
    const req = createMockRequest({
      headers: {
        'x-csrf-token': token,
      },
    });
    
    const extracted = getCsrfTokenFromHeader(req);
    expect(extracted).toBe(token);
  });
  
  it('should return null when header is missing', () => {
    const req = createMockRequest({ headers: {} });
    const extracted = getCsrfTokenFromHeader(req);
    expect(extracted).toBeNull();
  });
});

// =====================================================
// ORIGIN VALIDATION TESTS
// =====================================================

describe('validateOrigin', () => {
  it('should validate matching origin', () => {
    const req = createMockRequest({
      headers: {
        host: 'example.com',
        origin: 'https://example.com',
      },
    });
    
    const validation = validateOrigin(req);
    expect(validation.valid).toBe(true);
  });
  
  it('should validate matching referer', () => {
    const req = createMockRequest({
      headers: {
        host: 'example.com',
        referer: 'https://example.com/page',
      },
    });
    
    const validation = validateOrigin(req);
    expect(validation.valid).toBe(true);
  });
  
  it('should reject mismatched origin', () => {
    const req = createMockRequest({
      headers: {
        host: 'example.com',
        origin: 'https://evil.com',
      },
    });
    
    const validation = validateOrigin(req);
    expect(validation.valid).toBe(false);
    expect(validation.reason).toContain('Origin mismatch');
  });
  
  it('should reject missing origin and referer', () => {
    const req = createMockRequest({
      headers: {
        host: 'example.com',
      },
    });
    
    const validation = validateOrigin(req);
    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe('Missing Origin and Referer headers');
  });
});

// =====================================================
// MIDDLEWARE TESTS
// =====================================================

describe('withCsrfProtection', () => {
  it('should allow GET requests without CSRF token', async () => {
    const handler = vi.fn();
    const middleware = withCsrfProtection(handler);
    
    const req = createMockRequest({ method: 'GET' });
    const res = createMockResponse();
    
    await middleware(req, res);
    
    expect(handler).toHaveBeenCalled();
  });
  
  it('should allow OPTIONS requests without CSRF token', async () => {
    const handler = vi.fn();
    const middleware = withCsrfProtection(handler);
    
    const req = createMockRequest({ method: 'OPTIONS' });
    const res = createMockResponse();
    
    await middleware(req, res);
    
    expect(handler).toHaveBeenCalled();
  });
  
  it('should reject POST request without CSRF token', async () => {
    const handler = vi.fn();
    const middleware = withCsrfProtection(handler);
    
    const req = createMockRequest({
      method: 'POST',
      headers: {
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
      },
    });
    const res = createMockResponse();
    
    await middleware(req, res);
    
    expect(handler).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'CSRF validation failed',
        code: 'MISSING_CSRF_TOKEN',
      })
    );
  });
  
  it('should reject POST request with invalid CSRF token', async () => {
    const handler = vi.fn();
    const middleware = withCsrfProtection(handler);
    
    const req = createMockRequest({
      method: 'POST',
      headers: {
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
        'x-csrf-token': 'invalid-token',
      },
    });
    const res = createMockResponse();
    
    await middleware(req, res);
    
    expect(handler).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'CSRF validation failed',
        code: 'INVALID_CSRF_TOKEN',
      })
    );
  });
  
  it('should allow POST request with valid CSRF token', async () => {
    const handler = vi.fn();
    const middleware = withCsrfProtection(handler);
    
    const token = generateCsrfToken();
    const req = createMockRequest({
      method: 'POST',
      headers: {
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
        'x-csrf-token': token,
      },
    });
    const res = createMockResponse();
    
    await middleware(req, res);
    
    expect(handler).toHaveBeenCalled();
  });
  
  it('should reject request with mismatched origin', async () => {
    const handler = vi.fn();
    const middleware = withCsrfProtection(handler);
    
    const token = generateCsrfToken();
    const req = createMockRequest({
      method: 'POST',
      headers: {
        host: 'localhost:3000',
        origin: 'http://evil.com',
        'x-csrf-token': token,
      },
    });
    const res = createMockResponse();
    
    await middleware(req, res);
    
    expect(handler).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'CSRF validation failed',
        code: 'INVALID_ORIGIN',
      })
    );
  });
  
  it('should allow excluded paths without CSRF token', async () => {
    const handler = vi.fn();
    const middleware = withCsrfProtection(handler, {
      excludePaths: ['/api/public'],
    });
    
    const req = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/public/endpoint',
      headers: {
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
      },
    });
    const res = createMockResponse();
    
    await middleware(req, res);
    
    expect(handler).toHaveBeenCalled();
  });
});
