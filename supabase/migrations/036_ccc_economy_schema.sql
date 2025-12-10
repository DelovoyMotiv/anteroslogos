-- =====================================================
-- Migration 036: CCC-Native Economy
-- Purpose: Transition from subscription-based to credit-based billing
-- Standards: Append-only ledger, atomic transactions, RLS security
-- =====================================================

-- =====================================================
-- TABLE: billing_ledger
-- Purpose: Immutable, append-only transaction log for all CCC movements
-- Security: RLS enabled, users can only read their own records
-- Immutability: No UPDATE/DELETE allowed via policies
-- =====================================================

CREATE TABLE IF NOT EXISTS public.billing_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 6) NOT NULL, -- Negative for spend, positive for deposit
  event_type TEXT NOT NULL CHECK (event_type IN (
    'DEPOSIT_STRIPE',
    'DEPOSIT_CRYPTO',
    'MIGRATION_CREDIT',
    'SPEND_API',
    'SPEND_AUDIT',
    'SPEND_CONSENSUS',
    'REWARD_CONTRIBUTION'
  )),
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints: Ensure deposits are positive, spends are negative
  CONSTRAINT positive_deposits CHECK (
    (event_type LIKE 'DEPOSIT_%' OR event_type LIKE 'REWARD_%' OR event_type = 'MIGRATION_CREDIT') 
    AND amount > 0
    OR event_type LIKE 'SPEND_%' AND amount < 0
  )
);

-- Indexes for performance
CREATE INDEX idx_billing_ledger_user_id ON public.billing_ledger(user_id);
CREATE INDEX idx_billing_ledger_created_at ON public.billing_ledger(created_at DESC);
CREATE INDEX idx_billing_ledger_event_type ON public.billing_ledger(event_type);
CREATE INDEX idx_billing_ledger_user_created ON public.billing_ledger(user_id, created_at DESC);

-- RLS Policies
ALTER TABLE public.billing_ledger ENABLE ROW LEVEL SECURITY;

-- Users can only read their own records
CREATE POLICY billing_ledger_select_own 
  ON public.billing_ledger FOR SELECT 
  USING (auth.uid() = user_id);

-- Only service role can insert (enforced at application level)
-- No INSERT policy for regular users = no access
CREATE POLICY billing_ledger_insert_service 
  ON public.billing_ledger FOR INSERT 
  WITH CHECK (false);

-- No UPDATE or DELETE policies = immutable ledger
-- Attempting UPDATE/DELETE will fail with permission denied

-- =====================================================
-- TABLE: user_balances
-- Purpose: Cached balance computation for fast reads
-- Updated: Automatically via trigger on ledger inserts
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_balances (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(12, 6) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  last_transaction_id UUID REFERENCES public.billing_ledger(id),
  last_updated TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for balance queries
CREATE INDEX idx_user_balances_balance ON public.user_balances(balance);

-- RLS Policies
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;

-- Users can only read their own balance
CREATE POLICY user_balances_select_own 
  ON public.user_balances FOR SELECT 
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies for users (managed by trigger)

-- Function to update balance on ledger insert
CREATE OR REPLACE FUNCTION update_user_balance()
RETURNS TRIGGER AS $
BEGIN
  INSERT INTO public.user_balances (user_id, balance, last_transaction_id, last_updated)
  VALUES (
    NEW.user_id,
    NEW.amount,
    NEW.id,
    NEW.created_at
  )
  ON CONFLICT (user_id) DO UPDATE SET
    balance = public.user_balances.balance + NEW.amount,
    last_transaction_id = NEW.id,
    last_updated = NEW.created_at;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on ledger inserts to update balance
CREATE TRIGGER update_balance_on_transaction
  AFTER INSERT ON public.billing_ledger
  FOR EACH ROW
  EXECUTE FUNCTION update_user_balance();

-- =====================================================
-- TABLE: credit_packages
-- Purpose: Define available credit packages for purchase
-- Pricing: Volume discounts for larger packages
-- =====================================================

CREATE TABLE IF NOT EXISTS public.credit_packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  ccc_amount INTEGER NOT NULL CHECK (ccc_amount > 0),
  usd_cost DECIMAL(10, 2) NOT NULL CHECK (usd_cost > 0),
  cost_per_credit DECIMAL(10, 4) GENERATED ALWAYS AS (usd_cost / ccc_amount) STORED,
  stripe_price_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for active packages
CREATE INDEX idx_credit_packages_active ON public.credit_packages(is_active, display_order) 
  WHERE is_active = TRUE;

-- RLS Policies
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view active packages
CREATE POLICY credit_packages_select_active 
  ON public.credit_packages FOR SELECT 
  USING (is_active = TRUE);

-- Seed data: Credit packages with volume discounts
INSERT INTO public.credit_packages (name, ccc_amount, usd_cost, stripe_price_id, display_order) VALUES
  ('Starter Pack', 100, 20.00, 'price_ccc_starter', 1),
  ('Pro Pack', 500, 90.00, 'price_ccc_pro', 2),
  ('Business Pack', 1000, 160.00, 'price_ccc_business', 3),
  ('Enterprise Pack', 5000, 700.00, 'price_ccc_enterprise', 4)
ON CONFLICT DO NOTHING;

-- =====================================================
-- MIGRATION TRACKING: Add columns to user_subscriptions
-- Purpose: Track which subscriptions have been migrated to CCC
-- =====================================================

-- Add migration tracking columns
ALTER TABLE public.user_subscriptions 
  ADD COLUMN IF NOT EXISTS migrated_to_ccc BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS migration_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS migration_credits_granted DECIMAL(12, 6);

-- Index for finding unmigrated subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_migration 
  ON public.user_subscriptions(migrated_to_ccc, status) 
  WHERE migrated_to_ccc = FALSE AND status = 'active';

-- Constraint: If migrated, must have completion timestamp and credits
ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT migration_complete_requires_data CHECK (
    (migrated_to_ccc = TRUE AND migration_completed_at IS NOT NULL AND migration_credits_granted IS NOT NULL) OR
    (migrated_to_ccc = FALSE)
  );

-- =====================================================
-- FUNCTION: get_user_balance
-- Purpose: Get current CCC balance for a user
-- Returns: Balance as DECIMAL(12, 6)
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_balance(p_user_id UUID)
RETURNS DECIMAL(12, 6)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_balance DECIMAL(12, 6);
BEGIN
  -- Try cached balance first
  SELECT balance INTO v_balance
  FROM public.user_balances
  WHERE user_id = p_user_id;
  
  -- If no cached balance, compute from ledger
  IF v_balance IS NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_balance
    FROM public.billing_ledger
    WHERE user_id = p_user_id;
    
    -- Cache the computed balance
    IF v_balance IS NOT NULL THEN
      INSERT INTO public.user_balances (user_id, balance, last_updated)
      VALUES (p_user_id, v_balance, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        balance = v_balance,
        last_updated = NOW();
    END IF;
  END IF;
  
  RETURN COALESCE(v_balance, 0);
END;
$;

-- =====================================================
-- FUNCTION: get_transaction_history
-- Purpose: Get paginated transaction history for a user
-- Returns: Table of transactions with metadata
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_transaction_history(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  amount DECIMAL(12, 6),
  event_type TEXT,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  RETURN QUERY
  SELECT 
    bl.id,
    bl.amount,
    bl.event_type,
    bl.description,
    bl.metadata,
    bl.created_at
  FROM public.billing_ledger bl
  WHERE bl.user_id = p_user_id
    AND (p_start_date IS NULL OR bl.created_at >= p_start_date)
    AND (p_end_date IS NULL OR bl.created_at <= p_end_date)
  ORDER BY bl.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$;

-- =====================================================
-- Comments for documentation
-- =====================================================

COMMENT ON TABLE public.billing_ledger IS 'Immutable, append-only ledger for all CCC transactions';
COMMENT ON TABLE public.user_balances IS 'Cached CCC balance for fast reads, updated via trigger';
COMMENT ON TABLE public.credit_packages IS 'Available credit packages for purchase with volume discounts';
COMMENT ON COLUMN public.user_subscriptions.migrated_to_ccc IS 'Flag indicating subscription has been migrated to CCC economy';
COMMENT ON COLUMN public.user_subscriptions.migration_completed_at IS 'Timestamp when migration to CCC was completed';
COMMENT ON COLUMN public.user_subscriptions.migration_credits_granted IS 'Amount of CCC credits granted during migration';
COMMENT ON FUNCTION public.get_user_balance IS 'Get current CCC balance for a user (cached or computed)';
COMMENT ON FUNCTION public.get_transaction_history IS 'Get paginated transaction history for a user';

-- =====================================================
-- Grant permissions
-- =====================================================

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_balance TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_transaction_history TO authenticated;
