/**
 * Byzantine Fault Tolerance Type Definitions
 * PBFT (Practical Byzantine Fault Tolerance) protocol types
 * 
 * Based on:
 * - Castro & Liskov (1999) "Practical Byzantine Fault Tolerance"
 * - PBFT consensus for Agent Mesh Network
 * 
 * @module lib/bft/types
 * @version 1.0.0
 */

import { z } from 'zod';

// =====================================================
// PBFT MESSAGE TYPES
// =====================================================

/**
 * PBFT message type enum
 */
export type PBFTMessageType = 'PRE_PREPARE' | 'PREPARE' | 'COMMIT' | 'VIEW_CHANGE' | 'NEW_VIEW';

/**
 * PBFT consensus operation types
 */
export type ConsensusOperation = 
  | 'PAYMENT_VERIFY'     // Payment verification >10 USDC
  | 'REPUTATION_UPDATE'  // Trust score changes
  | 'AUDIT_DEEP'         // Deep GEO audit with causal tracing
  | 'MESH_TOPOLOGY_CHANGE'; // Node addition/removal

/**
 * Consensus request status
 */
export type ConsensusStatus = 'PENDING' | 'COMMITTED' | 'FAILED' | 'TIMEOUT';

/**
 * Byzantine evidence reason
 */
export type ByzantineReason = 
  | 'INVALID_SIGNATURE'   // Ed25519 signature verification failed
  | 'DIGEST_MISMATCH'     // SHA-256 digest doesn't match payload
  | 'EQUIVOCATION'        // Node sent conflicting messages
  | 'TIMEOUT'             // Node didn't respond within timeout
  | 'INVALID_PROOF';      // ZKP proof validation failed

// =====================================================
// ZOD SCHEMAS
// =====================================================

/**
 * PBFT message schema
 */
export const PBFTMessageSchema = z.object({
  type: z.enum(['PRE_PREPARE', 'PREPARE', 'COMMIT', 'VIEW_CHANGE', 'NEW_VIEW']),
  viewNumber: z.number().int().nonnegative(),
  sequenceNumber: z.number().int().positive(),
  digest: z.string().regex(/^[a-f0-9]{64}$/), // SHA-256 hex
  nodeId: z.string(),
  signature: z.string(), // Ed25519 signature (base64)
  timestamp: z.number().int().positive(),
  nonce: z.string().optional(), // For replay attack prevention
});

export type PBFTMessage = z.infer<typeof PBFTMessageSchema>;

/**
 * Consensus request schema
 */
export const ConsensusRequestSchema = z.object({
  requestId: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/), // ULID
  operation: z.enum(['PAYMENT_VERIFY', 'REPUTATION_UPDATE', 'AUDIT_DEEP', 'MESH_TOPOLOGY_CHANGE']),
  payload: z.any(),
  clientId: z.string(), // Node ID of requester
  clientSignature: z.string(), // Ed25519 signature of payload
  timestamp: z.number().int().positive(),
});

export type ConsensusRequest = z.infer<typeof ConsensusRequestSchema>;

/**
 * Consensus result schema
 */
export const ConsensusResultSchema = z.object({
  success: z.boolean(),
  requestId: z.string(),
  consensusId: z.string().optional(), // ULID of consensus round
  viewNumber: z.number().int().nonnegative(),
  sequenceNumber: z.number().int().positive(),
  quorumNodes: z.array(z.string()),
  commitsReceived: z.number().int().nonnegative(),
  status: z.enum(['PENDING', 'COMMITTED', 'FAILED', 'TIMEOUT']),
  executionTimeMs: z.number().optional(),
  executedAt: z.date().optional(),
  error: z.string().optional(),
});

export type ConsensusResult = z.infer<typeof ConsensusResultSchema>;

/**
 * Byzantine evidence proof schema
 */
export const ByzantineProofSchema = z.object({
  message1: PBFTMessageSchema, // First conflicting message
  message2: PBFTMessageSchema.optional(), // Second conflicting message (for equivocation)
  zkProofHash: z.string().regex(/^[a-f0-9]{64}$/), // SHA-256 of ZKP
});

export type ByzantineProof = z.infer<typeof ByzantineProofSchema>;

/**
 * Byzantine evidence schema
 */
export const ByzantineEvidenceSchema = z.object({
  id: z.string().uuid(),
  accusedNode: z.string(),
  reporterNode: z.string(),
  reason: z.enum(['INVALID_SIGNATURE', 'DIGEST_MISMATCH', 'EQUIVOCATION', 'TIMEOUT', 'INVALID_PROOF']),
  proof: ByzantineProofSchema,
  evidenceHash: z.string().regex(/^[a-f0-9]{64}$/), // SHA-256 of proof
  slashTxHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(), // Base L2 tx hash
  status: z.enum(['PENDING', 'VERIFIED', 'SLASHED', 'REJECTED']),
  reportedAt: z.date(),
  slashedAt: z.date().optional(),
});

export type ByzantineEvidence = z.infer<typeof ByzantineEvidenceSchema>;

/**
 * Agent stake schema (mirror of blockchain state)
 */
export const AgentStakeSchema = z.object({
  agentAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/), // Ethereum address
  nodeId: z.string(), // DHT node ID
  stakedAmount: z.number().positive(), // USDC amount
  isSlashed: z.boolean(),
  lastSlashTime: z.date().optional(),
  canParticipate: z.boolean(), // Derived: stakedAmount >= 100 && !isSlashed
  updatedAt: z.date(),
});

export type AgentStake = z.infer<typeof AgentStakeSchema>;

// =====================================================
// INTERNAL TYPES
// =====================================================

/**
 * PBFT view state
 */
export interface ViewState {
  viewNumber: number;
  primary: string; // Node ID of primary
  replicas: string[]; // Node IDs of replicas
  sequenceNumber: number; // Current sequence number
  lastCommitted: number; // Last committed sequence number
}

/**
 * Message log entry (for equivocation detection)
 */
export interface MessageLogEntry {
  message: PBFTMessage;
  receivedAt: number; // Unix timestamp
  verified: boolean;
}

/**
 * Consensus round state
 */
export interface ConsensusRound {
  requestId: string;
  request: ConsensusRequest;
  viewNumber: number;
  sequenceNumber: number;
  digest: string;
  status: ConsensusStatus;
  prePrepare: PBFTMessage | null;
  prepares: Map<string, PBFTMessage>; // nodeId -> message
  commits: Map<string, PBFTMessage>; // nodeId -> message
  startTime: number;
  committedAt?: number;
  quorumNodes: string[];
}

/**
 * Circuit breaker state for Byzantine nodes
 */
export interface ByzantineCircuitBreaker {
  nodeId: string;
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
  openUntil?: number; // Unix timestamp
}

/**
 * Quorum selection criteria
 */
export interface QuorumCriteria {
  minStake: number; // Minimum USDC stake
  minTrustScore: number; // Minimum trust score (0-100)
  excludeNodes: string[]; // Node IDs to exclude
  preferredNodes: string[]; // Node IDs to prefer
}

// =====================================================
// CONSTANTS
// =====================================================

/**
 * PBFT consensus parameters
 */
export const PBFT_PARAMS = {
  QUORUM_SIZE: 7, // n = 7 nodes
  FAULT_TOLERANCE: 2, // f = 2 (can tolerate 2 Byzantine nodes)
  CONSENSUS_TIMEOUT: 30000, // 30 seconds
  VIEW_CHANGE_TIMEOUT: 60000, // 60 seconds
  MIN_STAKE: 100, // 100 USDC minimum
  SLASH_PERCENTAGE: 0.5, // 50% of stake
} as const;

/**
 * Byzantine detection thresholds
 */
export const BYZANTINE_THRESHOLDS = {
  MAX_FAILURES: 3, // Open circuit breaker after 3 failures
  TIMEOUT_THRESHOLD: 5, // Consecutive timeouts before reporting
  EVIDENCE_REPORTERS: 3, // Number of reporters needed for auto-slash
  CIRCUIT_OPEN_DURATION: 3600000, // 1 hour
} as const;

// =====================================================
// TYPE GUARDS
// =====================================================

/**
 * Check if operation requires BFT consensus
 */
export function requiresConsensus(operation: string): operation is ConsensusOperation {
  return [
    'PAYMENT_VERIFY',
    'REPUTATION_UPDATE',
    'AUDIT_DEEP',
    'MESH_TOPOLOGY_CHANGE',
  ].includes(operation);
}

/**
 * Check if stake is sufficient for consensus participation
 */
export function canParticipateInConsensus(stake: AgentStake): boolean {
  return stake.stakedAmount >= PBFT_PARAMS.MIN_STAKE && !stake.isSlashed;
}

/**
 * Validate PBFT message
 */
export function isValidPBFTMessage(msg: unknown): msg is PBFTMessage {
  try {
    PBFTMessageSchema.parse(msg);
    return true;
  } catch {
    return false;
  }
}
