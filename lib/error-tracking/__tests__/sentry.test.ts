/**
 * Unit tests for Sentry error tracking
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as Sentry from '@sentry/node';

// Mock Sentry
vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  captureException: vi.fn(() => 'event-id-123'),
  captureMessage: vi.fn(() => 'event-id-456'),
  setUser: vi.fn(),
  addBreadcrumb: vi.fn(),
  setTag: vi.fn(),
  setTags: vi.fn(),
  setExtra: vi.fn(),
  setExtras: vi.fn(),
  setContext: vi.fn(),
  startTransaction: vi.fn(() => ({
    finish: vi.fn(),
    setStatus: vi.fn(),
  })),
  flush: vi.fn(() => Promise.resolve(true)),
  close: vi.fn(() => Promise.resolve(true)),
  httpIntegration: vi.fn(),
  nativeNodeFetchIntegration: vi.fn(),
  expressIntegration: vi.fn(),
  Handlers: {
    requestHandler: vi.fn(() => vi.fn()),
    tracingHandler: vi.fn(() => vi.fn()),
    errorHandler: vi.fn(() => vi.fn()),
  },
}));

describe('Sentry Error Tracking', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('initSentry', () => {
    it('should initialize Sentry with correct configuration', async () => {
      const { initSentry } = await import('../sentry');
      
      const config = {
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
        release: 'v1.0.0',
        sampleRate: 1.0,
        tracesSampleRate: 0.1,
      };

      initSentry(config);

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: config.dsn,
          environment: config.environment,
          release: config.release,
          sampleRate: config.sampleRate,
          tracesSampleRate: config.tracesSampleRate,
        })
      );
    });

    it('should not initialize if DSN is missing', async () => {
      const { initSentry } = await import('../sentry');
      
      const config = {
        dsn: '',
        environment: 'test',
      };

      initSentry(config);

      expect(Sentry.init).not.toHaveBeenCalled();
    });

    it('should only initialize once', async () => {
      const { initSentry } = await import('../sentry');
      
      const config = {
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      };

      initSentry(config);
      initSentry(config);

      expect(Sentry.init).toHaveBeenCalledTimes(1);
    });

    it('should filter sensitive data in beforeSend', async () => {
      const { initSentry } = await import('../sentry');
      
      const config = {
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      };

      initSentry(config);

      const initCall = (Sentry.init as any).mock.calls[0][0];
      const beforeSend = initCall.beforeSend;

      const event = {
        request: {
          headers: {
            authorization: 'Bearer token',
            cookie: 'session=123',
            'x-api-key': 'secret',
          },
        },
        extra: {
          password: 'secret123',
          token: 'abc123',
        },
      };

      const filtered = beforeSend(event, {});

      expect(filtered.request.headers.authorization).toBeUndefined();
      expect(filtered.request.headers.cookie).toBeUndefined();
      expect(filtered.request.headers['x-api-key']).toBeUndefined();
      expect(filtered.extra.password).toBe('[REDACTED]');
      expect(filtered.extra.token).toBe('[REDACTED]');
    });
  });

  describe('captureError', () => {
    it('should capture error with context', async () => {
      const { initSentry, captureError } = await import('../sentry');
      
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      });

      const error = new Error('Test error');
      const context = {
        tags: { feature: 'test' },
        extra: { userId: '123' },
        level: 'error' as const,
      };

      const eventId = captureError(error, context);

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          level: 'error',
          tags: { feature: 'test' },
          extra: { userId: '123' },
        })
      );
      expect(eventId).toBe('event-id-123');
    });

    it('should not capture if not initialized', async () => {
      // Import fresh module without initialization
      vi.resetModules();
      const { captureError } = await import('../sentry');

      const error = new Error('Test error');
      const eventId = captureError(error);

      expect(Sentry.captureException).not.toHaveBeenCalled();
      expect(eventId).toBe('');
    });
  });

  describe('captureMessage', () => {
    it('should capture message with level', async () => {
      const { initSentry, captureMessage } = await import('../sentry');
      
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      });

      const eventId = captureMessage('Test message', 'info');

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'Test message',
        expect.objectContaining({
          level: 'info',
        })
      );
      expect(eventId).toBe('event-id-456');
    });
  });

  describe('setUserContext', () => {
    it('should set user context', async () => {
      const { initSentry, setUserContext } = await import('../sentry');
      
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      });

      const user = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
      };

      setUserContext(user);

      expect(Sentry.setUser).toHaveBeenCalledWith(user);
    });

    it('should clear user context when null', async () => {
      const { initSentry, setUserContext } = await import('../sentry');
      
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      });

      setUserContext(null);

      expect(Sentry.setUser).toHaveBeenCalledWith(null);
    });
  });

  describe('addBreadcrumb', () => {
    it('should add breadcrumb', async () => {
      const { initSentry, addBreadcrumb } = await import('../sentry');
      
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      });

      const breadcrumb = {
        type: 'user' as const,
        category: 'action',
        message: 'User clicked button',
        level: 'info' as const,
      };

      addBreadcrumb(breadcrumb);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(breadcrumb);
    });
  });

  describe('setTag and setExtra', () => {
    it('should set single tag', async () => {
      const { initSentry, setTag } = await import('../sentry');
      
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      });

      setTag('feature', 'test');

      expect(Sentry.setTag).toHaveBeenCalledWith('feature', 'test');
    });

    it('should set multiple tags', async () => {
      const { initSentry, setTags } = await import('../sentry');
      
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      });

      const tags = { feature: 'test', version: '1.0' };
      setTags(tags);

      expect(Sentry.setTags).toHaveBeenCalledWith(tags);
    });

    it('should set extra data', async () => {
      const { initSentry, setExtra } = await import('../sentry');
      
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      });

      setExtra('userId', '123');

      expect(Sentry.setExtra).toHaveBeenCalledWith('userId', '123');
    });
  });

  describe('flush and close', () => {
    it('should flush pending events', async () => {
      const { initSentry, flush } = await import('../sentry');
      
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      });

      const result = await flush(2000);

      expect(Sentry.flush).toHaveBeenCalledWith(2000);
      expect(result).toBe(true);
    });

    it('should close Sentry client', async () => {
      const { initSentry, close } = await import('../sentry');
      
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      });

      const result = await close(2000);

      expect(Sentry.close).toHaveBeenCalledWith(2000);
      expect(result).toBe(true);
    });
  });

  describe('withErrorTracking', () => {
    it('should wrap function and capture errors', async () => {
      const { initSentry, withErrorTracking } = await import('../sentry');
      
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      });

      const error = new Error('Test error');
      const fn = vi.fn().mockRejectedValue(error);
      const wrapped = withErrorTracking(fn, {
        tags: { operation: 'test' },
      });

      await expect(wrapped()).rejects.toThrow('Test error');
      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: { operation: 'test' },
        })
      );
    });

    it('should not interfere with successful execution', async () => {
      const { initSentry, withErrorTracking } = await import('../sentry');
      
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      });

      const fn = vi.fn().mockResolvedValue('success');
      const wrapped = withErrorTracking(fn);

      const result = await wrapped();

      expect(result).toBe('success');
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });
  });
});
