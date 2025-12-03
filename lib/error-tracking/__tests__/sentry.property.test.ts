/**
 * Property-based tests for Sentry error tracking
 * 
 * **Feature: production-audit-improvements, Property 46: Error Tracking Integration**
 * **Validates: Requirements 8.5**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import * as Sentry from '@sentry/node';

// Mock Sentry
vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  captureException: vi.fn((error) => `event-${Math.random()}`),
  captureMessage: vi.fn((msg) => `event-${Math.random()}`),
  setUser: vi.fn(),
  addBreadcrumb: vi.fn(),
  setTag: vi.fn(),
  setTags: vi.fn(),
  setExtra: vi.fn(),
  setExtras: vi.fn(),
  setContext: vi.fn(),
  flush: vi.fn(() => Promise.resolve(true)),
  close: vi.fn(() => Promise.resolve(true)),
  httpIntegration: vi.fn(),
  nativeNodeFetchIntegration: vi.fn(),
  expressIntegration: vi.fn(),
}));

describe('Sentry Error Tracking - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  /**
   * Property 46: Error Tracking Integration
   * 
   * For any unhandled error, it should be sent to Sentry with user context
   */
  describe('Property 46: Error Tracking Integration', () => {
    it('should capture any error type with context', async () => {
      const { initSentry, captureError } = await import('../sentry');
      
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      });

      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.string().map(msg => new Error(msg)),
            fc.string().map(msg => new TypeError(msg)),
            fc.string().map(msg => new RangeError(msg)),
            fc.record({
              message: fc.string(),
              code: fc.string(),
              statusCode: fc.integer({ min: 400, max: 599 }),
            }).map(data => Object.assign(new Error(data.message), data))
          ),
          fc.record({
            tags: fc.dictionary(fc.string(), fc.string()),
            extra: fc.dictionary(fc.string(), fc.anything()),
            level: fc.constantFrom('fatal', 'error', 'warning', 'info', 'debug'),
          }).map(ctx => ({ ...ctx, level: ctx.level as any })),
          async (error, context) => {
            const eventId = captureError(error, context);
            
            // Should return non-empty event ID
            expect(eventId).toBeTruthy();
            expect(typeof eventId).toBe('string');
            
            // Should call Sentry.captureException
            expect(Sentry.captureException).toHaveBeenCalledWith(
              error,
              expect.objectContaining({
                level: context.level,
                tags: context.tags,
                extra: context.extra,
              })
            );
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should set user context for any valid user data', async () => {
      const { initSentry, setUserContext } = await import('../sentry');
      
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      });

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.string(),
            email: fc.emailAddress(),
            username: fc.string(),
            ip_address: fc.ipV4(),
          }),
          async (user) => {
            setUserContext(user);
            
            // Should call Sentry.setUser with user data
            expect(Sentry.setUser).toHaveBeenCalledWith(user);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should add breadcrumbs for any valid breadcrumb data', async () => {
      const { initSentry, addBreadcrumb } = await import('../sentry');
      
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      });

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            type: fc.constantFrom('default', 'debug', 'error', 'navigation', 'http', 'info', 'query', 'transaction', 'ui', 'user'),
            level: fc.constantFrom('fatal', 'error', 'warning', 'log', 'info', 'debug'),
            message: fc.string(),
            category: fc.string(),
            data: fc.dictionary(fc.string(), fc.anything()),
          }).map(b => ({ ...b, type: b.type as any, level: b.level as any })),
          async (breadcrumb) => {
            addBreadcrumb(breadcrumb);
            
            // Should call Sentry.addBreadcrumb
            expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(breadcrumb);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should filter sensitive data from any error context', async () => {
      const { initSentry } = await import('../sentry');
      
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      });

      const initCall = (Sentry.init as any).mock.calls[0][0];
      const beforeSend = initCall.beforeSend;

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            request: fc.record({
              headers: fc.dictionary(
                fc.constantFrom('authorization', 'cookie', 'x-api-key', 'content-type'),
                fc.string()
              ),
            }),
            extra: fc.dictionary(
              fc.constantFrom('password', 'token', 'secret', 'apiKey', 'data'),
              fc.string()
            ),
          }),
          async (event) => {
            const filtered = beforeSend(event, {});
            
            // Sensitive headers should be removed
            expect(filtered.request?.headers?.authorization).toBeUndefined();
            expect(filtered.request?.headers?.cookie).toBeUndefined();
            expect(filtered.request?.headers?.['x-api-key']).toBeUndefined();
            
            // Sensitive extra data should be redacted
            if ('password' in event.extra) {
              expect(filtered.extra.password).toBe('[REDACTED]');
            }
            if ('token' in event.extra) {
              expect(filtered.extra.token).toBe('[REDACTED]');
            }
            if ('secret' in event.extra) {
              expect(filtered.extra.secret).toBe('[REDACTED]');
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle concurrent error captures', async () => {
      const { initSentry, captureError } = await import('../sentry');
      
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      });

      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string().map(msg => new Error(msg)), { minLength: 1, maxLength: 10 }),
          async (errors) => {
            // Capture all errors concurrently
            const eventIds = await Promise.all(
              errors.map(error => Promise.resolve(captureError(error)))
            );
            
            // All should return event IDs
            expect(eventIds).toHaveLength(errors.length);
            eventIds.forEach(id => {
              expect(id).toBeTruthy();
              expect(typeof id).toBe('string');
            });
            
            // All errors should be captured
            expect(Sentry.captureException).toHaveBeenCalledTimes(errors.length);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should preserve error properties when capturing', async () => {
      const { initSentry, captureError } = await import('../sentry');
      
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      });

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            message: fc.string(),
            name: fc.string(),
            stack: fc.string(),
            code: fc.string(),
            statusCode: fc.integer({ min: 400, max: 599 }),
          }),
          async (errorData) => {
            const error = Object.assign(new Error(errorData.message), errorData);
            
            captureError(error);
            
            // Should capture the error with all properties
            const capturedError = (Sentry.captureException as any).mock.calls[0][0];
            expect(capturedError.message).toBe(errorData.message);
            expect(capturedError.name).toBe(errorData.name);
            expect(capturedError.code).toBe(errorData.code);
            expect(capturedError.statusCode).toBe(errorData.statusCode);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle tags and extra data of any type', async () => {
      const { initSentry, captureError } = await import('../sentry');
      
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
      });

      await fc.assert(
        fc.asyncProperty(
          fc.string().map(msg => new Error(msg)),
          fc.dictionary(fc.string(), fc.string()),
          fc.dictionary(fc.string(), fc.oneof(
            fc.string(),
            fc.integer(),
            fc.boolean(),
            fc.constant(null),
            fc.constant(undefined),
            fc.array(fc.string()),
            fc.record({ nested: fc.string() })
          )),
          async (error, tags, extra) => {
            captureError(error, { tags, extra });
            
            // Should capture with tags and extra
            expect(Sentry.captureException).toHaveBeenCalledWith(
              error,
              expect.objectContaining({
                tags,
                extra,
              })
            );
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Configuration Properties', () => {
    it('should accept any valid DSN format', async () => {
      const { initSentry } = await import('../sentry');

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            protocol: fc.constant('https'),
            key: fc.hexaString({ minLength: 32, maxLength: 32 }),
            host: fc.domain(),
            projectId: fc.integer({ min: 1, max: 999999 }),
          }),
          async ({ protocol, key, host, projectId }) => {
            const dsn = `${protocol}://${key}@${host}/${projectId}`;
            
            initSentry({
              dsn,
              environment: 'test',
            });
            
            // Should initialize with DSN
            expect(Sentry.init).toHaveBeenCalledWith(
              expect.objectContaining({ dsn })
            );
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should accept sample rates between 0 and 1', async () => {
      const { initSentry } = await import('../sentry');

      await fc.assert(
        fc.asyncProperty(
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          async (sampleRate, tracesSampleRate) => {
            initSentry({
              dsn: 'https://test@sentry.io/123',
              environment: 'test',
              sampleRate,
              tracesSampleRate,
            });
            
            // Should initialize with sample rates
            expect(Sentry.init).toHaveBeenCalledWith(
              expect.objectContaining({
                sampleRate,
                tracesSampleRate,
              })
            );
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
