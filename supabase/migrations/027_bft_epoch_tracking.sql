--
-- Byzantine Fault Tolerance - Epoch Tracking Schema
-- Temporal ordering for circular dependency prevention
-- Migration: 027
-- Created: 2025-12-04
--

-- =====================================================
-- BFT EPOCH COMMITS TABLE
-- =====================================================

CREATE TABLE public.bft_epoch_commits (
  epoch_number BIGINT PRIMARY KEY,
  graph_commit_hash VARCHAR(64) NOT NULL CHECK (graph_commit_hash ~ '^[a-f0-9]{64}$'), -- SHA-256 hex
  previous_epoch_hash VARCHAR(64) CHECK (previous_epoch_hash ~ '^[a-f0-9]{64}$'), -- SHA-256 hex, NULL for epoch 0
  merkle_root VARCHAR(64) NOT NULL CHECK (merkle_root ~ '^[a-f0-9]{64}$'), -- SHA-256 hex
  node_count INTEGER NOT NULL CHECK (node_count >= 0),
  edge_count INTEGER NOT NULL CHECK (edge_count >= 0),
  signature TEXT NOT NULL, -- Ed25519 signature (base64)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_epoch_number CHECK (epoch_number >= 0),
  CONSTRAINT first_epoch_no_previous CHECK (epoch_number > 0 OR previous_epoch_hash IS NULL),
  CONSTRAINT later_epochs_have_previous CHECK (epoch_number = 0 OR previous_epoch_hash IS NOT NULL)
);

-- Indexes for epoch commits
CREATE INDEX idx_epoch_commits_graph_hash ON public.bft_epoch_commits(graph_commit_hash);
CREATE INDEX idx_epoch_commits_previous_hash ON public.bft_epoch_commits(previous_epoch_hash) WHERE previous_epoch_hash IS NOT NULL;
CREATE INDEX idx_epoch_commits_created_at ON public.bft_epoch_commits(created_at DESC);
CREATE INDEX idx_epoch_commits_merkle_root ON public.bft_epoch_commits(merkle_root);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Prevent updates to epoch commits (immutable)
CREATE OR REPLACE FUNCTION prevent_epoch_commit_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Epoch commits are immutable and cannot be updated';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_epoch_commit_update
BEFORE UPDATE ON public.bft_epoch_commits
FOR EACH ROW
EXECUTE FUNCTION prevent_epoch_commit_update();

-- Validate epoch chain on insert
CREATE OR REPLACE FUNCTION validate_epoch_chain()
RETURNS TRIGGER AS $$
DECLARE
  v_previous_commit RECORD;
BEGIN
  -- For epoch 0, no validation needed
  IF NEW.epoch_number = 0 THEN
    IF NEW.previous_epoch_hash IS NOT NULL THEN
      RAISE EXCEPTION 'Epoch 0 must have NULL previous_epoch_hash';
    END IF;
    RETURN NEW;
  END IF;
  
  -- For later epochs, validate chain
  SELECT graph_commit_hash, epoch_number
  INTO v_previous_commit
  FROM public.bft_epoch_commits
  WHERE epoch_number = NEW.epoch_number - 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Previous epoch % not found', NEW.epoch_number - 1;
  END IF;
  
  IF NEW.previous_epoch_hash != v_previous_commit.graph_commit_hash THEN
    RAISE EXCEPTION 'Epoch chain broken: previous_epoch_hash does not match previous commit hash';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_epoch_chain
BEFORE INSERT ON public.bft_epoch_commits
FOR EACH ROW
EXECUTE FUNCTION validate_epoch_chain();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.bft_epoch_commits ENABLE ROW LEVEL SECURITY;

-- Epoch commits: read for all authenticated users
CREATE POLICY "Epoch commits read for authenticated users"
ON public.bft_epoch_commits
FOR SELECT
TO authenticated
USING (true);

-- Epoch commits: write only via service role
CREATE POLICY "Epoch commits write via service role"
ON public.bft_epoch_commits
FOR INSERT
TO service_role
WITH CHECK (true);

-- Prevent deletes (immutable log)
CREATE POLICY "Epoch commits no delete"
ON public.bft_epoch_commits
FOR DELETE
TO service_role
USING (false);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

/**
 * Get the latest epoch number
 * @returns bigint - Latest epoch number, or -1 if no epochs exist
 */
CREATE OR REPLACE FUNCTION get_latest_epoch_number()
RETURNS BIGINT AS $$
DECLARE
  v_latest_epoch BIGINT;
BEGIN
  SELECT COALESCE(MAX(epoch_number), -1)
  INTO v_latest_epoch
  FROM public.bft_epoch_commits;
  
  RETURN v_latest_epoch;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Get epoch commit by epoch number
 * @param p_epoch_number - Epoch number to retrieve
 * @returns record - Epoch commit record
 */
CREATE OR REPLACE FUNCTION get_epoch_commit(p_epoch_number BIGINT)
RETURNS TABLE (
  epoch_number BIGINT,
  graph_commit_hash VARCHAR(64),
  previous_epoch_hash VARCHAR(64),
  merkle_root VARCHAR(64),
  node_count INTEGER,
  edge_count INTEGER,
  signature TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.epoch_number,
    e.graph_commit_hash,
    e.previous_epoch_hash,
    e.merkle_root,
    e.node_count,
    e.edge_count,
    e.signature,
    e.created_at
  FROM public.bft_epoch_commits e
  WHERE e.epoch_number = p_epoch_number;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Verify epoch chain integrity between two epochs
 * @param p_from_epoch - Starting epoch number
 * @param p_to_epoch - Ending epoch number
 * @returns boolean - True if chain is valid
 */
CREATE OR REPLACE FUNCTION verify_epoch_chain(p_from_epoch BIGINT, p_to_epoch BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_epoch BIGINT;
  v_current_hash VARCHAR(64);
  v_next_previous_hash VARCHAR(64);
BEGIN
  -- Validate input
  IF p_from_epoch < 0 OR p_to_epoch < p_from_epoch THEN
    RETURN FALSE;
  END IF;
  
  -- Get starting hash
  SELECT graph_commit_hash INTO v_current_hash
  FROM public.bft_epoch_commits
  WHERE epoch_number = p_from_epoch;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Verify chain
  FOR v_current_epoch IN (p_from_epoch + 1)..p_to_epoch LOOP
    SELECT previous_epoch_hash INTO v_next_previous_hash
    FROM public.bft_epoch_commits
    WHERE epoch_number = v_current_epoch;
    
    IF NOT FOUND THEN
      RETURN FALSE;
    END IF;
    
    IF v_next_previous_hash != v_current_hash THEN
      RETURN FALSE;
    END IF;
    
    -- Update current hash for next iteration
    SELECT graph_commit_hash INTO v_current_hash
    FROM public.bft_epoch_commits
    WHERE epoch_number = v_current_epoch;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Check if an epoch commit exists
 * @param p_epoch_number - Epoch number to check
 * @returns boolean - True if epoch exists
 */
CREATE OR REPLACE FUNCTION epoch_exists(p_epoch_number BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.bft_epoch_commits
    WHERE epoch_number = p_epoch_number
  );
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Get epoch commits in a range
 * @param p_from_epoch - Starting epoch number
 * @param p_to_epoch - Ending epoch number
 * @returns table - Epoch commits in range
 */
CREATE OR REPLACE FUNCTION get_epoch_range(p_from_epoch BIGINT, p_to_epoch BIGINT)
RETURNS TABLE (
  epoch_number BIGINT,
  graph_commit_hash VARCHAR(64),
  previous_epoch_hash VARCHAR(64),
  merkle_root VARCHAR(64),
  node_count INTEGER,
  edge_count INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.epoch_number,
    e.graph_commit_hash,
    e.previous_epoch_hash,
    e.merkle_root,
    e.node_count,
    e.edge_count,
    e.created_at
  FROM public.bft_epoch_commits e
  WHERE e.epoch_number >= p_from_epoch
    AND e.epoch_number <= p_to_epoch
  ORDER BY e.epoch_number ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- VIEWS
-- =====================================================

/**
 * View of recent epochs with chain validation status
 */
CREATE OR REPLACE VIEW public.v_recent_epochs AS
SELECT 
  e.epoch_number,
  e.graph_commit_hash,
  e.previous_epoch_hash,
  e.merkle_root,
  e.node_count,
  e.edge_count,
  e.created_at,
  CASE 
    WHEN e.epoch_number = 0 THEN true
    WHEN prev.graph_commit_hash = e.previous_epoch_hash THEN true
    ELSE false
  END as chain_valid
FROM public.bft_epoch_commits e
LEFT JOIN public.bft_epoch_commits prev ON prev.epoch_number = e.epoch_number - 1
WHERE e.created_at >= NOW() - INTERVAL '7 days'
ORDER BY e.epoch_number DESC;

-- =====================================================
-- GRANTS
-- =====================================================

-- Grant access to authenticated role
GRANT SELECT ON public.bft_epoch_commits TO authenticated;
GRANT SELECT ON public.v_recent_epochs TO authenticated;
GRANT EXECUTE ON FUNCTION get_latest_epoch_number() TO authenticated;
GRANT EXECUTE ON FUNCTION get_epoch_commit(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_epoch_chain(BIGINT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION epoch_exists(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_epoch_range(BIGINT, BIGINT) TO authenticated;

-- Grant full access to service role
GRANT ALL ON public.bft_epoch_commits TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.bft_epoch_commits IS 'Immutable log of graph state epochs for temporal ordering and circular dependency prevention';
COMMENT ON COLUMN public.bft_epoch_commits.epoch_number IS 'Monotonically increasing epoch number starting from 0';
COMMENT ON COLUMN public.bft_epoch_commits.graph_commit_hash IS 'SHA-256 hash of the Merkle root representing frozen graph state';
COMMENT ON COLUMN public.bft_epoch_commits.previous_epoch_hash IS 'Hash of previous epoch commit, forming blockchain-like chain (NULL for epoch 0)';
COMMENT ON COLUMN public.bft_epoch_commits.merkle_root IS 'Root hash of Merkle tree containing all graph nodes and edges';
COMMENT ON COLUMN public.bft_epoch_commits.node_count IS 'Number of nodes in the graph at this epoch';
COMMENT ON COLUMN public.bft_epoch_commits.edge_count IS 'Number of edges in the graph at this epoch';
COMMENT ON COLUMN public.bft_epoch_commits.signature IS 'Ed25519 signature of the commit hash for authentication';

COMMENT ON FUNCTION get_latest_epoch_number() IS 'Get the most recent epoch number, returns -1 if no epochs exist';
COMMENT ON FUNCTION get_epoch_commit(BIGINT) IS 'Retrieve epoch commit details by epoch number';
COMMENT ON FUNCTION verify_epoch_chain(BIGINT, BIGINT) IS 'Verify integrity of epoch chain between two epoch numbers';
COMMENT ON FUNCTION epoch_exists(BIGINT) IS 'Check if an epoch commit exists for the given epoch number';
COMMENT ON FUNCTION get_epoch_range(BIGINT, BIGINT) IS 'Get all epoch commits within a specified range';

COMMENT ON VIEW public.v_recent_epochs IS 'Recent epochs (last 7 days) with chain validation status';
