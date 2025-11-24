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
DO $$ BEGIN
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
END $$;

-- Add tenant_id to byzantine_evidence (if table exists)
DO $$ BEGIN
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
END $$;

-- =====================================================
-- 2. CREATE INDEXES
-- =====================================================

-- Index for consensus_proposals tenant filtering
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'consensus_proposals'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_consensus_proposals_tenant 
      ON consensus_proposals(tenant_id);
    
    CREATE INDEX IF NOT EXISTS idx_consensus_proposals_tenant_height 
      ON consensus_proposals(tenant_id, height);
  END IF;
END $$;

-- Index for byzantine_evidence tenant filtering
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'byzantine_evidence'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_byzantine_evidence_tenant 
      ON byzantine_evidence(tenant_id);
    
    CREATE INDEX IF NOT EXISTS idx_byzantine_evidence_tenant_accused 
      ON byzantine_evidence(tenant_id, accused_address);
  END IF;
END $$;

-- =====================================================
-- 3. ENABLE ROW-LEVEL SECURITY
-- =====================================================

-- Enable RLS for consensus_proposals
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'consensus_proposals'
  ) THEN
    ALTER TABLE consensus_proposals ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Enable RLS for byzantine_evidence
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'byzantine_evidence'
  ) THEN
    ALTER TABLE byzantine_evidence ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- =====================================================
-- 4. RLS POLICIES - CONSENSUS_PROPOSALS
-- =====================================================

-- Drop existing policies if present
DROP POLICY IF EXISTS "Consensus proposals tenant isolation SELECT" ON consensus_proposals;
DROP POLICY IF EXISTS "Consensus proposals tenant isolation INSERT" ON consensus_proposals;
DROP POLICY IF EXISTS "Consensus proposals tenant isolation UPDATE" ON consensus_proposals;
DROP POLICY IF EXISTS "Consensus proposals tenant isolation DELETE" ON consensus_proposals;

-- SELECT: Users can view proposals from their tenant
DO $$ BEGIN
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
END $$;

-- INSERT: Users can only create proposals for their tenant
DO $$ BEGIN
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
END $$;

-- UPDATE: Only service role can update (consensus is immutable)
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'consensus_proposals'
  ) THEN
    CREATE POLICY "Consensus proposals tenant isolation UPDATE"
      ON consensus_proposals
      FOR UPDATE
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- DELETE: Only service role can delete (for cleanup)
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'consensus_proposals'
  ) THEN
    CREATE POLICY "Consensus proposals tenant isolation DELETE"
      ON consensus_proposals
      FOR DELETE
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- =====================================================
-- 5. RLS POLICIES - BYZANTINE_EVIDENCE
-- =====================================================

-- Drop existing policies if present
DROP POLICY IF EXISTS "Byzantine evidence tenant isolation SELECT" ON byzantine_evidence;
DROP POLICY IF EXISTS "Byzantine evidence tenant isolation INSERT" ON byzantine_evidence;
DROP POLICY IF EXISTS "Byzantine evidence tenant isolation UPDATE" ON byzantine_evidence;
DROP POLICY IF EXISTS "Byzantine evidence tenant isolation DELETE" ON byzantine_evidence;

-- SELECT: Users can view evidence from their tenant
DO $$ BEGIN
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
END $$;

-- INSERT: Users can report evidence for their tenant
DO $$ BEGIN
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
END $$;

-- UPDATE: Only service role can update (evidence is immutable)
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'byzantine_evidence'
  ) THEN
    CREATE POLICY "Byzantine evidence tenant isolation UPDATE"
      ON byzantine_evidence
      FOR UPDATE
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- DELETE: Only service role can delete
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'byzantine_evidence'
  ) THEN
    CREATE POLICY "Byzantine evidence tenant isolation DELETE"
      ON byzantine_evidence
      FOR DELETE
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- =====================================================
-- 6. VERIFICATION
-- =====================================================

-- Verify tenant_id columns exist
DO $$ 
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
END $$;
