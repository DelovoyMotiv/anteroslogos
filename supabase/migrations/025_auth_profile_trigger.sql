-- =====================================================
-- Migration: 025_auth_profile_trigger.sql
-- Purpose: Create trigger to automatically create profile on user signup
-- Date: 2025-12-03
-- 
-- Critical Fix: Without this trigger, signup fails because profiles table
-- expects a row for each auth.users entry
-- =====================================================

BEGIN;

-- =====================================================
-- Create function to handle new user signup
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert new profile for the user
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    plan_type,
    current_plan,
    credits_remaining,
    subscription_status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'free',
    'free',
    10, -- Free tier: 10 audits
    'active',
    NOW(),
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the signup
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- =====================================================
-- Create trigger on auth.users table
-- =====================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- Grant necessary permissions
-- =====================================================

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;

-- =====================================================
-- Verify trigger exists
-- =====================================================

DO $$
DECLARE
  v_trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'auth'
    AND c.relname = 'users'
    AND t.tgname = 'on_auth_user_created';
  
  IF v_trigger_count = 1 THEN
    RAISE NOTICE '✅ Trigger on_auth_user_created created successfully';
  ELSE
    RAISE WARNING '⚠️  Trigger creation may have failed';
  END IF;
END $$;

-- =====================================================
-- Test the function (optional - for verification)
-- =====================================================

COMMENT ON FUNCTION public.handle_new_user() IS 
  'Automatically creates a profile entry when a new user signs up via Supabase Auth';

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 
  'Triggers profile creation for new users';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

RAISE NOTICE '✅ Migration 025 completed successfully';
RAISE NOTICE 'Created trigger to automatically create profiles on signup';

COMMIT;
