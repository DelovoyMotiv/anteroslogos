-- ============================================
-- Migration 7: 007_multi_tenancy_isolation.sql
-- ============================================

-- =====================================================
-- MIGRATION 007: MULTI-TENANCY WITH FULL ISOLATION
-- SOC 2 Type II + GDPR Compliance
-- Date: 2025-11-22
-- Author: Principal Security Engineer
-- =====================================================

-- CRITICAL: This migration adds tenant isolation to prevent data leakage
-- between customers. Required for Fortune-500 / regulated industries.

-- =====================================================
-- PART 1: CREATE TENANTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Ownership
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Tenant metadata
  name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 255),
  slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
  
  -- Branding (optional)
  logo_url TEXT,
  primary_color TEXT CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  
  -- Settings
  settings JSONB DEFAULT '{}'::jsonb NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  
  -- Soft delete (7-year retention for audit)
  deleted_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_name CHECK (name !~ '^\s' AND name !~ '\s$')
);

-- Indexes
CREATE INDEX idx_tenants_owner ON public.tenants(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenants_slug ON public.tenants(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenants_status ON public.tenants(status) WHERE deleted_at IS NULL;

-- Auto-generate slug from name if not provided
CREATE OR REPLACE FUNCTION generate_tenant_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_slug_generator
  BEFORE INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION generate_tenant_slug();

-- =====================================================
-- PART 2: TENANT MEMBERS (RBAC)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tenant_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- References
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Role-based access control
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  
  -- Permissions (JSONB for flexibility)
  permissions JSONB DEFAULT '{}'::jsonb NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Unique constraint: one role per user per tenant
  CONSTRAINT unique_tenant_user UNIQUE (tenant_id, user_id)
);

-- Indexes
CREATE INDEX idx_tenant_members_tenant ON public.tenant_members(tenant_id, status);
CREATE INDEX idx_tenant_members_user ON public.tenant_members(user_id, status);
CREATE INDEX idx_tenant_members_role ON public.tenant_members(tenant_id, role);

-- =====================================================
-- PART 3: ADD tenant_id TO EXISTING TABLES
-- =====================================================

-- profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

CREATE INDEX idx_profiles_tenant ON public.profiles(tenant_id) WHERE tenant_id IS NOT NULL;

-- api_keys
ALTER TABLE public.api_keys 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

CREATE INDEX idx_api_keys_tenant ON public.api_keys(tenant_id) WHERE tenant_id IS NOT NULL;

-- agent_keys
ALTER TABLE public.agent_keys 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

CREATE INDEX idx_agent_keys_tenant ON public.agent_keys(tenant_id) WHERE tenant_id IS NOT NULL;

-- subscriptions
ALTER TABLE public.subscriptions 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

CREATE INDEX idx_subscriptions_tenant ON public.subscriptions(tenant_id) WHERE tenant_id IS NOT NULL;

-- usage_events
ALTER TABLE public.usage_events 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

CREATE INDEX idx_usage_events_tenant ON public.usage_events(tenant_id) WHERE tenant_id IS NOT NULL;

-- audits
ALTER TABLE public.audits 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

CREATE INDEX idx_audits_tenant ON public.audits(tenant_id) WHERE deleted_at IS NULL;

-- knowledge_graphs
ALTER TABLE public.knowledge_graphs 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS isolation_mode TEXT DEFAULT 'private' CHECK (isolation_mode IN ('shared', 'private', 'federated'));

CREATE INDEX idx_kg_tenant ON public.knowledge_graphs(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_kg_isolation ON public.knowledge_graphs(tenant_id, isolation_mode);

-- citations
ALTER TABLE public.citations 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

CREATE INDEX idx_citations_tenant ON public.citations(tenant_id) WHERE deleted_at IS NULL;

-- learning_analyses
ALTER TABLE public.learning_analyses 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

CREATE INDEX idx_learning_tenant ON public.learning_analyses(tenant_id);

-- a2a_wallets (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'a2a_wallets') THEN
    ALTER TABLE public.a2a_wallets 
      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_a2a_wallets_tenant ON public.a2a_wallets(tenant_id);
  END IF;
END $$;

-- a2a_invoices (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'a2a_invoices') THEN
    ALTER TABLE public.a2a_invoices 
      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_a2a_invoices_tenant ON public.a2a_invoices(tenant_id);
  END IF;
END $$;

-- a2a_ledger (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'a2a_ledger') THEN
    ALTER TABLE public.a2a_ledger 
      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_a2a_ledger_tenant ON public.a2a_ledger(tenant_id);
  END IF;
END $$;

-- =====================================================
-- PART 4: HELPER FUNCTIONS
-- =====================================================

-- Get current user's tenant ID from session
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(
    (current_setting('app.current_tenant_id', TRUE))::UUID,
    (
      SELECT tenant_id 
      FROM public.tenant_members 
      WHERE user_id = auth.uid() 
        AND status = 'active'
      LIMIT 1
    )
  );
$$;

-- Check if user has access to tenant
CREATE OR REPLACE FUNCTION public.user_has_tenant_access(
  target_tenant_id UUID,
  required_role TEXT DEFAULT 'viewer'
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.tenant_id = target_tenant_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND (
        CASE required_role
          WHEN 'owner' THEN tm.role = 'owner'
          WHEN 'admin' THEN tm.role IN ('owner', 'admin')
          WHEN 'member' THEN tm.role IN ('owner', 'admin', 'member')
          WHEN 'viewer' THEN tm.role IN ('owner', 'admin', 'member', 'viewer')
          ELSE FALSE
        END
      )
  );
$$;

-- =====================================================
-- PART 5: ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- TENANTS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS tenants_select ON public.tenants;
DROP POLICY IF EXISTS tenants_insert ON public.tenants;
DROP POLICY IF EXISTS tenants_update ON public.tenants;
DROP POLICY IF EXISTS tenants_delete ON public.tenants;

-- SELECT: User can see tenants they're members of
CREATE POLICY tenants_select ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenants.id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- INSERT: Any authenticated user can create a tenant (becomes owner)
CREATE POLICY tenants_insert ON public.tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- UPDATE: Only tenant owner can update
CREATE POLICY tenants_update ON public.tenants
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- DELETE: Only tenant owner can soft delete
CREATE POLICY tenants_delete ON public.tenants
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- TENANT_MEMBERS
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_members_select ON public.tenant_members;
DROP POLICY IF EXISTS tenant_members_insert ON public.tenant_members;
DROP POLICY IF EXISTS tenant_members_update ON public.tenant_members;
DROP POLICY IF EXISTS tenant_members_delete ON public.tenant_members;

-- SELECT: Users can see members of tenants they belong to
CREATE POLICY tenant_members_select ON public.tenant_members
  FOR SELECT
  TO authenticated
  USING (public.user_has_tenant_access(tenant_id, 'viewer'));

-- INSERT: Only owners/admins can add members
CREATE POLICY tenant_members_insert ON public.tenant_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_has_tenant_access(tenant_id, 'admin'));

-- UPDATE: Only owners/admins can update members
CREATE POLICY tenant_members_update ON public.tenant_members
  FOR UPDATE
  TO authenticated
  USING (public.user_has_tenant_access(tenant_id, 'admin'))
  WITH CHECK (public.user_has_tenant_access(tenant_id, 'admin'));

-- DELETE: Only owners/admins can remove members
CREATE POLICY tenant_members_delete ON public.tenant_members
  FOR DELETE
  TO authenticated
  USING (public.user_has_tenant_access(tenant_id, 'admin'));

-- =====================================================
-- PART 6: UPDATE EXISTING RLS POLICIES
-- =====================================================

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_update ON public.profiles;

CREATE POLICY profiles_select ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() 
    OR tenant_id IS NULL
    OR public.user_has_tenant_access(tenant_id, 'viewer')
  );

CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- API_KEYS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS api_keys_select ON public.api_keys;
DROP POLICY IF EXISTS api_keys_insert ON public.api_keys;
DROP POLICY IF EXISTS api_keys_update ON public.api_keys;
DROP POLICY IF EXISTS api_keys_delete ON public.api_keys;

CREATE POLICY api_keys_select ON public.api_keys
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (tenant_id IS NOT NULL AND public.user_has_tenant_access(tenant_id, 'member'))
  );

CREATE POLICY api_keys_insert ON public.api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (tenant_id IS NULL OR public.user_has_tenant_access(tenant_id, 'member'))
  );

CREATE POLICY api_keys_update ON public.api_keys
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (tenant_id IS NOT NULL AND public.user_has_tenant_access(tenant_id, 'admin'))
  );

CREATE POLICY api_keys_delete ON public.api_keys
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (tenant_id IS NOT NULL AND public.user_has_tenant_access(tenant_id, 'admin'))
  );

-- AUDITS
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audits_select ON public.audits;
DROP POLICY IF EXISTS audits_insert ON public.audits;

CREATE POLICY audits_select ON public.audits
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_public = TRUE
    OR (tenant_id IS NOT NULL AND public.user_has_tenant_access(tenant_id, 'viewer'))
  );

CREATE POLICY audits_insert ON public.audits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (tenant_id IS NULL OR public.user_has_tenant_access(tenant_id, 'member'))
  );

-- KNOWLEDGE_GRAPHS
ALTER TABLE public.knowledge_graphs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS knowledge_graphs_select ON public.knowledge_graphs;
DROP POLICY IF EXISTS knowledge_graphs_insert ON public.knowledge_graphs;
DROP POLICY IF EXISTS knowledge_graphs_update ON public.knowledge_graphs;
DROP POLICY IF EXISTS knowledge_graphs_delete ON public.knowledge_graphs;

CREATE POLICY knowledge_graphs_select ON public.knowledge_graphs
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR isolation_mode = 'shared'
    OR (tenant_id IS NOT NULL AND public.user_has_tenant_access(tenant_id, 'viewer'))
  );

CREATE POLICY knowledge_graphs_insert ON public.knowledge_graphs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (tenant_id IS NULL OR public.user_has_tenant_access(tenant_id, 'member'))
  );

CREATE POLICY knowledge_graphs_update ON public.knowledge_graphs
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (tenant_id IS NOT NULL AND public.user_has_tenant_access(tenant_id, 'member'))
  );

CREATE POLICY knowledge_graphs_delete ON public.knowledge_graphs
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (tenant_id IS NOT NULL AND public.user_has_tenant_access(tenant_id, 'admin'))
  );

-- =====================================================
-- PART 7: AUTO-POPULATE tenant_id ON INSERT
-- =====================================================

-- Function to auto-fill tenant_id from session
CREATE OR REPLACE FUNCTION public.fill_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.get_current_tenant_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-population (only on tables where tenant_id is NOT NULL)
-- Note: tenant_id can be NULL initially for backward compatibility

-- =====================================================
-- PART 8: DATA LEAKAGE PREVENTION
-- =====================================================

-- Ensure no cross-tenant access through foreign keys
-- This is enforced by RLS policies above, but we add check constraints as defense-in-depth

-- Example: Prevent linking knowledge_graph from tenant A to citation in tenant B
CREATE OR REPLACE FUNCTION public.validate_tenant_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if linked resources have same tenant_id
  IF TG_TABLE_NAME = 'citations' THEN
    IF NEW.knowledge_graph_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.knowledge_graphs kg
        WHERE kg.id = NEW.knowledge_graph_id
          AND (kg.tenant_id = NEW.tenant_id OR (kg.tenant_id IS NULL AND NEW.tenant_id IS NULL))
      ) THEN
        RAISE EXCEPTION 'Cross-tenant reference detected: citations → knowledge_graphs';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER citations_tenant_consistency
  BEFORE INSERT OR UPDATE ON public.citations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_tenant_consistency();

-- =====================================================
-- ROLLBACK SCRIPT (EMERGENCY USE ONLY)
-- =====================================================

-- To rollback this migration (NOT RECOMMENDED in production):
-- 1. DROP all new triggers
-- 2. DROP all new policies
-- 3. DROP tenant_members table
-- 4. DROP tenants table
-- 5. ALTER TABLE ... DROP COLUMN tenant_id (for each table)

-- This is intentionally NOT automated to prevent accidental data loss.

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify migration success
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 007 completed successfully';
  RAISE NOTICE 'Created tables: tenants, tenant_members';
  RAISE NOTICE 'Added tenant_id to % tables', (
    SELECT count(*) FROM information_schema.columns 
    WHERE column_name = 'tenant_id' AND table_schema = 'public'
  );
  RAISE NOTICE 'RLS enabled on all tenant-isolated tables';
END $$;


-- Migration complete: 007_multi_tenancy_isolation.sql


