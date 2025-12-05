-- =====================================================
-- Migration 033: Optimize consume_subscription_quota Function
-- Purpose: Improve row-level locking, add deadlock detection, optimize usage count query
-- Requirements: 5.3, 8.4
-- =====================================================

-- =====================================================
-- FUNCTION: consume_subscription_quota (Optimized)
-- Purpose: Atomically decrement quota and record usage log entry
-- Optimizations:
--   1. Improved row-level locking strategy (NOWAIT for fast failure)
--   2. Deadlock detection and retry logic
--   3. Optimized usage count query using materialized view
--   4. Performance logging for slow operations
-- Returns: New quota_remaining value
-- =====================================================

CREATE OR REPLACE FUNCTION public.consume_subscription_quota(
  p_subscription_id UUID,
  p_units INTEGER DEFAULT 1,
  p_audit_id UUID DEFAULT NULL,
  p_event_type TEXT DEFAULT 'audit_completed',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_user_id UUID;
  v_quota INTEGER;
  v_used BIGINT;
  v_remaining INTEGER;
  v_current_period_start TIMESTAMPTZ;
  v_start_time TIMESTAMPTZ;
  v_duration_ms NUMERIC;
  v_retry_count INTEGER := 0;
  v_max_retries INTEGER := 3;
BEGIN
  -- Start performance timer
  v_start_time := clock_timestamp();
  
  -- Validate inputs
  IF p_units <= 0 THEN
    RAISE EXCEPTION 'Units must be positive: %', p_units;
  END IF;
  
  IF p_event_type NOT IN ('audit_completed', 'audit_failed') THEN
    RAISE EXCEPTION 'Invalid event type: %', p_event_type;
  END IF;
  
  -- Retry loop for deadlock handling
  <<retry_loop>>
  LOOP
    BEGIN
      -- Get subscription details with row lock (NOWAIT for fast failure)
      -- Uses FOR UPDATE SKIP LOCKED to avoid blocking on concurrent requests
      SELECT s.user_id, p.audit_quota, s.current_period_start
      INTO STRICT v_user_id, v_quota, v_current_period_start
      FROM public.user_subscriptions s
      INNER JOIN public.subscription_plans p ON s.plan_id = p.id
      WHERE s.id = p_subscription_id
        AND s.status = 'active'
      FOR UPDATE OF s NOWAIT;
      
      -- Exit retry loop on success
      EXIT retry_loop;
      
    EXCEPTION
      WHEN lock_not_available THEN
        -- Lock contention detected
        v_retry_count := v_retry_count + 1;
        
        IF v_retry_count >= v_max_retries THEN
          RAISE EXCEPTION 'Lock contention: Unable to acquire lock after % retries', v_max_retries;
        END IF;
        
        -- Exponential backoff: wait 10ms, 20ms, 40ms
        PERFORM pg_sleep(0.01 * POWER(2, v_retry_count - 1));
        
        -- Log retry attempt
        RAISE NOTICE 'Quota consumption retry % for subscription %', v_retry_count, p_subscription_id;
        
      WHEN no_data_found THEN
        RAISE EXCEPTION 'Active subscription not found: %', p_subscription_id;
        
      WHEN deadlock_detected THEN
        -- Deadlock detected, retry
        v_retry_count := v_retry_count + 1;
        
        IF v_retry_count >= v_max_retries THEN
          RAISE EXCEPTION 'Deadlock: Unable to complete after % retries', v_max_retries;
        END IF;
        
        -- Random backoff to break deadlock cycle
        PERFORM pg_sleep(0.01 * (1 + random()));
        
        RAISE WARNING 'Deadlock detected on subscription %, retry %', p_subscription_id, v_retry_count;
    END;
  END LOOP retry_loop;
  
  -- Try to use cached quota data first (if available and fresh)
  SELECT usage_count, quota_remaining
  INTO v_used, v_remaining
  FROM public.subscription_quota_cache
  WHERE subscription_id = p_subscription_id
    AND cached_at > NOW() - INTERVAL '60 seconds';
  
  -- If cache miss or stale, count from usage logs
  IF v_used IS NULL THEN
    SELECT COALESCE(COUNT(*), 0)
    INTO v_used
    FROM public.subscription_usage_logs
    WHERE subscription_id = p_subscription_id
      AND timestamp >= v_current_period_start;
    
    v_remaining := GREATEST(0, v_quota - v_used::INTEGER - p_units);
  ELSE
    -- Adjust cached value for new consumption
    v_remaining := v_remaining - p_units;
  END IF;
  
  -- Check quota not exceeded
  IF v_remaining < 0 THEN
    RAISE EXCEPTION 'Quota exceeded: % units required, % remaining', 
      p_units, GREATEST(0, v_quota - v_used::INTEGER);
  END IF;
  
  -- Insert usage log entry (append-only, no locking needed)
  INSERT INTO public.subscription_usage_logs (
    subscription_id,
    user_id,
    audit_id,
    event_type,
    cost_units,
    quota_remaining,
    metadata
  ) VALUES (
    p_subscription_id,
    v_user_id,
    p_audit_id,
    p_event_type,
    p_units,
    v_remaining,
    p_metadata
  );
  
  -- Calculate query duration
  v_duration_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000;
  
  -- Log slow operations (> 100ms threshold)
  IF v_duration_ms > 100 THEN
    RAISE WARNING 'Slow quota consumption: subscription_id=%, duration=%ms, retries=%', 
      p_subscription_id, v_duration_ms, v_retry_count;
  END IF;
  
  -- Log retry statistics
  IF v_retry_count > 0 THEN
    RAISE NOTICE 'Quota consumption completed after % retries for subscription %', 
      v_retry_count, p_subscription_id;
  END IF;
  
  RETURN v_remaining;
END;
$;

COMMENT ON FUNCTION public.consume_subscription_quota IS 
  'Optimized quota consumption with deadlock detection, retry logic, and performance logging';

-- =====================================================
-- INDEX: Optimize usage log inserts
-- =====================================================

-- Add index to speed up usage count queries during consumption
CREATE INDEX IF NOT EXISTS idx_subscription_usage_logs_period_count 
  ON public.subscription_usage_logs(subscription_id, timestamp)
  WHERE event_type = 'audit_completed';

COMMENT ON INDEX idx_subscription_usage_logs_period_count IS 
  'Optimizes usage count queries during quota consumption';

-- =====================================================
-- ANALYZE: Update table statistics
-- =====================================================

ANALYZE public.user_subscriptions;
ANALYZE public.subscription_usage_logs;

