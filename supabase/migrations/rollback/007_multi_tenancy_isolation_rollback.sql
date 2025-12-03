-- =====================================================
-- ROLLBACK: Migration 007 - Multi-Tenancy Isolation
-- Purpose: Remove tenant isolation infrastructure
-- Data Loss Risk: HIGH (tenant data and relationships will be lost)
-- =====================================================

-- WARNING: This rollback will remove all tenant isolation
-- Tenant data will be lost and cannot be recovered

-- Drop triggers
DROP TRIGGER IF EXISTS citations_tenant_consistency ON public.citations;
DROP TRIGGER IF EXISTS tenant_slug_generator ON public.tenants;

-- Drop functions
DROP FUNCTION IF EXISTS public.validate_tenant_consistency();
DROP FUNCTION IF EXISTS public.user_has_tenant_access(UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_current_tenant_id();
DROP FUNCTION IF EXISTS generate_tenant_slug();

-- Drop RLS policies for tenant-isolated tables
-- knowledge_graphs
DROP POLICY IF EXISTS knowledge_graphs_delete ON public.knowledge_graphs;
DROP POLICY IF EXISTS knowledge_graphs_update ON public.knowledge_graphs;
DROP POLICY IF EXISTS knowledge_graphs_insert ON public.knowledge_graphs;
DROP POLICY IF EXISTS knowledge_graphs_select ON public.knowledge_graphs;

-- audits
DROP POLICY IF EXISTS audits_insert ON public.audits;
DROP POLICY IF EXISTS audits_select ON public.audits;

-- api_keys
DROP POLICY IF EXISTS api_keys_delete ON public.api_keys;
DROP POLICY IF EXISTS api_keys_update ON public.api_keys;
DROP POLICY IF EXISTS api_keys_insert ON public.api_keys;
DROP POLICY IF EXISTS api_keys_select ON public.api_keys;

-- profiles
DROP POLICY IF EXISTS profiles_update ON public.profiles;
DROP POLICY IF EXISTS profiles_select ON public.profiles;

-- tenant_members
DROP POLICY IF EXISTS tenant_members_delete ON public.tenant_members;
DROP POLICY IF EXISTS tenant_members_update ON public.tenant_members;
DROP POLICY IF EXISTS tenant_members_insert ON public.tenant_members;
DROP POLICY IF EXISTS tenant_members_select ON public.tenant_members;

-- tenants
DROP POLICY IF EXISTS tenants_delete ON public.tenants;
DROP POLICY IF EXISTS tenants_update ON public.tenants;
DROP POLICY IF EXISTS tenants_insert ON public.tenants;
DROP POLICY IF EXISTS tenants_select ON public.tenants;

-- Drop indexes for tenant_id columns
DROP INDEX IF EXISTS idx_a2a_ledger_tenant;
DROP INDEX IF EXISTS idx_a2a_invoices_tenant;
DROP INDEX IF EXISTS idx_a2a_wallets_tenant;
DROP INDEX IF EXISTS idx_learning_tenant;
DROP INDEX IF EXISTS idx_citations_tenant;
DROP INDEX IF EXISTS idx_kg_isolation;
DROP INDEX IF EXISTS idx_kg_tenant;
DROP INDEX IF EXISTS idx_audits_tenant;
DROP INDEX IF EXISTS idx_usage_events_tenant;
DROP INDEX IF EXISTS idx_subscriptions_tenant;
DROP INDEX IF EXISTS idx_agent_keys_tenant;
DROP INDEX IF EXISTS idx_api_keys_tenant;
DROP INDEX IF EXISTS idx_profiles_tenant;
DROP INDEX IF EXISTS idx_tenant_members_role;
DROP INDEX IF EXISTS idx_tenant_members_user;
DROP INDEX IF EXISTS idx_tenant_members_tenant;
DROP INDEX IF EXISTS idx_tenants_status;
DROP INDEX IF EXISTS idx_tenants_slug;
DROP INDEX IF EXISTS idx_tenants_owner;

-- Remove tenant_id columns from tables (using DO blocks for idempotency)
DO $
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'learning_analyses' AND column_name = 'tenant_id') THEN
    ALTER TABLE public.learning_analyses DROP COLUMN tenant_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'citations' AND column_name = 'tenant_id') THEN
    ALTER TABLE public.citations DROP COLUMN tenant_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'knowledge_graphs' AND column_name = 'isolation_mode') THEN
    ALTER TABLE public.knowledge_graphs DROP COLUMN isolation_mode;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'knowledge_graphs' AND column_name = 'tenant_id') THEN
    ALTER TABLE public.knowledge_graphs DROP COLUMN tenant_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audits' AND column_name = 'tenant_id') THEN
    ALTER TABLE public.audits DROP COLUMN tenant_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usage_events' AND column_name = 'tenant_id') THEN
    ALTER TABLE public.usage_events DROP COLUMN tenant_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'tenant_id') THEN
    ALTER TABLE public.subscriptions DROP COLUMN tenant_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_keys' AND column_name = 'tenant_id') THEN
    ALTER TABLE public.agent_keys DROP COLUMN tenant_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'tenant_id') THEN
    ALTER TABLE public.api_keys DROP COLUMN tenant_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'tenant_id') THEN
    ALTER TABLE public.profiles DROP COLUMN tenant_id;
  END IF;
  
  -- Optional tables
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'a2a_ledger' AND column_name = 'tenant_id') THEN
    ALTER TABLE public.a2a_ledger DROP COLUMN tenant_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'a2a_invoices' AND column_name = 'tenant_id') THEN
    ALTER TABLE public.a2a_invoices DROP COLUMN tenant_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'a2a_wallets' AND column_name = 'tenant_id') THEN
    ALTER TABLE public.a2a_wallets DROP COLUMN tenant_id;
  END IF;
END $;

-- Drop tenant tables
DROP TABLE IF EXISTS public.tenant_members CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;

-- Log rollback completion
DO $
BEGIN
  RAISE NOTICE '✅ Rollback 007 completed: Multi-tenancy isolation removed';
  RAISE WARNING '⚠️  CRITICAL: All tenant data has been deleted';
  RAISE WARNING '⚠️  CRITICAL: Tenant isolation has been removed';
  RAISE WARNING '⚠️  CRITICAL: Data is no longer isolated between customers';
END $;
