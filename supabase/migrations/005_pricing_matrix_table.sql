-- =====================================================
-- Migration: 005 - Pricing Matrix Table
-- Purpose: Move pricing from code to database for hot-reload
-- Date: 2025-11-21
-- =====================================================

-- =====================================================
-- TABLE: a2a_pricing
-- Purpose: Dynamic pricing configuration for A2A methods
-- Benefit: Update prices without code deployment
-- =====================================================

CREATE TABLE IF NOT EXISTS public.a2a_pricing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  method TEXT NOT NULL, -- JSON-RPC method (e.g., geo.audit.request)
  tier TEXT NOT NULL CHECK (tier IN ('free', 'basic', 'pro')),
  price_usd DECIMAL(18,6) NOT NULL CHECK (price_usd >= 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_until TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT, -- User/admin who created this price
  notes TEXT, -- Reasoning for price change
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_method CHECK (method ~* '^[a-z_][a-z0-9_.]*$'),
  CONSTRAINT valid_effective_dates CHECK (
    effective_until IS NULL OR effective_until > effective_from
  ),
  CONSTRAINT unique_active_pricing UNIQUE (method, tier, effective_from, is_active)
);

-- Indexes for performance
CREATE INDEX idx_a2a_pricing_method_tier ON public.a2a_pricing(method, tier);
CREATE INDEX idx_a2a_pricing_active ON public.a2a_pricing(is_active, effective_from) WHERE is_active = true;
CREATE INDEX idx_a2a_pricing_effective ON public.a2a_pricing(effective_from DESC, effective_until DESC);

-- RLS Policies (read-only for authenticated users)
ALTER TABLE public.a2a_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active pricing"
  ON public.a2a_pricing FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role can manage pricing"
  ON public.a2a_pricing FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger: Update updated_at timestamp
CREATE TRIGGER a2a_pricing_updated_at
  BEFORE UPDATE ON public.a2a_pricing
  FOR EACH ROW EXECUTE FUNCTION update_a2a_wallets_updated_at();

-- =====================================================
-- FUNCTION: get_current_price
-- Purpose: Retrieve active price for method+tier+time
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_current_price(
  p_method TEXT,
  p_tier TEXT,
  p_at_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS DECIMAL(18,6)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price DECIMAL(18,6);
BEGIN
  -- Validate inputs
  IF p_tier NOT IN ('free', 'basic', 'pro') THEN
    RAISE EXCEPTION 'Invalid tier: %', p_tier;
  END IF;
  
  -- Get active price at specified time
  SELECT price_usd
  INTO v_price
  FROM public.a2a_pricing
  WHERE method = p_method
    AND tier = p_tier
    AND is_active = true
    AND effective_from <= p_at_time
    AND (effective_until IS NULL OR effective_until > p_at_time)
  ORDER BY effective_from DESC
  LIMIT 1;
  
  -- Return price or NULL if not found
  RETURN v_price;
END;
$$;

-- =====================================================
-- SEED DATA: Migrate existing pricing from types.ts
-- =====================================================

INSERT INTO public.a2a_pricing (method, tier, price_usd, notes, created_by, version)
VALUES
  -- geo.audit.request pricing
  ('geo.audit.request', 'free', 0.00, 'Initial pricing - free tier (rate-limited)', 'system', 1),
  ('geo.audit.request', 'basic', 0.10, 'Initial pricing - pay-per-request', 'system', 1),
  ('geo.audit.request', 'pro', 0.00, 'Initial pricing - included in pro subscription', 'system', 1),
  
  -- causal_citation_trace pricing
  ('causal_citation_trace', 'free', 0.00, 'Initial pricing - free tier (rate-limited)', 'system', 1),
  ('causal_citation_trace', 'basic', 0.50, 'Initial pricing - pay-per-request', 'system', 1),
  ('causal_citation_trace', 'pro', 0.25, 'Initial pricing - 50% discount for pro', 'system', 1)
ON CONFLICT (method, tier, effective_from, is_active) DO NOTHING;

-- =====================================================
-- VIEW: current_pricing_summary
-- Purpose: Simplified view of current active pricing
-- =====================================================

CREATE OR REPLACE VIEW public.current_pricing_summary AS
SELECT 
  method,
  tier,
  price_usd,
  effective_from,
  effective_until,
  notes
FROM public.a2a_pricing
WHERE is_active = true
  AND effective_from <= NOW()
  AND (effective_until IS NULL OR effective_until > NOW())
ORDER BY method, tier;

-- Grant SELECT on view
GRANT SELECT ON public.current_pricing_summary TO authenticated, anon;

-- =====================================================
-- GRANTS
-- =====================================================

GRANT SELECT ON public.a2a_pricing TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_current_price(TEXT, TEXT, TIMESTAMPTZ) TO authenticated, anon;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.a2a_pricing IS 'Dynamic pricing configuration for A2A methods';
COMMENT ON FUNCTION public.get_current_price IS 'Get current active price for method+tier at specified time';
COMMENT ON VIEW public.current_pricing_summary IS 'Current active pricing across all methods and tiers';
