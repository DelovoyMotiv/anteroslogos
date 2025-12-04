--
-- Byzantine Fault Tolerance - Validation Results Schema
-- Graph validation, Sybil detection, collusion detection, and Merkle proofs
-- Migration: 028
-- Created: 2025-12-04
--

-- =====================================================
-- GRAPH VALIDATION RESULTS TABLE
-- =====================================================

CREATE TABLE public.graph_validation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_commit_hash VARCHAR(64) NOT NULL CHECK (graph_commit_hash ~ '^[a-f0-9]{64}$'), -- SHA-256 hex
  is_valid BOOLEAN NOT NULL,
  scc_count INTEGER CHECK (scc_count >= 0),
  largest_scc_size INTEGER CHECK (largest_scc_size >= 0),
  largest_scc_percentage DECIMAL(5,2) CHECK (largest_scc_percentage >= 0 AND largest_scc_percentage <= 100),
  graph_density DECIMAL(5,4) CHECK (graph_density >= 0 AND graph_density <= 1),
  violations JSONB DEFAULT '[]'::jsonb, -- Array of GraphViolation objects
  metadata JSONB DEFAULT '{}'::jsonb,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_scc_percentage CHECK (
    largest_scc_percentage IS NULL OR 
    (largest_scc_percentage >= 0 AND largest_scc_percentage <= 100)
  )
);

-- Indexes for graph validation results
CREATE INDEX idx_graph_validation_commit_hash ON public.graph_validation_results(graph_commit_hash);
CREATE INDEX idx_graph_validation_is_valid ON public.graph_validation_results(is_valid, validated_at DESC);
CREATE INDEX idx_graph_validation_validated_at ON public.graph_validation_results(validated_at DESC);
CREATE INDEX idx_graph_validation_violations ON public.graph_validation_results USING GIN (violations);

-- =====================================================
-- SYBIL DETECTION RESULTS TABLE
-- =====================================================

CREATE TABLE public.sybil_detection_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  is_suspicious BOOLEAN NOT NULL,
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  novelty_volume_ratio DECIMAL(5,4) CHECK (novelty_volume_ratio >= 0),
  entropy_score DECIMAL(5,2) CHECK (entropy_score >= 0),
  indicators JSONB DEFAULT '[]'::jsonb, -- Array of SybilIndicator objects
  recommended_action TEXT NOT NULL CHECK (recommended_action IN ('FLAG', 'THROTTLE', 'BLOCK', 'NONE')),
  metadata JSONB DEFAULT '{}'::jsonb,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_confidence CHECK (confidence >= 0 AND confidence <= 1)
);

-- Indexes for Sybil detection results
CREATE INDEX idx_sybil_detection_agent_id ON public.sybil_detection_results(agent_id, detected_at DESC);
CREATE INDEX idx_sybil_detection_suspicious ON public.sybil_detection_results(is_suspicious, detected_at DESC) WHERE is_suspicious = true;
CREATE INDEX idx_sybil_detection_action ON public.sybil_detection_results(recommended_action, detected_at DESC);
CREATE INDEX idx_sybil_detection_confidence ON public.sybil_detection_results(confidence DESC) WHERE is_suspicious = true;
CREATE INDEX idx_sybil_detection_detected_at ON public.sybil_detection_results(detected_at DESC);
CREATE INDEX idx_sybil_detection_indicators ON public.sybil_detection_results USING GIN (indicators);

-- =====================================================
-- COLLUSION CLUSTERS TABLE
-- =====================================================

CREATE TABLE public.collusion_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_ids TEXT[] NOT NULL CHECK (array_length(agent_ids, 1) >= 2), -- At least 2 agents
  avg_correlation DECIMAL(3,2) NOT NULL CHECK (avg_correlation >= -1 AND avg_correlation <= 1),
  graph_similarity DECIMAL(3,2) NOT NULL CHECK (graph_similarity >= 0 AND graph_similarity <= 1),
  entity_overlap DECIMAL(3,2) NOT NULL CHECK (entity_overlap >= 0 AND entity_overlap <= 1),
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  evidence JSONB DEFAULT '[]'::jsonb, -- Array of CollusionEvidence objects
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'FALSE_POSITIVE', 'RESOLVED')),
  metadata JSONB DEFAULT '{}'::jsonb,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_agent_count CHECK (array_length(agent_ids, 1) >= 2),
  CONSTRAINT valid_correlation CHECK (avg_correlation >= -1 AND avg_correlation <= 1),
  CONSTRAINT valid_similarity CHECK (graph_similarity >= 0 AND graph_similarity <= 1),
  CONSTRAINT valid_overlap CHECK (entity_overlap >= 0 AND entity_overlap <= 1),
  CONSTRAINT valid_confidence CHECK (confidence >= 0 AND confidence <= 1)
);

-- Indexes for collusion clusters
CREATE INDEX idx_collusion_clusters_agent_ids ON public.collusion_clusters USING GIN (agent_ids);
CREATE INDEX idx_collusion_clusters_status ON public.collusion_clusters(status, detected_at DESC);
CREATE INDEX idx_collusion_clusters_correlation ON public.collusion_clusters(avg_correlation DESC);
CREATE INDEX idx_collusion_clusters_confidence ON public.collusion_clusters(confidence DESC);
CREATE INDEX idx_collusion_clusters_detected_at ON public.collusion_clusters(detected_at DESC);
CREATE INDEX idx_collusion_clusters_evidence ON public.collusion_clusters USING GIN (evidence);

-- =====================================================
-- MERKLE PROOFS CACHE TABLE
-- =====================================================

CREATE TABLE public.merkle_proofs_cache (
  node_id TEXT NOT NULL,
  epoch_number BIGINT NOT NULL,
  proof JSONB NOT NULL, -- MerkleProof object
  root_hash VARCHAR(64) NOT NULL CHECK (root_hash ~ '^[a-f0-9]{64}$'), -- SHA-256 hex
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
  
  PRIMARY KEY (node_id, epoch_number),
  
  -- Foreign key to epoch commits
  CONSTRAINT fk_merkle_proof_epoch 
    FOREIGN KEY (epoch_number) 
    REFERENCES public.bft_epoch_commits(epoch_number)
    ON DELETE CASCADE
);

-- Indexes for Merkle proofs cache
CREATE INDEX idx_merkle_proofs_epoch ON public.merkle_proofs_cache(epoch_number);
CREATE INDEX idx_merkle_proofs_root_hash ON public.merkle_proofs_cache(root_hash);
CREATE INDEX idx_merkle_proofs_expires_at ON public.merkle_proofs_cache(expires_at);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update verified_at for collusion clusters
CREATE OR REPLACE FUNCTION update_collusion_cluster_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-set verified_at when status changes to VERIFIED
  IF NEW.status = 'VERIFIED' AND (OLD.status IS NULL OR OLD.status != 'VERIFIED') THEN
    NEW.verified_at = NOW();
  END IF;
  
  -- Auto-set resolved_at when status changes to RESOLVED or FALSE_POSITIVE
  IF NEW.status IN ('RESOLVED', 'FALSE_POSITIVE') AND 
     (OLD.status IS NULL OR OLD.status NOT IN ('RESOLVED', 'FALSE_POSITIVE')) THEN
    NEW.resolved_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_collusion_cluster_timestamps
BEFORE INSERT OR UPDATE ON public.collusion_clusters
FOR EACH ROW
EXECUTE FUNCTION update_collusion_cluster_timestamps();

-- Clean up expired Merkle proofs
CREATE OR REPLACE FUNCTION cleanup_expired_merkle_proofs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.merkle_proofs_cache
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.graph_validation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sybil_detection_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collusion_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merkle_proofs_cache ENABLE ROW LEVEL SECURITY;

-- Graph validation results: read for authenticated users
CREATE POLICY "Graph validation read for authenticated"
ON public.graph_validation_results
FOR SELECT
TO authenticated
USING (true);

-- Graph validation results: write only via service role
CREATE POLICY "Graph validation write via service role"
ON public.graph_validation_results
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Sybil detection results: read for authenticated users
CREATE POLICY "Sybil detection read for authenticated"
ON public.sybil_detection_results
FOR SELECT
TO authenticated
USING (true);

-- Sybil detection results: write only via service role
CREATE POLICY "Sybil detection write via service role"
ON public.sybil_detection_results
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Collusion clusters: read for authenticated users
CREATE POLICY "Collusion clusters read for authenticated"
ON public.collusion_clusters
FOR SELECT
TO authenticated
USING (true);

-- Collusion clusters: write only via service role
CREATE POLICY "Collusion clusters write via service role"
ON public.collusion_clusters
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Merkle proofs cache: read for authenticated users
CREATE POLICY "Merkle proofs read for authenticated"
ON public.merkle_proofs_cache
FOR SELECT
TO authenticated
USING (true);

-- Merkle proofs cache: write only via service role
CREATE POLICY "Merkle proofs write via service role"
ON public.merkle_proofs_cache
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

/**
 * Get latest validation result for a graph commit
 * @param p_graph_commit_hash - SHA-256 hash of graph commit
 * @returns record - Latest validation result
 */
CREATE OR REPLACE FUNCTION get_latest_validation_result(p_graph_commit_hash VARCHAR(64))
RETURNS TABLE (
  id UUID,
  is_valid BOOLEAN,
  scc_count INTEGER,
  largest_scc_size INTEGER,
  largest_scc_percentage DECIMAL(5,2),
  graph_density DECIMAL(5,4),
  violations JSONB,
  validated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.is_valid,
    v.scc_count,
    v.largest_scc_size,
    v.largest_scc_percentage,
    v.graph_density,
    v.violations,
    v.validated_at
  FROM public.graph_validation_results v
  WHERE v.graph_commit_hash = p_graph_commit_hash
  ORDER BY v.validated_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Get latest Sybil detection result for an agent
 * @param p_agent_id - Agent identifier
 * @returns record - Latest Sybil detection result
 */
CREATE OR REPLACE FUNCTION get_latest_sybil_detection(p_agent_id TEXT)
RETURNS TABLE (
  id UUID,
  is_suspicious BOOLEAN,
  confidence DECIMAL(3,2),
  novelty_volume_ratio DECIMAL(5,4),
  entropy_score DECIMAL(5,2),
  recommended_action TEXT,
  detected_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.is_suspicious,
    s.confidence,
    s.novelty_volume_ratio,
    s.entropy_score,
    s.recommended_action,
    s.detected_at
  FROM public.sybil_detection_results s
  WHERE s.agent_id = p_agent_id
  ORDER BY s.detected_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Check if agent is in any active collusion cluster
 * @param p_agent_id - Agent identifier
 * @returns boolean - True if agent is in an active cluster
 */
CREATE OR REPLACE FUNCTION is_agent_in_collusion_cluster(p_agent_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.collusion_clusters
    WHERE p_agent_id = ANY(agent_ids)
      AND status IN ('PENDING', 'VERIFIED')
      AND detected_at >= NOW() - INTERVAL '30 days'
  );
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Get Merkle proof from cache
 * @param p_node_id - Node identifier
 * @param p_epoch_number - Epoch number
 * @returns jsonb - Merkle proof or NULL if not cached
 */
CREATE OR REPLACE FUNCTION get_cached_merkle_proof(p_node_id TEXT, p_epoch_number BIGINT)
RETURNS JSONB AS $$
DECLARE
  v_proof JSONB;
BEGIN
  SELECT proof INTO v_proof
  FROM public.merkle_proofs_cache
  WHERE node_id = p_node_id
    AND epoch_number = p_epoch_number
    AND expires_at > NOW();
  
  RETURN v_proof;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Cache Merkle proof
 * @param p_node_id - Node identifier
 * @param p_epoch_number - Epoch number
 * @param p_proof - Merkle proof JSONB
 * @param p_root_hash - Root hash
 * @param p_ttl_seconds - Time to live in seconds (default 3600)
 */
CREATE OR REPLACE FUNCTION cache_merkle_proof(
  p_node_id TEXT,
  p_epoch_number BIGINT,
  p_proof JSONB,
  p_root_hash VARCHAR(64),
  p_ttl_seconds INTEGER DEFAULT 3600
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.merkle_proofs_cache (
    node_id,
    epoch_number,
    proof,
    root_hash,
    expires_at
  ) VALUES (
    p_node_id,
    p_epoch_number,
    p_proof,
    p_root_hash,
    NOW() + (p_ttl_seconds || ' seconds')::INTERVAL
  )
  ON CONFLICT (node_id, epoch_number) 
  DO UPDATE SET
    proof = EXCLUDED.proof,
    root_hash = EXCLUDED.root_hash,
    created_at = NOW(),
    expires_at = NOW() + (p_ttl_seconds || ' seconds')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS
-- =====================================================

/**
 * View of suspicious agents with latest detection results
 */
CREATE OR REPLACE VIEW public.v_suspicious_agents AS
SELECT DISTINCT ON (s.agent_id)
  s.agent_id,
  s.is_suspicious,
  s.confidence,
  s.novelty_volume_ratio,
  s.entropy_score,
  s.recommended_action,
  s.detected_at,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.collusion_clusters c
      WHERE s.agent_id = ANY(c.agent_ids)
        AND c.status IN ('PENDING', 'VERIFIED')
    ) THEN true
    ELSE false
  END as in_collusion_cluster
FROM public.sybil_detection_results s
WHERE s.is_suspicious = true
  AND s.detected_at >= NOW() - INTERVAL '30 days'
ORDER BY s.agent_id, s.detected_at DESC;

/**
 * View of active collusion clusters
 */
CREATE OR REPLACE VIEW public.v_active_collusion_clusters AS
SELECT 
  c.id,
  c.agent_ids,
  c.avg_correlation,
  c.graph_similarity,
  c.entity_overlap,
  c.confidence,
  c.status,
  c.detected_at,
  array_length(c.agent_ids, 1) as cluster_size
FROM public.collusion_clusters c
WHERE c.status IN ('PENDING', 'VERIFIED')
  AND c.detected_at >= NOW() - INTERVAL '30 days'
ORDER BY c.confidence DESC, c.detected_at DESC;

/**
 * View of recent validation failures
 */
CREATE OR REPLACE VIEW public.v_recent_validation_failures AS
SELECT 
  v.id,
  v.graph_commit_hash,
  v.scc_count,
  v.largest_scc_size,
  v.largest_scc_percentage,
  v.graph_density,
  v.violations,
  v.validated_at,
  jsonb_array_length(v.violations) as violation_count
FROM public.graph_validation_results v
WHERE v.is_valid = false
  AND v.validated_at >= NOW() - INTERVAL '7 days'
ORDER BY v.validated_at DESC;

-- =====================================================
-- GRANTS
-- =====================================================

-- Grant access to authenticated role
GRANT SELECT ON public.graph_validation_results TO authenticated;
GRANT SELECT ON public.sybil_detection_results TO authenticated;
GRANT SELECT ON public.collusion_clusters TO authenticated;
GRANT SELECT ON public.merkle_proofs_cache TO authenticated;
GRANT SELECT ON public.v_suspicious_agents TO authenticated;
GRANT SELECT ON public.v_active_collusion_clusters TO authenticated;
GRANT SELECT ON public.v_recent_validation_failures TO authenticated;

GRANT EXECUTE ON FUNCTION get_latest_validation_result(VARCHAR(64)) TO authenticated;
GRANT EXECUTE ON FUNCTION get_latest_sybil_detection(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_agent_in_collusion_cluster(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cached_merkle_proof(TEXT, BIGINT) TO authenticated;

-- Grant full access to service role
GRANT ALL ON public.graph_validation_results TO service_role;
GRANT ALL ON public.sybil_detection_results TO service_role;
GRANT ALL ON public.collusion_clusters TO service_role;
GRANT ALL ON public.merkle_proofs_cache TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.graph_validation_results IS 'Results of graph structure validation including SCC analysis and invariant checks';
COMMENT ON TABLE public.sybil_detection_results IS 'Sybil attack detection results based on information-theoretic quality metrics';
COMMENT ON TABLE public.collusion_clusters IS 'Detected clusters of agents exhibiting coordinated behavior';
COMMENT ON TABLE public.merkle_proofs_cache IS 'Cache of Merkle proofs for efficient verification (TTL: 1 hour)';

COMMENT ON COLUMN public.graph_validation_results.scc_count IS 'Number of strongly connected components detected';
COMMENT ON COLUMN public.graph_validation_results.largest_scc_percentage IS 'Percentage of graph in largest SCC (must be <= 20%)';
COMMENT ON COLUMN public.graph_validation_results.graph_density IS 'Graph density (must be <= 0.3 for sparse graph requirement)';
COMMENT ON COLUMN public.graph_validation_results.violations IS 'Array of GraphViolation objects detailing constraint violations';

COMMENT ON COLUMN public.sybil_detection_results.novelty_volume_ratio IS 'Ratio of novel content to total volume (threshold: 0.3)';
COMMENT ON COLUMN public.sybil_detection_results.entropy_score IS 'Shannon entropy score measuring information content';
COMMENT ON COLUMN public.sybil_detection_results.indicators IS 'Array of SybilIndicator objects with evidence';

COMMENT ON COLUMN public.collusion_clusters.avg_correlation IS 'Average Pearson correlation between agent contribution patterns';
COMMENT ON COLUMN public.collusion_clusters.graph_similarity IS 'Graph edit distance similarity score';
COMMENT ON COLUMN public.collusion_clusters.entity_overlap IS 'Jaccard similarity of entity sets';
COMMENT ON COLUMN public.collusion_clusters.evidence IS 'Array of CollusionEvidence objects';

COMMENT ON FUNCTION get_latest_validation_result IS 'Get most recent validation result for a graph commit';
COMMENT ON FUNCTION get_latest_sybil_detection IS 'Get most recent Sybil detection result for an agent';
COMMENT ON FUNCTION is_agent_in_collusion_cluster IS 'Check if agent is part of any active collusion cluster';
COMMENT ON FUNCTION get_cached_merkle_proof IS 'Retrieve cached Merkle proof if not expired';
COMMENT ON FUNCTION cache_merkle_proof IS 'Store Merkle proof in cache with TTL';
COMMENT ON FUNCTION cleanup_expired_merkle_proofs IS 'Remove expired Merkle proofs from cache';

COMMENT ON VIEW public.v_suspicious_agents IS 'Latest Sybil detection results for suspicious agents (last 30 days)';
COMMENT ON VIEW public.v_active_collusion_clusters IS 'Active collusion clusters pending verification or verified (last 30 days)';
COMMENT ON VIEW public.v_recent_validation_failures IS 'Recent graph validation failures with violation details (last 7 days)';
