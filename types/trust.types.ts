/**
 * Trust System Type Definitions - Production-Grade Type Safety
 * 
 * Type system for trust ledger, middleware, and consensus components.
 * 
 * @module types/trust.types
 */

import type { JSONValue, JSONObject } from './common.types';

// DIDString type (from UAP protocol)
export type DIDString = string;

// =====================================================
// TRUST HISTORY TYPES
// =====================================================

/**
 * Agent trust history
 */
export interface AgentTrustHistory {
  totalRounds: number;
  successfulRounds: number;
  failedRounds: number;
  uptime: number;
  endorsements: number;
  causalContributions: number;
  lastActive: string;
  metadata?: JSONObject;
}

/**
 * Trust score components
 */
export interface TrustScoreComponents {
  consensusParticipation: number;
  watermarkVerification: number;
  uptime: number;
  endorsements: number;
  causalContribution: number;
  overall: number;
}

/**
 * Attestation result
 */
export interface AttestationResult {
  attestation: string;
  signature: string;
  timestamp: string;
  scoreComponents: TrustScoreComponents;
  metadata?: JSONObject;
}

// =====================================================
// CONSENSUS TYPES
// =====================================================

/**
 * Consensus node state
 */
export interface ConsensusNodeState {
  committedBlocks: ConsensusBlock[];
  viewNumber: number;
  currentLeader?: string;
  metadata?: JSONObject;
}

/**
 * Consensus block
 */
export interface ConsensusBlock {
  viewNumber: number;
  blockNumber: number;
  hash: string;
  previousHash: string;
  timestamp: string;
  transactions: ConsensusTransaction[];
  votes: ConsensusVote[];
  proposer: string;
  metadata?: JSONObject;
}

/**
 * Consensus transaction
 */
export interface ConsensusTransaction {
  id: string;
  type: string;
  data: JSONValue;
  timestamp: string;
  signature?: string;
}

/**
 * Consensus vote
 */
export interface ConsensusVote {
  nodeId: string;
  blockHash: string;
  viewNumber: number;
  signature: string;
  timestamp: string;
}

/**
 * Consensus node interface (minimal)
 */
export interface MinimalConsensusNode {
  getState?(): ConsensusNodeState;
  getBlockByNumber?(blockNumber: number): ConsensusBlock | null;
  getBlocksByRange?(from: number, to: number): ConsensusBlock[];
  getCurrentView?(): number;
  isLeader?(): boolean;
}

// =====================================================
// LEDGER QUERY TYPES
// =====================================================

/**
 * Ledger query parameters
 */
export interface LedgerQueryParams {
  agentDid: DIDString;
  fromRound?: number;
  toRound?: number;
  includeVotes?: boolean;
  includeTransactions?: boolean;
  limit?: number;
}

/**
 * Ledger query result
 */
export interface LedgerQueryResult {
  blocks: ConsensusBlock[];
  totalBlocks: number;
  participationRate: number;
  metadata?: JSONObject;
}

// =====================================================
// MESH ROUTER STORAGE TYPES
// =====================================================

/**
 * Mesh router storage interface (minimal)
 */
export interface MinimalMeshRouterStorage {
  localAidUri: string;
  localNodeId: string;
  get?(key: string): Promise<JSONValue | null>;
  set?(key: string, value: JSONValue): Promise<void>;
  delete?(key: string): Promise<void>;
}

// =====================================================
// TYPE GUARDS
// =====================================================

/**
 * Type guard for AgentTrustHistory
 */
export function isAgentTrustHistory(obj: unknown): obj is AgentTrustHistory {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'totalRounds' in obj &&
    'successfulRounds' in obj &&
    typeof (obj as AgentTrustHistory).totalRounds === 'number'
  );
}

/**
 * Type guard for ConsensusNodeState
 */
export function isConsensusNodeState(obj: unknown): obj is ConsensusNodeState {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'committedBlocks' in obj &&
    Array.isArray((obj as ConsensusNodeState).committedBlocks)
  );
}

/**
 * Type guard for ConsensusBlock
 */
export function isConsensusBlock(obj: unknown): obj is ConsensusBlock {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'viewNumber' in obj &&
    'blockNumber' in obj &&
    'hash' in obj &&
    typeof (obj as ConsensusBlock).viewNumber === 'number'
  );
}

/**
 * Type guard for MinimalConsensusNode
 */
export function isMinimalConsensusNode(obj: unknown): obj is MinimalConsensusNode {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    ('getState' in obj || 'getBlockByNumber' in obj || 'getCurrentView' in obj)
  );
}

// =====================================================
// UTILITY TYPES
// =====================================================

/**
 * Trust score calculator function
 */
export type TrustScoreCalculator = (
  history: AgentTrustHistory,
  agentDid: DIDString
) => Promise<TrustScoreComponents>;

/**
 * Attestation generator function
 */
export type AttestationGenerator = (
  agentDid: DIDString,
  history: AgentTrustHistory,
  scoreComponents: TrustScoreComponents
) => Promise<AttestationResult>;

/**
 * Block filter function
 */
export type BlockFilterFunction = (
  block: ConsensusBlock,
  params: LedgerQueryParams
) => boolean;

/**
 * Vote finder function
 */
export type VoteFinderFunction = (
  votes: ConsensusVote[],
  agentDid: DIDString
) => ConsensusVote | undefined;

/**
 * Participation calculator function
 */
export type ParticipationCalculator = (
  blocks: ConsensusBlock[],
  agentDid: DIDString
) => number;
