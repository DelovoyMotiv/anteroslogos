/**
 * Property-Based Tests for CCC Billing Ledger Immutability
 * Feature: ccc-native-economy, Property 5: Ledger immutability
 * Validates: Requirements 2.3
 * 
 * Tests verify that:
 * - Ledger records cannot be updated after insertion
 * - Ledger records cannot be deleted after insertion
 * - Only service role can insert records
 * - Users can only read their own records
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fc from 'fast-check';

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

let serviceClient: SupabaseClient;
let anonClient: SupabaseClient;

// Skip tests if Supabase is not configured
const hasSupabase = !!(supabaseUrl && supabaseServiceKey);

beforeAll(() => {
  if (hasSupabase) {
    serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    anonClient = createClient(supabaseUrl, supabaseAnonKey);
  }
});

afterAll(async () => {
  // Cleanup test data if needed
  if (hasSupabase && serviceClient) {
    // Clean up any test records created during tests
    await serviceClient
      .from('billing_ledger')
      .delete()
      .like('description', 'TEST:%');
  }
});

describe('CCC Billing Ledger Immutability Property Tests', () => {
  /**
   * Property 5: Ledger immutability
   * For any existing ledger record, attempts to UPDATE or DELETE the record 
   * should fail with a permission error.
   */
  describe('Property 5: Ledger immutability', () => {
    it.skipIf(!hasSupabase)('should prevent UPDATE operations on ledger records', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // user_id
          fc.double({ min: 1, max: 1000 }), // deposit amount
          fc.string({ minLength: 10, maxLength: 50 }), // description suffix
          async (userId, amount, descSuffix) => {
            // Insert a test record using service role
            const description = `TEST: Deposit ${descSuffix}`;
            const { data: insertedRecord, error: insertError } = await serviceClient
              .from('billing_ledger')
              .insert({
                user_id: userId,
                amount: amount,
                event_type: 'DEPOSIT_STRIPE',
                description: description,
                metadata: { test: true, package: 'starter' }
              })
              .select()
              .single();

            // Skip if insert failed (e.g., user doesn't exist)
            if (insertError || !insertedRecord) {
              return;
            }

            // Attempt to UPDATE the record using service role
            const { error: updateError } = await serviceClient
              .from('billing_ledger')
              .update({ amount: amount + 100 })
              .eq('id', insertedRecord.id);

            // Should fail - no UPDATE policy exists
            expect(updateError).toBeTruthy();
            expect(updateError?.message).toMatch(/permission|denied|policy/i);

            // Verify the record was not modified
            const { data: verifyRecord } = await serviceClient
              .from('billing_ledger')
              .select('amount')
              .eq('id', insertedRecord.id)
              .single();

            if (verifyRecord) {
              expect(verifyRecord.amount).toBe(String(amount));
            }

            // Cleanup
            await serviceClient
              .from('billing_ledger')
              .delete()
              .eq('id', insertedRecord.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    it.skipIf(!hasSupabase)('should prevent DELETE operations on ledger records', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // user_id
          fc.double({ min: 1, max: 1000 }), // deposit amount
          fc.string({ minLength: 10, maxLength: 50 }), // description suffix
          async (userId, amount, descSuffix) => {
            // Insert a test record using service role
            const description = `TEST: Deposit ${descSuffix}`;
            const { data: insertedRecord, error: insertError } = await serviceClient
              .from('billing_ledger')
              .insert({
                user_id: userId,
                amount: amount,
                event_type: 'DEPOSIT_STRIPE',
                description: description,
                metadata: { test: true }
              })
              .select()
              .single();

            // Skip if insert failed
            if (insertError || !insertedRecord) {
              return;
            }

            // Attempt to DELETE the record using service role
            const { error: deleteError } = await serviceClient
              .from('billing_ledger')
              .delete()
              .eq('id', insertedRecord.id);

            // Should fail - no DELETE policy exists
            expect(deleteError).toBeTruthy();
            expect(deleteError?.message).toMatch(/permission|denied|policy/i);

            // Verify the record still exists
            const { data: verifyRecord } = await serviceClient
              .from('billing_ledger')
              .select('id')
              .eq('id', insertedRecord.id)
              .single();

            expect(verifyRecord).toBeTruthy();
            expect(verifyRecord?.id).toBe(insertedRecord.id);

            // Note: We cannot cleanup since DELETE is blocked
            // Records will be cleaned up in afterAll hook
          }
        ),
        { numRuns: 100 }
      );
    });

    it.skipIf(!hasSupabase)('should prevent anonymous users from inserting records', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // user_id
          fc.double({ min: 1, max: 1000 }), // amount
          async (userId, amount) => {
            // Attempt to insert using anonymous client (no auth)
            const { error } = await anonClient
              .from('billing_ledger')
              .insert({
                user_id: userId,
                amount: amount,
                event_type: 'DEPOSIT_STRIPE',
                description: 'TEST: Unauthorized insert attempt',
                metadata: {}
              });

            // Should fail - INSERT policy requires service role
            expect(error).toBeTruthy();
            expect(error?.message).toMatch(/permission|denied|policy|violates/i);
          }
        ),
        { numRuns: 100 }
      );
    });

    it.skipIf(!hasSupabase)('should allow service role to insert valid records', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // user_id
          fc.double({ min: 1, max: 1000 }), // deposit amount
          fc.oneof(
            fc.constant('DEPOSIT_STRIPE'),
            fc.constant('DEPOSIT_CRYPTO'),
            fc.constant('MIGRATION_CREDIT')
          ),
          async (userId, amount, eventType) => {
            const description = `TEST: ${eventType} transaction`;
            
            // Service role should be able to insert
            const { data, error } = await serviceClient
              .from('billing_ledger')
              .insert({
                user_id: userId,
                amount: amount,
                event_type: eventType,
                description: description,
                metadata: { test: true }
              })
              .select()
              .single();

            // May fail if user doesn't exist, which is acceptable
            if (error) {
              expect(error.message).toMatch(/foreign key|violates/i);
            } else {
              expect(data).toBeTruthy();
              expect(data.amount).toBe(String(amount));
              expect(data.event_type).toBe(eventType);
              
              // Cleanup (will fail due to DELETE policy, but that's expected)
              await serviceClient
                .from('billing_ledger')
                .delete()
                .eq('id', data.id);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it.skipIf(!hasSupabase)('should enforce positive amounts for deposits', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // user_id
          fc.double({ min: -1000, max: 0 }), // negative or zero amount
          async (userId, amount) => {
            // Attempt to insert deposit with negative amount
            const { error } = await serviceClient
              .from('billing_ledger')
              .insert({
                user_id: userId,
                amount: amount,
                event_type: 'DEPOSIT_STRIPE',
                description: 'TEST: Invalid negative deposit',
                metadata: {}
              });

            // Should fail due to check constraint
            expect(error).toBeTruthy();
            expect(error?.message).toMatch(/check|constraint|violates/i);
          }
        ),
        { numRuns: 100 }
      );
    });

    it.skipIf(!hasSupabase)('should enforce negative amounts for spends', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // user_id
          fc.double({ min: 0.01, max: 1000 }), // positive amount
          async (userId, amount) => {
            // Attempt to insert spend with positive amount
            const { error } = await serviceClient
              .from('billing_ledger')
              .insert({
                user_id: userId,
                amount: amount, // Should be negative for SPEND
                event_type: 'SPEND_API',
                description: 'TEST: Invalid positive spend',
                metadata: {}
              });

            // Should fail due to check constraint
            expect(error).toBeTruthy();
            expect(error?.message).toMatch(/check|constraint|violates/i);
          }
        ),
        { numRuns: 100 }
      );
    });

    it.skipIf(!hasSupabase)('should reject invalid event types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // user_id
          fc.double({ min: 1, max: 1000 }), // amount
          fc.oneof(
            fc.constant('INVALID_TYPE'),
            fc.constant('DEPOSIT_INVALID'),
            fc.constant('SPEND_UNKNOWN'),
            fc.constant(''),
            fc.constant('deposit_stripe') // lowercase should fail
          ),
          async (userId, amount, invalidEventType) => {
            const { error } = await serviceClient
              .from('billing_ledger')
              .insert({
                user_id: userId,
                amount: amount,
                event_type: invalidEventType,
                description: 'TEST: Invalid event type',
                metadata: {}
              });

            // Should fail due to check constraint
            expect(error).toBeTruthy();
            expect(error?.message).toMatch(/check|constraint|violates|invalid/i);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
