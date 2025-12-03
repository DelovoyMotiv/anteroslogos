-- ============================================
-- Migration 9: 009_aid_registry_tenant_isolation.sql
-- ============================================

-- =====================================================
-- MIGRATION 009: AID REGISTRY WITH TENANT ISOLATION
-- Agent Identity & Discovery Protocol Registry
-- Date: 2025-11-24
-- Author: Principal AI Engineer
-- =====================================================

-- CRITICAL: This migration creates tenant-scoped AID registry
-- to prevent AID URI spoofing and ensure cryptographic ownership

-- =====================================================
-- PART 1: CREATE AID_REGISTRY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.aid_registry (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Tenant isolation (CRITICAL)
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- AID URI (globally unique across all tenants)
  aid_uri TEXT NOT NULL UNIQUE,
  
  -- Cryptographic proof of ownership
  public_key_ed25519 TEXT NOT NULL, -- Base64-encoded Ed25519 public key (32 bytes)
  key_algorithm TEXT NOT NULL DEFAULT 'Ed25519' CHECK (key_algorithm IN ('Ed25519', 'ECDSA-secp256k1')),
  
  -- Agent metadata
  agent_name TEXT NOT NULL CHECK (length(agent_name) >= 1 AND length(agent_name) <= 255),
  agent_description TEXT,
  
  -- Discovery endpoints
  endpoint TEXT, -- HTTPS endpoint for agent API
  protocols TEXT[] DEFAULT ARRAY['a2a', 'http']::TEXT[], -- Supported protocols
  
  -- Metadata (JSON)
  metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
  
  -- Verification status
  verified BOOLEAN DEFAULT FALSE NOT NULL,
  verification_method TEXT, -- 'dns-txt', 'https-wellknown', 'manual'
  verification_data JSONB, -- Evidence of verification
  
  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  
  -- Expiry (optional, for temporary registrations)
  expires_at TIMESTAMPTZ,
  
  -- Permissions and capabilities
  permissions TEXT[] DEFAULT ARRAY['mcp:execute']::TEXT[],
  capabilities TEXT[], -- e.g. ['search', 'analysis', 'generation']
  
  -- Usage tracking
  last_used_at TIMESTAMPTZ,
  usage_count BIGINT DEFAULT 0,
  
  -- Timestamps
  registered_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_aid_uri CHECK (aid_uri ~ '^aid://[a-z0-9.-]+/agent/[a-z0-9-]+$'),
  CONSTRAINT valid_public_key CHECK (length(public_key_ed25519) > 0),
  CONSTRAINT valid_endpoint CHECK (endpoint IS NULL OR endpoint ~ '^https://'),
  CONSTRAINT no_revoked_reason_if_active CHECK (
    (status = 'active' AND revoked_reason IS NULL AND revoked_at IS NULL) OR
    (status IN ('suspended', 'revoked'))
  )
);

-- =====================================================
-- PART 2: INDEXES FOR PERFORMANCE
-- =====================================================

-- Primary lookup: by AID URI (unique)
CREATE UNIQUE INDEX idx_aid_registry_uri ON public.aid_registry(aid_uri);

-- Tenant isolation (CRITICAL for RLS performance)
CREATE INDEX idx_aid_registry_tenant ON public.aid_registry(tenant_id, status) 
  WHERE status = 'active';

-- Public key lookup (for verification)
CREATE INDEX idx_aid_registry_pubkey ON public.aid_registry(public_key_ed25519)
  WHERE status = 'active';

-- Expiry cleanup
CREATE INDEX idx_aid_registry_expires ON public.aid_registry(expires_at)
  WHERE expires_at IS NOT NULL AND status = 'active';

-- Verification status
CREATE INDEX idx_aid_registry_verified ON public.aid_registry(tenant_id, verified)
  WHERE status = 'active';

-- Last used (for metrics)
CREATE INDEX idx_aid_registry_last_used ON public.aid_registry(last_used_at DESC)
  WHERE status = 'active';

-- =====================================================
-- PART 3: ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.aid_registry ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS aid_registry_select ON public.aid_registry;
DROP POLICY IF EXISTS aid_registry_insert ON public.aid_registry;
DROP POLICY IF EXISTS aid_registry_update ON public.aid_registry;
DROP POLICY IF EXISTS aid_registry_delete ON public.aid_registry;

-- SELECT: Users can see agents in their tenant + verified agents in federation mode
CREATE POLICY aid_registry_select ON public.aid_registry
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

-- INSERT: Only members can register agents for their tenant
CREATE POLICY aid_registry_insert ON public.aid_registry
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_has_tenant_access(tenant_id, 'member'));

-- UPDATE: Only admins can update agent registry
CREATE POLICY aid_registry_update ON public.aid_registry
  FOR UPDATE
  TO authenticated
  USING (public.user_has_tenant_access(tenant_id, 'admin'))
  WITH CHECK (public.user_has_tenant_access(tenant_id, 'admin'));

-- DELETE: Only owners can delete (revoke) agents
CREATE POLICY aid_registry_delete ON public.aid_registry
  FOR DELETE
  TO authenticated
  USING (public.user_has_tenant_access(tenant_id, 'owner'));

-- =====================================================
-- PART 4: AUTO-UPDATE TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_aid_registry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER aid_registry_updated_at
  BEFORE UPDATE ON public.aid_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_aid_registry_updated_at();

-- Auto-fill tenant_id from session context
CREATE TRIGGER aid_registry_tenant_id
  BEFORE INSERT ON public.aid_registry
  FOR EACH ROW
  EXECUTE FUNCTION public.fill_tenant_id();

-- =====================================================
-- PART 5: VERIFICATION FUNCTIONS
-- =====================================================

/**
 * Verify AID ownership via DNS TXT record
 * Checks _agent.<domain> TXT record matches public key
 */
CREATE OR REPLACE FUNCTION public.verify_aid_dns(
  p_aid_uri TEXT,
  p_public_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_domain TEXT;
  v_result JSONB;
BEGIN
  -- Extract domain from AID URI (aid://domain/agent/name)
  v_domain := substring(p_aid_uri from 'aid://([^/]+)/');
  
  IF v_domain IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Invalid AID URI format'
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
$$;

/**
 * Mark AID as verified after manual review
 * Only callable by admin users
 */
CREATE OR REPLACE FUNCTION public.verify_aid_manual(
  p_aid_uri TEXT,
  p_verification_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_registry aid_registry%ROWTYPE;
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
  FROM public.aid_registry
  WHERE aid_uri = p_aid_uri AND tenant_id = v_tenant_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'AID not found in registry'
    );
  END IF;
  
  -- Update verification
  UPDATE public.aid_registry
  SET 
    verified = TRUE,
    verification_method = 'manual',
    verification_data = jsonb_build_object(
      'notes', p_verification_notes,
      'verified_by', auth.uid(),
      'verified_at', NOW()
    )
  WHERE aid_uri = p_aid_uri AND tenant_id = v_tenant_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'aid_uri', p_aid_uri,
    'verified', TRUE
  );
END;
$$;

-- =====================================================
-- PART 6: CLEANUP FUNCTIONS
-- =====================================================

/**
 * Expire old AID registrations
 * Run this periodically via pg_cron or external scheduler
 */
CREATE OR REPLACE FUNCTION public.expire_aid_registrations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  UPDATE public.aid_registry
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
$$;

-- =====================================================
-- PART 7: VIEWS FOR DISCOVERY
-- =====================================================

/**
 * Public view for agent discovery
 * Only shows active, verified agents in federated/public mode
 */
CREATE OR REPLACE VIEW public.aid_discovery AS
SELECT 
  aid_uri,
  agent_name,
  agent_description,
  endpoint,
  protocols,
  capabilities,
  metadata,
  registered_at,
  last_used_at
FROM public.aid_registry
WHERE 
  status = 'active'
  AND verified = TRUE
  AND (expires_at IS NULL OR expires_at > NOW())
  AND EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = aid_registry.tenant_id
      AND (t.settings->>'federation_mode')::TEXT IN ('federated', 'public')
  );

-- Grant public read access to discovery view
GRANT SELECT ON public.aid_discovery TO authenticated;

-- =====================================================
-- PART 8: AGENT_KEYS INTEGRATION
-- =====================================================

-- Link agent_keys to aid_registry (optional foreign key)
ALTER TABLE public.agent_keys 
  ADD COLUMN IF NOT EXISTS aid_registry_id UUID REFERENCES public.aid_registry(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agent_keys_aid_registry ON public.agent_keys(aid_registry_id)
  WHERE aid_registry_id IS NOT NULL;

-- =====================================================
-- MIGRATION VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 009 completed successfully';
  RAISE NOTICE 'Created table: aid_registry';
  RAISE NOTICE 'RLS enabled with tenant isolation';
  RAISE NOTICE 'Created verification functions';
  RAISE NOTICE 'Created public discovery view';
END $$;


-- Migration complete: 009_aid_registry_tenant_isolation.sql


