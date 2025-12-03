-- =====================================================
-- Rollback Migration: 024_security_advisor_fixes_rollback.sql
-- Purpose: Rollback security advisor fixes
-- Date: 2025-12-03
-- 
-- WARNING: This rollback will restore SECURITY DEFINER views
-- and remove RLS policies. Only use if absolutely necessary.
-- =====================================================

BEGIN;

-- =====================================================
-- ROLLBACK 1: Restore SECURITY DEFINER to v_consensus_statistics
-- =====================================================

DROP VIEW IF EXISTS public.v_consensus_statistics CASCADE;

CREATE OR REPLACE VIEW public.v_consensus_statistics AS
SELECT
  operation,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status = 'COMMITTED') as committed_count,
  COUNT(*) FILTER (WHERE status = 'FAILED') as failed_count,
  COUNT(*) FILTER (WHERE status = 'TIMEOUT') as timeout_count,
  AVG(execution_time_ms) FILTER (WHERE status = 'COMMITTED') as avg_execution_ms,
  MAX(execution_time_ms) FILTER (WHERE status = 'COMMITTED') as max_execution_ms,
  MIN(execution_time_ms) FILTER (WHERE status = 'COMMITTED') as min_execution_ms
FROM public.a2a_consensus_log
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY operation;

-- =====================================================
-- ROLLBACK 2: Restore SECURITY DEFINER to v_byzantine_statistics
-- =====================================================

DROP VIEW IF EXISTS public.v_byzantine_statistics CASCADE;

CREATE OR REPLACE VIEW public.v_byzantine_statistics AS
SELECT
  accused_node,
  COUNT(*) as total_reports,
  COUNT(*) FILTER (WHERE status = 'VERIFIED') as verified_count,
  COUNT(*) FILTER (WHERE status = 'SLASHED') as slashed_count,
  MAX(reported_at) as last_reported,
  array_agg(DISTINCT reason) as reported_reasons
FROM public.a2a_byzantine_evidence
WHERE reported_at >= NOW() - INTERVAL '7 days'
GROUP BY accused_node
ORDER BY total_reports DESC;

-- =====================================================
-- ROLLBACK 3: Restore SECURITY DEFINER to user_plan_summary
-- =====================================================

DROP VIEW IF EXISTS public.user_plan_summary CASCADE;

CREATE OR REPLACE VIEW public.user_plan_summary AS
SELECT
  p.id AS user_id,
  p.email,
  COALESCE(
    (
      SELECT sp.plan_name
      FROM public.user_subscriptions us
      INNER JOIN public.subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = p.id
        AND us.status = 'active'
      LIMIT 1
    ),
    'free'
  ) AS current_plan,
  p.plan_type AS legacy_plan_type,
  p.current_plan AS legacy_current_plan,
  s.id AS subscription_id,
  s.status AS subscription_status,
  s.current_period_start,
  s.current_period_end,
  sp.price_usd,
  sp.audit_quota,
  COALESCE(
    (
      SELECT COUNT(*)
      FROM public.subscription_usage_logs ul
      WHERE ul.subscription_id = s.id
        AND ul.timestamp >= s.current_period_start
    ),
    0
  ) AS usage_count,
  COALESCE(
    sp.audit_quota - (
      SELECT COUNT(*)
      FROM public.subscription_usage_logs ul
      WHERE ul.subscription_id = s.id
        AND ul.timestamp >= s.current_period_start
    ),
    1
  ) AS quota_remaining
FROM public.profiles p
LEFT JOIN public.user_subscriptions s ON s.user_id = p.id AND s.status = 'active'
LEFT JOIN public.subscription_plans sp ON s.plan_id = sp.id;

GRANT SELECT ON public.user_plan_summary TO authenticated;

-- =====================================================
-- ROLLBACK 4: Restore SECURITY DEFINER to user_balance_summary
-- =====================================================

DROP VIEW IF EXISTS public.user_balance_summary CASCADE;

CREATE OR REPLACE VIEW public.user_balance_summary AS
SELECT 
  user_id,
  token,
  COALESCE(SUM(
    CASE 
      WHEN entry_type IN ('deposit', 'refund') THEN amount
      WHEN entry_type = 'debit' THEN -amount
      ELSE 0
    END
  ), 0) as balance,
  COUNT(*) as transaction_count,
  MAX(created_at) as last_transaction_at
FROM public.a2a_ledger
GROUP BY user_id, token;

GRANT SELECT ON public.user_balance_summary TO authenticated;

-- =====================================================
-- ROLLBACK 5: Restore SECURITY DEFINER to current_pricing_summary
-- =====================================================

DROP VIEW IF EXISTS public.current_pricing_summary CASCADE;

CREATE OR REPLACE VIEW public.current_pricing_summary AS
SELECT 
  method,
  tier,
  price_usd,
  effective_from,
  effective_until,
  notes
FROM public.a2a_pricing
WHERE is_active = true
  AND effective_from <= NOW()
  AND (effective_until IS NULL OR effective_until > NOW())
ORDER BY method, tier;

GRANT SELECT ON public.current_pricing_summary TO authenticated, anon;

-- =====================================================
-- ROLLBACK 6: Remove RLS policies from citation_predictions
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own citation predictions" ON public.citation_predictions;
DROP POLICY IF EXISTS "Users can insert their own citation predictions" ON public.citation_predictions;
DROP POLICY IF EXISTS "Users can update their own citation predictions" ON public.citation_predictions;
DROP POLICY IF EXISTS "Users can delete their own citation predictions" ON public.citation_predictions;

-- Keep RLS enabled but without policies (original state)
-- ALTER TABLE public.citation_predictions DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- ROLLBACK 7: Remove RLS policies from sync_operations
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view sync operations" ON public.sync_operations;
DROP POLICY IF EXISTS "Service role can manage sync operations" ON public.sync_operations;

-- Keep RLS enabled but without policies (original state)
-- ALTER TABLE public.sync_operations DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- ROLLBACK COMPLETE
-- =====================================================

RAISE NOTICE '⚠️  Rollback 024 completed';
RAISE NOTICE 'SECURITY DEFINER views restored (security risk)';
RAISE NOTICE 'RLS policies removed from citation_predictions and sync_operations';

COMMIT;
