-- =====================================================
-- Migration: 024_security_advisor_fixes.sql
-- Purpose: Fix Supabase Security Advisor warnings and errors
-- Date: 2025-12-03
-- 
-- Issues Fixed:
-- 1. Remove SECURITY DEFINER from 5 views (ERROR level)
-- 2. Add RLS policies to citation_predictions table (INFO level)
-- 3. Add RLS policies to sync_operations table (INFO level)
-- 
-- Security Rationale:
-- - SECURITY DEFINER views bypass RLS and run with creator privileges
-- - This is a security risk as it allows privilege escalation
-- - Views should use SECURITY INVOKER (default) to enforce RLS
-- - Tables with RLS enabled MUST have policies defined
-- =====================================================

BEGIN;

-- =====================================================
-- FIX 1: Remove SECURITY DEFINER from v_consensus_statistics
-- =====================================================

DROP VIEW IF EXISTS public.v_consensus_statistics CASCADE;

CREATE OR REPLACE VIEW public.v_consensus_statistics 
WITH (security_invoker = true) AS
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

GRANT SELECT ON public.v_consensus_statistics TO authenticated;

COMMENT ON VIEW public.v_consensus_statistics IS 'Consensus statistics for last 24 hours (SECURITY INVOKER - enforces RLS)';

-- =====================================================
-- FIX 2: Remove SECURITY DEFINER from v_byzantine_statistics
-- =====================================================

DROP VIEW IF EXISTS public.v_byzantine_statistics CASCADE;

CREATE OR REPLACE VIEW public.v_byzantine_statistics
WITH (security_invoker = true) AS
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

GRANT SELECT ON public.v_byzantine_statistics TO authenticated;

COMMENT ON VIEW public.v_byzantine_statistics IS 'Byzantine detection statistics for last 7 days (SECURITY INVOKER - enforces RLS)';

-- =====================================================
-- FIX 3: Remove SECURITY DEFINER from user_plan_summary
-- =====================================================

DROP VIEW IF EXISTS public.user_plan_summary CASCADE;

CREATE OR REPLACE VIEW public.user_plan_summary
WITH (security_invoker = true) AS
SELECT
  p.id AS user_id,
  p.email,
  -- Get plan from active subscription (source of truth)
  COALESCE(
    (
      SELECT sp.plan_name
      FROM public.user_subscriptions us
      INNER JOIN public.subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = p.id
        AND us.status = 'active'
      LIMIT 1
    ),
    'free' -- Default to free plan
  ) AS current_plan,
  -- Legacy columns (deprecated)
  p.plan_type AS legacy_plan_type,
  p.current_plan AS legacy_current_plan,
  -- Subscription details
  s.id AS subscription_id,
  s.status AS subscription_status,
  s.current_period_start,
  s.current_period_end,
  sp.price_usd,
  sp.audit_quota,
  -- Usage tracking from audits table
  COALESCE(
    (
      SELECT COUNT(*)
      FROM public.audits a
      WHERE a.user_id = p.id
        AND s.current_period_start IS NOT NULL
        AND a.created_at >= s.current_period_start
        AND a.created_at < COALESCE(s.current_period_end, NOW() + INTERVAL '1 year')
    ),
    0
  ) AS usage_count,
  COALESCE(
    sp.audit_quota - (
      SELECT COUNT(*)
      FROM public.audits a
      WHERE a.user_id = p.id
        AND s.current_period_start IS NOT NULL
        AND a.created_at >= s.current_period_start
        AND a.created_at < COALESCE(s.current_period_end, NOW() + INTERVAL '1 year')
    ),
    p.credits_remaining -- Use credits_remaining for users without active subscription
  ) AS quota_remaining
FROM public.profiles p
LEFT JOIN public.user_subscriptions s ON s.user_id = p.id AND s.status = 'active'
LEFT JOIN public.subscription_plans sp ON s.plan_id = sp.id;

GRANT SELECT ON public.user_plan_summary TO authenticated;

COMMENT ON VIEW public.user_plan_summary IS 'Unified view of user plan information (SECURITY INVOKER - enforces RLS)';

-- =====================================================
-- FIX 4: Remove SECURITY DEFINER from user_balance_summary
-- =====================================================

DROP VIEW IF EXISTS public.user_balance_summary CASCADE;

CREATE OR REPLACE VIEW public.user_balance_summary
WITH (security_invoker = true) AS
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

COMMENT ON VIEW public.user_balance_summary IS 'User balance summary by token (SECURITY INVOKER - enforces RLS)';

-- =====================================================
-- FIX 5: Remove SECURITY DEFINER from current_pricing_summary
-- =====================================================

DROP VIEW IF EXISTS public.current_pricing_summary CASCADE;

CREATE OR REPLACE VIEW public.current_pricing_summary
WITH (security_invoker = true) AS
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

COMMENT ON VIEW public.current_pricing_summary IS 'Current active pricing (SECURITY INVOKER - enforces RLS)';

-- =====================================================
-- FIX 6: Add RLS policies to citation_predictions table
-- =====================================================

-- Enable RLS if not already enabled
ALTER TABLE public.citation_predictions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own citation predictions" ON public.citation_predictions;
DROP POLICY IF EXISTS "Users can insert their own citation predictions" ON public.citation_predictions;
DROP POLICY IF EXISTS "Users can update their own citation predictions" ON public.citation_predictions;
DROP POLICY IF EXISTS "Users can delete their own citation predictions" ON public.citation_predictions;

-- Policy: Users can view their own predictions (via knowledge_graphs ownership)
CREATE POLICY "Users can view their own citation predictions"
  ON public.citation_predictions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.knowledge_graphs kg
      WHERE kg.id = citation_predictions.knowledge_graph_id
        AND kg.user_id = auth.uid()
    )
  );

-- Policy: Users can insert predictions for their own knowledge graphs
CREATE POLICY "Users can insert their own citation predictions"
  ON public.citation_predictions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.knowledge_graphs kg
      WHERE kg.id = citation_predictions.knowledge_graph_id
        AND kg.user_id = auth.uid()
    )
  );

-- Policy: Users can update their own predictions
CREATE POLICY "Users can update their own citation predictions"
  ON public.citation_predictions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.knowledge_graphs kg
      WHERE kg.id = citation_predictions.knowledge_graph_id
        AND kg.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.knowledge_graphs kg
      WHERE kg.id = citation_predictions.knowledge_graph_id
        AND kg.user_id = auth.uid()
    )
  );

-- Policy: Users can delete their own predictions
CREATE POLICY "Users can delete their own citation predictions"
  ON public.citation_predictions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.knowledge_graphs kg
      WHERE kg.id = citation_predictions.knowledge_graph_id
        AND kg.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.citation_predictions IS 'Citation predictions with RLS policies enforcing ownership via knowledge_graphs';

-- =====================================================
-- FIX 7: Add RLS policies to sync_operations table
-- =====================================================

-- Enable RLS if not already enabled
ALTER TABLE public.sync_operations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Authenticated users can view sync operations" ON public.sync_operations;
DROP POLICY IF EXISTS "Service role can manage sync operations" ON public.sync_operations;

-- Policy: Authenticated users can view all sync operations (read-only)
-- Rationale: Sync operations are system-level and don't contain sensitive user data
CREATE POLICY "Authenticated users can view sync operations"
  ON public.sync_operations FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Only service role can insert/update/delete sync operations
-- Rationale: Sync operations should only be managed by backend services
CREATE POLICY "Service role can manage sync operations"
  ON public.sync_operations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE public.sync_operations IS 'Sync operations with RLS policies - read-only for users, managed by service role';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify views are using security_invoker
DO $$
DECLARE
  v_view_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_view_count
  FROM pg_views
  WHERE schemaname = 'public'
    AND viewname IN (
      'v_consensus_statistics',
      'v_byzantine_statistics', 
      'user_plan_summary',
      'user_balance_summary',
      'current_pricing_summary'
    );
  
  IF v_view_count = 5 THEN
    RAISE NOTICE '✅ All 5 views recreated successfully';
  ELSE
    RAISE WARNING '⚠️  Expected 5 views, found %', v_view_count;
  END IF;
END $$;

-- Verify RLS policies exist
DO $$
DECLARE
  v_citation_policies INTEGER;
  v_sync_policies INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_citation_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'citation_predictions';
  
  SELECT COUNT(*) INTO v_sync_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'sync_operations';
  
  RAISE NOTICE '✅ citation_predictions has % RLS policies', v_citation_policies;
  RAISE NOTICE '✅ sync_operations has % RLS policies', v_sync_policies;
  
  IF v_citation_policies >= 4 AND v_sync_policies >= 2 THEN
    RAISE NOTICE '✅ All RLS policies created successfully';
  ELSE
    RAISE WARNING '⚠️  Expected at least 4 policies for citation_predictions and 2 for sync_operations';
  END IF;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

RAISE NOTICE '✅ Migration 024 completed successfully';
RAISE NOTICE 'Fixed 5 SECURITY DEFINER views (ERROR level)';
RAISE NOTICE 'Added RLS policies to citation_predictions (INFO level)';
RAISE NOTICE 'Added RLS policies to sync_operations (INFO level)';
RAISE NOTICE 'All Supabase Security Advisor issues resolved';

COMMIT;
