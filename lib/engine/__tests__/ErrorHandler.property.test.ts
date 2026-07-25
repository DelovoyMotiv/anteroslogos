/**
 * Property-based tests for ErrorHandler
 * Tests retry logic, exponential backoff, and error handling
 * 
 * Feature: geo-audit-engine-hardening
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  ErrorHandler,
  AgentMiddlewareError,
  RetryStrategy,
  RetryContext,
} from '../errors';
import { ErrorCode } from '../../../types/agent-middleware.types';

describe('ErrorHandler Property Tests', () => {
  let errorHandler: ErrorHandler;
  let logSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    logSpy = vi.fn();
    errorHandler = new ErrorHandler(logSpy);
  });

  /**
   * Property 20: Exponential Backoff on 408 Timeout
   * Validates: Requirements 5.1
   * 
   * For any 408 timeout error, when the ExtractionEngine encounters it,
   * the system should retry up to 3 times with exponentially increasing delays (1s, 2s, 4s).
   */
  test('Property 20: Exponential Backoff on 408 Timeout', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }), // Number of failures before success
        async (failuresBeforeSuccess) => {
          const delays: number[] = [];
          const startTimes: number[] = [];
          let attemptCount = 0;

          const mockFn = vi.fn(async () => {
            attemptCount++;
            if (attemptCount <= failuresBeforeSuccess) {
              throw new AgentMiddlewareError(
                ErrorCode.ERR_TIMEOUT,
                'Request timed out',
                { statusCode: 408 }
              );
            }
            return 'success';
          });

          const strategy = ErrorHandler.createTimeoutRetryStrategy(3);

          // Spy on setTimeout to capture delays
          const originalSetTimeout = global.setTimeout;
          global.setTimeout = ((fn: () => void, delay: number) => {
            delays.push(delay);
            startTimes.push(Date.now());
            return originalSetTimeout(fn, 0); // Execute immediately for testing
          }) as typeof setTimeout;

          try {
            if (failuresBeforeSuccess < 3) {
              await errorHandler.executeWithRetry(mockFn, strategy, { url: 'https://example.com' });
              
              // Verify exponential backoff: delays should be 1000, 2000, 4000 (capped at maxDelay)
              for (let i = 0; i < delays.length; i++) {
                const expectedDelay = Math.min(1000 * Math.pow(2, i), 10000);
                expect(delays[i]).toBe(expectedDelay);
              }
              
              // Verify retry count
              expect(attemptCount).toBe(failuresBeforeSuccess + 1);
            } else {
              // Should exhaust retries and throw
              await expect(
                errorHandler.executeWithRetry(mockFn, strategy, { url: 'https://example.com' })
              ).rejects.toThrow();
              
              expect(attemptCount).toBe(3);
            }
          } finally {
            global.setTimeout = originalSetTimeout;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 21: Rate Limit Retry with Increasing Delays
   * Validates: Requirements 5.2
   * 
   * For any 429 rate limit response, when the ExtractionEngine receives it,
   * the system should wait and retry with delays that increase with each attempt.
   */
  test('Property 21: Rate Limit Retry with Increasing Delays', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }), // Number of failures before success
        async (failuresBeforeSuccess) => {
          const delays: number[] = [];
          let attemptCount = 0;

          const mockFn = vi.fn(async () => {
            attemptCount++;
            if (attemptCount <= failuresBeforeSuccess) {
              throw new AgentMiddlewareError(
                ErrorCode.ERR_RATE_LIMIT,
                'Rate limit exceeded',
                { statusCode: 429 }
              );
            }
            return 'success';
          });

          const strategy = ErrorHandler.createRateLimitRetryStrategy(3);

          // Spy on setTimeout to capture delays
          const originalSetTimeout = global.setTimeout;
          global.setTimeout = ((fn: () => void, delay: number) => {
            delays.push(delay);
            return originalSetTimeout(fn, 0);
          }) as typeof setTimeout;

          try {
            if (failuresBeforeSuccess < 3) {
              await errorHandler.executeWithRetry(mockFn, strategy, { url: 'https://example.com' });
              
              // Verify delays are increasing
              for (let i = 1; i < delays.length; i++) {
                expect(delays[i]).toBeGreaterThan(delays[i - 1]);
              }
              
              expect(attemptCount).toBe(failuresBeforeSuccess + 1);
            } else {
              await expect(
                errorHandler.executeWithRetry(mockFn, strategy, { url: 'https://example.com' })
              ).rejects.toThrow();
              
              expect(attemptCount).toBe(3);
            }
          } finally {
            global.setTimeout = originalSetTimeout;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 22: Server Error Retry Limit
   * Validates: Requirements 5.3
   * 
   * For any 5xx server error, when the ExtractionEngine experiences it,
   * the system should retry exactly 3 times before failing with an error.
   */
  test('Property 22: Server Error Retry Limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 500, max: 599 }), // 5xx status codes
        async (statusCode) => {
          let attemptCount = 0;

          const mockFn = vi.fn(async () => {
            attemptCount++;
            throw new AgentMiddlewareError(
              ErrorCode.ERR_INTERNAL,
              'Server error',
              { statusCode }
            );
          });

          const strategy = ErrorHandler.createServerErrorRetryStrategy(3);

          // Spy on setTimeout
          const originalSetTimeout = global.setTimeout;
          global.setTimeout = ((fn: () => void, delay: number) => {
            return originalSetTimeout(fn, 0);
          }) as typeof setTimeout;

          try {
            await expect(
              errorHandler.executeWithRetry(mockFn, strategy, { url: 'https://example.com' })
            ).rejects.toThrow();

            // Should attempt exactly 3 times
            expect(attemptCount).toBe(3);
          } finally {
            global.setTimeout = originalSetTimeout;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 23: Detailed Error on Retry Exhaustion
   * Validates: Requirements 5.4
   * 
   * For any scenario where retry attempts are exhausted, when the ExtractionEngine gives up,
   * the returned error should include the error code, message, and contextual information about all attempts.
   */
  test('Property 23: Detailed Error on Retry Exhaustion', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          ErrorCode.ERR_TIMEOUT,
          ErrorCode.ERR_URL_UNREACHABLE,
          ErrorCode.ERR_BOT_BLOCKED
        ),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (errorCode, url) => {
          const mockFn = vi.fn(async () => {
            throw new AgentMiddlewareError(errorCode, 'Test error');
          });

          const strategy: RetryStrategy = {
            maxAttempts: 3,
            baseDelay: 100,
            maxDelay: 1000,
            shouldRetry: () => true,
          };

          // Spy on setTimeout
          const originalSetTimeout = global.setTimeout;
          global.setTimeout = ((fn: () => void, delay: number) => {
            return originalSetTimeout(fn, 0);
          }) as typeof setTimeout;

          try {
            await errorHandler.executeWithRetry(mockFn, strategy, { url });
          } catch (error) {
            expect(error).toBeInstanceOf(AgentMiddlewareError);
            const agentError = error as AgentMiddlewareError;
            
            // Verify error has code
            expect(agentError.code).toBe(errorCode);
            
            // Verify error has message
            expect(agentError.message).toBeTruthy();
            
            // Verify error has retry context
            expect(agentError.details).toBeDefined();
            expect(agentError.details?.retryContext).toBeDefined();
            
            const retryContext = agentError.details?.retryContext as RetryContext;
            
            // Verify retry context has URL
            expect(retryContext.url).toBe(url);
            
            // Verify retry context has timestamp
            expect(retryContext.timestamp).toBeTruthy();
            
            // Verify retry context has attempts
            expect(retryContext.attempts).toBe(3);
            
            // Verify retry context has error history
            expect(retryContext.errors).toHaveLength(3);
            expect(retryContext.errors[0].attempt).toBe(1);
            expect(retryContext.errors[1].attempt).toBe(2);
            expect(retryContext.errors[2].attempt).toBe(3);
          } finally {
            global.setTimeout = originalSetTimeout;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 24: Retry Count Logging
   * Validates: Requirements 5.5
   * 
   * For any successful retry attempt, when the ExtractionEngine succeeds after one or more retries,
   * the system should log the total retry count for monitoring.
   */
  test('Property 24: Retry Count Logging', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 2 }), // Failures before success (must succeed within max attempts)
        async (failuresBeforeSuccess) => {
          let attemptCount = 0;

          const mockFn = vi.fn(async () => {
            attemptCount++;
            if (attemptCount <= failuresBeforeSuccess) {
              throw new AgentMiddlewareError(ErrorCode.ERR_TIMEOUT, 'Timeout');
            }
            return 'success';
          });

          const strategy = ErrorHandler.createTimeoutRetryStrategy(3);

          // Spy on setTimeout
          const originalSetTimeout = global.setTimeout;
          global.setTimeout = ((fn: () => void, delay: number) => {
            return originalSetTimeout(fn, 0);
          }) as typeof setTimeout;

          try {
            logSpy.mockClear();
            
            await errorHandler.executeWithRetry(mockFn, strategy, { url: 'https://example.com' });

            // Verify logging occurred
            expect(logSpy).toHaveBeenCalled();
            
            // Find the "Retry succeeded" log
            const retrySuccessLog = logSpy.mock.calls.find(
              (call) => call[0] === 'Retry succeeded'
            );
            
            expect(retrySuccessLog).toBeDefined();
            expect(retrySuccessLog![1]).toMatchObject({
              attempt: failuresBeforeSuccess + 1,
              totalAttempts: 3,
              url: 'https://example.com',
            });
          } finally {
            global.setTimeout = originalSetTimeout;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 34: Complete Error Context
   * Validates: Requirements 7.5
   * 
   * For any error that occurs, when the system returns the error,
   * it should include the URL, timestamp, and relevant contextual information.
   */
  test('Property 34: Complete Error Context', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          ErrorCode.ERR_CSR_TIMEOUT,
          ErrorCode.ERR_WAF_BLOCK,
          ErrorCode.ERR_SCHEMA_NESTED,
          ErrorCode.ERR_URL_UNREACHABLE,
          ErrorCode.ERR_REDIRECT_LOOP
        ),
        fc.webUrl(),
        fc.record({
          statusCode: fc.option(fc.integer({ min: 100, max: 599 })),
          timeout: fc.option(fc.integer({ min: 1000, max: 60000 })),
          depth: fc.option(fc.integer({ min: 1, max: 10 })),
        }),
        async (errorCode, url, additionalDetails) => {
          const mockFn = vi.fn(async () => {
            throw new AgentMiddlewareError(
              errorCode,
              'Test error',
              additionalDetails
            );
          });

          const strategy: RetryStrategy = {
            maxAttempts: 1,
            baseDelay: 100,
            maxDelay: 1000,
            shouldRetry: () => false, // Don't retry for this test
          };

          try {
            await errorHandler.executeWithRetry(mockFn, strategy, { url });
          } catch (error) {
            expect(error).toBeInstanceOf(AgentMiddlewareError);
            const agentError = error as AgentMiddlewareError;
            
            // Verify error has code
            expect(agentError.code).toBe(errorCode);
            
            // Verify error has details
            expect(agentError.details).toBeDefined();
            
            // Verify retry context exists
            const retryContext = agentError.details?.retryContext as RetryContext;
            expect(retryContext).toBeDefined();
            
            // Verify URL is in context
            expect(retryContext.url).toBe(url);
            
            // Verify timestamp exists and is valid ISO string
            expect(retryContext.timestamp).toBeTruthy();
            expect(() => new Date(retryContext.timestamp)).not.toThrow();
            
            // Verify additional details are preserved
            if (additionalDetails.statusCode !== null) {
              expect(agentError.details?.statusCode).toBe(additionalDetails.statusCode);
            }
            if (additionalDetails.timeout !== null) {
              expect(agentError.details?.timeout).toBe(additionalDetails.timeout);
            }
            if (additionalDetails.depth !== null) {
              expect(agentError.details?.depth).toBe(additionalDetails.depth);
            }
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
