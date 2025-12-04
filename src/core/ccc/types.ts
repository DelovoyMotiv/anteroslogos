/**
 * Causal Contribution Credits (CCC) Type System
 * 
 * Production-grade type definitions for CCC ledger, transactions,
 * causal value computation, and reward mechanisms.
 * 
 * @module core/ccc/types
 */

/**
 * CCC Transaction Types
 */
export enum CCCTransactionType {
  EARNED = 'earned',
  SPENT = 'spent',
  TRANSFERRED_OUT = 'transferred_out',
  TRANSFERRED_IN = 'transferred_in',
  STAKED = 'staked',
  UNSTAKED = 'unstaked',
  ENDORSEMENT = 'endorsement'
}

/**
 * Reason codes for CCC earnings
 */
export enum CCCEarningReason {
  KNOWLEDGE_GRAPH_SYNC = 'knowledge_graph_sync',
  NOVEL_ENTITY_DISCOVERY = 'novel_entity_discovery',
  RELATIONSHIP_ENRICHMENT = 'relationship_enrichment',
  CAUSAL_PATH_IMPROVEMENT = 'causal_path_improvement',
  PREDICTION_ACCURACY_BOOST = 'prediction_accuracy_boost',
  CONSENSUS_PARTICIPATION = 'consensus_participation',
  MESH_NETWORK_CONTRIBUTION = 'mesh_network_contribution'
}

/**
 * Purpose codes for CCC spending
 */
export enum CCCSpendingPurpose {
  AUDIT_DISCOUNT = 'audit_discount',
  TRUST_SCORE_BOOST = 'trust_score_boost',
  AGENT_ENDORSEMENT = 'agent_endorsement',
  PRIORITY_ROUTING = 'priority_routing',
  API_RATE_INCREASE = 'api_rate_increase'
}

/**
 * Individual CCC transaction record
 */
export interface CCCTransaction {
  id: string; // ULID
  agentId: string;
  type: CCCTransactionType;
  amount: number; // CCC tokens (float with 6 decimal precision)
  balanceBefore: number;
  balanceAfter: number;
  reason?: CCCEarningReason;
  purpose?: CCCSpendingPurpose;
  relatedAgentId?: string; // For transfers/endorsements
  metadata: {
    knowledgeGraphDeltaId?: string;
    auditId?: string;
    consensusRoundId?: string;
    causalValueScore?: number;
    [key: string]: unknown;
  };
  timestamp: string; // ISO 8601
  blockNumber?: number; // Optional on-chain anchor
  txHash?: string; // Optional blockchain transaction
}

/**
 * CCC account state
 */
export interface CCCAccount {
  agentId: string;
  balance: number; // Available CCC tokens
  stakedBalance: number; // Locked for trust score boost
  totalEarned: number; // Lifetime earnings
  totalSpent: number; // Lifetime spending
  totalTransferred: number; // Net transfers (out - in)
  endorsementWeight: number; // Accumulated from received endorsements
  createdAt: string;
  updatedAt: string;
  lastTransactionId: string; // Latest transaction ULID
}

/**
 * Discount tier based on CCC balance
 */
export interface CCCDiscountTier {
  minBalance: number;
  discountPercentage: number; // 0-100
  label: string;
  priority: number; // Higher = better routing priority
}

/**
 * Knowledge graph delta for causal value computation
 */
export interface KnowledgeGraphDelta {
  id: string; // ULID
  agentId: string;
  timestamp: string;
  entities: {
    id: string;
    type: string; // Organization, Person, Technology, Concept
    name: string;
    properties: Record<string, unknown>;
    confidence: number; // 0-1
  }[];
  relationships: {
    id: string;
    sourceEntityId: string;
    targetEntityId: string;
    type: string; // owns, mentions, cites, influences
    weight: number; // 0-1
    temporal?: {
      startDate?: string;
      endDate?: string;
    };
    confidence: number; // 0-1
  }[];
  metadata: {
    sourceUrl?: string;
    extractionMethod?: string;
    llmModel?: string;
    [key: string]: unknown;
  };
}

/**
 * Causal value computation result
 */
export interface CausalValueScore {
  totalScore: number; // 0-100 normalized score
  components: {
    noveltyScore: number; // 0-100, new entities/relationships
    connectivityScore: number; // 0-100, graph centrality improvement
    predictionImprovementScore: number; // 0-100, citation accuracy delta
    temporalRelevanceScore: number; // 0-100, recent vs stale data
    confidenceScore: number; // 0-100, weighted by entity/relationship confidence
    entropyScore?: number; // 0-100, Shannon entropy-based quality metric
    kolmogorovScore?: number; // 0-100, compression-based complexity metric
    betweennessScore?: number; // 0-100, betweenness centrality metric
    pageRankDifferentialScore?: number; // 0-100, PageRank improvement metric
  };
  weights: {
    novelty: number;
    connectivity: number;
    predictionImprovement: number;
    temporalRelevance: number;
    confidence: number;
    entropy?: number;
    kolmogorov?: number;
    betweenness?: number;
    pageRankDifferential?: number;
  };
  metadata: {
    novelEntitiesCount: number;
    novelRelationshipsCount: number;
    averageConnectivityBoost: number;
    predictionsImproved: number;
    computationTimeMs: number;
    qualityMultiplier?: number; // Quality-based reward multiplier
    pathCreationBonus?: number; // Bonus for creating unique causal paths
  };
}

/**
 * CCC reward configuration
 */
export interface CCCRewardConfig {
  baseRewardPerEntity: number; // CCC tokens
  baseRewardPerRelationship: number;
  noveltyMultiplier: number; // 1.0 - 3.0
  connectivityMultiplier: number; // 1.0 - 2.5
  predictionImprovementMultiplier: number; // 1.0 - 5.0
  temporalDecayFactor: number; // 0.0 - 1.0 (older data worth less)
  minScoreForReward: number; // Minimum causal value score to earn CCC
  maxRewardPerSync: number; // Cap on CCC per single sync operation
}

/**
 * CCC staking configuration for trust score boost
 */
export interface CCCStakingConfig {
  minStakeAmount: number; // Minimum CCC to stake
  trustScoreBoostPerCCC: number; // Trust score points per staked CCC
  maxTrustScoreBoost: number; // Maximum trust score increase from staking
  unstakingCooldownHours: number; // Hours before unstaked CCC becomes available
}

/**
 * CCC endorsement from one agent to another
 */
export interface CCCEndorsement {
  id: string; // ULID
  fromAgentId: string;
  toAgentId: string;
  amount: number; // CCC tokens transferred
  reason: string;
  trustScoreImpact: number; // How much this boosts recipient's trust
  timestamp: string;
  expiresAt?: string; // Optional expiration for temporary endorsements
}

/**
 * CCC ledger statistics
 */
export interface CCCLedgerStats {
  totalAccounts: number;
  totalCCCInCirculation: number;
  totalCCCStaked: number;
  totalTransactions: number;
  averageAccountBalance: number;
  medianAccountBalance: number;
  top10Holders: Array<{ agentId: string; balance: number }>;
  recentActivity: {
    last24h: {
      transactionsCount: number;
      cccEarned: number;
      cccSpent: number;
    };
    last7d: {
      transactionsCount: number;
      cccEarned: number;
      cccSpent: number;
    };
  };
}

/**
 * Query parameters for CCC transaction history
 */
export interface CCCTransactionQuery {
  agentId: string;
  types?: CCCTransactionType[];
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'amount';
  sortOrder?: 'asc' | 'desc';
}

/**
 * CCC transfer request
 */
export interface CCCTransferRequest {
  fromAgentId: string;
  toAgentId: string;
  amount: number;
  reason: string;
  isEndorsement: boolean; // True if transfer should boost trust score
  metadata?: Record<string, unknown>;
}

/**
 * CCC transfer validation result
 */
export interface CCCTransferValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  estimatedTrustImpact?: number;
  estimatedFees?: number;
}
