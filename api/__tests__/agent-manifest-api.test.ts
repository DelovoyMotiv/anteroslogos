/**
 * Agent Manifest API Integration Tests
 * Tests the /api/tools endpoint with agent-manifest tool
 * 
 * **Validates: Requirements 4.1, 4.7, 7.1, 7.2, 7.3, 7.4**
 * 
 * @vitest-environment node
 */

import './setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest, createMockResponse } from './helpers';
import handler from '../tools';
import * as generator from '../../lib/agentManifest/generator';
import type { AgentsJSON } from '../../lib/agentManifest/types';

// Mock fetch globally
global.fetch = vi.fn();

// Mock the generator module
vi.mock('../../lib/agentManifest/generator', async () => {
  const actual = await vi.importActual('../../lib/agentManifest/generator');
  return {
    ...actual,
    generateManifest: vi.fn(),
  };
});

describe('Agent Manifest API Endpoint', () => {
  const mockManifest: AgentsJSON = {
    $schema: 'https://anoteroslogos.com/schemas/agents-v1.json',
    version: '1.0',
    identity: {
      name: 'Test Website',
      description: 'A test website for manifest generation',
      tags: ['testing', 'development'],
    },
    knowledge: [
      {
        role: 'about',
        url: '/about',
        description: 'Information about the company',
      },
      {
        role: 'product',
        url: '/products',
        description: 'Product catalog and features',
      },
    ],
    actions: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default successful fetch response
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify(mockManifest)
          }
        }]
      }),
    } as Response);
  });

  describe('Request Method Validation', () => {
    it('should accept POST requests', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { tool: 'agent-manifest', url: 'https://example.com' },
      });
      const res = createMockResponse();

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
        body: { tool: 'agent-manifest', url: 'https://example.com' },
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
    it('should reject requests without tool parameter', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { url: 'https://example.com' },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData).toMatchObject({
        success: false,
        error: expect.stringContaining('Tool parameter'),
      });
    });

    it('should reject requests without URL', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { tool: 'agent-manifest' },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData).toMatchObject({
        success: false,
        error: expect.stringContaining('Please enter a website URL'),
      });
    });

    it('should reject requests with empty URL', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { tool: 'agent-manifest', url: '' },
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
        body: { tool: 'agent-manifest', url: '   ' },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData.success).toBe(false);
    });

    it('should reject requests with non-string URL', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { tool: 'agent-manifest', url: 123 },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData.success).toBe(false);
    });

    it('should reject invalid URL formats', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { tool: 'agent-manifest', url: 'ht!tp://invalid url with spaces' },
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
        body: { tool: 'agent-manifest', url: 'http://example.com' },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
    });

    it('should accept valid HTTPS URLs', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { tool: 'agent-manifest', url: 'https://example.com' },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
    });
  });

  describe('Successful Generation', () => {
    it('should return manifest on successful generation', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { tool: 'agent-manifest', url: 'https://example.com' },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData).toMatchObject({
        success: true,
        data: {
          manifest: mockManifest,
        },
      });
    });

    it('should return valid AgentsJSON structure', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { tool: 'agent-manifest', url: 'https://example.com' },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.jsonData.data.manifest).toMatchObject({
        $schema: expect.any(String),
        version: expect.any(String),
        identity: expect.objectContaining({
          name: expect.any(String),
          description: expect.any(String),
          tags: expect.any(Array),
        }),
        knowledge: expect.any(Array),
        actions: expect.any(Array),
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle schema validation errors', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { tool: 'agent-manifest', url: 'https://example.com' },
      });
      const res = createMockResponse();

      // Mock fetch to return invalid JSON structure
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({ invalid: 'structure' })
            }
          }]
        }),
      } as Response);

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
        body: { tool: 'agent-manifest', url: 'https://example.com' },
      });
      const res = createMockResponse();

      // Mock fetch to return non-JSON content
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'not valid json at all'
            }
          }]
        }),
      } as Response);

      await handler(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.jsonData).toMatchObject({
        success: false,
        error: expect.stringContaining('Failed to generate manifest'),
      });
    });

    it('should handle AI service not configured error', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { tool: 'agent-manifest', url: 'https://example.com' },
      });
      const res = createMockResponse();

      // Temporarily remove API key
      const originalKey = process.env.OPENROUTER_API_KEY;
      delete process.env.OPENROUTER_API_KEY;

      await handler(req, res);

      // Restore API key
      process.env.OPENROUTER_API_KEY = originalKey;

      expect(res.statusCode).toBe(503);
      expect(res.jsonData).toMatchObject({
        success: false,
        error: expect.stringContaining('AI service is not configured'),
      });
    });

    it('should handle rate limit errors', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { tool: 'agent-manifest', url: 'https://example.com' },
      });
      const res = createMockResponse();

      // Mock fetch to return rate limit error
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: 'rate limit exceeded' }
        }),
      } as Response);

      await handler(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.jsonData).toMatchObject({
        success: false,
        error: expect.stringContaining('Failed to generate manifest'),
      });
    });

    it('should handle timeout errors', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { tool: 'agent-manifest', url: 'https://example.com' },
      });
      const res = createMockResponse();

      // Mock fetch to throw AbortError
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      vi.mocked(global.fetch).mockRejectedValueOnce(abortError);

      await handler(req, res);

      expect(res.statusCode).toBe(504);
      expect(res.jsonData).toMatchObject({
        success: false,
        error: expect.stringContaining('timeout'),
      });
    });

    it('should handle generic errors', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { tool: 'agent-manifest', url: 'https://example.com' },
      });
      const res = createMockResponse();

      // Mock fetch to throw generic error
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Unknown error'));

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
        body: { tool: 'agent-manifest', url: 'https://example.com' },
      });
      const res = createMockResponse();

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
        body: { tool: 'agent-manifest', url: 'https://example.com' },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.jsonData).toHaveProperty('success');
      expect(res.jsonData).toHaveProperty('data');
      expect(res.jsonData.success).toBe(true);
    });

    it('should return consistent error response format', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { tool: 'agent-manifest' },
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
