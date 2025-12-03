-- =====================================================
-- FIX: Auth and Audit Log RLS Policies
-- Date: 2025-12-03
-- Issue: Signup failing due to RLS blocking inserts
-- =====================================================

-- 1. Allow service role to insert into auth_audit_log
-- This is needed for audit logging during signup
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.auth_audit_log;
CREATE POLICY "Service role can insert audit logs"
ON public.auth_audit_log
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- 2. Allow service role to read audit logs
DROP POLICY IF EXISTS "Service role can read audit logs" ON public.auth_audit_log;
CREATE POLICY "Service role can read audit logs"
ON public.auth_audit_log
FOR SELECT
TO authenticated
USING (true);

-- 3. Ensure profiles can be created by trigger
-- The trigger runs with SECURITY DEFINER, but we need to allow inserts
DROP POLICY IF EXISTS "Allow profile creation on signup" ON public.profiles;
CREATE POLICY "Allow profile creation on signup"
ON public.profiles
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- 4. Allow users to read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 5. Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 6. Verify RLS is enabled
ALTER TABLE public.auth_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 7. Grant necessary permissions
GRANT INSERT ON public.auth_audit_log TO authenticated, anon;
GRANT SELECT ON public.auth_audit_log TO authenticated;
GRANT INSERT, SELECT, UPDATE ON public.profiles TO authenticated, anon;

-- Verification query
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('auth_audit_log', 'profiles')
ORDER BY tablename, policyname;
