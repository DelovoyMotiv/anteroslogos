-- =====================================================
-- ROLLBACK: Auth and Audit Log RLS Policies
-- Date: 2025-12-03
-- =====================================================

-- Remove policies created in migration 026
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.auth_audit_log;
DROP POLICY IF EXISTS "Service role can read audit logs" ON public.auth_audit_log;
DROP POLICY IF EXISTS "Allow profile creation on signup" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Revoke permissions
REVOKE INSERT ON public.auth_audit_log FROM authenticated, anon;
REVOKE SELECT ON public.auth_audit_log FROM authenticated;
REVOKE INSERT, SELECT, UPDATE ON public.profiles FROM authenticated, anon;
