-- ============================================================================
-- Citation Intelligence Schema (Without TimescaleDB)
-- Migration: 029_citation_intelligence_schema_v2.sql
-- Description: Set up database schema for Predictive Citation Intelligence Engine
-- 
-- This migration creates:
-- 1. Tables for citation predictions, forecasts, and temporal data
-- 2. Tables for knowledge graph storage
-- 3. Tables for ML model registry
-- 4. Tables for interventions and causal analysis
-- 5. Indexes for performance
-- 
-- Note: TimescaleDB is not available in Supabase, so we use regular tables
-- with partitioning for time series data
-- ============================================================================

-- ============================================================================
-- Citation Predictions Table
-- Stores citation probability scores and contributing factors
-- ============================================================================

CREATE TABLE IF NOT EXISTS citation_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  audit_id UUID REFERENCES audits(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  
  -- Prediction scores
  citation_probability NUMERIC(5,2) NOT NULL CHECK (citation_probability >= 0 AND citation_probability <= 100),
  confidence_lower NUMERIC(5,2) NOT NULL CHECK (confidence_lower >= 0 AND confidence_lower <= 100),
  confidence_upper NUMERIC(5,2) NOT NULL CHECK (confidence_upper >= 0 AND confidence_upper <= 100),
  
  -- Contributing factors (JSONB for flexibility)
  factors JSONB NOT NULL DEFAULT '[]',
  quick_wins JSONB NOT NULL DEFAULT '[]',
  
  -- Model metadata
  model_id UUID NOT NULL,
  model_version TEXT NOT NULL,
  feature_vector JSONB NOT NULL,
  
  -- Timestamps
  predicted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_confidence_interval CHECK (confidence_lower <= citation_probability AND citation_probability <= confidence_upper)
);

-- Indexes for citation predictions
CREATE INDEX IF NOT EXISTS idx_citation_predictions_user_id ON citation_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_citation_predictions_audit_id ON citation_predictions(audit_id);
CREATE INDEX IF NOT EXISTS idx_citation_predictions_url ON citation_predictions(url);
CREATE INDEX IF NOT EXISTS idx_citation_predictions_predicted_at ON citation_predictions(predicted_at DESC);
CREATE INDEX IF NOT EXISTS idx_citation_predictions_score ON citation_predictions(citation_probability DESC);

-- ============================================================================
-- Temporal Data Table
-- Stores historical audit scores and interventions over time
-- ============================================================================

CREATE TABLE IF NOT EXISTS temporal_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time TIMESTAMPTZ NOT NULL,
  url TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Scores
  overall_score NUMERIC(5,2) NOT NULL,
  citation_probability NUMERIC(5,2),
  category_scores JSONB NOT NULL DEFAULT '{}',
  
  -- Interventions applied at this time
  interventions JSONB NOT NULL DEFAULT '[]',
  
  -- External factors
  seasonality_index NUMERIC(5,4),
  competitor_activity_score NUMERIC(5,2),
  algorithm_updates JSONB DEFAULT '[]',
  
  -- Metadata
  audit_id UUID REFERENCES audits(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for temporal data
CREATE INDEX IF NOT EXISTS idx_temporal_data_time ON temporal_data(time DESC);
CREATE INDEX IF NOT EXISTS idx_temporal_data_url_time ON temporal_data(url, time DESC);
CREATE INDEX IF NOT EXISTS idx_temporal_data_user_id ON temporal_data(user_id);

-- ============================================================================
-- Forecasts Table
-- Stores temporal forecasts for citation performance
-- ============================================================================

CREATE TABLE IF NOT EXISTS citation_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  
  -- Forecast horizons (30, 60, 90 days)
  horizons JSONB NOT NULL,
  
  -- Citation velocity
  citation_velocity NUMERIC(10,4) NOT NULL,
  
  -- Seasonal factors
  seasonal_factors JSONB NOT NULL DEFAULT '[]',
  
  -- Model metadata
  model_id UUID NOT NULL,
  based_on_data_until TIMESTAMPTZ NOT NULL,
  
  -- Timestamps
  forecasted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for forecasts
CREATE INDEX IF NOT EXISTS idx_citation_forecasts_user_id ON citation_forecasts(user_id);
CREATE INDEX IF NOT EXISTS idx_citation_forecasts_url ON citation_forecasts(url);
CREATE INDEX IF NOT EXISTS idx_citation_forecasts_forecasted_at ON citation_forecasts(forecasted_at DESC);

-- ============================================================================
-- Knowledge Graph Entities Table
-- Stores entities extracted from content
-- ============================================================================

CREATE TABLE IF NOT EXISTS kg_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  
  -- Entity data
  entity_name TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('Person', 'Organization', 'Product', 'Event', 'Place', 'Concept', 'CreativeWork', 'Thing')),
  properties JSONB NOT NULL DEFAULT '{}',
  
  -- Authority scoring
  authority_score NUMERIC(5,2) CHECK (authority_score >= 0 AND authority_score <= 100),
  relationship_density NUMERIC(5,2),
  claim_evidence NUMERIC(5,2),
  external_validation NUMERIC(5,2),
  temporal_consistency NUMERIC(5,2),
  
  -- Competitive ranking
  competitive_percentile NUMERIC(5,2),
  
  -- Temporal tracking
  mentions_count INTEGER DEFAULT 0,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint per user/url/entity
  UNIQUE(user_id, url, entity_name, entity_type)
);

-- Indexes for entities
CREATE INDEX IF NOT EXISTS idx_kg_entities_user_id ON kg_entities(user_id);
CREATE INDEX IF NOT EXISTS idx_kg_entities_url ON kg_entities(url);
CREATE INDEX IF NOT EXISTS idx_kg_entities_type ON kg_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_kg_entities_authority ON kg_entities(authority_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_kg_entities_name_search ON kg_entities USING gin(to_tsvector('english', entity_name));

-- ============================================================================
-- Knowledge Graph Relationships Table
-- Stores relationships between entities
-- ============================================================================

CREATE TABLE IF NOT EXISTS kg_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  
  -- Relationship data
  source_entity_id UUID REFERENCES kg_entities(id) ON DELETE CASCADE,
  target_entity_id UUID REFERENCES kg_entities(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}',
  
  -- Relationship strength and confidence
  strength NUMERIC(3,2) CHECK (strength >= 0 AND strength <= 1),
  confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate relationships
  UNIQUE(source_entity_id, target_entity_id, relationship_type)
);

-- Indexes for relationships
CREATE INDEX IF NOT EXISTS idx_kg_relationships_user_id ON kg_relationships(user_id);
CREATE INDEX IF NOT EXISTS idx_kg_relationships_url ON kg_relationships(url);
CREATE INDEX IF NOT EXISTS idx_kg_relationships_source ON kg_relationships(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_kg_relationships_target ON kg_relationships(target_entity_id);
CREATE INDEX IF NOT EXISTS idx_kg_relationships_type ON kg_relationships(relationship_type);

-- ============================================================================
-- Knowledge Graph Claims Table
-- Stores factual claims with evidence
-- ============================================================================

CREATE TABLE IF NOT EXISTS kg_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  
  -- Claim data
  statement TEXT NOT NULL,
  subject_entity_id UUID REFERENCES kg_entities(id) ON DELETE CASCADE,
  predicate TEXT NOT NULL,
  object_entity_id UUID REFERENCES kg_entities(id) ON DELETE CASCADE,
  
  -- Evidence
  evidence JSONB NOT NULL DEFAULT '[]',
  
  -- Temporal scope
  temporal_start TIMESTAMPTZ,
  temporal_end TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for claims
CREATE INDEX IF NOT EXISTS idx_kg_claims_user_id ON kg_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_kg_claims_url ON kg_claims(url);
CREATE INDEX IF NOT EXISTS idx_kg_claims_subject ON kg_claims(subject_entity_id);
CREATE INDEX IF NOT EXISTS idx_kg_claims_object ON kg_claims(object_entity_id);
CREATE INDEX IF NOT EXISTS idx_kg_claims_statement_search ON kg_claims USING gin(to_tsvector('english', statement));

-- ============================================================================
-- Content Variations Table
-- Stores optimized content variations
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  original_content TEXT NOT NULL,
  
  -- Variation data
  optimized_content TEXT NOT NULL,
  predicted_score NUMERIC(5,2) NOT NULL,
  
  -- Improvements
  semantic_density_improvement NUMERIC(5,2),
  entity_count_improvement INTEGER,
  claim_strength_improvement NUMERIC(5,2),
  
  -- Changes and implementation
  changes JSONB NOT NULL DEFAULT '[]',
  implementation_guidance JSONB NOT NULL DEFAULT '{}',
  
  -- Validation
  factual_accuracy_score NUMERIC(3,2),
  validation_result JSONB,
  
  -- Status
  status TEXT DEFAULT 'generated' CHECK (status IN ('generated', 'reviewed', 'implemented', 'validated')),
  
  -- Timestamps
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for content variations
CREATE INDEX IF NOT EXISTS idx_content_variations_user_id ON content_variations(user_id);
CREATE INDEX IF NOT EXISTS idx_content_variations_url ON content_variations(url);
CREATE INDEX IF NOT EXISTS idx_content_variations_status ON content_variations(status);
CREATE INDEX IF NOT EXISTS idx_content_variations_score ON content_variations(predicted_score DESC);

-- ============================================================================
-- ML Model Registry Table
-- Stores ML model versions and metadata
-- ============================================================================

CREATE TABLE IF NOT EXISTS ml_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  version TEXT NOT NULL,
  
  -- Model metadata
  features JSONB NOT NULL,
  hyperparameters JSONB NOT NULL DEFAULT '{}',
  
  -- Performance metrics
  precision NUMERIC(5,4),
  recall NUMERIC(5,4),
  f1_score NUMERIC(5,4),
  auc NUMERIC(5,4),
  
  -- Model artifacts
  model_path TEXT,
  model_size_bytes BIGINT,
  
  -- Status
  status TEXT DEFAULT 'testing' CHECK (status IN ('testing', 'active', 'archived')),
  
  -- Training metadata
  trained_at TIMESTAMPTZ NOT NULL,
  trained_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  training_data_size INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint on name and version
  UNIQUE(model_name, version)
);

-- Indexes for ML models
CREATE INDEX IF NOT EXISTS idx_ml_models_name ON ml_models(model_name);
CREATE INDEX IF NOT EXISTS idx_ml_models_status ON ml_models(status);
CREATE INDEX IF NOT EXISTS idx_ml_models_f1_score ON ml_models(f1_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_ml_models_trained_at ON ml_models(trained_at DESC);

-- ============================================================================
-- Interventions Table
-- Tracks optimization interventions and their effects
-- ============================================================================

CREATE TABLE IF NOT EXISTS interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  
  -- Intervention data
  intervention_type TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Implementation
  implemented_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'implemented', 'validated')),
  
  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Causal impact (populated after analysis)
  causal_effect NUMERIC(10,4),
  causal_confidence_lower NUMERIC(10,4),
  causal_confidence_upper NUMERIC(10,4),
  causal_p_value NUMERIC(5,4),
  causal_significance BOOLEAN,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for interventions
CREATE INDEX IF NOT EXISTS idx_interventions_user_id ON interventions(user_id);
CREATE INDEX IF NOT EXISTS idx_interventions_url ON interventions(url);
CREATE INDEX IF NOT EXISTS idx_interventions_implemented_at ON interventions(implemented_at DESC);
CREATE INDEX IF NOT EXISTS idx_interventions_status ON interventions(status);
CREATE INDEX IF NOT EXISTS idx_interventions_type ON interventions(intervention_type);

-- ============================================================================
-- Competitor Analysis Table
-- Stores competitive intelligence data
-- ============================================================================

CREATE TABLE IF NOT EXISTS competitor_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_url TEXT NOT NULL,
  competitor_url TEXT NOT NULL,
  
  -- Competitor metrics
  competitor_citation_probability NUMERIC(5,2),
  competitor_entity_count INTEGER,
  competitor_authority_score NUMERIC(5,2),
  
  -- Gap analysis
  entity_gaps JSONB NOT NULL DEFAULT '[]',
  content_depth_gaps JSONB NOT NULL DEFAULT '[]',
  citation_strategy_gaps JSONB NOT NULL DEFAULT '[]',
  
  -- Positioning
  competitive_rank INTEGER,
  total_competitors INTEGER,
  percentile NUMERIC(5,2),
  
  -- Timestamps
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for competitor analysis
CREATE INDEX IF NOT EXISTS idx_competitor_analysis_user_id ON competitor_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_competitor_analysis_user_url ON competitor_analysis(user_url);
CREATE INDEX IF NOT EXISTS idx_competitor_analysis_competitor_url ON competitor_analysis(competitor_url);
CREATE INDEX IF NOT EXISTS idx_competitor_analysis_analyzed_at ON competitor_analysis(analyzed_at DESC);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- Ensure users can only access their own data
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE citation_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporal_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE citation_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE kg_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE kg_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE kg_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_analysis ENABLE ROW LEVEL SECURITY;

-- Citation Predictions policies
CREATE POLICY citation_predictions_select ON citation_predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY citation_predictions_insert ON citation_predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY citation_predictions_update ON citation_predictions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY citation_predictions_delete ON citation_predictions FOR DELETE USING (auth.uid() = user_id);

-- Temporal Data policies
CREATE POLICY temporal_data_select ON temporal_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY temporal_data_insert ON temporal_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY temporal_data_update ON temporal_data FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY temporal_data_delete ON temporal_data FOR DELETE USING (auth.uid() = user_id);

-- Citation Forecasts policies
CREATE POLICY citation_forecasts_select ON citation_forecasts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY citation_forecasts_insert ON citation_forecasts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY citation_forecasts_update ON citation_forecasts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY citation_forecasts_delete ON citation_forecasts FOR DELETE USING (auth.uid() = user_id);

-- Knowledge Graph Entities policies
CREATE POLICY kg_entities_select ON kg_entities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY kg_entities_insert ON kg_entities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY kg_entities_update ON kg_entities FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY kg_entities_delete ON kg_entities FOR DELETE USING (auth.uid() = user_id);

-- Knowledge Graph Relationships policies
CREATE POLICY kg_relationships_select ON kg_relationships FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY kg_relationships_insert ON kg_relationships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY kg_relationships_update ON kg_relationships FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY kg_relationships_delete ON kg_relationships FOR DELETE USING (auth.uid() = user_id);

-- Knowledge Graph Claims policies
CREATE POLICY kg_claims_select ON kg_claims FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY kg_claims_insert ON kg_claims FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY kg_claims_update ON kg_claims FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY kg_claims_delete ON kg_claims FOR DELETE USING (auth.uid() = user_id);

-- Content Variations policies
CREATE POLICY content_variations_select ON content_variations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY content_variations_insert ON content_variations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY content_variations_update ON content_variations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY content_variations_delete ON content_variations FOR DELETE USING (auth.uid() = user_id);

-- ML Models policies (read-only for all authenticated users, write for admins)
CREATE POLICY ml_models_select ON ml_models FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY ml_models_insert ON ml_models FOR INSERT WITH CHECK (auth.uid() = trained_by);
CREATE POLICY ml_models_update ON ml_models FOR UPDATE USING (auth.uid() = trained_by);

-- Interventions policies
CREATE POLICY interventions_select ON interventions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY interventions_insert ON interventions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY interventions_update ON interventions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY interventions_delete ON interventions FOR DELETE USING (auth.uid() = user_id);

-- Competitor Analysis policies
CREATE POLICY competitor_analysis_select ON competitor_analysis FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY competitor_analysis_insert ON competitor_analysis FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY competitor_analysis_update ON competitor_analysis FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY competitor_analysis_delete ON competitor_analysis FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- Triggers for updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_citation_predictions_updated_at BEFORE UPDATE ON citation_predictions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_citation_forecasts_updated_at BEFORE UPDATE ON citation_forecasts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kg_entities_updated_at BEFORE UPDATE ON kg_entities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kg_relationships_updated_at BEFORE UPDATE ON kg_relationships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kg_claims_updated_at BEFORE UPDATE ON kg_claims FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_content_variations_updated_at BEFORE UPDATE ON content_variations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ml_models_updated_at BEFORE UPDATE ON ml_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_interventions_updated_at BEFORE UPDATE ON interventions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_competitor_analysis_updated_at BEFORE UPDATE ON competitor_analysis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get latest citation probability for a URL
CREATE OR REPLACE FUNCTION get_latest_citation_probability(p_url TEXT, p_user_id UUID)
RETURNS NUMERIC AS $$
  SELECT citation_probability
  FROM citation_predictions
  WHERE url = p_url AND user_id = p_user_id
  ORDER BY predicted_at DESC
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Function to get entity authority trend
CREATE OR REPLACE FUNCTION get_entity_authority_trend(p_entity_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE(date DATE, authority_score NUMERIC) AS $$
  SELECT
    DATE(updated_at) AS date,
    authority_score
  FROM kg_entities
  WHERE id = p_entity_id
    AND updated_at >= NOW() - (p_days || ' days')::INTERVAL
  ORDER BY updated_at;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE citation_predictions IS 'Stores citation probability predictions with confidence intervals and contributing factors';
COMMENT ON TABLE temporal_data IS 'Time series data for historical audit scores and interventions';
COMMENT ON TABLE citation_forecasts IS 'Temporal forecasts for future citation performance';
COMMENT ON TABLE kg_entities IS 'Knowledge graph entities extracted from content';
COMMENT ON TABLE kg_relationships IS 'Relationships between knowledge graph entities';
COMMENT ON TABLE kg_claims IS 'Factual claims with evidence from knowledge graph';
COMMENT ON TABLE content_variations IS 'AI-generated optimized content variations';
COMMENT ON TABLE ml_models IS 'ML model registry with versioning and performance metrics';
COMMENT ON TABLE interventions IS 'Optimization interventions and their causal effects';
COMMENT ON TABLE competitor_analysis IS 'Competitive intelligence and gap analysis';

-- ============================================================================
-- End of Migration
-- ============================================================================
