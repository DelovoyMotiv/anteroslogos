/**
 * Unit tests for Temporal Analyzer
 */

import { describe, it, expect } from 'vitest';
import { analyzeTrend, detectAnomalies } from '../temporalAnalyzer';
import type { TemporalData, TimeSeriesData } from '../../../types/citation-intelligence.types';

describe('Temporal Analyzer - Trend Analysis', () => {
  // Helper to create temporal data
  const createTemporalData = (
    scores: number[],
    startDate: Date = new Date('2024-01-01')
  ): TemporalData[] => {
    return scores.map((score, i) => ({
      timestamp: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000),
      url: 'https://example.com',
      scores: {
        overall: score,
        categories: {},
        citationProbability: score,
      },
      interventions: [],
      externalFactors: {
        seasonality: 0,
        competitorActivity: 0,
        algorithmUpdates: [],
      },
    }));
  };

  describe('analyzeTrend', () => {
    it('should detect increasing trend', () => {
      const data = createTemporalData([50, 55, 60, 65, 70, 75, 80]);
      const result = analyzeTrend(data, 'overall');
      
      expect(result.direction).toBe('increasing');
      expect(result.slope).toBeGreaterThan(0);
      expect(result.r2).toBeGreaterThan(0.9); // Strong linear fit
    });

    it('should detect decreasing trend', () => {
      const data = createTemporalData([80, 75, 70, 65, 60, 55, 50]);
      const result = analyzeTrend(data, 'overall');
      
      expect(result.direction).toBe('decreasing');
      expect(result.slope).toBeLessThan(0);
      expect(result.r2).toBeGreaterThan(0.9);
    });

    it('should detect stable trend', () => {
      const data = createTemporalData([60, 60, 60, 60, 60, 60, 60]);
      const result = analyzeTrend(data, 'overall');
      
      expect(result.direction).toBe('stable');
      expect(Math.abs(result.slope)).toBeLessThan(0.1);
    });

    it('should calculate R² correctly for perfect linear fit', () => {
      const data = createTemporalData([10, 20, 30, 40, 50, 60, 70]);
      const result = analyzeTrend(data, 'overall');
      
      expect(result.r2).toBeCloseTo(1.0, 1);
    });

    it('should handle insufficient data', () => {
      const data = createTemporalData([50]);
      const result = analyzeTrend(data, 'overall');
      
      expect(result.direction).toBe('stable');
      expect(result.slope).toBe(0);
      expect(result.r2).toBe(0);
      expect(result.changePoints).toHaveLength(0);
    });

    it('should detect seasonality in periodic data', () => {
      // Create data with seasonal pattern (12-month cycle)
      const scores = Array.from({ length: 24 }, (_, i) => 
        50 + 10 * Math.sin((i / 12) * 2 * Math.PI)
      );
      const data = createTemporalData(scores);
      const result = analyzeTrend(data, 'overall');
      
      expect(result.seasonality.detected).toBe(true);
      expect(result.seasonality.period).toBe(12);
      expect(result.seasonality.amplitude).toBeGreaterThan(0);
    });

    it('should not detect seasonality in non-periodic data', () => {
      const data = createTemporalData([50, 55, 60, 65, 70]);
      const result = analyzeTrend(data, 'overall');
      
      expect(result.seasonality.detected).toBe(false);
    });

    it('should detect change points', () => {
      // Create data with clear change point at index 10
      const scores = [
        ...Array(10).fill(50),
        ...Array(10).fill(70),
      ];
      const data = createTemporalData(scores);
      const result = analyzeTrend(data, 'overall');
      
      expect(result.changePoints.length).toBeGreaterThan(0);
      if (result.changePoints.length > 0) {
        expect(result.changePoints[0].magnitude).toBeGreaterThan(0);
        expect(result.changePoints[0].significance).toBeGreaterThan(0);
      }
    });

    it('should handle noisy data', () => {
      const scores = [50, 52, 48, 51, 49, 53, 47, 52, 50, 51];
      const data = createTemporalData(scores);
      const result = analyzeTrend(data, 'overall');
      
      expect(result.direction).toBe('stable');
      expect(result.r2).toBeGreaterThanOrEqual(0);
      expect(result.r2).toBeLessThanOrEqual(1);
    });

    it('should filter invalid data', () => {
      const data: TemporalData[] = [
        ...createTemporalData([50, 60, 70]),
        {
          timestamp: new Date('2024-01-04'),
          url: 'https://example.com',
          scores: {
            overall: NaN,
            categories: {},
            citationProbability: 65,
          },
          interventions: [],
          externalFactors: {
            seasonality: 0,
            competitorActivity: 0,
            algorithmUpdates: [],
          },
        },
        ...createTemporalData([80, 90], new Date('2024-01-05')),
      ];
      
      const result = analyzeTrend(data, 'overall');
      
      // Should work with valid data only
      expect(result.direction).toBe('increasing');
    });

    it('should analyze citationProbability metric', () => {
      const data = createTemporalData([40, 50, 60, 70, 80]);
      const result = analyzeTrend(data, 'citationProbability');
      
      expect(result.direction).toBe('increasing');
      expect(result.slope).toBeGreaterThan(0);
    });

    it('should handle edge case with two data points', () => {
      const data = createTemporalData([50, 60]);
      const result = analyzeTrend(data, 'overall');
      
      expect(result.direction).toBe('increasing');
      expect(result.slope).toBeGreaterThan(0);
      expect(result.r2).toBe(1); // Perfect fit for 2 points
    });

    it('should return stable for empty data', () => {
      const result = analyzeTrend([], 'overall');
      
      expect(result.direction).toBe('stable');
      expect(result.slope).toBe(0);
      expect(result.r2).toBe(0);
    });
  });

  describe('detectAnomalies', () => {
    it('should detect anomalies in time series data', () => {
      // Create normal data with one anomaly
      const data: TimeSeriesData[] = [
        { timestamp: new Date('2024-01-01'), value: 50 },
        { timestamp: new Date('2024-01-02'), value: 52 },
        { timestamp: new Date('2024-01-03'), value: 51 },
        { timestamp: new Date('2024-01-04'), value: 50 },
        { timestamp: new Date('2024-01-05'), value: 53 },
        { timestamp: new Date('2024-01-06'), value: 51 },
        { timestamp: new Date('2024-01-07'), value: 52 },
        { timestamp: new Date('2024-01-08'), value: 90 }, // Anomaly
        { timestamp: new Date('2024-01-09'), value: 51 },
        { timestamp: new Date('2024-01-10'), value: 50 },
      ];
      
      const anomalies = detectAnomalies(data, 2);
      
      expect(anomalies.length).toBeGreaterThan(0);
      if (anomalies.length > 0) {
        expect(anomalies.some(a => a.value === 90)).toBe(true);
        expect(anomalies.some(a => Math.abs(a.deviation) >= 2)).toBe(true);
      }
    });

    it('should classify anomaly severity correctly', () => {
      const data: TimeSeriesData[] = [
        { timestamp: new Date('2024-01-01'), value: 50 },
        { timestamp: new Date('2024-01-02'), value: 50 },
        { timestamp: new Date('2024-01-03'), value: 50 },
        { timestamp: new Date('2024-01-04'), value: 50 },
        { timestamp: new Date('2024-01-05'), value: 50 },
        { timestamp: new Date('2024-01-06'), value: 100 }, // Critical anomaly
        { timestamp: new Date('2024-01-07'), value: 50 },
        { timestamp: new Date('2024-01-08'), value: 50 },
      ];
      
      const anomalies = detectAnomalies(data, 2);
      
      expect(anomalies.length).toBeGreaterThan(0);
      if (anomalies.length > 0) {
        expect(['critical', 'warning', 'info']).toContain(anomalies[0].severity);
      }
    });

    it('should provide possible causes for anomalies', () => {
      const data: TimeSeriesData[] = [
        { timestamp: new Date('2024-01-01'), value: 50 },
        { timestamp: new Date('2024-01-02'), value: 50 },
        { timestamp: new Date('2024-01-03'), value: 90 }, // Spike
        { timestamp: new Date('2024-01-04'), value: 50 },
      ];
      
      const anomalies = detectAnomalies(data, 2);
      
      if (anomalies.length > 0) {
        expect(anomalies[0].possibleCauses).toBeDefined();
        expect(anomalies[0].possibleCauses.length).toBeGreaterThan(0);
      }
    });

    it('should handle insufficient data', () => {
      const data: TimeSeriesData[] = [
        { timestamp: new Date('2024-01-01'), value: 50 },
      ];
      
      const anomalies = detectAnomalies(data, 3);
      
      expect(anomalies).toHaveLength(0);
    });

    it('should respect sensitivity parameter', () => {
      const data: TimeSeriesData[] = [
        { timestamp: new Date('2024-01-01'), value: 50 },
        { timestamp: new Date('2024-01-02'), value: 50 },
        { timestamp: new Date('2024-01-03'), value: 50 },
        { timestamp: new Date('2024-01-04'), value: 65 }, // Moderate deviation
        { timestamp: new Date('2024-01-05'), value: 50 },
      ];
      
      // High sensitivity (lower threshold) should detect more anomalies
      const highSensitivity = detectAnomalies(data, 1);
      const lowSensitivity = detectAnomalies(data, 5);
      
      expect(highSensitivity.length).toBeGreaterThanOrEqual(lowSensitivity.length);
    });

    it('should not detect anomalies in stable data', () => {
      const data: TimeSeriesData[] = Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        value: 50 + (Math.random() - 0.5) * 2, // Small random variation
      }));
      
      const anomalies = detectAnomalies(data, 3);
      
      // Should detect few or no anomalies in stable data
      expect(anomalies.length).toBeLessThan(3);
    });

    it('should calculate expected value correctly', () => {
      const data: TimeSeriesData[] = [
        { timestamp: new Date('2024-01-01'), value: 50 },
        { timestamp: new Date('2024-01-02'), value: 52 },
        { timestamp: new Date('2024-01-03'), value: 100 }, // Anomaly
        { timestamp: new Date('2024-01-04'), value: 54 },
      ];
      
      const anomalies = detectAnomalies(data, 2);
      
      if (anomalies.length > 0) {
        expect(anomalies[0].expected).toBeDefined();
        expect(anomalies[0].expected).not.toBe(anomalies[0].value);
        expect(anomalies[0].expected).toBeGreaterThan(0);
      }
    });
  });
});

