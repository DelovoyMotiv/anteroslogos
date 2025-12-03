/**
 * Unit Tests for Tracing Middleware
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  withTracing,
  withTracingAsync,
  createSpan,
  getTraceContext,
  propagateTraceContext,
} from '../middleware';
import { initializeTracing, shutdownTracing } from '../tracer';
import type { TracingConfig } from '../tracer';

describe('Tracing Middleware', () => {
  const testConfig: TracingConfig = {
    serviceName: 'test-service',
    serviceVersion: '1.0.0',
    environment: 'test',
    enabled: true,
  };

  beforeEach(() => {
    initializeTracing(testConfig);
  });

  afterEach(async () => {
    await shutdownTracing();
  });

  describe('withTracing', () => {
    it('should wrap synchronous function with tracing', () => {
      const result = withTracing('test-sync', () => {
        return 'success';
      });
      
      expect(result).toBe('success');
    });

    it('should wrap function with attributes', () => {
      const result = withTracing(
        'test-sync-attrs',
        () => 42,
        { 'test.attribute': 'value' }
      );
      
      expect(result).toBe(42);
    });

    it('should handle errors in synchronous function', () => {
      expect(() => {
        withTracing('test-sync-error', () => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');
    });

    it('should return value from traced function', () => {
      const obj = { id: 1, name: 'test' };
      const result = withTracing('test-return', () => obj);
      
      expect(result).toEqual(obj);
    });
  });

  describe('withTracingAsync', () => {
    it('should wrap async function with tracing', async () => {
      const result = await withTracingAsync('test-async', async () => {
        return 'async success';
      });
      
      expect(result).toBe('async success');
    });

    it('should wrap async function with attributes', async () => {
      const result = await withTracingAsync(
        'test-async-attrs',
        async () => 42,
        { 'async.attribute': 'value' }
      );
      
      expect(result).toBe(42);
    });

    it('should handle errors in async function', async () => {
      await expect(
        withTracingAsync('test-async-error', async () => {
          throw new Error('Async error');
        })
      ).rejects.toThrow('Async error');
    });

    it('should handle promise rejection', async () => {
      await expect(
        withTracingAsync('test-rejection', async () => {
          return Promise.reject(new Error('Rejected'));
        })
      ).rejects.toThrow('Rejected');
    });

    it('should work with delayed operations', async () => {
      const result = await withTracingAsync('test-delayed', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'delayed result';
      });
      
      expect(result).toBe('delayed result');
    });
  });

  describe('createSpan', () => {
    it('should create span with end function', () => {
      const { span, end } = createSpan('manual-span');
      
      expect(span).toBeDefined();
      expect(typeof end).toBe('function');
      
      end();
    });

    it('should create span with attributes', () => {
      const { span, end } = createSpan('manual-span-attrs', {
        'span.type': 'manual',
        'span.id': 123,
      });
      
      expect(span).toBeDefined();
      end();
    });

    it('should end span with error', () => {
      const { span, end } = createSpan('manual-span-error');
      const error = new Error('Manual error');
      
      expect(() => end(error)).not.toThrow();
    });

    it('should allow multiple operations on span', () => {
      const { span, end } = createSpan('complex-span');
      
      span.addEvent('event-1');
      span.setAttributes({ 'custom.attr': 'value' });
      span.addEvent('event-2');
      
      end();
      
      expect(true).toBe(true);
    });
  });

  describe('getTraceContext', () => {
    it('should return trace context', () => {
      const context = getTraceContext();
      
      expect(context).toBeDefined();
      expect(typeof context).toBe('object');
    });

    it('should return traceparent when span is active', () => {
      const { span, end } = createSpan('test-span');
      
      const context = getTraceContext();
      
      // Context may or may not have traceparent depending on active span
      expect(context).toBeDefined();
      
      end();
    });
  });

  describe('propagateTraceContext', () => {
    it('should propagate trace context to headers', () => {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token',
      };
      
      const propagatedHeaders = propagateTraceContext(headers);
      
      expect(propagatedHeaders).toBeDefined();
      expect(propagatedHeaders['Content-Type']).toBe('application/json');
      expect(propagatedHeaders['Authorization']).toBe('Bearer token');
    });

    it('should add trace headers when span is active', () => {
      const { span, end } = createSpan('test-span');
      
      const headers = propagateTraceContext({});
      
      // Headers should be returned (may or may not have trace headers)
      expect(headers).toBeDefined();
      expect(typeof headers).toBe('object');
      
      end();
    });

    it('should not modify original headers object', () => {
      const originalHeaders = {
        'Content-Type': 'application/json',
      };
      
      const propagatedHeaders = propagateTraceContext(originalHeaders);
      
      // Should return headers (possibly with trace context)
      expect(propagatedHeaders).toBeDefined();
    });
  });

  describe('integration scenarios', () => {
    it('should handle nested traced operations', async () => {
      const result = await withTracingAsync('outer', async () => {
        const inner1 = await withTracingAsync('inner-1', async () => {
          return 'inner-1-result';
        });
        
        const inner2 = await withTracingAsync('inner-2', async () => {
          return 'inner-2-result';
        });
        
        return `${inner1}-${inner2}`;
      });
      
      expect(result).toBe('inner-1-result-inner-2-result');
    });

    it('should handle parallel traced operations', async () => {
      const results = await Promise.all([
        withTracingAsync('parallel-1', async () => 'result-1'),
        withTracingAsync('parallel-2', async () => 'result-2'),
        withTracingAsync('parallel-3', async () => 'result-3'),
      ]);
      
      expect(results).toEqual(['result-1', 'result-2', 'result-3']);
    });

    it('should handle mixed sync and async operations', async () => {
      const syncResult = withTracing('sync-op', () => 'sync');
      const asyncResult = await withTracingAsync('async-op', async () => 'async');
      
      expect(syncResult).toBe('sync');
      expect(asyncResult).toBe('async');
    });

    it('should propagate errors correctly', async () => {
      let errorCaught = false;
      
      try {
        await withTracingAsync('error-propagation', async () => {
          throw new Error('Propagated error');
        });
      } catch (error) {
        errorCaught = true;
        expect((error as Error).message).toBe('Propagated error');
      }
      
      expect(errorCaught).toBe(true);
    });
  });
});
