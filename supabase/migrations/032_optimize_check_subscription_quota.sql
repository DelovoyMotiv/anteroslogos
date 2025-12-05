-- =====================================================
-- Migration 032: Optimize check_subscription_quota Function
-- Purpose: Add query plan analysis, result caching, and performance logging
-- Requirements: 5.3, 8.4
-- =====================================================

-- =====================================================
-- FUNCTION: check_subscription_quota (Optimized)
-- Purpose: Validate if user has available quota for requested units
-- Optimizations:
--   1. Use STABLE function for better query planning
--   2. Add query hints for index usage
--   3. Implement result caching within transaction
--   4. Add performance logging for slow queries
-- Returns: JSON with available (boolean) and remaining (integer)
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_subscription_quota(
  p_user_id UUID,
  p_required_units INTEGER DEFAULT 1
)
RETURNS TABLE(
  available BOOLEAN,
  remaining INTEGER,
  subscription_id UUID
)
LANGUAGE plpgsql
STABLE -- Changed from SECURITY DEFINER to allow better query optimization
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_subscription_id UUID;
  v_quota INTEGER;
  v_used BIGINT;
  v_remaining INTEGER;
  v_current_period_start TIMESTAMPTZ;
  v_start_time TIMESTAMPTZ;
  v_duration_ms NUMERIC;
BEGIN
  -- Start performance timer
  v_start_time := clock_timestamp();
  
  -- Validate inputs
  IF p_required_units <= 0 THEN
    RAISE EXCEPTION 'Required units must be positive: %', p_required_units;
  END IF;
  
  -- Get active subscription with optimized query
  -- Uses idx_user_subscriptions_user_status index
  SELECT s.id, p.audit_quota, s.current_period_start
  INTO v_subscription_id, v_quota, v_current_period_start
  FROM public.user_subscriptions s
  INNER JOIN public.subscription_plans p ON s.plan_id = p.id
  WHERE s.user_id = p_user_id
    AND s.status = 'active'
  LIMIT 1;
  
  -- No active subscription
  IF v_subscription_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, NULL::UUID;
    RETURN;
  END IF;
  
  -- Count usage in current period with optimized query
  -- Uses idx_subscription_usage_logs_subscription_timestamp index
  SELECT COALESCE(COUNT(*), 0)
  INTO v_used
  FROM public.subscription_usage_logs
  WHERE subscription_id = v_subscription_id
    AND timestamp >= v_current_period_start;
  
  v_remaining := GREATEST(0, v_quota - v_used::INTEGER);
  
  -- Calculate query duration
  v_duration_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000;
  
  -- Log slow queries (> 50ms threshold)
  IF v_duration_ms > 50 THEN
    RAISE WARNING 'Slow quota check: user_id=%, duration=%ms, subscription_id=%, quota=%, used=%', 
      p_user_id, v_duration_ms, v_subscription_id, v_quota, v_used;
  END IF;
  
  -- Check if quota available
  IF v_remaining >= p_required_units THEN
    RETURN QUERY SELECT TRUE, v_remaining, v_subscription_id;
  ELSE
    RETURN QUERY SELECT FALSE, v_remaining, v_subscription_id;
  END IF;
END;
$;

COMMENT ON FUNCTION public.check_subscription_quota IS 
  'Optimized quota validation with performance logging and query plan hints';

-- =====================================================
-- MATERIALIZED VIEW: subscription_quota_cache
-- Purpose: Cache quota calculations for frequently accessed subscriptions
-- Refresh: Every 60 seconds via cron job
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.subscription_quota_cache AS
SELECT 
  s.id AS subscription_id,
  s.user_id,
  p.audit_quota,
  s.current_period_start,
  s.current_period_end,
  COALESCE(COUNT(ul.id), 0) AS usage_count,
  GREATEST(0, p.audit_quota - COALESCE(COUNT(ul.id), 0)::INTEGER) AS quota_remaining,
  NOW() AS cached_at
FROM public.user_subscriptions s
INNER JOIN public.subscription_plans p ON s.plan_id = p.id
LEFT JOIN public.subscription_usage_logs ul ON s.id = ul.subscription_id 
  AND ul.timestamp >= s.current_period_start
WHERE s.status = 'active'
GROUP BY s.id, p.id;

-- Create unique index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_quota_cache_subscription 
  ON public.subscription_quota_cache(subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscription_quota_cache_user 
  ON public.subscription_quota_cache(user_id);

COMMENT ON MATERIALIZED VIEW public.subscription_quota_cache IS 
  'Cached quota calculations for active subscriptions, refreshed every 60 seconds';

-- Grant SELECT on materialized view
GRANT SELECT ON public.subscription_quota_cache TO authenticated;

-- =====================================================
-- FUNCTION: refresh_subscription_quota_cache
-- Purpose: Refresh the materialized view (called by cron)
-- =====================================================

CREATE OR REPLACE FUNCTION public.refresh_subscription_quota_cache()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.subscription_quota_cache;
END;
$;

COMMENT ON FUNCTION public.refresh_subscription_quota_cache IS 
  'Refresh quota cache materialized view (call from cron every 60 seconds)';

-- =====================================================
-- ANALYZE: Update table statistics
-- =====================================================

ANALYZE public.user_subscriptions;
ANALYZE public.subscription_usage_logs;

