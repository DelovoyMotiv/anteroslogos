-- =====================================================
-- Migration 017: Tenant Auto-Provisioning on Signup
-- Purpose: Automatically create tenant + add user as owner when new user registers
-- Creates personal workspace for each user (required for multi-tenancy)
-- =====================================================

-- =====================================================
-- FUNCTION: auto_provision_tenant
-- Purpose: Create tenant and add user as owner automatically
-- Trigger: AFTER INSERT on auth.users (runs after handle_new_user and auto_activate_free_plan)
-- =====================================================

CREATE OR REPLACE FUNCTION public.auto_provision_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_tenant_name TEXT;
  v_tenant_slug TEXT;
  v_user_email TEXT;
  v_user_name TEXT;
BEGIN
  -- Get user email and name
  v_user_email := NEW.email;
  v_user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(v_user_email, '@', 1));
  
  -- Generate tenant name (user's name + "'s Workspace")
  v_tenant_name := v_user_name || '''s Workspace';
  
  -- Generate tenant slug (lowercase, alphanumeric + hyphens, unique)
  v_tenant_slug := lower(regexp_replace(v_user_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_tenant_slug := trim(both '-' from v_tenant_slug);
  
  -- Ensure slug is unique by appending random suffix if needed
  IF EXISTS (SELECT 1 FROM public.tenants WHERE slug = v_tenant_slug) THEN
    v_tenant_slug := v_tenant_slug || '-' || substr(md5(random()::text), 1, 6);
  END IF;
  
  -- Create tenant
  INSERT INTO public.tenants (
    owner_id,
    name,
    slug,
    status
  ) VALUES (
    NEW.id,
    v_tenant_name,
    v_tenant_slug,
    'active'
  )
  RETURNING id INTO v_tenant_id;
  
  -- Add user as owner in tenant_members
  INSERT INTO public.tenant_members (
    tenant_id,
    user_id,
    role,
    status,
    joined_at
  ) VALUES (
    v_tenant_id,
    NEW.id,
    'owner',
    'active',
    NOW()
  );
  
  -- Note: tenant_id in profiles is populated via fill_tenant_id() trigger from migration 007
  -- No manual UPDATE needed here
  
  RAISE NOTICE 'Tenant provisioned: % (%) for user %', v_tenant_name, v_tenant_id, NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user signup
    RAISE WARNING 'Failed to provision tenant for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_provision_tenant IS 'Automatically creates tenant and adds user as owner on signup';

-- =====================================================
-- TRIGGER: on_auth_user_created_provision_tenant
-- Purpose: Execute auto_provision_tenant after user registration
-- Priority: Runs AFTER handle_new_user and auto_activate_free_plan
-- =====================================================

-- Drop if exists (for idempotency)
-- Drop trigger (wrapped for permission handling)
DO $$
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created_provision_tenant ON auth.users;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping trigger drop - insufficient privileges';
END $$;

-- Create trigger (wrapped for permission handling)
DO $$
BEGIN
  CREATE TRIGGER on_auth_user_created_provision_tenant
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_provision_tenant();
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping trigger creation - insufficient privileges';
  WHEN duplicate_object THEN
    RAISE NOTICE 'Trigger already exists';
END $$;

-- Comment on trigger (wrapped for permission handling)
DO $$
BEGIN
  EXECUTE format('COMMENT ON TRIGGER on_auth_user_created_provision_tenant ON auth.users IS %L', 'Provisions tenant workspace for new users');
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping trigger comment - insufficient privileges';
  WHEN undefined_object THEN
    RAISE NOTICE 'Trigger does not exist';
END $$;

-- =====================================================
-- HELPER FUNCTION: get_user_primary_tenant
-- Purpose: Get user's primary (owner) tenant
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_primary_tenant(p_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT t.id
  FROM public.tenants t
  WHERE t.owner_id = p_user_id
    AND t.status = 'active'
    AND t.deleted_at IS NULL
  ORDER BY t.created_at ASC
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_user_primary_tenant IS 'Returns user primary (owner) tenant ID';

-- =====================================================
-- VALIDATION: Verify tenants table exists
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'tenants table not found. Please run migration 007_multi_tenancy_isolation.sql first.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_members' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'tenant_members table not found. Please run migration 007_multi_tenancy_isolation.sql first.';
  END IF;
  
  -- Verify tenant_id column exists in profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
      AND column_name = 'tenant_id' 
      AND table_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'tenant_id column not found in profiles table. Please run migration 007_multi_tenancy_isolation.sql first.';
  END IF;
  
  RAISE NOTICE '✅ Migration 017 completed successfully. Tenant auto-provisioning enabled.';
END $$;
