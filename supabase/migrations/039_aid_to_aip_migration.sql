-- =====================================================
-- MIGRATION 039: AID TO AIP MIGRATION
-- Rename Agent Identity (AID) to Anóteros Identity Protocol (AIP)
-- Date: 2025-12-20
-- Author: AI Agent
-- =====================================================

-- This migration renames all AID references to AIP throughout the database schema
-- to align with the Anóteros Identity Protocol branding.
-- 
-- Changes:
-- 1. Rename aid_registry table to aip_registry
-- 2. Rename aid_uri column to aip_uri
-- 3. Update check constraints to validate aip:// format
-- 4. Update constraint names to reflect new naming
-- 5. Update function names and references
-- 6. Update view names and references
-- 7. Update comments and documentation

-- =====================================================
-- PART 1: RENAME TABLE
-- =====================================================

-- Rename the main registry table
ALTER TABLE IF EXISTS public.aid_registry RENAME TO aip_registry;

-- =====================================================
-- PART 2: RENAME COLUMNS
-- =====================================================

-- Rename the URI column
ALTER TABLE public.aip_registry RENAME COLUMN aid_uri TO aip_uri;

-- Update the agent_keys aid_uri column to aip_uri
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'agent_keys' 
    AND column_name = 'aid_uri'
  ) THEN
    ALTER TABLE public.agent_keys RENAME COLUMN aid_uri TO aip_uri;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'agent_keys' 
    AND column_name = 'aid_registry_id'
  ) THEN
    ALTER TABLE public.agent_keys RENAME COLUMN aid_registry_id TO aip_registry_id;
  END IF;
END $$;

-- =====================================================
-- PART 3: UPDATE CHECK CONSTRAINTS
-- =====================================================

-- Drop old constraint and create new one for aip_uri format
ALTER TABLE public.aip_registry DROP CONSTRAINT IF EXISTS valid_aid_uri;
ALTER TABLE public.aip_registry ADD CONSTRAINT valid_aip_uri 
  CHECK (aip_uri ~ '^aip://[a-z0-9.-]+/agent/[a-z0-9-]+$');

-- Update agent_keys constraint
ALTER TABLE public.agent_keys DROP CONSTRAINT IF EXISTS agent_keys_aid_uri_check;
ALTER TABLE public.agent_keys ADD CONSTRAINT agent_keys_aip_uri_check 
  CHECK (aip_uri LIKE 'aip://%');

-- =====================================================
-- PART 4: UPDATE INDEXES
-- =====================================================

-- Rename indexes on aip_registry
ALTER INDEX IF EXISTS idx_aid_registry_uri RENAME TO idx_aip_registry_uri;
ALTER INDEX IF EXISTS idx_aid_registry_tenant RENAME TO idx_aip_registry_tenant;
ALTER INDEX IF EXISTS idx_aid_registry_pubkey RENAME TO idx_aip_registry_pubkey;
ALTER INDEX IF EXISTS idx_aid_registry_expires RENAME TO idx_aip_registry_expires;
ALTER INDEX IF EXISTS idx_aid_registry_verified RENAME TO idx_aip_registry_verified;
ALTER INDEX IF EXISTS idx_aid_registry_last_used RENAME TO idx_aip_registry_last_used;

-- Rename indexes on agent_keys
ALTER INDEX IF EXISTS idx_agent_keys_aid RENAME TO idx_agent_keys_aip;
ALTER INDEX IF EXISTS idx_agent_keys_aid_registry RENAME TO idx_agent_keys_aip_registry;

-- =====================================================
-- PART 5: UPDATE RLS POLICIES
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS aid_registry_select ON public.aip_registry;
DROP POLICY IF EXISTS aid_registry_insert ON public.aip_registry;
DROP POLICY IF EXISTS aid_registry_update ON public.aip_registry;
DROP POLICY IF EXISTS aid_registry_delete ON public.aip_registry;

-- Recreate policies with new names
CREATE POLICY aip_registry_select ON public.aip_registry
  FOR SELECT
  TO authenticated
  USING (
    -- Own tenant
    public.user_has_tenant_access(tenant_id, 'viewer')
    -- OR verified agents from federated tenants (check federation_mode in settings)
    OR (
      verified = TRUE 
      AND status = 'active'
      AND EXISTS (
        SELECT 1 FROM public.tenants t
        WHERE t.id = tenant_id
          AND (t.settings->>'federation_mode')::TEXT IN ('federated', 'public')
      )
    )
  );

CREATE POLICY aip_registry_insert ON public.aip_registry
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_has_tenant_access(tenant_id, 'member'));

CREATE POLICY aip_registry_update ON public.aip_registry
  FOR UPDATE
  TO authenticated
  USING (public.user_has_tenant_access(tenant_id, 'admin'))
  WITH CHECK (public.user_has_tenant_access(tenant_id, 'admin'));

CREATE POLICY aip_registry_delete ON public.aip_registry
  FOR DELETE
  TO authenticated
  USING (public.user_has_tenant_access(tenant_id, 'owner'));

-- =====================================================
-- PART 6: UPDATE TRIGGERS
-- =====================================================

-- Drop old triggers
DROP TRIGGER IF EXISTS aid_registry_updated_at ON public.aip_registry;
DROP TRIGGER IF EXISTS aid_registry_tenant_id ON public.aip_registry;

-- Rename trigger function
ALTER FUNCTION IF EXISTS update_aid_registry_updated_at() RENAME TO update_aip_registry_updated_at;

-- Recreate triggers with new names
CREATE TRIGGER aip_registry_updated_at
  BEFORE UPDATE ON public.aip_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_aip_registry_updated_at();

CREATE TRIGGER aip_registry_tenant_id
  BEFORE INSERT ON public.aip_registry
  FOR EACH ROW
  EXECUTE FUNCTION public.fill_tenant_id();

-- =====================================================
-- PART 7: UPDATE FUNCTIONS
-- =====================================================

-- Rename verification functions
ALTER FUNCTION IF EXISTS public.verify_aid_dns(TEXT, TEXT) RENAME TO verify_aip_dns;
ALTER FUNCTION IF EXISTS public.verify_aid_manual(TEXT, TEXT) RENAME TO verify_aip_manual;
ALTER FUNCTION IF EXISTS public.expire_aid_registrations() RENAME TO expire_aip_registrations;

-- Update function bodies to reference AIP instead of AID
CREATE OR REPLACE FUNCTION public.verify_aip_dns(
  p_aip_uri TEXT,
  p_public_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_domain TEXT;
  v_result JSONB;
BEGIN
  -- Extract domain from AIP URI (aip://domain/agent/name)
  v_domain := substring(p_aip_uri from 'aip://([^/]+)/');
  
  IF v_domain IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Invalid AIP URI format'
    );
  END IF;
  
  -- NOTE: Actual DNS verification requires external service
  -- This is a placeholder that would call DNS-over-HTTPS API
  -- Implementation: use pg_net or external webhook
  
  RETURN jsonb_build_object(
    'success', FALSE,
    'error', 'DNS verification not yet implemented - requires external DNS-over-HTTPS integration',
    'domain', v_domain,
    'txt_record', '_agent.' || v_domain
  );
END;
$;

CREATE OR REPLACE FUNCTION public.verify_aip_manual(
  p_aip_uri TEXT,
  p_verification_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_registry aip_registry%ROWTYPE;
  v_tenant_id UUID;
BEGIN
  -- Get current tenant
  v_tenant_id := public.get_current_tenant_id();
  
  -- Check if user has admin access
  IF NOT public.user_has_tenant_access(v_tenant_id, 'admin') THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Insufficient permissions - admin required'
    );
  END IF;
  
  -- Get registry entry
  SELECT * INTO v_registry
  FROM public.aip_registry
  WHERE aip_uri = p_aip_uri AND tenant_id = v_tenant_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'AIP not found in registry'
    );
  END IF;
  
  -- Update verification
  UPDATE public.aip_registry
  SET 
    verified = TRUE,
    verification_method = 'manual',
    verification_data = jsonb_build_object(
      'notes', p_verification_notes,
      'verified_by', auth.uid(),
      'verified_at', NOW()
    )
  WHERE aip_uri = p_aip_uri AND tenant_id = v_tenant_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'aip_uri', p_aip_uri,
    'verified', TRUE
  );
END;
$;

CREATE OR REPLACE FUNCTION public.expire_aip_registrations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_expired_count INTEGER;
BEGIN
  UPDATE public.aip_registry
  SET 
    status = 'revoked',
    revoked_at = NOW(),
    revoked_reason = 'Expired automatically'
  WHERE 
    expires_at IS NOT NULL 
    AND expires_at < NOW()
    AND status = 'active';
  
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  
  RETURN v_expired_count;
END;
$;

-- =====================================================
-- PART 8: UPDATE VIEWS
-- =====================================================

-- Drop old view
DROP VIEW IF EXISTS public.aid_discovery;

-- Create new view with updated name and references
CREATE OR REPLACE VIEW public.aip_discovery AS
SELECT 
  aip_uri,
  agent_name,
  agent_description,
  endpoint,
  protocols,
  capabilities,
  metadata,
  registered_at,
  last_used_at
FROM public.aip_registry
WHERE 
  status = 'active'
  AND verified = TRUE
  AND (expires_at IS NULL OR expires_at > NOW())
  AND EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = aip_registry.tenant_id
      AND (t.settings->>'federation_mode')::TEXT IN ('federated', 'public')
  );

-- Grant public read access to discovery view
GRANT SELECT ON public.aip_discovery TO authenticated;

-- =====================================================
-- PART 9: UPDATE FOREIGN KEY REFERENCES
-- =====================================================

-- Update foreign key constraint in agent_keys
ALTER TABLE public.agent_keys 
  DROP CONSTRAINT IF EXISTS agent_keys_aid_registry_id_fkey;

ALTER TABLE public.agent_keys 
  ADD CONSTRAINT agent_keys_aip_registry_id_fkey 
  FOREIGN KEY (aip_registry_id) REFERENCES public.aip_registry(id) ON DELETE SET NULL;

-- =====================================================
-- PART 10: UPDATE COMMENTS
-- =====================================================

COMMENT ON TABLE public.aip_registry IS 'Anóteros Identity Protocol (AIP) registry with tenant isolation for agent identity and discovery';
COMMENT ON COLUMN public.aip_registry.aip_uri IS 'AIP protocol URI: aip://domain/agent/name';
COMMENT ON COLUMN public.agent_keys.aip_uri IS 'AIP protocol URI: aip://domain/agent/name';
COMMENT ON COLUMN public.agent_keys.aip_registry_id IS 'Optional reference to AIP registry entry';
COMMENT ON VIEW public.aip_discovery IS 'Public view for agent discovery - shows active, verified agents in federated/public mode';

-- =====================================================
-- MIGRATION VERIFICATION
-- =====================================================

DO $
BEGIN
  RAISE NOTICE '✅ Migration 039 completed successfully';
  RAISE NOTICE 'Renamed table: aid_registry → aip_registry';
  RAISE NOTICE 'Renamed column: aid_uri → aip_uri';
  RAISE NOTICE 'Updated all constraints, indexes, policies, triggers, functions, and views';
  RAISE NOTICE 'Updated all comments to reference AIP (Anóteros Identity Protocol)';
END $;
