/**
 * Property-Based Tests for JWT Authentication
 * Feature: production-audit-improvements, Property 4: JWT Short TTL
 * Validates: Requirements 2.4
 * 
 * Tests universal properties that should hold for all JWT tokens
 */

/**
 * Property-Based Tests for JWT Authentication
 * Feature: production-audit-improvements, Property 4: JWT Short TTL
 * Validates: Requirements 2.4
 * 
 * Tests universal properties that should hold for all JWT tokens
 * 
 * @vitest-environment node
 */

import './setup'; // Load environment variables first
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  generateAccessToken,
  verifyAccessToken,
  decodeAccessToken,
  validateTokenTTL,
} from '../jwtAuth';

describe('JWT Property-Based Tests', () => {
  describe('Property 4: JWT Short TTL', () => {
    it('should always generate tokens with TTL <= 15 minutes', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.emailAddress(),
          fc.option(fc.constantFrom('admin', 'user', 'moderator'), { nil: undefined }),
          (userId, email, role) => {
            const token = generateAccessToken(userId, email, role);
            const decoded = decodeAccessToken(token);
            
            expect(decoded).toBeDefined();
            
            const ttl = decoded!.exp - decoded!.iat;
            
            // Property: TTL must be exactly 900 seconds (15 minutes)
            expect(ttl).toBe(900);
            
            // Property: TTL must be <= 15 minutes
            expect(ttl).toBeLessThanOrEqual(900);
            
            // Property: validateTokenTTL should return true
            expect(validateTokenTTL(token)).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should always have exp > iat', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.emailAddress(),
          (userId, email) => {
            const token = generateAccessToken(userId, email);
            const decoded = decodeAccessToken(token);
            
            expect(decoded).toBeDefined();
            
            // Property: Expiration must be after issuance
            expect(decoded!.exp).toBeGreaterThan(decoded!.iat);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should always have exp in the future at generation time', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.emailAddress(),
          (userId, email) => {
            const beforeGeneration = Math.floor(Date.now() / 1000);
            const token = generateAccessToken(userId, email);
            const decoded = decodeAccessToken(token);
            
            expect(decoded).toBeDefined();
            
            // Property: Token should not be expired immediately after generation
            expect(decoded!.exp).toBeGreaterThan(beforeGeneration);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Token Generation Properties', () => {
    it('should always generate valid JWT structure (3 parts)', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.emailAddress(),
          (userId, email) => {
            const token = generateAccessToken(userId, email);
            
            // Property: JWT must have exactly 3 parts separated by dots
            const parts = token.split('.');
            expect(parts).toHaveLength(3);
            
            // Property: Each part must be non-empty
            expect(parts[0].length).toBeGreaterThan(0);
            expect(parts[1].length).toBeGreaterThan(0);
            expect(parts[2].length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should always include userId and email in payload', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.emailAddress(),
          (userId, email) => {
            const token = generateAccessToken(userId, email);
            const decoded = decodeAccessToken(token);
            
            // Property: Payload must contain userId and email
            expect(decoded).toBeDefined();
            expect(decoded!.userId).toBe(userId);
            expect(decoded!.email).toBe(email);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should preserve role when provided', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.emailAddress(),
          fc.constantFrom('admin', 'user', 'moderator', 'guest'),
          (userId, email, role) => {
            const token = generateAccessToken(userId, email, role);
            const decoded = decodeAccessToken(token);
            
            // Property: Role must be preserved in token
            expect(decoded).toBeDefined();
            expect(decoded!.role).toBe(role);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Token Verification Properties', () => {
    it('should always verify tokens it generates', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.emailAddress(),
          fc.option(fc.constantFrom('admin', 'user'), { nil: undefined }),
          (userId, email, role) => {
            const token = generateAccessToken(userId, email, role);
            const result = verifyAccessToken(token);
            
            // Property: Generated tokens must be valid
            expect(result.valid).toBe(true);
            expect(result.payload).toBeDefined();
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should always preserve payload data through verification', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.emailAddress(),
          (userId, email) => {
            const token = generateAccessToken(userId, email);
            const result = verifyAccessToken(token);
            
            // Property: Verification must preserve original data
            expect(result.valid).toBe(true);
            expect(result.payload?.userId).toBe(userId);
            expect(result.payload?.email).toBe(email);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should always reject tampered tokens', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.emailAddress(),
          fc.integer({ min: 1, max: 10 }),
          (userId, email, tamperLength) => {
            const token = generateAccessToken(userId, email);
            
            // Tamper with the signature
            const tamperedToken = token.slice(0, -tamperLength) + 'X'.repeat(tamperLength);
            
            const result = verifyAccessToken(tamperedToken);
            
            // Property: Tampered tokens must be rejected
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Token Uniqueness Properties', () => {
    it('should generate tokens with timestamp-based uniqueness', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.emailAddress(),
          (userId, email) => {
            const token1 = generateAccessToken(userId, email);
            const decoded1 = decodeAccessToken(token1);
            const token2 = generateAccessToken(userId, email);
            const decoded2 = decodeAccessToken(token2);
            
            // Property: Tokens generated in the same second will have same iat
            // This is expected JWT behavior (second-level precision)
            // If iat is same, tokens will be identical
            // If iat is different, tokens will be different
            if (decoded1!.iat === decoded2!.iat) {
              expect(token1).toBe(token2);
            } else {
              expect(token1).not.toBe(token2);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should generate different tokens for different users', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.uuid(),
          fc.emailAddress(),
          fc.emailAddress(),
          (userId1, userId2, email1, email2) => {
            fc.pre(userId1 !== userId2); // Ensure different users
            
            const token1 = generateAccessToken(userId1, email1);
            const token2 = generateAccessToken(userId2, email2);
            
            // Property: Different users must have different tokens
            expect(token1).not.toBe(token2);
            
            const decoded1 = decodeAccessToken(token1);
            const decoded2 = decodeAccessToken(token2);
            
            expect(decoded1?.userId).not.toBe(decoded2?.userId);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Token Decode Properties', () => {
    it('should always decode valid tokens', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.emailAddress(),
          (userId, email) => {
            const token = generateAccessToken(userId, email);
            const decoded = decodeAccessToken(token);
            
            // Property: Valid tokens must be decodable
            expect(decoded).not.toBeNull();
            expect(decoded).toBeDefined();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should decode without requiring verification', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.emailAddress(),
          (userId, email) => {
            const token = generateAccessToken(userId, email);
            
            // Change secret to make verification fail
            const originalSecret = process.env.JWT_SECRET;
            process.env.JWT_SECRET = 'different-secret';
            
            // Property: Decode should work even if verification would fail
            const decoded = decodeAccessToken(token);
            expect(decoded).toBeDefined();
            expect(decoded?.userId).toBe(userId);
            
            // Restore secret
            process.env.JWT_SECRET = originalSecret;
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('TTL Validation Properties', () => {
    it('should validate all generated tokens have correct TTL', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.emailAddress(),
          (userId, email) => {
            const token = generateAccessToken(userId, email);
            
            // Property: All generated tokens must pass TTL validation
            expect(validateTokenTTL(token)).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should reject tokens with invalid structure', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (invalidToken) => {
            fc.pre(!invalidToken.includes('.')); // Ensure it's not JWT-like
            
            // Property: Invalid tokens must fail TTL validation
            expect(validateTokenTTL(invalidToken)).toBe(false);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
