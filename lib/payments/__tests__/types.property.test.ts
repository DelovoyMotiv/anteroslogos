/**
 * Property-based tests for payment types
 * Feature: production-audit-improvements, Property 34: Property-Based Tests for Pure Functions
 * Feature: production-audit-improvements, Property 38: Round-Trip Property Tests
 * Validates: Requirements 7.2, 7.5
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  toTokenUnits,
  fromTokenUnits,
  isValidAddress,
  isValidTxHash,
  generateInvoiceId,
  type Token,
} from '../types';

describe('Payment Types - Property-Based Tests', () => {
  describe('Token conversion round-trip', () => {
    it('should preserve value through toTokenUnits/fromTokenUnits round-trip for USDC', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1000000, noNaN: true }),
          (amount) => {
            // Round to 6 decimals (USDC precision)
            const roundedAmount = Math.round(amount * 1000000) / 1000000;
            
            const units = toTokenUnits(roundedAmount, 'USDC');
            const converted = fromTokenUnits(units, 'USDC');
            const parsedConverted = parseFloat(converted);
            
            // Should be equal within floating point precision
            expect(Math.abs(parsedConverted - roundedAmount)).toBeLessThan(0.000001);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Address validation', () => {
    it('should validate all properly formatted addresses', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 40, maxLength: 40 }).map(s => 
            s.split('').map(c => '0123456789abcdef'[Math.abs(c.charCodeAt(0)) % 16]).join('')
          ),
          (hexStr) => {
            const address = `0x${hexStr}`;
            const result = isValidAddress(address);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject addresses without 0x prefix', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 40, maxLength: 40 }).map(s => 
            s.split('').map(c => '0123456789abcdef'[Math.abs(c.charCodeAt(0)) % 16]).join('')
          ),
          (hexStr) => {
            const result = isValidAddress(hexStr);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject addresses with wrong length', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 39 }),
          (length) => {
            const hexStr = 'a'.repeat(length);
            const address = `0x${hexStr}`;
            const result = isValidAddress(address);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Transaction hash validation', () => {
    it('should validate all properly formatted tx hashes', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 64, maxLength: 64 }).map(s => 
            s.split('').map(c => '0123456789abcdef'[Math.abs(c.charCodeAt(0)) % 16]).join('')
          ),
          (hexStr) => {
            const txHash = `0x${hexStr}`;
            const result = isValidTxHash(txHash);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject tx hashes without 0x prefix', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 64, maxLength: 64 }).map(s => 
            s.split('').map(c => '0123456789abcdef'[Math.abs(c.charCodeAt(0)) % 16]).join('')
          ),
          (hexStr) => {
            const result = isValidTxHash(hexStr);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject tx hashes with wrong length', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 63 }),
          (length) => {
            const hexStr = 'a'.repeat(length);
            const txHash = `0x${hexStr}`;
            const result = isValidTxHash(txHash);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Invoice ID generation', () => {
    it('should generate unique invoice IDs', () => {
      fc.assert(
        fc.property(
          fc.constant(null),
          () => {
            const id1 = generateInvoiceId();
            const id2 = generateInvoiceId();
            
            // IDs should be different
            expect(id1).not.toBe(id2);
            
            // Both should match pattern
            expect(id1).toMatch(/^inv_[0-9A-HJKMNP-TV-Z]{26}$/);
            expect(id2).toMatch(/^inv_[0-9A-HJKMNP-TV-Z]{26}$/);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Token unit conversion properties', () => {
    it('should maintain order: if a > b then toTokenUnits(a) > toTokenUnits(b)', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.000001, max: 1000, noNaN: true }),
          fc.double({ min: 0.000001, max: 1000, noNaN: true }),
          (a, b) => {
            // Only test when difference is significant (> 1 micro-unit)
            if (Math.abs(a - b) > 0.000001) {
              const unitsA = toTokenUnits(a, 'USDC');
              const unitsB = toTokenUnits(b, 'USDC');
              
              if (a > b) {
                expect(unitsA).toBeGreaterThan(unitsB);
              } else {
                expect(unitsA).toBeLessThan(unitsB);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be additive: toTokenUnits(a + b) = toTokenUnits(a) + toTokenUnits(b)', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 500, noNaN: true }),
          fc.double({ min: 0, max: 500, noNaN: true }),
          (a, b) => {
            // Round to USDC precision
            const roundedA = Math.round(a * 1000000) / 1000000;
            const roundedB = Math.round(b * 1000000) / 1000000;
            const roundedSum = Math.round((roundedA + roundedB) * 1000000) / 1000000;
            
            const unitsSum = toTokenUnits(roundedSum, 'USDC');
            const unitsA = toTokenUnits(roundedA, 'USDC');
            const unitsB = toTokenUnits(roundedB, 'USDC');
            
            expect(unitsSum).toBe(unitsA + unitsB);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle zero: toTokenUnits(0) = 0', () => {
      fc.assert(
        fc.property(
          fc.constant(0),
          (zero) => {
            const units = toTokenUnits(zero, 'USDC');
            expect(units).toBe(0n);
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
