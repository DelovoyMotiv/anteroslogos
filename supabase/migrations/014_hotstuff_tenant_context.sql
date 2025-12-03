-- =====================================================
-- Migration 014: HotStuff Consensus Tenant Isolation
-- =====================================================
-- Description: Add tenant_id to consensus-related tables for multi-tenant isolation
-- Created: 2025-11-24
-- Dependencies: 009_aid_registry_tenant_isolation.sql
-- Security: RLS policies enforce tenant boundaries for consensus operations

-- =====================================================
-- 1. ALTER TABLES - ADD TENANT_ID
-- =====================================================

-- Add tenant_id to consensus_proposals (if table exists)
DO $consensus_proposals_tenant_col$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'consensus_proposals'
  ) THEN
    -- Add tenant_id column
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'consensus_proposals' 
        AND column_name = 'tenant_id'
    ) THEN
      ALTER TABLE consensus_proposals ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
      COMMENT ON COLUMN consensus_proposals.tenant_id IS 'Tenant isolation - which tenant owns this proposal';
    END IF;
  END IF;
END $consensus_proposals_tenant_col$;

-- Add tenant_id to byzantine_evidence (if table exists)
DO $byzantine_evidence_tenant_col$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'byzantine_evidence'
  ) THEN
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'byzantine_evidence' 
        AND column_name = 'tenant_id'
    ) THEN
      ALTER TABLE byzantine_evidence ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
      COMMENT ON COLUMN byzantine_evidence.tenant_id IS 'Tenant isolation - which tenant reported this evidence';
    END IF;
  END IF;
END $byzantine_evidence_tenant_col$;

-- =====================================================
-- 2. CREATE INDEXES
-- =====================================================

-- Index for consensus_proposals tenant filtering
DO $consensus_proposals_indexes$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'consensus_proposals'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_consensus_proposals_tenant 
      ON consensus_proposals(tenant_id);
    
    CREATE INDEX IF NOT EXISTS idx_consensus_proposals_tenant_height 
      ON consensus_proposals(tenant_id, height);
  END IF;
END $consensus_proposals_indexes$;

-- Index for byzantine_evidence tenant filtering
DO $byzantine_evidence_indexes$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'byzantine_evidence'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_byzantine_evidence_tenant 
      ON byzantine_evidence(tenant_id);
    
    CREATE INDEX IF NOT EXISTS idx_byzantine_evidence_tenant_accused 
      ON byzantine_evidence(tenant_id, accused_address);
  END IF;
END $byzantine_evidence_indexes$;

-- =====================================================
-- 3. ENABLE ROW-LEVEL SECURITY
-- =====================================================

-- Enable RLS for consensus_proposals
DO $consensus_proposals_rls$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'consensus_proposals'
  ) THEN
    ALTER TABLE consensus_proposals ENABLE ROW LEVEL SECURITY;
  END IF;
END $consensus_proposals_rls$;

-- Enable RLS for byzantine_evidence
DO $byzantine_evidence_rls$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'byzantine_evidence'
  ) THEN
    ALTER TABLE byzantine_evidence ENABLE ROW LEVEL SECURITY;
  END IF;
END $byzantine_evidence_rls$;

-- =====================================================
-- 4. RLS POLICIES - CONSENSUS_PROPOSALS
-- =====================================================

-- Drop existing policies if present (only if table exists)
DO $consensus_proposals_drop_policies$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'consensus_proposals'
  ) THEN
    DROP POLICY IF EXISTS "Consensus proposals tenant isolation SELECT" ON consensus_proposals;
    DROP POLICY IF EXISTS "Consensus proposals tenant isolation INSERT" ON consensus_proposals;
    DROP POLICY IF EXISTS "Consensus proposals tenant isolation UPDATE" ON consensus_proposals;
    DROP POLICY IF EXISTS "Consensus proposals tenant isolation DELETE" ON consensus_proposals;
  END IF;
END $consensus_proposals_drop_policies$;

-- SELECT: Users can view proposals from their tenant
DO $consensus_proposals_select_policy$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'consensus_proposals'
  ) THEN
    CREATE POLICY "Consensus proposals tenant isolation SELECT"
      ON consensus_proposals
      FOR SELECT
      USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR auth.role() = 'service_role'
      );
  END IF;
END $consensus_proposals_select_policy$;

-- INSERT: Users can only create proposals for their tenant
DO $consensus_proposals_insert_policy$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'consensus_proposals'
  ) THEN
    CREATE POLICY "Consensus proposals tenant isolation INSERT"
      ON consensus_proposals
      FOR INSERT
      WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR auth.role() = 'service_role'
      );
  END IF;
END $consensus_proposals_insert_policy$;

-- UPDATE: Only service role can update (consensus is immutable)
DO $consensus_proposals_update_policy$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'consensus_proposals'
  ) THEN
    CREATE POLICY "Consensus proposals tenant isolation UPDATE"
      ON consensus_proposals
      FOR UPDATE
      USING (auth.role() = 'service_role');
  END IF;
END $consensus_proposals_update_policy$;

-- DELETE: Only service role can delete (for cleanup)
DO $consensus_proposals_delete_policy$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'consensus_proposals'
  ) THEN
    CREATE POLICY "Consensus proposals tenant isolation DELETE"
      ON consensus_proposals
      FOR DELETE
      USING (auth.role() = 'service_role');
  END IF;
END $consensus_proposals_delete_policy$;

-- =====================================================
-- 5. RLS POLICIES - BYZANTINE_EVIDENCE
-- =====================================================

-- Drop existing policies if present (only if table exists)
DO $byzantine_evidence_drop_policies$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'byzantine_evidence'
  ) THEN
    DROP POLICY IF EXISTS "Byzantine evidence tenant isolation SELECT" ON byzantine_evidence;
    DROP POLICY IF EXISTS "Byzantine evidence tenant isolation INSERT" ON byzantine_evidence;
    DROP POLICY IF EXISTS "Byzantine evidence tenant isolation UPDATE" ON byzantine_evidence;
    DROP POLICY IF EXISTS "Byzantine evidence tenant isolation DELETE" ON byzantine_evidence;
  END IF;
END $byzantine_evidence_drop_policies$;

-- SELECT: Users can view evidence from their tenant
DO $byzantine_evidence_select_policy$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'byzantine_evidence'
  ) THEN
    CREATE POLICY "Byzantine evidence tenant isolation SELECT"
      ON byzantine_evidence
      FOR SELECT
      USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR auth.role() = 'service_role'
      );
  END IF;
END $byzantine_evidence_select_policy$;

-- INSERT: Users can report evidence for their tenant
DO $byzantine_evidence_insert_policy$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'byzantine_evidence'
  ) THEN
    CREATE POLICY "Byzantine evidence tenant isolation INSERT"
      ON byzantine_evidence
      FOR INSERT
      WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR auth.role() = 'service_role'
      );
  END IF;
END $byzantine_evidence_insert_policy$;

-- UPDATE: Only service role can update (evidence is immutable)
DO $byzantine_evidence_update_policy$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'byzantine_evidence'
  ) THEN
    CREATE POLICY "Byzantine evidence tenant isolation UPDATE"
      ON byzantine_evidence
      FOR UPDATE
      USING (auth.role() = 'service_role');
  END IF;
END $byzantine_evidence_update_policy$;

-- DELETE: Only service role can delete
DO $byzantine_evidence_delete_policy$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'byzantine_evidence'
  ) THEN
    CREATE POLICY "Byzantine evidence tenant isolation DELETE"
      ON byzantine_evidence
      FOR DELETE
      USING (auth.role() = 'service_role');
  END IF;
END $byzantine_evidence_delete_policy$;

-- =====================================================
-- 6. VERIFICATION
-- =====================================================

-- Verify tenant_id columns exist
DO $verification_block$
DECLARE
  proposals_has_tenant BOOLEAN;
  evidence_has_tenant BOOLEAN;
BEGIN
  -- Check consensus_proposals
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'consensus_proposals' 
      AND column_name = 'tenant_id'
  ) INTO proposals_has_tenant;
  
  -- Check byzantine_evidence
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'byzantine_evidence' 
      AND column_name = 'tenant_id'
  ) INTO evidence_has_tenant;
  
  RAISE NOTICE 'Migration 014 verification:';
  RAISE NOTICE '  consensus_proposals.tenant_id: %', proposals_has_tenant;
  RAISE NOTICE '  byzantine_evidence.tenant_id: %', evidence_has_tenant;
END $verification_block$;
