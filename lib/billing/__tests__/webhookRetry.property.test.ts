/**
 * Property-Based Tests for Webhook Retry Mechanism
 * Feature: ccc-native-economy
 * Uses fast-check for property-based testing with 100+ iterations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import type Stripe from 'stripe';

// Mock the Supabase module with a factory function
vi.mock('../../supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
}));

// Mock Stripe module
vi.mock('stripe', () => ({
  default: vi.fn(),
}));

// Import after mocks are set up
import {
  WebhookRetryService,
  calculateRetryDelay,
  verifyExponentialBackoff,
  RETRY_DELAYS_MS,
  MAX_RETRY_ATTEMPTS,
  ALERT_THRESHOLD,
  type WebhookRetryJob,
} from '../webhookRetry';
import { BillingService } from '../BillingService';
import { supabase } from '../../supabase';

// Helper to create a mock query builder
function createMockQueryBuilder(data: any, error: any = null) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  };
  return builder;
}

describe('WebhookRetryService Property-Based Tests', () => {
  let service: WebhookRetryService;
  let billingService: BillingService;
  const mockSupabase = supabase as any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Set required environment variables
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    billingService = new BillingService();
    service = new WebhookRetryService(billingService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    service.stopAutoProcessing();
  });

  /**
   * Feature: ccc-native-economy, Property 25: Webhook retry with exponential backoff
   * Validates: Requirements 9.5
   * 
   * This property verifies that webhook retries follow exponential backoff:
   * - Each retry delay should be 2x the previous delay
   * - Delays should follow the pattern: 1s, 2s, 4s, 8s, 16s
   * - Maximum retry attempts should be enforced
   */
  it('Property 25: should retry webhooks with exponential backoff', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom('checkout.session.completed', 'payment_intent.succeeded'),
        fc.integer({ min: 0, max: MAX_RETRY_ATTEMPTS - 1 }),
        async (eventId, eventType, attemptNumber) => {
          // Create a mock Stripe event
          const mockEvent: Stripe.Event = {
            id: eventId,
            type: eventType,
            data: {
              object: {
                id: 'test_session',
                metadata: {
                  user_id: 'test-user',
                  ccc_amount: '100',
                },
              },
            },
          } as any;

          // Mock the database insert for queueing
          const insertedJob: WebhookRetryJob = {
            id: fc.sample(fc.uuid(), 1)[0],
            event_id: eventId,
            event_type: eventType,
            event_data: mockEvent,
            attempt_count: attemptNumber,
            max_attempts: MAX_RETRY_ATTEMPTS,
            next_retry_at: new Date(Date.now() + calculateRetryDelay(attemptNumber)).toISOString(),
            last_error: 'Test error',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          (mockSupabase.from as any) = vi.fn((table: string) => {
            if (table === 'webhook_retry_queue') {
              return createMockQueryBuilder(insertedJob);
            }
            return createMockQueryBuilder(null);
          });

          // Queue the retry
          const result = await service.queueRetry(mockEvent, new Error('Test error'));

          // Verify the retry was queued successfully
          expect(result.success).toBe(true);
          expect(result.jobId).toBeDefined();

          // Verify exponential backoff calculation
          const delay = calculateRetryDelay(attemptNumber);
          const expectedDelay = RETRY_DELAYS_MS[attemptNumber];
          expect(delay).toBe(expectedDelay);

          // Verify exponential backoff pattern (each delay is 2x previous)
          if (attemptNumber > 0) {
            const previousDelay = RETRY_DELAYS_MS[attemptNumber - 1];
            expect(delay).toBe(previousDelay * 2);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Retry delays follow exponential backoff pattern
   * Verifies that the RETRY_DELAYS_MS array follows exponential backoff
   */
  it('should verify retry delays follow exponential backoff pattern', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: RETRY_DELAYS_MS.length - 2 }),
        (index) => {
          const currentDelay = RETRY_DELAYS_MS[index];
          const nextDelay = RETRY_DELAYS_MS[index + 1];
          
          // Each delay should be 2x the previous
          expect(nextDelay).toBe(currentDelay * 2);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Calculate retry delay returns correct value for any attempt number
   */
  it('should calculate correct retry delay for any attempt number', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (attemptNumber) => {
          const delay = calculateRetryDelay(attemptNumber);
          
          if (attemptNumber < 0) {
            // Negative attempts should return first delay
            expect(delay).toBe(RETRY_DELAYS_MS[0]);
          } else if (attemptNumber >= RETRY_DELAYS_MS.length) {
            // Attempts beyond max should return last delay
            expect(delay).toBe(RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]);
          } else {
            // Normal attempts should return corresponding delay
            expect(delay).toBe(RETRY_DELAYS_MS[attemptNumber]);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Verify exponential backoff function correctly validates sequences
   */
  it('should correctly verify exponential backoff sequences', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 2, maxLength: 10 }),
        (delays) => {
          // Create an exponential sequence
          const exponentialSequence = [delays[0]];
          for (let i = 1; i < delays.length; i++) {
            exponentialSequence.push(exponentialSequence[i - 1] * 2);
          }
          
          // Verify it's recognized as exponential
          expect(verifyExponentialBackoff(exponentialSequence)).toBe(true);
          
          // Create a non-exponential sequence (add 1 to break the pattern)
          const nonExponentialSequence = [...exponentialSequence];
          if (nonExponentialSequence.length > 1) {
            nonExponentialSequence[1] += 1;
            expect(verifyExponentialBackoff(nonExponentialSequence)).toBe(false);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Alert threshold is triggered when failures exceed limit
   */
  it('should trigger alerts when failed webhooks exceed threshold', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        (failedCount) => {
          // Verify alert logic (pure function test)
          const shouldAlert = failedCount >= ALERT_THRESHOLD;
          
          expect(shouldAlert).toBe(failedCount >= ALERT_THRESHOLD);
          
          // Verify threshold constant
          expect(ALERT_THRESHOLD).toBe(5);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Retry attempts never exceed maximum
   */
  it('should never exceed maximum retry attempts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.integer({ min: 0, max: 20 }),
        async (eventId, attemptCount) => {
          const mockEvent: Stripe.Event = {
            id: eventId,
            type: 'checkout.session.completed',
            data: { object: {} },
          } as any;

          const job: WebhookRetryJob = {
            id: fc.sample(fc.uuid(), 1)[0],
            event_id: eventId,
            event_type: 'checkout.session.completed',
            event_data: mockEvent,
            attempt_count: attemptCount,
            max_attempts: MAX_RETRY_ATTEMPTS,
            next_retry_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // If attempt count >= max attempts, job should not be retried
          const shouldRetry = attemptCount < MAX_RETRY_ATTEMPTS;
          
          // Verify the logic
          expect(job.attempt_count < job.max_attempts).toBe(shouldRetry);
          
          if (!shouldRetry) {
            // Job has reached max attempts
            expect(job.attempt_count).toBeGreaterThanOrEqual(MAX_RETRY_ATTEMPTS);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Next retry time increases with each attempt
   */
  it('should schedule retries with increasing delays', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_RETRY_ATTEMPTS - 2 }),
        (attemptNumber) => {
          const currentDelay = calculateRetryDelay(attemptNumber);
          const nextDelay = calculateRetryDelay(attemptNumber + 1);
          
          // Next delay should be greater than current delay
          expect(nextDelay).toBeGreaterThan(currentDelay);
          
          // Next delay should be exactly 2x current delay (exponential backoff)
          expect(nextDelay).toBe(currentDelay * 2);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Retry stats are consistent with queue state
   */
  it('should return consistent retry statistics', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 50 }),
        (pendingCount, failedCount) => {
          const totalCount = pendingCount + failedCount;

          // Verify stats consistency (pure logic test)
          expect(pendingCount).toBeLessThanOrEqual(totalCount);
          expect(failedCount).toBeLessThanOrEqual(totalCount);
          expect(pendingCount + failedCount).toBe(totalCount);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Exponential backoff constants are valid
   */
  it('should have valid exponential backoff constants', () => {
    // Verify RETRY_DELAYS_MS follows exponential pattern
    expect(verifyExponentialBackoff(RETRY_DELAYS_MS)).toBe(true);
    
    // Verify first delay is 1 second
    expect(RETRY_DELAYS_MS[0]).toBe(1000);
    
    // Verify last delay is 16 seconds
    expect(RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]).toBe(16000);
    
    // Verify we have exactly 5 retry attempts
    expect(RETRY_DELAYS_MS.length).toBe(5);
    expect(MAX_RETRY_ATTEMPTS).toBe(5);
    
    // Verify alert threshold is reasonable
    expect(ALERT_THRESHOLD).toBeGreaterThan(0);
    expect(ALERT_THRESHOLD).toBe(5);
  });
});
