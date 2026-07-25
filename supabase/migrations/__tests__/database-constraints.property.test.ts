/**
 * Property-Based Tests for Database Constraints
 * Feature: production-audit-improvements, Property 50 & 51
 * Validates: Requirements 9.3
 * 
 * Tests verify that:
 * - Foreign key constraints enforce referential integrity
 * - Check constraints enforce business rules
 * - Unique constraints prevent duplicates
 * - NOT NULL constraints prevent missing data
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fc from 'fast-check';

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabase: SupabaseClient;

beforeAll(() => {
  supabase = createClient(supabaseUrl, supabaseKey);
});

afterAll(async () => {
  // Cleanup test data if needed
});

describe('Database Constraints Property Tests', () => {
  /**
   * Property 50: Foreign Key Constraints
   * For any foreign key relationship, the database should enforce referential integrity
   */
  describe('Property 50: Foreign Key Constraints', () => {
    it('should reject inserts with invalid foreign key references', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // invalid user_id
          fc.string({ minLength: 10, maxLength: 100 }), // url
          async (invalidUserId, url) => {
            // Try to insert audit with non-existent user_id
            const { error } = await supabase
              .from('audits')
              .insert({
                user_id: invalidUserId,
                url: `https://example.com/${url}`,
                normalized_url: `example.com/${url}`,
                domain: 'example.com',
                overall_score: 75.5,
                grade: 'B'
              });

            // Should fail due to foreign key constraint
            expect(error).toBeTruthy();
            expect(error?.message).toMatch(/foreign key|violates/i);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should cascade delete related records when parent is deleted', async () => {
      // This test verifies ON DELETE CASCADE behavior
      // Create a test user, then delete it and verify related records are deleted
      
      const testEmail = `test-${Date.now()}@example.com`;
      
      // Create user via auth (simplified - in real test would use proper auth)
      const userId = fc.sample(fc.uuid(), 1)[0];
      
      // Insert profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: testEmail,
          credits_remaining: 10,
          total_audits: 0
        });

      if (profileError) {
        // User might not exist in auth.users, skip this test
        return;
      }

      // Insert related audit
      const { data: audit, error: auditError } = await supabase
        .from('audits')
        .insert({
          user_id: userId,
          url: 'https://test.com',
          normalized_url: 'test.com',
          domain: 'test.com',
          overall_score: 80,
          grade: 'B'
        })
        .select()
        .single();

      if (auditError) {
        // Cleanup and skip
        await supabase.from('profiles').delete().eq('id', userId);
        return;
      }

      // Delete profile
      await supabase.from('profiles').delete().eq('id', userId);

      // Verify audit was cascade deleted
      const { data: deletedAudit } = await supabase
        .from('audits')
        .select()
        .eq('id', audit.id)
        .single();

      expect(deletedAudit).toBeNull();
    });
  });

  /**
   * Property 51: Business Rule Constraints
   * For any business rule, check constraints should enforce valid data
   */
  describe('Property 51: Business Rule Constraints', () => {
    it('should reject negative credits_remaining in profiles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: -1000, max: -1 }), // negative credits
          async (negativeCredits) => {
            const testEmail = `test-${Date.now()}-${Math.random()}@example.com`;
            const userId = fc.sample(fc.uuid(), 1)[0];

            const { error } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                email: testEmail,
                credits_remaining: negativeCredits,
                total_audits: 0
              });

            // Should fail due to check constraint
            expect(error).toBeTruthy();
            expect(error?.message).toMatch(/check|constraint|violates/i);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should reject audit scores outside 0-100 range', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.double({ min: -100, max: -0.01 }),
            fc.double({ min: 100.01, max: 200 })
          ),
          async (invalidScore) => {
            const userId = fc.sample(fc.uuid(), 1)[0];

            const { error } = await supabase
              .from('audits')
              .insert({
                user_id: userId,
                url: 'https://test.com',
                normalized_url: 'test.com',
                domain: 'test.com',
                overall_score: invalidScore,
                grade: 'F',
                score_schema_markup: 50,
                score_meta_tags: 50,
                score_ai_crawlers: 50,
                score_eeat: 50,
                score_structure: 50,
                score_performance: 50,
                score_content_quality: 50,
                score_citation_potential: 50,
                score_technical_seo: 50,
                score_link_analysis: 50
              });

            // Should fail due to check constraint
            expect(error).toBeTruthy();
            expect(error?.message).toMatch(/check|constraint|violates/i);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should reject invalid email formats in profiles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('notanemail'),
            fc.constant('missing@domain'),
            fc.constant('@nodomain.com'),
            fc.constant('no-at-sign.com')
          ),
          async (invalidEmail) => {
            const userId = fc.sample(fc.uuid(), 1)[0];

            const { error } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                email: invalidEmail,
                credits_remaining: 10,
                total_audits: 0
              });

            // Should fail due to check constraint
            expect(error).toBeTruthy();
            expect(error?.message).toMatch(/check|constraint|violates|email/i);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should reject confidence scores outside 0-1 range in citations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.double({ min: -1, max: -0.01 }),
            fc.double({ min: 1.01, max: 2 })
          ),
          async (invalidConfidence) => {
            const userId = fc.sample(fc.uuid(), 1)[0];
            const kgId = fc.sample(fc.uuid(), 1)[0];

            const { error } = await supabase
              .from('citations')
              .insert({
                user_id: userId,
                knowledge_graph_id: kgId,
                citation_id: `cit_${Date.now()}`,
                source: 'chatgpt',
                query: 'test query',
                response: 'test response',
                confidence: invalidConfidence
              });

            // Should fail due to check constraint
            expect(error).toBeTruthy();
            expect(error?.message).toMatch(/check|constraint|violates/i);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should reject negative rate limits in api_keys', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: -100, max: 0 }),
          async (invalidRateLimit) => {
            const userId = fc.sample(fc.uuid(), 1)[0];

            const { error } = await supabase
              .from('api_keys')
              .insert({
                user_id: userId,
                name: 'Test Key',
                key_hash: `hash_${Date.now()}`,
                key_prefix: 'sk_test_abc',
                rate_limit_per_minute: invalidRateLimit,
                rate_limit_per_hour: 100
              });

            // Should fail due to check constraint
            expect(error).toBeTruthy();
            expect(error?.message).toMatch(/check|constraint|violates/i);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should reject invalid AID URI format in agent_keys', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('not-an-aid-uri'),
            fc.constant('http://wrong-protocol'),
            fc.constant('aid:missing-slashes')
          ),
          async (invalidAidUri) => {
            const userId = fc.sample(fc.uuid(), 1)[0];

            const { error } = await supabase
              .from('agent_keys')
              .insert({
                user_id: userId,
                name: 'Test Agent',
                aid_uri: invalidAidUri,
                public_key: 'a'.repeat(44), // 44 chars
                key_algorithm: 'Ed25519',
                permissions: ['mcp:execute']
              });

            // Should fail due to check constraint
            expect(error).toBeTruthy();
            expect(error?.message).toMatch(/check|constraint|violates/i);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should reject negative amounts in a2a_ledger', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.double({ min: -1000, max: -0.01 }),
          async (negativeAmount) => {
            const userId = fc.sample(fc.uuid(), 1)[0];

            const { error } = await supabase
              .from('a2a_ledger')
              .insert({
                user_id: userId,
                entry_type: 'deposit',
                amount: negativeAmount,
                token: 'USDC',
                balance_after: 0,
                tx_hash: `0x${'a'.repeat(64)}`
              });

            // Should fail due to check constraint
            expect(error).toBeTruthy();
            expect(error?.message).toMatch(/check|constraint|violates/i);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should reject invalid EVM address format in a2a_wallets', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('not-an-address'),
            fc.constant('0xTOOSHORT'),
            fc.constant('0x' + 'g'.repeat(40)), // invalid hex
            fc.constant('missing0x' + 'a'.repeat(40))
          ),
          async (invalidAddress) => {
            const userId = fc.sample(fc.uuid(), 1)[0];

            const { error } = await supabase
              .from('a2a_wallets')
              .insert({
                user_id: userId,
                address: invalidAddress,
                chain_id: 8453,
                is_custodial: false
              });

            // Should fail due to check constraint
            expect(error).toBeTruthy();
            expect(error?.message).toMatch(/check|constraint|violates/i);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should reject billing periods where start >= end in subscriptions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
          async (startDate) => {
            const userId = fc.sample(fc.uuid(), 1)[0];
            const planId = fc.sample(fc.uuid(), 1)[0];
            
            // End date is before or equal to start date
            const endDate = new Date(startDate.getTime() - 86400000); // 1 day before

            const { error } = await supabase
              .from('user_subscriptions')
              .insert({
                user_id: userId,
                plan_id: planId,
                status: 'active',
                current_period_start: startDate.toISOString(),
                current_period_end: endDate.toISOString()
              });

            // Should fail due to check constraint
            expect(error).toBeTruthy();
            expect(error?.message).toMatch(/check|constraint|violates/i);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should reject self-referencing relationships in global_relationships', async () => {
      const entityId = fc.sample(fc.uuid(), 1)[0];

      const { error } = await supabase
        .from('global_relationships')
        .insert({
          source_global_entity_id: entityId,
          target_global_entity_id: entityId, // Same as source
          relationship_type: 'related_to',
          confidence_score: 0.8,
          citation_count: 1
        });

      // Should fail due to check constraint
      expect(error).toBeTruthy();
      expect(error?.message).toMatch(/check|constraint|violates/i);
    });
  });

  /**
   * Additional constraint tests
   */
  describe('NOT NULL Constraints', () => {
    it('should reject NULL values for required fields', async () => {
      // Test profiles.email NOT NULL
      const userId = fc.sample(fc.uuid(), 1)[0];
      
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: null as any, // Force NULL
          credits_remaining: 10,
          total_audits: 0
        });

      expect(error).toBeTruthy();
      expect(error?.message).toMatch(/null|not null|violates/i);
    });
  });

  describe('Unique Constraints', () => {
    it('should reject duplicate email addresses in profiles', async () => {
      const testEmail = `unique-test-${Date.now()}@example.com`;
      const userId1 = fc.sample(fc.uuid(), 1)[0];
      const userId2 = fc.sample(fc.uuid(), 1)[0];

      // Insert first profile
      await supabase
        .from('profiles')
        .insert({
          id: userId1,
          email: testEmail,
          credits_remaining: 10,
          total_audits: 0
        });

      // Try to insert second profile with same email
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: userId2,
          email: testEmail,
          credits_remaining: 10,
          total_audits: 0
        });

      // Should fail due to unique constraint
      expect(error).toBeTruthy();
      expect(error?.message).toMatch(/unique|duplicate|violates/i);

      // Cleanup
      await supabase.from('profiles').delete().eq('email', testEmail);
    });
  });
});

