-- ============================================
-- Migration 19: 018_abuse_prevention_rpc.sql
-- ============================================

-- =====================================================
-- Migration 018: Abuse Prevention RPC Functions
-- Purpose: Complete server-side abuse prevention functions
-- Required by: lib/auth/abusePrevention.ts
-- =====================================================

-- =====================================================
-- TABLE: signup_rate_limits
-- Purpose: Track signup attempts by IP address (3 per month max)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.signup_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL,
  email TEXT NOT NULL,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_signup_rate_ip_time ON public.signup_rate_limits(ip_address, timestamp DESC);
CREATE INDEX idx_signup_rate_email ON public.signup_rate_limits(email);

-- RLS (service role only for writes, users can't access)
ALTER TABLE public.signup_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.signup_rate_limits
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- TABLE: device_fingerprints
-- Purpose: Track device fingerprints to detect abuse (multiple accounts per device)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.device_fingerprints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  fingerprint TEXT NOT NULL CHECK (length(fingerprint) >= 16),
  visitor_id TEXT CHECK (length(visitor_id) >= 16),
  confidence_score DECIMAL(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Prevent duplicate fingerprints per user
  CONSTRAINT unique_user_fingerprint UNIQUE (user_id, fingerprint)
);

-- Indexes
CREATE INDEX idx_device_fingerprints_user ON public.device_fingerprints(user_id);
CREATE INDEX idx_device_fingerprints_hash ON public.device_fingerprints(fingerprint);
CREATE INDEX idx_device_fingerprints_visitor ON public.device_fingerprints(visitor_id) WHERE visitor_id IS NOT NULL;

-- RLS
ALTER TABLE public.device_fingerprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fingerprints" ON public.device_fingerprints
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access fingerprints" ON public.device_fingerprints
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- FUNCTION: check_signup_rate_limit
-- Purpose: Check if IP address can create new account (3/month limit)
-- Returns: JSON with allowed, count, limit, remaining, reset_at
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_signup_rate_limit(p_ip_address TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_limit INTEGER := 3;
  v_window_days INTEGER := 30;
  v_cutoff_time TIMESTAMPTZ;
  v_oldest_timestamp TIMESTAMPTZ;
  v_reset_at TIMESTAMPTZ;
BEGIN
  -- Calculate cutoff time (30 days ago)
  v_cutoff_time := NOW() - (v_window_days || ' days')::INTERVAL;
  
  -- Count signups from this IP in last 30 days
  SELECT COUNT(*), MIN(timestamp)
  INTO v_count, v_oldest_timestamp
  FROM public.signup_rate_limits
  WHERE ip_address = p_ip_address::INET
    AND timestamp >= v_cutoff_time;
  
  -- Calculate reset time (30 days after oldest signup)
  IF v_oldest_timestamp IS NOT NULL THEN
    v_reset_at := v_oldest_timestamp + (v_window_days || ' days')::INTERVAL;
  ELSE
    v_reset_at := NULL;
  END IF;
  
  -- Return result
  RETURN json_build_object(
    'allowed', v_count < v_limit,
    'count', v_count,
    'limit', v_limit,
    'remaining', GREATEST(0, v_limit - v_count),
    'reset_at', v_reset_at
  );
END;
$$;

COMMENT ON FUNCTION public.check_signup_rate_limit IS 'Check if IP can create account (3/month limit)';

-- =====================================================
-- FUNCTION: record_signup_attempt
-- Purpose: Record successful signup for rate limiting
-- =====================================================

CREATE OR REPLACE FUNCTION public.record_signup_attempt(
  p_ip_address TEXT,
  p_email TEXT,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.signup_rate_limits (ip_address, email, user_agent)
  VALUES (p_ip_address::INET, p_email, p_user_agent);
END;
$$;

COMMENT ON FUNCTION public.record_signup_attempt IS 'Record signup attempt for rate limiting';

-- =====================================================
-- FUNCTION: check_audit_cooldown
-- Purpose: Check if user can perform audit (24h cooldown for free tier)
-- Returns: JSON with allowed, last_audit_at, next_available_at, wait_seconds
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_audit_cooldown(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_audit_at TIMESTAMPTZ;
  v_cooldown_hours INTEGER := 24;
  v_next_available_at TIMESTAMPTZ;
  v_wait_seconds INTEGER;
  v_plan_name TEXT;
  v_allowed BOOLEAN;
BEGIN
  -- Get user's plan
  SELECT p.plan_name INTO v_plan_name
  FROM public.user_subscriptions s
  INNER JOIN public.subscription_plans p ON s.plan_id = p.id
  WHERE s.user_id = p_user_id
    AND s.status = 'active'
  LIMIT 1;
  
  -- Only free tier has cooldown
  IF v_plan_name IS NULL OR v_plan_name != 'free' THEN
    RETURN json_build_object(
      'allowed', TRUE,
      'last_audit_at', NULL,
      'next_available_at', NULL,
      'wait_seconds', 0,
      'cooldown_hours', NULL
    );
  END IF;
  
  -- Get last audit timestamp
  SELECT MAX(timestamp) INTO v_last_audit_at
  FROM public.audits
  WHERE user_id = p_user_id
    AND deleted_at IS NULL;
  
  -- No audits yet
  IF v_last_audit_at IS NULL THEN
    RETURN json_build_object(
      'allowed', TRUE,
      'last_audit_at', NULL,
      'next_available_at', NULL,
      'wait_seconds', 0,
      'cooldown_hours', v_cooldown_hours
    );
  END IF;
  
  -- Calculate next available time
  v_next_available_at := v_last_audit_at + (v_cooldown_hours || ' hours')::INTERVAL;
  v_wait_seconds := GREATEST(0, EXTRACT(EPOCH FROM (v_next_available_at - NOW()))::INTEGER);
  v_allowed := v_wait_seconds = 0;
  
  RETURN json_build_object(
    'allowed', v_allowed,
    'last_audit_at', v_last_audit_at,
    'next_available_at', v_next_available_at,
    'wait_seconds', v_wait_seconds,
    'cooldown_hours', v_cooldown_hours
  );
END;
$$;

COMMENT ON FUNCTION public.check_audit_cooldown IS 'Check 24h audit cooldown for free tier';

-- =====================================================
-- FUNCTION: check_fingerprint_abuse
-- Purpose: Detect if device fingerprint is associated with suspicious activity
-- Returns: JSON with suspicious, user_count, threshold, reason
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_fingerprint_abuse(p_fingerprint TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_count INTEGER;
  v_threshold INTEGER := 3;
  v_suspicious BOOLEAN;
  v_reason TEXT;
BEGIN
  -- Count unique users with this fingerprint
  SELECT COUNT(DISTINCT user_id) INTO v_user_count
  FROM public.device_fingerprints
  WHERE fingerprint = p_fingerprint;
  
  v_suspicious := v_user_count >= v_threshold;
  
  IF v_suspicious THEN
    v_reason := format('Device fingerprint shared by %s users (threshold: %s)', v_user_count, v_threshold);
  ELSE
    v_reason := NULL;
  END IF;
  
  RETURN json_build_object(
    'suspicious', v_suspicious,
    'user_count', v_user_count,
    'threshold', v_threshold,
    'reason', v_reason
  );
END;
$$;

COMMENT ON FUNCTION public.check_fingerprint_abuse IS 'Detect multi-account abuse via device fingerprinting';

-- =====================================================
-- FUNCTION: record_device_fingerprint
-- Purpose: Store device fingerprint for user
-- Returns: Fingerprint record ID
-- =====================================================

CREATE OR REPLACE FUNCTION public.record_device_fingerprint(
  p_user_id UUID,
  p_fingerprint TEXT,
  p_visitor_id TEXT DEFAULT NULL,
  p_confidence_score DECIMAL DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id UUID;
BEGIN
  INSERT INTO public.device_fingerprints (
    user_id,
    fingerprint,
    visitor_id,
    confidence_score,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_fingerprint,
    p_visitor_id,
    p_confidence_score,
    CASE WHEN p_ip_address IS NOT NULL THEN p_ip_address::INET ELSE NULL END,
    p_user_agent
  )
  ON CONFLICT (user_id, fingerprint) DO UPDATE SET
    visitor_id = EXCLUDED.visitor_id,
    confidence_score = EXCLUDED.confidence_score,
    ip_address = EXCLUDED.ip_address,
    user_agent = EXCLUDED.user_agent
  RETURNING id INTO v_record_id;
  
  RETURN v_record_id;
END;
$$;

COMMENT ON FUNCTION public.record_device_fingerprint IS 'Store device fingerprint for abuse detection';

-- =====================================================
-- CLEANUP FUNCTION
-- Purpose: Remove old signup rate limit entries (90 days retention)
-- =====================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_signup_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.signup_rate_limits
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_signup_rate_limits IS 'Remove signup rate limit entries older than 90 days';

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.signup_rate_limits IS 'IP-based signup rate limiting (3/month)';
COMMENT ON TABLE public.device_fingerprints IS 'Device fingerprints for multi-account abuse detection';

-- =====================================================
-- VALIDATION
-- =====================================================

DO $$
BEGIN
  -- Verify all functions exist
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_signup_rate_limit') THEN
    RAISE EXCEPTION 'Function check_signup_rate_limit not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'record_signup_attempt') THEN
    RAISE EXCEPTION 'Function record_signup_attempt not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_audit_cooldown') THEN
    RAISE EXCEPTION 'Function check_audit_cooldown not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_fingerprint_abuse') THEN
    RAISE EXCEPTION 'Function check_fingerprint_abuse not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'record_device_fingerprint') THEN
    RAISE EXCEPTION 'Function record_device_fingerprint not created';
  END IF;
  
  RAISE NOTICE '✅ Migration 018 completed successfully';
  RAISE NOTICE 'Created 5 abuse prevention RPC functions';
  RAISE NOTICE 'Created 2 tables: signup_rate_limits, device_fingerprints';
END $$;


-- Migration complete: 018_abuse_prevention_rpc.sql


