-- =====================================================
-- ROLLBACK: Migration 001 - Initial Schema
-- Purpose: Remove all initial schema objects
-- Data Loss Risk: HIGH (all user data will be lost)
-- =====================================================

-- WARNING: This rollback will delete ALL data in the database
-- Only use in development or with explicit approval

-- Drop materialized views
DROP MATERIALIZED VIEW IF EXISTS public.global_stats CASCADE;

-- Drop views
DROP VIEW IF EXISTS public.domain_trends CASCADE;
DROP VIEW IF EXISTS public.user_audit_summary CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS increment_audit_count ON public.audits;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_alerts_updated_at ON public.audit_alerts;
DROP TRIGGER IF EXISTS update_insights_updated_at ON public.global_insights;
DROP TRIGGER IF EXISTS update_audits_updated_at ON public.audits;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

-- Drop functions
DROP FUNCTION IF EXISTS refresh_global_stats();
DROP FUNCTION IF EXISTS anonymize_domain(TEXT);
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS increment_user_audit_count();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can update own alerts" ON public.audit_alerts;
DROP POLICY IF EXISTS "Users can view own alerts" ON public.audit_alerts;
DROP POLICY IF EXISTS "Authenticated users can view insights" ON public.global_insights;
DROP POLICY IF EXISTS "Users can delete own audits" ON public.audits;
DROP POLICY IF EXISTS "Users can update own audits" ON public.audits;
DROP POLICY IF EXISTS "Users can insert own audits" ON public.audits;
DROP POLICY IF EXISTS "Users can view own audits" ON public.audits;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Drop indexes
DROP INDEX IF EXISTS idx_alerts_created_at;
DROP INDEX IF EXISTS idx_alerts_severity;
DROP INDEX IF EXISTS idx_alerts_audit_id;
DROP INDEX IF EXISTS idx_alerts_user_id;
DROP INDEX IF EXISTS idx_insights_expires;
DROP INDEX IF EXISTS idx_insights_timeframe;
DROP INDEX IF EXISTS idx_insights_type_segment;
DROP INDEX IF EXISTS idx_insights_unique;
DROP INDEX IF EXISTS idx_audits_ai_recommendations;
DROP INDEX IF EXISTS idx_audits_schema_findings;
DROP INDEX IF EXISTS idx_audits_user_url_time;
DROP INDEX IF EXISTS idx_audits_is_public;
DROP INDEX IF EXISTS idx_audits_overall_score;
DROP INDEX IF EXISTS idx_audits_timestamp;
DROP INDEX IF EXISTS idx_audits_domain;
DROP INDEX IF EXISTS idx_audits_normalized_url;
DROP INDEX IF EXISTS idx_audits_user_id;
DROP INDEX IF EXISTS idx_profiles_stripe_customer_id;
DROP INDEX IF EXISTS idx_profiles_plan_type;
DROP INDEX IF EXISTS idx_profiles_email;

-- Drop tables (in reverse dependency order)
DROP TABLE IF EXISTS public.audit_alerts CASCADE;
DROP TABLE IF EXISTS public.global_insights CASCADE;
DROP TABLE IF EXISTS public.audits CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop extensions (only if not used by other schemas)
-- DROP EXTENSION IF EXISTS "pg_trgm";
-- DROP EXTENSION IF EXISTS "uuid-ossp";

-- Log rollback completion
DO $
BEGIN
  RAISE NOTICE '✅ Rollback 001 completed: Initial schema removed';
  RAISE WARNING '⚠️  CRITICAL: All user data has been deleted';
  RAISE WARNING '⚠️  CRITICAL: Profiles, audits, and alerts tables dropped';
END $;
