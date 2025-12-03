/**
 * CSRF Protection Integration Tests
 * End-to-end tests for CSRF protection with real API endpoints
 * 
 * @module lib/security/__tests__/csrf.integration.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  generateCsrfToken,
  withCsrfProtection,
  withCsrfTokenGeneration,
  setCsrfCookie,
  getCsrfTokenFromCookie,
} from '../csrf';
import { compose } from '../../validation/middleware';

// =====================================================
// MOCK API ENDPOINT
// =====================================================

/**
 * Mock API endpoint that requires CSRF protection
 */
function createProtectedEndpoint() {
  const handler = async (req: VercelRequest, res: VercelResponse) => {
    return res.status(200).json({
      success: true,
      message: 'Request processed successfully',
      data: req.body,
    });
  };
  
  return withCsrfProtection(handler);
}

/**
 * Mock API endpoint that generates CSRF tokens
 */
function createTokenEndpoint() {
  const handler = async (
    req: VercelRequest,
    res: VercelResponse,
    csrfToken: string
  ) => {
    return res.status(200).json({
      csrfToken,
      expiresIn: 24 * 60 * 60,
    });
  };
  
  return withCsrfTokenGeneration(handler as any);
}

// =====================================================
// MOCK HELPERS
// =====================================================

function createMockRequest(overrides: Partial<VercelRequest> = {}): VercelRequest {
  const defaultHeaders = {
    host: 'localhost:3000',
    origin: 'http://localhost:3000',
  };
  
  return {
    method: 'POST',
    url: 'http://localhost:3000/api/test',
    headers: {
      ...defaultHeaders,
      ...overrides.headers,
    },
    body: overrides.body || {},
    query: {},
    cookies: {},
    ...overrides,
  } as VercelRequest;
}

function createMockResponse(): VercelResponse & {
  statusCode?: number;
  jsonData?: any;
  headers: Record<string, string | string[]>;
} {
  const headers: Record<string, string | string[]> = {};
  
  const res: any = {
    statusCode: undefined,
    jsonData: undefined,
    headers,
    status: function(code: number) {
      this.statusCode = code;
      return this;
    },
    json: function(data: any) {
      this.jsonData = data;
      return this;
    },
    setHeader: function(name: string, value: string | string[]) {
      this.headers[name] = value;
      return this;
    },
    getHeader: function(name: string) {
      return this.headers[name];
    },
  };
  
  return res;
}

// =====================================================
// INTEGRATION TESTS
// =====================================================

describe('CSRF Protection Integration', () => {
  describe('Token Generation Flow', () => {
    it('should generate and return CSRF token', async () => {
      const endpoint = createTokenEndpoint();
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      
      await endpoint(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.jsonData).toHaveProperty('csrfToken');
      expect(res.jsonData.csrfToken).toBeTruthy();
      expect(res.headers['Set-Cookie']).toBeDefined();
    });
    
    it('should set CSRF token in cookie', async () => {
      const endpoint = createTokenEndpoint();
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      
      await endpoint(req, res);
      
      const setCookieHeader = res.headers['Set-Cookie'] as string;
      expect(setCookieHeader).toContain('csrf_token=');
      expect(setCookieHeader).toContain('HttpOnly');
      expect(setCookieHeader).toContain('SameSite=Strict');
    });
    
    it('should reuse existing valid token from cookie', async () => {
      const token = generateCsrfToken();
      const endpoint = createTokenEndpoint();
      const req = createMockRequest({
        method: 'GET',
        headers: {
          cookie: `csrf_token=${token}`,
        },
      });
      const res = createMockResponse();
      
      await endpoint(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.jsonData.csrfToken).toBe(token);
    });
  });
  
  describe('Protected Endpoint Flow', () => {
    it('should reject POST request without CSRF token', async () => {
      const endpoint = createProtectedEndpoint();
      const req = createMockRequest({
        method: 'POST',
        body: { data: 'test' },
      });
      const res = createMockResponse();
      
      await endpoint(req, res);
      
      expect(res.statusCode).toBe(403);
      expect(res.jsonData).toMatchObject({
        error: 'CSRF validation failed',
        code: 'MISSING_CSRF_TOKEN',
      });
    });
    
    it('should reject POST request with invalid CSRF token', async () => {
      const endpoint = createProtectedEndpoint();
      const req = createMockRequest({
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          'x-csrf-token': 'invalid-token',
        },
        body: { data: 'test' },
      });
      const res = createMockResponse();
      
      await endpoint(req, res);
      
      expect(res.statusCode).toBe(403);
      expect(res.jsonData).toMatchObject({
        error: 'CSRF validation failed',
        code: 'INVALID_CSRF_TOKEN',
      });
    });
    
    it('should accept POST request with valid CSRF token', async () => {
      const token = generateCsrfToken();
      const endpoint = createProtectedEndpoint();
      const req = createMockRequest({
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          'x-csrf-token': token,
        },
        body: { data: 'test' },
      });
      const res = createMockResponse();
      
      await endpoint(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.jsonData).toMatchObject({
        success: true,
        message: 'Request processed successfully',
      });
    });
    
    it('should allow GET request without CSRF token', async () => {
      const endpoint = createProtectedEndpoint();
      const req = createMockRequest({
        method: 'GET',
      });
      const res = createMockResponse();
      
      await endpoint(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
    });
  });
  
  describe('Complete User Flow', () => {
    it('should complete full CSRF-protected request flow', async () => {
      // Step 1: Get CSRF token
      const tokenEndpoint = createTokenEndpoint();
      const tokenReq = createMockRequest({ method: 'GET' });
      const tokenRes = createMockResponse();
      
      await tokenEndpoint(tokenReq, tokenRes);
      
      expect(tokenRes.statusCode).toBe(200);
      const { csrfToken } = tokenRes.jsonData;
      
      // Step 2: Extract token from cookie
      const setCookieHeader = tokenRes.headers['Set-Cookie'] as string;
      const cookieMatch = setCookieHeader.match(/csrf_token=([^;]+)/);
      expect(cookieMatch).toBeTruthy();
      const cookieToken = cookieMatch![1];
      
      // Step 3: Make protected request with token
      const protectedEndpoint = createProtectedEndpoint();
      const protectedReq = createMockRequest({
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          'x-csrf-token': csrfToken,
          cookie: `csrf_token=${cookieToken}`,
        },
        body: { action: 'create', data: 'test' },
      });
      const protectedRes = createMockResponse();
      
      await protectedEndpoint(protectedReq, protectedRes);
      
      expect(protectedRes.statusCode).toBe(200);
      expect(protectedRes.jsonData).toMatchObject({
        success: true,
        data: { action: 'create', data: 'test' },
      });
    });
  });
  
  describe('Security Scenarios', () => {
    it('should reject request from different origin', async () => {
      const token = generateCsrfToken();
      const endpoint = createProtectedEndpoint();
      const req = createMockRequest({
        method: 'POST',
        headers: {
          host: 'example.com',
          origin: 'http://evil.com',
          'x-csrf-token': token,
        },
      });
      const res = createMockResponse();
      
      await endpoint(req, res);
      
      expect(res.statusCode).toBe(403);
      expect(res.jsonData).toMatchObject({
        error: 'CSRF validation failed',
        code: 'INVALID_ORIGIN',
      });
    });
    
    it('should reject request with tampered token', async () => {
      const token = generateCsrfToken();
      const tamperedToken = token.slice(0, -1) + 'x';
      
      const endpoint = createProtectedEndpoint();
      const req = createMockRequest({
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          'x-csrf-token': tamperedToken,
        },
      });
      const res = createMockResponse();
      
      await endpoint(req, res);
      
      expect(res.statusCode).toBe(403);
      expect(res.jsonData.code).toBe('INVALID_CSRF_TOKEN');
    });
    
    it('should handle multiple concurrent requests with same token', async () => {
      const token = generateCsrfToken();
      const endpoint = createProtectedEndpoint();
      
      // Make 5 concurrent requests with the same token
      const requests = Array(5).fill(null).map(() => {
        const req = createMockRequest({
          method: 'POST',
          headers: {
            host: 'localhost:3000',
            origin: 'http://localhost:3000',
            'x-csrf-token': token,
          },
          body: { data: 'test' },
        });
        const res = createMockResponse();
        return endpoint(req, res).then(() => res);
      });
      
      const responses = await Promise.all(requests);
      
      // All requests should succeed (token is not consumed by default)
      responses.forEach(res => {
        expect(res.statusCode).toBe(200);
        expect(res.jsonData.success).toBe(true);
      });
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle missing Origin and Referer headers', async () => {
      const token = generateCsrfToken();
      const endpoint = createProtectedEndpoint();
      const req = createMockRequest({
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          'x-csrf-token': token,
          // No origin or referer
        },
      });
      delete req.headers.origin;
      delete req.headers.referer;
      
      const res = createMockResponse();
      
      await endpoint(req, res);
      
      expect(res.statusCode).toBe(403);
      expect(res.jsonData.reason).toContain('Missing Origin and Referer');
    });
    
    it('should handle malformed cookie header', async () => {
      const endpoint = createTokenEndpoint();
      const req = createMockRequest({
        method: 'GET',
        headers: {
          cookie: 'malformed;;;cookie===',
        },
      });
      const res = createMockResponse();
      
      await endpoint(req, res);
      
      // Should generate new token instead of crashing
      expect(res.statusCode).toBe(200);
      expect(res.jsonData.csrfToken).toBeTruthy();
    });
  });
});
