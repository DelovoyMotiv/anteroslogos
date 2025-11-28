/**
 * Anóteros Trust Layer Type Definitions
 * Types for BFT watermark verification and trust scoring
 * 
 * @module src/core/trust/types
 * @version 1.0.0
 */

import type { DIDString, Timestamp } from '../../protocols/uap/types';

// =====================================================
// WATERMARK TYPES
// =====================================================

/**
 * BFT Watermark Record
 * Immutable record of agent participation in consensus
 */
export interface WatermarkRecord {
  /** Agent DID */
  agentDid: DIDString;
  
  /** Consensus round number */
  round: number;
  
  /** Block hash this watermark attests to */
  blockHash: string;
  
  /** Watermark signature (Ed25519) */
  signature: string;
  
  /** Timestamp of watermark creation */
  timestamp: Timestamp;
  
  /** Vote type (PREPARE, COMMIT, VIEW_CHANGE) */
  voteType: 'PREPARE' | 'COMMIT' | 'VIEW_CHANGE';
  
  /** Validation status */
  valid: boolean;
  
  /** Ledger state hash at time of watermark */
  ledgerHash: string;
}

/**
 * Agent Trust History
 * Aggregated metrics from BFT ledger
 */
export interface TrustHistory {
  /** Agent DID */
  agentDid: DIDString;
  
  /** Total consensus rounds participated */
  totalRounds: number;
  
  /** Valid watermarks submitted */
  validWatermarks: number;
  
  /** Invalid/rejected watermarks */
  invalidWatermarks: number;
  
  /** Byzantine behavior incidents */
  byzantineIncidents: number;
  
  /** Network uptime percentage */
  uptimePercentage: number;
  
  /** Peer endorsement count */
  peerEndorsements: number;
  
  /** First seen timestamp */
  firstSeen: Timestamp;
  
  /** Last seen timestamp */
  lastSeen: Timestamp;
  
  /** Slashing events */
  slashingEvents: number;
}

/**
 * Trust Score Components
 * Breakdown of trust score calculation
 */
export interface TrustScoreComponents {
  /** Consensus participation score (0-100) */
  consensusParticipation: number;
  
  /** Watermark validity score (0-100) */
  watermarkValidity: number;
  
  /** Network uptime score (0-100) */
  networkUptime: number;
  
  /** Peer endorsements score (0-100) */
  peerEndorsements: number;
  
  /** CCC causal contribution score (0-100) */
  causalContribution: number;
  
  /** Final weighted score (0-100) */
  finalScore: number;
  
  /** Computation timestamp */
  computedAt: Timestamp;
}

// =====================================================
// REJECTION TYPES
// =====================================================

/**
 * Rejection reasons for trust layer
 */
export enum RejectionReason {
  /** Agent not found in watermark ledger */
  UNVERIFIED_AGENT = 'UNVERIFIED_AGENT',
  
  /** Trust score below minimum threshold */
  LOW_TRUST_SCORE = 'LOW_TRUST_SCORE',
  
  /** Recent Byzantine behavior detected */
  BYZANTINE_BEHAVIOR = 'BYZANTINE_BEHAVIOR',
  
  /** Watermark validation failed */
  INVALID_WATERMARK = 'INVALID_WATERMARK',
  
  /** Agent currently slashed */
  SLASHED_AGENT = 'SLASHED_AGENT',
  
  /** Too many recent connection failures */
  EXCESSIVE_FAILURES = 'EXCESSIVE_FAILURES',
  
  /** Rate limit exceeded */
  RATE_LIMITED = 'RATE_LIMITED',
  
  /** Tenant isolation policy violation */
  TENANT_VIOLATION = 'TENANT_VIOLATION',
}

/**
 * Rejection decision
 */
export interface RejectionDecision {
  /** Whether agent is rejected */
  rejected: boolean;
  
  /** Rejection reason */
  reason?: RejectionReason;
  
  /** Human-readable explanation */
  explanation?: string;
  
  /** Trust score (even if rejected) */
  trustScore: number;
  
  /** Recommendation for retry */
  retryAfter?: number; // milliseconds
}

// =====================================================
// ATTESTATION TYPES
// =====================================================

/**
 * Trust attestation request
 */
export interface AttestationRequest {
  /** Agent DID to attest */
  agentDid: DIDString;
  
  /** Request timestamp */
  requestedAt: Timestamp;
  
  /** Requesting agent DID */
  requestedBy: DIDString;
  
  /** Additional context */
  context?: {
    capability?: string;
    tenant?: string;
  };
}

/**
 * Trust attestation result
 */
export interface AttestationResult {
  /** Agent DID */
  agentDid: DIDString;
  
  /** Trust score (0-100) */
  trustScore: number;
  
  /** Score components breakdown */
  components: TrustScoreComponents;
  
  /** Ed25519 proof signature */
  proof: string;
  
  /** Watermark reference */
  watermark: string;
  
  /** Consensus round */
  consensusRound: number;
  
  /** Ledger hash */
  ledgerHash: string;
  
  /** Attestation timestamp */
  attestedAt: Timestamp;
  
  /** Expiry timestamp */
  expiresAt: Timestamp;
  
  /** Rejection decision (if any) */
  rejection?: RejectionDecision;
}

// =====================================================
// LEDGER QUERY TYPES
// =====================================================

/**
 * Ledger query parameters
 */
export interface LedgerQueryParams {
  /** Agent DID to query */
  agentDid: DIDString;
  
  /** Start round (inclusive) */
  fromRound?: number;
  
  /** End round (inclusive) */
  toRound?: number;
  
  /** Maximum records to return */
  limit?: number;
  
  /** Include invalid watermarks */
  includeInvalid?: boolean;
}

/**
 * Ledger query result
 */
export interface LedgerQueryResult {
  /** Agent DID */
  agentDid: DIDString;
  
  /** Watermark records */
  watermarks: WatermarkRecord[];
  
  /** Trust history */
  history: TrustHistory;
  
  /** Query metadata */
  metadata: {
    totalRecords: number;
    queryTime: number; // ms
    cacheHit: boolean;
  };
}

// =====================================================
// VERIFICATION TYPES
// =====================================================

/**
 * Verification options
 */
export interface VerificationOptions {
  /** Minimum trust score required */
  minTrustScore?: number;
  
  /** Maximum age of watermarks to consider (ms) */
  maxWatermarkAge?: number;
  
  /** Require recent consensus participation */
  requireRecentActivity?: boolean;
  
  /** Check tenant isolation */
  checkTenantIsolation?: boolean;
  
  /** Tenant ID for isolation check */
  tenantId?: string;
}

/**
 * Verification result
 */
export interface VerificationResult {
  /** Verification passed */
  verified: boolean;
  
  /** Trust attestation (if verified) */
  attestation?: AttestationResult;
  
  /** Rejection decision (if not verified) */
  rejection?: RejectionDecision;
  
  /** Verification metadata */
  metadata: {
    verificationTime: number; // ms
    ledgerQueries: number;
    cacheHits: number;
  };
}

// Exports handled by interface/enum declarations above
