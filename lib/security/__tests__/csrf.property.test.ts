/**
 * CSRF Protection Property-Based Tests
 * Feature: production-audit-improvements, Property 5: CSRF Token Validation
 * 
 * Property 5: CSRF Token Validation
 * For any state-changing HTTP request (POST/PUT/DELETE), it should require valid CSRF token
 * Validates: Requirements 2.5
 * 
 * @module lib/security/__tests__/csrf.property.test.ts
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  generateCsrfToken,
  validateCsrfToken,
  withCsrfProtection,
} from '../csrf';

// =====================================================
// PROPERTY-BASED TEST GENERATORS
// =====================================================

/**
 * Generator for HTTP methods
 */
const httpMethodArb = fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS');

/**
 * Generator for state-changing HTTP methods
 */
const stateChangingMethodArb = fc.constantFrom('POST', 'PUT', 'DELETE', 'PATCH');

/**
 * Generator for safe HTTP methods
 */
const safeMethodArb = fc.constantFrom('GET', 'HEAD', 'OPTIONS');

/**
 * Generator for session IDs
 */
const sessionIdArb = fc.string({ minLength: 10, maxLength: 64 });

/**
 * Generator for URLs
 */
const urlArb = fc.webUrl();

/**
 * Generator for host headers
 */
const hostArb = fc.domain();

// =====================================================
// MOCK HELPERS
// =====================================================

function createMockRequest(
  method: string,
  host: string,
  origin: string,
  csrfToken?: string
): VercelRequest {
  return {
    method,
    url: `http://${host}/api/test`,
    headers: {
      host,
      origin: `http://${origin}`,
      'x-csrf-token': csrfToken || '',
    },
    body: {},
    query: {},
    cookies: {},
  } as VercelRequest;
}

function createMockResponse(): VercelResponse & { statusCode?: number; jsonData?: any } {
  const res: any = {
    statusCode: undefined,
    jsonData: undefined,
    status: function(code: number) {
      this.statusCode = code;
      return this;
    },
    json: function(data: any) {
      this.jsonData = data;
      return this;
    },
    setHeader: () => res,
  };
  return res;
}

// =====================================================
// PROPERTY 5: CSRF TOKEN VALIDATION
// =====================================================

describe('Property 5: CSRF Token Validation', () => {
  /**
   * Property: All generated tokens should be valid
   * For any session ID (or no session ID), generated tokens should pass validation
   */
  it('should generate tokens that always pass validation', () => {
    fc.assert(
      fc.property(
        fc.option(sessionIdArb, { nil: undefined }),
        (sessionId) => {
          const token = generateCsrfToken(sessionId);
          const validation = validateCsrfToken(token, sessionId);
          
          expect(validation.valid).toBe(true);
          expect(validation.reason).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Property: Token validation is deterministic
   * For any token, validating it multiple times should give the same result
   */
  it('should validate tokens deterministically', () => {
    fc.assert(
      fc.property(
        fc.option(sessionIdArb, { nil: undefined }),
        (sessionId) => {
          const token = generateCsrfToken(sessionId);
          
          const validation1 = validateCsrfToken(token, sessionId);
          const validation2 = validateCsrfToken(token, sessionId);
          const validation3 = validateCsrfToken(token, sessionId);
          
          expect(validation1.valid).toBe(validation2.valid);
          expect(validation2.valid).toBe(validation3.valid);
          expect(validation1.reason).toBe(validation2.reason);
          expect(validation2.reason).toBe(validation3.reason);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Property: Tokens with session binding should reject mismatched sessions
   * For any two different session IDs, a token bound to one should reject the other
   */
  it('should reject tokens with mismatched session IDs', () => {
    fc.assert(
      fc.property(
        sessionIdArb,
        sessionIdArb,
        (sessionId1, sessionId2) => {
          fc.pre(sessionId1 !== sessionId2); // Only test different sessions
          
          const token = generateCsrfToken(sessionId1);
          const validation = validateCsrfToken(token, sessionId2);
          
          expect(validation.valid).toBe(false);
          expect(validation.reason).toBe('Token session mismatch');
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Property: Safe methods should never require CSRF token
   * For any safe HTTP method (GET, HEAD, OPTIONS), the middleware should allow the request
   */
  it('should allow safe methods without CSRF token', async () => {
    await fc.assert(
      fc.asyncProperty(
        safeMethodArb,
        hostArb,
        async (method, host) => {
          let handlerCalled = false;
          const handler = () => { handlerCalled = true; };
          const middleware = withCsrfProtection(handler);
          
          const req = createMockRequest(method, host, host);
          const res = createMockResponse();
          
          await middleware(req, res);
          
          expect(handlerCalled).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Property: State-changing methods should require CSRF token
   * For any state-changing method (POST, PUT, DELETE, PATCH), the middleware should reject
   * requests without a valid CSRF token
   */
  it('should reject state-changing methods without CSRF token', async () => {
    await fc.assert(
      fc.asyncProperty(
        stateChangingMethodArb,
        hostArb,
        async (method, host) => {
          let handlerCalled = false;
          const handler = () => { handlerCalled = true; };
          const middleware = withCsrfProtection(handler);
          
          const req = createMockRequest(method, host, host);
          const res = createMockResponse();
          
          await middleware(req, res);
          
          expect(handlerCalled).toBe(false);
          expect(res.statusCode).toBe(403);
          expect(res.jsonData).toMatchObject({
            error: 'CSRF validation failed',
          });
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Property: State-changing methods with valid token should succeed
   * For any state-changing method with a valid CSRF token, the middleware should allow the request
   */
  it('should allow state-changing methods with valid CSRF token', async () => {
    await fc.assert(
      fc.asyncProperty(
        stateChangingMethodArb,
        hostArb,
        async (method, host) => {
          let handlerCalled = false;
          const handler = () => { handlerCalled = true; };
          const middleware = withCsrfProtection(handler);
          
          const token = generateCsrfToken();
          const req = createMockRequest(method, host, host, token);
          const res = createMockResponse();
          
          await middleware(req, res);
          
          expect(handlerCalled).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Property: Origin mismatch should always be rejected
   * For any request where origin doesn't match host, it should be rejected
   */
  it('should reject requests with mismatched origin', async () => {
    await fc.assert(
      fc.asyncProperty(
        stateChangingMethodArb,
        hostArb,
        hostArb,
        async (method, host, differentHost) => {
          fc.pre(host !== differentHost); // Only test different hosts
          
          let handlerCalled = false;
          const handler = () => { handlerCalled = true; };
          const middleware = withCsrfProtection(handler);
          
          const token = generateCsrfToken();
          const req = createMockRequest(method, host, differentHost, token);
          const res = createMockResponse();
          
          await middleware(req, res);
          
          expect(handlerCalled).toBe(false);
          expect(res.statusCode).toBe(403);
          expect(res.jsonData).toMatchObject({
            error: 'CSRF validation failed',
            code: 'INVALID_ORIGIN',
          });
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Property: Token uniqueness
   * For any number of token generations, all tokens should be unique
   */
  it('should generate unique tokens', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 100 }),
        (count) => {
          const tokens = new Set<string>();
          
          for (let i = 0; i < count; i++) {
            const token = generateCsrfToken();
            tokens.add(token);
          }
          
          // All tokens should be unique
          expect(tokens.size).toBe(count);
        }
      ),
      { numRuns: 50 }
    );
  });
  
  /**
   * Property: Token tampering detection
   * For any valid token, modifying any part of it should make it invalid
   */
  it('should detect token tampering', () => {
    fc.assert(
      fc.property(
        fc.option(sessionIdArb, { nil: undefined }),
        fc.integer({ min: 0, max: 10 }),
        (sessionId, charIndex) => {
          const token = generateCsrfToken(sessionId);
          
          // Tamper with the token by changing a character
          if (token.length > charIndex) {
            const chars = token.split('');
            chars[charIndex] = chars[charIndex] === 'a' ? 'b' : 'a';
            const tamperedToken = chars.join('');
            
            const validation = validateCsrfToken(tamperedToken, sessionId);
            
            // Tampered token should be invalid
            expect(validation.valid).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
