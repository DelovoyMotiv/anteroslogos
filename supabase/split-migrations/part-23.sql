-- ============================================
-- Migration 23: 022_competitor_tracking.sql
-- ============================================

-- =====================================================
-- COMPETITOR TRACKING SCHEMA
-- Task 7.2: Replace mock data with database queries
-- =====================================================

-- =====================================================
-- COMPETITORS TABLE
-- Track competitor domains for competitive intelligence
-- =====================================================
CREATE TABLE IF NOT EXISTS public.competitors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Competitor identity
  domain TEXT NOT NULL,
  name TEXT NOT NULL,
  industry TEXT,
  
  -- Tracking status
  tracking_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Metrics (updated periodically)
  total_citations INTEGER DEFAULT 0 NOT NULL,
  citations_last_7d INTEGER DEFAULT 0 NOT NULL,
  citations_last_30d INTEGER DEFAULT 0 NOT NULL,
  citation_velocity DECIMAL(10,2) DEFAULT 0 NOT NULL, -- citations per day
  market_share DECIMAL(5,2) DEFAULT 0 NOT NULL, -- percentage
  growth_rate DECIMAL(5,2) DEFAULT 0 NOT NULL, -- percentage
  
  -- Platform distribution
  platform_distribution JSONB DEFAULT '{
    "chatgpt": 0,
    "claude": 0,
    "perplexity": 0,
    "gemini": 0,
    "meta": 0
  }'::jsonb NOT NULL,
  
  -- Content strategy insights
  content_strategy JSONB DEFAULT '{
    "primary_topics": [],
    "entity_types_used": [],
    "avg_entities_per_graph": 0,
    "avg_claims_per_graph": 0,
    "relationship_density": 0,
    "update_frequency": "unknown"
  }'::jsonb NOT NULL,
  
  -- Competitive analysis
  competitive_advantages JSONB DEFAULT '[]'::jsonb NOT NULL,
  our_disadvantages JSONB DEFAULT '[]'::jsonb NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT unique_competitor_domain_per_tenant UNIQUE (tenant_id, domain)
);

-- Indexes
CREATE INDEX idx_competitors_tenant ON public.competitors(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_competitors_domain ON public.competitors(domain) WHERE deleted_at IS NULL;
CREATE INDEX idx_competitors_tracking ON public.competitors(tracking_enabled) WHERE deleted_at IS NULL;

-- =====================================================
-- COMPETITIVE_THREATS TABLE
-- Track detected competitive threats
-- =====================================================
CREATE TABLE IF NOT EXISTS public.competitive_threats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  competitor_id UUID REFERENCES public.competitors(id) ON DELETE CASCADE NOT NULL,
  
  -- Threat details
  threat_type TEXT NOT NULL CHECK (threat_type IN (
    'citation_loss',
    'market_share_decline',
    'platform_dominance',
    'content_gap',
    'velocity_surge',
    'quality_advantage'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  detected_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Context
  query TEXT,
  platform TEXT,
  our_rank INTEGER,
  competitor_rank INTEGER,
  estimated_lost_reach INTEGER,
  estimated_lost_value DECIMAL(10,2), -- USD
  
  -- Analysis
  root_causes JSONB DEFAULT '[]'::jsonb NOT NULL,
  recommended_actions JSONB DEFAULT '[]'::jsonb NOT NULL,
  
  -- Status tracking
  status TEXT DEFAULT 'detected' NOT NULL CHECK (status IN (
    'detected',
    'analyzing',
    'action_planned',
    'implementing',
    'resolved',
    'ignored'
  )),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_threats_tenant ON public.competitive_threats(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_threats_competitor ON public.competitive_threats(competitor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_threats_status ON public.competitive_threats(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_threats_severity ON public.competitive_threats(severity) WHERE deleted_at IS NULL;
CREATE INDEX idx_threats_detected ON public.competitive_threats(detected_at DESC) WHERE deleted_at IS NULL;

-- =====================================================
-- COMPETITOR_CITATIONS TABLE
-- Track citations received by competitors
-- =====================================================
CREATE TABLE IF NOT EXISTS public.competitor_citations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  competitor_id UUID REFERENCES public.competitors(id) ON DELETE CASCADE NOT NULL,
  
  -- Citation details
  source TEXT NOT NULL CHECK (source IN ('chatgpt', 'claude', 'perplexity', 'gemini', 'meta_ai', 'bing_copilot', 'you_com', 'other')),
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Metadata
  url TEXT,
  context TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_comp_citations_tenant ON public.competitor_citations(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comp_citations_competitor ON public.competitor_citations(competitor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comp_citations_source ON public.competitor_citations(source) WHERE deleted_at IS NULL;
CREATE INDEX idx_comp_citations_timestamp ON public.competitor_citations(timestamp DESC) WHERE deleted_at IS NULL;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitive_threats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_citations ENABLE ROW LEVEL SECURITY;

-- Competitors policies
CREATE POLICY "Tenant members can view competitors"
  ON public.competitors FOR SELECT
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.tenants WHERE id = competitors.tenant_id
    ) OR
    auth.uid() IN (
      SELECT member_id FROM public.tenant_members WHERE tenant_id = competitors.tenant_id
    )
  );

CREATE POLICY "Tenant members can insert competitors"
  ON public.competitors FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE owner_id = auth.uid()
      UNION
      SELECT tenant_id FROM public.tenant_members WHERE member_id = auth.uid()
    )
  );

CREATE POLICY "Tenant members can update competitors"
  ON public.competitors FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.tenants WHERE id = competitors.tenant_id
    ) OR
    auth.uid() IN (
      SELECT member_id FROM public.tenant_members WHERE tenant_id = competitors.tenant_id AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Tenant admins can delete competitors"
  ON public.competitors FOR DELETE
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.tenants WHERE id = competitors.tenant_id
    ) OR
    auth.uid() IN (
      SELECT member_id FROM public.tenant_members WHERE tenant_id = competitors.tenant_id AND role IN ('owner', 'admin')
    )
  );

-- Competitive threats policies
CREATE POLICY "Tenant members can view threats"
  ON public.competitive_threats FOR SELECT
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.tenants WHERE id = competitive_threats.tenant_id
    ) OR
    auth.uid() IN (
      SELECT member_id FROM public.tenant_members WHERE tenant_id = competitive_threats.tenant_id
    )
  );

CREATE POLICY "Tenant members can insert threats"
  ON public.competitive_threats FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE owner_id = auth.uid()
      UNION
      SELECT tenant_id FROM public.tenant_members WHERE member_id = auth.uid()
    )
  );

CREATE POLICY "Tenant members can update threats"
  ON public.competitive_threats FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.tenants WHERE id = competitive_threats.tenant_id
    ) OR
    auth.uid() IN (
      SELECT member_id FROM public.tenant_members WHERE tenant_id = competitive_threats.tenant_id AND role IN ('owner', 'admin', 'member')
    )
  );

-- Competitor citations policies
CREATE POLICY "Tenant members can view competitor citations"
  ON public.competitor_citations FOR SELECT
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.tenants WHERE id = competitor_citations.tenant_id
    ) OR
    auth.uid() IN (
      SELECT member_id FROM public.tenant_members WHERE tenant_id = competitor_citations.tenant_id
    )
  );

CREATE POLICY "Tenant members can insert competitor citations"
  ON public.competitor_citations FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE owner_id = auth.uid()
      UNION
      SELECT tenant_id FROM public.tenant_members WHERE member_id = auth.uid()
    )
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Update competitor metrics from citations
CREATE OR REPLACE FUNCTION update_competitor_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update citation counts
  UPDATE public.competitors
  SET
    total_citations = (
      SELECT COUNT(*) FROM public.competitor_citations
      WHERE competitor_id = NEW.competitor_id AND deleted_at IS NULL
    ),
    citations_last_7d = (
      SELECT COUNT(*) FROM public.competitor_citations
      WHERE competitor_id = NEW.competitor_id 
        AND timestamp >= NOW() - INTERVAL '7 days'
        AND deleted_at IS NULL
    ),
    citations_last_30d = (
      SELECT COUNT(*) FROM public.competitor_citations
      WHERE competitor_id = NEW.competitor_id 
        AND timestamp >= NOW() - INTERVAL '30 days'
        AND deleted_at IS NULL
    ),
    updated_at = NOW()
  WHERE id = NEW.competitor_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update metrics on citation insert
CREATE TRIGGER trigger_update_competitor_metrics
  AFTER INSERT ON public.competitor_citations
  FOR EACH ROW
  EXECUTE FUNCTION update_competitor_metrics();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.competitors IS 'Competitor domains tracked for competitive intelligence';
COMMENT ON TABLE public.competitive_threats IS 'Detected competitive threats requiring action';
COMMENT ON TABLE public.competitor_citations IS 'Citations received by competitor domains';


-- Migration complete: 022_competitor_tracking.sql


