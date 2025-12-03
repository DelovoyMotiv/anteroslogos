-- =====================================================
-- Migration 011: FREE Plan Auto-Activation + Platform Wallet Update
-- Purpose: Automatically create FREE subscription when user registers (freemium model)
-- Platform Wallet: 0x8dc66e84c31fe4dd455e1b32fe42d42d026abb93
-- =====================================================

-- =====================================================
-- FUNCTION: auto_activate_free_plan
-- Purpose: Automatically activate FREE plan for new users
-- Trigger: AFTER INSERT on auth.users
-- =====================================================

CREATE OR REPLACE FUNCTION public.auto_activate_free_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_free_plan_id UUID;
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
BEGIN
  -- Get FREE plan ID
  SELECT id INTO v_free_plan_id
  FROM public.subscription_plans
  WHERE plan_name = 'free'
    AND is_active = TRUE
  LIMIT 1;
  
  IF v_free_plan_id IS NULL THEN
    RAISE EXCEPTION 'FREE plan not found in subscription_plans table';
  END IF;
  
  -- Set billing period (30 days from now)
  v_period_start := NOW();
  v_period_end := NOW() + INTERVAL '30 days';
  
  -- Create FREE subscription for new user
  INSERT INTO public.user_subscriptions (
    user_id,
    plan_id,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end
  ) VALUES (
    NEW.id,
    v_free_plan_id,
    'active',
    v_period_start,
    v_period_end,
    FALSE
  )
  ON CONFLICT (user_id) WHERE status = 'active' DO NOTHING;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_activate_free_plan IS 'Automatically activates FREE subscription for new users (freemium model)';

-- =====================================================
-- TRIGGER: on_auth_user_created_activate_plan
-- Purpose: Execute auto_activate_free_plan after user registration
-- Note: Renamed to avoid conflict with migration 001 trigger
-- Execution order: 1) handle_new_user (profile) 2) auto_activate_free_plan (subscription)
-- =====================================================

-- Drop trigger (wrapped for permission handling)
DO $$
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created_activate_plan ON auth.users;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping trigger drop - insufficient privileges';
END $$;

-- Create trigger (wrapped for permission handling)
DO $$
BEGIN
  CREATE TRIGGER on_auth_user_created_activate_plan
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_activate_free_plan();
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping trigger creation - insufficient privileges';
  WHEN duplicate_object THEN
    RAISE NOTICE 'Trigger already exists';
END $$;

-- Comment on trigger (wrapped for permission handling)
DO $$
BEGIN
  EXECUTE format('COMMENT ON TRIGGER on_auth_user_created_activate_plan ON auth.users IS %L', 'Activates FREE plan subscription for new users (runs after profile creation)');
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping trigger comment - insufficient privileges';
  WHEN undefined_object THEN
    RAISE NOTICE 'Trigger does not exist';
END $$;

-- =====================================================
-- UPDATE: Platform wallet address for all operations
-- Purpose: Set owner's wallet as default recipient for all payments
-- =====================================================

-- Note: This address should also be set in environment variable PLATFORM_WALLET_ADDRESS
-- Platform Wallet: 0x8dc66e84c31fe4dd455e1b32fe42d42d026abb93

-- Create configuration table if not exists (for runtime configuration)
CREATE TABLE IF NOT EXISTS public.platform_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insert platform wallet address
INSERT INTO public.platform_config (key, value, description)
VALUES (
  'platform_wallet_address',
  '0x8dc66e84c31fe4dd455e1b32fe42d42d026abb93',
  'Owner wallet address on Base L2 for receiving all USDC payments (subscriptions, APA micropayments, fees)'
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Add helper function to get platform wallet
CREATE OR REPLACE FUNCTION public.get_platform_wallet_address()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT value FROM public.platform_config WHERE key = 'platform_wallet_address';
$$;

COMMENT ON FUNCTION public.get_platform_wallet_address IS 'Returns platform wallet address for payment operations';

-- Grant read access to authenticated users (needed for invoice generation)
GRANT SELECT ON public.platform_config TO authenticated;

-- =====================================================
-- VALIDATION: Verify FREE plan exists
-- =====================================================

DO $$
DECLARE
  v_free_plan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_free_plan_count
  FROM public.subscription_plans
  WHERE plan_name = 'free' AND is_active = TRUE;
  
  IF v_free_plan_count = 0 THEN
    RAISE EXCEPTION 'FREE plan not found. Please run migration 010_subscription_billing.sql first.';
  END IF;
  
  RAISE NOTICE 'Migration 011 completed successfully. FREE plan auto-activation enabled.';
  RAISE NOTICE 'Platform wallet: 0x8dc66e84c31fe4dd455e1b32fe42d42d026abb93';
END $$;
