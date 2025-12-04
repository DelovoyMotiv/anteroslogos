/**
 * Byzantine Resistance Enhancement Type Definitions
 * 
 * Type definitions for temporal epochs, graph commits, validation results,
 * Sybil detection, and collusion detection components.
 * 
 * @module types/byzantine.types
 * @version 1.0.0
 */

import { z } from 'zod';
import type { JSONValue, JSONObject } from './common.types';

// =====================================================
// TEMPORAL EPOCH TYPES
// =====================================================

/**
 * Epoch commit representing a frozen graph state
 */
export interface EpochCommit {
  epochNumber: number;
  graphCommitHash: string; // SHA-256 of Merkle root
  previousEpochHash: string; // Chain to previous epoch
  timestamp: number; // Unix timestamp
  signature: string; // Ed25519 signature
  merkleRoot: string;
}

/**
 * Graph commit snapshot
 */
export interface GraphCommit {
  commitHash: string;
  epochNumber: number;
  nodeCount: number;
  edgeCount: number;
  merkleRoot: string;
  createdAt: Date;
  signature: string;
}

/**
 * Zod schema for EpochCommit
 */
export const EpochCommitSchema = z.object({
  epochNumber: z.number().int().nonnegative(),
  graphCommitHash: z.string().regex(/^[a-f0-9]{64}$/), // SHA-256 hex
  previousEpochHash: z.string().regex(/^[a-f0-9]{64}$/),
  timestamp: z.number().int().positive(),
  signature: z.string(), // Ed25519 signature (base64)
  merkleRoot: z.string().regex(/^[a-f0-9]{64}$/),
});

/**
 * Zod schema for GraphCommit
 */
export const GraphCommitSchema = z.object({
  commitHash: z.string().regex(/^[a-f0-9]{64}$/),
  epochNumber: z.number().int().nonnegative(),
  nodeCount: z.number().int().nonnegative(),
  edgeCount: z.number().int().nonnegative(),
  merkleRoot: z.string().regex(/^[a-f0-9]{64}$/),
  createdAt: z.date(),
  signature: z.string(),
});

// =====================================================
// GRAPH VALIDATION TYPES
// =====================================================

/**
 * Strongly connected component
 */
export interface StronglyConnectedComponent {
  nodes: string[];
  size: number;
  percentageOfGraph: number;
}

/**
 * Graph violation types
 */
export type GraphViolationType = 
  | 'SCC_TOO_LARGE' 
  | 'DENSITY_TOO_HIGH' 
  | 'NODE_DEGREE_EXCESSIVE'
  | 'CIRCULAR_DEPENDENCY'
  | 'MISSING_HIGH_AUTHORITY_NODE';

/**
 * Violation severity levels
 */
export type ViolationSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Graph violation details
 */
export interface GraphViolation {
  type: GraphViolationType;
  severity: ViolationSeverity;
  description: string;
  affectedNodes: string[];
}

/**
 * Graph validation result
 */
export interface ValidationResult {
  isValid: boolean;
  violations: GraphViolation[];
  sccAnalysis: {
    componentCount: number;
    largestComponentSize: number;
    largestComponentPercentage: number;
  };
}

/**
 * Zod schema for ValidationResult
 */
export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  violations: z.array(z.object({
    type: z.enum(['SCC_TOO_LARGE', 'DENSITY_TOO_HIGH', 'NODE_DEGREE_EXCESSIVE', 'CIRCULAR_DEPENDENCY', 'MISSING_HIGH_AUTHORITY_NODE']),
    severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    description: z.string(),
    affectedNodes: z.array(z.string()),
  })),
  sccAnalysis: z.object({
    componentCount: z.number().int().nonnegative(),
    largestComponentSize: z.number().int().nonnegative(),
    largestComponentPercentage: z.number().min(0).max(1),
  }),
});

// =====================================================
// MERKLE PROOF TYPES
// =====================================================

/**
 * Merkle tree node
 */
export interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
  data?: JSONValue; // Leaf nodes contain actual data
}

/**
 * Merkle tree structure
 */
export interface MerkleTree {
  root: MerkleNode;
  rootHash: string;
  leafCount: number;
  height: number;
}

/**
 * Merkle proof for a specific node
 */
export interface MerkleProof {
  nodeId: string;
  leafHash: string;
  siblings: Array<{
    hash: string;
    position: 'left' | 'right';
  }>;
  rootHash: string;
}

/**
 * Zod schema for MerkleProof
 */
export const MerkleProofSchema = z.object({
  nodeId: z.string(),
  leafHash: z.string().regex(/^[a-f0-9]{64}$/),
  siblings: z.array(z.object({
    hash: z.string().regex(/^[a-f0-9]{64}$/),
    position: z.enum(['left', 'right']),
  })),
  rootHash: z.string().regex(/^[a-f0-9]{64}$/),
});

// =====================================================
// SYBIL DETECTION TYPES
// =====================================================

/**
 * Sybil detection indicator types
 */
export type SybilIndicatorType = 
  | 'LOW_ENTROPY' 
  | 'HIGH_VOLUME_LOW_NOVELTY' 
  | 'DUPLICATE_CONTENT'
  | 'LOW_COMPRESSION_RATIO';

/**
 * Sybil detection indicator
 */
export interface SybilIndicator {
  type: SybilIndicatorType;
  severity: number; // 0-1
  evidence: string;
}

/**
 * Recommended action for Sybil detection
 */
export type SybilAction = 'FLAG' | 'THROTTLE' | 'BLOCK' | 'NONE';

/**
 * Sybil detection result
 */
export interface SybilDetectionResult {
  isSuspicious: boolean;
  confidence: number; // 0-1
  indicators: SybilIndicator[];
  noveltyVolumeRatio: number;
  entropyScore: number;
  recommendedAction: SybilAction;
}

/**
 * Zod schema for SybilDetectionResult
 */
export const SybilDetectionResultSchema = z.object({
  isSuspicious: z.boolean(),
  confidence: z.number().min(0).max(1),
  indicators: z.array(z.object({
    type: z.enum(['LOW_ENTROPY', 'HIGH_VOLUME_LOW_NOVELTY', 'DUPLICATE_CONTENT', 'LOW_COMPRESSION_RATIO']),
    severity: z.number().min(0).max(1),
    evidence: z.string(),
  })),
  noveltyVolumeRatio: z.number().min(0),
  entropyScore: z.number().min(0),
  recommendedAction: z.enum(['FLAG', 'THROTTLE', 'BLOCK', 'NONE']),
});

/**
 * Quality metrics accumulator for tracking agent contributions
 */
export interface QualityMetricsAccumulator {
  agentId: string;
  windowStart: number; // Unix timestamp
  windowEnd: number; // Unix timestamp
  totalEntities: number;
  novelEntities: number;
  totalVolume: number;
  entropySum: number;
  sampleCount: number;
}

// =====================================================
// COLLUSION DETECTION TYPES
// =====================================================

/**
 * Collusion evidence types
 */
export type CollusionEvidenceType = 
  | 'TEMPORAL_CORRELATION' 
  | 'STRUCTURAL_SIMILARITY' 
  | 'ENTITY_OVERLAP';

/**
 * Collusion evidence
 */
export interface CollusionEvidence {
  type: CollusionEvidenceType;
  score: number; // 0-1
}

/**
 * Collusion cluster detection result
 */
export interface CollusionCluster {
  agentIds: string[];
  avgCorrelation: number;
  graphSimilarity: number;
  entityOverlap: number;
  confidence: number;
  evidence: CollusionEvidence[];
}

/**
 * Zod schema for CollusionCluster
 */
export const CollusionClusterSchema = z.object({
  agentIds: z.array(z.string()).min(2),
  avgCorrelation: z.number().min(-1).max(1),
  graphSimilarity: z.number().min(0).max(1),
  entityOverlap: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.object({
    type: z.enum(['TEMPORAL_CORRELATION', 'STRUCTURAL_SIMILARITY', 'ENTITY_OVERLAP']),
    score: z.number().min(0).max(1),
  })),
});

/**
 * Correlation matrix (sparse representation)
 */
export interface CorrelationMatrix {
  matrix: Map<string, Map<string, number>>;
}

/**
 * Reputation penalty reason types
 */
export type ReputationPenaltyReason = 
  | 'COLLUSION_DETECTED' 
  | 'SYBIL_PATTERN' 
  | 'GRAPH_MANIPULATION';

/**
 * Reputation penalty details
 */
export interface ReputationPenalty {
  agentId: string;
  penaltyPercentage: number; // 0-1 (e.g., 0.2 = 20% penalty)
  correlationStrength: number; // Correlation that triggered penalty
  confidence: number; // Confidence in detection
  appliedAt: string; // ISO timestamp
  reason: ReputationPenaltyReason;
  evidence: {
    avgCorrelation: number;
    graphSimilarity: number;
    entityOverlap: number;
    clusterSize: number;
    evidenceTypes: CollusionEvidenceType[];
  };
}

/**
 * Zod schema for ReputationPenalty
 */
export const ReputationPenaltySchema = z.object({
  agentId: z.string(),
  penaltyPercentage: z.number().min(0).max(1),
  correlationStrength: z.number().min(-1).max(1),
  confidence: z.number().min(0).max(1),
  appliedAt: z.string().datetime(),
  reason: z.enum(['COLLUSION_DETECTED', 'SYBIL_PATTERN', 'GRAPH_MANIPULATION']),
  evidence: z.object({
    avgCorrelation: z.number().min(-1).max(1),
    graphSimilarity: z.number().min(0).max(1),
    entityOverlap: z.number().min(0).max(1),
    clusterSize: z.number().int().positive(),
    evidenceTypes: z.array(z.enum(['TEMPORAL_CORRELATION', 'STRUCTURAL_SIMILARITY', 'ENTITY_OVERLAP'])),
  }),
});

// =====================================================
// ERROR TYPES
// =====================================================

/**
 * Byzantine resistance error types
 */
export type ByzantineErrorType =
  | 'TEMPORAL_ORDERING_VIOLATION'
  | 'CIRCULAR_DEPENDENCY_DETECTED'
  | 'GRAPH_INVARIANT_VIOLATION'
  | 'SIGNATURE_VERIFICATION_FAILED'
  | 'MERKLE_PROOF_INVALID'
  | 'SYBIL_PATTERN_DETECTED'
  | 'COLLUSION_DETECTED'
  | 'EPOCH_CHAIN_BROKEN'
  | 'SCC_DETECTION_TIMEOUT'
  | 'QUALITY_METRICS_FAILURE';

/**
 * Error severity levels
 */
export type ErrorSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Byzantine resistance error
 */
export interface ByzantineError extends Error {
  type: ByzantineErrorType;
  severity: ErrorSeverity;
  nodeId?: string;
  evidence?: JSONObject;
  details?: string;
}

/**
 * Error response for handling
 */
export interface ErrorResponse {
  action: 'REJECT_AND_REPORT' | 'REJECT' | 'THROTTLE' | 'WARN';
  retry: boolean;
  backoff?: number; // milliseconds
}

/**
 * Zod schema for ByzantineError
 */
export const ByzantineErrorSchema = z.object({
  type: z.enum([
    'TEMPORAL_ORDERING_VIOLATION',
    'CIRCULAR_DEPENDENCY_DETECTED',
    'GRAPH_INVARIANT_VIOLATION',
    'SIGNATURE_VERIFICATION_FAILED',
    'MERKLE_PROOF_INVALID',
    'SYBIL_PATTERN_DETECTED',
    'COLLUSION_DETECTED',
    'EPOCH_CHAIN_BROKEN',
    'SCC_DETECTION_TIMEOUT',
    'QUALITY_METRICS_FAILURE',
  ]),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  nodeId: z.string().optional(),
  evidence: z.record(z.string(), z.unknown()).optional(),
  details: z.string().optional(),
  message: z.string(),
  name: z.string(),
});

// =====================================================
// SCC DETECTION TYPES
// =====================================================

/**
 * SCC detection state (for Tarjan's algorithm)
 */
export interface SCCDetectionState {
  index: number;
  stack: string[];
  indices: Map<string, number>;
  lowlinks: Map<string, number>;
  onStack: Set<string>;
  components: StronglyConnectedComponent[];
}

// =====================================================
// CAUSAL GRAPH TYPES
// =====================================================

/**
 * Causal graph node
 */
export interface CausalGraphNode {
  id: string;
  type: string;
  data: JSONObject;
  authorityScore?: number;
}

/**
 * Causal graph edge
 */
export interface CausalGraphEdge {
  source: string;
  target: string;
  type: string;
  weight?: number;
}

/**
 * Causal graph structure
 */
export interface CausalGraph {
  nodes: Map<string, CausalGraphNode>;
  edges: Map<string, CausalGraphEdge[]>; // source -> edges
  metadata: {
    nodeCount: number;
    edgeCount: number;
    density: number;
  };
}

// =====================================================
// ENTITY AND RELATIONSHIP TYPES
// =====================================================

/**
 * Entity for quality analysis
 */
export interface Entity {
  id: string;
  name: string;
  type: string;
  fingerprint?: string; // For duplicate detection
  data?: JSONObject;
}

/**
 * Relationship between entities
 */
export interface Relationship {
  id: string;
  source: string;
  target: string;
  type: string;
  confidence?: number;
}

// =====================================================
// TYPE GUARDS
// =====================================================

/**
 * Check if error is a Byzantine error
 */
export function isByzantineError(error: unknown): error is ByzantineError {
  return (
    error instanceof Error &&
    'type' in error &&
    'severity' in error &&
    typeof (error as ByzantineError).type === 'string'
  );
}

/**
 * Validate epoch commit
 */
export function isValidEpochCommit(commit: unknown): commit is EpochCommit {
  try {
    EpochCommitSchema.parse(commit);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate validation result
 */
export function isValidValidationResult(result: unknown): result is ValidationResult {
  try {
    ValidationResultSchema.parse(result);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate Merkle proof
 */
export function isValidMerkleProof(proof: unknown): proof is MerkleProof {
  try {
    MerkleProofSchema.parse(proof);
    return true;
  } catch {
    return false;
  }
}

// =====================================================
// CONSTANTS
// =====================================================

/**
 * Byzantine resistance parameters
 */
export const BYZANTINE_PARAMS = {
  // Graph constraints
  MAX_SCC_PERCENTAGE: 0.20, // 20% max SCC size
  MAX_GRAPH_DENSITY: 0.3,
  MAX_NODE_OUT_DEGREE: 50,
  MAX_PATH_LENGTH: 10,
  MIN_AUTHORITY_SCORE: 70,
  
  // Quality thresholds
  MIN_NOVELTY_VOLUME_RATIO: 0.3,
  MIN_ENTROPY_THRESHOLD: 2.0,
  
  // Collusion thresholds
  CORRELATION_THRESHOLD: 0.7,
  JACCARD_SIMILARITY_THRESHOLD: 0.8,
  
  // Performance
  LARGE_GRAPH_THRESHOLD: 10000, // nodes
  EPOCH_CACHE_SIZE: 100,
  EPOCH_CACHE_TTL: 3600000, // 1 hour in ms
  
  // Timeouts
  VALIDATION_TIMEOUT: 30000, // 30 seconds
  SCC_DETECTION_TIMEOUT: 15000, // 15 seconds
} as const;

/**
 * Feature flag names
 */
export const FEATURE_FLAGS = {
  ENABLE_TEMPORAL_ORDERING: 'ENABLE_TEMPORAL_ORDERING',
  ENABLE_SCC_DETECTION: 'ENABLE_SCC_DETECTION',
  ENABLE_SYBIL_DETECTION: 'ENABLE_SYBIL_DETECTION',
  ENABLE_COLLUSION_DETECTION: 'ENABLE_COLLUSION_DETECTION',
  SHADOW_MODE: 'SHADOW_MODE',
} as const;

export type FeatureFlagName = keyof typeof FEATURE_FLAGS;
