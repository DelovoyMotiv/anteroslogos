/**
 * Byzantine Fault Tolerance Storage Layer
 * Type-safe Supabase client wrapper for BFT consensus operations
 * 
 * Handles:
 * - Consensus log persistence
 * - Byzantine evidence storage
 * - Agent stake queries
 * - Atomic operations with proper error handling
 * 
 * @module lib/bft/storage
 * @version 1.0.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  ConsensusStatus, 
  ByzantineReason,
  ByzantineProof,
  AgentStake 
} from './types';

// =====================================================
// TYPES
// =====================================================

/**
 * Database row types (matching SQL schema)
 */
interface ConsensusLogRow {
  id: string;
  request_id: string;
  operation: string;
  view_number: number;
  sequence_number: number;
  digest: string;
  quorum_nodes: string[];
  commits_received: number;
  status: ConsensusStatus;
  payload: unknown;
  client_id: string;
  execution_time_ms: number | null;
  executed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ByzantineEvidenceRow {
  id: string;
  accused_node: string;
  reporter_node: string;
  reason: ByzantineReason;
  proof: unknown; // JSONB
  evidence_hash: string;
  slash_tx_hash: string | null;
  status: 'PENDING' | 'VERIFIED' | 'SLASHED' | 'REJECTED';
  metadata: unknown;
  reported_at: string;
  verified_at: string | null;
  slashed_at: string | null;
  updated_at: string;
}

interface AgentStakeRow {
  agent_address: string;
  node_id: string;
  staked_amount: string; // DECIMAL as string
  is_slashed: boolean;
  last_slash_time: string | null;
  last_slash_amount: string | null;
  total_slashed: string;
  stake_tx_hash: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
}

/**
 * Consensus statistics from view
 */
export interface ConsensusStatistics {
  operation: string;
  totalRequests: number;
  committedCount: number;
  failedCount: number;
  timeoutCount: number;
  avgExecutionMs: number | null;
  maxExecutionMs: number | null;
  minExecutionMs: number | null;
}

/**
 * Byzantine statistics from view
 */
export interface ByzantineStatistics {
  accusedNode: string;
  totalReports: number;
  verifiedCount: number;
  slashedCount: number;
  lastReported: string;
  reportedReasons: ByzantineReason[];
}

// =====================================================
// BFT STORAGE CLIENT
// =====================================================

export class BFTStorage {
  private supabase: SupabaseClient;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    const url = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Supabase credentials not provided for BFT storage');
    }

    this.supabase = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  // =====================================================
  // CONSENSUS LOG OPERATIONS
  // =====================================================

  /**
   * Record consensus result atomically
   */
  async recordConsensusResult(params: {
    requestId: string;
    operation: string;
    digest: string;
    quorumNodes: string[];
    commitsReceived: number;
    status: ConsensusStatus;
    payload: unknown;
    clientId: string;
    executionTimeMs?: number;
  }): Promise<string> {
    const { data, error } = await this.supabase.rpc('record_consensus_result', {
      p_request_id: params.requestId,
      p_operation: params.operation,
      p_digest: params.digest,
      p_quorum_nodes: params.quorumNodes,
      p_commits_received: params.commitsReceived,
      p_status: params.status,
      p_payload: params.payload,
      p_client_id: params.clientId,
      p_execution_time_ms: params.executionTimeMs || null,
    });

    if (error) {
      throw new Error(`Failed to record consensus result: ${error.message}`);
    }

    return data as string; // Returns UUID
  }

  /**
   * Get consensus log entry by request ID
   */
  async getConsensusLogByRequestId(requestId: string): Promise<ConsensusLogRow | null> {
    const { data, error } = await this.supabase
      .from('a2a_consensus_log')
      .select('*')
      .eq('request_id', requestId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get consensus log: ${error.message}`);
    }

    return data as ConsensusLogRow;
  }

  /**
   * Query consensus logs with filters
   */
  async queryConsensusLogs(filters: {
    operation?: string;
    status?: ConsensusStatus;
    clientId?: string;
    limit?: number;
    offset?: number;
  }): Promise<ConsensusLogRow[]> {
    let query = this.supabase
      .from('a2a_consensus_log')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.operation) {
      query = query.eq('operation', filters.operation);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.clientId) {
      query = query.eq('client_id', filters.clientId);
    }

    const limit = filters.limit || 100;
    const offset = filters.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to query consensus logs: ${error.message}`);
    }

    return (data as ConsensusLogRow[]) || [];
  }

  /**
   * Get consensus statistics (last 24 hours)
   */
  async getConsensusStatistics(): Promise<ConsensusStatistics[]> {
    const { data, error } = await this.supabase
      .from('v_consensus_statistics')
      .select('*');

    if (error) {
      throw new Error(`Failed to get consensus statistics: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      operation: row.operation,
      totalRequests: row.total_requests,
      committedCount: row.committed_count,
      failedCount: row.failed_count,
      timeoutCount: row.timeout_count,
      avgExecutionMs: row.avg_execution_ms,
      maxExecutionMs: row.max_execution_ms,
      minExecutionMs: row.min_execution_ms,
    }));
  }

  // =====================================================
  // BYZANTINE EVIDENCE OPERATIONS
  // =====================================================

  /**
   * Submit Byzantine evidence
   */
  async submitByzantineEvidence(params: {
    accusedNode: string;
    reporterNode: string;
    reason: ByzantineReason;
    proof: ByzantineProof;
    evidenceHash: string;
  }): Promise<string> {
    const { data, error } = await this.supabase
      .from('a2a_byzantine_evidence')
      .insert({
        accused_node: params.accusedNode,
        reporter_node: params.reporterNode,
        reason: params.reason,
        proof: params.proof,
        evidence_hash: params.evidenceHash,
        status: 'PENDING',
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to submit Byzantine evidence: ${error.message}`);
    }

    return (data as { id: string }).id;
  }

  /**
   * Update Byzantine evidence status
   */
  async updateByzantineEvidenceStatus(params: {
    evidenceId: string;
    status: 'VERIFIED' | 'SLASHED' | 'REJECTED';
    slashTxHash?: string;
  }): Promise<void> {
    const updateData: any = {
      status: params.status,
    };

    if (params.slashTxHash) {
      updateData.slash_tx_hash = params.slashTxHash;
    }

    const { error } = await this.supabase
      .from('a2a_byzantine_evidence')
      .update(updateData)
      .eq('id', params.evidenceId);

    if (error) {
      throw new Error(`Failed to update Byzantine evidence: ${error.message}`);
    }
  }

  /**
   * Get Byzantine evidence for node
   */
  async getByzantineEvidenceForNode(nodeId: string, limit: number = 50): Promise<ByzantineEvidenceRow[]> {
    const { data, error } = await this.supabase
      .from('a2a_byzantine_evidence')
      .select('*')
      .eq('accused_node', nodeId)
      .order('reported_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get Byzantine evidence: ${error.message}`);
    }

    return (data as ByzantineEvidenceRow[]) || [];
  }

  /**
   * Count verified evidence for node (last 30 days)
   */
  async countVerifiedEvidenceForNode(nodeId: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count, error } = await this.supabase
      .from('a2a_byzantine_evidence')
      .select('*', { count: 'exact', head: true })
      .eq('accused_node', nodeId)
      .in('status', ['VERIFIED', 'SLASHED'])
      .gte('reported_at', thirtyDaysAgo.toISOString());

    if (error) {
      throw new Error(`Failed to count Byzantine evidence: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Get Byzantine statistics (last 7 days)
   */
  async getByzantineStatistics(): Promise<ByzantineStatistics[]> {
    const { data, error } = await this.supabase
      .from('v_byzantine_statistics')
      .select('*');

    if (error) {
      throw new Error(`Failed to get Byzantine statistics: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      accusedNode: row.accused_node,
      totalReports: row.total_reports,
      verifiedCount: row.verified_count,
      slashedCount: row.slashed_count,
      lastReported: row.last_reported,
      reportedReasons: row.reported_reasons || [],
    }));
  }

  // =====================================================
  // AGENT STAKE OPERATIONS
  // =====================================================

  /**
   * Get agent stake by node ID
   */
  async getAgentStakeByNodeId(nodeId: string): Promise<AgentStake | null> {
    const { data, error } = await this.supabase
      .from('a2a_agent_stakes')
      .select('*')
      .eq('node_id', nodeId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get agent stake: ${error.message}`);
    }

    const row = data as AgentStakeRow;
    return this.mapAgentStakeRowToType(row);
  }

  /**
   * Get agent stake by address
   */
  async getAgentStakeByAddress(address: string): Promise<AgentStake | null> {
    const { data, error } = await this.supabase
      .from('a2a_agent_stakes')
      .select('*')
      .eq('agent_address', address)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get agent stake: ${error.message}`);
    }

    const row = data as AgentStakeRow;
    return this.mapAgentStakeRowToType(row);
  }

  /**
   * Query eligible nodes for consensus (staked + not slashed)
   */
  async getEligibleConsensusNodes(minStake: number = 100, limit: number = 20): Promise<AgentStake[]> {
    const { data, error } = await this.supabase
      .from('a2a_agent_stakes')
      .select('*')
      .gte('staked_amount', minStake)
      .eq('is_slashed', false)
      .order('staked_amount', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get eligible consensus nodes: ${error.message}`);
    }

    return ((data as AgentStakeRow[]) || []).map(row => this.mapAgentStakeRowToType(row));
  }

  /**
   * Check if node can participate in consensus
   */
  async canParticipateInConsensus(nodeId: string): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('can_participate_in_consensus', {
      p_node_id: nodeId,
    });

    if (error) {
      throw new Error(`Failed to check consensus participation: ${error.message}`);
    }

    return data as boolean;
  }

  /**
   * Get Byzantine reputation score (0-100)
   */
  async getByzantineReputation(nodeId: string): Promise<number> {
    const { data, error } = await this.supabase.rpc('get_byzantine_reputation', {
      p_node_id: nodeId,
    });

    if (error) {
      throw new Error(`Failed to get Byzantine reputation: ${error.message}`);
    }

    return data as number;
  }

  /**
   * Upsert agent stake (for blockchain sync)
   */
  async upsertAgentStake(params: {
    agentAddress: string;
    nodeId: string;
    stakedAmount: number;
    isSlashed?: boolean;
    stakeTxHash?: string;
  }): Promise<void> {
    const { error } = await this.supabase
      .from('a2a_agent_stakes')
      .upsert({
        agent_address: params.agentAddress,
        node_id: params.nodeId,
        staked_amount: params.stakedAmount,
        is_slashed: params.isSlashed || false,
        stake_tx_hash: params.stakeTxHash || null,
      });

    if (error) {
      throw new Error(`Failed to upsert agent stake: ${error.message}`);
    }
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Map database row to AgentStake type
   */
  private mapAgentStakeRowToType(row: AgentStakeRow): AgentStake {
    const stakedAmount = parseFloat(row.staked_amount);
    const canParticipate = stakedAmount >= 100 && !row.is_slashed;

    return {
      agentAddress: row.agent_address,
      nodeId: row.node_id,
      stakedAmount,
      isSlashed: row.is_slashed,
      lastSlashTime: row.last_slash_time ? new Date(row.last_slash_time) : undefined,
      canParticipate,
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Health check (test database connection)
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('a2a_consensus_log')
        .select('id')
        .limit(1);

      return !error;
    } catch {
      return false;
    }
  }
}

/**
 * Singleton instance (lazy initialization)
 */
let bftStorageInstance: BFTStorage | null = null;

export function getBFTStorage(): BFTStorage {
  if (!bftStorageInstance) {
    bftStorageInstance = new BFTStorage();
  }
  return bftStorageInstance;
}
