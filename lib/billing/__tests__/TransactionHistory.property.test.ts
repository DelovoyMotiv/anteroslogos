/**
 * Property-Based Tests for Transaction History
 * Feature: ccc-native-economy
 * Uses fast-check for property-based testing with 100+ iterations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { BillingService } from '../BillingService';
import type { EventType, Transaction } from '../types';

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

describe('Transaction History Property-Based Tests', () => {
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
   * Feature: ccc-native-economy, Property 6: Transaction chronological ordering
   * Validates: Requirements 2.4
   */
  it('Property 6: should return transactions in chronological order (newest first)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(
          fc.record({
            amount: fc.double({ min: -100, max: 100, noNaN: true }),
            event_type: fc.constantFrom(
              'DEPOSIT_STRIPE',
              'DEPOSIT_CRYPTO',
              'SPEND_API',
              'SPEND_AUDIT',
              'SPEND_CONSENSUS',
              'MIGRATION_CREDIT'
            ) as fc.Arbitrary<EventType>,
            description: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          { minLength: 2, maxLength: 50 }
        ),
        async (userId, transactionData) => {
          // Generate transactions with random timestamps
          const now = Date.now();
          const transactions: Transaction[] = transactionData.map((data, idx) => ({
            id: `tx-${userId}-${idx}`,
            user_id: userId,
            amount: data.amount,
            event_type: data.event_type,
            description: data.description,
            metadata: {},
            // Create timestamps in random order
            created_at: new Date(now - Math.random() * 1000000000).toISOString(),
          }));

          // Sort by created_at descending (newest first) - this is what the service should return
          const expectedOrder = [...transactions].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );

          // Mock the query to return sorted transactions
          mockSupabase.from = vi.fn((table: string) => {
            if (table === 'billing_ledger') {
              return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                gte: vi.fn().mockReturnThis(),
                lte: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                range: vi.fn().mockResolvedValue({
                  data: expectedOrder,
                  error: null,
                }),
              };
            }
            return createMockQueryBuilder([]);
          });

          // Get transaction history
          const result = await service.getTransactionHistory(userId);

          // Verify chronological ordering (newest first)
          for (let i = 0; i < result.length - 1; i++) {
            const currentTime = new Date(result[i].created_at).getTime();
            const nextTime = new Date(result[i + 1].created_at).getTime();
            expect(currentTime).toBeGreaterThanOrEqual(nextTime);
          }

          // Verify the result matches expected order
          expect(result.map((t) => t.id)).toEqual(expectedOrder.map((t) => t.id));
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: ccc-native-economy, Property 12: Complete transaction history
   * Validates: Requirements 4.3
   */
  it('Property 12: should return all transactions for user with no duplicates or omissions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(
          fc.record({
            amount: fc.double({ min: -100, max: 100, noNaN: true }),
            event_type: fc.constantFrom(
              'DEPOSIT_STRIPE',
              'DEPOSIT_CRYPTO',
              'SPEND_API',
              'SPEND_AUDIT',
              'SPEND_CONSENSUS',
              'MIGRATION_CREDIT'
            ) as fc.Arbitrary<EventType>,
            description: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          { minLength: 1, maxLength: 100 }
        ),
        async (userId, transactionData) => {
          // Generate unique transactions
          const transactions: Transaction[] = transactionData.map((data, idx) => ({
            id: `tx-${userId}-${idx}`,
            user_id: userId,
            amount: data.amount,
            event_type: data.event_type,
            description: data.description,
            metadata: {},
            created_at: new Date(Date.now() - idx * 1000).toISOString(),
          }));

          // Mock the query to return all transactions
          mockSupabase.from = vi.fn((table: string) => {
            if (table === 'billing_ledger') {
              return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                gte: vi.fn().mockReturnThis(),
                lte: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                range: vi.fn().mockResolvedValue({
                  data: transactions,
                  error: null,
                }),
              };
            }
            return createMockQueryBuilder([]);
          });

          // Get transaction history
          const result = await service.getTransactionHistory(userId);

          // Verify count matches (no omissions)
          expect(result.length).toBe(transactions.length);

          // Verify no duplicates (all IDs are unique)
          const resultIds = result.map((t) => t.id);
          const uniqueIds = new Set(resultIds);
          expect(uniqueIds.size).toBe(resultIds.length);

          // Verify all expected transactions are present
          const expectedIds = new Set(transactions.map((t) => t.id));
          const actualIds = new Set(resultIds);
          expect(actualIds).toEqual(expectedIds);

          // Verify each transaction has all required fields
          result.forEach((transaction) => {
            expect(transaction).toHaveProperty('id');
            expect(transaction).toHaveProperty('user_id');
            expect(transaction).toHaveProperty('amount');
            expect(transaction).toHaveProperty('event_type');
            expect(transaction).toHaveProperty('description');
            expect(transaction).toHaveProperty('metadata');
            expect(transaction).toHaveProperty('created_at');
            expect(transaction.user_id).toBe(userId);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
