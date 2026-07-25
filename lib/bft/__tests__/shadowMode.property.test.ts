/**
 * Property-Based Tests for Shadow Mode
 * 
 * Tests shadow mode logging behavior to ensure detections are logged
 * without blocking operations.
 * 
 * @module lib/bft/__tests__/shadowMode.property.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import {
  ShadowModeLogger,
  getShadowModeLogger,
  resetShadowModeLogger,
  logShadowDetection,
  type DetectionType,
} from '../shadowModeLogger';
import {
  FeatureFlagManager,
  getFeatureFlagManager,
  resetFeatureFlagManager,
} from '../featureFlags';
import type { FeatureFlagName } from '../../../types/byzantine.types';

describe('Shadow Mode Property Tests', () => {
  let logger: ShadowModeLogger;
  let flagManager: FeatureFlagManager;

  beforeEach(() => {
    resetShadowModeLogger();
    resetFeatureFlagManager();
    logger = getShadowModeLogger();
    flagManager = getFeatureFlagManager();
  });

  afterEach(() => {
    logger.clear();
  });

  /**
   * Property 45: Shadow Mode Logging
   * 
   * For any detection in shadow mode, the system should log the detection
   * without blocking operations.
   * 
   * **Validates: Requirements 10.1**
   * 
   * **Feature: byzantine-resistance-enhancement, Property 45: Shadow Mode Logging**
   */
  describe('Property 45: Shadow Mode Logging', () => {
    it('should log detections without blocking when in shadow mode', () => {
      fc.assert(
        fc.property(
          // Generate random detection data
          fc.record({
            type: fc.constantFrom<DetectionType>(
              'CIRCULAR_DEPENDENCY',
              'TEMPORAL_ORDERING_VIOLATION',
              'GRAPH_INVARIANT_VIOLATION',
              'SYBIL_PATTERN',
              'COLLUSION_CLUSTER',
              'MERKLE_PROOF_INVALID',
              'SIGNATURE_VERIFICATION_FAILED'
            ),
            featureFlag: fc.constantFrom<FeatureFlagName>(
              'ENABLE_TEMPORAL_ORDERING',
              'ENABLE_SCC_DETECTION',
              'ENABLE_SYBIL_DETECTION',
              'ENABLE_COLLUSION_DETECTION'
            ),
            identifier: fc.uuid(),
            severity: fc.constantFrom('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') as fc.Arbitrary<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>,
            wouldBlock: fc.boolean(),
            details: fc.record({
              reason: fc.string(),
              data: fc.anything(),
            }),
          }),
          (detection) => {
            // Enable shadow mode for the feature
            flagManager.setFlag(detection.featureFlag, {
              enabled: true,
              shadowMode: true,
              trafficPercentage: 0,
            });

            // Get initial detection count
            const initialCount = logger.getStats().totalDetections;

            // Log detection
            logger.logDetection(detection);

            // Verify detection was logged
            const stats = logger.getStats();
            expect(stats.totalDetections).toBe(initialCount + 1);

            // Verify detection appears in recent detections
            const recentDetections = logger.getRecentDetections(1);
            expect(recentDetections).toHaveLength(1);
            expect(recentDetections[0].type).toBe(detection.type);
            expect(recentDetections[0].featureFlag).toBe(detection.featureFlag);
            expect(recentDetections[0].identifier).toBe(detection.identifier);
            expect(recentDetections[0].severity).toBe(detection.severity);
            expect(recentDetections[0].wouldBlock).toBe(detection.wouldBlock);

            // Verify detection by type
            const typeStats = stats.detectionsByType[detection.type];
            expect(typeStats).toBeGreaterThan(0);

            // Verify detection by severity
            const severityStats = stats.detectionsBySeverity[detection.severity];
            expect(severityStats).toBeGreaterThan(0);

            // Verify would-block count
            if (detection.wouldBlock) {
              expect(stats.wouldBlockCount).toBeGreaterThan(0);
            }

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should not block operations when logging detections in shadow mode', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              type: fc.constantFrom<DetectionType>(
                'CIRCULAR_DEPENDENCY',
                'TEMPORAL_ORDERING_VIOLATION',
                'GRAPH_INVARIANT_VIOLATION',
                'SYBIL_PATTERN',
                'COLLUSION_CLUSTER'
              ),
              featureFlag: fc.constantFrom<FeatureFlagName>(
                'ENABLE_TEMPORAL_ORDERING',
                'ENABLE_SCC_DETECTION',
                'ENABLE_SYBIL_DETECTION',
                'ENABLE_COLLUSION_DETECTION'
              ),
              identifier: fc.uuid(),
              severity: fc.constantFrom('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') as fc.Arbitrary<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>,
              wouldBlock: fc.constant(true), // All would block in production
              details: fc.record({
                reason: fc.string(),
              }),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (detections) => {
            // Clear previous detections for this test
            logger.clear();

            // Enable shadow mode for all features
            for (const detection of detections) {
              flagManager.setFlag(detection.featureFlag, {
                enabled: true,
                shadowMode: true,
                trafficPercentage: 0,
              });
            }

            // Log all detections - this should not throw or block
            const startTime = Date.now();
            
            for (const detection of detections) {
              expect(() => {
                logger.logDetection(detection);
              }).not.toThrow();
            }

            const elapsed = Date.now() - startTime;

            // Verify all detections were logged
            const stats = logger.getStats();
            expect(stats.totalDetections).toBe(detections.length);

            // Verify all would-block detections were logged but didn't actually block
            expect(stats.wouldBlockCount).toBe(detections.length);

            // Verify logging was fast (< 100ms for 50 detections)
            expect(elapsed).toBeLessThan(100);

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should track detection statistics correctly in shadow mode', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              type: fc.constantFrom<DetectionType>(
                'CIRCULAR_DEPENDENCY',
                'SYBIL_PATTERN',
                'COLLUSION_CLUSTER'
              ),
              featureFlag: fc.constantFrom<FeatureFlagName>(
                'ENABLE_SCC_DETECTION',
                'ENABLE_SYBIL_DETECTION',
                'ENABLE_COLLUSION_DETECTION'
              ),
              identifier: fc.uuid(),
              severity: fc.constantFrom('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') as fc.Arbitrary<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>,
              wouldBlock: fc.boolean(),
              details: fc.record({}),
            }),
            { minLength: 10, maxLength: 100 }
          ),
          (detections) => {
            // Clear previous detections
            logger.clear();

            // Enable shadow mode
            flagManager.setFlag('ENABLE_SCC_DETECTION', {
              enabled: true,
              shadowMode: true,
              trafficPercentage: 0,
            });

            // Log all detections
            for (const detection of detections) {
              logger.logDetection(detection);
            }

            // Get statistics
            const stats = logger.getStats();

            // Verify total count
            expect(stats.totalDetections).toBe(detections.length);

            // Verify counts by type
            const typeCounts = new Map<DetectionType, number>();
            for (const detection of detections) {
              typeCounts.set(detection.type, (typeCounts.get(detection.type) || 0) + 1);
            }

            for (const [type, expectedCount] of typeCounts.entries()) {
              expect(stats.detectionsByType[type]).toBe(expectedCount);
            }

            // Verify counts by severity
            const severityCounts = new Map<string, number>();
            for (const detection of detections) {
              severityCounts.set(detection.severity, (severityCounts.get(detection.severity) || 0) + 1);
            }

            for (const [severity, expectedCount] of severityCounts.entries()) {
              expect(stats.detectionsBySeverity[severity]).toBe(expectedCount);
            }

            // Verify would-block count
            const expectedWouldBlock = detections.filter(d => d.wouldBlock).length;
            expect(stats.wouldBlockCount).toBe(expectedWouldBlock);

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should compare shadow and production decisions correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            detection: fc.record({
              type: fc.constantFrom<DetectionType>(
                'CIRCULAR_DEPENDENCY',
                'SYBIL_PATTERN'
              ),
              featureFlag: fc.constantFrom<FeatureFlagName>(
                'ENABLE_SCC_DETECTION',
                'ENABLE_SYBIL_DETECTION'
              ),
              identifier: fc.uuid(),
              severity: fc.constantFrom('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') as fc.Arbitrary<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>,
              wouldBlock: fc.boolean(),
              details: fc.record({}),
              timestamp: fc.constant(new Date()),
            }),
            shadowDecision: fc.constantFrom('BLOCK', 'ALLOW', 'THROTTLE') as fc.Arbitrary<'BLOCK' | 'ALLOW' | 'THROTTLE'>,
            productionDecision: fc.constantFrom('BLOCK', 'ALLOW', 'THROTTLE') as fc.Arbitrary<'BLOCK' | 'ALLOW' | 'THROTTLE'>,
          }),
          ({ detection, shadowDecision, productionDecision }) => {
            // Clear previous comparisons
            logger.clear();

            // Compare decisions
            logger.compareWithProduction(detection, shadowDecision, productionDecision);

            // Get statistics
            const stats = logger.getStats();

            // Verify comparison was recorded
            expect(stats.comparisonsMade).toBe(1);

            // Verify match rate calculation
            const expectedMatch = shadowDecision === productionDecision;
            if (expectedMatch) {
              expect(stats.matchRate).toBe(100);
              expect(stats.divergences).toHaveLength(0);
            } else {
              expect(stats.matchRate).toBe(0);
              expect(stats.divergences).toHaveLength(1);
              expect(stats.divergences[0].match).toBe(false);
              expect(stats.divergences[0].shadowDecision).toBe(shadowDecision);
              expect(stats.divergences[0].productionDecision).toBe(productionDecision);
            }

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should calculate match rate correctly across multiple comparisons', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              detection: fc.record({
                type: fc.constantFrom<DetectionType>('CIRCULAR_DEPENDENCY', 'SYBIL_PATTERN'),
                featureFlag: fc.constantFrom<FeatureFlagName>('ENABLE_SCC_DETECTION', 'ENABLE_SYBIL_DETECTION'),
                identifier: fc.uuid(),
                severity: fc.constantFrom('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') as fc.Arbitrary<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>,
                wouldBlock: fc.boolean(),
                details: fc.record({}),
                timestamp: fc.constant(new Date()),
              }),
              shadowDecision: fc.constantFrom('BLOCK', 'ALLOW', 'THROTTLE') as fc.Arbitrary<'BLOCK' | 'ALLOW' | 'THROTTLE'>,
              productionDecision: fc.constantFrom('BLOCK', 'ALLOW', 'THROTTLE') as fc.Arbitrary<'BLOCK' | 'ALLOW' | 'THROTTLE'>,
            }),
            { minLength: 10, maxLength: 50 }
          ),
          (comparisons) => {
            // Clear previous data
            logger.clear();

            // Perform all comparisons
            for (const { detection, shadowDecision, productionDecision } of comparisons) {
              logger.compareWithProduction(detection, shadowDecision, productionDecision);
            }

            // Calculate expected match rate
            const matches = comparisons.filter(
              c => c.shadowDecision === c.productionDecision
            ).length;
            const expectedMatchRate = (matches / comparisons.length) * 100;

            // Get statistics
            const stats = logger.getStats();

            // Verify match rate
            expect(stats.comparisonsMade).toBe(comparisons.length);
            expect(stats.matchRate).toBeCloseTo(expectedMatchRate, 1);

            // Verify divergences count
            const expectedDivergences = comparisons.length - matches;
            expect(stats.divergences).toHaveLength(expectedDivergences);

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should export detections correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              type: fc.constantFrom<DetectionType>('CIRCULAR_DEPENDENCY', 'SYBIL_PATTERN'),
              featureFlag: fc.constantFrom<FeatureFlagName>('ENABLE_SCC_DETECTION', 'ENABLE_SYBIL_DETECTION'),
              identifier: fc.uuid(),
              severity: fc.constantFrom('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') as fc.Arbitrary<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>,
              wouldBlock: fc.boolean(),
              details: fc.record({}),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (detections) => {
            // Clear previous data
            logger.clear();

            // Log detections
            for (const detection of detections) {
              logger.logDetection(detection);
            }

            // Export detections
            const exported = logger.exportDetections();

            // Verify export is valid JSON
            expect(() => JSON.parse(exported)).not.toThrow();

            // Parse and verify contents
            const parsed = JSON.parse(exported);
            expect(parsed).toHaveProperty('detections');
            expect(parsed).toHaveProperty('comparisons');
            expect(parsed).toHaveProperty('stats');
            expect(parsed).toHaveProperty('exportedAt');

            expect(parsed.detections).toHaveLength(detections.length);
            expect(parsed.stats.totalDetections).toBe(detections.length);

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
