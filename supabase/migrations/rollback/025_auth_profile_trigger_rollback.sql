-- =====================================================
-- Rollback: 025_auth_profile_trigger.sql
-- Purpose: Remove profile creation trigger
-- =====================================================

BEGIN;

-- Drop trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop function
DROP FUNCTION IF EXISTS public.handle_new_user();

RAISE NOTICE '✅ Rollback 025 completed - trigger removed';

COMMIT;
