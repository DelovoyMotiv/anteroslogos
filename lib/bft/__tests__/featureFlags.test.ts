/**
 * Feature Flag Manager Tests
 * 
 * Unit tests for Byzantine resistance feature flag system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FeatureFlagManager, resetFeatureFlagManager } from '../featureFlags';

describe('FeatureFlagManager', () => {
  let manager: FeatureFlagManager;
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
    resetFeatureFlagManager();
    manager = new FeatureFlagManager();
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
  });

  describe('initialization', () => {
    it('should initialize with default disabled state', () => {
      expect(manager.isEnabled('ENABLE_TEMPORAL_ORDERING')).toBe(false);
      expect(manager.isEnabled('ENABLE_SCC_DETECTION')).toBe(false);
      expect(manager.isEnabled('ENABLE_SYBIL_DETECTION')).toBe(false);
      expect(manager.isEnabled('ENABLE_COLLUSION_DETECTION')).toBe(false);
    });

    it('should initialize with shadow mode enabled by default', () => {
      expect(manager.isShadowMode('ENABLE_TEMPORAL_ORDERING')).toBe(true);
      expect(manager.isShadowMode('ENABLE_SCC_DETECTION')).toBe(true);
      expect(manager.isShadowMode('ENABLE_SYBIL_DETECTION')).toBe(true);
      expect(manager.isShadowMode('ENABLE_COLLUSION_DETECTION')).toBe(true);
    });

    it('should load configuration from environment variables', () => {
      process.env.ENABLE_TEMPORAL_ORDERING = 'true';
      process.env.TEMPORAL_ORDERING_TRAFFIC_PCT = '50';
      process.env.TEMPORAL_ORDERING_SHADOW_MODE = 'false';
      
      const envManager = new FeatureFlagManager();
      
      expect(envManager.isEnabled('ENABLE_TEMPORAL_ORDERING')).toBe(true);
      expect(envManager.getTrafficPercentage('ENABLE_TEMPORAL_ORDERING')).toBe(50);
      expect(envManager.isShadowMode('ENABLE_TEMPORAL_ORDERING')).toBe(false);
    });
  });

  describe('enable/disable', () => {
    it('should enable a feature', () => {
      manager.enable('ENABLE_TEMPORAL_ORDERING');
      expect(manager.isEnabled('ENABLE_TEMPORAL_ORDERING')).toBe(true);
      expect(manager.getTrafficPercentage('ENABLE_TEMPORAL_ORDERING')).toBe(100);
    });

    it('should enable a feature with custom traffic percentage', () => {
      manager.enable('ENABLE_SCC_DETECTION', 25);
      expect(manager.isEnabled('ENABLE_SCC_DETECTION')).toBe(true);
      expect(manager.getTrafficPercentage('ENABLE_SCC_DETECTION')).toBe(25);
    });

    it('should disable a feature', () => {
      manager.enable('ENABLE_SYBIL_DETECTION');
      manager.disable('ENABLE_SYBIL_DETECTION');
      expect(manager.isEnabled('ENABLE_SYBIL_DETECTION')).toBe(false);
      expect(manager.getTrafficPercentage('ENABLE_SYBIL_DETECTION')).toBe(0);
    });
  });

  describe('shadow mode', () => {
    it('should enable shadow mode', () => {
      manager.enableShadowMode('ENABLE_TEMPORAL_ORDERING');
      expect(manager.isShadowMode('ENABLE_TEMPORAL_ORDERING')).toBe(true);
    });

    it('should disable shadow mode', () => {
      manager.disableShadowMode('ENABLE_TEMPORAL_ORDERING');
      expect(manager.isShadowMode('ENABLE_TEMPORAL_ORDERING')).toBe(false);
    });

    it('should apply global shadow mode override', () => {
      process.env.SHADOW_MODE = 'true';
      const shadowManager = new FeatureFlagManager();
      
      expect(shadowManager.isShadowMode('ENABLE_TEMPORAL_ORDERING')).toBe(true);
      expect(shadowManager.isShadowMode('ENABLE_SCC_DETECTION')).toBe(true);
      expect(shadowManager.isShadowMode('ENABLE_SYBIL_DETECTION')).toBe(true);
      expect(shadowManager.isShadowMode('ENABLE_COLLUSION_DETECTION')).toBe(true);
    });
  });

  describe('traffic percentage', () => {
    it('should apply feature to 100% of traffic when enabled at 100%', () => {
      manager.enable('ENABLE_TEMPORAL_ORDERING', 100);
      
      // Test multiple identifiers
      expect(manager.shouldApply('ENABLE_TEMPORAL_ORDERING', 'request-1')).toBe(true);
      expect(manager.shouldApply('ENABLE_TEMPORAL_ORDERING', 'request-2')).toBe(true);
      expect(manager.shouldApply('ENABLE_TEMPORAL_ORDERING', 'request-3')).toBe(true);
    });

    it('should not apply feature when traffic percentage is 0', () => {
      manager.enable('ENABLE_TEMPORAL_ORDERING', 0);
      
      // Should still return true in shadow mode
      expect(manager.shouldApply('ENABLE_TEMPORAL_ORDERING', 'request-1')).toBe(true);
      
      // Disable shadow mode
      manager.disableShadowMode('ENABLE_TEMPORAL_ORDERING');
      expect(manager.shouldApply('ENABLE_TEMPORAL_ORDERING', 'request-1')).toBe(false);
    });

    it('should apply feature deterministically based on identifier', () => {
      manager.enable('ENABLE_TEMPORAL_ORDERING', 50);
      
      const id1 = 'request-1';
      const id2 = 'request-2';
      
      // Same identifier should always return same result
      const result1a = manager.shouldApply('ENABLE_TEMPORAL_ORDERING', id1);
      const result1b = manager.shouldApply('ENABLE_TEMPORAL_ORDERING', id1);
      expect(result1a).toBe(result1b);
      
      const result2a = manager.shouldApply('ENABLE_TEMPORAL_ORDERING', id2);
      const result2b = manager.shouldApply('ENABLE_TEMPORAL_ORDERING', id2);
      expect(result2a).toBe(result2b);
    });

    it('should clamp traffic percentage to 0-100 range', () => {
      manager.enable('ENABLE_TEMPORAL_ORDERING', 150);
      expect(manager.getTrafficPercentage('ENABLE_TEMPORAL_ORDERING')).toBe(100);
      
      manager.enable('ENABLE_SCC_DETECTION', -10);
      expect(manager.getTrafficPercentage('ENABLE_SCC_DETECTION')).toBe(0);
    });
  });

  describe('gradual rollout', () => {
    it('should gradually increase traffic percentage', () => {
      manager.enable('ENABLE_TEMPORAL_ORDERING', 0);
      
      manager.gradualRollout('ENABLE_TEMPORAL_ORDERING', 100, 25);
      expect(manager.getTrafficPercentage('ENABLE_TEMPORAL_ORDERING')).toBe(25);
      
      manager.gradualRollout('ENABLE_TEMPORAL_ORDERING', 100, 25);
      expect(manager.getTrafficPercentage('ENABLE_TEMPORAL_ORDERING')).toBe(50);
      
      manager.gradualRollout('ENABLE_TEMPORAL_ORDERING', 100, 25);
      expect(manager.getTrafficPercentage('ENABLE_TEMPORAL_ORDERING')).toBe(75);
      
      manager.gradualRollout('ENABLE_TEMPORAL_ORDERING', 100, 25);
      expect(manager.getTrafficPercentage('ENABLE_TEMPORAL_ORDERING')).toBe(100);
    });

    it('should not exceed target percentage', () => {
      manager.enable('ENABLE_TEMPORAL_ORDERING', 90);
      
      manager.gradualRollout('ENABLE_TEMPORAL_ORDERING', 95, 10);
      expect(manager.getTrafficPercentage('ENABLE_TEMPORAL_ORDERING')).toBe(95);
    });
  });

  describe('status queries', () => {
    it('should check if any feature is enabled', () => {
      expect(manager.isAnyFeatureEnabled()).toBe(false);
      
      manager.enable('ENABLE_TEMPORAL_ORDERING');
      expect(manager.isAnyFeatureEnabled()).toBe(true);
    });

    it('should check if all features are enabled', () => {
      expect(manager.areAllFeaturesEnabled()).toBe(false);
      
      manager.enable('ENABLE_TEMPORAL_ORDERING');
      manager.enable('ENABLE_SCC_DETECTION');
      manager.enable('ENABLE_SYBIL_DETECTION');
      expect(manager.areAllFeaturesEnabled()).toBe(false);
      
      manager.enable('ENABLE_COLLUSION_DETECTION');
      expect(manager.areAllFeaturesEnabled()).toBe(true);
    });

    it('should get status of all flags', () => {
      manager.enable('ENABLE_TEMPORAL_ORDERING', 50);
      manager.disableShadowMode('ENABLE_TEMPORAL_ORDERING');
      
      const status = manager.getStatus();
      
      expect(status['ENABLE_TEMPORAL_ORDERING']).toEqual({
        enabled: true,
        shadowMode: false,
        trafficPercentage: 50,
      });
      
      expect(status['ENABLE_SCC_DETECTION']).toEqual({
        enabled: false,
        shadowMode: true,
        trafficPercentage: 0,
      });
    });
  });

  describe('reset', () => {
    it('should reset all flags to default', () => {
      manager.enable('ENABLE_TEMPORAL_ORDERING');
      manager.enable('ENABLE_SCC_DETECTION');
      
      manager.reset();
      
      expect(manager.isEnabled('ENABLE_TEMPORAL_ORDERING')).toBe(false);
      expect(manager.isEnabled('ENABLE_SCC_DETECTION')).toBe(false);
    });
  });
});
