/**
 * Property-based tests for structured logging
 * 
 * **Feature: production-audit-improvements, Property 39: Structured JSON Logging**
 * **Feature: production-audit-improvements, Property 40: Correlation ID Propagation**
 * **Feature: production-audit-improvements, Property 41: No PII in Logs**
 * **Validates: Requirements 8.1**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  maskSensitiveData,
  maskSensitiveString,
  generateCorrelationId,
  getCorrelationId,
  withCorrelationId,
  withCorrelationIdAsync,
} from '../logger';

describe('Property 39: Structured JSON Logging', () => {
  it('should preserve non-sensitive data structure', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string(),
          name: fc.string(),
          count: fc.integer(),
          active: fc.boolean(),
        }),
        (data) => {
          const masked = maskSensitiveData(data);
          
          // Non-sensitive fields should be preserved
          expect(masked.id).toBe(data.id);
          expect(masked.name).toBe(data.name);
          expect(masked.count).toBe(data.count);
          expect(masked.active).toBe(data.active);
        }
      ),
      { numRuns: 20 }
    );
  });
  
  it('should handle deeply nested objects', () => {
    fc.assert(
      fc.property(
        fc.object({ maxDepth: 5 }),
        (data) => {
          // Should not throw
          const masked = maskSensitiveData(data);
          expect(masked).toBeDefined();
        }
      ),
      { numRuns: 20 }
    );
  });
  
  it('should handle arrays of any length', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          id: fc.string(),
          value: fc.integer(),
        })),
        (data) => {
          const masked = maskSensitiveData(data);
          
          expect(Array.isArray(masked)).toBe(true);
          expect(masked.length).toBe(data.length);
        }
      ),
      { numRuns: 20 }
    );
  });
});

describe('Property 40: Correlation ID Propagation', () => {
  it('should always propagate correlation ID in sync context', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (correlationId) => {
          let retrieved: string | undefined;
          
          withCorrelationId(correlationId, () => {
            retrieved = getCorrelationId();
          });
          
          expect(retrieved).toBe(correlationId);
        }
      ),
      { numRuns: 20 }
    );
  });
  
  it('should always propagate correlation ID in async context', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        async (correlationId) => {
          const retrieved = await withCorrelationIdAsync(correlationId, async () => {
            // Simulate async work
            await new Promise(resolve => setTimeout(resolve, 1));
            return getCorrelationId();
          });
          
          expect(retrieved).toBe(correlationId);
        }
      ),
      { numRuns: 20 }
    );
  });
  
  it('should generate unique correlation IDs', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          const id1 = generateCorrelationId();
          const id2 = generateCorrelationId();
          
          // IDs should be different (extremely high probability)
          expect(id1).not.toBe(id2);
        }
      ),
      { numRuns: 20 }
    );
  });
  
  it('should maintain correlation ID through nested async operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.integer({ min: 1, max: 5 }),
        async (correlationId, depth) => {
          const nestedAsync = async (level: number): Promise<string | undefined> => {
            if (level === 0) {
              return getCorrelationId();
            }
            await new Promise(resolve => setTimeout(resolve, 1));
            return nestedAsync(level - 1);
          };
          
          const result = await withCorrelationIdAsync(correlationId, async () => {
            return nestedAsync(depth);
          });
          
          expect(result).toBe(correlationId);
        }
      ),
      { numRuns: 20 }
    );
  });
});

describe('Property 41: No PII in Logs', () => {
  it('should always mask password fields regardless of value', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (password) => {
          const data = { password };
          const masked = maskSensitiveData(data);
          
          expect(masked.password).toBe('***MASKED***');
          expect(masked.password).not.toBe(password);
        }
      ),
      { numRuns: 20 }
    );
  });
  
  it('should always mask apiKey fields regardless of value', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (apiKey) => {
          const data = { apiKey };
          const masked = maskSensitiveData(data);
          
          expect(masked.apiKey).toBe('***MASKED***');
          expect(masked.apiKey).not.toBe(apiKey);
        }
      ),
      { numRuns: 20 }
    );
  });
  
  it('should always mask token fields regardless of value', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (token) => {
          const data = { token };
          const masked = maskSensitiveData(data);
          
          expect(masked.token).toBe('***MASKED***');
          expect(masked.token).not.toBe(token);
        }
      ),
      { numRuns: 20 }
    );
  });
  
  it('should mask sensitive fields in objects of any structure', () => {
    fc.assert(
      fc.property(
        fc.object(),
        fc.string(),
        (obj, sensitiveValue) => {
          // Add sensitive field
          const data = { ...obj, password: sensitiveValue };
          const masked = maskSensitiveData(data);
          
          // Password should always be masked
          expect(masked.password).toBe('***MASKED***');
        }
      ),
      { numRuns: 20 }
    );
  });
  
  it('should not leak sensitive data in string masking', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z0-9_-]{20,50}$/),
        (apiKey) => {
          const input = `API key: ${apiKey}`;
          const masked = maskSensitiveString(input);
          
          // Original API key should not appear in masked string
          expect(masked).not.toContain(apiKey);
        }
      ),
      { numRuns: 20 }
    );
  });
  
  it('should preserve non-sensitive fields while masking sensitive ones', () => {
    fc.assert(
      fc.property(
        fc.record({
          userId: fc.string(),
          username: fc.string(),
          password: fc.string(),
          email: fc.string(),
        }),
        (data) => {
          const masked = maskSensitiveData(data);
          
          // Non-sensitive fields preserved
          expect(masked.userId).toBe(data.userId);
          expect(masked.username).toBe(data.username);
          
          // Sensitive fields masked
          expect(masked.password).toBe('***MASKED***');
          expect(masked.email).toBe('***MASKED***');
        }
      ),
      { numRuns: 20 }
    );
  });
  
  it('should handle mixed arrays with sensitive data', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string(),
            password: fc.string(),
          })
        ),
        (data) => {
          const masked = maskSensitiveData(data);
          
          // All passwords should be masked
          for (let i = 0; i < masked.length; i++) {
            expect(masked[i].password).toBe('***MASKED***');
            expect(masked[i].id).toBe(data[i].id);
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});

describe('Masking Invariants', () => {
  it('should never return original sensitive values', () => {
    fc.assert(
      fc.property(
        fc.record({
          password: fc.string({ minLength: 1 }),
          apiKey: fc.string({ minLength: 1 }),
          token: fc.string({ minLength: 1 }),
        }),
        (data) => {
          const masked = maskSensitiveData(data);
          
          // None of the original sensitive values should appear
          expect(masked.password).not.toBe(data.password);
          expect(masked.apiKey).not.toBe(data.apiKey);
          expect(masked.token).not.toBe(data.token);
        }
      ),
      { numRuns: 20 }
    );
  });
  
  it('should be idempotent - masking twice gives same result', () => {
    fc.assert(
      fc.property(
        fc.record({
          username: fc.string(),
          password: fc.string(),
        }),
        (data) => {
          const masked1 = maskSensitiveData(data);
          const masked2 = maskSensitiveData(masked1);
          
          expect(masked2).toEqual(masked1);
        }
      ),
      { numRuns: 20 }
    );
  });
  
  it('should preserve object structure', () => {
    fc.assert(
      fc.property(
        fc.object({ maxDepth: 3 }),
        (data) => {
          const masked = maskSensitiveData(data);
          
          // Should have same keys
          expect(Object.keys(masked).sort()).toEqual(Object.keys(data).sort());
        }
      ),
      { numRuns: 20 }
    );
  });
});
