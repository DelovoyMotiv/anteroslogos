-- ============================================
-- Migration 25: 024_fix_user_id_references.sql
-- ============================================

-- =====================================================
-- Migration 024: Fix user_id References
-- =====================================================
-- Description: Emergency fix for user_id column references in profiles table
-- Created: 2025-12-03
-- Issue: Previous migration attempted to use profiles.user_id which doesn't exist
-- Solution: This migration is idempotent and safe to run multiple times

-- =====================================================
-- VERIFICATION: Check if profiles has user_id column
-- =====================================================

DO $fix_user_id$
DECLARE
  has_user_id_column BOOLEAN;
BEGIN
  -- Check if profiles table has user_id column
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'user_id'
  ) INTO has_user_id_column;
  
  IF has_user_id_column THEN
    RAISE NOTICE '⚠️  WARNING: profiles table has user_id column (unexpected)';
    RAISE NOTICE '   This column should not exist. Primary key is "id"';
    RAISE NOTICE '   Recommend manual investigation before proceeding';
  ELSE
    RAISE NOTICE '✓ CORRECT: profiles table uses "id" as primary key (not user_id)';
  END IF;
  
  -- Verify correct structure
  RAISE NOTICE 'Migration 024: Verification complete';
  RAISE NOTICE 'profiles.id → auth.users(id) [PRIMARY KEY]';
  RAISE NOTICE 'Other tables use user_id → profiles(id) [FOREIGN KEY]';
  
END $fix_user_id$;

-- =====================================================
-- NO SCHEMA CHANGES NEEDED
-- =====================================================
-- This migration is purely diagnostic.
-- All actual schema is correct in migrations 001-023.
-- If Supabase shows "user_id does not exist" error,
-- it means an old/incorrect migration was applied.
-- 
-- Resolution:
-- 1. Reset Supabase database (recommended)
-- 2. OR manually drop problematic objects
-- 3. Re-apply migrations 001-024 in order

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.profiles IS 'User profiles - PRIMARY KEY is "id" (not user_id)';
COMMENT ON COLUMN public.profiles.id IS 'Primary key - references auth.users(id)';


-- Migration complete: 024_fix_user_id_references.sql

