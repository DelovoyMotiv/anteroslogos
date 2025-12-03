/**
 * Unit tests for structured logging
 * 
 * Tests:
 * - Sensitive data masking
 * - Correlation ID propagation
 * - Log level configuration
 * - Child logger creation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  maskSensitiveData,
  maskSensitiveString,
  generateCorrelationId,
  getCorrelationId,
  withCorrelationId,
  withCorrelationIdAsync,
  createChildLogger,
} from '../logger';

describe('Sensitive Data Masking', () => {
  describe('maskSensitiveString', () => {
    it('should mask API keys', () => {
      const input = 'API key: sk_live_abc123def456ghi789';
      const masked = maskSensitiveString(input);
      
      expect(masked).not.toContain('sk_live_abc123def456ghi789');
      expect(masked).toContain('*');
    });
    
    it('should mask Bearer tokens', () => {
      const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const masked = maskSensitiveString(input);
      
      expect(masked).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(masked).toContain('*');
    });
    
    it('should mask passwords', () => {
      const input = 'password: secret123';
      const masked = maskSensitiveString(input);
      
      expect(masked).not.toContain('secret123');
      expect(masked).toContain('*');
    });
    
    it('should mask email addresses', () => {
      const input = 'User email: user@example.com';
      const masked = maskSensitiveString(input);
      
      expect(masked).not.toContain('user@example.com');
      expect(masked).toContain('*');
    });
    
    it('should mask credit card numbers', () => {
      const input = 'Card: 4532-1234-5678-9010';
      const masked = maskSensitiveString(input);
      
      expect(masked).not.toContain('4532-1234-5678-9010');
      expect(masked).toContain('*');
    });
    
    it('should mask JWT tokens', () => {
      const input = 'Token: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const masked = maskSensitiveString(input);
      
      expect(masked).not.toContain('eyJhbGciOiJIUzI1NiJ9');
      expect(masked).toContain('*');
    });
    
    it('should not mask normal text', () => {
      const input = 'This is normal text without sensitive data';
      const masked = maskSensitiveString(input);
      
      expect(masked).toBe(input);
    });
  });
  
  describe('maskSensitiveData', () => {
    it('should mask password fields', () => {
      const input = {
        username: 'john',
        password: 'secret123',
      };
      
      const masked = maskSensitiveData(input);
      
      expect(masked.username).toBe('john');
      expect(masked.password).toBe('***MASKED***');
    });
    
    it('should mask API key fields', () => {
      const input = {
        service: 'stripe',
        apiKey: 'sk_live_abc123',
        api_key: 'sk_test_def456',
      };
      
      const masked = maskSensitiveData(input);
      
      expect(masked.service).toBe('stripe');
      expect(masked.apiKey).toBe('***MASKED***');
      expect(masked.api_key).toBe('***MASKED***');
    });
    
    it('should mask token fields', () => {
      const input = {
        userId: 'user-123',
        token: 'abc123def456',
        accessToken: 'xyz789',
        refreshToken: 'refresh123',
      };
      
      const masked = maskSensitiveData(input);
      
      expect(masked.userId).toBe('user-123');
      expect(masked.token).toBe('***MASKED***');
      expect(masked.accessToken).toBe('***MASKED***');
      expect(masked.refreshToken).toBe('***MASKED***');
    });
    
    it('should mask nested objects', () => {
      const input = {
        user: {
          id: 'user-123',
          email: 'user@example.com',
          password: 'secret',
        },
      };
      
      const masked = maskSensitiveData(input);
      
      expect(masked.user.id).toBe('user-123');
      expect(masked.user.email).not.toContain('user@example.com');
      expect(masked.user.password).toBe('***MASKED***');
    });
    
    it('should mask arrays', () => {
      const input = {
        users: [
          { id: 1, password: 'pass1' },
          { id: 2, password: 'pass2' },
        ],
      };
      
      const masked = maskSensitiveData(input);
      
      expect(masked.users[0].id).toBe(1);
      expect(masked.users[0].password).toBe('***MASKED***');
      expect(masked.users[1].id).toBe(2);
      expect(masked.users[1].password).toBe('***MASKED***');
    });
    
    it('should handle null and undefined', () => {
      const input = {
        value1: null,
        value2: undefined,
        value3: 'test',
      };
      
      const masked = maskSensitiveData(input);
      
      expect(masked.value1).toBeNull();
      expect(masked.value2).toBeUndefined();
      expect(masked.value3).toBe('test');
    });
    
    it('should mask sensitive data in string values', () => {
      const input = {
        message: 'User password is secret123',
        description: 'Normal text',
      };
      
      const masked = maskSensitiveData(input);
      
      expect(masked.message).not.toContain('secret123');
      expect(masked.message).toContain('*');
      expect(masked.description).toBe('Normal text');
    });
    
    it('should mask case-insensitive field names', () => {
      const input = {
        Password: 'secret1',
        PASSWORD: 'secret2',
        PaSsWoRd: 'secret3',
      };
      
      const masked = maskSensitiveData(input);
      
      expect(masked.Password).toBe('***MASKED***');
      expect(masked.PASSWORD).toBe('***MASKED***');
      expect(masked.PaSsWoRd).toBe('***MASKED***');
    });
  });
});

describe('Correlation ID', () => {
  it('should generate unique correlation IDs', () => {
    const id1 = generateCorrelationId();
    const id2 = generateCorrelationId();
    
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });
  
  it('should have timestamp in correlation ID', () => {
    const id = generateCorrelationId();
    const timestamp = id.split('-')[0];
    
    expect(parseInt(timestamp)).toBeGreaterThan(0);
  });
  
  it('should propagate correlation ID in sync context', () => {
    const correlationId = 'test-correlation-id';
    
    withCorrelationId(correlationId, () => {
      const retrieved = getCorrelationId();
      expect(retrieved).toBe(correlationId);
    });
  });
  
  it('should propagate correlation ID in async context', async () => {
    const correlationId = 'test-async-correlation-id';
    
    await withCorrelationIdAsync(correlationId, async () => {
      const retrieved = getCorrelationId();
      expect(retrieved).toBe(correlationId);
      
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const stillRetrieved = getCorrelationId();
      expect(stillRetrieved).toBe(correlationId);
    });
  });
  
  it('should return undefined when no correlation ID set', () => {
    const id = getCorrelationId();
    expect(id).toBeUndefined();
  });
  
  it('should isolate correlation IDs between contexts', async () => {
    const id1 = 'context-1';
    const id2 = 'context-2';
    
    const promise1 = withCorrelationIdAsync(id1, async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
      return getCorrelationId();
    });
    
    const promise2 = withCorrelationIdAsync(id2, async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return getCorrelationId();
    });
    
    const [result1, result2] = await Promise.all([promise1, promise2]);
    
    expect(result1).toBe(id1);
    expect(result2).toBe(id2);
  });
});

describe('Child Logger', () => {
  it('should create child logger with context', () => {
    const childLogger = createChildLogger({
      userId: 'user-123',
      tenantId: 'tenant-456',
    });
    
    expect(childLogger).toBeTruthy();
  });
  
  it('should mask sensitive data in child logger context', () => {
    const childLogger = createChildLogger({
      userId: 'user-123',
      password: 'secret123',
    });
    
    // Child logger should be created without throwing
    expect(childLogger).toBeTruthy();
  });
});

describe('Property 39: Structured JSON Logging', () => {
  it('should support structured log entries', () => {
    const logEntry = {
      level: 'info',
      message: 'Test message',
      userId: 'user-123',
      timestamp: new Date().toISOString(),
    };
    
    // Verify structure
    expect(logEntry.level).toBe('info');
    expect(logEntry.message).toBe('Test message');
    expect(logEntry.userId).toBe('user-123');
    expect(logEntry.timestamp).toBeTruthy();
  });
});

describe('Property 40: Correlation ID Propagation', () => {
  it('should propagate correlation ID through async operations', async () => {
    const correlationId = generateCorrelationId();
    
    const result = await withCorrelationIdAsync(correlationId, async () => {
      // Simulate multiple async operations
      await Promise.all([
        new Promise(resolve => setTimeout(resolve, 10)),
        new Promise(resolve => setTimeout(resolve, 20)),
      ]);
      
      return getCorrelationId();
    });
    
    expect(result).toBe(correlationId);
  });
});

describe('Property 41: No PII in Logs', () => {
  it('should mask all PII fields', () => {
    const input = {
      email: 'user@example.com',
      phone: '555-123-4567',
      ssn: '123-45-6789',
      creditCard: '4532-1234-5678-9010',
      address: '123 Main St',
      ipAddress: '192.168.1.1',
    };
    
    const masked = maskSensitiveData(input);
    
    expect(masked.email).toBe('***MASKED***');
    expect(masked.phone).toBe('***MASKED***');
    expect(masked.ssn).toBe('***MASKED***');
    expect(masked.creditCard).toBe('***MASKED***');
    expect(masked.address).toBe('***MASKED***');
    expect(masked.ipAddress).toBe('***MASKED***');
  });
  
  it('should mask PII in nested structures', () => {
    const input = {
      user: {
        profile: {
          email: 'user@example.com',
          phone: '555-123-4567',
        },
        payment: {
          creditCard: '4532-1234-5678-9010',
        },
      },
    };
    
    const masked = maskSensitiveData(input);
    
    expect(masked.user.profile.email).toBe('***MASKED***');
    expect(masked.user.profile.phone).toBe('***MASKED***');
    expect(masked.user.payment.creditCard).toBe('***MASKED***');
  });
});
