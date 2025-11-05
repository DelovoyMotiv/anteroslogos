-- Anóteros Lógos GEO Audit Platform - Initial Database Schema
-- Production-ready PostgreSQL schema with proper indexing, constraints, and RLS

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search

-- =====================================================
-- PROFILES TABLE
-- Extended user data beyond Supabase auth.users
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  company_name TEXT,
  industry TEXT,
  website_url TEXT,
  avatar_url TEXT,
  plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'premium', 'enterprise')),
  stripe_customer_id TEXT UNIQUE,
  subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'canceled', 'past_due')),
  subscription_ends_at TIMESTAMPTZ,
  credits_remaining INTEGER DEFAULT 10, -- Free tier: 10 audits
  total_audits INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Profiles indexes
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_plan_type ON public.profiles(plan_type);
CREATE INDEX idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- =====================================================
-- AUDITS TABLE  
-- Stores all GEO audit results
-- =====================================================
CREATE TABLE IF NOT EXISTS public.audits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  normalized_url TEXT NOT NULL, -- Without protocol, www, trailing slash
  domain TEXT NOT NULL, -- Extracted domain for grouping
  
  -- Audit metadata
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  duration_ms INTEGER, -- How long the audit took
  user_agent TEXT,
  ip_address INET,
  
  -- Overall scores
  overall_score DECIMAL(5,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  grade TEXT NOT NULL CHECK (grade IN ('A+', 'A', 'B', 'C', 'D', 'F')),
  
  -- Category scores (all 0-100)
  score_schema_markup DECIMAL(5,2) NOT NULL DEFAULT 0,
  score_meta_tags DECIMAL(5,2) NOT NULL DEFAULT 0,
  score_ai_crawlers DECIMAL(5,2) NOT NULL DEFAULT 0,
  score_eeat DECIMAL(5,2) NOT NULL DEFAULT 0,
  score_structure DECIMAL(5,2) NOT NULL DEFAULT 0,
  score_performance DECIMAL(5,2) NOT NULL DEFAULT 0,
  score_content_quality DECIMAL(5,2) NOT NULL DEFAULT 0,
  score_citation_potential DECIMAL(5,2) NOT NULL DEFAULT 0,
  score_technical_seo DECIMAL(5,2) NOT NULL DEFAULT 0,
  score_link_analysis DECIMAL(5,2) NOT NULL DEFAULT 0,
  
  -- Detailed findings (JSONB for flexibility)
  schema_findings JSONB DEFAULT '{}'::jsonb,
  meta_findings JSONB DEFAULT '{}'::jsonb,
  crawler_findings JSONB DEFAULT '{}'::jsonb,
  eeat_findings JSONB DEFAULT '{}'::jsonb,
  structure_findings JSONB DEFAULT '{}'::jsonb,
  performance_findings JSONB DEFAULT '{}'::jsonb,
  content_findings JSONB DEFAULT '{}'::jsonb,
  citation_findings JSONB DEFAULT '{}'::jsonb,
  technical_findings JSONB DEFAULT '{}'::jsonb,
  link_findings JSONB DEFAULT '{}'::jsonb,
  
  -- AI recommendations
  ai_recommendations JSONB DEFAULT '[]'::jsonb,
  priority_actions JSONB DEFAULT '[]'::jsonb,
  
  -- Aggregation flags (for analytics)
  has_organization_schema BOOLEAN DEFAULT FALSE,
  has_person_schema BOOLEAN DEFAULT FALSE,
  has_article_schema BOOLEAN DEFAULT FALSE,
  has_breadcrumb_schema BOOLEAN DEFAULT FALSE,
  has_author_markup BOOLEAN DEFAULT FALSE,
  has_eeat_signals BOOLEAN DEFAULT FALSE,
  robots_txt_allows_ai BOOLEAN DEFAULT FALSE,
  
  -- Anonymization (for public aggregation)
  is_public BOOLEAN DEFAULT FALSE, -- User can opt-in to share anonymously
  anonymized_domain TEXT, -- Hashed domain for grouping without exposing URL
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- Audits indexes for performance
CREATE INDEX idx_audits_user_id ON public.audits(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_audits_normalized_url ON public.audits(normalized_url) WHERE deleted_at IS NULL;
CREATE INDEX idx_audits_domain ON public.audits(domain) WHERE deleted_at IS NULL;
CREATE INDEX idx_audits_timestamp ON public.audits(timestamp DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_audits_overall_score ON public.audits(overall_score) WHERE deleted_at IS NULL;
CREATE INDEX idx_audits_is_public ON public.audits(is_public) WHERE is_public = TRUE AND deleted_at IS NULL;

-- GIN indexes for JSONB search
CREATE INDEX idx_audits_schema_findings ON public.audits USING GIN (schema_findings);
CREATE INDEX idx_audits_ai_recommendations ON public.audits USING GIN (ai_recommendations);

-- Composite index for trend analysis
CREATE INDEX idx_audits_user_url_time ON public.audits(user_id, normalized_url, timestamp DESC) WHERE deleted_at IS NULL;

-- =====================================================
-- GLOBAL_INSIGHTS TABLE
-- Pre-computed aggregations for performance
-- Refreshed periodically via cron job
-- =====================================================
CREATE TABLE IF NOT EXISTS public.global_insights (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('industry', 'score_range', 'schema_type', 'best_practices', 'trends')),
  segment TEXT NOT NULL, -- e.g., 'e-commerce', '80-100', 'Organization'
  timeframe TEXT NOT NULL CHECK (timeframe IN ('7d', '30d', '90d', 'all')),
  
  -- Aggregated metrics
  total_audits INTEGER DEFAULT 0,
  average_score DECIMAL(5,2),
  median_score DECIMAL(5,2),
  
  -- Category averages
  avg_schema_score DECIMAL(5,2),
  avg_eeat_score DECIMAL(5,2),
  avg_content_score DECIMAL(5,2),
  avg_technical_score DECIMAL(5,2),
  
  -- Adoption rates (%)
  organization_schema_rate DECIMAL(5,2),
  person_schema_rate DECIMAL(5,2),
  eeat_signals_rate DECIMAL(5,2),
  ai_crawler_allowed_rate DECIMAL(5,2),
  
  -- Top performers
  top_scoring_features JSONB DEFAULT '[]'::jsonb, -- [{feature: 'Organization schema', correlation: 0.85}]
  common_issues JSONB DEFAULT '[]'::jsonb, -- [{issue: 'Missing E-E-A-T', frequency: 0.62}]
  
  -- Metadata
  computed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  sample_size INTEGER NOT NULL, -- How many audits this represents
  confidence_level DECIMAL(5,2), -- Statistical confidence (0-100)
  
  -- Caching
  expires_at TIMESTAMPTZ, -- When to recompute
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Global insights indexes
CREATE INDEX idx_insights_type_segment ON public.global_insights(insight_type, segment);
CREATE INDEX idx_insights_timeframe ON public.global_insights(timeframe);
CREATE INDEX idx_insights_expires ON public.global_insights(expires_at) WHERE expires_at IS NOT NULL;
CREATE UNIQUE INDEX idx_insights_unique ON public.global_insights(insight_type, segment, timeframe);

-- =====================================================
-- AUDIT_ALERTS TABLE
-- Real-time monitoring alerts
-- =====================================================
CREATE TABLE IF NOT EXISTS public.audit_alerts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  audit_id UUID REFERENCES public.audits(id) ON DELETE CASCADE NOT NULL,
  
  alert_type TEXT NOT NULL CHECK (alert_type IN ('score_drop', 'critical_issue', 'improvement', 'anomaly')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT, -- Which category triggered it
  
  -- Alert details
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional context
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Alerts indexes
CREATE INDEX idx_alerts_user_id ON public.audit_alerts(user_id) WHERE is_resolved = FALSE;
CREATE INDEX idx_alerts_audit_id ON public.audit_alerts(audit_id);
CREATE INDEX idx_alerts_severity ON public.audit_alerts(severity) WHERE is_resolved = FALSE;
CREATE INDEX idx_alerts_created_at ON public.audit_alerts(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_alerts ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
  
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Audits policies
CREATE POLICY "Users can view own audits" ON public.audits
  FOR SELECT USING (auth.uid() = user_id OR is_public = TRUE);

CREATE POLICY "Users can insert own audits" ON public.audits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own audits" ON public.audits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own audits" ON public.audits
  FOR DELETE USING (auth.uid() = user_id);

-- Global insights policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view insights" ON public.global_insights
  FOR SELECT USING (auth.role() = 'authenticated');

-- Alerts policies
CREATE POLICY "Users can view own alerts" ON public.audit_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts" ON public.audit_alerts
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers: Auto-update updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audits_updated_at BEFORE UPDATE ON public.audits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_insights_updated_at BEFORE UPDATE ON public.global_insights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON public.audit_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function: Increment user's total_audits counter
CREATE OR REPLACE FUNCTION increment_user_audit_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET total_audits = total_audits + 1,
      credits_remaining = GREATEST(0, credits_remaining - 1)
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-increment audit count on insert
CREATE TRIGGER increment_audit_count AFTER INSERT ON public.audits
  FOR EACH ROW EXECUTE FUNCTION increment_user_audit_count();

-- Function: Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create profile on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View: User audit summary
CREATE OR REPLACE VIEW public.user_audit_summary AS
SELECT 
  user_id,
  COUNT(*) AS total_audits,
  AVG(overall_score) AS avg_score,
  MAX(overall_score) AS best_score,
  MIN(overall_score) AS worst_score,
  COUNT(DISTINCT domain) AS unique_domains,
  MAX(timestamp) AS last_audit_at
FROM public.audits
WHERE deleted_at IS NULL
GROUP BY user_id;

-- View: Domain trend analysis
CREATE OR REPLACE VIEW public.domain_trends AS
SELECT
  normalized_url,
  domain,
  COUNT(*) AS audit_count,
  AVG(overall_score) AS avg_score,
  MAX(overall_score) - MIN(overall_score) AS score_range,
  array_agg(
    json_build_object(
      'timestamp', timestamp,
      'score', overall_score
    ) ORDER BY timestamp
  ) AS score_history
FROM public.audits
WHERE deleted_at IS NULL
GROUP BY normalized_url, domain
HAVING COUNT(*) >= 2;

-- =====================================================
-- SAMPLE DATA ANONYMIZATION FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION anonymize_domain(input_domain TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN 'domain_' || substring(md5(input_domain) from 1 for 12);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- INDEXES FOR ANALYTICS QUERIES
-- =====================================================

-- Materialized view for fast global stats (refresh daily)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.global_stats AS
SELECT
  COUNT(DISTINCT user_id) AS total_users,
  COUNT(*) AS total_audits,
  AVG(overall_score) AS avg_score,
  COUNT(*) FILTER (WHERE has_organization_schema) AS org_schema_count,
  COUNT(*) FILTER (WHERE has_eeat_signals) AS eeat_count,
  COUNT(*) FILTER (WHERE robots_txt_allows_ai) AS ai_friendly_count,
  CURRENT_TIMESTAMP AS computed_at
FROM public.audits
WHERE deleted_at IS NULL AND is_public = TRUE;

-- Index on materialized view
CREATE UNIQUE INDEX idx_global_stats_computed ON public.global_stats(computed_at);

-- Function to refresh stats (call via cron)
CREATE OR REPLACE FUNCTION refresh_global_stats()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.global_stats;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.profiles IS 'Extended user profiles with subscription and credit tracking';
COMMENT ON TABLE public.audits IS 'Complete GEO audit results with category scores and findings';
COMMENT ON TABLE public.global_insights IS 'Pre-computed analytics for global benchmarks and trends';
COMMENT ON TABLE public.audit_alerts IS 'Real-time monitoring alerts for score drops and issues';

COMMENT ON COLUMN public.audits.normalized_url IS 'URL without protocol, www, trailing slash for deduplication';
COMMENT ON COLUMN public.audits.anonymized_domain IS 'Hashed domain for anonymous aggregation';
COMMENT ON COLUMN public.audits.is_public IS 'User opt-in to contribute to global insights';
COMMENT ON COLUMN public.profiles.credits_remaining IS 'Free tier credits (10 initial, decrements per audit)';
