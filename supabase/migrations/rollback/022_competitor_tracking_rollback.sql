-- =====================================================
-- ROLLBACK: Migration 022 - Competitor Tracking
-- Purpose: Remove competitor tracking tables and related objects
-- Data Loss Risk: MEDIUM (competitor data will be lost)
-- =====================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_update_competitor_metrics ON public.competitor_citations;

-- Drop functions
DROP FUNCTION IF EXISTS update_competitor_metrics();

-- Drop RLS policies
DROP POLICY IF EXISTS "Tenant admins can delete competitors" ON public.competitors;
DROP POLICY IF EXISTS "Tenant members can update competitors" ON public.competitors;
DROP POLICY IF EXISTS "Tenant members can insert competitors" ON public.competitors;
DROP POLICY IF EXISTS "Tenant members can view competitors" ON public.competitors;

DROP POLICY IF EXISTS "Tenant members can update threats" ON public.competitive_threats;
DROP POLICY IF EXISTS "Tenant members can insert threats" ON public.competitive_threats;
DROP POLICY IF EXISTS "Tenant members can view threats" ON public.competitive_threats;

DROP POLICY IF EXISTS "Tenant members can insert competitor citations" ON public.competitor_citations;
DROP POLICY IF EXISTS "Tenant members can view competitor citations" ON public.competitor_citations;

-- Drop indexes
DROP INDEX IF EXISTS idx_predictions_accuracy;
DROP INDEX IF EXISTS idx_predictions_high_prob;
DROP INDEX IF EXISTS idx_comp_citations_timestamp;
DROP INDEX IF EXISTS idx_comp_citations_source;
DROP INDEX IF EXISTS idx_comp_citations_competitor;
DROP INDEX IF EXISTS idx_comp_citations_tenant;
DROP INDEX IF EXISTS idx_threats_detected;
DROP INDEX IF EXISTS idx_threats_severity;
DROP INDEX IF EXISTS idx_threats_status;
DROP INDEX IF EXISTS idx_threats_competitor;
DROP INDEX IF EXISTS idx_threats_tenant;
DROP INDEX IF EXISTS idx_competitors_tracking;
DROP INDEX IF EXISTS idx_competitors_domain;
DROP INDEX IF EXISTS idx_competitors_tenant;

-- Drop tables (in reverse dependency order)
DROP TABLE IF EXISTS public.competitor_citations CASCADE;
DROP TABLE IF EXISTS public.competitive_threats CASCADE;
DROP TABLE IF EXISTS public.competitors CASCADE;

-- Log rollback completion
DO $
BEGIN
  RAISE NOTICE '✅ Rollback 022 completed: Competitor tracking tables removed';
END $;
