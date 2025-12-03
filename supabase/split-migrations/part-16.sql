-- ============================================
-- Migration 16: 015_intent_payments_tenant.sql
-- ============================================

-- =====================================================
-- Migration 015: Intent Payments Tenant Isolation
-- =====================================================
-- Description: Add tenant_id to payment intent tables for multi-tenant isolation
-- Created: 2025-11-24
-- Dependencies: 009_aid_registry_tenant_isolation.sql
-- Security: RLS policies enforce tenant boundaries for payment operations

-- =====================================================
-- 1. ALTER TABLES - ADD TENANT_ID
-- =====================================================

-- Add tenant_id to payment_intents (if table exists)
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'payment_intents'
  ) THEN
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'payment_intents' 
        AND column_name = 'tenant_id'
    ) THEN
      ALTER TABLE payment_intents ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
      COMMENT ON COLUMN payment_intents.tenant_id IS 'Tenant isolation - which tenant owns this intent';
    END IF;
  END IF;
END $$;

-- Add tenant_id to intent_executions (if table exists)
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'intent_executions'
  ) THEN
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'intent_executions' 
        AND column_name = 'tenant_id'
    ) THEN
      ALTER TABLE intent_executions ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
      COMMENT ON COLUMN intent_executions.tenant_id IS 'Tenant isolation - which tenant executed this intent';
    END IF;
  END IF;
END $$;

-- =====================================================
-- 2. CREATE INDEXES
-- =====================================================

-- Index for payment_intents tenant filtering
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'payment_intents'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_payment_intents_tenant 
      ON payment_intents(tenant_id);
    
    CREATE INDEX IF NOT EXISTS idx_payment_intents_tenant_status 
      ON payment_intents(tenant_id, status);
  END IF;
END $$;

-- Index for intent_executions tenant filtering
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'intent_executions'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_intent_executions_tenant 
      ON intent_executions(tenant_id);
    
    CREATE INDEX IF NOT EXISTS idx_intent_executions_tenant_intent 
      ON intent_executions(tenant_id, intent_id);
  END IF;
END $$;

-- =====================================================
-- 3. ENABLE ROW-LEVEL SECURITY
-- =====================================================

-- Enable RLS for payment_intents
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'payment_intents'
  ) THEN
    ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Enable RLS for intent_executions
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'intent_executions'
  ) THEN
    ALTER TABLE intent_executions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- =====================================================
-- 4. RLS POLICIES - PAYMENT_INTENTS
-- =====================================================

-- Drop existing policies if present
DROP POLICY IF EXISTS "Payment intents tenant isolation SELECT" ON payment_intents;
DROP POLICY IF EXISTS "Payment intents tenant isolation INSERT" ON payment_intents;
DROP POLICY IF EXISTS "Payment intents tenant isolation UPDATE" ON payment_intents;
DROP POLICY IF EXISTS "Payment intents tenant isolation DELETE" ON payment_intents;

-- SELECT: Users can view intents from their tenant
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'payment_intents'
  ) THEN
    CREATE POLICY "Payment intents tenant isolation SELECT"
      ON payment_intents
      FOR SELECT
      USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR auth.role() = 'service_role'
      );
  END IF;
END $$;

-- INSERT: Users can only create intents for their tenant
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'payment_intents'
  ) THEN
    CREATE POLICY "Payment intents tenant isolation INSERT"
      ON payment_intents
      FOR INSERT
      WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR auth.role() = 'service_role'
      );
  END IF;
END $$;

-- UPDATE: Only service role can update (intents are immutable after creation)
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'payment_intents'
  ) THEN
    CREATE POLICY "Payment intents tenant isolation UPDATE"
      ON payment_intents
      FOR UPDATE
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- DELETE: Only service role can delete
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'payment_intents'
  ) THEN
    CREATE POLICY "Payment intents tenant isolation DELETE"
      ON payment_intents
      FOR DELETE
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- =====================================================
-- 5. RLS POLICIES - INTENT_EXECUTIONS
-- =====================================================

-- Drop existing policies if present
DROP POLICY IF EXISTS "Intent executions tenant isolation SELECT" ON intent_executions;
DROP POLICY IF EXISTS "Intent executions tenant isolation INSERT" ON intent_executions;
DROP POLICY IF EXISTS "Intent executions tenant isolation UPDATE" ON intent_executions;
DROP POLICY IF EXISTS "Intent executions tenant isolation DELETE" ON intent_executions;

-- SELECT: Users can view executions from their tenant
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'intent_executions'
  ) THEN
    CREATE POLICY "Intent executions tenant isolation SELECT"
      ON intent_executions
      FOR SELECT
      USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR auth.role() = 'service_role'
      );
  END IF;
END $$;

-- INSERT: Users can create executions for their tenant
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'intent_executions'
  ) THEN
    CREATE POLICY "Intent executions tenant isolation INSERT"
      ON intent_executions
      FOR INSERT
      WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR auth.role() = 'service_role'
      );
  END IF;
END $$;

-- UPDATE: Service role can update status
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'intent_executions'
  ) THEN
    CREATE POLICY "Intent executions tenant isolation UPDATE"
      ON intent_executions
      FOR UPDATE
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- DELETE: Only service role can delete
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'intent_executions'
  ) THEN
    CREATE POLICY "Intent executions tenant isolation DELETE"
      ON intent_executions
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
  intents_has_tenant BOOLEAN;
  executions_has_tenant BOOLEAN;
BEGIN
  -- Check payment_intents
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'payment_intents' 
      AND column_name = 'tenant_id'
  ) INTO intents_has_tenant;
  
  -- Check intent_executions
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'intent_executions' 
      AND column_name = 'tenant_id'
  ) INTO executions_has_tenant;
  
  RAISE NOTICE 'Migration 015 verification:';
  RAISE NOTICE '  payment_intents.tenant_id: %', intents_has_tenant;
  RAISE NOTICE '  intent_executions.tenant_id: %', executions_has_tenant;
END $$;


-- Migration complete: 015_intent_payments_tenant.sql


