-- =====================================================
-- ROLLBACK: Migration 020 - JWT Refresh Tokens
-- Purpose: Remove JWT refresh token infrastructure
-- Data Loss Risk: MEDIUM (active sessions will be invalidated)
-- =====================================================

-- Revoke grants
REVOKE EXECUTE ON FUNCTION public.revoke_token_family FROM service_role;
REVOKE EXECUTE ON FUNCTION public.revoke_all_user_tokens FROM authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_refresh_tokens FROM service_role;

-- Drop functions
DROP FUNCTION IF EXISTS public.revoke_token_family(UUID, TEXT);
DROP FUNCTION IF EXISTS public.revoke_all_user_tokens(UUID, TEXT);
DROP FUNCTION IF EXISTS public.cleanup_expired_refresh_tokens();

-- Drop RLS policies
DROP POLICY IF EXISTS "Service role full access refresh tokens" ON public.refresh_tokens;
DROP POLICY IF EXISTS "Users view own refresh tokens" ON public.refresh_tokens;

-- Drop indexes
DROP INDEX IF EXISTS idx_refresh_tokens_revoked;
DROP INDEX IF EXISTS idx_refresh_tokens_expires_at;
DROP INDEX IF EXISTS idx_refresh_tokens_family_id;
DROP INDEX IF EXISTS idx_refresh_tokens_token_hash;
DROP INDEX IF EXISTS idx_refresh_tokens_user_id;

-- Drop table
DROP TABLE IF EXISTS public.refresh_tokens CASCADE;

-- Log rollback completion
DO $
BEGIN
  RAISE NOTICE '✅ Rollback 020 completed: JWT refresh tokens removed';
  RAISE NOTICE '⚠️  WARNING: All active user sessions have been invalidated';
  RAISE NOTICE '⚠️  WARNING: Users will need to re-authenticate';
END $;
