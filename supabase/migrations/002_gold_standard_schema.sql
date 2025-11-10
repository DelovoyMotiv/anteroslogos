-- Gold Standard Systems Database Schema
-- Persistent storage for Knowledge Graphs, Citations, Learning Data, Network Effects
-- Production-ready with indexing, constraints, and RLS

-- =====================================================
-- KNOWLEDGE_GRAPHS TABLE
-- Persistent storage for client knowledge graphs
-- =====================================================
CREATE TABLE IF NOT EXISTS public.knowledge_graphs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  
  -- Graph version control
  version INTEGER DEFAULT 1 NOT NULL,
  parent_version_id UUID REFERENCES public.knowledge_graphs(id) ON DELETE SET NULL,
  is_current BOOLEAN DEFAULT TRUE,
  
  -- Graph data (JSONB for flexibility)
  entities JSONB DEFAULT '[]'::jsonb NOT NULL,
  relationships JSONB DEFAULT '[]'::jsonb NOT NULL,
  claims JSONB DEFAULT '[]'::jsonb NOT NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
  source_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Statistics (for quick queries without parsing JSONB)
  entity_count INTEGER DEFAULT 0 NOT NULL,
  relationship_count INTEGER DEFAULT 0 NOT NULL,
  claim_count INTEGER DEFAULT 0 NOT NULL,
  
  -- Learning metadata
  learning_version INTEGER DEFAULT 0 NOT NULL,
  last_learning_update TIMESTAMPTZ,
  total_learning_updates INTEGER DEFAULT 0 NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Soft delete
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_entity_count CHECK (entity_count >= 0),
  CONSTRAINT valid_relationship_count CHECK (relationship_count >= 0),
  CONSTRAINT valid_claim_count CHECK (claim_count >= 0)
);

-- Indexes
CREATE INDEX idx_kg_user_id ON public.knowledge_graphs(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_kg_domain ON public.knowledge_graphs(domain) WHERE deleted_at IS NULL;
CREATE INDEX idx_kg_is_current ON public.knowledge_graphs(user_id, domain, is_current) WHERE is_current = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_kg_created_at ON public.knowledge_graphs(created_at DESC);

-- GIN indexes for JSONB entity/relationship search
CREATE INDEX idx_kg_entities ON public.knowledge_graphs USING GIN (entities);
CREATE INDEX idx_kg_relationships ON public.knowledge_graphs USING GIN (relationships);

-- Unique constraint: one current version per user per domain
CREATE UNIQUE INDEX idx_kg_current_unique ON public.knowledge_graphs(user_id, domain) 
  WHERE is_current = TRUE AND deleted_at IS NULL;

-- =====================================================
-- CITATIONS TABLE
-- Persistent citation tracking across sessions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.citations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  knowledge_graph_id UUID REFERENCES public.knowledge_graphs(id) ON DELETE CASCADE,
  
  -- Citation identity
  citation_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('chatgpt', 'claude', 'perplexity', 'gemini', 'meta_ai', 'bing_copilot', 'you_com', 'other')),
  
  -- Citation content
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  cited_entity TEXT,
  cited_claim TEXT,
  url TEXT,
  
  -- Citation metadata
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  context TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_citations_user_id ON public.citations(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_citations_kg_id ON public.citations(knowledge_graph_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_citations_source ON public.citations(source) WHERE deleted_at IS NULL;
CREATE INDEX idx_citations_timestamp ON public.citations(timestamp DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_citations_cited_entity ON public.citations(cited_entity) WHERE cited_entity IS NOT NULL AND deleted_at IS NULL;

-- Unique constraint: prevent duplicate citations
CREATE UNIQUE INDEX idx_citations_unique ON public.citations(citation_id, user_id) WHERE deleted_at IS NULL;

-- =====================================================
-- LEARNING_ANALYSES TABLE
-- Store self-improvement analysis results
-- =====================================================
CREATE TABLE IF NOT EXISTS public.learning_analyses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  knowledge_graph_id UUID REFERENCES public.knowledge_graphs(id) ON DELETE CASCADE NOT NULL,
  
  -- Analysis results
  total_citations_analyzed INTEGER DEFAULT 0 NOT NULL,
  current_citation_score DECIMAL(5,2) NOT NULL,
  predicted_citation_score DECIMAL(5,2) NOT NULL,
  expected_improvement DECIMAL(5,2) NOT NULL,
  
  -- Findings (JSONB)
  high_value_entities JSONB DEFAULT '[]'::jsonb,
  high_value_relationships JSONB DEFAULT '[]'::jsonb,
  validated_claims JSONB DEFAULT '[]'::jsonb,
  suggested_updates JSONB DEFAULT '[]'::jsonb,
  learning_insights JSONB DEFAULT '[]'::jsonb,
  
  -- Update application status
  updates_applied BOOLEAN DEFAULT FALSE,
  applied_at TIMESTAMPTZ,
  applied_update_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_learning_kg_id ON public.learning_analyses(knowledge_graph_id);
CREATE INDEX idx_learning_created_at ON public.learning_analyses(created_at DESC);
CREATE INDEX idx_learning_applied ON public.learning_analyses(updates_applied);

-- =====================================================
-- GLOBAL_ENTITIES TABLE
-- Cross-client network effects entity index
-- =====================================================
CREATE TABLE IF NOT EXISTS public.global_entities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Entity identity
  canonical_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  
  -- Aggregated data
  referenced_by_domains TEXT[] DEFAULT ARRAY[]::TEXT[],
  total_references INTEGER DEFAULT 0 NOT NULL,
  merged_description TEXT,
  
  -- Confidence and authority
  confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.70 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  authority_score DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (authority_score >= 0 AND authority_score <= 100),
  
  -- Network metrics
  total_citations INTEGER DEFAULT 0 NOT NULL,
  citation_platforms TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Variants (JSONB array of domain-specific representations)
  variants JSONB DEFAULT '[]'::jsonb NOT NULL,
  
  -- Timestamps
  first_seen TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_confidence CHECK (confidence_score >= 0 AND confidence_score <= 1),
  CONSTRAINT valid_authority CHECK (authority_score >= 0 AND authority_score <= 100)
);

-- Indexes
CREATE INDEX idx_global_entities_normalized ON public.global_entities(normalized_name);
CREATE INDEX idx_global_entities_type ON public.global_entities(entity_type);
CREATE INDEX idx_global_entities_authority ON public.global_entities(authority_score DESC);
CREATE INDEX idx_global_entities_references ON public.global_entities(total_references DESC);

-- GIN index for domain array search
CREATE INDEX idx_global_entities_domains ON public.global_entities USING GIN (referenced_by_domains);

-- Unique constraint: one global entity per normalized name
CREATE UNIQUE INDEX idx_global_entities_unique ON public.global_entities(normalized_name);

-- =====================================================
-- GLOBAL_RELATIONSHIPS TABLE
-- Cross-client relationship validation
-- =====================================================
CREATE TABLE IF NOT EXISTS public.global_relationships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Relationship identity
  source_global_entity_id UUID REFERENCES public.global_entities(id) ON DELETE CASCADE NOT NULL,
  target_global_entity_id UUID REFERENCES public.global_entities(id) ON DELETE CASCADE NOT NULL,
  relationship_type TEXT NOT NULL,
  
  -- Validation data
  supporting_domains TEXT[] DEFAULT ARRAY[]::TEXT[],
  confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.70 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  citation_count INTEGER DEFAULT 0 NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_global_rel_source ON public.global_relationships(source_global_entity_id);
CREATE INDEX idx_global_rel_target ON public.global_relationships(target_global_entity_id);
CREATE INDEX idx_global_rel_type ON public.global_relationships(relationship_type);

-- GIN index for domain array search
CREATE INDEX idx_global_rel_domains ON public.global_relationships USING GIN (supporting_domains);

-- Unique constraint: one relationship per source-target-type
CREATE UNIQUE INDEX idx_global_rel_unique ON public.global_relationships(source_global_entity_id, target_global_entity_id, relationship_type);

-- =====================================================
-- NETWORK_EFFECTS TABLE
-- Track network effect occurrences
-- =====================================================
CREATE TABLE IF NOT EXISTS public.network_effects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Effect details
  effect_type TEXT NOT NULL CHECK (effect_type IN ('entity_amplification', 'relationship_validation', 'claim_validation', 'authority_boost')),
  affected_entity_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  affected_domains TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Impact metrics
  confidence_boost DECIMAL(3,2) NOT NULL CHECK (confidence_boost >= 0 AND confidence_boost <= 1),
  authority_boost DECIMAL(5,2) NOT NULL CHECK (authority_boost >= 0 AND authority_boost <= 100),
  citation_probability_lift DECIMAL(5,2) NOT NULL,
  
  -- Provenance
  evidence_count INTEGER NOT NULL,
  contributing_domains TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_network_effects_type ON public.network_effects(effect_type);
CREATE INDEX idx_network_effects_created ON public.network_effects(created_at DESC);

-- GIN indexes for array search
CREATE INDEX idx_network_effects_entities ON public.network_effects USING GIN (affected_entity_ids);
CREATE INDEX idx_network_effects_domains ON public.network_effects USING GIN (affected_domains);

-- =====================================================
-- SYNC_OPERATIONS TABLE
-- Track real-time sync operations
-- =====================================================
CREATE TABLE IF NOT EXISTS public.sync_operations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Operation details
  operation_id TEXT NOT NULL UNIQUE,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('create', 'update', 'delete')),
  target_type TEXT NOT NULL CHECK (target_type IN ('entity', 'relationship', 'claim', 'full_graph')),
  target_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  
  -- Change details (JSONB)
  before_state JSONB,
  after_state JSONB,
  
  -- Platform sync status (JSONB)
  platform_status JSONB DEFAULT '{
    "openai": {"status": "pending", "retry_count": 0},
    "claude": {"status": "pending", "retry_count": 0},
    "perplexity": {"status": "pending", "retry_count": 0},
    "gemini": {"status": "pending", "retry_count": 0},
    "meta": {"status": "pending", "retry_count": 0}
  }'::jsonb NOT NULL,
  
  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ,
  total_duration_ms INTEGER
);

-- Indexes
CREATE INDEX idx_sync_ops_operation_id ON public.sync_operations(operation_id);
CREATE INDEX idx_sync_ops_domain ON public.sync_operations(domain);
CREATE INDEX idx_sync_ops_created ON public.sync_operations(created_at DESC);
CREATE INDEX idx_sync_ops_completed ON public.sync_operations(completed_at DESC) WHERE completed_at IS NOT NULL;

-- GIN index for platform status search
CREATE INDEX idx_sync_ops_status ON public.sync_operations USING GIN (platform_status);

-- =====================================================
-- CITATION_PREDICTIONS TABLE
-- Store pre-publication predictions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.citation_predictions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  knowledge_graph_id UUID REFERENCES public.knowledge_graphs(id) ON DELETE CASCADE NOT NULL,
  
  -- Prediction results
  overall_probability DECIMAL(5,2) NOT NULL CHECK (overall_probability >= 0 AND overall_probability <= 100),
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Platform-specific predictions (JSONB)
  platform_predictions JSONB NOT NULL,
  
  -- Optimization recommendations (JSONB array)
  optimization_actions JSONB DEFAULT '[]'::jsonb,
  
  -- Predicted metrics
  predicted_reach INTEGER NOT NULL,
  predicted_value DECIMAL(10,2) NOT NULL,
  time_to_citation_pessimistic INTEGER,
  time_to_citation_realistic INTEGER,
  time_to_citation_optimistic INTEGER,
  
  -- Actual outcomes (for model training)
  actual_citations_received INTEGER DEFAULT 0,
  actual_time_to_first_citation INTEGER,
  prediction_accuracy DECIMAL(3,2),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_predictions_kg_id ON public.citation_predictions(knowledge_graph_id);
CREATE INDEX idx_predictions_created ON public.citation_predictions(created_at DESC);
CREATE INDEX idx_predictions_probability ON public.citation_predictions(overall_probability DESC);

-- GIN index for optimization actions
CREATE INDEX idx_predictions_actions ON public.citation_predictions USING GIN (optimization_actions);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.knowledge_graphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_effects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citation_predictions ENABLE ROW LEVEL SECURITY;

-- Knowledge Graphs policies
CREATE POLICY "Users can view own knowledge graphs" ON public.knowledge_graphs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own knowledge graphs" ON public.knowledge_graphs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own knowledge graphs" ON public.knowledge_graphs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own knowledge graphs" ON public.knowledge_graphs
  FOR DELETE USING (auth.uid() = user_id);

-- Citations policies
CREATE POLICY "Users can view own citations" ON public.citations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own citations" ON public.citations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Learning Analyses policies (read-only via KG relationship)
CREATE POLICY "Users can view learning analyses for own KGs" ON public.learning_analyses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.knowledge_graphs kg
      WHERE kg.id = learning_analyses.knowledge_graph_id
      AND kg.user_id = auth.uid()
    )
  );

-- Global Entities policies (read-only for authenticated users)
CREATE POLICY "Authenticated users can view global entities" ON public.global_entities
  FOR SELECT USING (auth.role() = 'authenticated');

-- Global Relationships policies (read-only for authenticated users)
CREATE POLICY "Authenticated users can view global relationships" ON public.global_relationships
  FOR SELECT USING (auth.role() = 'authenticated');

-- Network Effects policies (read-only for authenticated users)
CREATE POLICY "Authenticated users can view network effects" ON public.network_effects
  FOR SELECT USING (auth.role() = 'authenticated');

-- Sync Operations policies (users can view operations for their domains)
CREATE POLICY "Users can view sync operations for own domains" ON public.sync_operations
  FOR SELECT USING (
    domain IN (
      SELECT DISTINCT kg.domain FROM public.knowledge_graphs kg
      WHERE kg.user_id = auth.uid()
    )
  );

-- Citation Predictions policies (via KG relationship)
CREATE POLICY "Users can view predictions for own KGs" ON public.citation_predictions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.knowledge_graphs kg
      WHERE kg.id = citation_predictions.knowledge_graph_id
      AND kg.user_id = auth.uid()
    )
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamps
CREATE TRIGGER update_kg_updated_at BEFORE UPDATE ON public.knowledge_graphs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_citations_updated_at BEFORE UPDATE ON public.citations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_updated_at BEFORE UPDATE ON public.learning_analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_global_entities_updated_at BEFORE UPDATE ON public.global_entities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_global_rel_updated_at BEFORE UPDATE ON public.global_relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_predictions_updated_at BEFORE UPDATE ON public.citation_predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function: Get current knowledge graph for domain
CREATE OR REPLACE FUNCTION get_current_kg(p_user_id UUID, p_domain TEXT)
RETURNS UUID AS $$
  SELECT id FROM public.knowledge_graphs
  WHERE user_id = p_user_id
  AND domain = p_domain
  AND is_current = TRUE
  AND deleted_at IS NULL
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Function: Get citation count for KG
CREATE OR REPLACE FUNCTION get_kg_citation_count(p_kg_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM public.citations
  WHERE knowledge_graph_id = p_kg_id
  AND deleted_at IS NULL;
$$ LANGUAGE sql STABLE;

-- Function: Get global entity by normalized name
CREATE OR REPLACE FUNCTION get_global_entity_by_name(p_normalized_name TEXT)
RETURNS UUID AS $$
  SELECT id FROM public.global_entities
  WHERE normalized_name = p_normalized_name
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.knowledge_graphs IS 'Persistent storage for client knowledge graphs with version control';
COMMENT ON TABLE public.citations IS 'Citation tracking across sessions, linked to knowledge graphs';
COMMENT ON TABLE public.learning_analyses IS 'Self-improvement analysis results and update suggestions';
COMMENT ON TABLE public.global_entities IS 'Cross-client entity index for network effects';
COMMENT ON TABLE public.global_relationships IS 'Cross-client relationship validation';
COMMENT ON TABLE public.network_effects IS 'Track network effect occurrences and impact';
COMMENT ON TABLE public.sync_operations IS 'Real-time sync operation tracking across AI platforms';
COMMENT ON TABLE public.citation_predictions IS 'Pre-publication citation probability predictions';
