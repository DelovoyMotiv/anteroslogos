-- ============================================
-- Migration 15: 014_security_hardening.sql
-- ============================================

-- Migration 014: Pre-Launch Security Hardening
-- Priority 1: Free Tier Abuse Prevention + Priority 2: RLS Policies
-- Created: 2025-11-23

-- ============================================================================
-- PRIORITY 1A: SIGNUP RATE LIMITING
-- ============================================================================

-- Track signup attempts per IP address
CREATE TABLE IF NOT EXISTS public.signup_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  email TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_signup_rate_limits_ip_time ON public.signup_rate_limits(ip_address, created_at DESC);
CREATE INDEX idx_signup_rate_limits_email ON public.signup_rate_limits(email);

COMMENT ON TABLE public.signup_rate_limits IS 'Track signup attempts for rate limiting (max 3 signups per IP per month)';

-- Function to check signup rate limit
CREATE OR REPLACE FUNCTION public.check_signup_rate_limit(
  p_ip_address TEXT
) RETURNS JSONB AS $$
DECLARE
  v_signup_count INTEGER;
  v_oldest_signup TIMESTAMPTZ;
  v_remaining INTEGER;
BEGIN
  -- Count signups from this IP in last 30 days
  SELECT COUNT(*), MIN(created_at)
  INTO v_signup_count, v_oldest_signup
  FROM public.signup_rate_limits
  WHERE ip_address = p_ip_address
    AND created_at > NOW() - INTERVAL '30 days';

  v_remaining := GREATEST(0, 3 - v_signup_count);

  RETURN jsonb_build_object(
    'allowed', v_signup_count < 3,
    'count', v_signup_count,
    'limit', 3,
    'remaining', v_remaining,
    'reset_at', CASE 
      WHEN v_signup_count >= 3 THEN v_oldest_signup + INTERVAL '30 days'
      ELSE NULL
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record signup attempt
CREATE OR REPLACE FUNCTION public.record_signup_attempt(
  p_ip_address TEXT,
  p_email TEXT,
  p_user_agent TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.signup_rate_limits (ip_address, email, user_agent)
  VALUES (p_ip_address, p_email, p_user_agent);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PRIORITY 1D: DEVICE FINGERPRINTING
-- ============================================================================

-- Track device fingerprints to detect multi-account abuse
CREATE TABLE IF NOT EXISTS public.device_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  fingerprint TEXT NOT NULL,
  visitor_id TEXT, -- FingerprintJS visitor ID
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  ip_address TEXT,
  user_agent TEXT,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usage_count INTEGER DEFAULT 1
);

CREATE INDEX idx_device_fingerprints_user ON public.device_fingerprints(user_id);
CREATE INDEX idx_device_fingerprints_fp ON public.device_fingerprints(fingerprint);
CREATE INDEX idx_device_fingerprints_visitor ON public.device_fingerprints(visitor_id) WHERE visitor_id IS NOT NULL;

COMMENT ON TABLE public.device_fingerprints IS 'Track device fingerprints to detect suspicious multi-account patterns';

-- Function to check for suspicious fingerprint patterns
CREATE OR REPLACE FUNCTION public.check_fingerprint_abuse(
  p_fingerprint TEXT
) RETURNS JSONB AS $$
DECLARE
  v_user_count INTEGER;
  v_users UUID[];
  v_is_suspicious BOOLEAN;
BEGIN
  -- Count distinct users with this fingerprint
  SELECT COUNT(DISTINCT user_id), ARRAY_AGG(DISTINCT user_id)
  INTO v_user_count, v_users
  FROM public.device_fingerprints
  WHERE fingerprint = p_fingerprint;

  -- Flag as suspicious if 3+ users share same fingerprint
  v_is_suspicious := v_user_count >= 3;

  RETURN jsonb_build_object(
    'suspicious', v_is_suspicious,
    'user_count', v_user_count,
    'threshold', 3,
    'reason', CASE 
      WHEN v_is_suspicious THEN 'Multiple accounts detected from same device'
      ELSE NULL
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record device fingerprint
CREATE OR REPLACE FUNCTION public.record_device_fingerprint(
  p_user_id UUID,
  p_fingerprint TEXT,
  p_visitor_id TEXT DEFAULT NULL,
  p_confidence_score DECIMAL DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_existing_id UUID;
BEGIN
  -- Check if this user + fingerprint combo exists
  SELECT id INTO v_existing_id
  FROM public.device_fingerprints
  WHERE user_id = p_user_id AND fingerprint = p_fingerprint;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing record
    UPDATE public.device_fingerprints
    SET 
      last_seen = NOW(),
      usage_count = usage_count + 1,
      visitor_id = COALESCE(p_visitor_id, visitor_id),
      confidence_score = COALESCE(p_confidence_score, confidence_score),
      ip_address = COALESCE(p_ip_address, ip_address),
      user_agent = COALESCE(p_user_agent, user_agent)
    WHERE id = v_existing_id;
    
    RETURN v_existing_id;
  ELSE
    -- Insert new record
    INSERT INTO public.device_fingerprints (
      user_id, fingerprint, visitor_id, confidence_score, ip_address, user_agent
    ) VALUES (
      p_user_id, p_fingerprint, p_visitor_id, p_confidence_score, p_ip_address, p_user_agent
    )
    RETURNING id INTO v_existing_id;
    
    RETURN v_existing_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PRIORITY 1C: AUDIT COOLDOWN TRACKING
-- ============================================================================

-- Add audit cooldown tracking to existing tables
-- Note: This assumes audit history is stored in a table like 'audits' or 'audit_results'
-- Adjust table name based on actual schema

-- Function to check audit cooldown (free tier only)
CREATE OR REPLACE FUNCTION public.check_audit_cooldown(
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_last_audit_time TIMESTAMPTZ;
  v_cooldown_hours INTEGER := 24;
  v_next_available TIMESTAMPTZ;
  v_is_allowed BOOLEAN;
  v_wait_seconds INTEGER;
BEGIN
  -- Get last audit timestamp for this user from audits table
  -- Note: audits.user_id references profiles.id which references auth.users.id
  SELECT MAX(timestamp) INTO v_last_audit_time
  FROM public.audits
  WHERE user_id = p_user_id
    AND deleted_at IS NULL;

  IF v_last_audit_time IS NULL THEN
    -- No previous audits, allow immediately
    RETURN jsonb_build_object(
      'allowed', TRUE,
      'last_audit_at', NULL,
      'next_available_at', NULL,
      'wait_seconds', 0
    );
  END IF;

  v_next_available := v_last_audit_time + (v_cooldown_hours || ' hours')::INTERVAL;
  v_is_allowed := NOW() >= v_next_available;
  v_wait_seconds := GREATEST(0, EXTRACT(EPOCH FROM (v_next_available - NOW()))::INTEGER);

  RETURN jsonb_build_object(
    'allowed', v_is_allowed,
    'last_audit_at', v_last_audit_time,
    'next_available_at', v_next_available,
    'wait_seconds', v_wait_seconds,
    'cooldown_hours', v_cooldown_hours
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PRIORITY 2: ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on subscription tables (if not already enabled)
ALTER TABLE IF EXISTS public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscription_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscription_usage_logs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on A2A tables
ALTER TABLE IF EXISTS public.a2a_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.a2a_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.a2a_agent_reputation ENABLE ROW LEVEL SECURITY;

-- Enable RLS on new security tables
ALTER TABLE public.signup_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_fingerprints ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: user_subscriptions
-- ============================================================================

DROP POLICY IF EXISTS "Users view own subscription" ON public.user_subscriptions;
CREATE POLICY "Users view own subscription"
ON public.user_subscriptions FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own subscription" ON public.user_subscriptions;
CREATE POLICY "Users update own subscription"
ON public.user_subscriptions FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access subscriptions" ON public.user_subscriptions;
CREATE POLICY "Service role full access subscriptions"
ON public.user_subscriptions FOR ALL
USING (auth.role() = 'service_role');

-- ============================================================================
-- RLS POLICIES: subscription_invoices
-- ============================================================================

DROP POLICY IF EXISTS "Users view own invoices" ON public.subscription_invoices;
CREATE POLICY "Users view own invoices"
ON public.subscription_invoices FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access invoices" ON public.subscription_invoices;
CREATE POLICY "Service role full access invoices"
ON public.subscription_invoices FOR ALL
USING (auth.role() = 'service_role');

-- ============================================================================
-- RLS POLICIES: subscription_usage_logs
-- ============================================================================

DROP POLICY IF EXISTS "Users view own usage logs" ON public.subscription_usage_logs;
CREATE POLICY "Users view own usage logs"
ON public.subscription_usage_logs FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access usage logs" ON public.subscription_usage_logs;
CREATE POLICY "Service role full access usage logs"
ON public.subscription_usage_logs FOR ALL
USING (auth.role() = 'service_role');

-- ============================================================================
-- RLS POLICIES: a2a_tasks
-- ============================================================================

DROP POLICY IF EXISTS "Users view own tasks" ON public.a2a_tasks;
CREATE POLICY "Users view own tasks"
ON public.a2a_tasks FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own tasks" ON public.a2a_tasks;
CREATE POLICY "Users insert own tasks"
ON public.a2a_tasks FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own tasks" ON public.a2a_tasks;
CREATE POLICY "Users update own tasks"
ON public.a2a_tasks FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access tasks" ON public.a2a_tasks;
CREATE POLICY "Service role full access tasks"
ON public.a2a_tasks FOR ALL
USING (auth.role() = 'service_role');

-- ============================================================================
-- RLS POLICIES: a2a_sessions
-- ============================================================================

DROP POLICY IF EXISTS "Users view own sessions" ON public.a2a_sessions;
CREATE POLICY "Users view own sessions"
ON public.a2a_sessions FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own sessions" ON public.a2a_sessions;
CREATE POLICY "Users insert own sessions"
ON public.a2a_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own sessions" ON public.a2a_sessions;
CREATE POLICY "Users update own sessions"
ON public.a2a_sessions FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access sessions" ON public.a2a_sessions;
CREATE POLICY "Service role full access sessions"
ON public.a2a_sessions FOR ALL
USING (auth.role() = 'service_role');

-- ============================================================================
-- RLS POLICIES: a2a_agent_reputation
-- ============================================================================

-- Agent reputation is public read, service role only write
DROP POLICY IF EXISTS "Public read agent reputation" ON public.a2a_agent_reputation;
CREATE POLICY "Public read agent reputation"
ON public.a2a_agent_reputation FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "Service role full access reputation" ON public.a2a_agent_reputation;
CREATE POLICY "Service role full access reputation"
ON public.a2a_agent_reputation FOR ALL
USING (auth.role() = 'service_role');

-- ============================================================================
-- RLS POLICIES: signup_rate_limits
-- ============================================================================

-- Only service role can access signup rate limits
DROP POLICY IF EXISTS "Service role full access rate limits" ON public.signup_rate_limits;
CREATE POLICY "Service role full access rate limits"
ON public.signup_rate_limits FOR ALL
USING (auth.role() = 'service_role');

-- ============================================================================
-- RLS POLICIES: device_fingerprints
-- ============================================================================

DROP POLICY IF EXISTS "Users view own fingerprints" ON public.device_fingerprints;
CREATE POLICY "Users view own fingerprints"
ON public.device_fingerprints FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access fingerprints" ON public.device_fingerprints;
CREATE POLICY "Service role full access fingerprints"
ON public.device_fingerprints FOR ALL
USING (auth.role() = 'service_role');

-- ============================================================================
-- CLEANUP: OLD DATA (30 days retention for rate limits)
-- ============================================================================

-- Function to cleanup old signup rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_old_signup_records()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.signup_rate_limits
  WHERE created_at < NOW() - INTERVAL '31 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_old_signup_records IS 'Delete signup records older than 31 days (should be called by CRON daily)';

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.check_signup_rate_limit TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.record_signup_attempt TO service_role;
GRANT EXECUTE ON FUNCTION public.check_fingerprint_abuse TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_device_fingerprint TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_audit_cooldown TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_signup_records TO service_role;

-- Migration complete


-- Migration complete: 014_security_hardening.sql


