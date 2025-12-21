/**
 * Agent Manifest API Integration Tests
 * Tests the /api/agent-manifest endpoint
 * 
 * **Validates: Requirements 4.1, 4.7, 7.1, 7.2, 7.3, 7.4**
 * 
 * @vitest-environment node
 */

import './setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest, createMockResponse } from './helpers';
import handler from '../agent-manifest';
import * as generator from '../../lib/agentManifest/generator';
import type { LogosJSON } from '../../lib/agentManifest/types';

// Mock the generator module
vi.mock('../../lib/agentManifest/generator', async () => {
  const actual = await vi.importActual('../../lib/agentManifest/generator');
  return {
    ...actual,
    generateManifest: vi.fn(),
  };
});

describe('Agent Manifest API Endpoint', () => {
  const mockManifest: LogosJSON = {
    $schema: 'https://anoteroslogos.com/schemas/logos-v1.json',
    meta: {
      version: '1.0',
      updated: new Date().toISOString(),
      authority_level: 'self-declared',
    },
    identity: {
      name: 'Test Website',
      description: 'A test website for manifest generation',
      domain_focus: ['testing', 'development'],
    },
    knowledge_topology: {
      roots: [
        {
          url: '/',
          semantic_role: 'axiom',
          instruction: 'Homepage with core information',
        },
      ],
    },
    directives: {
      crawling: 'allow-standard',
      attribution: 'require-citation',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Request Method Validation', () => {
    it('should accept POST requests', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { url: 'https://example.com' },
      });
      const res = createMockResponse();

      vi.mocked(generator.generateManifest).mockResolvedValue(mockManifest);

      await handler(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should reject GET requests', async () => {
      const req = createMockRequest({
        method: 'GET',
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(405);
      expect(res.jsonData).toMatchObject({
        success: false,
        error: expect.stringContaining('Method not allowed'),
      });
    });

    it('should reject PUT requests', async () => {
      const req = createMockRequest({
        method: 'PUT',
        body: { url: 'https://example.com' },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(405);
      expect(res.jsonData.success).toBe(false);
    });

    it('should reject DELETE requests', async () => {
      const req = createMockRequest({
        method: 'DELETE',
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(405);
      expect(res.jsonData.success).toBe(false);
    });

    it('should handle OPTIONS requests (CORS preflight)', async () => {
      const req = createMockRequest({
        method: 'OPTIONS',
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.ended).toBe(true);
    });
  });

  describe('URL Parameter Validation', () => {
    it('should reject requests without URL', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: {},
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData).toMatchObject({
        success: false,
        error: expect.stringContaining('URL is required'),
      });
    });

    it('should reject requests with empty URL', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { url: '' },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData).toMatchObject({
        success: false,
        error: 'Please enter a website URL',
      });
    });

    it('should reject requests with whitespace-only URL', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { url: '   ' },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData.success).toBe(false);
    });

    it('should reject requests with non-string URL', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { url: 123 },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData.success).toBe(false);
    });

    it('should reject invalid URL formats', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { url: 'not-a-valid-url' },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid'),
      });
    });

    it('should accept valid HTTP URLs', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { url: 'http://example.com' },
      });
      const res = createMockResponse();

      vi.mocked(generator.generateManifest).mockResolvedValue(mockManifest);

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
    });

    it('should accept valid HTTPS URLs', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { url: 'https://example.com' },
      });
      const res = createMockResponse();

      vi.mocked(generator.generateManifest).mockResolvedValue(mockManifest);

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
    });
  });

  describe('Successful Generation', () => {
    it('should return manifest on successful generation', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { url: 'https://example.com' },
      });
      const res = createMockResponse();

      vi.mocked(generator.generateManifest).mockResolvedValue(mockManifest);

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData).toMatchObject({
        success: true,
        manifest: mockManifest,
      });
    });

    it('should call generateManifest with normalized URL', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { url: 'https://example.com/' },
      });
      const res = createMockResponse();

      vi.mocked(generator.generateManifest).mockResolvedValue(mockManifest);

      await handler(req, res);

      expect(generator.generateManifest).toHaveBeenCalledWith(
        expect.stringMatching(/^https:\/\/example\.com/)
      );
    });

    it('should return valid LogosJSON structure', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { url: 'https://example.com' },
      });
      const res = createMockResponse();

      vi.mocked(generator.generateManifest).mockResolvedValue(mockManifest);

      await handler(req, res);

      expect(res.jsonData.manifest).toMatchObject({
        $schema: expect.any(String),
        meta: expect.objectContaining({
          version: expect.any(String),
          updated: expect.any(String),
          authority_level: expect.any(String),
        }),
        identity: expect.objectContaining({
          name: expect.any(String),
          description: expect.any(String),
          domain_focus: expect.any(Array),
        }),
        knowledge_topology: expect.objectContaining({
          roots: expect.any(Array),
        }),
        directives: expect.objectContaining({
          crawling: expect.any(String),
          attribution: expect.any(String),
        }),
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle schema validation errors', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { url: 'https://example.com' },
      });
      const res = createMockResponse();

      const validationError = new generator.SchemaValidationError(
        'Validation failed',
        [{ path: 'meta.version', message: 'Required' }]
      );
      vi.mocked(generator.generateManifest).mockRejectedValue(validationError);

      await handler(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.jsonData).toMatchObject({
        success: false,
        error: expect.stringContaining('Failed to generate valid manifest'),
      });
    });

    it('should handle invalid JSON errors', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { url: 'https://example.com' },
      });
      const res = createMockResponse();

      const jsonError = new generator.InvalidJSONError(
        'Invalid JSON',
        'not json'
      );
      vi.mocked(generator.generateManifest).mockRejectedValue(jsonError);

      await handler(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.jsonData).toMatchObject({
        success: false,
        error: expect.stringContaining('Failed to generate valid manifest'),
      });
    });

    it('should handle AI service not configured error', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { url: 'https://example.com' },
      });
      const res = createMockResponse();

      const configError = new generator.ManifestGenerationError(
        'AI service is not configured'
      );
      vi.mocked(generator.generateManifest).mockRejectedValue(configError);

      await handler(req, res);

      expect(res.statusCode).toBe(503);
      expect(res.jsonData).toMatchObject({
        success: false,
        error: expect.stringContaining('AI service is not configured'),
      });
    });

    it('should handle rate limit errors', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { url: 'https://example.com' },
      });
      const res = createMockResponse();

      const rateLimitError = new generator.ManifestGenerationError(
        'rate limit exceeded'
      );
      vi.mocked(generator.generateManifest).mockRejectedValue(rateLimitError);

      await handler(req, res);

      expect(res.statusCode).toBe(429);
      expect(res.jsonData).toMatchObject({
        success: false,
        error: expect.stringContaining('Rate limit exceeded'),
      });
    });

    it('should handle timeout errors', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { url: 'https://example.com' },
      });
      const res = createMockResponse();

      const timeoutError = new generator.ManifestGenerationError(
        'Request timeout'
      );
      vi.mocked(generator.generateManifest).mockRejectedValue(timeoutError);

      await handler(req, res);

      expect(res.statusCode).toBe(504);
      expect(res.jsonData).toMatchObject({
        success: false,
        error: expect.stringContaining('timed out'),
      });
    });

    it('should handle generic errors', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { url: 'https://example.com' },
      });
      const res = createMockResponse();

      vi.mocked(generator.generateManifest).mockRejectedValue(
        new Error('Unknown error')
      );

      await handler(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.jsonData).toMatchObject({
        success: false,
        error: expect.any(String),
      });
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers in response', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { url: 'https://example.com' },
      });
      const res = createMockResponse();

      vi.mocked(generator.generateManifest).mockResolvedValue(mockManifest);

      await handler(req, res);

      expect(res.headers['access-control-allow-origin']).toBe('*');
      expect(res.headers['access-control-allow-methods']).toContain('POST');
    });

    it('should include CORS headers in error responses', async () => {
      const req = createMockRequest({
        method: 'GET',
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.headers['access-control-allow-origin']).toBe('*');
    });
  });

  describe('Response Format', () => {
    it('should return consistent success response format', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { url: 'https://example.com' },
      });
      const res = createMockResponse();

      vi.mocked(generator.generateManifest).mockResolvedValue(mockManifest);

      await handler(req, res);

      expect(res.jsonData).toHaveProperty('success');
      expect(res.jsonData).toHaveProperty('manifest');
      expect(res.jsonData.success).toBe(true);
    });

    it('should return consistent error response format', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: {},
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.jsonData).toHaveProperty('success');
      expect(res.jsonData).toHaveProperty('error');
      expect(res.jsonData.success).toBe(false);
      expect(typeof res.jsonData.error).toBe('string');
    });
  });
});
