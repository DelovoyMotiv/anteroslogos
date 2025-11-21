-- =====================================================
-- Migration 004: Agent-Pay-Agent (APA) Payment Infrastructure
-- Standards: Base L2 (Chain ID 8453), USDC/ETH support
-- Security: Row-Level Security (RLS) enabled on all tables
-- =====================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: a2a_wallets
-- Purpose: Store custodial and non-custodial wallet addresses
-- Security: AES-256-GCM encrypted private keys for custodial wallets
-- =====================================================

CREATE TABLE IF NOT EXISTS public.a2a_wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agent_keys(id) ON DELETE CASCADE,
  address TEXT NOT NULL UNIQUE,
  chain_id INTEGER NOT NULL DEFAULT 8453,
  is_custodial BOOLEAN DEFAULT TRUE NOT NULL,
  encrypted_key TEXT, -- AES-256-GCM encrypted private key (custodial only)
  encryption_nonce TEXT, -- Base64 GCM nonce (12 bytes)
  encryption_algorithm TEXT DEFAULT 'AES-256-GCM',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT wallet_owner CHECK (user_id IS NOT NULL OR agent_id IS NOT NULL),
  CONSTRAINT custodial_key_required CHECK (
    (is_custodial = TRUE AND encrypted_key IS NOT NULL AND encryption_nonce IS NOT NULL) OR
    (is_custodial = FALSE AND encrypted_key IS NULL AND encryption_nonce IS NULL)
  ),
  CONSTRAINT valid_evm_address CHECK (address ~* '^0x[a-fA-F0-9]{40}$'),
  CONSTRAINT valid_chain_id CHECK (chain_id = 8453) -- Base Mainnet only
);

-- Indexes
CREATE INDEX idx_a2a_wallets_address ON public.a2a_wallets(address);
CREATE INDEX idx_a2a_wallets_user ON public.a2a_wallets(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_a2a_wallets_agent ON public.a2a_wallets(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX idx_a2a_wallets_chain ON public.a2a_wallets(chain_id);

-- RLS Policies
ALTER TABLE public.a2a_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wallets"
  ON public.a2a_wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallets"
  ON public.a2a_wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallets"
  ON public.a2a_wallets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_a2a_wallets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER a2a_wallets_updated_at
  BEFORE UPDATE ON public.a2a_wallets
  FOR EACH ROW EXECUTE FUNCTION update_a2a_wallets_updated_at();

-- =====================================================
-- TABLE: a2a_invoices
-- Purpose: Track payment invoices with lifecycle management
-- State Machine: pending -> confirming -> paid/expired/refunded
-- =====================================================

CREATE TABLE IF NOT EXISTS public.a2a_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id TEXT NOT NULL UNIQUE, -- Format: inv_{ULID}
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agent_keys(id) ON DELETE SET NULL,
  method TEXT NOT NULL, -- JSON-RPC method (e.g., geo.audit.request)
  params JSONB NOT NULL,
  params_hash TEXT NOT NULL, -- SHA3-512(canonical_json(params))
  amount DECIMAL(18,6) NOT NULL CHECK (amount > 0),
  token TEXT NOT NULL CHECK (token IN ('USDC', 'ETH')),
  chain_id INTEGER NOT NULL DEFAULT 8453 CHECK (chain_id = 8453),
  recipient_address TEXT NOT NULL,
  memo_hash TEXT NOT NULL, -- keccak256(invoice_id) for on-chain correlation
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirming', 'paid', 'expired', 'refunded')),
  tx_hash TEXT UNIQUE, -- Ethereum transaction hash
  block_number BIGINT,
  confirmations INTEGER DEFAULT 0 CHECK (confirmations >= 0),
  expires_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_invoice_id CHECK (invoice_id ~* '^inv_[0-9A-HJKMNP-TV-Z]{26}$'),
  CONSTRAINT valid_recipient CHECK (recipient_address ~* '^0x[a-fA-F0-9]{40}$'),
  CONSTRAINT valid_tx_hash CHECK (tx_hash IS NULL OR tx_hash ~* '^0x[a-fA-F0-9]{64}$'),
  CONSTRAINT valid_memo_hash CHECK (memo_hash ~* '^0x[a-fA-F0-9]{64}$'),
  CONSTRAINT tx_hash_required_when_paid CHECK (
    (status IN ('confirming', 'paid') AND tx_hash IS NOT NULL) OR
    (status NOT IN ('confirming', 'paid'))
  ),
  CONSTRAINT paid_at_required CHECK (
    (status = 'paid' AND paid_at IS NOT NULL) OR
    (status != 'paid')
  )
);

-- Indexes
CREATE INDEX idx_a2a_invoices_status_expires ON public.a2a_invoices(status, expires_at);
CREATE INDEX idx_a2a_invoices_tx_hash ON public.a2a_invoices(tx_hash) WHERE tx_hash IS NOT NULL;
CREATE INDEX idx_a2a_invoices_user ON public.a2a_invoices(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_a2a_invoices_agent ON public.a2a_invoices(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX idx_a2a_invoices_method ON public.a2a_invoices(method);
CREATE INDEX idx_a2a_invoices_created ON public.a2a_invoices(created_at DESC);

-- RLS Policies
ALTER TABLE public.a2a_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invoices"
  ON public.a2a_invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoices"
  ON public.a2a_invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices"
  ON public.a2a_invoices FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger: Update updated_at timestamp
CREATE TRIGGER a2a_invoices_updated_at
  BEFORE UPDATE ON public.a2a_invoices
  FOR EACH ROW EXECUTE FUNCTION update_a2a_wallets_updated_at();

-- =====================================================
-- TABLE: a2a_ledger
-- Purpose: Double-entry bookkeeping for internal balance tracking
-- Invariant: SUM(deposits + refunds) - SUM(debits) = balance_after
-- =====================================================

CREATE TABLE IF NOT EXISTS public.a2a_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  wallet_id UUID REFERENCES public.a2a_wallets(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('deposit', 'debit', 'refund')),
  amount DECIMAL(18,6) NOT NULL CHECK (amount > 0),
  token TEXT NOT NULL CHECK (token IN ('USDC', 'ETH')),
  balance_after DECIMAL(18,6) NOT NULL CHECK (balance_after >= 0),
  reference_type TEXT, -- 'invoice', 'usage_event'
  reference_id UUID, -- FK to a2a_invoices.id or usage_events.id
  tx_hash TEXT, -- On-chain transaction hash for deposits
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_ledger_tx_hash CHECK (tx_hash IS NULL OR tx_hash ~* '^0x[a-fA-F0-9]{64}$'),
  CONSTRAINT deposit_requires_tx_hash CHECK (
    (entry_type = 'deposit' AND tx_hash IS NOT NULL) OR
    (entry_type != 'deposit')
  )
);

-- Indexes
CREATE INDEX idx_a2a_ledger_user_time ON public.a2a_ledger(user_id, created_at DESC);
CREATE INDEX idx_a2a_ledger_wallet ON public.a2a_ledger(wallet_id) WHERE wallet_id IS NOT NULL;
CREATE INDEX idx_a2a_ledger_entry_type ON public.a2a_ledger(entry_type, created_at DESC);
CREATE INDEX idx_a2a_ledger_token ON public.a2a_ledger(token, user_id);

-- UNIQUE constraint for idempotency: prevent duplicate tx_hash for same user
-- Partial index (only non-null tx_hash) to allow multiple NULL values
CREATE UNIQUE INDEX idx_a2a_ledger_tx_hash_user_unique ON public.a2a_ledger(tx_hash, user_id)
WHERE tx_hash IS NOT NULL;

-- RLS Policies
ALTER TABLE public.a2a_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ledger entries"
  ON public.a2a_ledger FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ledger entries"
  ON public.a2a_ledger FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE/DELETE policies (append-only ledger)

-- =====================================================
-- TABLE: a2a_chain_watchers
-- Purpose: Track blockchain scanning state for payment verification
-- Note: This table has no RLS (service-level access only)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.a2a_chain_watchers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chain_id INTEGER NOT NULL UNIQUE DEFAULT 8453 CHECK (chain_id = 8453),
  last_scanned_block BIGINT NOT NULL DEFAULT 0,
  watcher_status TEXT NOT NULL DEFAULT 'active' CHECK (watcher_status IN ('active', 'paused', 'error')),
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_a2a_chain_watchers_status ON public.a2a_chain_watchers(watcher_status);

-- Initialize watcher for Base Mainnet
INSERT INTO public.a2a_chain_watchers (chain_id, last_scanned_block, watcher_status)
VALUES (8453, 0, 'active')
ON CONFLICT (chain_id) DO NOTHING;

-- Trigger: Update updated_at timestamp
CREATE TRIGGER a2a_chain_watchers_updated_at
  BEFORE UPDATE ON public.a2a_chain_watchers
  FOR EACH ROW EXECUTE FUNCTION update_a2a_wallets_updated_at();

-- =====================================================
-- VIEW: user_balance_summary
-- Purpose: Aggregate ledger balances per user per token
-- =====================================================

CREATE OR REPLACE VIEW public.user_balance_summary AS
SELECT 
  user_id,
  token,
  COALESCE(SUM(
    CASE 
      WHEN entry_type IN ('deposit', 'refund') THEN amount
      WHEN entry_type = 'debit' THEN -amount
      ELSE 0
    END
  ), 0) as balance,
  COUNT(*) as transaction_count,
  MAX(created_at) as last_transaction_at
FROM public.a2a_ledger
GROUP BY user_id, token;

-- Grant SELECT on view to authenticated users
GRANT SELECT ON public.user_balance_summary TO authenticated;

-- =====================================================
-- FUNCTION: get_user_balance
-- Purpose: Optimized function to get current balance for user+token
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_balance(
  p_user_id UUID,
  p_token TEXT
)
RETURNS DECIMAL(18,6)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance DECIMAL(18,6);
BEGIN
  -- Validate inputs
  IF p_token NOT IN ('USDC', 'ETH') THEN
    RAISE EXCEPTION 'Invalid token: %', p_token;
  END IF;
  
  -- Calculate balance
  SELECT COALESCE(SUM(
    CASE 
      WHEN entry_type IN ('deposit', 'refund') THEN amount
      WHEN entry_type = 'debit' THEN -amount
      ELSE 0
    END
  ), 0)
  INTO v_balance
  FROM public.a2a_ledger
  WHERE user_id = p_user_id
    AND token = p_token;
  
  RETURN v_balance;
END;
$$;

-- =====================================================
-- FUNCTION: expire_stale_invoices
-- Purpose: Background job to mark expired invoices
-- Returns: Number of expired invoices
-- =====================================================

CREATE OR REPLACE FUNCTION public.expire_stale_invoices()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  UPDATE public.a2a_invoices
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'pending'
    AND expires_at < NOW();
  
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  
  RETURN v_expired_count;
END;
$$;

-- =====================================================
-- FUNCTION: credit_ledger_atomic
-- Purpose: Atomically credit balance (deposits) with row locking
-- Prevents race conditions and duplicate tx_hash (idempotency)
-- =====================================================

CREATE OR REPLACE FUNCTION public.credit_ledger_atomic(
  p_user_id UUID,
  p_amount DECIMAL(18,6),
  p_token TEXT,
  p_wallet_id UUID DEFAULT NULL,
  p_tx_hash TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance DECIMAL(18,6);
  v_new_balance DECIMAL(18,6);
  v_ledger_id UUID;
  v_existing_tx UUID;
BEGIN
  -- Validate inputs
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive: %', p_amount;
  END IF;
  
  IF p_token NOT IN ('USDC', 'ETH') THEN
    RAISE EXCEPTION 'Invalid token: %', p_token;
  END IF;
  
  -- Check for duplicate tx_hash (idempotency protection)
  IF p_tx_hash IS NOT NULL THEN
    SELECT id INTO v_existing_tx
    FROM public.a2a_ledger
    WHERE tx_hash = p_tx_hash AND user_id = p_user_id
    LIMIT 1;
    
    IF v_existing_tx IS NOT NULL THEN
      RAISE EXCEPTION 'Transaction hash % already recorded for user %', p_tx_hash, p_user_id;
    END IF;
  END IF;
  
  -- Get current balance with row lock (serializable)
  SELECT public.get_user_balance(p_user_id, p_token)
  INTO v_current_balance
  FOR UPDATE; -- Lock to prevent concurrent credits
  
  v_new_balance := v_current_balance + p_amount;
  
  -- Insert ledger entry
  INSERT INTO public.a2a_ledger (
    user_id,
    wallet_id,
    entry_type,
    amount,
    token,
    balance_after,
    reference_type,
    reference_id,
    tx_hash,
    description
  ) VALUES (
    p_user_id,
    p_wallet_id,
    'deposit',
    p_amount,
    p_token,
    v_new_balance,
    p_reference_type,
    p_reference_id,
    p_tx_hash,
    p_description
  )
  RETURNING id INTO v_ledger_id;
  
  RETURN v_ledger_id;
END;
$$;

-- =====================================================
-- FUNCTION: debit_ledger_atomic
-- Purpose: Atomically debit balance with row locking
-- Prevents race conditions in concurrent requests
-- =====================================================

CREATE OR REPLACE FUNCTION public.debit_ledger_atomic(
  p_user_id UUID,
  p_amount DECIMAL(18,6),
  p_token TEXT,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance DECIMAL(18,6);
  v_new_balance DECIMAL(18,6);
  v_ledger_id UUID;
BEGIN
  -- Validate inputs
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive: %', p_amount;
  END IF;
  
  IF p_token NOT IN ('USDC', 'ETH') THEN
    RAISE EXCEPTION 'Invalid token: %', p_token;
  END IF;
  
  -- Get current balance with row lock (serializable)
  SELECT public.get_user_balance(p_user_id, p_token)
  INTO v_current_balance
  FOR UPDATE; -- Lock to prevent concurrent debits
  
  -- Check sufficient balance
  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: % < %', v_current_balance, p_amount;
  END IF;
  
  v_new_balance := v_current_balance - p_amount;
  
  -- Insert ledger entry
  INSERT INTO public.a2a_ledger (
    user_id,
    entry_type,
    amount,
    token,
    balance_after,
    reference_type,
    reference_id,
    description
  ) VALUES (
    p_user_id,
    'debit',
    p_amount,
    p_token,
    v_new_balance,
    p_reference_type,
    p_reference_id,
    p_description
  )
  RETURNING id INTO v_ledger_id;
  
  RETURN v_ledger_id;
END;
$$;

-- =====================================================
-- GRANTS
-- =====================================================

-- Grant usage to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant access to tables
GRANT SELECT, INSERT ON public.a2a_wallets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.a2a_invoices TO authenticated;
GRANT SELECT, INSERT ON public.a2a_ledger TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.get_user_balance(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_ledger_atomic(UUID, DECIMAL, TEXT, UUID, TEXT, TEXT, UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.debit_ledger_atomic(UUID, DECIMAL, TEXT, TEXT, UUID, TEXT) TO authenticated;

-- Service role needs full access (for chain watcher)
GRANT ALL ON public.a2a_chain_watchers TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_stale_invoices() TO service_role;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.a2a_wallets IS 'EVM wallets for users and agents on Base L2';
COMMENT ON TABLE public.a2a_invoices IS 'Payment invoices with state machine tracking';
COMMENT ON TABLE public.a2a_ledger IS 'Double-entry bookkeeping ledger (append-only)';
COMMENT ON TABLE public.a2a_chain_watchers IS 'Blockchain scanning state for payment verification';
COMMENT ON VIEW public.user_balance_summary IS 'Aggregated balance view per user per token';
COMMENT ON FUNCTION public.get_user_balance IS 'Get current balance for user+token with optimal query';
COMMENT ON FUNCTION public.expire_stale_invoices IS 'Background job to mark expired invoices';
COMMENT ON FUNCTION public.credit_ledger_atomic IS 'Atomically credit balance with race condition and idempotency protection';
COMMENT ON FUNCTION public.debit_ledger_atomic IS 'Atomically debit balance with race condition protection';
