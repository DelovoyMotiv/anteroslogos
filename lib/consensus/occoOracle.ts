/**
 * OCCO - Off-Chain Causal Oracle
 * 
 * Calculates validator weights for HotStuff consensus using:
 * weight = log(E-E-A-T_score + 1) × freshness_decay(t) × stake_factor
 * 
 * Components:
 * - E-E-A-T: Experience, Expertise, Authoritativeness, Trustworthiness (0-100)
 * - Freshness decay: Exponential decay based on last activity
 * - Stake factor: Normalized stake amount (0-1)
 * 
 * Based on:
 * - Google's E-E-A-T quality guidelines
 * - PageRank temporal decay
 * - Proof-of-Stake weighting
 * 
 * @module lib/consensus/occoOracle
 * @version 1.0.0
 */

import type { Address } from 'viem';
import type { BlockchainIntegration } from './blockchainIntegration';

// =====================================================
// TYPES
// =====================================================

/**
 * E-E-A-T Score components (each 0-100)
 */
export interface EEATScore {
  experience: number; // Historical performance, uptime
  expertise: number; // Domain knowledge, audit quality
  authoritativeness: number; // Citations received, reputation
  trustworthiness: number; // Honesty, no Byzantine behavior
}

/**
 * Validator metrics
 */
export interface ValidatorMetrics {
  address: Address;
  nodeId: string;
  eeat: EEATScore;
  stakeAmount: number; // USDC
  lastActiveAt: number; // Unix timestamp
  totalVotes: number; // Participation count
  byzantineReports: number; // Times reported as Byzantine
  consensusSuccessRate: number; // 0-1
}

/**
 * Weight calculation result
 */
export interface ValidatorWeight {
  address: Address;
  weight: number; // Final normalized weight
  components: {
    eeatScore: number; // Aggregated E-E-A-T (0-100)
    eelogFactor: number; // log(eeat + 1)
    freshnessFactor: number; // Exponential decay (0-1)
    stakeFactor: number; // Normalized stake (0-1)
  };
  rank: number; // 1 = highest weight
}

// =====================================================
// CONSTANTS
// =====================================================

const FRESHNESS_HALF_LIFE = 7 * 24 * 60 * 60; // 7 days in seconds
const MIN_STAKE = 100; // 100 USDC
const MAX_STAKE = 10000; // 10k USDC (for normalization)
const BYZANTINE_PENALTY = 0.5; // 50% weight penalty per Byzantine report

// E-E-A-T weights (must sum to 1.0)
const EEAT_WEIGHTS = {
  experience: 0.25,
  expertise: 0.25,
  authoritativeness: 0.25,
  trustworthiness: 0.25,
};

// =====================================================
// OCCO ORACLE
// =====================================================

export class OCCOOracle {
  private validators: Map<Address, ValidatorMetrics> = new Map();
  private weights: Map<Address, ValidatorWeight> = new Map();
  private blockchain?: BlockchainIntegration;

  constructor(blockchain?: BlockchainIntegration) {
    this.blockchain = blockchain;
    console.log('[OCCO] Oracle initialized');
  }

  /**
   * Set blockchain integration (for late binding)
   */
  setBlockchain(blockchain: BlockchainIntegration): void {
    this.blockchain = blockchain;
  }

  // =====================================================
  // VALIDATOR REGISTRATION
  // =====================================================

  /**
   * Register validator with initial metrics
   */
  registerValidator(
    address: Address,
    nodeId: string,
    initialStake: number
  ): void {
    if (this.validators.has(address)) {
      throw new Error(`Validator ${address} already registered`);
    }

    if (initialStake < MIN_STAKE) {
      throw new Error(`Stake ${initialStake} below minimum ${MIN_STAKE} USDC`);
    }

    const metrics: ValidatorMetrics = {
      address,
      nodeId,
      eeat: {
        experience: 50, // Start at neutral
        expertise: 50,
        authoritativeness: 50,
        trustworthiness: 100, // Assume honest until proven otherwise
      },
      stakeAmount: initialStake,
      lastActiveAt: Date.now(),
      totalVotes: 0,
      byzantineReports: 0,
      consensusSuccessRate: 1.0,
    };

    this.validators.set(address, metrics);
    console.log(`[OCCO] Registered validator ${address} with stake ${initialStake} USDC`);
  }

  /**
   * Update validator metrics after consensus round
   */
  updateValidatorMetrics(
    address: Address,
    update: Partial<ValidatorMetrics>
  ): void {
    const metrics = this.validators.get(address);
    if (!metrics) {
      throw new Error(`Validator ${address} not found`);
    }

    Object.assign(metrics, update);
    metrics.lastActiveAt = Date.now();
  }

  // =====================================================
  // E-E-A-T CALCULATION
  // =====================================================

  /**
   * Calculate aggregated E-E-A-T score (0-100)
   */
  private calculateEEATScore(eeat: EEATScore): number {
    return (
      eeat.experience * EEAT_WEIGHTS.experience +
      eeat.expertise * EEAT_WEIGHTS.expertise +
      eeat.authoritativeness * EEAT_WEIGHTS.authoritativeness +
      eeat.trustworthiness * EEAT_WEIGHTS.trustworthiness
    );
  }

  /**
   * Update E-E-A-T component based on performance
   */
  updateEEAT(
    address: Address,
    component: keyof EEATScore,
    delta: number
  ): void {
    const metrics = this.validators.get(address);
    if (!metrics) return;

    metrics.eeat[component] = Math.max(
      0,
      Math.min(100, metrics.eeat[component] + delta)
    );
  }

  // =====================================================
  // WEIGHT CALCULATION
  // =====================================================

  /**
   * Calculate validator weight using formal model:
   * weight = log(E-E-A-T + 1) × freshness_decay(t) × stake_factor
   */
  calculateWeight(address: Address): ValidatorWeight {
    const metrics = this.validators.get(address);
    if (!metrics) {
      throw new Error(`Validator ${address} not found`);
    }

    // 1. E-E-A-T component
    const eeatScore = this.calculateEEATScore(metrics.eeat);
    const eelogFactor = Math.log(eeatScore + 1) / Math.log(101); // Normalize to [0, 1]

    // 2. Freshness decay: exp(-λt) where λ = ln(2) / half_life
    const timeSinceActive = (Date.now() - metrics.lastActiveAt) / 1000; // seconds
    const lambda = Math.LN2 / FRESHNESS_HALF_LIFE;
    const freshnessFactor = Math.exp(-lambda * timeSinceActive);

    // 3. Stake factor: normalized to [0, 1]
    const stakeFactor = Math.min(1, metrics.stakeAmount / MAX_STAKE);

    // 4. Byzantine penalty: exponential decay
    const byzantinePenalty = Math.pow(
      1 - BYZANTINE_PENALTY,
      metrics.byzantineReports
    );

    // 5. Final weight
    const rawWeight =
      eelogFactor * freshnessFactor * stakeFactor * byzantinePenalty;

    const weight: ValidatorWeight = {
      address,
      weight: rawWeight,
      components: {
        eeatScore,
        eelogFactor,
        freshnessFactor,
        stakeFactor,
      },
      rank: 0, // Will be set after sorting
    };

    this.weights.set(address, weight);
    return weight;
  }

  /**
   * Calculate weights for all validators and rank them
   */
  calculateAllWeights(): ValidatorWeight[] {
    const weights: ValidatorWeight[] = [];

    for (const address of this.validators.keys()) {
      weights.push(this.calculateWeight(address));
    }

    // Sort by weight descending
    weights.sort((a, b) => b.weight - a.weight);

    // Assign ranks
    weights.forEach((w, i) => {
      w.rank = i + 1;
      this.weights.set(w.address, w);
    });

    return weights;
  }

  /**
   * Get top N validators by weight
   */
  getTopValidators(n: number): ValidatorWeight[] {
    const sorted = this.calculateAllWeights();
    return sorted.slice(0, n);
  }

  // =====================================================
  // STAKE MANAGEMENT
  // =====================================================

  /**
   * Update validator stake (from on-chain ReputationSlashing contract)
   */
  async updateStake(address: Address): Promise<void> {
    const metrics = this.validators.get(address);
    if (!metrics) return;

    // Query on-chain stake from ReputationSlashing.sol
    if (this.blockchain) {
      try {
        const stakeInfo = await this.blockchain.getStake(address);
        metrics.stakeAmount = Number(stakeInfo.amountFormatted);
        console.log(`[OCCO] Updated stake for ${address}: ${metrics.stakeAmount} USDC`);
      } catch (error) {
        console.error(`[OCCO] Failed to update stake for ${address}:`, error);
      }
    }
  }

  /**
   * Sync all validator stakes from blockchain
   */
  async syncAllStakes(): Promise<void> {
    const updates = Array.from(this.validators.keys()).map(addr =>
      this.updateStake(addr)
    );
    await Promise.all(updates);
  }

  // =====================================================
  // BYZANTINE HANDLING
  // =====================================================

  /**
   * Record Byzantine behavior
   */
  recordByzantineReport(address: Address): void {
    const metrics = this.validators.get(address);
    if (!metrics) return;

    metrics.byzantineReports++;
    
    // Penalize trustworthiness heavily
    metrics.eeat.trustworthiness = Math.max(
      0,
      metrics.eeat.trustworthiness - 25
    );

    console.log(`[OCCO] Byzantine report for ${address}, total: ${metrics.byzantineReports}`);
  }

  /**
   * Check if validator should be excluded (>3 Byzantine reports)
   */
  shouldExclude(address: Address): boolean {
    const metrics = this.validators.get(address);
    if (!metrics) return true;

    return metrics.byzantineReports >= 3;
  }

  // =====================================================
  // PERFORMANCE TRACKING
  // =====================================================

  /**
   * Record consensus participation
   */
  recordConsensusVote(address: Address, success: boolean): void {
    const metrics = this.validators.get(address);
    if (!metrics) return;

    metrics.totalVotes++;
    
    // Update success rate (exponential moving average)
    const alpha = 0.1; // Smoothing factor
    metrics.consensusSuccessRate =
      alpha * (success ? 1 : 0) + (1 - alpha) * metrics.consensusSuccessRate;

    // Update E-E-A-T based on performance
    if (success) {
      this.updateEEAT(address, 'experience', 0.5);
      this.updateEEAT(address, 'trustworthiness', 0.2);
    } else {
      this.updateEEAT(address, 'experience', -1);
      this.updateEEAT(address, 'trustworthiness', -0.5);
    }
  }

  /**
   * Record audit quality (for expertise)
   */
  recordAuditQuality(address: Address, qualityScore: number): void {
    const metrics = this.validators.get(address);
    if (!metrics) return;

    // Quality score 0-100, map to E-E-A-T delta
    const delta = (qualityScore - 50) * 0.1; // -5 to +5 range
    this.updateEEAT(address, 'expertise', delta);
  }

  /**
   * Record citation/reference (for authoritativeness)
   */
  recordCitation(address: Address): void {
    this.updateEEAT(address, 'authoritativeness', 1);
  }

  // =====================================================
  // METRICS & VIEWS
  // =====================================================

  /**
   * Get validator metrics
   */
  getMetrics(address: Address): ValidatorMetrics | undefined {
    return this.validators.get(address);
  }

  /**
   * Get validator weight
   */
  getWeight(address: Address): ValidatorWeight | undefined {
    return this.weights.get(address);
  }

  /**
   * Get all validators
   */
  getAllValidators(): ValidatorMetrics[] {
    return Array.from(this.validators.values());
  }

  /**
   * Get weight statistics
   */
  getWeightStatistics(): {
    totalValidators: number;
    averageWeight: number;
    medianWeight: number;
    topValidator: Address | null;
  } {
    const weights = this.calculateAllWeights();

    if (weights.length === 0) {
      return {
        totalValidators: 0,
        averageWeight: 0,
        medianWeight: 0,
        topValidator: null,
      };
    }

    const sum = weights.reduce((acc, w) => acc + w.weight, 0);
    const median = weights[Math.floor(weights.length / 2)].weight;

    return {
      totalValidators: weights.length,
      averageWeight: sum / weights.length,
      medianWeight: median,
      topValidator: weights[0].address,
    };
  }
}

// =====================================================
// FACTORY
// =====================================================

export function createOCCOOracle(blockchain?: BlockchainIntegration): OCCOOracle {
  return new OCCOOracle(blockchain);
}
