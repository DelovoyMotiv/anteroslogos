/**
 * AUX Audit API Integration Tests
 * 
 * Tests the POST /api/audit/aux endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../audit/aux';
import { createMockRequest, createMockResponse } from './helpers';

describe('POST /api/audit/aux', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('Request Validation', () => {
    it('should reject non-POST requests', async () => {
      const req = createMockRequest({
        method: 'GET',
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(405);
      expect(res.jsonData).toMatchObject({
        error: 'Method not allowed',
        code: 'INVALID_URL',
      });
    });

    it('should handle OPTIONS requests for CORS', async () => {
      const req = createMockRequest({
        method: 'OPTIONS',
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.ended).toBe(true);
    });

    it('should reject requests with invalid JSON', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: 'invalid json',
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData).toMatchObject({
        error: 'Invalid JSON in request body',
        code: 'SERIALIZATION_ERROR',
      });
    });

    it('should reject requests without url field', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: {},
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData).toMatchObject({
        error: 'Missing required field: url',
        code: 'INVALID_URL',
      });
    });

    it('should reject requests with invalid URL format', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: {
          url: 'not a valid url',
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData.code).toBe('INVALID_URL');
    });

    it('should reject requests with dangerous protocols', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: {
          url: 'javascript:alert(1)',
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData.code).toBe('INVALID_URL');
    });

    it('should reject requests with internal IP addresses', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: {
          url: 'http://127.0.0.1',
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData.code).toBe('INVALID_URL');
    });
  });

  describe('URL Normalization', () => {
    it('should accept URLs without protocol and add https', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: {
          url: 'example.com',
        },
      });
      const res = createMockResponse();

      // Mock fetch to avoid actual network call
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await handler(req, res);

      // Should not fail on URL validation
      expect(res.statusCode).not.toBe(400);
    });

    it('should accept valid HTTPS URLs', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: {
          url: 'https://example.com',
        },
      });
      const res = createMockResponse();

      // Mock fetch to avoid actual network call
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await handler(req, res);

      // Should not fail on URL validation
      expect(res.statusCode).not.toBe(400);
    });
  });

  describe('Error Handling', () => {
    it('should return 502 for unreachable URLs', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: {
          url: 'https://this-domain-does-not-exist-12345.com',
        },
      });
      const res = createMockResponse();

      // Mock fetch to simulate network error
      global.fetch = vi.fn().mockRejectedValue(new Error('fetch failed'));

      await handler(req, res);

      expect(res.statusCode).toBe(502);
      expect(res.jsonData).toMatchObject({
        code: 'FETCH_FAILED',
      });
    });

    it('should include requestId in error responses', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: {},
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.jsonData.requestId).toBeDefined();
      expect(res.jsonData.requestId).toMatch(/^aux_/);
    });

    it('should include timestamp in error responses', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: {},
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.jsonData.timestamp).toBeDefined();
      expect(new Date(res.jsonData.timestamp).getTime()).toBeGreaterThan(0);
    });
  });

  describe('CORS Headers', () => {
    it('should set CORS headers on all responses', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: {},
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.headers['access-control-allow-origin']).toBe('*');
      expect(res.headers['access-control-allow-methods']).toBe('POST, OPTIONS');
      expect(res.headers['access-control-allow-headers']).toBe('Content-Type');
    });
  });
});
