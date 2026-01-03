/**
 * Browser Health Check Endpoint Tests
 * Tests for /api/health/browser endpoint
 * 
 * Requirements: 8.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMockRequest, createMockResponse } from './helpers';
import handler from '../health/browser';

describe('Browser Health Check Endpoint', () => {
  beforeEach(() => {
    // Clear any environment variable overrides
    delete process.env.BROWSER_ENABLED;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/health/browser', () => {
    it('should return 200 with health status when browser is enabled', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData).toBeDefined();
      expect(res.jsonData).toHaveProperty('status');
      expect(res.jsonData).toHaveProperty('timestamp');
    });

    it('should return browser status information', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData).toMatchObject({
        status: expect.stringMatching(/healthy|unhealthy|disabled/),
        timestamp: expect.any(String),
      });

      // If browser is enabled, should have browser and pool info
      if (res.jsonData.status !== 'disabled') {
        expect(res.jsonData).toHaveProperty('browser');
        expect(res.jsonData).toHaveProperty('pool');
        expect(res.jsonData.browser).toHaveProperty('enabled');
        expect(res.jsonData.browser).toHaveProperty('environment');
        expect(res.jsonData.pool).toHaveProperty('total');
        expect(res.jsonData.pool).toHaveProperty('inUse');
        expect(res.jsonData.pool).toHaveProperty('available');
      }
    });

    it('should return disabled status when BROWSER_ENABLED is false', async () => {
      process.env.BROWSER_ENABLED = 'false';

      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData).toMatchObject({
        status: 'disabled',
        message: expect.stringContaining('disabled'),
        timestamp: expect.any(String),
      });
    });

    it('should return 405 for non-GET requests', async () => {
      const req = createMockRequest({ method: 'POST' });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(405);
      expect(res.jsonData).toMatchObject({
        error: 'Method not allowed',
      });
    });

    it('should include pool statistics in response', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();

      await handler(req, res);

      // If browser is enabled, check pool stats
      if (res.jsonData.status !== 'disabled') {
        expect(res.jsonData.pool).toBeDefined();
        expect(typeof res.jsonData.pool.total).toBe('number');
        expect(typeof res.jsonData.pool.inUse).toBe('number');
        expect(typeof res.jsonData.pool.available).toBe('number');
        expect(res.jsonData.pool.total).toBeGreaterThanOrEqual(0);
        expect(res.jsonData.pool.inUse).toBeGreaterThanOrEqual(0);
        expect(res.jsonData.pool.available).toBeGreaterThanOrEqual(0);
      }
    });

    it('should include environment information', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();

      await handler(req, res);

      // If browser is enabled, check environment
      if (res.jsonData.status !== 'disabled') {
        expect(res.jsonData.browser.environment).toBeDefined();
        expect(['vercel', 'local']).toContain(res.jsonData.browser.environment);
      }
    });
  });
});
