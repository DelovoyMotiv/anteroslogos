/**
 * A2A Protocol Integration Tests
 * Tests A2A JSON-RPC endpoint with real mesh network
 * 
 * **Validates: Requirements 7.3**
 * **Property 35: API Integration Tests**
 * 
 * @vitest-environment node
 */

import './setup';
import { describe, it, expect } from 'vitest';
import { createMockRequest, createMockResponse } from './helpers';
import a2aHandler from '../a2a';

describe('A2A Protocol Integration Tests', () => {
  describe('JSON-RPC 2.0 Compliance', () => {
    it('should accept valid JSON-RPC request', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: {
          jsonrpc: '2.0',
          id: 1,
          method: 'a2a.mesh.cascade',
          params: {
            type: 'ucpt-cascade',
            ucpt: 'test-token',
            sourceAid: 'aid://test/source',
            tool: 'test-tool',
            ttl: 3,
            timestamp: Date.now(),
          },
        },
      });
      const res = createMockResponse();
      
      await a2aHandler(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.jsonData).toMatchObject({
        jsonrpc: '2.0',
        id: 1,
        result: expect.any(Object),
      });
      expect(res.ended).toBe(true);
    });
    
    it('should return error for unknown method', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: {
          jsonrpc: '2.0',
          id: 2,
          method: 'unknown.method',
          params: {},
        },
      });
      const res = createMockResponse();
      
      await a2aHandler(req, res);
      
      expect(res.statusCode).toBe(404);
      expect(res.jsonData).toMatchObject({
        jsonrpc: '2.0',
        id: 2,
        error: {
          code: -32601,
          message: 'Method not found',
        },
      });
    });
    
    it('should handle invalid JSON-RPC format', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: {
          // Missing jsonrpc version
          id: 3,
          method: 'a2a.mesh.cascade',
        },
      });
      const res = createMockResponse();
      
      await a2aHandler(req, res);
      
      // Should return error response
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
  });
  
  describe('a2a.mesh.cascade Method', () => {
    it('should accept cascade message with valid TTL', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: {
          jsonrpc: '2.0',
          id: 10,
          method: 'a2a.mesh.cascade',
          params: {
            type: 'ucpt-cascade',
            ucpt: 'cascade-token-' + Date.now(),
            sourceAid: 'aid://source-agent/abc',
            tool: 'knowledge-sync',
            ttl: 5,
            timestamp: Date.now(),
          },
        },
      });
      const res = createMockResponse();
      
      await a2aHandler(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.jsonData.result).toMatchObject({
        accepted: true,
        timestamp: expect.any(Number),
      });
    });
    
    it('should accept cascade message with TTL=0', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: {
          jsonrpc: '2.0',
          id: 11,
          method: 'a2a.mesh.cascade',
          params: {
            type: 'ucpt-cascade',
            ucpt: 'ttl-zero-token',
            sourceAid: 'aid://terminal/node',
            tool: 'final-hop',
            ttl: 0,
            timestamp: Date.now(),
          },
        },
      });
      const res = createMockResponse();
      
      await a2aHandler(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.jsonData.result.accepted).toBe(true);
    });
    
    it('should process cascade message asynchronously', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: {
          jsonrpc: '2.0',
          id: 12,
          method: 'a2a.mesh.cascade',
          params: {
            type: 'ucpt-cascade',
            ucpt: 'async-token-' + Date.now(),
            sourceAid: 'aid://async/agent',
            tool: 'async-tool',
            ttl: 3,
            timestamp: Date.now(),
          },
        },
      });
      const res = createMockResponse();
      
      const startTime = Date.now();
      await a2aHandler(req, res);
      const duration = Date.now() - startTime;
      
      // Should return quickly (< 100ms) since processing is async
      expect(duration).toBeLessThan(100);
      expect(res.statusCode).toBe(200);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle missing required parameters', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: {
          jsonrpc: '2.0',
          id: 20,
          method: 'a2a.mesh.cascade',
          params: {
            // Missing required fields
            type: 'ucpt-cascade',
          },
        },
      });
      const res = createMockResponse();
      
      await a2aHandler(req, res);
      
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
    
    it('should handle internal errors gracefully', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: {
          jsonrpc: '2.0',
          id: 21,
          method: 'a2a.mesh.cascade',
          params: {
            type: 'ucpt-cascade',
            ucpt: null, // Invalid value
            sourceAid: 'aid://test/error',
            tool: 'error-tool',
            ttl: 3,
            timestamp: Date.now(),
          },
        },
      });
      const res = createMockResponse();
      
      await a2aHandler(req, res);
      
      // Should return error response, not crash
      expect(res.ended).toBe(true);
      expect(res.jsonData).toBeDefined();
    });
  });
  
  describe('Rate Limiting', () => {
    it('should accept multiple requests within limit', async () => {
      const requests = Array(5).fill(null).map((_, i) => {
        const req = createMockRequest({
          method: 'POST',
          body: {
            jsonrpc: '2.0',
            id: 100 + i,
            method: 'a2a.mesh.cascade',
            params: {
              type: 'ucpt-cascade',
              ucpt: `rate-test-${i}`,
              sourceAid: 'aid://rate/test',
              tool: 'rate-tool',
              ttl: 2,
              timestamp: Date.now(),
            },
          },
        });
        const res = createMockResponse();
        return a2aHandler(req, res).then(() => res);
      });
      
      const responses = await Promise.all(requests);
      
      // All should succeed (within rate limit)
      responses.forEach(res => {
        expect(res.statusCode).toBe(200);
      });
    });
  });
  
  describe('CORS Headers', () => {
    it('should include CORS headers in response', async () => {
      const req = createMockRequest({
        method: 'POST',
        headers: {
          origin: 'https://example.com',
        },
        body: {
          jsonrpc: '2.0',
          id: 30,
          method: 'a2a.mesh.cascade',
          params: {
            type: 'ucpt-cascade',
            ucpt: 'cors-test',
            sourceAid: 'aid://cors/test',
            tool: 'cors-tool',
            ttl: 1,
            timestamp: Date.now(),
          },
        },
      });
      const res = createMockResponse();
      
      await a2aHandler(req, res);
      
      expect(res.headers['access-control-allow-origin']).toBeDefined();
    });
  });
});
