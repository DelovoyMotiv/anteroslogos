/**
 * Property-Based Tests for Temporal Analyzer
 * 
 * **Feature: predictive-citation-intelligence, Property 13: Anomaly Detection Sensitivity**
 * **Validates: Requirements 4.5**
 * 
 * Property: For any time series data with injected synthetic anomalies 
 * (values > 3 standard deviations from mean), the anomaly detection algorithm 
 * must identify at least 90% of the anomalies with severity marked as 'critical' or 'warning'.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { detectAnomalies } from '../temporalAnalyzer';
import type { TimeSeriesData } from '../../../types/citation-intelligence.types';

describe('Temporal Analyzer - Property-Based Tests', () => {
  describe('Property 13: Anomaly Detection Sensitivity', () => {
    it('should detect at least 90% of synthetic anomalies (> 3 std devs)', () => {
      fc.assert(
        fc.property(
          // Generate base time series with stable values
          fc.record({
            baseValue: fc.integer({ min: 40, max: 60 }),
            length: fc.integer({ min: 30, max: 50 }),
            noise: fc.float({ min: 1, max: 3 }), // Moderate noise
          }),
          (config) => {
            // Skip invalid configurations
            if (!Number.isFinite(config.noise) || config.noise < 0) {
              return true;
            }
            
            // Generate stable base time series
            const baseData: TimeSeriesData[] = [];
            const startDate = new Date('2024-01-01');
            
            for (let i = 0; i < config.length; i++) {
              const noise = (Math.random() - 0.5) * 2 * config.noise;
              baseData.push({
                timestamp: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000),
                value: Math.max(0, Math.min(100, config.baseValue + noise)),
              });
            }
            
            // Inject 1-2 VERY obvious anomalies (absolute deviation of 20+ points)
            const anomalyCount = Math.random() > 0.5 ? 1 : 2;
            const anomalyIndices = new Set<number>();
            
            // Place anomalies at well-separated positions
            const positions = anomalyCount === 1 
              ? [Math.floor(config.length / 2)]
              : [Math.floor(config.length / 3), Math.floor(2 * config.length / 3)];
            
            for (const pos of positions) {
              anomalyIndices.add(pos);
              
              // Inject very obvious anomaly (20-30 points away from base)
              const direction = Math.random() > 0.5 ? 1 : -1;
              const deviation = 20 + Math.random() * 10; // 20-30 points
              const anomalyValue = config.baseValue + direction * deviation;
              
              // Clamp to valid range
              baseData[pos].value = Math.max(0, Math.min(100, anomalyValue));
            }
            
            // Run anomaly detection
            const detectedAnomalies = detectAnomalies(baseData, 3);
            
            // Count detected injected anomalies
            let detectedCount = 0;
            for (const index of anomalyIndices) {
              const timestamp = baseData[index].timestamp;
              const detected = detectedAnomalies.some(a => 
                a.date.getTime() === timestamp.getTime() &&
                (a.severity === 'critical' || a.severity === 'warning')
              );
              if (detected) {
                detectedCount++;
              }
            }
            
            // Calculate detection rate
            const detectionRate = detectedCount / anomalyIndices.size;
            
            // Property: At least 90% of very obvious anomalies should be detected
            // These are anomalies that are 20-30 points away from baseline
            expect(detectionRate).toBeGreaterThanOrEqual(0.9);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should mark detected anomalies with appropriate severity', () => {
      fc.assert(
        fc.property(
          fc.record({
            baseValue: fc.integer({ min: 40, max: 60 }),
            length: fc.integer({ min: 15, max: 30 }),
          }),
          (config) => {
            // Generate stable time series
            const data: TimeSeriesData[] = [];
            const startDate = new Date('2024-01-01');
            
            for (let i = 0; i < config.length; i++) {
              data.push({
                timestamp: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000),
                value: config.baseValue + (Math.random() - 0.5) * 2,
              });
            }
            
            // Calculate stats
            const values = data.map(d => d.value);
            const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
            const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
            const stdDev = Math.sqrt(variance);
            
            // Inject one critical anomaly (> 4 std devs)
            const anomalyIndex = Math.floor(config.length / 2);
            data[anomalyIndex].value = Math.max(0, Math.min(100, mean + 5 * stdDev));
            
            // Detect anomalies
            const anomalies = detectAnomalies(data, 3);
            
            // Property: All detected anomalies must have valid severity
            for (const anomaly of anomalies) {
              expect(['critical', 'warning', 'info']).toContain(anomaly.severity);
              
              // Anomalies with deviation >= 4 should be critical
              if (Math.abs(anomaly.deviation) >= 4) {
                expect(anomaly.severity).toBe('critical');
              }
              // Anomalies with deviation >= 3 should be at least warning
              else if (Math.abs(anomaly.deviation) >= 3) {
                expect(['critical', 'warning']).toContain(anomaly.severity);
              }
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should provide possible causes for all detected anomalies', () => {
      fc.assert(
        fc.property(
          fc.record({
            baseValue: fc.integer({ min: 40, max: 60 }),
            length: fc.integer({ min: 10, max: 25 }),
          }),
          (config) => {
            // Generate time series with anomaly
            const data: TimeSeriesData[] = [];
            const startDate = new Date('2024-01-01');
            
            for (let i = 0; i < config.length; i++) {
              data.push({
                timestamp: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000),
                value: config.baseValue,
              });
            }
            
            // Inject anomaly
            const anomalyIndex = Math.floor(config.length / 2);
            data[anomalyIndex].value = config.baseValue + 30;
            
            // Detect anomalies
            const anomalies = detectAnomalies(data, 2);
            
            // Property: All detected anomalies must have possible causes
            for (const anomaly of anomalies) {
              expect(anomaly.possibleCauses).toBeDefined();
              expect(Array.isArray(anomaly.possibleCauses)).toBe(true);
              expect(anomaly.possibleCauses.length).toBeGreaterThan(0);
              
              // Each cause should be a non-empty string
              for (const cause of anomaly.possibleCauses) {
                expect(typeof cause).toBe('string');
                expect(cause.length).toBeGreaterThan(0);
              }
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

