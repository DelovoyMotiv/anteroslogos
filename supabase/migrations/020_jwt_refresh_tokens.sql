-- Migration 020: JWT Refresh Tokens
-- Purpose: Store refresh tokens for JWT authentication with short TTL
-- Created: 2025-12-02

-- ============================================================================
-- TABLE: refresh_tokens
-- Purpose: Store refresh tokens with rotation support
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of refresh token
  family_id UUID NOT NULL, -- Token family for rotation tracking
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  
  -- Constraints
  CONSTRAINT refresh_tokens_valid_expiry CHECK (expires_at > created_at),
  CONSTRAINT refresh_tokens_revoked_check CHECK (
    (revoked_at IS NULL AND revoked_reason IS NULL) OR
    (revoked_at IS NOT NULL AND revoked_reason IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_refresh_tokens_user_id ON public.refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON public.refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_family_id ON public.refresh_tokens(family_id);
CREATE INDEX idx_refresh_tokens_expires_at ON public.refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_revoked ON public.refresh_tokens(revoked_at) WHERE revoked_at IS NULL;

COMMENT ON TABLE public.refresh_tokens IS 'JWT refresh tokens with rotation support for security';
COMMENT ON COLUMN public.refresh_tokens.token_hash IS 'SHA-256 hash of the refresh token (never store plaintext)';
COMMENT ON COLUMN public.refresh_tokens.family_id IS 'Token family ID for tracking rotation chains';
COMMENT ON COLUMN public.refresh_tokens.revoked_reason IS 'Reason for revocation: rotation, logout, security, expired';

-- ============================================================================
-- ENABLE ROW-LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: refresh_tokens
-- ============================================================================

-- Users can view their own refresh tokens
DROP POLICY IF EXISTS "Users view own refresh tokens" ON public.refresh_tokens;
CREATE POLICY "Users view own refresh tokens"
ON public.refresh_tokens FOR SELECT
USING (auth.uid() = user_id);

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access refresh tokens" ON public.refresh_tokens;
CREATE POLICY "Service role full access refresh tokens"
ON public.refresh_tokens FOR ALL
USING (auth.role() = 'service_role');

-- ============================================================================
-- FUNCTIONS: Token Management
-- ============================================================================

-- Function to cleanup expired refresh tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_refresh_tokens()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.refresh_tokens
  WHERE expires_at < NOW()
    OR revoked_at < NOW() - INTERVAL '30 days'; -- Keep revoked tokens for 30 days for audit
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_expired_refresh_tokens IS 'Delete expired and old revoked refresh tokens (should be called by CRON daily)';

-- Function to revoke all tokens for a user
CREATE OR REPLACE FUNCTION public.revoke_all_user_tokens(
  p_user_id UUID,
  p_reason TEXT DEFAULT 'logout'
)
RETURNS INTEGER AS $$
DECLARE
  v_revoked_count INTEGER;
BEGIN
  UPDATE public.refresh_tokens
  SET 
    revoked_at = NOW(),
    revoked_reason = p_reason
  WHERE user_id = p_user_id
    AND revoked_at IS NULL;
  
  GET DIAGNOSTICS v_revoked_count = ROW_COUNT;
  RETURN v_revoked_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.revoke_all_user_tokens IS 'Revoke all active refresh tokens for a user (logout all devices)';

-- Function to revoke token family (for security breach detection)
CREATE OR REPLACE FUNCTION public.revoke_token_family(
  p_family_id UUID,
  p_reason TEXT DEFAULT 'security'
)
RETURNS INTEGER AS $$
DECLARE
  v_revoked_count INTEGER;
BEGIN
  UPDATE public.refresh_tokens
  SET 
    revoked_at = NOW(),
    revoked_reason = p_reason
  WHERE family_id = p_family_id
    AND revoked_at IS NULL;
  
  GET DIAGNOSTICS v_revoked_count = ROW_COUNT;
  RETURN v_revoked_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.revoke_token_family IS 'Revoke all tokens in a family (detects token reuse attacks)';

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.cleanup_expired_refresh_tokens TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_all_user_tokens TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_token_family TO service_role;

-- Migration complete
