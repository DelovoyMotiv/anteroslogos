/**
 * Unit Tests for API Validation Schemas
 * Tests all Zod schemas for comprehensive input validation
 * 
 * @module lib/validation/__tests__/apiSchemas.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  AidSchema,
  Ed25519PublicKeySchema,
  Ed25519SignatureSchema,
  ChallengeSchema,
  UrlSchema,
  JsonRpcRequestSchema,
  UCPTCascadeMessageSchema,
  HandshakeRequestSchema,
  ChallengeGetSchema,
  ChallengeVerifySchema,
  PublicAidCreateSchema,
  ProgrammaticExecutionSchema,
  McpToolsCallParamsSchema,
  validateInput,
  formatValidationError,
} from '../apiSchemas';

describe('API Validation Schemas', () => {
  describe('AidSchema', () => {
    it('should accept valid AID format', () => {
      const result = validateInput(AidSchema, 'aid://my-agent/abc123456789');
      expect(result.success).toBe(true);
    });

    it('should reject invalid AID format', () => {
      const result = validateInput(AidSchema, 'invalid-aid');
      expect(result.success).toBe(false);
    });

    it('should reject AID with wrong suffix length', () => {
      const result = validateInput(AidSchema, 'aid://agent/abc');
      expect(result.success).toBe(false);
    });
  });

  describe('Ed25519PublicKeySchema', () => {
    it('should accept valid 64-char hex public key', () => {
      const validKey = 'a'.repeat(64);
      const result = validateInput(Ed25519PublicKeySchema, validKey);
      expect(result.success).toBe(true);
    });

    it('should reject non-hex characters', () => {
      const invalidKey = 'g'.repeat(64);
      const result = validateInput(Ed25519PublicKeySchema, invalidKey);
      expect(result.success).toBe(false);
    });

    it('should reject wrong length', () => {
      const result = validateInput(Ed25519PublicKeySchema, 'abc123');
      expect(result.success).toBe(false);
    });
  });

  describe('Ed25519SignatureSchema', () => {
    it('should accept valid 128-char hex signature', () => {
      const validSig = 'a'.repeat(128);
      const result = validateInput(Ed25519SignatureSchema, validSig);
      expect(result.success).toBe(true);
    });

    it('should reject wrong length', () => {
      const result = validateInput(Ed25519SignatureSchema, 'a'.repeat(64));
      expect(result.success).toBe(false);
    });
  });

  describe('ChallengeSchema', () => {
    it('should accept valid challenge format', () => {
      const validChallenge = 'anoteroslogos:abc123:' + 'a'.repeat(32) + ':' + 'b'.repeat(16);
      const result = validateInput(ChallengeSchema, validChallenge);
      expect(result.success).toBe(true);
    });

    it('should reject invalid challenge format', () => {
      const result = validateInput(ChallengeSchema, 'invalid-challenge');
      expect(result.success).toBe(false);
    });
  });

  describe('UrlSchema', () => {
    it('should accept valid HTTPS URL', () => {
      const result = validateInput(UrlSchema, 'https://example.com');
      expect(result.success).toBe(true);
    });

    it('should accept valid HTTP URL', () => {
      const result = validateInput(UrlSchema, 'http://example.com');
      expect(result.success).toBe(true);
    });

    it('should reject invalid URL', () => {
      const result = validateInput(UrlSchema, 'not-a-url');
      expect(result.success).toBe(false);
    });

    it('should reject URL that is too long', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(3000);
      const result = validateInput(UrlSchema, longUrl);
      expect(result.success).toBe(false);
    });
  });

  describe('JsonRpcRequestSchema', () => {
    it('should accept valid JSON-RPC request', () => {
      const validRequest = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'test.method',
        params: { key: 'value' },
      };
      const result = validateInput(JsonRpcRequestSchema, validRequest);
      expect(result.success).toBe(true);
    });

    it('should accept request without params', () => {
      const validRequest = {
        jsonrpc: '2.0' as const,
        id: 'test-id',
        method: 'test.method',
      };
      const result = validateInput(JsonRpcRequestSchema, validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject request with wrong jsonrpc version', () => {
      const invalidRequest = {
        jsonrpc: '1.0',
        id: 1,
        method: 'test.method',
      };
      const result = validateInput(JsonRpcRequestSchema, invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject request without method', () => {
      const invalidRequest = {
        jsonrpc: '2.0',
        id: 1,
      };
      const result = validateInput(JsonRpcRequestSchema, invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('UCPTCascadeMessageSchema', () => {
    it('should accept valid cascade message', () => {
      const validMessage = {
        type: 'ucpt-cascade' as const,
        ucpt: 'test-token',
        sourceAid: 'aid://agent/abc123456789',
        tool: 'test-tool',
        ttl: 5,
        timestamp: Date.now(),
      };
      const result = validateInput(UCPTCascadeMessageSchema, validMessage);
      expect(result.success).toBe(true);
    });

    it('should reject message with invalid TTL', () => {
      const invalidMessage = {
        type: 'ucpt-cascade' as const,
        ucpt: 'test-token',
        sourceAid: 'aid://agent/abc123456789',
        tool: 'test-tool',
        ttl: 10, // Max is 7
        timestamp: Date.now(),
      };
      const result = validateInput(UCPTCascadeMessageSchema, invalidMessage);
      expect(result.success).toBe(false);
    });

    it('should reject message with negative TTL', () => {
      const invalidMessage = {
        type: 'ucpt-cascade' as const,
        ucpt: 'test-token',
        sourceAid: 'aid://agent/abc123456789',
        tool: 'test-tool',
        ttl: -1,
        timestamp: Date.now(),
      };
      const result = validateInput(UCPTCascadeMessageSchema, invalidMessage);
      expect(result.success).toBe(false);
    });
  });

  describe('HandshakeRequestSchema', () => {
    it('should accept new agent request', () => {
      const result = validateInput(HandshakeRequestSchema, {
        name: 'my-agent',
        description: 'Test agent',
      });
      expect(result.success).toBe(true);
    });

    it('should accept get challenge request', () => {
      const result = validateInput(HandshakeRequestSchema, {
        aid: 'aid://agent/abc123456789',
      });
      expect(result.success).toBe(true);
    });

    it('should accept verify signature request', () => {
      const result = validateInput(HandshakeRequestSchema, {
        aid: 'aid://agent/abc123456789',
        publicKey: 'a'.repeat(64),
        challenge: 'anoteroslogos:abc:' + 'a'.repeat(32) + ':' + 'b'.repeat(16),
        signature: 'a'.repeat(128),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('ProgrammaticExecutionSchema', () => {
    it('should accept valid code execution request', () => {
      const result = validateInput(ProgrammaticExecutionSchema, {
        code: 'console.log("test")',
        language: 'javascript',
        timeout: 5000,
      });
      expect(result.success).toBe(true);
    });

    it('should use default language', () => {
      const result = validateInput(ProgrammaticExecutionSchema, {
        code: 'console.log("test")',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.language).toBe('javascript');
      }
    });

    it('should reject code that is too long', () => {
      const result = validateInput(ProgrammaticExecutionSchema, {
        code: 'a'.repeat(200000),
      });
      expect(result.success).toBe(false);
    });

    it('should reject timeout that is too long', () => {
      const result = validateInput(ProgrammaticExecutionSchema, {
        code: 'console.log("test")',
        timeout: 60000,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('McpToolsCallParamsSchema', () => {
    it('should accept valid tool call', () => {
      const result = validateInput(McpToolsCallParamsSchema, {
        name: 'test-tool',
        arguments: { key: 'value' },
      });
      expect(result.success).toBe(true);
    });

    it('should use default empty arguments', () => {
      const result = validateInput(McpToolsCallParamsSchema, {
        name: 'test-tool',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.arguments).toEqual({});
      }
    });

    it('should reject tool name that is too long', () => {
      const result = validateInput(McpToolsCallParamsSchema, {
        name: 'a'.repeat(200),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('formatValidationError', () => {
    it('should format validation errors correctly', () => {
      const result = validateInput(JsonRpcRequestSchema, {
        jsonrpc: '1.0',
        id: 1,
      });
      
      if (!result.success) {
        const formatted = formatValidationError(result.error);
        expect(formatted.message).toBe('Validation failed');
        expect(formatted.errors).toBeInstanceOf(Array);
        expect(formatted.errors.length).toBeGreaterThan(0);
        expect(formatted.errors[0]).toHaveProperty('path');
        expect(formatted.errors[0]).toHaveProperty('message');
      }
    });
  });
});
