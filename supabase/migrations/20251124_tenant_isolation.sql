--
-- Tenant Isolation Migration
-- Full RLS isolation with tenant_id columns
-- Migration: 20251124
-- Created: 2025-11-24
--

-- =====================================================
-- TENANTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL CHECK (length(name) >= 3 AND length(name) <= 100),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_tenants_owner ON public.tenants(owner_id);
CREATE INDEX idx_tenants_slug ON public.tenants(slug);

-- =====================================================
-- TENANT MEMBERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tenant_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'readonly')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Unique constraint: one membership per user per tenant
  CONSTRAINT tenant_members_unique UNIQUE (tenant_id, member_id)
);

CREATE INDEX idx_tenant_members_tenant ON public.tenant_members(tenant_id);
CREATE INDEX idx_tenant_members_member ON public.tenant_members(member_id);

-- =====================================================
-- ADD TENANT_ID TO EXISTING TABLES
-- =====================================================

-- Knowledge Graphs
ALTER TABLE public.knowledge_graphs
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Citations
ALTER TABLE public.citations
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Usage Events
ALTER TABLE public.usage_events
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- API Keys
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Agent Keys
ALTER TABLE public.agent_keys
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Learning Analyses
ALTER TABLE public.learning_analyses
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Citation Predictions
ALTER TABLE public.citation_predictions
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- =====================================================
-- CREATE DEFAULT TENANT FOR EXISTING USERS
-- =====================================================

-- Create default tenant for each existing user
INSERT INTO public.tenants (owner_id, name, slug)
SELECT DISTINCT 
  p.user_id,
  COALESCE(p.email, 'Tenant-' || SUBSTRING(p.user_id::TEXT, 1, 8)),
  'tenant-' || p.user_id
FROM public.profiles p
WHERE p.user_id IS NOT NULL
ON CONFLICT (slug) DO NOTHING;

-- Add tenant member for each owner
INSERT INTO public.tenant_members (tenant_id, member_id, role)
SELECT t.id, t.owner_id, 'owner'
FROM public.tenants t
ON CONFLICT (tenant_id, member_id) DO NOTHING;

-- =====================================================
-- BACKFILL TENANT_ID FOR EXISTING DATA
-- =====================================================

-- Backfill knowledge_graphs
UPDATE public.knowledge_graphs kg
SET tenant_id = (
  SELECT t.id FROM public.tenants t
  WHERE t.owner_id = kg.user_id
  LIMIT 1
)
WHERE tenant_id IS NULL AND user_id IS NOT NULL;

-- Backfill citations
UPDATE public.citations c
SET tenant_id = (
  SELECT t.id FROM public.tenants t
  WHERE t.owner_id = c.user_id
  LIMIT 1
)
WHERE tenant_id IS NULL AND user_id IS NOT NULL;

-- Backfill usage_events
UPDATE public.usage_events ue
SET tenant_id = (
  SELECT t.id FROM public.tenants t
  WHERE t.owner_id = ue.user_id
  LIMIT 1
)
WHERE tenant_id IS NULL AND user_id IS NOT NULL;

-- Backfill api_keys
UPDATE public.api_keys ak
SET tenant_id = (
  SELECT t.id FROM public.tenants t
  WHERE t.owner_id = ak.user_id
  LIMIT 1
)
WHERE tenant_id IS NULL AND user_id IS NOT NULL;

-- Backfill agent_keys
UPDATE public.agent_keys agk
SET tenant_id = (
  SELECT t.id FROM public.tenants t
  WHERE t.owner_id = agk.user_id
  LIMIT 1
)
WHERE tenant_id IS NULL AND user_id IS NOT NULL;

-- Backfill learning_analyses via knowledge_graphs
UPDATE public.learning_analyses la
SET tenant_id = (
  SELECT kg.tenant_id FROM public.knowledge_graphs kg
  WHERE kg.id = la.knowledge_graph_id
  LIMIT 1
)
WHERE tenant_id IS NULL;

-- Backfill citation_predictions via knowledge_graphs
UPDATE public.citation_predictions cp
SET tenant_id = (
  SELECT kg.tenant_id FROM public.knowledge_graphs kg
  WHERE kg.id = cp.knowledge_graph_id
  LIMIT 1
)
WHERE tenant_id IS NULL;

-- =====================================================
-- MAKE TENANT_ID NOT NULL (after backfill)
-- =====================================================

ALTER TABLE public.knowledge_graphs
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.citations
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.usage_events
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.api_keys
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.agent_keys
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.learning_analyses
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.citation_predictions
  ALTER COLUMN tenant_id SET NOT NULL;

-- =====================================================
-- CREATE INDEXES FOR TENANT_ID
-- =====================================================

CREATE INDEX idx_kg_tenant ON public.knowledge_graphs(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_citations_tenant ON public.citations(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_usage_tenant ON public.usage_events(tenant_id);
CREATE INDEX idx_api_keys_tenant ON public.api_keys(tenant_id) WHERE revoked = FALSE;
CREATE INDEX idx_agent_keys_tenant ON public.agent_keys(tenant_id) WHERE revoked = FALSE;
CREATE INDEX idx_learning_tenant ON public.learning_analyses(tenant_id);
CREATE INDEX idx_predictions_tenant ON public.citation_predictions(tenant_id);

-- =====================================================
-- DROP OLD RLS POLICIES
-- =====================================================

-- Knowledge Graphs
DROP POLICY IF EXISTS "Users can view own knowledge graphs" ON public.knowledge_graphs;
DROP POLICY IF EXISTS "Users can insert own knowledge graphs" ON public.knowledge_graphs;
DROP POLICY IF EXISTS "Users can update own knowledge graphs" ON public.knowledge_graphs;
DROP POLICY IF EXISTS "Users can delete own knowledge graphs" ON public.knowledge_graphs;

-- Citations
DROP POLICY IF EXISTS "Users can view own citations" ON public.citations;
DROP POLICY IF EXISTS "Users can insert own citations" ON public.citations;

-- Usage Events
DROP POLICY IF EXISTS "Users can view own usage events" ON public.usage_events;

-- API Keys
DROP POLICY IF EXISTS "Users can view own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can create own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can update own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can delete own API keys" ON public.api_keys;

-- Agent Keys
DROP POLICY IF EXISTS "Users can view own agent keys" ON public.agent_keys;
DROP POLICY IF EXISTS "Users can create own agent keys" ON public.agent_keys;
DROP POLICY IF EXISTS "Users can update own agent keys" ON public.agent_keys;
DROP POLICY IF EXISTS "Users can delete own agent keys" ON public.agent_keys;

-- Learning Analyses
DROP POLICY IF EXISTS "Users can view learning analyses for own KGs" ON public.learning_analyses;

-- Citation Predictions
DROP POLICY IF EXISTS "Users can view citation predictions for own KGs" ON public.citation_predictions;

-- =====================================================
-- CREATE NEW TENANT-ISOLATED RLS POLICIES
-- =====================================================

-- Tenants: only owners can manage
CREATE POLICY "Tenant owners can view own tenants"
  ON public.tenants FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Tenant owners can create tenants"
  ON public.tenants FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Tenant owners can update own tenants"
  ON public.tenants FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Tenant owners can delete own tenants"
  ON public.tenants FOR DELETE
  USING (auth.uid() = owner_id);

-- Tenant Members: members can view, owners can manage
CREATE POLICY "Tenant members can view memberships"
  ON public.tenant_members FOR SELECT
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.tenants WHERE id = tenant_members.tenant_id
    ) OR
    auth.uid() = member_id
  );

CREATE POLICY "Tenant owners can manage memberships"
  ON public.tenant_members FOR ALL
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.tenants WHERE id = tenant_members.tenant_id
    )
  );

-- Knowledge Graphs: tenant members can read/write
CREATE POLICY "Tenant members can view knowledge graphs"
  ON public.knowledge_graphs FOR SELECT
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.tenants WHERE id = knowledge_graphs.tenant_id
    ) OR
    auth.uid() IN (
      SELECT member_id FROM public.tenant_members WHERE tenant_id = knowledge_graphs.tenant_id
    )
  );

CREATE POLICY "Tenant members can insert knowledge graphs"
  ON public.knowledge_graphs FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE member_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Tenant members can update knowledge graphs"
  ON public.knowledge_graphs FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.tenants WHERE id = knowledge_graphs.tenant_id
    ) OR
    auth.uid() IN (
      SELECT member_id FROM public.tenant_members WHERE tenant_id = knowledge_graphs.tenant_id AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Tenant members can delete knowledge graphs"
  ON public.knowledge_graphs FOR DELETE
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.tenants WHERE id = knowledge_graphs.tenant_id
    ) OR
    auth.uid() IN (
      SELECT member_id FROM public.tenant_members WHERE tenant_id = knowledge_graphs.tenant_id AND role IN ('owner', 'admin')
    )
  );

-- Citations: tenant members can read/write
CREATE POLICY "Tenant members can view citations"
  ON public.citations FOR SELECT
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.tenants WHERE id = citations.tenant_id
    ) OR
    auth.uid() IN (
      SELECT member_id FROM public.tenant_members WHERE tenant_id = citations.tenant_id
    )
  );

CREATE POLICY "Tenant members can insert citations"
  ON public.citations FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE member_id = auth.uid()
    )
  );

-- Usage Events: tenant members can view (insert via service role)
CREATE POLICY "Tenant members can view usage events"
  ON public.usage_events FOR SELECT
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.tenants WHERE id = usage_events.tenant_id
    ) OR
    auth.uid() IN (
      SELECT member_id FROM public.tenant_members WHERE tenant_id = usage_events.tenant_id
    )
  );

-- API Keys: tenant members can manage
CREATE POLICY "Tenant members can view API keys"
  ON public.api_keys FOR SELECT
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.tenants WHERE id = api_keys.tenant_id
    ) OR
    auth.uid() IN (
      SELECT member_id FROM public.tenant_members WHERE tenant_id = api_keys.tenant_id
    )
  );

CREATE POLICY "Tenant members can create API keys"
  ON public.api_keys FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE member_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Tenant members can update API keys"
  ON public.api_keys FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.tenants WHERE id = api_keys.tenant_id
    ) OR
    auth.uid() IN (
      SELECT member_id FROM public.tenant_members WHERE tenant_id = api_keys.tenant_id AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Tenant members can delete API keys"
  ON public.api_keys FOR DELETE
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.tenants WHERE id = api_keys.tenant_id
    ) OR
    auth.uid() IN (
      SELECT member_id FROM public.tenant_members WHERE tenant_id = api_keys.tenant_id AND role IN ('owner', 'admin')
    )
  );

-- Agent Keys: tenant members can manage
CREATE POLICY "Tenant members can view agent keys"
  ON public.agent_keys FOR SELECT
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.tenants WHERE id = agent_keys.tenant_id
    ) OR
    auth.uid() IN (
      SELECT member_id FROM public.tenant_members WHERE tenant_id = agent_keys.tenant_id
    )
  );

CREATE POLICY "Tenant members can create agent keys"
  ON public.agent_keys FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE member_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Tenant members can update agent keys"
  ON public.agent_keys FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.tenants WHERE id = agent_keys.tenant_id
    ) OR
    auth.uid() IN (
      SELECT member_id FROM public.tenant_members WHERE tenant_id = agent_keys.tenant_id AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Tenant members can delete agent keys"
  ON public.agent_keys FOR DELETE
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.tenants WHERE id = agent_keys.tenant_id
    ) OR
    auth.uid() IN (
      SELECT member_id FROM public.tenant_members WHERE tenant_id = agent_keys.tenant_id AND role IN ('owner', 'admin')
    )
  );

-- Learning Analyses: tenant members can view
CREATE POLICY "Tenant members can view learning analyses"
  ON public.learning_analyses FOR SELECT
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.tenants WHERE id = learning_analyses.tenant_id
    ) OR
    auth.uid() IN (
      SELECT member_id FROM public.tenant_members WHERE tenant_id = learning_analyses.tenant_id
    )
  );

-- Citation Predictions: tenant members can view
CREATE POLICY "Tenant members can view citation predictions"
  ON public.citation_predictions FOR SELECT
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.tenants WHERE id = citation_predictions.tenant_id
    ) OR
    auth.uid() IN (
      SELECT member_id FROM public.tenant_members WHERE tenant_id = citation_predictions.tenant_id
    )
  );

-- =====================================================
-- ENABLE RLS ON NEW TABLES
-- =====================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- AUTO-FILL TENANT_ID TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION auto_fill_tenant_id()
RETURNS TRIGGER AS $$
DECLARE
  user_tenant_id UUID;
BEGIN
  -- If tenant_id already set, use it
  IF NEW.tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get user's primary tenant (first owned tenant)
  SELECT id INTO user_tenant_id
  FROM public.tenants
  WHERE owner_id = auth.uid()
  LIMIT 1;
  
  -- If no owned tenant, try first membership
  IF user_tenant_id IS NULL THEN
    SELECT tenant_id INTO user_tenant_id
    FROM public.tenant_members
    WHERE member_id = auth.uid()
    LIMIT 1;
  END IF;
  
  -- If still null, raise error
  IF user_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User has no tenant access';
  END IF;
  
  NEW.tenant_id := user_tenant_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to tables
CREATE TRIGGER auto_fill_kg_tenant
  BEFORE INSERT ON public.knowledge_graphs
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_tenant_id();

CREATE TRIGGER auto_fill_citation_tenant
  BEFORE INSERT ON public.citations
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_tenant_id();

CREATE TRIGGER auto_fill_api_key_tenant
  BEFORE INSERT ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_tenant_id();

CREATE TRIGGER auto_fill_agent_key_tenant
  BEFORE INSERT ON public.agent_keys
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_tenant_id();

CREATE TRIGGER auto_fill_usage_event_tenant
  BEFORE INSERT ON public.usage_events
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_tenant_id();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.tenants IS 'Multi-tenant organization structure';
COMMENT ON TABLE public.tenant_members IS 'Tenant membership with role-based access';
COMMENT ON COLUMN public.knowledge_graphs.tenant_id IS 'Tenant isolation: restricts access via RLS';
COMMENT ON COLUMN public.citations.tenant_id IS 'Tenant isolation: restricts access via RLS';
COMMENT ON FUNCTION auto_fill_tenant_id() IS 'Automatically fills tenant_id on INSERT based on auth.uid()';
