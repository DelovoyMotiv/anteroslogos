-- ============================================================================
-- LLM Usage Logs Migration
-- Creates table and indexes for tracking LLM API usage and costs
-- ============================================================================

-- Create llm_usage_logs table
CREATE TABLE IF NOT EXISTS llm_usage_logs (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User tracking (optional - can be null for anonymous usage)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Model information
  model TEXT NOT NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('content_opt', 'fact_check', 'schema_gen', 'analysis')),
  
  -- Token usage
  prompt_tokens INTEGER NOT NULL CHECK (prompt_tokens >= 0),
  completion_tokens INTEGER NOT NULL CHECK (completion_tokens >= 0),
  total_tokens INTEGER NOT NULL CHECK (total_tokens >= 0),
  cached_tokens INTEGER CHECK (cached_tokens >= 0),
  
  -- Cost tracking
  cost_usd DECIMAL(10, 6) NOT NULL CHECK (cost_usd >= 0),
  
  -- Performance metrics
  duration_ms INTEGER CHECK (duration_ms >= 0),
  
  -- Status
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  
  -- Metadata (JSONB for flexible storage)
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Index on user_id for user-specific queries
CREATE INDEX IF NOT EXISTS idx_llm_usage_logs_user_id 
  ON llm_usage_logs(user_id);

-- Index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_llm_usage_logs_created_at 
  ON llm_usage_logs(created_at DESC);

-- Index on model for model-specific queries
CREATE INDEX IF NOT EXISTS idx_llm_usage_logs_model 
  ON llm_usage_logs(model);

-- Index on task_type for task-specific queries
CREATE INDEX IF NOT EXISTS idx_llm_usage_logs_task_type 
  ON llm_usage_logs(task_type);

-- Composite index for user + date range queries (most common)
CREATE INDEX IF NOT EXISTS idx_llm_usage_logs_user_date 
  ON llm_usage_logs(user_id, created_at DESC);

-- Composite index for model + date range queries
CREATE INDEX IF NOT EXISTS idx_llm_usage_logs_model_date 
  ON llm_usage_logs(model, created_at DESC);

-- Index on success for filtering failed requests
CREATE INDEX IF NOT EXISTS idx_llm_usage_logs_success 
  ON llm_usage_logs(success);

-- ============================================================================
-- Materialized View for Cost Summary
-- ============================================================================

-- Create materialized view for fast cost aggregations
CREATE MATERIALIZED VIEW IF NOT EXISTS llm_cost_summary AS
SELECT
  -- Time buckets
  DATE_TRUNC('day', created_at) AS day,
  DATE_TRUNC('week', created_at) AS week,
  DATE_TRUNC('month', created_at) AS month,
  
  -- Grouping dimensions
  user_id,
  model,
  task_type,
  
  -- Aggregated metrics
  COUNT(*) AS request_count,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) AS successful_requests,
  SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) AS failed_requests,
  
  -- Token usage
  SUM(prompt_tokens) AS total_prompt_tokens,
  SUM(completion_tokens) AS total_completion_tokens,
  SUM(total_tokens) AS total_tokens,
  SUM(COALESCE(cached_tokens, 0)) AS total_cached_tokens,
  
  -- Cost metrics
  SUM(cost_usd) AS total_cost_usd,
  AVG(cost_usd) AS avg_cost_usd,
  MIN(cost_usd) AS min_cost_usd,
  MAX(cost_usd) AS max_cost_usd,
  
  -- Performance metrics
  AVG(duration_ms) AS avg_duration_ms,
  MIN(duration_ms) AS min_duration_ms,
  MAX(duration_ms) AS max_duration_ms,
  
  -- Timestamps
  MIN(created_at) AS first_request_at,
  MAX(created_at) AS last_request_at
FROM
  llm_usage_logs
GROUP BY
  DATE_TRUNC('day', created_at),
  DATE_TRUNC('week', created_at),
  DATE_TRUNC('month', created_at),
  user_id,
  model,
  task_type;

-- Create indexes on materialized view
CREATE INDEX IF NOT EXISTS idx_llm_cost_summary_day 
  ON llm_cost_summary(day DESC);

CREATE INDEX IF NOT EXISTS idx_llm_cost_summary_week 
  ON llm_cost_summary(week DESC);

CREATE INDEX IF NOT EXISTS idx_llm_cost_summary_month 
  ON llm_cost_summary(month DESC);

CREATE INDEX IF NOT EXISTS idx_llm_cost_summary_user 
  ON llm_cost_summary(user_id);

CREATE INDEX IF NOT EXISTS idx_llm_cost_summary_model 
  ON llm_cost_summary(model);

CREATE INDEX IF NOT EXISTS idx_llm_cost_summary_task_type 
  ON llm_cost_summary(task_type);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on llm_usage_logs
ALTER TABLE llm_usage_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own logs
CREATE POLICY llm_usage_logs_select_own 
  ON llm_usage_logs 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own logs
CREATE POLICY llm_usage_logs_insert_own 
  ON llm_usage_logs 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Service role can do anything (for system operations)
CREATE POLICY llm_usage_logs_service_role 
  ON llm_usage_logs 
  FOR ALL 
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- Functions for Maintenance
-- ============================================================================

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_llm_cost_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY llm_cost_summary;
END;
$$;

-- Function to clean up old logs (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_llm_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM llm_usage_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- ============================================================================
-- Scheduled Jobs (using pg_cron if available)
-- ============================================================================

-- Note: These require pg_cron extension to be enabled
-- Uncomment if pg_cron is available in your Supabase project

-- Refresh materialized view every hour
-- SELECT cron.schedule(
--   'refresh-llm-cost-summary',
--   '0 * * * *',
--   'SELECT refresh_llm_cost_summary();'
-- );

-- Clean up old logs once per day at 2 AM
-- SELECT cron.schedule(
--   'cleanup-old-llm-logs',
--   '0 2 * * *',
--   'SELECT cleanup_old_llm_logs();'
-- );

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE llm_usage_logs IS 
  'Tracks LLM API usage, costs, and performance metrics for budget management and analytics';

COMMENT ON COLUMN llm_usage_logs.user_id IS 
  'User who made the request (nullable for anonymous usage)';

COMMENT ON COLUMN llm_usage_logs.model IS 
  'LLM model identifier (e.g., anthropic/claude-sonnet-4.5)';

COMMENT ON COLUMN llm_usage_logs.task_type IS 
  'Type of task: content_opt, fact_check, schema_gen, or analysis';

COMMENT ON COLUMN llm_usage_logs.cost_usd IS 
  'Cost in USD for this request';

COMMENT ON COLUMN llm_usage_logs.metadata IS 
  'Additional metadata (prompt hash, response hash, retry count, etc.)';

COMMENT ON MATERIALIZED VIEW llm_cost_summary IS 
  'Pre-aggregated cost and usage statistics for fast reporting';

COMMENT ON FUNCTION refresh_llm_cost_summary() IS 
  'Refreshes the llm_cost_summary materialized view';

COMMENT ON FUNCTION cleanup_old_llm_logs() IS 
  'Deletes logs older than 90 days to manage storage';
