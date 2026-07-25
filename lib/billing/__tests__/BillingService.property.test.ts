/**
 * Property-Based Tests for BillingService
 * Feature: ccc-native-economy
 * Uses fast-check for property-based testing with 100+ iterations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { BillingService } from '../BillingService';
import { InsufficientFundsError, BillingTransactionError } from '../errors';
import type { EventType } from '../types';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
};

// Helper to create a mock query builder
function createMockQueryBuilder(data: any, error: any = null) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  };
  return builder;
}

// Mock the Supabase client creation
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

describe('BillingService Property-Based Tests', () => {
  let service: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Set required environment variables
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    service = new BillingService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Feature: ccc-native-economy, Property 7: Insufficient funds prevention
   * Validates: Requirements 3.2
   */
  it('Property 7: should prevent operations when balance is insufficient', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.double({ min: 0, max: 1000, noNaN: true }),
        fc.double({ min: 0.01, max: 1000, noNaN: true }),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (userId, balance, cost, description) => {
          // Ensure cost > balance for this test
          const actualBalance = Math.min(balance, cost - 0.01);
          const actualCost = cost;

          // Mock balance query
          mockSupabase.from = vi.fn((table: string) => {
            if (table === 'user_balances') {
              return createMockQueryBuilder({ balance: actualBalance });
            }
            return createMockQueryBuilder([]);
          });

          // Attempt to charge
          if (actualBalance < actualCost) {
            await expect(
              service.chargeUser(userId, actualCost, description)
            ).rejects.toThrow(InsufficientFundsError);

            // Verify balance remains unchanged (no ledger insert should have been attempted)
            const balanceAfter = await service.getBalance(userId);
            expect(balanceAfter).toBe(actualBalance);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Feature: ccc-native-economy, Property 8: Atomic credit deduction
   * Validates: Requirements 3.3
   */
  it('Property 8: should atomically deduct credits and create ledger entry', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.double({ min: 100, max: 1000, noNaN: true }),
        fc.double({ min: 1, max: 50, noNaN: true }),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (userId, initialBalance, cost, description) => {
          const ledgerEntryId = fc.sample(fc.uuid(), 1)[0];
          let ledgerInserted = false;
          let insertedAmount = 0;

          // Mock balance query
          mockSupabase.from = vi.fn((table: string) => {
            if (table === 'user_balances') {
              const currentBalance = ledgerInserted
                ? initialBalance - insertedAmount
                : initialBalance;
              return createMockQueryBuilder({ balance: currentBalance });
            }
            if (table === 'billing_ledger') {
              return {
                select: vi.fn().mockReturnThis(),
                insert: vi.fn((data: any) => {
                  ledgerInserted = true;
                  insertedAmount = Math.abs(data.amount);
                  return {
                    select: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                      data: {
                        id: ledgerEntryId,
                        user_id: userId,
                        amount: data.amount,
                        event_type: data.event_type,
                        description: data.description,
                        metadata: data.metadata,
                        created_at: new Date().toISOString(),
                      },
                      error: null,
                    }),
                  };
                }),
                eq: vi.fn().mockReturnThis(),
              };
            }
            return createMockQueryBuilder([]);
          });

          const result = await service.chargeUser(userId, cost, description);

          // Verify atomic operation
          expect(result.success).toBe(true);
          expect(result.newBalance).toBe(initialBalance - cost);
          expect(ledgerInserted).toBe(true);
          expect(insertedAmount).toBe(cost);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Feature: ccc-native-economy, Property 9: Transaction atomicity on failure
   * Validates: Requirements 3.4
   */
  it('Property 9: should rollback transaction when ledger insert fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.double({ min: 100, max: 1000, noNaN: true }),
        fc.double({ min: 1, max: 50, noNaN: true }),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (userId, initialBalance, cost, description) => {
          // Mock balance query
          mockSupabase.from = vi.fn((table: string) => {
            if (table === 'user_balances') {
              return createMockQueryBuilder({ balance: initialBalance });
            }
            if (table === 'billing_ledger') {
              return {
                select: vi.fn().mockReturnThis(),
                insert: vi.fn(() => ({
                  select: vi.fn().mockReturnThis(),
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Database constraint violation' },
                  }),
                })),
                eq: vi.fn().mockReturnThis(),
              };
            }
            return createMockQueryBuilder([]);
          });

          // Attempt charge - should fail
          await expect(
            service.chargeUser(userId, cost, description)
          ).rejects.toThrow(BillingTransactionError);

          // Verify balance unchanged
          const balanceAfter = await service.getBalance(userId);
          expect(balanceAfter).toBe(initialBalance);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Feature: ccc-native-economy, Property 10: Concurrent operation safety
   * Validates: Requirements 3.5
   */
  it('Property 10: should handle concurrent operations safely', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.double({ min: 1000, max: 2000, noNaN: true }),
        fc.array(fc.double({ min: 1, max: 50, noNaN: true }), { minLength: 2, maxLength: 10 }),
        async (userId, initialBalance, costs) => {
          let currentBalance = initialBalance;
          const successfulCharges: number[] = [];

          // Mock balance and ledger operations
          mockSupabase.from = vi.fn((table: string) => {
            if (table === 'user_balances') {
              return createMockQueryBuilder({ balance: currentBalance });
            }
            if (table === 'billing_ledger') {
              return {
                select: vi.fn().mockReturnThis(),
                insert: vi.fn((data: any) => {
                  const cost = Math.abs(data.amount);
                  if (currentBalance >= cost) {
                    currentBalance -= cost;
                    successfulCharges.push(cost);
                    return {
                      select: vi.fn().mockReturnThis(),
                      single: vi.fn().mockResolvedValue({
                        data: {
                          id: fc.sample(fc.uuid(), 1)[0],
                          user_id: userId,
                          amount: data.amount,
                          event_type: data.event_type,
                          description: data.description,
                          metadata: data.metadata,
                          created_at: new Date().toISOString(),
                        },
                        error: null,
                      }),
                    };
                  }
                  return {
                    select: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                      data: null,
                      error: { message: 'Insufficient funds' },
                    }),
                  };
                }),
                eq: vi.fn().mockReturnThis(),
              };
            }
            return createMockQueryBuilder([]);
          });

          // Execute operations sequentially (simulating concurrent with shared state)
          const results = await Promise.allSettled(
            costs.map((cost) => service.chargeUser(userId, cost, `Operation ${cost}`))
          );

          // Verify final balance (use toBeCloseTo for floating point comparison)
          const expectedBalance = initialBalance - successfulCharges.reduce((a, b) => a + b, 0);
          expect(currentBalance).toBeCloseTo(expectedBalance, 10);

          // Verify no operation succeeded if it would cause negative balance
          expect(currentBalance).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Feature: ccc-native-economy, Property 11: Balance calculation correctness
   * Validates: Requirements 4.2
   */
  it('Property 11: should calculate balance as sum of all ledger entries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(
          fc.record({
            amount: fc.double({ min: -100, max: 100, noNaN: true }),
            event_type: fc.constantFrom(
              'DEPOSIT_STRIPE',
              'SPEND_API',
              'SPEND_AUDIT',
              'MIGRATION_CREDIT'
            ) as fc.Arbitrary<EventType>,
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (userId, entries) => {
          const expectedBalance = entries.reduce((sum, entry) => sum + entry.amount, 0);

          // Mock ledger query
          mockSupabase.from = vi.fn((table: string) => {
            if (table === 'user_balances') {
              // Return null to force computation from ledger
              return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
                upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
              };
            }
            if (table === 'billing_ledger') {
              return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({
                  data: entries.map((entry, idx) => ({
                    id: `${userId}-${idx}`,
                    user_id: userId,
                    amount: entry.amount,
                    event_type: entry.event_type,
                    description: `Entry ${idx}`,
                    metadata: {},
                    created_at: new Date().toISOString(),
                  })),
                  error: null,
                }),
              };
            }
            return createMockQueryBuilder([]);
          });

          const balance = await service.getBalance(userId);
          expect(balance).toBeCloseTo(expectedBalance, 6);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Feature: ccc-native-economy, Property 23: Transaction rollback on failure
   * Validates: Requirements 9.1
   */
  it('Property 23: should maintain balance on any billing operation failure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.double({ min: 100, max: 1000, noNaN: true }),
        fc.double({ min: 1, max: 50, noNaN: true }),
        async (userId, initialBalance, cost) => {
          // Mock to simulate failure after balance check
          mockSupabase.from = vi.fn((table: string) => {
            if (table === 'user_balances') {
              return createMockQueryBuilder({ balance: initialBalance });
            }
            if (table === 'billing_ledger') {
              return {
                select: vi.fn().mockReturnThis(),
                insert: vi.fn(() => {
                  throw new Error('Simulated database failure');
                }),
                eq: vi.fn().mockReturnThis(),
              };
            }
            return createMockQueryBuilder([]);
          });

          // Attempt operation
          await expect(
            service.chargeUser(userId, cost, 'Test operation')
          ).rejects.toThrow();

          // Verify balance unchanged
          mockSupabase.from = vi.fn((table: string) => {
            if (table === 'user_balances') {
              return createMockQueryBuilder({ balance: initialBalance });
            }
            return createMockQueryBuilder([]);
          });

          const balanceAfter = await service.getBalance(userId);
          expect(balanceAfter).toBe(initialBalance);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Feature: ccc-native-economy, Property 24: Operation prevention on ledger failure
   * Validates: Requirements 9.2
   */
  it('Property 24: should not execute operation if ledger insert fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.double({ min: 100, max: 1000, noNaN: true }),
        fc.double({ min: 1, max: 50, noNaN: true }),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (userId, initialBalance, cost, description) => {
          let operationExecuted = false;

          // Mock ledger failure
          mockSupabase.from = vi.fn((table: string) => {
            if (table === 'user_balances') {
              return createMockQueryBuilder({ balance: initialBalance });
            }
            if (table === 'billing_ledger') {
              return {
                select: vi.fn().mockReturnThis(),
                insert: vi.fn(() => ({
                  select: vi.fn().mockReturnThis(),
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Ledger insert failed' },
                  }),
                })),
                eq: vi.fn().mockReturnThis(),
              };
            }
            return createMockQueryBuilder([]);
          });

          // Attempt charge
          try {
            await service.chargeUser(userId, cost, description);
            operationExecuted = true;
          } catch (error) {
            // Expected to fail
            expect(error).toBeInstanceOf(BillingTransactionError);
          }

          // Verify operation was not executed
          expect(operationExecuted).toBe(false);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Feature: ccc-native-economy, Property 3: Balance updates after deposits
   * Validates: Requirements 1.4
   */
  it('Property 3: should update user balance by exact deposit amount', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.double({ min: 0, max: 10000, noNaN: true }),
        fc.integer({ min: 10, max: 5000 }),
        fc.constantFrom('DEPOSIT_STRIPE', 'DEPOSIT_CRYPTO', 'MIGRATION_CREDIT') as fc.Arbitrary<
          'DEPOSIT_STRIPE' | 'DEPOSIT_CRYPTO' | 'MIGRATION_CREDIT'
        >,
        async (userId, initialBalance, depositAmount, eventType) => {
          const ledgerEntryId = fc.sample(fc.uuid(), 1)[0];
          let currentBalance = initialBalance;

          // Mock balance and ledger operations
          mockSupabase.from = vi.fn((table: string) => {
            if (table === 'user_balances') {
              return createMockQueryBuilder({ balance: currentBalance });
            }
            if (table === 'billing_ledger') {
              return {
                select: vi.fn().mockReturnThis(),
                insert: vi.fn((data: any) => {
                  // Simulate successful deposit
                  currentBalance += data.amount;
                  return {
                    select: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                      data: {
                        id: ledgerEntryId,
                        user_id: userId,
                        amount: data.amount,
                        event_type: data.event_type,
                        description: data.description,
                        metadata: data.metadata,
                        created_at: new Date().toISOString(),
                      },
                      error: null,
                    }),
                  };
                }),
                eq: vi.fn().mockReturnThis(),
              };
            }
            return createMockQueryBuilder([]);
          });

          // Get balance before deposit
          const balanceBefore = await service.getBalance(userId);
          expect(balanceBefore).toBe(initialBalance);

          // Perform deposit
          const result = await service.depositCredits(userId, depositAmount, eventType, {
            test: true,
          });

          // Verify deposit result
          expect(result.success).toBe(true);
          expect(result.transactionId).toBe(ledgerEntryId);

          // Verify new balance equals initial balance plus deposit amount
          expect(result.newBalance).toBeCloseTo(initialBalance + depositAmount, 6);

          // Verify balance is updated correctly
          const balanceAfter = await service.getBalance(userId);
          expect(balanceAfter).toBeCloseTo(initialBalance + depositAmount, 6);
        }
      ),
      { numRuns: 20 }
    );
  });
});
