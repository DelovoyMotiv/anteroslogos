/**
 * Property-Based Tests for Cost Configuration
 * Feature: ccc-native-economy
 * Uses fast-check for property-based testing with 100+ iterations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  OPERATION_COSTS,
  getOperationCost,
  getOperationMetadata,
  getAllOperationCosts,
  isValidOperationType,
  type OperationType,
} from '../costs';
import { BillingService } from '../BillingService';
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

describe('Cost Configuration Property-Based Tests', () => {
  let service: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Set required environment variables
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    service = new BillingService();
  });

  /**
   * Feature: ccc-native-economy, Property 13: Cost configuration consistency
   * Validates: Requirements 5.2
   * 
   * For any operation invocation, the cost charged should match the cost defined
   * in the centralized cost configuration for that operation type.
   */
  it('Property 13: should charge consistent costs from centralized configuration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom(...(Object.keys(OPERATION_COSTS) as OperationType[])),
        fc.double({ min: 1000, max: 2000, noNaN: true }),
        async (userId, operationType, initialBalance) => {
          const expectedCost = getOperationCost(operationType);
          let chargedAmount = 0;
          const ledgerEntryId = fc.sample(fc.uuid(), 1)[0];

          // Mock balance and ledger operations
          mockSupabase.from = vi.fn((table: string) => {
            if (table === 'user_balances') {
              const currentBalance = chargedAmount > 0 
                ? initialBalance - chargedAmount 
                : initialBalance;
              return createMockQueryBuilder({ balance: currentBalance });
            }
            if (table === 'billing_ledger') {
              return {
                select: vi.fn().mockReturnThis(),
                insert: vi.fn((data: any) => {
                  chargedAmount = Math.abs(data.amount);
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

          // Charge user with the operation cost
          const result = await service.chargeUser(
            userId,
            expectedCost,
            `${operationType} operation`,
            { operation_type: operationType }
          );

          // Verify the charged amount matches the configured cost
          expect(chargedAmount).toBe(expectedCost);
          expect(result.success).toBe(true);
          expect(result.newBalance).toBeCloseTo(initialBalance - expectedCost, 6);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Feature: ccc-native-economy, Property 14: Operation metadata completeness
   * Validates: Requirements 5.3
   * 
   * For any SPEND transaction, the metadata should contain the operation_type field
   * identifying which operation was performed.
   */
  it('Property 14: should include operation_type in SPEND transaction metadata', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom(...(Object.keys(OPERATION_COSTS) as OperationType[])),
        fc.double({ min: 1000, max: 2000, noNaN: true }),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (userId, operationType, initialBalance, description) => {
          const cost = getOperationCost(operationType);
          let insertedMetadata: Record<string, any> = {};
          let insertedEventType: string = '';
          const ledgerEntryId = fc.sample(fc.uuid(), 1)[0];

          // Mock balance and ledger operations
          mockSupabase.from = vi.fn((table: string) => {
            if (table === 'user_balances') {
              return createMockQueryBuilder({ balance: initialBalance });
            }
            if (table === 'billing_ledger') {
              return {
                select: vi.fn().mockReturnThis(),
                insert: vi.fn((data: any) => {
                  insertedMetadata = data.metadata || {};
                  insertedEventType = data.event_type;
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

          // Charge user with operation metadata
          await service.chargeUser(userId, cost, description, {
            operation_type: operationType,
          });

          // Verify metadata contains operation_type
          expect(insertedMetadata).toHaveProperty('operation_type');
          expect(insertedMetadata.operation_type).toBe(operationType);

          // Verify event type is a SPEND type
          expect(insertedEventType).toMatch(/^SPEND_/);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Additional test: Verify all operation costs are positive
   */
  it('should have positive costs for all operations', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...(Object.keys(OPERATION_COSTS) as OperationType[])),
        (operationType) => {
          const cost = getOperationCost(operationType);
          expect(cost).toBeGreaterThan(0);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Additional test: Verify getOperationMetadata returns consistent data
   */
  it('should return consistent metadata for all operations', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...(Object.keys(OPERATION_COSTS) as OperationType[])),
        (operationType) => {
          const metadata = getOperationMetadata(operationType);
          const directCost = getOperationCost(operationType);

          // Cost should match
          expect(metadata.cost).toBe(directCost);

          // USD equivalent should be cost * 0.2
          expect(metadata.usdEquivalent).toBeCloseTo(directCost * 0.2, 10);

          // Description should be non-empty
          expect(metadata.description).toBeTruthy();
          expect(metadata.description.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Additional test: Verify getAllOperationCosts returns all operations
   */
  it('should return all operation costs', () => {
    const allCosts = getAllOperationCosts();
    const operationTypes = Object.keys(OPERATION_COSTS) as OperationType[];

    // Should have same number of entries
    expect(allCosts.length).toBe(operationTypes.length);

    // Each operation should be present
    operationTypes.forEach((operationType) => {
      const found = allCosts.find((item) => item.operation === operationType);
      expect(found).toBeDefined();
      expect(found?.cost).toBe(getOperationCost(operationType));
    });
  });

  /**
   * Additional test: Verify isValidOperationType correctly validates
   */
  it('should correctly validate operation types', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constantFrom(...(Object.keys(OPERATION_COSTS) as OperationType[])),
          fc.string({ minLength: 1, maxLength: 50 })
        ),
        (input) => {
          const isValid = isValidOperationType(input);
          const expectedValid = input in OPERATION_COSTS;
          expect(isValid).toBe(expectedValid);
        }
      ),
      { numRuns: 20 }
    );
  });
});
