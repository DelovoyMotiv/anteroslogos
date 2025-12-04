/**
 * Byzantine Resistance Feature Flag Manager
 * 
 * Manages feature flags for incremental rollout of Byzantine resistance enhancements.
 * Supports environment variable configuration, shadow mode, and gradual traffic rollout.
 * 
 * @module lib/bft/featureFlags
 * @version 1.0.0
 */

import type { FeatureFlagName } from '../../types/byzantine.types';

/**
 * Feature flag configuration
 */
interface FeatureFlagConfig {
  enabled: boolean;
  shadowMode: boolean; // Log detections without blocking
  trafficPercentage: number; // 0-100, percentage of traffic to apply feature
  rolloutStartDate?: Date;
}

/**
 * Feature flag manager for Byzantine resistance features
 */
export class FeatureFlagManager {
  private flags: Map<FeatureFlagName, FeatureFlagConfig>;
  private readonly defaultConfig: FeatureFlagConfig = {
    enabled: false,
    shadowMode: true,
    trafficPercentage: 0,
  };

  constructor() {
    this.flags = new Map();
    this.loadFromEnvironment();
  }

  /**
   * Load feature flags from environment variables
   */
  private loadFromEnvironment(): void {
    // Temporal ordering
    this.flags.set('ENABLE_TEMPORAL_ORDERING', {
      enabled: this.getEnvBoolean('ENABLE_TEMPORAL_ORDERING', false),
      shadowMode: this.getEnvBoolean('TEMPORAL_ORDERING_SHADOW_MODE', true),
      trafficPercentage: this.getEnvNumber('TEMPORAL_ORDERING_TRAFFIC_PCT', 0),
      rolloutStartDate: this.getEnvDate('TEMPORAL_ORDERING_ROLLOUT_DATE'),
    });

    // SCC detection
    this.flags.set('ENABLE_SCC_DETECTION', {
      enabled: this.getEnvBoolean('ENABLE_SCC_DETECTION', false),
      shadowMode: this.getEnvBoolean('SCC_DETECTION_SHADOW_MODE', true),
      trafficPercentage: this.getEnvNumber('SCC_DETECTION_TRAFFIC_PCT', 0),
      rolloutStartDate: this.getEnvDate('SCC_DETECTION_ROLLOUT_DATE'),
    });

    // Sybil detection
    this.flags.set('ENABLE_SYBIL_DETECTION', {
      enabled: this.getEnvBoolean('ENABLE_SYBIL_DETECTION', false),
      shadowMode: this.getEnvBoolean('SYBIL_DETECTION_SHADOW_MODE', true),
      trafficPercentage: this.getEnvNumber('SYBIL_DETECTION_TRAFFIC_PCT', 0),
      rolloutStartDate: this.getEnvDate('SYBIL_DETECTION_ROLLOUT_DATE'),
    });

    // Collusion detection
    this.flags.set('ENABLE_COLLUSION_DETECTION', {
      enabled: this.getEnvBoolean('ENABLE_COLLUSION_DETECTION', false),
      shadowMode: this.getEnvBoolean('COLLUSION_DETECTION_SHADOW_MODE', true),
      trafficPercentage: this.getEnvNumber('COLLUSION_DETECTION_TRAFFIC_PCT', 0),
      rolloutStartDate: this.getEnvDate('COLLUSION_DETECTION_ROLLOUT_DATE'),
    });

    // Global shadow mode override
    const globalShadowMode = this.getEnvBoolean('SHADOW_MODE', false);
    if (globalShadowMode) {
      this.flags.forEach((config) => {
        config.shadowMode = true;
      });
    }
  }

  /**
   * Get boolean from environment variable
   */
  private getEnvBoolean(key: string, defaultValue: boolean): boolean {
    const value = process.env[key];
    if (value === undefined || value === '') {
      return defaultValue;
    }
    return value.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Get number from environment variable
   */
  private getEnvNumber(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (value === undefined || value === '') {
      return defaultValue;
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : Math.max(0, Math.min(100, parsed));
  }

  /**
   * Get date from environment variable
   */
  private getEnvDate(key: string): Date | undefined {
    const value = process.env[key];
    if (value === undefined || value === '') {
      return undefined;
    }
    try {
      return new Date(value);
    } catch {
      return undefined;
    }
  }

  /**
   * Check if a feature is enabled
   * @param flagName - Feature flag name
   * @returns true if feature is enabled
   */
  isEnabled(flagName: FeatureFlagName): boolean {
    const config = this.flags.get(flagName) || this.defaultConfig;
    return config.enabled;
  }

  /**
   * Check if a feature is in shadow mode
   * @param flagName - Feature flag name
   * @returns true if feature is in shadow mode
   */
  isShadowMode(flagName: FeatureFlagName): boolean {
    const config = this.flags.get(flagName) || this.defaultConfig;
    return config.shadowMode;
  }

  /**
   * Check if a feature should be applied based on traffic percentage
   * Uses deterministic hashing for consistent routing
   * @param flagName - Feature flag name
   * @param identifier - Unique identifier (e.g., request ID, user ID)
   * @returns true if feature should be applied
   */
  shouldApply(flagName: FeatureFlagName, identifier: string): boolean {
    const config = this.flags.get(flagName) || this.defaultConfig;
    
    if (!config.enabled) {
      return false;
    }

    // If traffic percentage is 100%, always apply
    if (config.trafficPercentage >= 100) {
      return true;
    }

    // If traffic percentage is 0%, never apply (unless in shadow mode)
    if (config.trafficPercentage <= 0) {
      return config.shadowMode;
    }

    // Use deterministic hash to decide
    const hash = this.hashString(identifier);
    const bucket = hash % 100;
    return bucket < config.trafficPercentage;
  }

  /**
   * Simple hash function for deterministic traffic routing
   * @param str - String to hash
   * @returns hash value
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get traffic percentage for a feature
   * @param flagName - Feature flag name
   * @returns traffic percentage (0-100)
   */
  getTrafficPercentage(flagName: FeatureFlagName): number {
    const config = this.flags.get(flagName) || this.defaultConfig;
    return config.trafficPercentage;
  }

  /**
   * Set feature flag configuration (for testing or runtime updates)
   * @param flagName - Feature flag name
   * @param config - Feature flag configuration
   */
  setFlag(flagName: FeatureFlagName, config: Partial<FeatureFlagConfig>): void {
    const currentConfig = this.flags.get(flagName) || { ...this.defaultConfig };
    this.flags.set(flagName, { ...currentConfig, ...config });
  }

  /**
   * Enable a feature
   * @param flagName - Feature flag name
   * @param trafficPercentage - Optional traffic percentage (default: 100)
   */
  enable(flagName: FeatureFlagName, trafficPercentage: number = 100): void {
    this.setFlag(flagName, {
      enabled: true,
      trafficPercentage: Math.max(0, Math.min(100, trafficPercentage)),
    });
  }

  /**
   * Disable a feature
   * @param flagName - Feature flag name
   */
  disable(flagName: FeatureFlagName): void {
    this.setFlag(flagName, {
      enabled: false,
      trafficPercentage: 0,
    });
  }

  /**
   * Enable shadow mode for a feature
   * @param flagName - Feature flag name
   */
  enableShadowMode(flagName: FeatureFlagName): void {
    this.setFlag(flagName, { shadowMode: true });
  }

  /**
   * Disable shadow mode for a feature
   * @param flagName - Feature flag name
   */
  disableShadowMode(flagName: FeatureFlagName): void {
    this.setFlag(flagName, { shadowMode: false });
  }

  /**
   * Gradually increase traffic percentage
   * @param flagName - Feature flag name
   * @param targetPercentage - Target traffic percentage
   * @param incrementPercentage - Increment per step (default: 5)
   */
  gradualRollout(
    flagName: FeatureFlagName,
    targetPercentage: number,
    incrementPercentage: number = 5
  ): void {
    const config = this.flags.get(flagName) || { ...this.defaultConfig };
    const newPercentage = Math.min(
      targetPercentage,
      config.trafficPercentage + incrementPercentage
    );
    this.setFlag(flagName, { trafficPercentage: newPercentage });
  }

  /**
   * Get all feature flag configurations
   * @returns Map of feature flags and their configurations
   */
  getAllFlags(): Map<FeatureFlagName, FeatureFlagConfig> {
    return new Map(this.flags);
  }

  /**
   * Get feature flag status summary
   * @returns Object with status of all features
   */
  getStatus(): Record<string, { enabled: boolean; shadowMode: boolean; trafficPercentage: number }> {
    const status: Record<string, { enabled: boolean; shadowMode: boolean; trafficPercentage: number }> = {};
    
    this.flags.forEach((config, flagName) => {
      status[flagName] = {
        enabled: config.enabled,
        shadowMode: config.shadowMode,
        trafficPercentage: config.trafficPercentage,
      };
    });

    return status;
  }

  /**
   * Reset all flags to default configuration
   */
  reset(): void {
    this.flags.clear();
    this.loadFromEnvironment();
  }

  /**
   * Check if any Byzantine resistance feature is enabled
   * @returns true if at least one feature is enabled
   */
  isAnyFeatureEnabled(): boolean {
    for (const config of this.flags.values()) {
      if (config.enabled) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if all Byzantine resistance features are enabled
   * @returns true if all features are enabled
   */
  areAllFeaturesEnabled(): boolean {
    if (this.flags.size === 0) {
      return false;
    }
    for (const config of this.flags.values()) {
      if (!config.enabled) {
        return false;
      }
    }
    return true;
  }

  /**
   * Log current feature flag status (for debugging)
   */
  logStatus(): void {
    console.group('🚩 Byzantine Resistance Feature Flags');
    this.flags.forEach((config, flagName) => {
      const status = config.enabled ? '✅' : '❌';
      const mode = config.shadowMode ? '(shadow)' : '';
      const traffic = config.trafficPercentage > 0 ? `${config.trafficPercentage}%` : '';
      console.log(`${status} ${flagName} ${mode} ${traffic}`);
    });
    console.groupEnd();
  }
}

/**
 * Singleton instance of feature flag manager
 */
let featureFlagManagerInstance: FeatureFlagManager | null = null;

/**
 * Get the singleton feature flag manager instance
 * @returns FeatureFlagManager instance
 */
export function getFeatureFlagManager(): FeatureFlagManager {
  if (!featureFlagManagerInstance) {
    featureFlagManagerInstance = new FeatureFlagManager();
  }
  return featureFlagManagerInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetFeatureFlagManager(): void {
  featureFlagManagerInstance = null;
}

/**
 * Convenience functions for checking feature flags
 */
export const featureFlags = {
  isTemporalOrderingEnabled: () => getFeatureFlagManager().isEnabled('ENABLE_TEMPORAL_ORDERING'),
  isSCCDetectionEnabled: () => getFeatureFlagManager().isEnabled('ENABLE_SCC_DETECTION'),
  isSybilDetectionEnabled: () => getFeatureFlagManager().isEnabled('ENABLE_SYBIL_DETECTION'),
  isCollusionDetectionEnabled: () => getFeatureFlagManager().isEnabled('ENABLE_COLLUSION_DETECTION'),
  
  isTemporalOrderingShadowMode: () => getFeatureFlagManager().isShadowMode('ENABLE_TEMPORAL_ORDERING'),
  isSCCDetectionShadowMode: () => getFeatureFlagManager().isShadowMode('ENABLE_SCC_DETECTION'),
  isSybilDetectionShadowMode: () => getFeatureFlagManager().isShadowMode('ENABLE_SYBIL_DETECTION'),
  isCollusionDetectionShadowMode: () => getFeatureFlagManager().isShadowMode('ENABLE_COLLUSION_DETECTION'),
  
  shouldApplyTemporalOrdering: (id: string) => getFeatureFlagManager().shouldApply('ENABLE_TEMPORAL_ORDERING', id),
  shouldApplySCCDetection: (id: string) => getFeatureFlagManager().shouldApply('ENABLE_SCC_DETECTION', id),
  shouldApplySybilDetection: (id: string) => getFeatureFlagManager().shouldApply('ENABLE_SYBIL_DETECTION', id),
  shouldApplyCollusionDetection: (id: string) => getFeatureFlagManager().shouldApply('ENABLE_COLLUSION_DETECTION', id),
};

export default FeatureFlagManager;
