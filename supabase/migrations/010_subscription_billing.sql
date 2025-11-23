-- =====================================================
-- Migration 010: USDC Subscription Billing
-- Standards: Base L2 (Chain ID 8453), USDC-only payments
-- Security: Row-Level Security (RLS) enabled on all tables
-- =====================================================

-- =====================================================
-- TABLE: subscription_plans
-- Purpose: Define available subscription tiers with pricing and quotas
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_name TEXT NOT NULL UNIQUE CHECK (plan_name IN ('free', 'starter', 'pro', 'enterprise')),
  display_name TEXT NOT NULL,
  price_usd DECIMAL(10,2) NOT NULL CHECK (price_usd >= 0),
  billing_cycle_days INTEGER NOT NULL DEFAULT 30 CHECK (billing_cycle_days > 0),
  audit_quota INTEGER NOT NULL CHECK (audit_quota > 0),
  description TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  is_default BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_subscription_plans_active ON public.subscription_plans(is_active) WHERE is_active = TRUE;

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscription_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_subscription_plans_updated_at();

-- Seed data: Insert default plans (freemium model)
INSERT INTO public.subscription_plans (plan_name, display_name, price_usd, billing_cycle_days, audit_quota, description, features, is_default)
VALUES 
  (
    'free',
    'Free',
    0.00,
    30,
    1,
    'Free tier with basic access - perfect for trying out the platform',
    '[
      "1 GEO audit per month",
      "Basic website analysis",
      "Community support",
      "7-day audit history"
    ]'::jsonb,
    TRUE
  ),
  (
    'starter',
    'Starter',
    19.00,
    30,
    10,
    'Ideal for freelancers and small projects',
    '[
      "10 GEO audits per month",
      "Full citation tracking",
      "Email support",
      "30-day audit history",
      "Export reports"
    ]'::jsonb,
    FALSE
  ),
  (
    'pro',
    'Pro',
    49.00,
    30,
    100,
    'For agencies and growing businesses',
    '[
      "100 GEO audits per month",
      "Advanced citation prediction",
      "Priority support",
      "90-day audit history",
      "Competitive intelligence",
      "API access",
      "Custom branding"
    ]'::jsonb,
    FALSE
  ),
  (
    'enterprise',
    'Enterprise',
    499.00,
    30,
    999999,
    'Unlimited audits for large organizations',
    '[
      "Unlimited GEO audits",
      "Real-time citation monitoring",
      "Dedicated support",
      "Unlimited audit history",
      "Knowledge graph extraction",
      "Custom integrations",
      "SLA guarantees",
      "White-label solution",
      "Dedicated account manager"
    ]'::jsonb,
    FALSE
  )
ON CONFLICT (plan_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  price_usd = EXCLUDED.price_usd,
  billing_cycle_days = EXCLUDED.billing_cycle_days,
  audit_quota = EXCLUDED.audit_quota,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  is_default = EXCLUDED.is_default,
  updated_at = NOW();

-- =====================================================
-- TABLE: user_subscriptions
-- Purpose: Track user subscription state and lifecycle
-- State Machine: pending_payment -> active -> cancelled/expired
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE RESTRICT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending_payment', 'active', 'cancelled', 'expired')),
  billing_wallet_address TEXT CHECK (billing_wallet_address IS NULL OR billing_wallet_address ~* '^0x[a-fA-F0-9]{40}$'),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE NOT NULL,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT active_requires_period_dates CHECK (
    (status = 'active' AND current_period_start IS NOT NULL AND current_period_end IS NOT NULL) OR
    (status != 'active')
  ),
  CONSTRAINT cancelled_requires_timestamp CHECK (
    (status = 'cancelled' AND cancelled_at IS NOT NULL) OR
    (status != 'cancelled')
  ),
  CONSTRAINT period_start_before_end CHECK (
    current_period_start IS NULL OR current_period_end IS NULL OR current_period_start < current_period_end
  ),
  -- Prevent multiple active subscriptions per user
  CONSTRAINT one_active_subscription_per_user UNIQUE (user_id) WHERE status = 'active'
);

-- Indexes
CREATE INDEX idx_user_subscriptions_user_status ON public.user_subscriptions(user_id, status);
CREATE INDEX idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_period_end ON public.user_subscriptions(current_period_end) 
  WHERE status = 'active';

-- RLS Policies
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions"
  ON public.user_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
  ON public.user_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger: Update updated_at timestamp
CREATE TRIGGER user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_subscription_plans_updated_at();

-- =====================================================
-- TABLE: subscription_invoices
-- Purpose: Track subscription billing invoices with payment lifecycle
-- Format: Invoice IDs use sub_inv_{ULID} to distinguish from APA invoices
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subscription_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id TEXT NOT NULL UNIQUE CHECK (invoice_id ~* '^sub_inv_[0-9A-HJKMNP-TV-Z]{26}$'),
  subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  token TEXT NOT NULL DEFAULT 'USDC' CHECK (token = 'USDC'),
  chain_id INTEGER NOT NULL DEFAULT 8453 CHECK (chain_id = 8453),
  recipient_address TEXT NOT NULL CHECK (recipient_address ~* '^0x[a-fA-F0-9]{40}$'),
  memo_hash TEXT NOT NULL CHECK (memo_hash ~* '^0x[a-fA-F0-9]{64}$'),
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'expired')),
  tx_hash TEXT UNIQUE CHECK (tx_hash IS NULL OR tx_hash ~* '^0x[a-fA-F0-9]{64}$'),
  block_number BIGINT,
  confirmations INTEGER DEFAULT 0 CHECK (confirmations >= 0),
  billing_period_start TIMESTAMPTZ NOT NULL,
  billing_period_end TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_billing_period CHECK (billing_period_start < billing_period_end),
  CONSTRAINT paid_requires_tx_hash CHECK (
    (status = 'paid' AND tx_hash IS NOT NULL AND paid_at IS NOT NULL) OR
    (status != 'paid')
  )
);

-- Indexes
CREATE INDEX idx_subscription_invoices_status_expires ON public.subscription_invoices(status, expires_at);
CREATE INDEX idx_subscription_invoices_subscription ON public.subscription_invoices(subscription_id, created_at DESC);
CREATE INDEX idx_subscription_invoices_user ON public.subscription_invoices(user_id, created_at DESC);
CREATE INDEX idx_subscription_invoices_tx_hash ON public.subscription_invoices(tx_hash) WHERE tx_hash IS NOT NULL;
CREATE INDEX idx_subscription_invoices_period ON public.subscription_invoices(subscription_id, billing_period_start, billing_period_end);

-- RLS Policies
ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription invoices"
  ON public.subscription_invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription invoices"
  ON public.subscription_invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription invoices"
  ON public.subscription_invoices FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger: Update updated_at timestamp
CREATE TRIGGER subscription_invoices_updated_at
  BEFORE UPDATE ON public.subscription_invoices
  FOR EACH ROW EXECUTE FUNCTION update_subscription_plans_updated_at();

-- =====================================================
-- TABLE: subscription_usage_logs
-- Purpose: Append-only audit trail of subscription quota consumption
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subscription_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  audit_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN ('audit_completed', 'audit_failed')),
  resource_type TEXT NOT NULL DEFAULT 'geo_audit' CHECK (resource_type = 'geo_audit'),
  cost_units INTEGER NOT NULL DEFAULT 1 CHECK (cost_units > 0),
  quota_remaining INTEGER NOT NULL CHECK (quota_remaining >= 0),
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_subscription_usage_subscription ON public.subscription_usage_logs(subscription_id, timestamp DESC);
CREATE INDEX idx_subscription_usage_user ON public.subscription_usage_logs(user_id, timestamp DESC);
CREATE INDEX idx_subscription_usage_audit ON public.subscription_usage_logs(audit_id) WHERE audit_id IS NOT NULL;

-- RLS Policies
ALTER TABLE public.subscription_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage logs"
  ON public.subscription_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage logs"
  ON public.subscription_usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE/DELETE policies (append-only log)

-- =====================================================
-- FUNCTION: get_active_subscription
-- Purpose: Fetch active subscription with plan details and usage statistics
-- Returns: JSON object with subscription, plan, and usage data
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_active_subscription(p_user_id UUID)
RETURNS TABLE(
  subscription_id UUID,
  plan_id UUID,
  plan_name TEXT,
  display_name TEXT,
  price_usd DECIMAL,
  audit_quota INTEGER,
  status TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN,
  usage_count BIGINT,
  quota_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id AS subscription_id,
    s.plan_id,
    p.plan_name,
    p.display_name,
    p.price_usd,
    p.audit_quota,
    s.status,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    COALESCE(COUNT(ul.id) FILTER (WHERE ul.timestamp >= s.current_period_start), 0) AS usage_count,
    GREATEST(0, p.audit_quota - COALESCE(COUNT(ul.id) FILTER (WHERE ul.timestamp >= s.current_period_start), 0)::INTEGER) AS quota_remaining
  FROM public.user_subscriptions s
  INNER JOIN public.subscription_plans p ON s.plan_id = p.id
  LEFT JOIN public.subscription_usage_logs ul ON s.id = ul.subscription_id
  WHERE s.user_id = p_user_id
    AND s.status = 'active'
  GROUP BY s.id, p.id
  LIMIT 1;
END;
$$;

-- =====================================================
-- FUNCTION: check_subscription_quota
-- Purpose: Validate if user has available quota for requested units
-- Returns: JSON with available (boolean) and remaining (integer)
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_subscription_quota(
  p_user_id UUID,
  p_required_units INTEGER DEFAULT 1
)
RETURNS TABLE(
  available BOOLEAN,
  remaining INTEGER,
  subscription_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription_id UUID;
  v_quota INTEGER;
  v_used BIGINT;
  v_remaining INTEGER;
  v_current_period_start TIMESTAMPTZ;
BEGIN
  -- Validate inputs
  IF p_required_units <= 0 THEN
    RAISE EXCEPTION 'Required units must be positive: %', p_required_units;
  END IF;
  
  -- Get active subscription
  SELECT s.id, p.audit_quota, s.current_period_start
  INTO v_subscription_id, v_quota, v_current_period_start
  FROM public.user_subscriptions s
  INNER JOIN public.subscription_plans p ON s.plan_id = p.id
  WHERE s.user_id = p_user_id
    AND s.status = 'active'
  LIMIT 1;
  
  -- No active subscription
  IF v_subscription_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, NULL::UUID;
    RETURN;
  END IF;
  
  -- Count usage in current period
  SELECT COALESCE(COUNT(*), 0)
  INTO v_used
  FROM public.subscription_usage_logs
  WHERE subscription_id = v_subscription_id
    AND timestamp >= v_current_period_start;
  
  v_remaining := GREATEST(0, v_quota - v_used::INTEGER);
  
  -- Check if quota available
  IF v_remaining >= p_required_units THEN
    RETURN QUERY SELECT TRUE, v_remaining, v_subscription_id;
  ELSE
    RETURN QUERY SELECT FALSE, v_remaining, v_subscription_id;
  END IF;
END;
$$;

-- =====================================================
-- FUNCTION: consume_subscription_quota
-- Purpose: Atomically decrement quota and record usage log entry
-- Returns: New quota_remaining value
-- =====================================================

CREATE OR REPLACE FUNCTION public.consume_subscription_quota(
  p_subscription_id UUID,
  p_units INTEGER DEFAULT 1,
  p_audit_id UUID DEFAULT NULL,
  p_event_type TEXT DEFAULT 'audit_completed',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_quota INTEGER;
  v_used BIGINT;
  v_remaining INTEGER;
  v_current_period_start TIMESTAMPTZ;
BEGIN
  -- Validate inputs
  IF p_units <= 0 THEN
    RAISE EXCEPTION 'Units must be positive: %', p_units;
  END IF;
  
  IF p_event_type NOT IN ('audit_completed', 'audit_failed') THEN
    RAISE EXCEPTION 'Invalid event type: %', p_event_type;
  END IF;
  
  -- Get subscription details with row lock
  SELECT s.user_id, p.audit_quota, s.current_period_start
  INTO v_user_id, v_quota, v_current_period_start
  FROM public.user_subscriptions s
  INNER JOIN public.subscription_plans p ON s.plan_id = p.id
  WHERE s.id = p_subscription_id
    AND s.status = 'active'
  FOR UPDATE OF s;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active subscription not found: %', p_subscription_id;
  END IF;
  
  -- Count current usage
  SELECT COALESCE(COUNT(*), 0)
  INTO v_used
  FROM public.subscription_usage_logs
  WHERE subscription_id = p_subscription_id
    AND timestamp >= v_current_period_start;
  
  v_remaining := GREATEST(0, v_quota - v_used::INTEGER - p_units);
  
  -- Check quota not exceeded
  IF v_remaining < 0 THEN
    RAISE EXCEPTION 'Quota exceeded: % units required, % remaining', p_units, GREATEST(0, v_quota - v_used::INTEGER);
  END IF;
  
  -- Insert usage log entry
  INSERT INTO public.subscription_usage_logs (
    subscription_id,
    user_id,
    audit_id,
    event_type,
    cost_units,
    quota_remaining,
    metadata
  ) VALUES (
    p_subscription_id,
    v_user_id,
    p_audit_id,
    p_event_type,
    p_units,
    v_remaining,
    p_metadata
  );
  
  RETURN v_remaining;
END;
$$;

-- =====================================================
-- FUNCTION: generate_renewal_invoice
-- Purpose: Create next billing cycle invoice and extend subscription period
-- Returns: New invoice ID
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_renewal_invoice(p_subscription_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id TEXT;
  v_user_id UUID;
  v_plan_id UUID;
  v_price DECIMAL(10,2);
  v_billing_cycle_days INTEGER;
  v_current_period_end TIMESTAMPTZ;
  v_new_period_start TIMESTAMPTZ;
  v_new_period_end TIMESTAMPTZ;
  v_expires_at TIMESTAMPTZ;
  v_recipient_address TEXT;
  v_memo_hash TEXT;
  v_existing_invoice TEXT;
BEGIN
  -- Get subscription details
  SELECT s.user_id, s.plan_id, s.current_period_end, p.price_usd, p.billing_cycle_days
  INTO v_user_id, v_plan_id, v_current_period_end, v_price, v_billing_cycle_days
  FROM public.user_subscriptions s
  INNER JOIN public.subscription_plans p ON s.plan_id = p.id
  WHERE s.id = p_subscription_id
    AND s.status = 'active';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active subscription not found: %', p_subscription_id;
  END IF;
  
  -- Calculate new billing period
  v_new_period_start := v_current_period_end;
  v_new_period_end := v_new_period_start + (v_billing_cycle_days || ' days')::INTERVAL;
  
  -- Check for existing invoice for this period
  SELECT invoice_id INTO v_existing_invoice
  FROM public.subscription_invoices
  WHERE subscription_id = p_subscription_id
    AND billing_period_start = v_new_period_start
    AND billing_period_end = v_new_period_end
  LIMIT 1;
  
  IF v_existing_invoice IS NOT NULL THEN
    RETURN v_existing_invoice;
  END IF;
  
  -- Generate invoice ID (format: sub_inv_{ULID})
  -- Note: ULID generation requires extension or application-level generation
  -- For now, use UUID-based approach (application will generate proper ULID)
  v_invoice_id := 'sub_inv_' || REPLACE(gen_random_uuid()::TEXT, '-', '');
  
  -- Get platform wallet address from environment
  -- Note: This should be set via application, using placeholder for schema
  v_recipient_address := COALESCE(current_setting('app.platform_wallet_address', TRUE), '0x0000000000000000000000000000000000000000');
  
  -- Generate memo hash (keccak256 of invoice_id - computed application-side)
  v_memo_hash := '0x' || md5(v_invoice_id)::TEXT || md5(v_invoice_id || 'salt')::TEXT;
  
  -- Set expiration (7 days before period start)
  v_expires_at := v_new_period_start - INTERVAL '1 day';
  
  -- Insert invoice
  INSERT INTO public.subscription_invoices (
    invoice_id,
    subscription_id,
    user_id,
    amount,
    token,
    chain_id,
    recipient_address,
    memo_hash,
    status,
    billing_period_start,
    billing_period_end,
    expires_at
  ) VALUES (
    v_invoice_id,
    p_subscription_id,
    v_user_id,
    v_price,
    'USDC',
    8453,
    v_recipient_address,
    v_memo_hash,
    'pending',
    v_new_period_start,
    v_new_period_end,
    v_expires_at
  );
  
  RETURN v_invoice_id;
END;
$$;

-- =====================================================
-- VIEW: subscription_status_summary
-- Purpose: Consolidated view of subscription status for dashboard
-- =====================================================

CREATE OR REPLACE VIEW public.subscription_status_summary AS
SELECT 
  s.id AS subscription_id,
  s.user_id,
  p.plan_name,
  p.display_name AS plan_display_name,
  p.price_usd,
  p.audit_quota,
  s.status,
  s.current_period_start,
  s.current_period_end,
  s.cancel_at_period_end,
  COALESCE(COUNT(ul.id) FILTER (WHERE ul.timestamp >= s.current_period_start), 0) AS usage_count,
  GREATEST(0, p.audit_quota - COALESCE(COUNT(ul.id) FILTER (WHERE ul.timestamp >= s.current_period_start), 0)::INTEGER) AS quota_remaining,
  (
    SELECT COUNT(*) 
    FROM public.subscription_invoices si 
    WHERE si.subscription_id = s.id AND si.status = 'pending'
  ) AS pending_invoices,
  s.created_at,
  s.updated_at
FROM public.user_subscriptions s
INNER JOIN public.subscription_plans p ON s.plan_id = p.id
LEFT JOIN public.subscription_usage_logs ul ON s.id = ul.subscription_id
GROUP BY s.id, p.id;

-- Grant SELECT on view to authenticated users
GRANT SELECT ON public.subscription_status_summary TO authenticated;

-- =====================================================
-- Comments for documentation
-- =====================================================

COMMENT ON TABLE public.subscription_plans IS 'Subscription tier definitions with pricing and quota limits';
COMMENT ON TABLE public.user_subscriptions IS 'User subscription state tracking with lifecycle management';
COMMENT ON TABLE public.subscription_invoices IS 'Subscription billing invoices with USDC payment tracking on Base L2';
COMMENT ON TABLE public.subscription_usage_logs IS 'Append-only audit trail of quota consumption';
COMMENT ON FUNCTION public.get_active_subscription IS 'Fetch active subscription with plan details and usage statistics';
COMMENT ON FUNCTION public.check_subscription_quota IS 'Validate quota availability for requested units';
COMMENT ON FUNCTION public.consume_subscription_quota IS 'Atomically consume quota and record usage';
COMMENT ON FUNCTION public.generate_renewal_invoice IS 'Create renewal invoice for next billing cycle';
