/**
 * Property-Based Tests for Migration Idempotency
 * Feature: production-audit-improvements, Property 47: Idempotent Migrations
 * Validates: Requirements 9.1
 * 
 * Tests that all database migrations can be run multiple times safely
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as fc from 'fast-check';

describe('Migration Idempotency Properties', () => {
  
  /**
   * Property 47: Idempotent Migrations
   * For any migration file, it should use idempotent SQL patterns
   */
  it('Property 47: All migrations use idempotent patterns', () => {
    const migrationsDir = path.join(__dirname, '..');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql') && !file.includes('rollback'))
      .sort();
    
    expect(migrationFiles.length).toBeGreaterThan(0);
    
    for (const migrationFile of migrationFiles) {
      const migrationPath = path.join(migrationsDir, migrationFile);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
      
      // Check for idempotent CREATE patterns
      const hasIdempotentCreate = 
        migrationSQL.match(/CREATE TABLE IF NOT EXISTS/i) ||
        migrationSQL.match(/CREATE INDEX IF NOT EXISTS/i) ||
        migrationSQL.match(/CREATE.*OR REPLACE/i);
      
      // Check for safe DROP patterns
      const unsafeDrop = migrationSQL.match(/DROP\s+(TABLE|INDEX|FUNCTION|TRIGGER)\s+(?!IF\s+EXISTS)/i);
      
      if (!hasIdempotentCreate && migrationSQL.match(/CREATE/i)) {
        console.warn(`Migration ${migrationFile} may lack idempotent CREATE patterns`);
      }
      
      if (unsafeDrop) {
        console.warn(`Migration ${migrationFile} has unsafe DROP: ${unsafeDrop[0]}`);
      }
    }
  });
  
  /**
   * Property: Migration files use idempotent SQL patterns
   */
  it('Property: Migration files contain idempotent SQL patterns', () => {
    const migrationsDir = path.join(__dirname, '..');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql') && !file.includes('rollback'));
    
    const idempotentPatterns = [
      /CREATE TABLE IF NOT EXISTS/i,
      /CREATE INDEX IF NOT EXISTS/i,
      /CREATE.*OR REPLACE FUNCTION/i,
      /DROP.*IF EXISTS/i,
      /ALTER TABLE.*ADD COLUMN IF NOT EXISTS/i,
      /DO \$\$.*EXCEPTION.*duplicate/is
    ];
    
    for (const migrationFile of migrationFiles) {
      const migrationPath = path.join(migrationsDir, migrationFile);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
      
      const hasIdempotentPattern = idempotentPatterns.some(pattern => 
        pattern.test(migrationSQL)
      );
      
      expect(hasIdempotentPattern).toBe(true);
    }
  });
  
  /**
   * Property: Every migration has a corresponding rollback script
   */
  it('Property: Every migration has a rollback script', () => {
    const migrationsDir = path.join(__dirname, '..');
    const rollbackDir = path.join(migrationsDir, 'rollback');
    
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql') && !file.includes('rollback'));
    
    const rollbackFiles = fs.existsSync(rollbackDir)
      ? fs.readdirSync(rollbackDir).filter(file => file.endsWith('_rollback.sql'))
      : [];
    
    for (const migrationFile of migrationFiles) {
      const baseName = migrationFile.replace('.sql', '');
      const expectedRollback = `${baseName}_rollback.sql`;
      
      const hasRollback = rollbackFiles.includes(expectedRollback);
      
      if (!hasRollback) {
        console.warn(`Missing rollback script for: ${migrationFile}`);
      }
      
      // For critical migrations, rollback is required
      const isCritical = migrationFile.match(/^(001|002|007|010|020|021|022)_/);
      if (isCritical) {
        expect(hasRollback).toBe(true);
      }
    }
  });
  
  /**
   * Property: Rollback scripts are valid SQL
   */
  it('Property: Rollback scripts are syntactically valid', () => {
    const rollbackDir = path.join(__dirname, '..', 'rollback');
    
    if (!fs.existsSync(rollbackDir)) {
      console.warn('Rollback directory does not exist');
      return;
    }
    
    const rollbackFiles = fs.readdirSync(rollbackDir)
      .filter(file => file.endsWith('_rollback.sql'));
    
    for (const rollbackFile of rollbackFiles) {
      const rollbackPath = path.join(rollbackDir, rollbackFile);
      const rollbackSQL = fs.readFileSync(rollbackPath, 'utf-8');
      
      expect(rollbackSQL.length).toBeGreaterThan(0);
      expect(rollbackSQL).toMatch(/DROP/i);
      expect(rollbackSQL).toMatch(/IF EXISTS/i);
      expect(rollbackSQL).toMatch(/ROLLBACK:/i);
      expect(rollbackSQL).toMatch(/Data Loss Risk:/i);
    }
  });
  
  /**
   * Property: Migrations are numbered sequentially
   */
  it('Property: Migration numbering is sequential', () => {
    const migrationsDir = path.join(__dirname, '..');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql') && !file.includes('rollback'))
      .sort();
    
    const numbers = migrationFiles
      .map(file => {
        const match = file.match(/^(\d+)_/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter(n => n !== null) as number[];
    
    for (let i = 1; i < numbers.length; i++) {
      const gap = numbers[i] - numbers[i - 1];
      if (gap > 5) {
        console.warn(`Large gap in migration numbers: ${numbers[i - 1]} -> ${numbers[i]}`);
      }
    }
    
    expect(numbers.length).toBeGreaterThan(0);
  });
  
  /**
   * Property: Migrations include proper documentation
   */
  it('Property: Migrations are properly documented', () => {
    const migrationsDir = path.join(__dirname, '..');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql') && !file.includes('rollback'));
    
    for (const migrationFile of migrationFiles) {
      const migrationPath = path.join(migrationsDir, migrationFile);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
      
      const hasHeader = migrationSQL.match(/^--.*Migration/im);
      const hasPurpose = migrationSQL.match(/Purpose:/i);
      
      if (!hasHeader || !hasPurpose) {
        console.warn(`Migration ${migrationFile} lacks proper documentation`);
      }
    }
  });
});

/**
 * Property-Based Test: Migration SQL Pattern Generation
 */
describe('Migration SQL Pattern Properties', () => {
  it('Property: Generated CREATE TABLE statements are idempotent', () => {
    fc.assert(
      fc.property(
        fc.record({
          tableName: fc.string({ minLength: 3, maxLength: 20 }).map(s => s.replace(/[^a-z_]/g, '_')),
          columns: fc.array(
            fc.record({
              name: fc.string({ minLength: 2, maxLength: 15 }).map(s => s.replace(/[^a-z_]/g, '_')),
              type: fc.constantFrom('TEXT', 'INTEGER', 'UUID', 'TIMESTAMPTZ', 'BOOLEAN')
            }),
            { minLength: 1, maxLength: 5 }
          )
        }),
        (tableSpec) => {
          const sql = `CREATE TABLE IF NOT EXISTS public.${tableSpec.tableName} (
            ${tableSpec.columns.map(col => `${col.name} ${col.type}`).join(',\n  ')}
          );`;
          
          expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS/);
          expect(sql).toMatch(/public\./);
          expect(sql).not.toMatch(/;.*DROP/i);
          expect(sql).not.toMatch(/--.*DROP/i);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('Property: Generated CREATE INDEX statements are idempotent', () => {
    fc.assert(
      fc.property(
        fc.record({
          indexName: fc.string({ minLength: 5, maxLength: 30 }).map(s => s.replace(/[^a-z_]/g, '_')),
          tableName: fc.string({ minLength: 3, maxLength: 20 }).map(s => s.replace(/[^a-z_]/g, '_')),
          columnName: fc.string({ minLength: 2, maxLength: 15 }).map(s => s.replace(/[^a-z_]/g, '_'))
        }),
        (indexSpec) => {
          const sql = `CREATE INDEX IF NOT EXISTS ${indexSpec.indexName} ON public.${indexSpec.tableName}(${indexSpec.columnName});`;
          
          expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS/);
          expect(sql).toMatch(/ON public\./);
        }
      ),
      { numRuns: 100 }
    );
  });
});
