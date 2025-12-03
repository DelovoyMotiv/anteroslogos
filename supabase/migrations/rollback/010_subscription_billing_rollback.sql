-- =====================================================
-- ROLLBACK: Migration 010 - Subscription Billing
-- Purpose: Remove USDC subscription billing infrastructure
-- Data Loss Risk: HIGH (all subscription and billing data will be lost)
-- =====================================================

-- WARNING: This rollback will delete ALL subscription and billing data
-- Active subscriptions will be terminated

-- Revoke grants
REVOKE SELECT ON public.subscription_status_summary FROM authenticated;

-- Drop views
DROP VIEW IF EXISTS public.subscription_status_summary CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.generate_renewal_invoice(UUID);
DROP FUNCTION IF EXISTS public.consume_subscription_quota(UUID, INTEGER, UUID, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.check_subscription_quota(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.get_active_subscription(UUID);
DROP FUNCTION IF EXISTS update_subscription_plans_updated_at();

-- Drop triggers
DROP TRIGGER IF EXISTS subscription_invoices_updated_at ON public.subscription_invoices;
DROP TRIGGER IF EXISTS user_subscriptions_updated_at ON public.user_subscriptions;
DROP TRIGGER IF EXISTS subscription_plans_updated_at ON public.subscription_plans;

-- Drop RLS policies
-- subscription_usage_logs
DROP POLICY IF EXISTS "Users can insert their own usage logs" ON public.subscription_usage_logs;
DROP POLICY IF EXISTS "Users can view their own usage logs" ON public.subscription_usage_logs;

-- subscription_invoices
DROP POLICY IF EXISTS "Users can update their own subscription invoices" ON public.subscription_invoices;
DROP POLICY IF EXISTS "Users can insert their own subscription invoices" ON public.subscription_invoices;
DROP POLICY IF EXISTS "Users can view their own subscription invoices" ON public.subscription_invoices;

-- user_subscriptions
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.user_subscriptions;

-- Drop indexes
DROP INDEX IF EXISTS idx_subscription_usage_audit;
DROP INDEX IF EXISTS idx_subscription_usage_user;
DROP INDEX IF EXISTS idx_subscription_usage_subscription;
DROP INDEX IF EXISTS idx_subscription_invoices_period;
DROP INDEX IF EXISTS idx_subscription_invoices_tx_hash;
DROP INDEX IF EXISTS idx_subscription_invoices_user;
DROP INDEX IF EXISTS idx_subscription_invoices_subscription;
DROP INDEX IF EXISTS idx_subscription_invoices_status_expires;
DROP INDEX IF EXISTS idx_user_subscriptions_period_end;
DROP INDEX IF EXISTS idx_user_subscriptions_status;
DROP INDEX IF EXISTS idx_user_subscriptions_user_status;
DROP INDEX IF EXISTS idx_subscription_plans_active;

-- Drop tables (in reverse dependency order)
DROP TABLE IF EXISTS public.subscription_usage_logs CASCADE;
DROP TABLE IF EXISTS public.subscription_invoices CASCADE;
DROP TABLE IF EXISTS public.user_subscriptions CASCADE;
DROP TABLE IF EXISTS public.subscription_plans CASCADE;

-- Log rollback completion
DO $
BEGIN
  RAISE NOTICE '✅ Rollback 010 completed: Subscription billing removed';
  RAISE WARNING '⚠️  CRITICAL: All subscription data has been deleted';
  RAISE WARNING '⚠️  CRITICAL: All billing invoices have been deleted';
  RAISE WARNING '⚠️  CRITICAL: All usage logs have been deleted';
  RAISE WARNING '⚠️  CRITICAL: Active subscriptions have been terminated';
END $;
