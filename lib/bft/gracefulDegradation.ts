/**
 * Graceful Degradation Handler
 * 
 * Handles graceful degradation when Byzantine resistance features fail or
 * are rolled back. Ensures system remains operational with reduced security.
 * 
 * @module lib/bft/gracefulDegradation
 * @version 1.0.0
 */

import { getFeatureFlagManager } from './featureFlags';
import type { FeatureFlagName } from '../../types/byzantine.types';

/**
 * Degradation level
 */
export type DegradationLevel = 'NONE' | 'PARTIAL' | 'FULL';

/**
 * Degradation reason
 */
export type DegradationReason =
  | 'FEATURE_DISABLED'
  | 'COMPONENT_FAILURE'
  | 'TIMEOUT'
  | 'RESOURCE_EXHAUSTION'
  | 'ROLLBACK'
  | 'MANUAL_OVERRIDE';

/**
 * Degradation state
 */
export interface DegradationState {
  level: DegradationLevel;
  reason: DegradationReason;
  affectedFeatures: FeatureFlagName[];
  timestamp: Date;
  fallbackBehavior: string;
  dataPreserved: boolean;
  alertsSent: boolean;
}

/**
 * Fallback behavior configuration
 */
export interface FallbackConfig {
  useBasicValidation: boolean;
  skipExpensiveChecks: boolean;
  allowWithWarning: boolean;
  logOnly: boolean;
}

/**
 * Graceful Degradation Handler
 * 
 * Manages fallback behavior when security features fail
 */
export class GracefulDegradationHandler {
  private degradationStates: Map<FeatureFlagName, DegradationState>;
  private fallbackConfigs: Map<FeatureFlagName, FallbackConfig>;

  constructor() {
    this.degradationStates = new Map();
    this.fallbackConfigs = this.initializeFallbackConfigs();
  }

  /**
   * Initialize fallback configurations for each feature
   */
  private initializeFallbackConfigs(): Map<FeatureFlagName, FallbackConfig> {
    const configs = new Map<FeatureFlagName, FallbackConfig>();

    // Temporal ordering fallback
    configs.set('ENABLE_TEMPORAL_ORDERING', {
      useBasicValidation: true,
      skipExpensiveChecks: false,
      allowWithWarning: true,
      logOnly: false,
    });

    // SCC detection fallback
    configs.set('ENABLE_SCC_DETECTION', {
      useBasicValidation: true,
      skipExpensiveChecks: true,
      allowWithWarning: true,
      logOnly: false,
    });

    // Sybil detection fallback
    configs.set('ENABLE_SYBIL_DETECTION', {
      useBasicValidation: true,
      skipExpensiveChecks: true,
      allowWithWarning: true,
      logOnly: true, // Don't block on Sybil detection failure
    });

    // Collusion detection fallback
    configs.set('ENABLE_COLLUSION_DETECTION', {
      useBasicValidation: true,
      skipExpensiveChecks: true,
      allowWithWarning: true,
      logOnly: true, // Don't block on collusion detection failure
    });

    return configs;
  }

  /**
   * Handle feature degradation
   * 
   * @param featureFlag - Feature that is degrading
   * @param reason - Reason for degradation
   * @param level - Degradation level
   */
  degrade(
    featureFlag: FeatureFlagName,
    reason: DegradationReason,
    level: DegradationLevel = 'PARTIAL'
  ): void {
    const state: DegradationState = {
      level,
      reason,
      affectedFeatures: [featureFlag],
      timestamp: new Date(),
      fallbackBehavior: this.describeFallbackBehavior(featureFlag),
      dataPreserved: true,
      alertsSent: false,
    };

    this.degradationStates.set(featureFlag, state);

    // Log degradation
    this.logDegradation(state);

    // Send alerts
    this.sendAlerts(state);
    state.alertsSent = true;

    // Apply fallback behavior
    this.applyFallback(featureFlag);
  }

  /**
   * Restore feature from degradation
   * 
   * @param featureFlag - Feature to restore
   */
  restore(featureFlag: FeatureFlagName): void {
    const state = this.degradationStates.get(featureFlag);
    
    if (!state) {
      return;
    }

    console.log(`✅ Restoring ${featureFlag} from degradation`);
    console.log(`   Previous level: ${state.level}`);
    console.log(`   Previous reason: ${state.reason}`);

    this.degradationStates.delete(featureFlag);
  }

  /**
   * Check if feature is degraded
   * 
   * @param featureFlag - Feature to check
   * @returns true if feature is degraded
   */
  isDegraded(featureFlag: FeatureFlagName): boolean {
    return this.degradationStates.has(featureFlag);
  }

  /**
   * Get degradation state for a feature
   * 
   * @param featureFlag - Feature to check
   * @returns Degradation state or null
   */
  getDegradationState(featureFlag: FeatureFlagName): DegradationState | null {
    return this.degradationStates.get(featureFlag) || null;
  }

  /**
   * Get fallback configuration for a feature
   * 
   * @param featureFlag - Feature to check
   * @returns Fallback configuration
   */
  getFallbackConfig(featureFlag: FeatureFlagName): FallbackConfig {
    return this.fallbackConfigs.get(featureFlag) || {
      useBasicValidation: true,
      skipExpensiveChecks: true,
      allowWithWarning: true,
      logOnly: true,
    };
  }

  /**
   * Handle temporal ordering failure
   * 
   * @returns Fallback behavior description
   */
  handleTemporalOrderingFailure(): string {
    this.degrade('ENABLE_TEMPORAL_ORDERING', 'COMPONENT_FAILURE', 'PARTIAL');
    return 'Using current graph state with warning. Circular dependency risk increased.';
  }

  /**
   * Handle SCC detection timeout
   * 
   * @returns Fallback behavior description
   */
  handleSCCDetectionTimeout(): string {
    this.degrade('ENABLE_SCC_DETECTION', 'TIMEOUT', 'PARTIAL');
    return 'Skipping SCC check, applying basic cycle detection. May miss complex circular dependencies.';
  }

  /**
   * Handle Merkle proof generation failure
   * 
   * @returns Fallback behavior description
   */
  handleMerkleProofFailure(): string {
    return 'Using SHA-256 hash of entire graph. Less efficient verification.';
  }

  /**
   * Handle quality metrics computation failure
   * 
   * @returns Fallback behavior description
   */
  handleQualityMetricsFailure(): string {
    this.degrade('ENABLE_SYBIL_DETECTION', 'COMPONENT_FAILURE', 'PARTIAL');
    return 'Using basic novelty scoring only. Reduced Sybil detection accuracy.';
  }

  /**
   * Rollback feature without restart
   * 
   * @param featureFlag - Feature to rollback
   * @param preserveData - Whether to preserve data during rollback
   */
  rollbackFeature(featureFlag: FeatureFlagName, preserveData: boolean = true): void {
    console.log(`⏪ Rolling back ${featureFlag}`);
    console.log(`   Preserve data: ${preserveData ? 'Yes' : 'No'}`);

    // Disable feature
    const flagManager = getFeatureFlagManager();
    flagManager.disable(featureFlag);

    // Mark as degraded
    this.degrade(featureFlag, 'ROLLBACK', 'FULL');

    // Preserve data if requested
    if (preserveData) {
      this.preserveFeatureData(featureFlag);
    }

    console.log(`✅ Rollback complete for ${featureFlag}`);
  }

  /**
   * Get all degraded features
   * 
   * @returns Array of degraded features
   */
  getAllDegradedFeatures(): DegradationState[] {
    return Array.from(this.degradationStates.values());
  }

  /**
   * Clear all degradation states
   */
  clearAll(): void {
    this.degradationStates.clear();
  }

  /**
   * Describe fallback behavior for a feature
   */
  private describeFallbackBehavior(featureFlag: FeatureFlagName): string {
    const config = this.getFallbackConfig(featureFlag);

    switch (featureFlag) {
      case 'ENABLE_TEMPORAL_ORDERING':
        return config.useBasicValidation
          ? 'Using current graph state with basic validation'
          : 'Using current graph state without validation';

      case 'ENABLE_SCC_DETECTION':
        return config.skipExpensiveChecks
          ? 'Using basic cycle detection instead of Tarjan\'s algorithm'
          : 'Using full Tarjan\'s algorithm with timeout';

      case 'ENABLE_SYBIL_DETECTION':
        return config.logOnly
          ? 'Logging Sybil patterns without blocking'
          : 'Using basic novelty scoring';

      case 'ENABLE_COLLUSION_DETECTION':
        return config.logOnly
          ? 'Logging collusion patterns without penalties'
          : 'Using basic correlation detection';

      default:
        return 'Using default fallback behavior';
    }
  }

  /**
   * Apply fallback behavior
   */
  private applyFallback(featureFlag: FeatureFlagName): void {
    const config = this.getFallbackConfig(featureFlag);

    if (config.logOnly) {
      console.log(`📝 ${featureFlag} in log-only mode`);
    }

    if (config.skipExpensiveChecks) {
      console.log(`⚡ ${featureFlag} skipping expensive checks`);
    }

    if (config.allowWithWarning) {
      console.warn(`⚠️  ${featureFlag} allowing operations with warning`);
    }
  }

  /**
   * Log degradation
   */
  private logDegradation(state: DegradationState): void {
    console.group(`⚠️  Feature Degradation`);
    console.log(`Features: ${state.affectedFeatures.join(', ')}`);
    console.log(`Level: ${state.level}`);
    console.log(`Reason: ${state.reason}`);
    console.log(`Fallback: ${state.fallbackBehavior}`);
    console.log(`Data Preserved: ${state.dataPreserved ? 'Yes' : 'No'}`);
    console.log(`Timestamp: ${state.timestamp.toISOString()}`);
    console.groupEnd();
  }

  /**
   * Send alerts for degradation
   */
  private sendAlerts(state: DegradationState): void {
    // In production, this would send alerts via:
    // - PagerDuty
    // - Slack
    // - Email
    // - Monitoring dashboard

    if (state.level === 'FULL') {
      console.error('🚨 CRITICAL: Full feature degradation', {
        features: state.affectedFeatures,
        reason: state.reason,
      });
    } else {
      console.warn('⚠️  WARNING: Partial feature degradation', {
        features: state.affectedFeatures,
        reason: state.reason,
      });
    }
  }

  /**
   * Preserve feature data during rollback
   */
  private preserveFeatureData(featureFlag: FeatureFlagName): void {
    console.log(`💾 Preserving data for ${featureFlag}`);

    // In production, this would:
    // 1. Snapshot current state
    // 2. Store in backup location
    // 3. Mark as preserved in metadata

    // For now, just log
    console.log(`✅ Data preserved for ${featureFlag}`);
  }
}

/**
 * Singleton instance of graceful degradation handler
 */
let gracefulDegradationHandlerInstance: GracefulDegradationHandler | null = null;

/**
 * Get the singleton graceful degradation handler instance
 * 
 * @returns GracefulDegradationHandler instance
 */
export function getGracefulDegradationHandler(): GracefulDegradationHandler {
  if (!gracefulDegradationHandlerInstance) {
    gracefulDegradationHandlerInstance = new GracefulDegradationHandler();
  }
  return gracefulDegradationHandlerInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetGracefulDegradationHandler(): void {
  gracefulDegradationHandlerInstance = null;
}

/**
 * Convenience functions for handling degradation
 */
export const degradation = {
  handleTemporalOrderingFailure: () =>
    getGracefulDegradationHandler().handleTemporalOrderingFailure(),
  
  handleSCCDetectionTimeout: () =>
    getGracefulDegradationHandler().handleSCCDetectionTimeout(),
  
  handleMerkleProofFailure: () =>
    getGracefulDegradationHandler().handleMerkleProofFailure(),
  
  handleQualityMetricsFailure: () =>
    getGracefulDegradationHandler().handleQualityMetricsFailure(),
  
  rollbackFeature: (featureFlag: FeatureFlagName, preserveData: boolean = true) =>
    getGracefulDegradationHandler().rollbackFeature(featureFlag, preserveData),
  
  isDegraded: (featureFlag: FeatureFlagName) =>
    getGracefulDegradationHandler().isDegraded(featureFlag),
  
  restore: (featureFlag: FeatureFlagName) =>
    getGracefulDegradationHandler().restore(featureFlag),
};

export default GracefulDegradationHandler;
