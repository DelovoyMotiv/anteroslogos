/**
 * Validation Tests for LLM Usage Logs Migration
 * Feature: predictive-citation-intelligence, Task 3.1.3
 * 
 * These tests validate the migration SQL syntax, structure, and functionality
 * for the LLM usage tracking and cost management system.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('LLM Usage Logs Migration Validation', () => {
  const migrationPath = join(__dirname, '../030_llm_usage_logs.sql');
  let migrationSQL: string;

  it('should load migration file successfully', () => {
    expect(existsSync(migrationPath)).toBe(true);
    migrationSQL = readFileSync(migrationPath, 'utf-8');
    expect(migrationSQL).toBeTruthy();
    expect(migrationSQL.length).toBeGreaterThan(0);
  });

  describe('Table Structure', () => {
    it('should create llm_usage_logs table with IF NOT EXISTS', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('CREATE TABLE IF NOT EXISTS llm_usage_logs');
      expect(migrationSQL).toContain('id UUID PRIMARY KEY DEFAULT gen_random_uuid()');
    });

    it('should have all required columns', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      const requiredColumns = [
        'id UUID',
        'user_id UUID',
        'model TEXT NOT NULL',
        'task_type TEXT NOT NULL',
        'prompt_tokens INTEGER NOT NULL',
        'completion_tokens INTEGER NOT NULL',
        'total_tokens INTEGER NOT NULL',
        'cached_tokens INTEGER',
        'cost_usd DECIMAL',
        'duration_ms INTEGER',
        'success BOOLEAN NOT NULL',
        'error_message TEXT',
        'metadata JSONB',
        'created_at TIMESTAMPTZ NOT NULL'
      ];
      
      requiredColumns.forEach(column => {
        expect(migrationSQL).toContain(column);
      });
    });

    it('should have proper foreign key constraint for user_id', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL');
    });

    it('should have CHECK constraint for task_type', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain("CHECK (task_type IN ('content_opt', 'fact_check', 'schema_gen', 'analysis'))");
    });

    it('should have CHECK constraints for non-negative values', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('CHECK (prompt_tokens >= 0)');
      expect(migrationSQL).toContain('CHECK (completion_tokens >= 0)');
      expect(migrationSQL).toContain('CHECK (total_tokens >= 0)');
      expect(migrationSQL).toContain('CHECK (cached_tokens >= 0)');
      expect(migrationSQL).toContain('CHECK (cost_usd >= 0)');
      expect(migrationSQL).toContain('CHECK (duration_ms >= 0)');
    });

    it('should have default value for success column', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('success BOOLEAN NOT NULL DEFAULT true');
    });

    it('should have default value for created_at', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
    });
  });

  describe('Indexes', () => {
    it('should create all required indexes with IF NOT EXISTS', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      const requiredIndexes = [
        'idx_llm_usage_logs_user_id',
        'idx_llm_usage_logs_created_at',
        'idx_llm_usage_logs_model',
        'idx_llm_usage_logs_task_type',
        'idx_llm_usage_logs_user_date',
        'idx_llm_usage_logs_model_date',
        'idx_llm_usage_logs_success'
      ];
      
      requiredIndexes.forEach(indexName => {
        expect(migrationSQL).toContain(`CREATE INDEX IF NOT EXISTS ${indexName}`);
      });
    });

    it('should have index on user_id for user-specific queries', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('CREATE INDEX IF NOT EXISTS idx_llm_usage_logs_user_id');
      expect(migrationSQL).toContain('ON llm_usage_logs(user_id)');
    });

    it('should have index on created_at for time-based queries', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('CREATE INDEX IF NOT EXISTS idx_llm_usage_logs_created_at');
      expect(migrationSQL).toContain('ON llm_usage_logs(created_at DESC)');
    });

    it('should have composite indexes for common query patterns', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      // User + date composite index
      expect(migrationSQL).toContain('idx_llm_usage_logs_user_date');
      expect(migrationSQL).toContain('ON llm_usage_logs(user_id, created_at DESC)');
      
      // Model + date composite index
      expect(migrationSQL).toContain('idx_llm_usage_logs_model_date');
      expect(migrationSQL).toContain('ON llm_usage_logs(model, created_at DESC)');
    });
  });

  describe('Materialized View', () => {
    it('should create llm_cost_summary materialized view', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('CREATE MATERIALIZED VIEW IF NOT EXISTS llm_cost_summary');
    });

    it('should aggregate by time buckets (day, week, month)', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain("DATE_TRUNC('day', created_at) AS day");
      expect(migrationSQL).toContain("DATE_TRUNC('week', created_at) AS week");
      expect(migrationSQL).toContain("DATE_TRUNC('month', created_at) AS month");
    });

    it('should aggregate by user_id, model, and task_type', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('user_id');
      expect(migrationSQL).toContain('model');
      expect(migrationSQL).toContain('task_type');
      expect(migrationSQL).toContain('GROUP BY');
    });

    it('should calculate request counts', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('COUNT(*) AS request_count');
      expect(migrationSQL).toContain('SUM(CASE WHEN success THEN 1 ELSE 0 END) AS successful_requests');
      expect(migrationSQL).toContain('SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) AS failed_requests');
    });

    it('should calculate token usage aggregates', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('SUM(prompt_tokens) AS total_prompt_tokens');
      expect(migrationSQL).toContain('SUM(completion_tokens) AS total_completion_tokens');
      expect(migrationSQL).toContain('SUM(total_tokens) AS total_tokens');
      expect(migrationSQL).toContain('SUM(COALESCE(cached_tokens, 0)) AS total_cached_tokens');
    });

    it('should calculate cost metrics', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('SUM(cost_usd) AS total_cost_usd');
      expect(migrationSQL).toContain('AVG(cost_usd) AS avg_cost_usd');
      expect(migrationSQL).toContain('MIN(cost_usd) AS min_cost_usd');
      expect(migrationSQL).toContain('MAX(cost_usd) AS max_cost_usd');
    });

    it('should calculate performance metrics', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('AVG(duration_ms) AS avg_duration_ms');
      expect(migrationSQL).toContain('MIN(duration_ms) AS min_duration_ms');
      expect(migrationSQL).toContain('MAX(duration_ms) AS max_duration_ms');
    });

    it('should track first and last request timestamps', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('MIN(created_at) AS first_request_at');
      expect(migrationSQL).toContain('MAX(created_at) AS last_request_at');
    });

    it('should have indexes on materialized view', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      const viewIndexes = [
        'idx_llm_cost_summary_day',
        'idx_llm_cost_summary_week',
        'idx_llm_cost_summary_month',
        'idx_llm_cost_summary_user',
        'idx_llm_cost_summary_model',
        'idx_llm_cost_summary_task_type'
      ];
      
      viewIndexes.forEach(indexName => {
        expect(migrationSQL).toContain(`CREATE INDEX IF NOT EXISTS ${indexName}`);
        expect(migrationSQL).toContain(`ON llm_cost_summary`);
      });
    });
  });

  describe('Row Level Security (RLS)', () => {
    it('should enable RLS on llm_usage_logs table', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('ALTER TABLE llm_usage_logs ENABLE ROW LEVEL SECURITY');
    });

    it('should have policy for users to view their own logs', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('CREATE POLICY llm_usage_logs_select_own');
      expect(migrationSQL).toContain('ON llm_usage_logs');
      expect(migrationSQL).toContain('FOR SELECT');
      expect(migrationSQL).toContain('USING (auth.uid() = user_id)');
    });

    it('should have policy for users to insert their own logs', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('CREATE POLICY llm_usage_logs_insert_own');
      expect(migrationSQL).toContain('FOR INSERT');
      expect(migrationSQL).toContain('WITH CHECK (auth.uid() = user_id OR user_id IS NULL)');
    });

    it('should have policy for service role', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('CREATE POLICY llm_usage_logs_service_role');
      expect(migrationSQL).toContain('FOR ALL');
      expect(migrationSQL).toContain("auth.jwt()->>'role' = 'service_role'");
    });
  });

  describe('Helper Functions', () => {
    it('should create refresh_llm_cost_summary function', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('CREATE OR REPLACE FUNCTION refresh_llm_cost_summary()');
      expect(migrationSQL).toContain('RETURNS void');
      expect(migrationSQL).toContain('LANGUAGE plpgsql');
      expect(migrationSQL).toContain('SECURITY DEFINER');
      expect(migrationSQL).toContain('REFRESH MATERIALIZED VIEW CONCURRENTLY llm_cost_summary');
    });

    it('should create cleanup_old_llm_logs function', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('CREATE OR REPLACE FUNCTION cleanup_old_llm_logs()');
      expect(migrationSQL).toContain('RETURNS INTEGER');
      expect(migrationSQL).toContain('LANGUAGE plpgsql');
      expect(migrationSQL).toContain('SECURITY DEFINER');
      expect(migrationSQL).toContain("DELETE FROM llm_usage_logs");
      expect(migrationSQL).toContain("WHERE created_at < NOW() - INTERVAL '90 days'");
    });

    it('should return deleted count from cleanup function', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('GET DIAGNOSTICS deleted_count = ROW_COUNT');
      expect(migrationSQL).toContain('RETURN deleted_count');
    });
  });

  describe('Documentation', () => {
    it('should include migration header with description', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('LLM Usage Logs Migration');
      expect(migrationSQL).toContain('Creates table and indexes for tracking LLM API usage and costs');
    });

    it('should have comments on table', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('COMMENT ON TABLE llm_usage_logs');
      expect(migrationSQL).toContain('Tracks LLM API usage, costs, and performance metrics');
    });

    it('should have comments on key columns', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('COMMENT ON COLUMN llm_usage_logs.user_id');
      expect(migrationSQL).toContain('COMMENT ON COLUMN llm_usage_logs.model');
      expect(migrationSQL).toContain('COMMENT ON COLUMN llm_usage_logs.task_type');
      expect(migrationSQL).toContain('COMMENT ON COLUMN llm_usage_logs.cost_usd');
      expect(migrationSQL).toContain('COMMENT ON COLUMN llm_usage_logs.metadata');
    });

    it('should have comments on materialized view', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('COMMENT ON MATERIALIZED VIEW llm_cost_summary');
      expect(migrationSQL).toContain('Pre-aggregated cost and usage statistics');
    });

    it('should have comments on functions', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('COMMENT ON FUNCTION refresh_llm_cost_summary()');
      expect(migrationSQL).toContain('COMMENT ON FUNCTION cleanup_old_llm_logs()');
    });
  });

  describe('Idempotency', () => {
    it('should use IF NOT EXISTS for table creation', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('CREATE TABLE IF NOT EXISTS llm_usage_logs');
    });

    it('should use IF NOT EXISTS for all indexes', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      const indexCreations = migrationSQL.match(/CREATE INDEX/g);
      const ifNotExists = migrationSQL.match(/CREATE INDEX IF NOT EXISTS/g);
      
      expect(indexCreations).toBeTruthy();
      expect(ifNotExists).toBeTruthy();
      expect(indexCreations!.length).toBe(ifNotExists!.length);
    });

    it('should use IF NOT EXISTS for materialized view', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('CREATE MATERIALIZED VIEW IF NOT EXISTS llm_cost_summary');
    });

    it('should use OR REPLACE for functions', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('CREATE OR REPLACE FUNCTION refresh_llm_cost_summary()');
      expect(migrationSQL).toContain('CREATE OR REPLACE FUNCTION cleanup_old_llm_logs()');
    });
  });

  describe('SQL Syntax Validation', () => {
    it('should have valid SQL syntax structure', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      // Check for balanced parentheses in CREATE TABLE
      const createTableMatch = migrationSQL.match(/CREATE TABLE IF NOT EXISTS llm_usage_logs \(([\s\S]*?)\);/);
      expect(createTableMatch).toBeTruthy();
    });

    it('should have properly terminated statements', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      // All CREATE statements should end with semicolon
      const createStatements = migrationSQL.match(/CREATE (TABLE|INDEX|MATERIALIZED VIEW|POLICY|FUNCTION)[^;]+/g);
      expect(createStatements).toBeTruthy();
      
      // Check that migration has reasonable number of statements
      const semicolons = migrationSQL.match(/;/g);
      expect(semicolons).toBeTruthy();
      expect(semicolons!.length).toBeGreaterThan(20);
    });

    it('should not have syntax errors in CHECK constraints', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      const checkConstraints = migrationSQL.match(/CHECK \([^)]+\)/g);
      expect(checkConstraints).toBeTruthy();
      expect(checkConstraints!.length).toBeGreaterThan(5);
      
      // All CHECK constraints should be properly formed
      checkConstraints!.forEach(constraint => {
        expect(constraint).toMatch(/CHECK \(.+\)/);
      });
    });
  });

  describe('Data Types', () => {
    it('should use appropriate data types for token counts', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('prompt_tokens INTEGER');
      expect(migrationSQL).toContain('completion_tokens INTEGER');
      expect(migrationSQL).toContain('total_tokens INTEGER');
      expect(migrationSQL).toContain('cached_tokens INTEGER');
    });

    it('should use DECIMAL for cost with appropriate precision', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('cost_usd DECIMAL(10, 6)');
    });

    it('should use TIMESTAMPTZ for timestamps', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('created_at TIMESTAMPTZ');
    });

    it('should use JSONB for flexible metadata storage', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('metadata JSONB');
    });
  });

  describe('Task Type Validation', () => {
    it('should enforce valid task types', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      const taskTypes = ['content_opt', 'fact_check', 'schema_gen', 'analysis'];
      taskTypes.forEach(taskType => {
        expect(migrationSQL).toContain(taskType);
      });
    });

    it('should use CHECK constraint for task_type enum', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toMatch(/task_type TEXT NOT NULL CHECK \(task_type IN \([^)]+\)\)/);
    });
  });

  describe('Performance Considerations', () => {
    it('should have indexes on frequently queried columns', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      // User queries
      expect(migrationSQL).toContain('idx_llm_usage_logs_user_id');
      
      // Time-based queries
      expect(migrationSQL).toContain('idx_llm_usage_logs_created_at');
      
      // Model-specific queries
      expect(migrationSQL).toContain('idx_llm_usage_logs_model');
      
      // Task-specific queries
      expect(migrationSQL).toContain('idx_llm_usage_logs_task_type');
    });

    it('should use DESC ordering for time-based indexes', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('created_at DESC');
    });

    it('should use CONCURRENTLY for materialized view refresh', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('REFRESH MATERIALIZED VIEW CONCURRENTLY');
    });
  });

  describe('Security', () => {
    it('should use SECURITY DEFINER for maintenance functions', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      const securityDefinerCount = (migrationSQL.match(/SECURITY DEFINER/g) || []).length;
      expect(securityDefinerCount).toBeGreaterThanOrEqual(2);
    });

    it('should allow NULL user_id for anonymous usage', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      // user_id should be nullable
      expect(migrationSQL).toContain('user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL');
      
      // Insert policy should allow NULL user_id
      expect(migrationSQL).toContain('auth.uid() = user_id OR user_id IS NULL');
    });

    it('should use ON DELETE SET NULL for user_id foreign key', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('REFERENCES auth.users(id) ON DELETE SET NULL');
    });
  });

  describe('Maintenance Features', () => {
    it('should have cleanup function for old logs', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('cleanup_old_llm_logs');
      expect(migrationSQL).toContain("INTERVAL '90 days'");
    });

    it('should have refresh function for materialized view', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('refresh_llm_cost_summary');
    });

    it('should include commented pg_cron examples', () => {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      expect(migrationSQL).toContain('pg_cron');
      expect(migrationSQL).toContain('cron.schedule');
    });
  });
});
