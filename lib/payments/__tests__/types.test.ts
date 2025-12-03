/**
 * Unit tests for payment types and utility functions
 * Property 31: Minimum Test Coverage
 * Property 32: Critical Path Coverage
 * Validates: Requirements 7.1
 */

import { describe, it, expect } from 'vitest';
import {
  isPaymentTokenSupported,
  generateInvoiceId,
  toTokenUnits,
  fromTokenUnits,
  isValidAddress,
  isValidTxHash,
  type Token,
} from '../types';

describe('Payment Types', () => {
  describe('isPaymentTokenSupported', () => {
    it('should return true for USDC', () => {
      expect(isPaymentTokenSupported('USDC')).toBe(true);
    });

    it('should return false for ETH', () => {
      expect(isPaymentTokenSupported('ETH')).toBe(false);
    });
  });

  describe('generateInvoiceId', () => {
    it('should generate invoice ID with inv_ prefix', () => {
      const id = generateInvoiceId();
      expect(id).toMatch(/^inv_[0-9A-HJKMNP-TV-Z]{26}$/);
    });

    it('should generate unique IDs', () => {
      const id1 = generateInvoiceId();
      const id2 = generateInvoiceId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('toTokenUnits', () => {
    it('should convert USDC amount to 6 decimal units', () => {
      expect(toTokenUnits(1, 'USDC')).toBe(1000000n);
      expect(toTokenUnits(0.5, 'USDC')).toBe(500000n);
      expect(toTokenUnits(0.10, 'USDC')).toBe(100000n);
    });

    it('should handle zero amount', () => {
      expect(toTokenUnits(0, 'USDC')).toBe(0n);
    });

    it('should handle very small amounts', () => {
      expect(toTokenUnits(0.000001, 'USDC')).toBe(1n);
    });
  });

  describe('fromTokenUnits', () => {
    it('should convert USDC units to decimal string', () => {
      expect(fromTokenUnits(1000000n, 'USDC')).toBe('1.000000');
      expect(fromTokenUnits(500000n, 'USDC')).toBe('0.500000');
      expect(fromTokenUnits(100000n, 'USDC')).toBe('0.100000');
    });

    it('should handle zero units', () => {
      expect(fromTokenUnits(0n, 'USDC')).toBe('0.000000');
    });

    it('should handle single unit', () => {
      expect(fromTokenUnits(1n, 'USDC')).toBe('0.000001');
    });
  });

  describe('toTokenUnits/fromTokenUnits round-trip', () => {
    it('should preserve value through round-trip conversion', () => {
      const amounts = [0, 0.1, 0.5, 1, 10, 100, 1000];
      
      for (const amount of amounts) {
        const units = toTokenUnits(amount, 'USDC');
        const converted = fromTokenUnits(units, 'USDC');
        expect(parseFloat(converted)).toBeCloseTo(amount, 6);
      }
    });
  });

  describe('isValidAddress', () => {
    it('should return true for valid Ethereum address', () => {
      expect(isValidAddress('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913')).toBe(true);
      expect(isValidAddress('0x0000000000000000000000000000000000000000')).toBe(true);
    });

    it('should return false for invalid addresses', () => {
      expect(isValidAddress('0x123')).toBe(false);
      expect(isValidAddress('not-an-address')).toBe(false);
      expect(isValidAddress('')).toBe(false);
      expect(isValidAddress('833589fCD6eDb6E08f4c7C32D4f71b54bdA02913')).toBe(false); // missing 0x
    });
  });

  describe('isValidTxHash', () => {
    it('should return true for valid transaction hash', () => {
      const validHash = '0x' + 'a'.repeat(64);
      expect(isValidTxHash(validHash)).toBe(true);
    });

    it('should return false for invalid hashes', () => {
      expect(isValidTxHash('0x123')).toBe(false);
      expect(isValidTxHash('not-a-hash')).toBe(false);
      expect(isValidTxHash('')).toBe(false);
      expect(isValidTxHash('a'.repeat(64))).toBe(false); // missing 0x
    });
  });
});
