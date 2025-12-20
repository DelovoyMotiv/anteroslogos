-- Anóteros Lógos Enterprise Dashboard Schema
-- Migration 003: API Keys + Agent Keys + Billing + Usage Analytics
-- Production-ready schema with RLS, indexes, triggers

-- =====================================================
-- API KEYS TABLE
-- Stores hashed API keys for programmatic access
-- =====================================================
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL CHECK (length(name) >= 3 AND length(name) <= 100),
  key_hash TEXT NOT NULL UNIQUE, -- scrypt hash, never store plaintext
  key_prefix TEXT NOT NULL CHECK (length(key_prefix) = 11), -- 'sk_xxx_abc' for display
  
  -- Tool scoping (null = all tools)
  scoped_tools TEXT[] DEFAULT NULL,
  
  -- Rate limits (per minute/hour)
  rate_limit_per_minute INTEGER DEFAULT 10 NOT NULL CHECK (rate_limit_per_minute > 0),
  rate_limit_per_hour INTEGER DEFAULT 100 NOT NULL CHECK (rate_limit_per_hour > 0),
  
  -- Expiration
  expires_at TIMESTAMPTZ,
  
  -- Usage tracking
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0 NOT NULL CHECK (usage_count >= 0),
  
  -- Revocation
  revoked BOOLEAN DEFAULT FALSE NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT api_keys_revoked_check CHECK (
    (revoked = FALSE AND revoked_at IS NULL) OR
    (revoked = TRUE AND revoked_at IS NOT NULL)
  ),
  CONSTRAINT api_keys_expires_check CHECK (expires_at IS NULL OR expires_at > created_at)
);

-- Indexes
CREATE INDEX idx_api_keys_user_id ON public.api_keys(user_id) WHERE revoked = FALSE;
CREATE INDEX idx_api_keys_hash ON public.api_keys(key_hash) WHERE revoked = FALSE;
CREATE INDEX idx_api_keys_expires ON public.api_keys(expires_at) WHERE revoked = FALSE AND expires_at IS NOT NULL;
CREATE INDEX idx_api_keys_last_used ON public.api_keys(last_used_at DESC NULLS LAST);

-- =====================================================
-- AGENT KEYS TABLE
-- Stores Ed25519 public keys for AI agent authentication
-- =====================================================
CREATE TABLE IF NOT EXISTS public.agent_keys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL CHECK (length(name) >= 3 AND length(name) <= 100),
  
  -- AIP Protocol (Anóteros Identity Protocol)
  aip_uri TEXT NOT NULL UNIQUE CHECK (aip_uri LIKE 'aip://%'),
  
  -- Ed25519 Key (32 bytes = 44 chars base64)
  public_key TEXT NOT NULL CHECK (length(public_key) = 44),
  key_algorithm TEXT DEFAULT 'Ed25519' NOT NULL CHECK (key_algorithm = 'Ed25519'),
  
  -- Permissions (JSON array of strings)
  permissions JSONB DEFAULT '["mcp:execute"]'::jsonb NOT NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
  
  -- Revocation
  revoked BOOLEAN DEFAULT FALSE NOT NULL,
  revoked_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT agent_keys_revoked_check CHECK (
    (revoked = FALSE AND revoked_at IS NULL) OR
    (revoked = TRUE AND revoked_at IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_agent_keys_user_id ON public.agent_keys(user_id) WHERE revoked = FALSE;
CREATE INDEX idx_agent_keys_aip ON public.agent_keys(aip_uri) WHERE revoked = FALSE;
CREATE INDEX idx_agent_keys_public_key ON public.agent_keys(public_key) WHERE revoked = FALSE;

-- =====================================================
-- SUBSCRIPTIONS TABLE
-- Stripe subscription tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Stripe IDs
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  
  -- Plan details
  plan_id TEXT NOT NULL CHECK (plan_id IN ('free', 'pro', 'agency')),
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid')),
  
  -- Billing period
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  
  -- Cancellation
  cancel_at_period_end BOOLEAN DEFAULT FALSE NOT NULL,
  canceled_at TIMESTAMPTZ,
  
  -- Trial
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_period_end ON public.subscriptions(current_period_end) WHERE current_period_end IS NOT NULL;

-- =====================================================
-- USAGE EVENTS TABLE
-- Tracks all API/tool usage for analytics and billing
-- =====================================================
CREATE TABLE IF NOT EXISTS public.usage_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  
  -- Tool execution details
  tool_name TEXT NOT NULL,
  input_hash TEXT, -- SHA256 of normalized input
  ucpt_hash TEXT, -- SHA3-512 UCPT token hash (null if UCPT disabled)
  
  -- Status
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'rate_limited', 'unauthorized')),
  error_message TEXT,
  
  -- Performance
  duration_ms INTEGER CHECK (duration_ms >= 0),
  
  -- Cost tracking
  tokens_used INTEGER DEFAULT 0 NOT NULL CHECK (tokens_used >= 0),
  cost_usd DECIMAL(10,4) DEFAULT 0 NOT NULL CHECK (cost_usd >= 0),
  
  -- Metadata (arbitrary JSON for tool-specific data)
  metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
  
  -- Timestamp (immutable, no updated_at)
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for fast queries
CREATE INDEX idx_usage_user_time ON public.usage_events(user_id, timestamp DESC);
CREATE INDEX idx_usage_tool_time ON public.usage_events(tool_name, timestamp DESC);
CREATE INDEX idx_usage_api_key ON public.usage_events(api_key_id, timestamp DESC) WHERE api_key_id IS NOT NULL;
CREATE INDEX idx_usage_status_time ON public.usage_events(status, timestamp DESC);
CREATE INDEX idx_usage_ucpt ON public.usage_events(ucpt_hash) WHERE ucpt_hash IS NOT NULL;

-- Partitioning hint: Consider partitioning by timestamp (monthly) for high-volume production
-- ALTER TABLE usage_events PARTITION BY RANGE (timestamp);

-- =====================================================
-- AUDIT LOG TABLE
-- Security and compliance: tracks all sensitive actions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Action details
  action TEXT NOT NULL, -- 'api_key.created', 'subscription.upgraded', etc
  resource_type TEXT NOT NULL, -- 'api_key', 'agent_key', 'subscription', 'profile'
  resource_id UUID,
  
  -- Request context
  ip_address INET,
  user_agent TEXT,
  
  -- Additional context
  metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
  
  -- Timestamp (immutable)
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_audit_log_user_time ON public.audit_log(user_id, timestamp DESC);
CREATE INDEX idx_audit_log_action ON public.audit_log(action, timestamp DESC);
CREATE INDEX idx_audit_log_resource ON public.audit_log(resource_type, resource_id) WHERE resource_id IS NOT NULL;

-- =====================================================
-- UPDATE PROFILES TABLE
-- Add dashboard-specific columns
-- =====================================================
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS current_plan TEXT DEFAULT 'free' CHECK (current_plan IN ('free', 'pro', 'agency')),
  ADD COLUMN IF NOT EXISTS api_keys_count INTEGER DEFAULT 0 CHECK (api_keys_count >= 0),
  ADD COLUMN IF NOT EXISTS agent_keys_count INTEGER DEFAULT 0 CHECK (agent_keys_count >= 0),
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Update existing plan_type to current_plan if different schema
-- UPDATE public.profiles SET current_plan = CASE 
--   WHEN plan_type = 'premium' THEN 'pro'
--   WHEN plan_type = 'enterprise' THEN 'agency'
--   ELSE 'free'
-- END;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- API Keys policies
CREATE POLICY "Users can view own API keys"
  ON public.api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own API keys"
  ON public.api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys"
  ON public.api_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys"
  ON public.api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- Agent Keys policies
CREATE POLICY "Users can view own agent keys"
  ON public.agent_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own agent keys"
  ON public.agent_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agent keys"
  ON public.agent_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own agent keys"
  ON public.agent_keys FOR DELETE
  USING (auth.uid() = user_id);

-- Subscriptions policies (read-only for users, updated via webhook)
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Usage events policies (read-only for users, created by system)
CREATE POLICY "Users can view own usage events"
  ON public.usage_events FOR SELECT
  USING (auth.uid() = user_id);

-- Audit log policies (read-only for users)
CREATE POLICY "Users can view own audit log"
  ON public.audit_log FOR SELECT
  USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE TRIGGER update_api_keys_updated_at 
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_keys_updated_at 
  BEFORE UPDATE ON public.agent_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at 
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Increment/decrement counters in profiles
CREATE OR REPLACE FUNCTION increment_api_key_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET api_keys_count = api_keys_count + 1
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_api_key_count_trigger
  AFTER INSERT ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION increment_api_key_count();

CREATE OR REPLACE FUNCTION decrement_api_key_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET api_keys_count = GREATEST(0, api_keys_count - 1)
  WHERE id = OLD.user_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER decrement_api_key_count_trigger
  AFTER DELETE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION decrement_api_key_count();

CREATE OR REPLACE FUNCTION increment_agent_key_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET agent_keys_count = agent_keys_count + 1
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_agent_key_count_trigger
  AFTER INSERT ON public.agent_keys
  FOR EACH ROW EXECUTE FUNCTION increment_agent_key_count();

CREATE OR REPLACE FUNCTION decrement_agent_key_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET agent_keys_count = GREATEST(0, agent_keys_count - 1)
  WHERE id = OLD.user_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER decrement_agent_key_count_trigger
  AFTER DELETE ON public.agent_keys
  FOR EACH ROW EXECUTE FUNCTION decrement_agent_key_count();

-- Update profile plan when subscription changes
CREATE OR REPLACE FUNCTION sync_profile_plan_from_subscription()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET current_plan = NEW.plan_id,
      stripe_customer_id = NEW.stripe_customer_id,
      subscription_status = NEW.status
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_profile_plan_trigger
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION sync_profile_plan_from_subscription();

-- =====================================================
-- VIEWS
-- =====================================================

-- User usage summary (aggregated by day)
CREATE OR REPLACE VIEW public.user_usage_summary AS
SELECT
  user_id,
  DATE(timestamp) AS date,
  COUNT(*) AS total_calls,
  COUNT(*) FILTER (WHERE status = 'success') AS successful_calls,
  COUNT(*) FILTER (WHERE status = 'error') AS failed_calls,
  COUNT(*) FILTER (WHERE status = 'rate_limited') AS rate_limited_calls,
  SUM(tokens_used) AS total_tokens,
  SUM(cost_usd) AS total_cost,
  COUNT(DISTINCT tool_name) AS unique_tools_used,
  COUNT(*) FILTER (WHERE ucpt_hash IS NOT NULL) AS ucpt_verified_calls,
  AVG(duration_ms) AS avg_duration_ms
FROM public.usage_events
WHERE timestamp >= NOW() - INTERVAL '90 days'
GROUP BY user_id, DATE(timestamp);

-- API Key usage summary
CREATE OR REPLACE VIEW public.api_key_usage_summary AS
SELECT
  ak.id AS api_key_id,
  ak.user_id,
  ak.name AS api_key_name,
  ak.key_prefix,
  COUNT(ue.*) AS total_uses,
  MAX(ue.timestamp) AS last_used_at,
  COUNT(*) FILTER (WHERE ue.status = 'success') AS successful_uses,
  COUNT(*) FILTER (WHERE ue.status = 'error') AS failed_uses
FROM public.api_keys ak
LEFT JOIN public.usage_events ue ON ak.id = ue.api_key_id
WHERE ak.revoked = FALSE AND ue.timestamp >= NOW() - INTERVAL '30 days'
GROUP BY ak.id, ak.user_id, ak.name, ak.key_prefix;

-- =====================================================
-- PLAN LIMITS FUNCTION
-- Returns usage limits for a given plan
-- =====================================================
CREATE OR REPLACE FUNCTION get_plan_limits(plan_name TEXT)
RETURNS TABLE(
  calls_per_day INTEGER,
  calls_per_month INTEGER,
  max_api_keys INTEGER,
  max_agent_keys INTEGER,
  rate_limit_per_minute INTEGER,
  rate_limit_per_hour INTEGER,
  ucpt_enabled BOOLEAN,
  causal_tracer_enabled BOOLEAN,
  support_level TEXT
) AS $$
BEGIN
  RETURN QUERY SELECT
    CASE plan_name
      WHEN 'free' THEN 100
      WHEN 'pro' THEN NULL -- unlimited
      WHEN 'agency' THEN NULL -- unlimited
    END,
    CASE plan_name
      WHEN 'free' THEN 3000
      WHEN 'pro' THEN NULL
      WHEN 'agency' THEN NULL
    END,
    CASE plan_name
      WHEN 'free' THEN 1
      WHEN 'pro' THEN 5
      WHEN 'agency' THEN 20
    END,
    CASE plan_name
      WHEN 'free' THEN 0
      WHEN 'pro' THEN 10
      WHEN 'agency' THEN 50
    END,
    CASE plan_name
      WHEN 'free' THEN 10
      WHEN 'pro' THEN 60
      WHEN 'agency' THEN 300
    END,
    CASE plan_name
      WHEN 'free' THEN 100
      WHEN 'pro' THEN 1000
      WHEN 'agency' THEN 10000
    END,
    CASE plan_name
      WHEN 'free' THEN FALSE
      WHEN 'pro' THEN TRUE
      WHEN 'agency' THEN TRUE
    END,
    CASE plan_name
      WHEN 'free' THEN FALSE
      WHEN 'pro' THEN TRUE
      WHEN 'agency' THEN TRUE
    END,
    CASE plan_name
      WHEN 'free' THEN 'community'
      WHEN 'pro' THEN 'priority'
      WHEN 'agency' THEN 'dedicated'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.api_keys IS 'API keys for programmatic access to MCP/A2A tools';
COMMENT ON TABLE public.agent_keys IS 'Ed25519 public keys for AI agent authentication (AIP protocol - Anóteros Identity Protocol)';
COMMENT ON TABLE public.subscriptions IS 'Stripe subscription tracking with plan limits';
COMMENT ON TABLE public.usage_events IS 'Immutable log of all API/tool usage for analytics and billing';
COMMENT ON TABLE public.audit_log IS 'Security audit trail for compliance';

COMMENT ON COLUMN public.api_keys.key_hash IS 'scrypt hash (N=16384, r=8, p=1) of full API key';
COMMENT ON COLUMN public.api_keys.key_prefix IS 'First 11 chars of key for display: sk_xxx_abc...';
COMMENT ON COLUMN public.api_keys.scoped_tools IS 'NULL = all tools, else array of allowed tool names';

COMMENT ON COLUMN public.agent_keys.aip_uri IS 'AIP protocol URI: aip://domain/agent/name';
COMMENT ON COLUMN public.agent_keys.public_key IS 'Base64-encoded Ed25519 public key (32 bytes)';
COMMENT ON COLUMN public.agent_keys.permissions IS 'JSON array: ["mcp:execute", "a2a:query", "ucpt:verify"]';

COMMENT ON COLUMN public.usage_events.input_hash IS 'SHA256 of normalized input for deduplication';
COMMENT ON COLUMN public.usage_events.ucpt_hash IS 'SHA3-512 hash of UCPT token (null if not using UCPT)';
COMMENT ON COLUMN public.usage_events.tokens_used IS 'Approximate token count for LLM calls';
COMMENT ON COLUMN public.usage_events.cost_usd IS 'Estimated cost in USD for billing';

-- =====================================================
-- RATE LIMIT BUCKETS TABLE
-- For distributed rate limiting (Supabase-backed)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  window_start TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Index for cleanup
CREATE INDEX idx_rate_limit_expires ON public.rate_limit_buckets(expires_at);

-- RLS (service role only)
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON public.rate_limit_buckets FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE public.rate_limit_buckets IS 'Sliding window rate limiting buckets';
