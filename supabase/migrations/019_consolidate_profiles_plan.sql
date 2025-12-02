-- =====================================================
-- Migration 019: Consolidate Profiles Plan Columns
-- Purpose: Fix conflict between plan_type and current_plan columns
-- Issue: Migration 001 creates plan_type, migration 003 adds current_plan
-- Solution: Use subscription_plans.plan_name as source of truth, deprecate both columns
-- =====================================================

-- =====================================================
-- ANALYSIS
-- plan_type (from migration 001): Values 'free'/'premium'/'enterprise'
-- current_plan (from migration 003): Values 'free'/'pro'/'agency'
-- subscription_plans.plan_name (from migration 010): Values 'free'/'starter'/'pro'/'enterprise'
-- =====================================================

-- =====================================================
-- STEP 1: Add migration status column (for gradual migration)
-- =====================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_source TEXT DEFAULT 'legacy' CHECK (plan_source IN ('legacy', 'subscription'));

COMMENT ON COLUMN public.profiles.plan_source IS 'Source of plan data: legacy (plan_type/current_plan) or subscription (user_subscriptions)';

-- =====================================================
-- STEP 2: Create view for unified plan access
-- =====================================================

CREATE OR REPLACE VIEW public.user_plan_summary AS
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
  -- Usage tracking
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
    1 -- Free plan default quota
  ) AS quota_remaining
FROM public.profiles p
LEFT JOIN public.user_subscriptions s ON s.user_id = p.id AND s.status = 'active'
LEFT JOIN public.subscription_plans sp ON s.plan_id = sp.id;

-- Grant access to authenticated users
GRANT SELECT ON public.user_plan_summary TO authenticated;

COMMENT ON VIEW public.user_plan_summary IS 'Unified view of user plan information from subscriptions (source of truth)';

-- =====================================================
-- STEP 3: Create function to get user plan (replaces direct column access)
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_plan(p_user_id UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT sp.plan_name
      FROM public.user_subscriptions us
      INNER JOIN public.subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = p_user_id
        AND us.status = 'active'
      LIMIT 1
    ),
    'free'
  );
$$;

COMMENT ON FUNCTION public.get_user_plan IS 'Get current plan for user from active subscription (source of truth)';

-- =====================================================
-- STEP 4: Deprecate legacy columns (mark for future removal)
-- =====================================================

-- Update comments to indicate deprecation
COMMENT ON COLUMN public.profiles.plan_type IS 'DEPRECATED: Use get_user_plan() or user_plan_summary view instead. Will be removed in future migration.';
COMMENT ON COLUMN public.profiles.current_plan IS 'DEPRECATED: Use get_user_plan() or user_plan_summary view instead. Will be removed in future migration.';

-- =====================================================
-- STEP 5: Data consistency check
-- =====================================================

-- Check if any profiles have inconsistent plan data
DO $$
DECLARE
  v_inconsistent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_inconsistent_count
  FROM public.profiles p
  LEFT JOIN public.user_subscriptions s ON s.user_id = p.id AND s.status = 'active'
  LEFT JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE (p.plan_type IS NOT NULL OR p.current_plan IS NOT NULL)
    AND sp.plan_name IS NULL;
  
  IF v_inconsistent_count > 0 THEN
    RAISE WARNING '% profiles have legacy plan values but no active subscription', v_inconsistent_count;
    RAISE NOTICE 'These users will default to FREE plan via auto_activate_free_plan trigger';
  END IF;
END $$;

-- =====================================================
-- STEP 6: Future removal script (NOT executed now)
-- =====================================================

-- IMPORTANT: Do NOT run this yet. Schedule for future migration after all code migrated to use view/function.
-- 
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS plan_type;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS current_plan;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS plan_source;
-- 
-- This should only be done after:
-- 1. All application code updated to use get_user_plan() or user_plan_summary
-- 2. Migration 003 updated to remove current_plan addition
-- 3. Migration 001 updated to remove plan_type addition

-- =====================================================
-- VALIDATION
-- =====================================================

DO $$
BEGIN
  -- Verify view exists
  IF NOT EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'user_plan_summary' AND schemaname = 'public') THEN
    RAISE EXCEPTION 'View user_plan_summary not created';
  END IF;
  
  -- Verify function exists
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_plan') THEN
    RAISE EXCEPTION 'Function get_user_plan not created';
  END IF;
  
  RAISE NOTICE '✅ Migration 019 completed successfully';
  RAISE NOTICE 'Created unified view: user_plan_summary';
  RAISE NOTICE 'Created function: get_user_plan(user_id)';
  RAISE NOTICE 'Legacy columns marked as deprecated (plan_type, current_plan)';
  RAISE NOTICE 'Source of truth: user_subscriptions + subscription_plans';
END $$;
