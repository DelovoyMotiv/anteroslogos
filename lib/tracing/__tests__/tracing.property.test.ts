/**
 * Property-Based Tests for OpenTelemetry Tracing
 * 
 * Feature: production-audit-improvements, Property 45: Distributed Tracing
 * Validates: Requirements 8.4
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fc from 'fast-check';
import {
  initializeTracing,
  shutdownTracing,
  startSpan,
  endSpan,
  setSpanAttributes,
  addSpanEvent,
} from '../tracer';
import {
  withTracing,
  withTracingAsync,
  createSpan,
  propagateTraceContext,
} from '../middleware';
import type { TracingConfig } from '../tracer';

describe('Property-Based Tests: OpenTelemetry Tracing', () => {
  const testConfig: TracingConfig = {
    serviceName: 'test-service',
    serviceVersion: '1.0.0',
    environment: 'test',
    enabled: true,
  };

  beforeAll(() => {
    initializeTracing(testConfig);
  });

  afterAll(async () => {
    await shutdownTracing();
  });

  /**
   * Property 45: Distributed Tracing
   * 
   * For any external service call, it should create span with trace context propagation
   */
  describe('Property 45: Distributed Tracing', () => {
    it('should create span for any operation name', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (operationName) => {
            const span = startSpan(operationName);
            expect(span).toBeDefined();
            expect(typeof span.end).toBe('function');
            endSpan(span);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle any valid attributes', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.record({
            stringAttr: fc.string(),
            numberAttr: fc.integer(),
            booleanAttr: fc.boolean(),
          }),
          (operationName, attributes) => {
            const span = startSpan(operationName, attributes);
            expect(span).toBeDefined();
            endSpan(span);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should propagate trace context for any headers', () => {
      fc.assert(
        fc.property(
          fc.dictionary(
            fc.string({ minLength: 1, maxLength: 50 }),
            fc.string({ minLength: 0, maxLength: 100 })
          ),
          (headers) => {
            const propagatedHeaders = propagateTraceContext(headers);
            
            // Should return headers object
            expect(propagatedHeaders).toBeDefined();
            expect(typeof propagatedHeaders).toBe('object');
            
            // Original headers should be preserved
            for (const [key, value] of Object.entries(headers)) {
              expect(propagatedHeaders[key]).toBe(value);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should wrap any synchronous function successfully', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer(),
          (operationName, returnValue) => {
            const result = withTracing(operationName, () => returnValue);
            expect(result).toBe(returnValue);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should wrap any async function successfully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string(),
          async (operationName, returnValue) => {
            const result = await withTracingAsync(
              operationName,
              async () => returnValue
            );
            expect(result).toBe(returnValue);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle any error in traced function', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          (operationName, errorMessage) => {
            expect(() => {
              withTracing(operationName, () => {
                throw new Error(errorMessage);
              });
            }).toThrow(errorMessage);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle any error in async traced function', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (operationName, errorMessage) => {
            await expect(
              withTracingAsync(operationName, async () => {
                throw new Error(errorMessage);
              })
            ).rejects.toThrow(errorMessage);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create and end span with any attributes', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.dictionary(
            fc.string({ minLength: 1, maxLength: 30 }),
            fc.oneof(
              fc.string(),
              fc.integer(),
              fc.boolean()
            )
          ),
          (operationName, attributes) => {
            const { span, end } = createSpan(operationName, attributes);
            expect(span).toBeDefined();
            expect(typeof end).toBe('function');
            end();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should add any event to span', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (operationName, eventName) => {
            const span = startSpan(operationName);
            addSpanEvent(span, eventName);
            endSpan(span);
            expect(true).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should set any attributes on span', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.dictionary(
            fc.string({ minLength: 1, maxLength: 30 }),
            fc.oneof(fc.string(), fc.integer(), fc.boolean())
          ),
          (operationName, attributes) => {
            const span = startSpan(operationName);
            setSpanAttributes(span, attributes);
            endSpan(span);
            expect(true).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Trace Context Propagation Properties', () => {
    it('should preserve all original headers when propagating', () => {
      fc.assert(
        fc.property(
          fc.dictionary(
            fc.string({ minLength: 1, maxLength: 50 }),
            fc.string()
          ),
          (originalHeaders) => {
            const propagated = propagateTraceContext(originalHeaders);
            
            // All original headers should be present
            for (const [key, value] of Object.entries(originalHeaders)) {
              expect(propagated[key]).toBe(value);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not mutate original headers object', () => {
      fc.assert(
        fc.property(
          fc.dictionary(
            fc.string({ minLength: 1, maxLength: 50 }),
            fc.string()
          ),
          (originalHeaders) => {
            const headersCopy = { ...originalHeaders };
            propagateTraceContext(originalHeaders);
            
            // Original should be unchanged
            expect(originalHeaders).toEqual(headersCopy);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Error Handling Properties', () => {
    it('should always propagate errors from traced functions', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          (operationName, errorMessage) => {
            let errorThrown = false;
            let caughtMessage = '';
            
            try {
              withTracing(operationName, () => {
                throw new Error(errorMessage);
              });
            } catch (error) {
              errorThrown = true;
              caughtMessage = (error as Error).message;
            }
            
            expect(errorThrown).toBe(true);
            expect(caughtMessage).toBe(errorMessage);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always propagate errors from async traced functions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (operationName, errorMessage) => {
            let errorThrown = false;
            let caughtMessage = '';
            
            try {
              await withTracingAsync(operationName, async () => {
                throw new Error(errorMessage);
              });
            } catch (error) {
              errorThrown = true;
              caughtMessage = (error as Error).message;
            }
            
            expect(errorThrown).toBe(true);
            expect(caughtMessage).toBe(errorMessage);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Return Value Properties', () => {
    it('should always return the same value from traced sync function', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.anything(),
          (operationName, value) => {
            const result = withTracing(operationName, () => value);
            expect(result).toEqual(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always return the same value from traced async function', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.anything(),
          async (operationName, value) => {
            const result = await withTracingAsync(
              operationName,
              async () => value
            );
            expect(result).toEqual(value);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
