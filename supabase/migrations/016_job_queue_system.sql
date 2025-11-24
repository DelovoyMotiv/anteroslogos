-- =====================================================
-- Migration 016: Job Queue System + Advanced Insights
-- =====================================================
-- Description: Persistent job queue, webhook callbacks, and global analytics
-- Created: 2025-11-24
-- Dependencies: 007_multi_tenancy_isolation.sql
-- Purpose: Production async job processing and cross-tenant insights

-- =====================================================
-- 1. JOB QUEUE TABLES
-- =====================================================

-- Persistent audit job queue
CREATE TABLE IF NOT EXISTS audit_jobs (
  id TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('high', 'normal', 'low')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  depth TEXT NOT NULL CHECK (depth IN ('quick', 'standard', 'deep')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  result JSONB,
  error TEXT,
  metadata JSONB DEFAULT '{}',
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3
);

-- Indexes for job queue performance
CREATE INDEX IF NOT EXISTS idx_audit_jobs_status_priority 
  ON audit_jobs(status, priority, created_at) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_audit_jobs_tenant_status 
  ON audit_jobs(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_audit_jobs_completed 
  ON audit_jobs(completed_at DESC) 
  WHERE status = 'completed';

COMMENT ON TABLE audit_jobs IS 'Persistent job queue for async audit processing';
COMMENT ON COLUMN audit_jobs.priority IS 'Job priority: high > normal > low';
COMMENT ON COLUMN audit_jobs.retry_count IS 'Number of retry attempts (max 3)';

-- Batch job tracking
CREATE TABLE IF NOT EXISTS batch_jobs (
  id TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  urls TEXT[] NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('high', 'normal', 'low')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  job_ids TEXT[] DEFAULT '{}',
  completed_jobs INTEGER DEFAULT 0,
  failed_jobs INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_batch_jobs_tenant_status 
  ON batch_jobs(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_batch_jobs_created 
  ON batch_jobs(created_at DESC);

COMMENT ON TABLE batch_jobs IS 'Batch audit job tracking';

-- Webhook callback system
CREATE TABLE IF NOT EXISTS job_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL REFERENCES audit_jobs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  secret TEXT, -- HMAC secret for signature verification
  status TEXT NOT NULL CHECK (status IN ('pending', 'delivered', 'failed')) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  response_code INTEGER,
  response_body TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partial index for pending webhooks (efficient retry queries)
CREATE INDEX IF NOT EXISTS idx_job_webhooks_pending 
  ON job_webhooks(status, next_retry_at) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_job_webhooks_job 
  ON job_webhooks(job_id);

COMMENT ON TABLE job_webhooks IS 'Webhook callbacks for job completion notifications';
COMMENT ON COLUMN job_webhooks.secret IS 'HMAC-SHA256 secret for webhook signature';

-- =====================================================
-- 2. ROW-LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE audit_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_webhooks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if present
DROP POLICY IF EXISTS "audit_jobs_tenant_isolation" ON audit_jobs;
DROP POLICY IF EXISTS "batch_jobs_tenant_isolation" ON batch_jobs;
DROP POLICY IF EXISTS "job_webhooks_tenant_isolation" ON job_webhooks;

-- Audit jobs tenant isolation
CREATE POLICY "audit_jobs_tenant_isolation"
  ON audit_jobs
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    OR auth.role() = 'service_role'
  );

-- Batch jobs tenant isolation
CREATE POLICY "batch_jobs_tenant_isolation"
  ON batch_jobs
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    OR auth.role() = 'service_role'
  );

-- Webhooks tenant isolation
CREATE POLICY "job_webhooks_tenant_isolation"
  ON job_webhooks
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    OR auth.role() = 'service_role'
  );

-- =====================================================
-- 3. POSTGRESQL FUNCTIONS
-- =====================================================

-- Atomic job dequeue with priority ordering
CREATE OR REPLACE FUNCTION dequeue_job()
RETURNS TABLE (
  id TEXT,
  tenant_id UUID,
  url TEXT,
  priority TEXT,
  status TEXT,
  depth TEXT,
  created_at TIMESTAMPTZ,
  metadata JSONB,
  retry_count INTEGER,
  max_retries INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  job_record RECORD;
BEGIN
  -- Find next job with priority ordering
  -- Uses FOR UPDATE SKIP LOCKED for atomic dequeue
  SELECT * INTO job_record
  FROM audit_jobs
  WHERE status = 'pending'
  ORDER BY 
    CASE priority
      WHEN 'high' THEN 1
      WHEN 'normal' THEN 2
      WHEN 'low' THEN 3
    END,
    created_at
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- Return empty if no jobs available
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Mark as processing
  UPDATE audit_jobs
  SET 
    status = 'processing',
    started_at = NOW()
  WHERE audit_jobs.id = job_record.id;

  -- Return job record
  RETURN QUERY 
  SELECT 
    job_record.id,
    job_record.tenant_id,
    job_record.url,
    job_record.priority,
    'processing'::TEXT,
    job_record.depth,
    job_record.created_at,
    job_record.metadata,
    job_record.retry_count,
    job_record.max_retries;
END;
$$;

COMMENT ON FUNCTION dequeue_job() IS 'Atomically dequeue next pending job with priority ordering';

-- Get queue statistics
CREATE OR REPLACE FUNCTION get_queue_stats()
RETURNS TABLE (
  total_jobs BIGINT,
  total_batches BIGINT,
  pending_jobs BIGINT,
  processing_jobs BIGINT,
  completed_jobs BIGINT,
  failed_jobs BIGINT,
  avg_processing_time_seconds NUMERIC,
  queue_lengths JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE true) AS total_jobs,
    (SELECT COUNT(*) FROM batch_jobs) AS total_batches,
    COUNT(*) FILTER (WHERE status = 'pending') AS pending_jobs,
    COUNT(*) FILTER (WHERE status = 'processing') AS processing_jobs,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_jobs,
    COUNT(*) FILTER (WHERE status = 'failed') AS failed_jobs,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) FILTER (WHERE status = 'completed') AS avg_processing_time_seconds,
    jsonb_build_object(
      'high', COUNT(*) FILTER (WHERE status = 'pending' AND priority = 'high'),
      'normal', COUNT(*) FILTER (WHERE status = 'pending' AND priority = 'normal'),
      'low', COUNT(*) FILTER (WHERE status = 'pending' AND priority = 'low')
    ) AS queue_lengths
  FROM audit_jobs;
END;
$$;

COMMENT ON FUNCTION get_queue_stats() IS 'Get real-time queue statistics';

-- Update batch job progress
CREATE OR REPLACE FUNCTION update_batch_progress(p_job_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_batch_id TEXT;
  v_total INTEGER;
  v_completed INTEGER;
  v_failed INTEGER;
BEGIN
  -- Find batch containing this job
  SELECT id INTO v_batch_id
  FROM batch_jobs
  WHERE p_job_id = ANY(job_ids)
  LIMIT 1;

  IF v_batch_id IS NULL THEN
    RETURN;
  END IF;

  -- Count job statuses
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'failed')
  INTO v_total, v_completed, v_failed
  FROM audit_jobs
  WHERE id = ANY((SELECT job_ids FROM batch_jobs WHERE id = v_batch_id));

  -- Update batch
  UPDATE batch_jobs
  SET
    completed_jobs = v_completed,
    failed_jobs = v_failed,
    progress = ROUND(((v_completed + v_failed)::NUMERIC / v_total) * 100),
    status = CASE 
      WHEN v_completed + v_failed = v_total THEN 'completed'
      ELSE status
    END,
    completed_at = CASE 
      WHEN v_completed + v_failed = v_total THEN NOW()
      ELSE completed_at
    END
  WHERE id = v_batch_id;
END;
$$;

COMMENT ON FUNCTION update_batch_progress(TEXT) IS 'Update batch job progress when individual job completes';

-- Trigger to auto-update batch progress
CREATE OR REPLACE FUNCTION trigger_update_batch_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IN ('completed', 'failed') AND OLD.status != NEW.status THEN
    PERFORM update_batch_progress(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_job_status_changed ON audit_jobs;

CREATE TRIGGER audit_job_status_changed
AFTER UPDATE OF status ON audit_jobs
FOR EACH ROW
EXECUTE FUNCTION trigger_update_batch_progress();

-- Cleanup old completed jobs (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_jobs(retention_days INTEGER DEFAULT 7)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM audit_jobs
    WHERE 
      status IN ('completed', 'failed', 'cancelled')
      AND completed_at < NOW() - (retention_days || ' days')::INTERVAL
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  -- Also cleanup old batches
  DELETE FROM batch_jobs
  WHERE 
    status IN ('completed', 'failed', 'cancelled')
    AND completed_at < NOW() - (retention_days || ' days')::INTERVAL;

  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_old_jobs(INTEGER) IS 'Delete completed/failed jobs older than retention period';

-- =====================================================
-- 4. GLOBAL INSIGHTS MATERIALIZED VIEW
-- =====================================================

-- Materialized view for fast global insights queries
CREATE MATERIALIZED VIEW IF NOT EXISTS global_audit_insights AS
SELECT
  COUNT(*) AS total_audits,
  AVG((result->>'overallScore')::NUMERIC) AS avg_score,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (result->>'overallScore')::NUMERIC) AS median_score,
  PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY (result->>'overallScore')::NUMERIC) AS p10_score,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY (result->>'overallScore')::NUMERIC) AS p25_score,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY (result->>'overallScore')::NUMERIC) AS p75_score,
  PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY (result->>'overallScore')::NUMERIC) AS p90_score,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (result->>'overallScore')::NUMERIC) AS p95_score,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY (result->>'overallScore')::NUMERIC) AS p99_score,
  jsonb_build_object(
    '0-20', COUNT(*) FILTER (WHERE (result->>'overallScore')::NUMERIC BETWEEN 0 AND 20),
    '21-40', COUNT(*) FILTER (WHERE (result->>'overallScore')::NUMERIC BETWEEN 21 AND 40),
    '41-60', COUNT(*) FILTER (WHERE (result->>'overallScore')::NUMERIC BETWEEN 41 AND 60),
    '61-80', COUNT(*) FILTER (WHERE (result->>'overallScore')::NUMERIC BETWEEN 61 AND 80),
    '81-100', COUNT(*) FILTER (WHERE (result->>'overallScore')::NUMERIC BETWEEN 81 AND 100)
  ) AS score_distribution,
  MAX(completed_at) AS last_updated
FROM audit_jobs
WHERE 
  status = 'completed'
  AND result IS NOT NULL
  AND completed_at > NOW() - INTERVAL '30 days';

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_global_insights_singleton 
  ON global_audit_insights ((true));

COMMENT ON MATERIALIZED VIEW global_audit_insights IS 'Pre-computed global audit statistics (refreshed hourly)';

-- Function to refresh insights
CREATE OR REPLACE FUNCTION refresh_global_insights()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY global_audit_insights;
END;
$$;

COMMENT ON FUNCTION refresh_global_insights() IS 'Refresh global insights materialized view';

-- =====================================================
-- 5. VERIFICATION
-- =====================================================

-- Verify tables exist
DO $$ 
DECLARE
  jobs_exists BOOLEAN;
  batches_exists BOOLEAN;
  webhooks_exists BOOLEAN;
  view_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'audit_jobs'
  ) INTO jobs_exists;
  
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'batch_jobs'
  ) INTO batches_exists;
  
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'job_webhooks'
  ) INTO webhooks_exists;

  SELECT EXISTS (
    SELECT FROM pg_matviews 
    WHERE schemaname = 'public' AND matviewname = 'global_audit_insights'
  ) INTO view_exists;
  
  RAISE NOTICE 'Migration 016 verification:';
  RAISE NOTICE '  audit_jobs table: %', jobs_exists;
  RAISE NOTICE '  batch_jobs table: %', batches_exists;
  RAISE NOTICE '  job_webhooks table: %', webhooks_exists;
  RAISE NOTICE '  global_audit_insights view: %', view_exists;
  RAISE NOTICE '  Functions: dequeue_job, get_queue_stats, update_batch_progress, cleanup_old_jobs';
END $$;
