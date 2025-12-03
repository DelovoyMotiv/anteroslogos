/**
 * Property-Based Tests for API Validation
 * Validates correctness properties using fast-check
 * 
 * **Feature: production-audit-improvements, Property 6: Input Validation Coverage**
 * 
 * @module lib/validation/__tests__/validation.property.test.ts
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  AidSchema,
  Ed25519PublicKeySchema,
  Ed25519SignatureSchema,
  UrlSchema,
  JsonRpcRequestSchema,
  validateInput,
} from '../apiSchemas';

describe('Property-Based Validation Tests', () => {
  /**
   * Property 6: Input Validation Coverage
   * For any API endpoint accepting user input, all inputs should have Zod schema validation
   * Validates: Requirements 2.2
   */
  describe('Property 6: Input Validation Coverage', () => {
    it('should reject all invalid AID formats', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !s.match(/^aid:\/\/[a-z0-9-]+\/[a-f0-9]{12}$/)),
          (invalidAid) => {
            const result = validateInput(AidSchema, invalidAid);
            expect(result.success).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept all valid AID formats', () => {
      const hexChar = fc.constantFrom(...'0123456789abcdef'.split(''));
      const aidNameChar = fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split(''));
      
      const validAidGenerator = fc.tuple(
        fc.array(aidNameChar, { minLength: 1, maxLength: 32 }).map(arr => arr.join('')),
        fc.array(hexChar, { minLength: 12, maxLength: 12 }).map(arr => arr.join(''))
      ).map(([name, suffix]) => `aid://${name}/${suffix}`);

      fc.assert(
        fc.property(validAidGenerator, (validAid) => {
          const result = validateInput(AidSchema, validAid);
          expect(result.success).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject all invalid Ed25519 public keys', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => s.length !== 64 || !s.match(/^[a-f0-9]{64}$/)),
          (invalidKey) => {
            const result = validateInput(Ed25519PublicKeySchema, invalidKey);
            expect(result.success).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept all valid Ed25519 public keys', () => {
      const hexChar = fc.constantFrom(...'0123456789abcdef'.split(''));
      const validKeyGenerator = fc.array(hexChar, { minLength: 64, maxLength: 64 }).map(arr => arr.join(''));
      
      fc.assert(
        fc.property(
          validKeyGenerator,
          (validKey) => {
            const result = validateInput(Ed25519PublicKeySchema, validKey);
            expect(result.success).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject all invalid Ed25519 signatures', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => s.length !== 128 || !s.match(/^[a-f0-9]{128}$/)),
          (invalidSig) => {
            const result = validateInput(Ed25519SignatureSchema, invalidSig);
            expect(result.success).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept all valid Ed25519 signatures', () => {
      const hexChar = fc.constantFrom(...'0123456789abcdef'.split(''));
      const validSigGenerator = fc.array(hexChar, { minLength: 128, maxLength: 128 }).map(arr => arr.join(''));
      
      fc.assert(
        fc.property(
          validSigGenerator,
          (validSig) => {
            const result = validateInput(Ed25519SignatureSchema, validSig);
            expect(result.success).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject all invalid URLs', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => {
            try {
              new URL(s);
              return false;
            } catch {
              return true;
            }
          }),
          (invalidUrl) => {
            const result = validateInput(UrlSchema, invalidUrl);
            expect(result.success).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept all valid HTTP/HTTPS URLs under 2048 chars', () => {
      const validUrlGenerator = fc.tuple(
        fc.constantFrom('http', 'https'),
        fc.domain(),
        fc.option(fc.webPath(), { nil: '' })
      ).map(([protocol, domain, path]) => `${protocol}://${domain}${path}`);

      fc.assert(
        fc.property(validUrlGenerator, (validUrl) => {
          if (validUrl.length <= 2048) {
            const result = validateInput(UrlSchema, validUrl);
            expect(result.success).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should reject URLs longer than 2048 characters', () => {
      const longUrlGenerator = fc.tuple(
        fc.constantFrom('http', 'https'),
        fc.domain(),
        fc.string({ minLength: 2048 })
      ).map(([protocol, domain, path]) => `${protocol}://${domain}/${path}`);

      fc.assert(
        fc.property(longUrlGenerator, (longUrl) => {
          const result = validateInput(UrlSchema, longUrl);
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should validate JSON-RPC requests with any valid id type', () => {
      const validRequestGenerator = fc.record({
        jsonrpc: fc.constant('2.0' as const),
        id: fc.oneof(fc.string(), fc.integer()),
        method: fc.string({ minLength: 1, maxLength: 128 }),
        params: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
      });

      fc.assert(
        fc.property(validRequestGenerator, (request) => {
          const result = validateInput(JsonRpcRequestSchema, request);
          expect(result.success).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject JSON-RPC requests with invalid jsonrpc version', () => {
      const invalidRequestGenerator = fc.record({
        jsonrpc: fc.string().filter(s => s !== '2.0'),
        id: fc.oneof(fc.string(), fc.integer()),
        method: fc.string({ minLength: 1 }),
      });

      fc.assert(
        fc.property(invalidRequestGenerator, (request) => {
          const result = validateInput(JsonRpcRequestSchema, request);
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject JSON-RPC requests with empty method', () => {
      const invalidRequestGenerator = fc.record({
        jsonrpc: fc.constant('2.0' as const),
        id: fc.oneof(fc.string(), fc.integer()),
        method: fc.constant(''),
      });

      fc.assert(
        fc.property(invalidRequestGenerator, (request) => {
          const result = validateInput(JsonRpcRequestSchema, request);
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject JSON-RPC requests with method longer than 128 chars', () => {
      const invalidRequestGenerator = fc.record({
        jsonrpc: fc.constant('2.0' as const),
        id: fc.oneof(fc.string(), fc.integer()),
        method: fc.string({ minLength: 129 }),
      });

      fc.assert(
        fc.property(invalidRequestGenerator, (request) => {
          const result = validateInput(JsonRpcRequestSchema, request);
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Validation Consistency Properties', () => {
    it('should be deterministic - same input always produces same result', () => {
      fc.assert(
        fc.property(fc.anything(), (input) => {
          const result1 = validateInput(AidSchema, input);
          const result2 = validateInput(AidSchema, input);
          expect(result1.success).toBe(result2.success);
        }),
        { numRuns: 100 }
      );
    });

    it('should never throw exceptions - always return success or error', () => {
      fc.assert(
        fc.property(fc.anything(), (input) => {
          expect(() => {
            const result = validateInput(AidSchema, input);
            expect(result).toHaveProperty('success');
          }).not.toThrow();
        }),
        { numRuns: 100 }
      );
    });
  });
});
