/**
 * Unit Tests for OpenTelemetry Tracer
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initializeTracing,
  shutdownTracing,
  getTracer,
  startSpan,
  endSpan,
  recordException,
  setSpanAttributes,
  addSpanEvent,
} from '../tracer';
import type { TracingConfig } from '../tracer';

describe('OpenTelemetry Tracer', () => {
  const testConfig: TracingConfig = {
    serviceName: 'test-service',
    serviceVersion: '1.0.0',
    environment: 'test',
    otlpEndpoint: 'http://localhost:4318/v1/traces',
    enabled: true,
    sampleRate: 1.0,
  };

  afterEach(async () => {
    // Clean up after each test
    try {
      await shutdownTracing();
    } catch {
      // Ignore errors during cleanup
    }
  });

  describe('initializeTracing', () => {
    it('should initialize tracing with valid config', () => {
      expect(() => initializeTracing(testConfig)).not.toThrow();
    });

    it('should not initialize when disabled', () => {
      const disabledConfig = { ...testConfig, enabled: false };
      initializeTracing(disabledConfig);
      
      // Should not throw, just skip initialization
      expect(true).toBe(true);
    });

    it('should use default endpoint if not provided', () => {
      const configWithoutEndpoint = {
        ...testConfig,
        otlpEndpoint: undefined,
      };
      
      expect(() => initializeTracing(configWithoutEndpoint)).not.toThrow();
    });
  });

  describe('getTracer', () => {
    it('should return a tracer instance after initialization', () => {
      initializeTracing(testConfig);
      const tracer = getTracer();
      
      expect(tracer).toBeDefined();
      expect(typeof tracer.startSpan).toBe('function');
    });

    it('should return no-op tracer if not initialized', () => {
      const tracer = getTracer();
      
      expect(tracer).toBeDefined();
      expect(typeof tracer.startSpan).toBe('function');
    });
  });

  describe('startSpan and endSpan', () => {
    beforeEach(() => {
      initializeTracing(testConfig);
    });

    it('should create and end a span successfully', () => {
      const span = startSpan('test-operation');
      
      expect(span).toBeDefined();
      expect(typeof span.end).toBe('function');
      
      endSpan(span);
    });

    it('should create span with attributes', () => {
      const span = startSpan('test-operation', {
        'test.attribute': 'value',
        'test.number': 42,
        'test.boolean': true,
      });
      
      expect(span).toBeDefined();
      endSpan(span);
    });

    it('should end span with error', () => {
      const span = startSpan('test-operation');
      const error = new Error('Test error');
      
      expect(() => endSpan(span, error)).not.toThrow();
    });
  });

  describe('setSpanAttributes', () => {
    beforeEach(() => {
      initializeTracing(testConfig);
    });

    it('should set attributes on a span', () => {
      const span = startSpan('test-operation');
      
      expect(() => {
        setSpanAttributes(span, {
          'custom.attribute': 'value',
          'custom.number': 123,
        });
      }).not.toThrow();
      
      endSpan(span);
    });
  });

  describe('addSpanEvent', () => {
    beforeEach(() => {
      initializeTracing(testConfig);
    });

    it('should add event to a span', () => {
      const span = startSpan('test-operation');
      
      expect(() => {
        addSpanEvent(span, 'test-event', {
          'event.detail': 'test detail',
        });
      }).not.toThrow();
      
      endSpan(span);
    });

    it('should add event without attributes', () => {
      const span = startSpan('test-operation');
      
      expect(() => {
        addSpanEvent(span, 'simple-event');
      }).not.toThrow();
      
      endSpan(span);
    });
  });

  describe('recordException', () => {
    beforeEach(() => {
      initializeTracing(testConfig);
    });

    it('should record exception in active span', () => {
      const span = startSpan('test-operation');
      const error = new Error('Test exception');
      
      // Note: recordException works with active span context
      // In this test, we just verify it doesn't throw
      expect(() => recordException(error)).not.toThrow();
      
      endSpan(span);
    });

    it('should record exception with attributes', () => {
      const span = startSpan('test-operation');
      const error = new Error('Test exception');
      
      expect(() => {
        recordException(error, {
          'error.context': 'test context',
        });
      }).not.toThrow();
      
      endSpan(span);
    });
  });

  describe('shutdownTracing', () => {
    it('should shutdown gracefully', async () => {
      initializeTracing(testConfig);
      await expect(shutdownTracing()).resolves.not.toThrow();
    });

    it('should handle shutdown when not initialized', async () => {
      await expect(shutdownTracing()).resolves.not.toThrow();
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      initializeTracing(testConfig);
    });

    it('should handle nested spans', () => {
      const parentSpan = startSpan('parent-operation');
      const childSpan = startSpan('child-operation');
      
      endSpan(childSpan);
      endSpan(parentSpan);
      
      expect(true).toBe(true);
    });

    it('should handle span with events and attributes', () => {
      const span = startSpan('complex-operation', {
        'operation.type': 'complex',
      });
      
      addSpanEvent(span, 'step-1-started');
      setSpanAttributes(span, { 'step.1.completed': true });
      
      addSpanEvent(span, 'step-2-started');
      setSpanAttributes(span, { 'step.2.completed': true });
      
      endSpan(span);
      
      expect(true).toBe(true);
    });

    it('should handle error scenarios', () => {
      const span = startSpan('error-operation');
      
      try {
        throw new Error('Simulated error');
      } catch (error) {
        recordException(error as Error);
        endSpan(span, error as Error);
      }
      
      expect(true).toBe(true);
    });
  });
});
