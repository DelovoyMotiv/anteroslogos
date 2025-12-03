/**
 * Unit Tests for JWT Authentication
 * Tests access token generation, verification, and TTL validation
 */

/**
 * Unit Tests for JWT Authentication
 * Tests access token generation, verification, and TTL validation
 * 
 * @vitest-environment node
 */

import './setup'; // Load environment variables first
import { describe, it, expect, beforeAll, vi } from 'vitest';
import {
  generateAccessToken,
  verifyAccessToken,
  decodeAccessToken,
  validateTokenTTL,
} from '../jwtAuth';

describe('JWT Access Token', () => {
  describe('generateAccessToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateAccessToken('user-123', 'test@example.com');
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include userId and email in payload', () => {
      const token = generateAccessToken('user-123', 'test@example.com');
      const decoded = decodeAccessToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe('user-123');
      expect(decoded?.email).toBe('test@example.com');
    });

    it('should include optional role in payload', () => {
      const token = generateAccessToken('user-123', 'test@example.com', 'admin');
      const decoded = decodeAccessToken(token);
      
      expect(decoded?.role).toBe('admin');
    });

    it('should include iat and exp timestamps', () => {
      const token = generateAccessToken('user-123', 'test@example.com');
      const decoded = decodeAccessToken(token);
      
      expect(decoded?.iat).toBeDefined();
      expect(decoded?.exp).toBeDefined();
      expect(decoded!.exp).toBeGreaterThan(decoded!.iat);
    });

    it('should throw error if JWT_SECRET not configured', () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;
      
      expect(() => {
        generateAccessToken('user-123', 'test@example.com');
      }).toThrow('JWT_SECRET not configured');
      
      // Restore secret for other tests
      process.env.JWT_SECRET = originalSecret;
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid token', () => {
      const token = generateAccessToken('user-123', 'test@example.com');
      const result = verifyAccessToken(token);
      
      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.userId).toBe('user-123');
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid token', () => {
      const result = verifyAccessToken('invalid.token.here');
      
      expect(result.valid).toBe(false);
      expect(result.payload).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it('should reject token with wrong signature', () => {
      const token = generateAccessToken('user-123', 'test@example.com');
      const tamperedToken = token.slice(0, -5) + 'XXXXX';
      
      const result = verifyAccessToken(tamperedToken);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token');
    });

    it('should return error if JWT_SECRET not configured', () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;
      
      const result = verifyAccessToken('some.token.here');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('JWT_SECRET not configured');
      
      // Restore secret for other tests
      process.env.JWT_SECRET = originalSecret;
    });
  });

  describe('decodeAccessToken', () => {
    it('should decode token without verification', () => {
      const token = generateAccessToken('user-123', 'test@example.com', 'admin');
      const decoded = decodeAccessToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe('user-123');
      expect(decoded?.email).toBe('test@example.com');
      expect(decoded?.role).toBe('admin');
    });

    it('should return null for invalid token', () => {
      const decoded = decodeAccessToken('not-a-valid-token');
      
      expect(decoded).toBeNull();
    });
  });

  describe('validateTokenTTL - Property 4: JWT Short TTL', () => {
    it('should validate token has 15 minute TTL', () => {
      const token = generateAccessToken('user-123', 'test@example.com');
      
      expect(validateTokenTTL(token)).toBe(true);
    });

    it('should validate TTL is exactly 15 minutes (900 seconds)', () => {
      const token = generateAccessToken('user-123', 'test@example.com');
      const decoded = decodeAccessToken(token);
      
      expect(decoded).toBeDefined();
      const ttl = decoded!.exp - decoded!.iat;
      expect(ttl).toBe(900); // 15 minutes = 900 seconds
    });

    it('should return false for token without expiration', () => {
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0In0.test';
      
      expect(validateTokenTTL(invalidToken)).toBe(false);
    });

    it('should return false for invalid token', () => {
      expect(validateTokenTTL('invalid-token')).toBe(false);
    });
  });
});

describe('Token Expiration', () => {
  it('should generate token that expires in future', () => {
    const token = generateAccessToken('user-123', 'test@example.com');
    const decoded = decodeAccessToken(token);
    
    expect(decoded).toBeDefined();
    const now = Math.floor(Date.now() / 1000);
    expect(decoded!.exp).toBeGreaterThan(now);
  });

  it('should generate token with iat in past or present', () => {
    const token = generateAccessToken('user-123', 'test@example.com');
    const decoded = decodeAccessToken(token);
    
    expect(decoded).toBeDefined();
    const now = Math.floor(Date.now() / 1000);
    expect(decoded!.iat).toBeLessThanOrEqual(now + 1); // Allow 1 second clock skew
  });

  it('should have exp exactly 15 minutes after iat', () => {
    const token = generateAccessToken('user-123', 'test@example.com');
    const decoded = decodeAccessToken(token);
    
    expect(decoded).toBeDefined();
    const expectedExp = decoded!.iat + 900; // 15 minutes
    expect(decoded!.exp).toBe(expectedExp);
  });
});

describe('Token Security', () => {
  it('should generate different tokens for same user', async () => {
    const token1 = generateAccessToken('user-123', 'test@example.com');
    // Wait 1 second to ensure different iat timestamp
    await new Promise(resolve => setTimeout(resolve, 1000));
    const token2 = generateAccessToken('user-123', 'test@example.com');
    
    expect(token1).not.toBe(token2);
  });

  it('should generate different tokens for different users', () => {
    const token1 = generateAccessToken('user-123', 'test1@example.com');
    const token2 = generateAccessToken('user-456', 'test2@example.com');
    
    expect(token1).not.toBe(token2);
    
    const decoded1 = decodeAccessToken(token1);
    const decoded2 = decodeAccessToken(token2);
    
    expect(decoded1?.userId).not.toBe(decoded2?.userId);
  });

  it('should not accept token signed with different secret', () => {
    const token = generateAccessToken('user-123', 'test@example.com');
    
    // Change secret
    process.env.JWT_SECRET = 'different-secret';
    
    const result = verifyAccessToken(token);
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid token');
  });
});
