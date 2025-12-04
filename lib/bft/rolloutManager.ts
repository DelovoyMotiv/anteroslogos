/**
 * Rollout Manager
 * 
 * Manages gradual rollout of Byzantine resistance features with traffic
 * percentage control and automated monitoring.
 * 
 * @module lib/bft/rolloutManager
 * @version 1.0.0
 */

import { getFeatureFlagManager, type FeatureFlagManager } from './featureFlags';
import { getShadowModeLogger, type ShadowModeLogger } from './shadowModeLogger';
import type { FeatureFlagName } from '../../types/byzantine.types';

/**
 * Rollout stage configuration
 */
export interface RolloutStage {
  name: string;
  trafficPercentage: number;
  durationMinutes: number;
  successCriteria: RolloutSuccessCriteria;
}

/**
 * Success criteria for rollout stage
 */
export interface RolloutSuccessCriteria {
  maxErrorRate: number; // Maximum error rate (0-1)
  maxLatencyIncrease: number; // Maximum p95 latency increase (0-1)
  minMatchRate: number; // Minimum shadow/production match rate (0-1)
  maxDivergences: number; // Maximum critical divergences
}

/**
 * Rollout plan
 */
export interface RolloutPlan {
  featureFlag: FeatureFlagName;
  stages: RolloutStage[];
  autoAdvance: boolean; // Automatically advance to next stage if criteria met
  autoRollback: boolean; // Automatically rollback if criteria not met
}

/**
 * Rollout status
 */
export interface RolloutStatus {
  featureFlag: FeatureFlagName;
  currentStage: number;
  stageName: string;
  trafficPercentage: number;
  stageStartTime: Date;
  stageElapsedMinutes: number;
  stageDurationMinutes: number;
  successCriteriaMet: boolean;
  metrics: RolloutMetrics;
  canAdvance: boolean;
  shouldRollback: boolean;
}

/**
 * Rollout metrics
 */
export interface RolloutMetrics {
  errorRate: number;
  latencyIncrease: number;
  matchRate: number;
  criticalDivergences: number;
  totalRequests: number;
  blockedRequests: number;
  throttledRequests: number;
}

/**
 * Default rollout plans for each feature
 */
const DEFAULT_ROLLOUT_PLANS: Partial<Record<FeatureFlagName, RolloutPlan>> = {
  ENABLE_TEMPORAL_ORDERING: {
    featureFlag: 'ENABLE_TEMPORAL_ORDERING',
    stages: [
      {
        name: 'Shadow Mode',
        trafficPercentage: 0,
        durationMinutes: 60,
        successCriteria: {
          maxErrorRate: 0.01,
          maxLatencyIncrease: 0.05,
          minMatchRate: 0.95,
          maxDivergences: 5,
        },
      },
      {
        name: 'Canary (5%)',
        trafficPercentage: 5,
        durationMinutes: 30,
        successCriteria: {
          maxErrorRate: 0.01,
          maxLatencyIncrease: 0.10,
          minMatchRate: 0.90,
          maxDivergences: 10,
        },
      },
      {
        name: 'Small Rollout (25%)',
        trafficPercentage: 25,
        durationMinutes: 60,
        successCriteria: {
          maxErrorRate: 0.01,
          maxLatencyIncrease: 0.10,
          minMatchRate: 0.90,
          maxDivergences: 20,
        },
      },
      {
        name: 'Half Rollout (50%)',
        trafficPercentage: 50,
        durationMinutes: 120,
        successCriteria: {
          maxErrorRate: 0.01,
          maxLatencyIncrease: 0.10,
          minMatchRate: 0.90,
          maxDivergences: 50,
        },
      },
      {
        name: 'Full Rollout (100%)',
        trafficPercentage: 100,
        durationMinutes: 0,
        successCriteria: {
          maxErrorRate: 0.01,
          maxLatencyIncrease: 0.10,
          minMatchRate: 0.90,
          maxDivergences: 100,
        },
      },
    ],
    autoAdvance: false, // Require manual approval
    autoRollback: true,
  },
  ENABLE_SCC_DETECTION: {
    featureFlag: 'ENABLE_SCC_DETECTION',
    stages: [
      {
        name: 'Shadow Mode',
        trafficPercentage: 0,
        durationMinutes: 60,
        successCriteria: {
          maxErrorRate: 0.01,
          maxLatencyIncrease: 0.05,
          minMatchRate: 0.95,
          maxDivergences: 5,
        },
      },
      {
        name: 'Canary (5%)',
        trafficPercentage: 5,
        durationMinutes: 30,
        successCriteria: {
          maxErrorRate: 0.01,
          maxLatencyIncrease: 0.10,
          minMatchRate: 0.90,
          maxDivergences: 10,
        },
      },
      {
        name: 'Small Rollout (25%)',
        trafficPercentage: 25,
        durationMinutes: 60,
        successCriteria: {
          maxErrorRate: 0.01,
          maxLatencyIncrease: 0.10,
          minMatchRate: 0.90,
          maxDivergences: 20,
        },
      },
      {
        name: 'Half Rollout (50%)',
        trafficPercentage: 50,
        durationMinutes: 120,
        successCriteria: {
          maxErrorRate: 0.01,
          maxLatencyIncrease: 0.10,
          minMatchRate: 0.90,
          maxDivergences: 50,
        },
      },
      {
        name: 'Full Rollout (100%)',
        trafficPercentage: 100,
        durationMinutes: 0,
        successCriteria: {
          maxErrorRate: 0.01,
          maxLatencyIncrease: 0.10,
          minMatchRate: 0.90,
          maxDivergences: 100,
        },
      },
    ],
    autoAdvance: false,
    autoRollback: true,
  },
  ENABLE_SYBIL_DETECTION: {
    featureFlag: 'ENABLE_SYBIL_DETECTION',
    stages: [
      {
        name: 'Shadow Mode',
        trafficPercentage: 0,
        durationMinutes: 120,
        successCriteria: {
          maxErrorRate: 0.01,
          maxLatencyIncrease: 0.05,
          minMatchRate: 0.90,
          maxDivergences: 10,
        },
      },
      {
        name: 'Canary (5%)',
        trafficPercentage: 5,
        durationMinutes: 60,
        successCriteria: {
          maxErrorRate: 0.01,
          maxLatencyIncrease: 0.10,
          minMatchRate: 0.85,
          maxDivergences: 20,
        },
      },
      {
        name: 'Small Rollout (25%)',
        trafficPercentage: 25,
        durationMinutes: 120,
        successCriteria: {
          maxErrorRate: 0.01,
          maxLatencyIncrease: 0.10,
          minMatchRate: 0.85,
          maxDivergences: 50,
        },
      },
      {
        name: 'Half Rollout (50%)',
        trafficPercentage: 50,
        durationMinutes: 240,
        successCriteria: {
          maxErrorRate: 0.01,
          maxLatencyIncrease: 0.10,
          minMatchRate: 0.85,
          maxDivergences: 100,
        },
      },
      {
        name: 'Full Rollout (100%)',
        trafficPercentage: 100,
        durationMinutes: 0,
        successCriteria: {
          maxErrorRate: 0.01,
          maxLatencyIncrease: 0.10,
          minMatchRate: 0.85,
          maxDivergences: 200,
        },
      },
    ],
    autoAdvance: false,
    autoRollback: true,
  },
  ENABLE_COLLUSION_DETECTION: {
    featureFlag: 'ENABLE_COLLUSION_DETECTION',
    stages: [
      {
        name: 'Shadow Mode',
        trafficPercentage: 0,
        durationMinutes: 120,
        successCriteria: {
          maxErrorRate: 0.01,
          maxLatencyIncrease: 0.05,
          minMatchRate: 0.90,
          maxDivergences: 10,
        },
      },
      {
        name: 'Canary (5%)',
        trafficPercentage: 5,
        durationMinutes: 60,
        successCriteria: {
          maxErrorRate: 0.01,
          maxLatencyIncrease: 0.10,
          minMatchRate: 0.85,
          maxDivergences: 20,
        },
      },
      {
        name: 'Small Rollout (25%)',
        trafficPercentage: 25,
        durationMinutes: 120,
        successCriteria: {
          maxErrorRate: 0.01,
          maxLatencyIncrease: 0.10,
          minMatchRate: 0.85,
          maxDivergences: 50,
        },
      },
      {
        name: 'Half Rollout (50%)',
        trafficPercentage: 50,
        durationMinutes: 240,
        successCriteria: {
          maxErrorRate: 0.01,
          maxLatencyIncrease: 0.10,
          minMatchRate: 0.85,
          maxDivergences: 100,
        },
      },
      {
        name: 'Full Rollout (100%)',
        trafficPercentage: 100,
        durationMinutes: 0,
        successCriteria: {
          maxErrorRate: 0.01,
          maxLatencyIncrease: 0.10,
          minMatchRate: 0.85,
          maxDivergences: 200,
        },
      },
    ],
    autoAdvance: false,
    autoRollback: true,
  },
};

/**
 * Rollout Manager
 * 
 * Manages gradual rollout of features with automated monitoring
 */
export class RolloutManager {
  private flagManager: FeatureFlagManager;
  private shadowLogger: ShadowModeLogger;
  private rolloutStates: Map<FeatureFlagName, {
    plan: RolloutPlan;
    currentStage: number;
    stageStartTime: Date;
    metrics: RolloutMetrics;
  }>;

  constructor() {
    this.flagManager = getFeatureFlagManager();
    this.shadowLogger = getShadowModeLogger();
    this.rolloutStates = new Map();
  }

  /**
   * Start rollout for a feature
   * 
   * @param featureFlag - Feature flag to rollout
   * @param customPlan - Optional custom rollout plan
   */
  startRollout(featureFlag: FeatureFlagName, customPlan?: RolloutPlan): void {
    const plan = customPlan || DEFAULT_ROLLOUT_PLANS[featureFlag];
    
    if (!plan) {
      throw new Error(`No rollout plan defined for ${featureFlag}`);
    }

    // Initialize rollout state
    this.rolloutStates.set(featureFlag, {
      plan,
      currentStage: 0,
      stageStartTime: new Date(),
      metrics: this.initializeMetrics(),
    });

    // Apply first stage
    this.applyStage(featureFlag, 0);

    console.log(`🚀 Started rollout for ${featureFlag}`);
    console.log(`   Stage: ${plan.stages[0].name}`);
    console.log(`   Traffic: ${plan.stages[0].trafficPercentage}%`);
  }

  /**
   * Advance to next rollout stage
   * 
   * @param featureFlag - Feature flag to advance
   * @param force - Force advance even if criteria not met
   */
  advanceStage(featureFlag: FeatureFlagName, force: boolean = false): boolean {
    const state = this.rolloutStates.get(featureFlag);
    
    if (!state) {
      throw new Error(`No active rollout for ${featureFlag}`);
    }

    const status = this.getStatus(featureFlag);
    
    // Check if we can advance
    if (!force && !status.canAdvance) {
      console.warn(`⚠️  Cannot advance ${featureFlag}: success criteria not met`);
      return false;
    }

    // Check if already at final stage
    if (state.currentStage >= state.plan.stages.length - 1) {
      console.log(`✅ ${featureFlag} already at final stage`);
      return false;
    }

    // Advance to next stage
    const nextStage = state.currentStage + 1;
    this.applyStage(featureFlag, nextStage);

    console.log(`📈 Advanced ${featureFlag} to stage ${nextStage}`);
    console.log(`   Stage: ${state.plan.stages[nextStage].name}`);
    console.log(`   Traffic: ${state.plan.stages[nextStage].trafficPercentage}%`);

    return true;
  }

  /**
   * Rollback feature to previous stage or disable
   * 
   * @param featureFlag - Feature flag to rollback
   */
  rollback(featureFlag: FeatureFlagName): void {
    const state = this.rolloutStates.get(featureFlag);
    
    if (!state) {
      throw new Error(`No active rollout for ${featureFlag}`);
    }

    // If at first stage, disable feature
    if (state.currentStage === 0) {
      this.flagManager.disable(featureFlag);
      this.rolloutStates.delete(featureFlag);
      console.log(`⏪ Rolled back ${featureFlag}: feature disabled`);
      return;
    }

    // Otherwise, go back to previous stage
    const previousStage = state.currentStage - 1;
    this.applyStage(featureFlag, previousStage);

    console.log(`⏪ Rolled back ${featureFlag} to stage ${previousStage}`);
    console.log(`   Stage: ${state.plan.stages[previousStage].name}`);
    console.log(`   Traffic: ${state.plan.stages[previousStage].trafficPercentage}%`);
  }

  /**
   * Get rollout status for a feature
   * 
   * @param featureFlag - Feature flag to check
   * @returns Rollout status
   */
  getStatus(featureFlag: FeatureFlagName): RolloutStatus {
    const state = this.rolloutStates.get(featureFlag);
    
    if (!state) {
      throw new Error(`No active rollout for ${featureFlag}`);
    }

    const stage = state.plan.stages[state.currentStage];
    const now = new Date();
    const elapsedMs = now.getTime() - state.stageStartTime.getTime();
    const elapsedMinutes = elapsedMs / (1000 * 60);

    // Update metrics
    this.updateMetrics(featureFlag);

    // Check success criteria
    const criteriaMet = this.checkSuccessCriteria(
      state.metrics,
      stage.successCriteria
    );

    // Determine if can advance
    const canAdvance = criteriaMet && 
      (stage.durationMinutes === 0 || elapsedMinutes >= stage.durationMinutes);

    // Determine if should rollback
    const shouldRollback = state.plan.autoRollback && 
      !criteriaMet && 
      elapsedMinutes >= stage.durationMinutes;

    return {
      featureFlag,
      currentStage: state.currentStage,
      stageName: stage.name,
      trafficPercentage: stage.trafficPercentage,
      stageStartTime: state.stageStartTime,
      stageElapsedMinutes: elapsedMinutes,
      stageDurationMinutes: stage.durationMinutes,
      successCriteriaMet: criteriaMet,
      metrics: state.metrics,
      canAdvance,
      shouldRollback,
    };
  }

  /**
   * Monitor all active rollouts and auto-advance/rollback if configured
   */
  monitorRollouts(): void {
    for (const [featureFlag, state] of this.rolloutStates.entries()) {
      const status = this.getStatus(featureFlag);

      // Auto-rollback if criteria not met
      if (status.shouldRollback) {
        console.warn(`⚠️  Auto-rollback triggered for ${featureFlag}`);
        this.rollback(featureFlag);
        continue;
      }

      // Auto-advance if criteria met
      if (state.plan.autoAdvance && status.canAdvance) {
        console.log(`✅ Auto-advance triggered for ${featureFlag}`);
        this.advanceStage(featureFlag);
      }
    }
  }

  /**
   * Get all active rollouts
   * 
   * @returns Map of active rollouts and their status
   */
  getAllRollouts(): Map<FeatureFlagName, RolloutStatus> {
    const rollouts = new Map<FeatureFlagName, RolloutStatus>();
    
    for (const featureFlag of this.rolloutStates.keys()) {
      rollouts.set(featureFlag, this.getStatus(featureFlag));
    }

    return rollouts;
  }

  /**
   * Apply a specific stage
   */
  private applyStage(featureFlag: FeatureFlagName, stageIndex: number): void {
    const state = this.rolloutStates.get(featureFlag);
    
    if (!state) {
      throw new Error(`No active rollout for ${featureFlag}`);
    }

    const stage = state.plan.stages[stageIndex];

    // Update feature flag
    if (stage.trafficPercentage === 0) {
      // Shadow mode
      this.flagManager.setFlag(featureFlag, {
        enabled: true,
        shadowMode: true,
        trafficPercentage: 0,
      });
    } else {
      // Active rollout
      this.flagManager.setFlag(featureFlag, {
        enabled: true,
        shadowMode: false,
        trafficPercentage: stage.trafficPercentage,
      });
    }

    // Update state
    state.currentStage = stageIndex;
    state.stageStartTime = new Date();
    state.metrics = this.initializeMetrics();
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): RolloutMetrics {
    return {
      errorRate: 0,
      latencyIncrease: 0,
      matchRate: 1,
      criticalDivergences: 0,
      totalRequests: 0,
      blockedRequests: 0,
      throttledRequests: 0,
    };
  }

  /**
   * Update metrics from shadow logger
   */
  private updateMetrics(featureFlag: FeatureFlagName): void {
    const state = this.rolloutStates.get(featureFlag);
    
    if (!state) {
      return;
    }

    const shadowStats = this.shadowLogger.getStats();

    // Update metrics
    state.metrics.matchRate = shadowStats.matchRate / 100;
    state.metrics.criticalDivergences = shadowStats.divergences.filter(
      d => d.detection.severity === 'CRITICAL'
    ).length;

    // In production, these would come from actual monitoring
    // For now, use placeholder values
    state.metrics.errorRate = 0;
    state.metrics.latencyIncrease = 0;
    state.metrics.totalRequests = shadowStats.totalDetections;
    state.metrics.blockedRequests = shadowStats.wouldBlockCount;
  }

  /**
   * Check if success criteria are met
   */
  private checkSuccessCriteria(
    metrics: RolloutMetrics,
    criteria: RolloutSuccessCriteria
  ): boolean {
    return (
      metrics.errorRate <= criteria.maxErrorRate &&
      metrics.latencyIncrease <= criteria.maxLatencyIncrease &&
      metrics.matchRate >= criteria.minMatchRate &&
      metrics.criticalDivergences <= criteria.maxDivergences
    );
  }
}

/**
 * Singleton instance of rollout manager
 */
let rolloutManagerInstance: RolloutManager | null = null;

/**
 * Get the singleton rollout manager instance
 * 
 * @returns RolloutManager instance
 */
export function getRolloutManager(): RolloutManager {
  if (!rolloutManagerInstance) {
    rolloutManagerInstance = new RolloutManager();
  }
  return rolloutManagerInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetRolloutManager(): void {
  rolloutManagerInstance = null;
}

export default RolloutManager;
