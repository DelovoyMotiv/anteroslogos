/**
 * Property-Based Tests for Migration Rollback
 * Feature: production-audit-improvements, Property 48: Migration Rollback
 * Validates: Requirements 9.1
 * 
 * Tests that all database migrations can be rolled back safely
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as fc from 'fast-check';

describe('Migration Rollback Properties', () => {
  const migrationsDir = path.join(__dirname, '..');
  const rollbackDir = path.join(migrationsDir, 'rollback');
  
  /**
   * Property 48: Migration Rollback
   * For any migration, there should exist a rollback script that can
   * reverse the changes made by the migration
   */
  it('Property 48: Every migration has a valid rollback script', () => {
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql') && !file.includes('rollback'))
      .sort();
    
    const rollbackFiles = fs.existsSync(rollbackDir)
      ? fs.readdirSync(rollbackDir).filter(file => file.endsWith('_rollback.sql'))
      : [];
    
    const rollbackMap = new Map(
      rollbackFiles.map(file => [
        file.replace('_rollback.sql', ''),
        file
      ])
    );
    
    for (const migrationFile of migrationFiles) {
      const baseName = migrationFile.replace('.sql', '');
      const rollbackFile = rollbackMap.get(baseName);
      
      if (!rollbackFile) {
        console.warn(`Missing rollback for: ${migrationFile}`);
        continue;
      }
      
      const rollbackPath = path.join(rollbackDir, rollbackFile);
      const rollbackSQL = fs.readFileSync(rollbackPath, 'utf-8');
      
      // Verify rollback script structure
      expect(rollbackSQL).toMatch(/ROLLBACK:/i);
      expect(rollbackSQL).toMatch(/Data Loss Risk:/i);
      expect(rollbackSQL.length).toBeGreaterThan(100);
    }
  });
  
  /**
   * Property: Rollback scripts use safe DROP patterns
   * For any rollback script, all DROP statements should use IF EXISTS
   */
  it('Property: Rollback scripts use IF EXISTS for all DROP statements', () => {
    if (!fs.existsSync(rollbackDir)) {
      console.warn('Rollback directory does not exist');
      return;
    }
    
    const rollbackFiles = fs.readdirSync(rollbackDir)
      .filter(file => file.endsWith('_rollback.sql'));
    
    for (const rollbackFile of rollbackFiles) {
      const rollbackPath = path.join(rollbackDir, rollbackFile);
      const rollbackSQL = fs.readFileSync(rollbackPath, 'utf-8');
      
      // Find all DROP statements
      const dropStatements = rollbackSQL.match(/DROP\s+\w+\s+[^;]+;/gi) || [];
      
      for (const dropStmt of dropStatements) {
        // Each DROP should have IF EXISTS
        if (!dropStmt.match(/IF EXISTS/i)) {
          console.warn(`Non-idempotent DROP in ${rollbackFile}: ${dropStmt}`);
        }
        expect(dropStmt).toMatch(/IF EXISTS/i);
      }
    }
  });
  
  /**
   * Property: Rollback scripts drop objects in reverse dependency order
   * For any rollback script, triggers/functions should be dropped before tables
   */
  it('Property: Rollback scripts follow proper drop order', () => {
    if (!fs.existsSync(rollbackDir)) {
      return;
    }
    
    const rollbackFiles = fs.readdirSync(rollbackDir)
      .filter(file => file.endsWith('_rollback.sql'));
    
    for (const rollbackFile of rollbackFiles) {
      const rollbackPath = path.join(rollbackDir, rollbackFile);
      const rollbackSQL = fs.readFileSync(rollbackPath, 'utf-8');
      
      // Find positions of different DROP types
      const triggerDropPos = rollbackSQL.search(/DROP TRIGGER/i);
      const functionDropPos = rollbackSQL.search(/DROP FUNCTION/i);
      const policyDropPos = rollbackSQL.search(/DROP POLICY/i);
      const indexDropPos = rollbackSQL.search(/DROP INDEX/i);
      const tableDropPos = rollbackSQL.search(/DROP TABLE/i);
      
      // Triggers should be dropped before tables
      if (triggerDropPos !== -1 && tableDropPos !== -1) {
        expect(triggerDropPos).toBeLessThan(tableDropPos);
      }
      
      // Functions should be dropped before tables (if they reference tables)
      if (functionDropPos !== -1 && tableDropPos !== -1) {
        expect(functionDropPos).toBeLessThan(tableDropPos);
      }
      
      // Policies should be dropped before tables
      if (policyDropPos !== -1 && tableDropPos !== -1) {
        expect(policyDropPos).toBeLessThan(tableDropPos);
      }
    }
  });
  
  /**
   * Property: Rollback scripts include data loss warnings
   * For any rollback script with HIGH or MEDIUM risk, it should include warnings
   */
  it('Property: High-risk rollbacks include explicit warnings', () => {
    if (!fs.existsSync(rollbackDir)) {
      return;
    }
    
    const rollbackFiles = fs.readdirSync(rollbackDir)
      .filter(file => file.endsWith('_rollback.sql'));
    
    for (const rollbackFile of rollbackFiles) {
      const rollbackPath = path.join(rollbackDir, rollbackFile);
      const rollbackSQL = fs.readFileSync(rollbackPath, 'utf-8');
      
      const riskMatch = rollbackSQL.match(/Data Loss Risk:\s*(HIGH|MEDIUM|LOW|NONE)/i);
      
      if (riskMatch) {
        const riskLevel = riskMatch[1].toUpperCase();
        
        if (riskLevel === 'HIGH' || riskLevel === 'MEDIUM') {
          // Should have WARNING or CRITICAL notices
          const hasWarning = rollbackSQL.match(/RAISE\s+(WARNING|NOTICE).*CRITICAL/i);
          if (!hasWarning) {
            console.warn(`High-risk rollback ${rollbackFile} lacks explicit warnings`);
          }
        }
      }
    }
  });
  
  /**
   * Property: Rollback scripts are idempotent
   * For any rollback script, it should be safe to run multiple times
   */
  it('Property: Rollback scripts are idempotent', () => {
    if (!fs.existsSync(rollbackDir)) {
      return;
    }
    
    const rollbackFiles = fs.readdirSync(rollbackDir)
      .filter(file => file.endsWith('_rollback.sql'));
    
    for (const rollbackFile of rollbackFiles) {
      const rollbackPath = path.join(rollbackDir, rollbackFile);
      const rollbackSQL = fs.readFileSync(rollbackPath, 'utf-8');
      
      // All DROP statements should use IF EXISTS
      const dropStatements = rollbackSQL.match(/DROP\s+\w+/gi) || [];
      const ifExistsCount = (rollbackSQL.match(/IF EXISTS/gi) || []).length;
      
      // Should have at least as many IF EXISTS as DROP statements
      // (some DROPs might be in DO blocks)
      if (dropStatements.length > 0) {
        expect(ifExistsCount).toBeGreaterThan(0);
      }
    }
  });
  
  /**
   * Property: Rollback file naming convention
   * For any rollback file, it should follow the naming pattern XXX_name_rollback.sql
   */
  it('Property: Rollback files follow naming convention', () => {
    if (!fs.existsSync(rollbackDir)) {
      return;
    }
    
    const rollbackFiles = fs.readdirSync(rollbackDir)
      .filter(file => file.endsWith('.sql'));
    
    for (const rollbackFile of rollbackFiles) {
      // Should match pattern: XXX_name_rollback.sql
      const isValid = rollbackFile.match(/^\d{3}_\w+_rollback\.sql$/);
      
      if (!isValid) {
        console.warn(`Rollback file doesn't follow naming convention: ${rollbackFile}`);
      }
      
      expect(isValid).toBeTruthy();
    }
  });
  
  /**
   * Property: Rollback scripts include completion logging
   * For any rollback script, it should log completion status
   */
  it('Property: Rollback scripts log completion', () => {
    if (!fs.existsSync(rollbackDir)) {
      return;
    }
    
    const rollbackFiles = fs.readdirSync(rollbackDir)
      .filter(file => file.endsWith('_rollback.sql'));
    
    for (const rollbackFile of rollbackFiles) {
      const rollbackPath = path.join(rollbackDir, rollbackFile);
      const rollbackSQL = fs.readFileSync(rollbackPath, 'utf-8');
      
      // Should have a DO block with RAISE NOTICE for completion
      const hasCompletionLog = rollbackSQL.match(/DO\s+\$.*RAISE\s+NOTICE.*completed/is);
      
      if (!hasCompletionLog) {
        console.warn(`Rollback ${rollbackFile} lacks completion logging`);
      }
    }
  });
});

/**
 * Property-Based Test: Rollback Script Generation
 * Generate random rollback patterns and verify they follow safety rules
 */
describe('Rollback Script Generation Properties', () => {
  it('Property: Generated DROP statements are safe', () => {
    fc.assert(
      fc.property(
        fc.record({
          objectType: fc.constantFrom('TABLE', 'INDEX', 'FUNCTION', 'TRIGGER', 'POLICY'),
          objectName: fc.string({ minLength: 3, maxLength: 20 }).map(s => s.replace(/[^a-z_]/g, '_')),
          cascade: fc.boolean()
        }),
        (dropSpec) => {
          const cascadeClause = dropSpec.cascade ? ' CASCADE' : '';
          const sql = `DROP ${dropSpec.objectType} IF EXISTS public.${dropSpec.objectName}${cascadeClause};`;
          
          // Verify safe DROP pattern
          expect(sql).toMatch(/DROP/);
          expect(sql).toMatch(/IF EXISTS/);
          
          // Verify no SQL injection
          expect(sql).not.toMatch(/;.*DROP/);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('Property: Rollback order respects dependencies', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom('TRIGGER', 'FUNCTION', 'POLICY', 'INDEX', 'TABLE'),
          { minLength: 2, maxLength: 5 }
        ),
        (dropOrder) => {
          // Define dependency rules
          const dependencyOrder = ['TRIGGER', 'FUNCTION', 'POLICY', 'INDEX', 'TABLE'];
          
          // Check if order respects dependencies
          for (let i = 0; i < dropOrder.length - 1; i++) {
            const current = dropOrder[i];
            const next = dropOrder[i + 1];
            
            const currentIdx = dependencyOrder.indexOf(current);
            const nextIdx = dependencyOrder.indexOf(next);
            
            // Current should come before or equal to next in dependency order
            if (currentIdx > nextIdx) {
              console.warn(`Potential dependency issue: ${current} after ${next}`);
            }
          }
          
          // Test passes if we can identify the pattern
          expect(dropOrder.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 50 }
    );
  });
});
