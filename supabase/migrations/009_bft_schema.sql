--
-- Byzantine Fault Tolerance (BFT) Schema
-- PBFT consensus logs, Byzantine evidence, agent stakes
-- Migration: 009
-- Created: 2025-11-22
--

-- =====================================================
-- CONSENSUS LOG TABLE
-- =====================================================

CREATE TABLE public.a2a_consensus_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE, -- ULID
  operation TEXT NOT NULL CHECK (operation IN ('PAYMENT_VERIFY', 'REPUTATION_UPDATE', 'AUDIT_DEEP', 'MESH_TOPOLOGY_CHANGE')),
  view_number INTEGER NOT NULL DEFAULT 0,
  sequence_number INTEGER NOT NULL,
  digest TEXT NOT NULL CHECK (digest ~ '^[a-f0-9]{64}$'), -- SHA-256 hex
  quorum_nodes TEXT[] NOT NULL DEFAULT '{}', -- Array of node IDs
  commits_received INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMMITTED', 'FAILED', 'TIMEOUT')),
  payload JSONB NOT NULL,
  client_id TEXT NOT NULL, -- Node ID of requester
  execution_time_ms INTEGER,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_commits CHECK (commits_received >= 0 AND commits_received <= 7),
  CONSTRAINT valid_sequence CHECK (sequence_number > 0)
);

-- Indexes for consensus log
CREATE INDEX idx_consensus_log_request_id ON public.a2a_consensus_log(request_id);
CREATE INDEX idx_consensus_log_digest ON public.a2a_consensus_log(digest);
CREATE INDEX idx_consensus_log_status ON public.a2a_consensus_log(status, created_at DESC);
CREATE INDEX idx_consensus_log_operation ON public.a2a_consensus_log(operation, created_at DESC);
CREATE INDEX idx_consensus_log_sequence ON public.a2a_consensus_log(view_number, sequence_number);

-- =====================================================
-- BYZANTINE EVIDENCE TABLE
-- =====================================================

CREATE TABLE public.a2a_byzantine_evidence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  accused_node TEXT NOT NULL,
  reporter_node TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('INVALID_SIGNATURE', 'DIGEST_MISMATCH', 'EQUIVOCATION', 'TIMEOUT', 'INVALID_PROOF')),
  proof JSONB NOT NULL, -- Contains message1, message2 (optional), zkProofHash
  evidence_hash TEXT NOT NULL CHECK (evidence_hash ~ '^[a-f0-9]{64}$'), -- SHA-256 of proof
  slash_tx_hash TEXT CHECK (slash_tx_hash IS NULL OR slash_tx_hash ~ '^0x[a-fA-F0-9]{64}$'), -- Base L2 tx hash
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'SLASHED', 'REJECTED')),
  metadata JSONB DEFAULT '{}'::jsonb,
  reported_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  verified_at TIMESTAMPTZ,
  slashed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT accused_not_reporter CHECK (accused_node != reporter_node),
  CONSTRAINT slash_tx_only_when_slashed CHECK (status = 'SLASHED' OR slash_tx_hash IS NULL)
);

-- Indexes for Byzantine evidence
CREATE INDEX idx_byzantine_evidence_accused ON public.a2a_byzantine_evidence(accused_node, reported_at DESC);
CREATE INDEX idx_byzantine_evidence_reporter ON public.a2a_byzantine_evidence(reporter_node, reported_at DESC);
CREATE INDEX idx_byzantine_evidence_status ON public.a2a_byzantine_evidence(status, reported_at DESC);
CREATE INDEX idx_byzantine_evidence_reason ON public.a2a_byzantine_evidence(reason, reported_at DESC);
CREATE INDEX idx_byzantine_evidence_hash ON public.a2a_byzantine_evidence(evidence_hash) WHERE status = 'VERIFIED';

-- =====================================================
-- AGENT STAKES TABLE
-- =====================================================

CREATE TABLE public.a2a_agent_stakes (
  agent_address TEXT PRIMARY KEY CHECK (agent_address ~ '^0x[a-fA-F0-9]{40}$'), -- Ethereum address
  node_id TEXT NOT NULL UNIQUE, -- DHT node ID
  staked_amount DECIMAL(18, 6) NOT NULL CHECK (staked_amount >= 0),
  is_slashed BOOLEAN DEFAULT FALSE NOT NULL,
  last_slash_time TIMESTAMPTZ,
  last_slash_amount DECIMAL(18, 6),
  total_slashed DECIMAL(18, 6) DEFAULT 0 CHECK (total_slashed >= 0),
  stake_tx_hash TEXT CHECK (stake_tx_hash IS NULL OR stake_tx_hash ~ '^0x[a-fA-F0-9]{64}$'), -- Base L2 stake tx
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT min_stake_for_slashed CHECK (NOT is_slashed OR staked_amount >= 0)
);

-- Indexes for agent stakes
CREATE INDEX idx_agent_stakes_node_id ON public.a2a_agent_stakes(node_id);
CREATE INDEX idx_agent_stakes_amount ON public.a2a_agent_stakes(staked_amount DESC) WHERE NOT is_slashed;
CREATE INDEX idx_agent_stakes_slashed ON public.a2a_agent_stakes(is_slashed, last_slash_time DESC) WHERE is_slashed;

-- =====================================================
-- CONSENSUS STATISTICS VIEW
-- =====================================================

CREATE OR REPLACE VIEW public.v_consensus_statistics AS
SELECT
  operation,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status = 'COMMITTED') as committed_count,
  COUNT(*) FILTER (WHERE status = 'FAILED') as failed_count,
  COUNT(*) FILTER (WHERE status = 'TIMEOUT') as timeout_count,
  AVG(execution_time_ms) FILTER (WHERE status = 'COMMITTED') as avg_execution_ms,
  MAX(execution_time_ms) FILTER (WHERE status = 'COMMITTED') as max_execution_ms,
  MIN(execution_time_ms) FILTER (WHERE status = 'COMMITTED') as min_execution_ms
FROM public.a2a_consensus_log
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY operation;

-- =====================================================
-- BYZANTINE DETECTION STATISTICS VIEW
-- =====================================================

CREATE OR REPLACE VIEW public.v_byzantine_statistics AS
SELECT
  accused_node,
  COUNT(*) as total_reports,
  COUNT(*) FILTER (WHERE status = 'VERIFIED') as verified_count,
  COUNT(*) FILTER (WHERE status = 'SLASHED') as slashed_count,
  MAX(reported_at) as last_reported,
  array_agg(DISTINCT reason) as reported_reasons
FROM public.a2a_byzantine_evidence
WHERE reported_at >= NOW() - INTERVAL '7 days'
GROUP BY accused_node
ORDER BY total_reports DESC;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Updated_at trigger for consensus_log
CREATE OR REPLACE FUNCTION update_consensus_log_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_consensus_log_updated
BEFORE UPDATE ON public.a2a_consensus_log
FOR EACH ROW
EXECUTE FUNCTION update_consensus_log_timestamp();

-- Updated_at trigger for byzantine_evidence
CREATE OR REPLACE FUNCTION update_byzantine_evidence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- Auto-set verified_at when status changes to VERIFIED
  IF NEW.status = 'VERIFIED' AND OLD.status != 'VERIFIED' THEN
    NEW.verified_at = NOW();
  END IF;
  
  -- Auto-set slashed_at when status changes to SLASHED
  IF NEW.status = 'SLASHED' AND OLD.status != 'SLASHED' THEN
    NEW.slashed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_byzantine_evidence_updated
BEFORE UPDATE ON public.a2a_byzantine_evidence
FOR EACH ROW
EXECUTE FUNCTION update_byzantine_evidence_timestamp();

-- Updated_at trigger for agent_stakes
CREATE OR REPLACE FUNCTION update_agent_stakes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_agent_stakes_updated
BEFORE UPDATE ON public.a2a_agent_stakes
FOR EACH ROW
EXECUTE FUNCTION update_agent_stakes_timestamp();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.a2a_consensus_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.a2a_byzantine_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.a2a_agent_stakes ENABLE ROW LEVEL SECURITY;

-- Consensus log: read-only for all authenticated users
CREATE POLICY "Consensus log read for authenticated users"
ON public.a2a_consensus_log
FOR SELECT
TO authenticated
USING (true);

-- Consensus log: write only via service role
CREATE POLICY "Consensus log write via service role"
ON public.a2a_consensus_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Byzantine evidence: read for all authenticated
CREATE POLICY "Byzantine evidence read for authenticated"
ON public.a2a_byzantine_evidence
FOR SELECT
TO authenticated
USING (true);

-- Byzantine evidence: write for authenticated (reporters)
CREATE POLICY "Byzantine evidence write for authenticated"
ON public.a2a_byzantine_evidence
FOR INSERT
TO authenticated
WITH CHECK (true); -- Reporter validation happens in application layer

-- Byzantine evidence: update only via service role (status changes)
CREATE POLICY "Byzantine evidence update via service role"
ON public.a2a_byzantine_evidence
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Agent stakes: read for all authenticated
CREATE POLICY "Agent stakes read for authenticated"
ON public.a2a_agent_stakes
FOR SELECT
TO authenticated
USING (true);

-- Agent stakes: write only via service role (blockchain sync)
CREATE POLICY "Agent stakes write via service role"
ON public.a2a_agent_stakes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

/**
 * Check if agent can participate in consensus
 * @param p_node_id - DHT node ID
 * @returns boolean
 */
CREATE OR REPLACE FUNCTION can_participate_in_consensus(p_node_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_stake RECORD;
BEGIN
  SELECT staked_amount, is_slashed
  INTO v_stake
  FROM public.a2a_agent_stakes
  WHERE node_id = p_node_id;
  
  -- No stake record = can't participate
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Must have >= 100 USDC and not slashed
  RETURN v_stake.staked_amount >= 100 AND NOT v_stake.is_slashed;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Get Byzantine reputation score (0-100, inversely proportional to evidence)
 * @param p_node_id - DHT node ID
 * @returns integer 0-100
 */
CREATE OR REPLACE FUNCTION get_byzantine_reputation(p_node_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_evidence_count INTEGER;
  v_slashed BOOLEAN;
BEGIN
  -- Check if slashed
  SELECT is_slashed INTO v_slashed
  FROM public.a2a_agent_stakes
  WHERE node_id = p_node_id;
  
  IF v_slashed THEN
    RETURN 0; -- Slashed nodes have 0 reputation
  END IF;
  
  -- Count verified evidence in last 30 days
  SELECT COUNT(*)
  INTO v_evidence_count
  FROM public.a2a_byzantine_evidence
  WHERE accused_node = p_node_id
    AND status IN ('VERIFIED', 'SLASHED')
    AND reported_at >= NOW() - INTERVAL '30 days';
  
  -- Reputation decreases by 20 points per verified evidence
  -- Minimum 0, maximum 100
  RETURN GREATEST(0, 100 - (v_evidence_count * 20));
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Record consensus result (atomic)
 * @param p_request_id - ULID
 * @param p_operation - Operation type
 * @param p_digest - SHA-256 digest
 * @param p_quorum_nodes - Array of node IDs
 * @param p_commits_received - Number of commits
 * @param p_status - Final status
 * @param p_payload - Request payload
 * @param p_client_id - Client node ID
 * @param p_execution_time_ms - Execution time
 * @returns uuid (consensus log ID)
 */
CREATE OR REPLACE FUNCTION record_consensus_result(
  p_request_id TEXT,
  p_operation TEXT,
  p_digest TEXT,
  p_quorum_nodes TEXT[],
  p_commits_received INTEGER,
  p_status TEXT,
  p_payload JSONB,
  p_client_id TEXT,
  p_execution_time_ms INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.a2a_consensus_log (
    request_id,
    operation,
    digest,
    quorum_nodes,
    commits_received,
    status,
    payload,
    client_id,
    execution_time_ms,
    executed_at
  ) VALUES (
    p_request_id,
    p_operation,
    p_digest,
    p_quorum_nodes,
    p_commits_received,
    p_status,
    p_payload,
    p_client_id,
    p_execution_time_ms,
    CASE WHEN p_status = 'COMMITTED' THEN NOW() ELSE NULL END
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GRANTS
-- =====================================================

-- Grant access to authenticated role
GRANT SELECT ON public.a2a_consensus_log TO authenticated;
GRANT SELECT ON public.a2a_byzantine_evidence TO authenticated;
GRANT INSERT ON public.a2a_byzantine_evidence TO authenticated;
GRANT SELECT ON public.a2a_agent_stakes TO authenticated;
GRANT SELECT ON public.v_consensus_statistics TO authenticated;
GRANT SELECT ON public.v_byzantine_statistics TO authenticated;

-- Grant full access to service role
GRANT ALL ON public.a2a_consensus_log TO service_role;
GRANT ALL ON public.a2a_byzantine_evidence TO service_role;
GRANT ALL ON public.a2a_agent_stakes TO service_role;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.a2a_consensus_log IS 'PBFT consensus audit trail for Agent Mesh Network';
COMMENT ON TABLE public.a2a_byzantine_evidence IS 'Byzantine behavior evidence for slashing mechanism';
COMMENT ON TABLE public.a2a_agent_stakes IS 'Agent stake amounts from Base L2 blockchain (mirror)';

COMMENT ON COLUMN public.a2a_consensus_log.request_id IS 'ULID identifier for consensus request';
COMMENT ON COLUMN public.a2a_consensus_log.digest IS 'SHA-256 digest of request payload';
COMMENT ON COLUMN public.a2a_consensus_log.quorum_nodes IS 'Array of 7 node IDs participating in consensus';
COMMENT ON COLUMN public.a2a_consensus_log.commits_received IS 'Number of COMMIT messages received (need 2f+1=5)';

COMMENT ON COLUMN public.a2a_byzantine_evidence.proof IS 'JSONB containing conflicting messages and ZKP hash';
COMMENT ON COLUMN public.a2a_byzantine_evidence.evidence_hash IS 'SHA-256 hash of proof for deduplication';
COMMENT ON COLUMN public.a2a_byzantine_evidence.slash_tx_hash IS 'Base L2 transaction hash for on-chain slashing';

COMMENT ON COLUMN public.a2a_agent_stakes.staked_amount IS 'USDC amount staked (must be >= 100 for consensus participation)';
COMMENT ON COLUMN public.a2a_agent_stakes.total_slashed IS 'Total USDC slashed historically';

COMMENT ON FUNCTION can_participate_in_consensus IS 'Check if agent meets minimum stake (100 USDC) and is not slashed';
COMMENT ON FUNCTION get_byzantine_reputation IS 'Calculate reputation score 0-100 inversely proportional to verified evidence';
COMMENT ON FUNCTION record_consensus_result IS 'Atomically record consensus round result with execution time';
