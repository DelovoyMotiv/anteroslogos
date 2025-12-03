/**
 * Integration tests for Sentry error tracking
 * 
 * Tests the complete error tracking flow with real Sentry SDK
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as Sentry from '@sentry/node';

// Mock Sentry for integration tests
vi.mock('@sentry/node', () => {
  const events: any[] = [];
  const users: any[] = [];
  const breadcrumbs: any[] = [];
  
  return {
    init: vi.fn(),
    captureException: vi.fn((error, context) => {
      const eventId = `event-${events.length}`;
      events.push({ error, context, eventId });
      return eventId;
    }),
    captureMessage: vi.fn((message, context) => {
      const eventId = `event-${events.length}`;
      events.push({ message, context, eventId });
      return eventId;
    }),
    setUser: vi.fn((user) => {
      users.push(user);
    }),
    addBreadcrumb: vi.fn((breadcrumb) => {
      breadcrumbs.push(breadcrumb);
    }),
    setTag: vi.fn(),
    setTags: vi.fn(),
    setExtra: vi.fn(),
    setExtras: vi.fn(),
    setContext: vi.fn(),
    startTransaction: vi.fn(() => ({
      startChild: vi.fn(() => ({
        finish: vi.fn(),
      })),
      finish: vi.fn(),
      setStatus: vi.fn(),
    })),
    flush: vi.fn(() => Promise.resolve(true)),
    close: vi.fn(() => Promise.resolve(true)),
    httpIntegration: vi.fn(),
    nativeNodeFetchIntegration: vi.fn(),
    expressIntegration: vi.fn(),
    Handlers: {
      requestHandler: vi.fn(() => (req: any, res: any, next: any) => next()),
      tracingHandler: vi.fn(() => (req: any, res: any, next: any) => next()),
      errorHandler: vi.fn(() => (err: any, req: any, res: any, next: any) => next(err)),
    },
    __events: events,
    __users: users,
    __breadcrumbs: breadcrumbs,
  };
});

describe('Sentry Error Tracking - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    (Sentry as any).__events.length = 0;
    (Sentry as any).__users.length = 0;
    (Sentry as any).__breadcrumbs.length = 0;
  });

  describe('Complete Error Tracking Flow', () => {
    it('should track error with user context and breadcrumbs', async () => {
      const { initSentry, setUserContext, addBreadcrumb, captureError } = await import('../sentry');
      
      // Initialize
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      });

      // Set user context
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
      };
      setUserContext(user);

      // Add breadcrumbs
      addBreadcrumb({
        type: 'navigation',
        category: 'navigation',
        message: 'User navigated to /dashboard',
      });

      addBreadcrumb({
        type: 'user',
        category: 'action',
        message: 'User clicked submit button',
        data: { formId: 'payment-form' },
      });

      // Capture error
      const error = new Error('Payment processing failed');
      const eventId = captureError(error, {
        tags: { feature: 'payment' },
        extra: { amount: 100, currency: 'USD' },
      });

      // Verify complete flow
      expect(Sentry.setUser).toHaveBeenCalledWith(user);
      expect(Sentry.addBreadcrumb).toHaveBeenCalledTimes(2);
      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: { feature: 'payment' },
          extra: { amount: 100, currency: 'USD' },
        })
      );
      expect(eventId).toBeTruthy();
    });

    it('should handle multiple errors in sequence', async () => {
      const { initSentry, captureError } = await import('../sentry');
      
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      });

      const errors = [
        new Error('Error 1'),
        new Error('Error 2'),
        new Error('Error 3'),
      ];

      const eventIds = errors.map(error => captureError(error));

      expect(eventIds).toHaveLength(3);
      expect(Sentry.captureException).toHaveBeenCalledTimes(3);
      eventIds.forEach(id => expect(id).toBeTruthy());
    });

    it('should clear user context on logout', async () => {
      const { initSentry, setUserContext } = await import('../sentry');
      
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      });

      // Set user
      setUserContext({
        id: 'user-123',
        email: 'test@example.com',
      });

      // Clear user
      setUserContext(null);

      expect(Sentry.setUser).toHaveBeenCalledTimes(2);
      expect(Sentry.setUser).toHaveBeenLastCalledWith(null);
    });
  });

  describe('Express Middleware Integration', () => {
    it('should provide request, tracing, and error middleware', async () => {
      const { 
        initSentry, 
        sentryRequestMiddleware, 
        sentryTracingMiddleware, 
        sentryErrorMiddleware 
      } = await import('../sentry');
      
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      });

      const requestMiddleware = sentryRequestMiddleware();
      const tracingMiddleware = sentryTracingMiddleware();
      const errorMiddleware = sentryErrorMiddleware();

      expect(requestMiddleware).toBeTypeOf('function');
      expect(tracingMiddleware).toBeTypeOf('function');
      expect(errorMiddleware).toBeTypeOf('function');
    });
  });

  describe('Performance Monitoring', () => {
    it('should track transaction with spans', async () => {
      const { initSentry, startTransaction } = await import('../sentry');
      
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      });

      const transaction = startTransaction('api.users.list', 'http.server');
      
      expect(transaction).toBeTruthy();
      expect(Sentry.startTransaction).toHaveBeenCalledWith({
        name: 'api.users.list',
        op: 'http.server',
      });

      // Start child span
      const span = transaction?.startChild({
        op: 'db.query',
        description: 'SELECT * FROM users',
      });

      span?.finish();
      transaction?.setStatus('ok');
      transaction?.finish();

      expect(span).toBeTruthy();
    });
  });

  describe('Error Wrapping', () => {
    it('should wrap async function and capture errors', async () => {
      const { initSentry, withErrorTracking } = await import('../sentry');
      
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      });

      const error = new Error('Async operation failed');
      const asyncFn = async () => {
        throw error;
      };

      const wrapped = withErrorTracking(asyncFn, {
        tags: { operation: 'test' },
      });

      await expect(wrapped()).rejects.toThrow('Async operation failed');
      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: { operation: 'test' },
        })
      );
    });

    it('should not interfere with successful operations', async () => {
      const { initSentry, withErrorTracking } = await import('../sentry');
      
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      });

      const asyncFn = async () => 'success';
      const wrapped = withErrorTracking(asyncFn);

      const result = await wrapped();

      expect(result).toBe('success');
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });
  });

  describe('Graceful Shutdown', () => {
    it('should flush and close on shutdown', async () => {
      const { initSentry, flush, close } = await import('../sentry');
      
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      });

      const flushResult = await flush(2000);
      const closeResult = await close(2000);

      expect(flushResult).toBe(true);
      expect(closeResult).toBe(true);
      expect(Sentry.flush).toHaveBeenCalledWith(2000);
      expect(Sentry.close).toHaveBeenCalledWith(2000);
    });
  });

  describe('Configuration Validation', () => {
    it('should handle missing DSN gracefully', async () => {
      const { initSentry, captureError } = await import('../sentry');
      
      // Initialize without DSN
      initSentry({
        dsn: '',
        environment: 'test',
      });

      // Should not crash
      const error = new Error('Test error');
      const eventId = captureError(error);

      expect(Sentry.init).not.toHaveBeenCalled();
      expect(eventId).toBe('');
    });

    it('should use default values for optional config', async () => {
      const { initSentry } = await import('../sentry');
      
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      });

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          sampleRate: 1.0,
          tracesSampleRate: 0.1,
          debug: false,
          attachStacktrace: true,
          autoSessionTracking: true,
          maxBreadcrumbs: 100,
        })
      );
    });
  });

  describe('Sensitive Data Filtering', () => {
    it('should filter sensitive headers', async () => {
      const { initSentry } = await import('../sentry');
      
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      });

      const initCall = (Sentry.init as any).mock.calls[0][0];
      const beforeSend = initCall.beforeSend;

      const event = {
        request: {
          headers: {
            authorization: 'Bearer secret-token',
            cookie: 'session=abc123',
            'x-api-key': 'api-key-123',
            'content-type': 'application/json',
          },
        },
      };

      const filtered = beforeSend(event, {});

      expect(filtered.request.headers.authorization).toBeUndefined();
      expect(filtered.request.headers.cookie).toBeUndefined();
      expect(filtered.request.headers['x-api-key']).toBeUndefined();
      expect(filtered.request.headers['content-type']).toBe('application/json');
    });

    it('should redact sensitive extra data', async () => {
      const { initSentry } = await import('../sentry');
      
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      });

      const initCall = (Sentry.init as any).mock.calls[0][0];
      const beforeSend = initCall.beforeSend;

      const event = {
        extra: {
          password: 'secret123',
          token: 'abc123',
          secret: 'my-secret',
          apiKey: 'key-123',
          privateKey: 'private-key',
          userId: 'user-123', // Should not be redacted
        },
      };

      const filtered = beforeSend(event, {});

      expect(filtered.extra.password).toBe('[REDACTED]');
      expect(filtered.extra.token).toBe('[REDACTED]');
      expect(filtered.extra.secret).toBe('[REDACTED]');
      expect(filtered.extra.apiKey).toBe('[REDACTED]');
      expect(filtered.extra.privateKey).toBe('[REDACTED]');
      expect(filtered.extra.userId).toBe('user-123');
    });
  });
});
