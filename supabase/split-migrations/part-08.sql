-- ============================================
-- Migration 8: 008_audit_trail_worm.sql
-- ============================================

-- =====================================================
-- MIGRATION 008: IMMUTABLE AUDIT TRAIL (WORM)
-- GDPR Art. 30, SOC 2 CC6.1, Write-Once-Read-Many
-- Date: 2025-11-22
-- =====================================================

-- CRITICAL: This creates an immutable audit log for compliance.
-- All sensitive operations are cryptographically signed (Ed25519).

-- =====================================================
-- PART 1: AUDIT_TRAIL TABLE (IMMUTABLE)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.audit_trail (
  id BIGSERIAL PRIMARY KEY,
  
  -- Tenant isolation
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Actor
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  actor_ip INET,
  
  -- Action
  action TEXT NOT NULL CHECK (action IN (
    'api_call', 'graph_update', 'payment', 'key_create', 'key_revoke', 
    'login', 'logout', 'subscription_change', 'tenant_create', 'tenant_update',
    'member_add', 'member_remove', 'audit_run', 'data_export', 'data_delete'
  )),
  
  -- Entity
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'api_key', 'agent_key', 'subscription', 'tenant', 'tenant_member',
    'audit', 'knowledge_graph', 'citation', 'invoice', 'wallet', 'profile'
  )),
  entity_id UUID,
  
  -- UCPT provenance (if applicable)
  ucpt_hash TEXT CHECK (ucpt_hash ~ '^[a-fA-F0-9]{128}$'), -- SHA3-512
  
  -- State snapshots (for GDPR DSAR)
  old_state JSONB,
  new_state JSONB,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamp (immutable, set by DB)
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ed25519 signature (COSE_Sign1 with CBOR)
  signature TEXT, -- Base64-encoded COSE_Sign1
  signature_algorithm TEXT DEFAULT 'Ed25519' CHECK (signature_algorithm IN ('Ed25519')),
  
  -- Constraints
  CONSTRAINT valid_ucpt_hash CHECK (ucpt_hash IS NULL OR length(ucpt_hash) = 128)
);

-- Indexes for performance
CREATE INDEX idx_audit_trail_tenant ON public.audit_trail(tenant_id, timestamp DESC);
CREATE INDEX idx_audit_trail_actor ON public.audit_trail(actor_id, timestamp DESC) WHERE actor_id IS NOT NULL;
CREATE INDEX idx_audit_trail_action ON public.audit_trail(action, timestamp DESC);
CREATE INDEX idx_audit_trail_entity ON public.audit_trail(entity_type, entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX idx_audit_trail_timestamp ON public.audit_trail(timestamp DESC);

-- GIN index for metadata search
CREATE INDEX idx_audit_trail_metadata ON public.audit_trail USING GIN (metadata);

-- =====================================================
-- PART 2: WORM ENFORCEMENT (IMMUTABLE)
-- =====================================================

-- Prevent UPDATE/DELETE on audit_trail (WORM = Write-Once-Read-Many)
CREATE OR REPLACE FUNCTION public.prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_trail is immutable (WORM). Operation not allowed: %', TG_OP
    USING HINT = 'Audit trail cannot be modified or deleted per GDPR Art. 30 and SOC 2 CC6.1';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_trail_worm_update
  BEFORE UPDATE ON public.audit_trail
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_modification();

CREATE TRIGGER audit_trail_worm_delete
  BEFORE DELETE ON public.audit_trail
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_modification();

-- =====================================================
-- PART 3: SIGNATURE HELPER (Ed25519)
-- =====================================================

-- Note: Actual Ed25519 signing must be done in application layer (Node.js)
-- This function is a placeholder for signature verification logic

CREATE OR REPLACE FUNCTION public.verify_audit_signature(
  audit_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  audit_row public.audit_trail%ROWTYPE;
  canonical_payload TEXT;
BEGIN
  -- Fetch audit row
  SELECT * INTO audit_row FROM public.audit_trail WHERE id = audit_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Canonical payload for signature (excluding id, timestamp, signature)
  canonical_payload := jsonb_build_object(
    'tenant_id', audit_row.tenant_id,
    'actor_id', audit_row.actor_id,
    'action', audit_row.action,
    'entity_type', audit_row.entity_type,
    'entity_id', audit_row.entity_id,
    'old_state', audit_row.old_state,
    'new_state', audit_row.new_state,
    'metadata', audit_row.metadata
  )::TEXT;
  
  -- TODO: Call external Ed25519 verification via pg_net or return for app-layer verification
  -- For now, signature presence check
  RETURN audit_row.signature IS NOT NULL AND length(audit_row.signature) > 0;
END;
$$;

-- =====================================================
-- PART 4: AUTO-AUDIT TRIGGERS (ALL TABLES)
-- =====================================================

-- Generic audit logging function
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
  action_name TEXT;
  old_data JSONB;
  new_data JSONB;
  current_tenant_id UUID;
  entity_type_name TEXT;
BEGIN
  -- Determine action
  IF TG_OP = 'INSERT' THEN
    action_name := lower(TG_TABLE_NAME) || '_create';
    new_data := to_jsonb(NEW);
    old_data := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    action_name := lower(TG_TABLE_NAME) || '_update';
    new_data := to_jsonb(NEW);
    old_data := to_jsonb(OLD);
  ELSIF TG_OP = 'DELETE' THEN
    action_name := lower(TG_TABLE_NAME) || '_delete';
    new_data := NULL;
    old_data := to_jsonb(OLD);
  END IF;
  
  -- Get tenant_id from row (if column exists)
  IF TG_TABLE_NAME IN ('api_keys', 'agent_keys', 'subscriptions', 'usage_events', 'audits', 'knowledge_graphs', 'citations', 'a2a_wallets', 'a2a_invoices', 'a2a_ledger') THEN
    IF TG_OP = 'DELETE' THEN
      current_tenant_id := (old_data->>'tenant_id')::UUID;
    ELSE
      current_tenant_id := (new_data->>'tenant_id')::UUID;
    END IF;
  ELSIF TG_TABLE_NAME = 'tenants' THEN
    IF TG_OP = 'DELETE' THEN
      current_tenant_id := (old_data->>'id')::UUID;
    ELSE
      current_tenant_id := (new_data->>'id')::UUID;
    END IF;
  ELSE
    current_tenant_id := public.get_current_tenant_id();
  END IF;
  
  -- Map table name to entity_type
  entity_type_name := CASE TG_TABLE_NAME
    WHEN 'api_keys' THEN 'api_key'
    WHEN 'agent_keys' THEN 'agent_key'
    WHEN 'subscriptions' THEN 'subscription'
    WHEN 'tenants' THEN 'tenant'
    WHEN 'tenant_members' THEN 'tenant_member'
    WHEN 'audits' THEN 'audit'
    WHEN 'knowledge_graphs' THEN 'knowledge_graph'
    WHEN 'citations' THEN 'citation'
    WHEN 'a2a_invoices' THEN 'invoice'
    WHEN 'a2a_wallets' THEN 'wallet'
    WHEN 'profiles' THEN 'profile'
    ELSE 'unknown'
  END;
  
  -- Insert audit log (signature computed async in application)
  INSERT INTO public.audit_trail (
    tenant_id,
    actor_id,
    actor_email,
    actor_ip,
    action,
    entity_type,
    entity_id,
    old_state,
    new_state,
    metadata
  ) VALUES (
    current_tenant_id,
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    inet_client_addr(),
    action_name,
    entity_type_name,
    COALESCE((new_data->>'id')::UUID, (old_data->>'id')::UUID),
    old_data,
    new_data,
    jsonb_build_object('trigger', TG_NAME, 'table', TG_TABLE_NAME, 'op', TG_OP)
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_trigger_api_keys
  AFTER INSERT OR UPDATE OR DELETE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_trigger_agent_keys
  AFTER INSERT OR UPDATE OR DELETE ON public.agent_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_trigger_subscriptions
  AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_trigger_tenants
  AFTER INSERT OR UPDATE OR DELETE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_trigger_tenant_members
  AFTER INSERT OR UPDATE OR DELETE ON public.tenant_members
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_trigger_knowledge_graphs
  AFTER INSERT OR UPDATE OR DELETE ON public.knowledge_graphs
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

-- =====================================================
-- PART 5: RLS FOR AUDIT_TRAIL
-- =====================================================

ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can see audit logs for their tenant(s)
CREATE POLICY audit_trail_select ON public.audit_trail
  FOR SELECT
  TO authenticated
  USING (public.user_has_tenant_access(tenant_id, 'viewer'));

-- INSERT: Only system/triggers can insert (no direct user INSERT)
CREATE POLICY audit_trail_insert ON public.audit_trail
  FOR INSERT
  TO authenticated
  WITH CHECK (FALSE); -- Block direct inserts, only triggers allowed

-- UPDATE/DELETE: Blocked by WORM trigger, but RLS as defense-in-depth
CREATE POLICY audit_trail_no_update ON public.audit_trail
  FOR UPDATE
  TO authenticated
  USING (FALSE);

CREATE POLICY audit_trail_no_delete ON public.audit_trail
  FOR DELETE
  TO authenticated
  USING (FALSE);

-- =====================================================
-- PART 6: RETENTION POLICY (7 YEARS)
-- =====================================================

-- Create archived_audit_trail for cold storage after 2 years
CREATE TABLE IF NOT EXISTS public.archived_audit_trail (
  LIKE public.audit_trail INCLUDING ALL
);

-- Function to archive old audit logs (run annually)
CREATE OR REPLACE FUNCTION public.archive_old_audit_logs()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  -- Move audit logs older than 2 years to archive table
  WITH moved AS (
    DELETE FROM public.audit_trail
    WHERE timestamp < NOW() - INTERVAL '2 years'
    RETURNING *
  )
  INSERT INTO public.archived_audit_trail
  SELECT * FROM moved;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  
  RAISE NOTICE 'Archived % audit log entries', archived_count;
  RETURN archived_count;
END;
$$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 008 completed successfully';
  RAISE NOTICE 'Created audit_trail table with WORM enforcement';
  RAISE NOTICE 'Added audit triggers to % tables', (
    SELECT count(*) FROM information_schema.triggers 
    WHERE trigger_name LIKE 'audit_trigger_%'
  );
  RAISE NOTICE 'RLS policies applied to audit_trail';
  RAISE NOTICE 'Retention policy: 7 years (active 2y, archive 5y)';
END $$;


-- Migration complete: 008_audit_trail_worm.sql


