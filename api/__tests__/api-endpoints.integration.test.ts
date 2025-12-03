/**
 * API Endpoints Integration Tests
 * Tests all API endpoints with real database connections
 * 
 * **Validates: Requirements 7.3**
 * **Property 35: API Integration Tests**
 * 
 * @vitest-environment node
 */

import './setup';
import { describe, it, expect, beforeAll } from 'vitest';
import { createMockRequest, createMockResponse, extractCookie, wait } from './helpers';
import { hasSupabase } from './setup';

// Import API handlers
import healthHandler from '../health';
import readyHandler from '../ready';
import capabilitiesHandler from '../capabilities';
import challengeHandler from '../challenge';
import handshakeHandler from '../handshake';
import csrfHandler from '../csrf';

// Skip tests if Supabase not configured
const describeIfSupabase = hasSupabase ? describe : describe.skip;

describe('API Endpoints Integration Tests', () => {
  describe('GET /api/health', () => {
    it('should return 200 with health status', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      
      await healthHandler(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.jsonData).toHaveProperty('status');
      expect(res.ended).toBe(true);
    });
    
    it('should reject non-GET methods', async () => {
      const req = createMockRequest({ method: 'POST' });
      const res = createMockResponse();
      
      await healthHandler(req, res);
      
      expect(res.statusCode).toBe(405);
      expect(res.jsonData).toHaveProperty('error');
      expect(res.jsonData.error).toContain('Method not allowed');
    });
    
    it('should return health check result structure', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      
      await healthHandler(req, res);
      
      expect(res.jsonData).toMatchObject({
        status: expect.any(String),
        timestamp: expect.any(Number),
      });
    });
  });
  
  describeIfSupabase('GET /api/ready', () => {
    it('should return readiness status', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      
      await readyHandler(req, res);
      
      expect([200, 503]).toContain(res.statusCode);
      expect(res.jsonData).toHaveProperty('status');
      expect(res.ended).toBe(true);
    });
    
    it('should reject non-GET methods', async () => {
      const req = createMockRequest({ method: 'POST' });
      const res = createMockResponse();
      
      await readyHandler(req, res);
      
      expect(res.statusCode).toBe(405);
      expect(res.jsonData).toHaveProperty('error');
    });
    
    it('should check database connectivity', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      
      await readyHandler(req, res);
      
      expect(res.jsonData).toHaveProperty('checks');
      if (res.jsonData.checks) {
        expect(res.jsonData.checks).toHaveProperty('database');
      }
    });
  });
  
  describe('GET /api/capabilities', () => {
    it('should return OpenAPI specification', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      
      await capabilitiesHandler(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.jsonData).toHaveProperty('openapi');
      expect(res.jsonData).toHaveProperty('info');
      expect(res.jsonData).toHaveProperty('paths');
      expect(res.ended).toBe(true);
    });
    
    it('should include CORS headers', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      
      await capabilitiesHandler(req, res);
      
      expect(res.headers['access-control-allow-origin']).toBe('*');
    });
    
    it('should include cache headers', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      
      await capabilitiesHandler(req, res);
      
      expect(res.headers['cache-control']).toContain('public');
    });
    
    it('should handle OPTIONS request', async () => {
      const req = createMockRequest({ method: 'OPTIONS' });
      const res = createMockResponse();
      
      await capabilitiesHandler(req, res);
      
      expect(res.statusCode).toBe(204);
    });
    
    it('should reject non-GET/OPTIONS methods', async () => {
      const req = createMockRequest({ method: 'POST' });
      const res = createMockResponse();
      
      await capabilitiesHandler(req, res);
      
      expect(res.statusCode).toBe(405);
    });
    
    it('should return valid OpenAPI 3.1 structure', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      
      await capabilitiesHandler(req, res);
      
      expect(res.jsonData.openapi).toBe('3.1.0');
      expect(res.jsonData.info).toMatchObject({
        title: expect.any(String),
        version: expect.any(String),
        description: expect.any(String),
      });
      expect(res.jsonData.paths).toBeDefined();
      expect(Object.keys(res.jsonData.paths).length).toBeGreaterThan(0);
    });
  });
  
  describe('GET /api/csrf', () => {
    it('should generate and return CSRF token', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      
      await csrfHandler(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.jsonData).toHaveProperty('csrfToken');
      expect(res.jsonData.csrfToken).toBeTruthy();
      expect(typeof res.jsonData.csrfToken).toBe('string');
      expect(res.ended).toBe(true);
    });
    
    it('should set CSRF token in cookie', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      
      await csrfHandler(req, res);
      
      const setCookie = res.headers['set-cookie'];
      expect(setCookie).toBeDefined();
      
      const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
      expect(cookieStr).toContain('csrf_token=');
      expect(cookieStr).toContain('HttpOnly');
      expect(cookieStr).toContain('SameSite=Strict');
    });
    
    it('should include token metadata', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      
      await csrfHandler(req, res);
      
      expect(res.jsonData).toMatchObject({
        csrfToken: expect.any(String),
        expiresIn: expect.any(Number),
        headerName: 'x-csrf-token',
        cookieName: 'csrf_token',
      });
    });
    
    it('should reject non-GET methods', async () => {
      const req = createMockRequest({ method: 'POST' });
      const res = createMockResponse();
      
      await csrfHandler(req, res);
      
      expect(res.statusCode).toBe(405);
      expect(res.jsonData).toHaveProperty('error');
    });
  });
  
  describe('GET /api/challenge', () => {
    it('should generate challenge for valid AID', async () => {
      const testAid = 'aid://test-agent/abc123';
      const req = createMockRequest({
        method: 'GET',
        query: { aid: testAid },
      });
      const res = createMockResponse();
      
      await challengeHandler(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.jsonData).toMatchObject({
        aid: testAid,
        challenge: expect.any(String),
        expiresIn: expect.any(Number),
        algorithm: 'Ed25519',
      });
      expect(res.ended).toBe(true);
    });
    
    it('should return challenge with proper format', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { aid: 'aid://test/123' },
      });
      const res = createMockResponse();
      
      await challengeHandler(req, res);
      
      expect(res.jsonData.challenge).toMatch(/^anoteroslogos:/);
      expect(res.jsonData.challenge.split(':')).toHaveLength(4);
    });
    
    it('should reject GET without AID parameter', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: {},
      });
      const res = createMockResponse();
      
      await challengeHandler(req, res);
      
      expect(res.statusCode).toBe(400);
    });
  });
  
  describe('POST /api/challenge', () => {
    it('should reject invalid signature', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: {
          aid: 'aid://test/123',
          challenge: 'anoteroslogos:test:challenge:nonce',
          publicKey: '0'.repeat(64),
          signature: '0'.repeat(128),
        },
      });
      const res = createMockResponse();
      
      await challengeHandler(req, res);
      
      expect(res.statusCode).toBe(401);
      expect(res.jsonData).toHaveProperty('error');
    });
    
    it('should reject expired challenge', async () => {
      // First get a challenge
      const getReq = createMockRequest({
        method: 'GET',
        query: { aid: 'aid://test/expired' },
      });
      const getRes = createMockResponse();
      
      await challengeHandler(getReq, getRes);
      const { challenge } = getRes.jsonData;
      
      // Wait for expiration (in real scenario, would be 5 minutes)
      // For testing, we'll just try with an old challenge
      const postReq = createMockRequest({
        method: 'POST',
        body: {
          aid: 'aid://different/123',
          challenge: 'anoteroslogos:old:challenge:nonce',
          publicKey: '0'.repeat(64),
          signature: '0'.repeat(128),
        },
      });
      const postRes = createMockResponse();
      
      await challengeHandler(postReq, postRes);
      
      expect(postRes.statusCode).toBe(401);
      expect(postRes.jsonData.error).toContain('expired');
    });
    
    it('should reject mismatched challenge', async () => {
      // Get challenge for one AID
      const getReq = createMockRequest({
        method: 'GET',
        query: { aid: 'aid://test/123' },
      });
      const getRes = createMockResponse();
      
      await challengeHandler(getReq, getRes);
      
      // Try to verify with different challenge
      const postReq = createMockRequest({
        method: 'POST',
        body: {
          aid: 'aid://test/123',
          challenge: 'anoteroslogos:wrong:challenge:nonce',
          publicKey: '0'.repeat(64),
          signature: '0'.repeat(128),
        },
      });
      const postRes = createMockResponse();
      
      await challengeHandler(postReq, postRes);
      
      expect(postRes.statusCode).toBe(401);
      expect(postRes.jsonData.error).toContain('mismatch');
    });
  });
  
  describe('POST /api/handshake', () => {
    it('should generate new agent identity', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { name: 'test-agent' },
      });
      const res = createMockResponse();
      
      await handshakeHandler(req, res);
      
      expect(res.statusCode).toBe(201);
      expect(res.jsonData).toMatchObject({
        status: 'identity_created',
        aid: expect.stringMatching(/^aid:\/\//),
        publicKey: expect.any(String),
        privateKey: expect.any(String),
        challenge: expect.any(String),
        algorithm: 'Ed25519',
      });
      expect(res.ended).toBe(true);
    });
    
    it('should generate challenge for existing AID', async () => {
      const testAid = 'aid://existing-agent/xyz789';
      const req = createMockRequest({
        method: 'POST',
        body: { aid: testAid },
      });
      const res = createMockResponse();
      
      await handshakeHandler(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.jsonData).toMatchObject({
        status: 'challenge_issued',
        aid: testAid,
        challenge: expect.any(String),
        expiresIn: 300,
        algorithm: 'Ed25519',
      });
    });
    
    it('should include security warning for new identity', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { name: 'secure-agent' },
      });
      const res = createMockResponse();
      
      await handshakeHandler(req, res);
      
      expect(res.jsonData.warning).toContain('private key');
      expect(res.jsonData.warning).toContain('once');
    });
    
    it('should generate valid Ed25519 key pair', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { name: 'crypto-agent' },
      });
      const res = createMockResponse();
      
      await handshakeHandler(req, res);
      
      expect(res.jsonData.publicKey).toHaveLength(64); // 32 bytes in hex
      expect(res.jsonData.privateKey).toHaveLength(64); // 32 bytes in hex
      expect(res.jsonData.publicKey).toMatch(/^[0-9a-f]+$/);
      expect(res.jsonData.privateKey).toMatch(/^[0-9a-f]+$/);
    });
  });
  
  describe('GET /api/handshake', () => {
    it('should return documentation', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      
      await handshakeHandler(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.jsonData).toHaveProperty('endpoint');
      expect(res.jsonData).toHaveProperty('description');
      expect(res.jsonData).toHaveProperty('flows');
      expect(res.ended).toBe(true);
    });
  });
  
  describe('Error Response Contracts', () => {
    it('should return consistent error format for 400 errors', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: {}, // Missing required 'aid' parameter
      });
      const res = createMockResponse();
      
      await challengeHandler(req, res);
      
      expect(res.statusCode).toBe(400);
      expect(res.jsonData).toHaveProperty('error');
      expect(typeof res.jsonData.error).toBe('string');
    });
    
    it('should return consistent error format for 401 errors', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: {
          aid: 'aid://test/123',
          challenge: 'invalid',
          publicKey: '0'.repeat(64),
          signature: '0'.repeat(128),
        },
      });
      const res = createMockResponse();
      
      await challengeHandler(req, res);
      
      expect(res.statusCode).toBe(401);
      expect(res.jsonData).toHaveProperty('error');
      expect(typeof res.jsonData.error).toBe('string');
    });
    
    it('should return consistent error format for 405 errors', async () => {
      const req = createMockRequest({ method: 'DELETE' });
      const res = createMockResponse();
      
      await healthHandler(req, res);
      
      expect(res.statusCode).toBe(405);
      expect(res.jsonData).toHaveProperty('error');
      expect(res.jsonData.error).toContain('Method not allowed');
    });
  });
  
  describe('Request/Response Contracts', () => {
    it('should handle JSON request bodies', async () => {
      const req = createMockRequest({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: { name: 'json-test' },
      });
      const res = createMockResponse();
      
      await handshakeHandler(req, res);
      
      expect(res.statusCode).toBe(201);
      expect(res.jsonData).toBeDefined();
    });
    
    it('should return JSON responses', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      
      await healthHandler(req, res);
      
      expect(res.jsonData).toBeDefined();
      expect(typeof res.jsonData).toBe('object');
    });
    
    it('should handle query parameters', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { aid: 'aid://test/query' },
      });
      const res = createMockResponse();
      
      await challengeHandler(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.jsonData.aid).toBe('aid://test/query');
    });
  });
});
