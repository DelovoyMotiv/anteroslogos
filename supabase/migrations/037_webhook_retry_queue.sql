-- Migration: Webhook Retry Queue
-- Description: Create table for webhook retry mechanism with exponential backoff
-- Feature: ccc-native-economy
-- Requirements: 9.5
-- Property 25: Webhook retry with exponential backoff

-- =====================================================
-- WEBHOOK RETRY QUEUE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.webhook_retry_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Event identification
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  
  -- Retry tracking
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ NOT NULL,
  
  -- Error tracking
  last_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Index for finding jobs ready to retry
CREATE INDEX IF NOT EXISTS idx_webhook_retry_queue_next_retry 
  ON public.webhook_retry_queue(next_retry_at) 
  WHERE attempt_count < max_attempts;

-- Index for finding failed jobs
CREATE INDEX IF NOT EXISTS idx_webhook_retry_queue_failed 
  ON public.webhook_retry_queue(attempt_count) 
  WHERE attempt_count >= max_attempts;

-- Index for event lookup
CREATE INDEX IF NOT EXISTS idx_webhook_retry_queue_event_id 
  ON public.webhook_retry_queue(event_id);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_webhook_retry_queue_updated_at 
  ON public.webhook_retry_queue(updated_at);

-- =====================================================
-- TRIGGER FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_webhook_retry_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER webhook_retry_queue_updated_at
  BEFORE UPDATE ON public.webhook_retry_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_retry_queue_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS
ALTER TABLE public.webhook_retry_queue ENABLE ROW LEVEL SECURITY;

-- Only service role can access webhook retry queue
-- This is a system table, not user-facing
CREATE POLICY webhook_retry_queue_service_only 
  ON public.webhook_retry_queue 
  FOR ALL 
  USING (false);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.webhook_retry_queue IS 
  'Queue for retrying failed webhook processing with exponential backoff';

COMMENT ON COLUMN public.webhook_retry_queue.event_id IS 
  'Stripe event ID (unique identifier)';

COMMENT ON COLUMN public.webhook_retry_queue.event_type IS 
  'Stripe event type (e.g., checkout.session.completed)';

COMMENT ON COLUMN public.webhook_retry_queue.event_data IS 
  'Full Stripe event data for retry processing';

COMMENT ON COLUMN public.webhook_retry_queue.attempt_count IS 
  'Number of retry attempts made (0 = first attempt pending)';

COMMENT ON COLUMN public.webhook_retry_queue.max_attempts IS 
  'Maximum number of retry attempts (default: 5)';

COMMENT ON COLUMN public.webhook_retry_queue.next_retry_at IS 
  'Timestamp when next retry should be attempted (exponential backoff)';

COMMENT ON COLUMN public.webhook_retry_queue.last_error IS 
  'Error message from last failed attempt';
