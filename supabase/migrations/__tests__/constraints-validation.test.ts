/**
 * Validation Tests for Database Constraints Migration
 * Feature: production-audit-improvements, Property 50 & 51
 * Validates: Requirements 9.3
 * 
 * These tests validate the migration SQL syntax and structure
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Database Constraints Migration Validation', () => {
  const migrationPath = join(__dirname, '../023_database_constraints.sql');
  const rollbackPath = join(__dirname, '../rollback/023_database_constraints_rollback.sql');

  let migrationSQL: string;
  let rollbackSQL: string;

  it('should load migration file successfully', () => {
    migrationSQL = readFileSync(migrationPath, 'utf-8');
    expect(migrationSQL).toBeTruthy();
    expect(migrationSQL.length).toBeGreaterThan(0);
  });

  it('should load rollback file successfully', () => {
    rollbackSQL = readFileSync(rollbackPath, 'utf-8');
    expect(rollbackSQL).toBeTruthy();
    expect(rollbackSQL.length).toBeGreaterThan(0);
  });

  describe('Property 50: Foreign Key Constraints', () => {
    it('should reference foreign key constraints in migration', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      // Check for foreign key related content
      expect(migrationSQL).toContain('Foreign Key Constraints');
      expect(migrationSQL).toContain('Property 50');
    });

    it('should preserve existing foreign key relationships', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      // The migration should preserve existing foreign keys
      // Check that the migration doesn't drop FK constraints
      expect(migrationSQL).not.toContain('DROP CONSTRAINT');
    });
  });

  describe('Property 51: Business Rule Constraints', () => {
    it('should add check constraints for business rules', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('ADD CONSTRAINT');
      expect(migrationSQL).toContain('CHECK');
      expect(migrationSQL).toContain('Business Rule Constraints');
      expect(migrationSQL).toContain('Property 51');
    });

    it('should include check constraints for non-negative values', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      // Credits remaining must be non-negative
      expect(migrationSQL).toContain('credits_remaining_check');
      expect(migrationSQL).toContain('>= 0');
      
      // Total audits must be non-negative
      expect(migrationSQL).toContain('total_audits_check');
      
      // Amount fields must be positive
      expect(migrationSQL).toContain('amount_positive_check');
    });

    it('should include check constraints for valid ranges', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      // Scores must be 0-100
      expect(migrationSQL).toContain('scores_range_check');
      expect(migrationSQL).toContain('BETWEEN 0 AND 100');
      
      // Confidence must be 0-1
      expect(migrationSQL).toContain('confidence');
      expect(migrationSQL).toContain('0 AND');
      expect(migrationSQL).toContain('<= 1');
    });

    it('should include check constraints for format validation', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      // Email format
      expect(migrationSQL).toContain('email_format_check');
      expect(migrationSQL).toContain('~*');
      
      // URL format
      expect(migrationSQL).toContain('url_format_check');
      expect(migrationSQL).toContain('https?://');
      
      // EVM address format
      expect(migrationSQL).toContain('address_format_check');
      expect(migrationSQL).toContain('0x[a-fA-F0-9]{40}');
    });
  });

  describe('NOT NULL Constraints', () => {
    it('should add NOT NULL constraints for critical fields', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('ALTER COLUMN');
      expect(migrationSQL).toContain('SET NOT NULL');
      
      // Critical fields that should be NOT NULL
      expect(migrationSQL).toContain('email SET NOT NULL');
      expect(migrationSQL).toContain('created_at SET NOT NULL');
      expect(migrationSQL).toContain('updated_at SET NOT NULL');
    });
  });

  describe('Idempotency', () => {
    it('should use IF NOT EXISTS for constraint creation', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      // Check for idempotent constraint creation
      expect(migrationSQL).toContain('IF NOT EXISTS');
      expect(migrationSQL).toContain('DO $');
      expect(migrationSQL).toContain('pg_constraint');
    });

    it('should be safe to run multiple times', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      // Should check for existing constraints before adding
      const constraintChecks = migrationSQL.match(/IF NOT EXISTS/g);
      expect(constraintChecks).toBeTruthy();
      expect(constraintChecks!.length).toBeGreaterThan(10);
    });
  });

  describe('Rollback Script', () => {
    it('should drop all constraints added in migration', () => {
      rollbackSQL = readFileSync(rollbackPath, 'utf-8');
      
      expect(rollbackSQL).toContain('DROP CONSTRAINT IF EXISTS');
      expect(rollbackSQL).toContain('Rollback Migration 023');
    });

    it('should include all constraint names from migration', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      rollbackSQL = readFileSync(rollbackPath, 'utf-8');
      
      // Extract constraint names from migration
      const constraintNames = migrationSQL.match(/ADD CONSTRAINT (\w+)/g);
      
      if (constraintNames) {
        // Check that rollback includes drops for these constraints
        constraintNames.forEach(constraint => {
          const name = constraint.replace('ADD CONSTRAINT ', '');
          expect(rollbackSQL).toContain(name);
        });
      }
    });

    it('should drop utility functions', () => {
      rollbackSQL = readFileSync(rollbackPath, 'utf-8');
      
      expect(rollbackSQL).toContain('DROP FUNCTION IF EXISTS');
      expect(rollbackSQL).toContain('verify_constraint_coverage');
    });
  });

  describe('Documentation', () => {
    it('should include property references', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('Property 50');
      expect(migrationSQL).toContain('Property 51');
      expect(migrationSQL).toContain('Requirements 9.3');
    });

    it('should include comments explaining constraints', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('Purpose:');
      expect(migrationSQL).toContain('Foreign key');
      expect(migrationSQL).toContain('Check constraint');
      expect(migrationSQL).toContain('Business rule');
    });
  });

  describe('SQL Syntax Validation', () => {
    it('should have valid SQL syntax structure', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      // Check for balanced DO blocks (DO $ ... END $)
      const doCount = (migrationSQL.match(/DO \$/g) || []).length;
      const endDollarCount = (migrationSQL.match(/END \$;/g) || []).length;
      expect(doCount).toBe(endDollarCount);
      
      // Check that we have a reasonable number of constraint blocks
      expect(doCount).toBeGreaterThan(30); // Should have many constraint checks
    });

    it('should not have syntax errors in constraint definitions', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      // Check that all ALTER TABLE statements are properly formed
      const alterStatements = migrationSQL.match(/ALTER TABLE[^;]+;/g);
      if (alterStatements) {
        alterStatements.forEach(stmt => {
          expect(stmt).toMatch(/ALTER TABLE \w+\.\w+/);
          expect(stmt).toContain(';');
        });
      }
    });
  });

  describe('Coverage', () => {
    it('should cover all major tables', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      const expectedTables = [
        'profiles',
        'audits',
        'knowledge_graphs',
        'citations',
        'api_keys',
        'agent_keys',
        'usage_events',
        'tenants',
        'tenant_members',
        'a2a_wallets',
        'a2a_invoices',
        'a2a_ledger',
        'subscription_plans',
        'user_subscriptions',
        'subscription_invoices',
        'subscription_usage_logs',
        'global_entities',
        'global_relationships',
        'learning_analyses'
      ];
      
      expectedTables.forEach(table => {
        expect(migrationSQL).toContain(`public.${table}`);
      });
    });
  });
});

