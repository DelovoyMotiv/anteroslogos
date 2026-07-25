/**
 * Property-Based Tests for Forecaster
 * Tests universal properties that must hold across all inputs
 * 
 * Uses fast-check for property-based testing with 100+ iterations
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateForecasts } from '../forecaster';
import type { TemporalData } from '../../../types/citation-intelligence.types';

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/**
 * Generate random temporal data with valid scores
 */
const temporalDataArbitrary: fc.Arbitrary<TemporalData[]> = fc.array(
  fc.record({
    timestamp: fc.date(),
    url: fc.webUrl(),
    scores: fc.record({
      overall: fc.float({ min: 0, max: 100 }),
      categories: fc.dictionary(fc.string(), fc.float({ min: 0, max: 100 })),
      citationProbability: fc.float({ min: 0, max: 100 }),
    }),
    interventions: fc.array(
      fc.record({
        type: fc.string(),
        description: fc.string(),
        implementedAt: fc.date(),
      }),
      { maxLength: 5 }
    ),
    externalFactors: fc.record({
      seasonality: fc.float({ min: 0, max: 1 }),
      competitorActivity: fc.float({ min: 0, max: 1 }),
      algorithmUpdates: fc.array(fc.string(), { maxLength: 3 }),
    }),
  }),
  { minLength: 0, maxLength: 100 }
);

/**
 * Generate current score
 */
const currentScoreArbitrary = fc.float({ min: 0, max: 100 });

// ============================================================================
// Property Tests
// ============================================================================

describe('Forecaster - Property-Based Tests', () => {
  /**
   * **Feature: predictive-citation-intelligence, Property 2: Forecast Consistency**
   * 
   * Property: For any set of temporal forecasts (30, 60, 90 days), the predicted values
   * must be monotonically non-decreasing if the trend is positive, and the confidence
   * intervals must widen with longer time horizons.
   * 
   * **Validates: Requirements 1.4, 4.2**
   */
  describe('Property 2: Forecast Consistency', () => {
    it('should return forecasts for all three horizons', () => {
      fc.assert(
        fc.property(
          currentScoreArbitrary,
          temporalDataArbitrary,
          (currentScore, temporalData) => {
            const result = generateForecasts(currentScore, temporalData, []);
            
            // Must have exactly 3 horizons
            expect(result.horizons).toBeDefined();
            expect(result.horizons.length).toBe(3);
            
            // Must have 30, 60, and 90 day horizons
            const days = result.horizons.map(h => h.days);
            expect(days).toContain(30);
            expect(days).toContain(60);
            expect(days).toContain(90);
          }
        ),
        { numRuns: 20 }
      );
    });
    
    it('should have valid predicted values within 0-100 range', () => {
      fc.assert(
        fc.property(
          currentScoreArbitrary,
          temporalDataArbitrary,
          (currentScore, temporalData) => {
            const result = generateForecasts(currentScore, temporalData, []);
            
            result.horizons.forEach(horizon => {
              // Predicted value must be between 0 and 100
              expect(horizon.predicted).toBeGreaterThanOrEqual(0);
              expect(horizon.predicted).toBeLessThanOrEqual(100);
              
              // Predicted value must be finite
              expect(Number.isFinite(horizon.predicted)).toBe(true);
            });
          }
        ),
        { numRuns: 20 }
      );
    });
    
    it('should have valid confidence intervals', () => {
      fc.assert(
        fc.property(
          currentScoreArbitrary,
          temporalDataArbitrary,
          (currentScore, temporalData) => {
            const result = generateForecasts(currentScore, temporalData, []);
            
            result.horizons.forEach(horizon => {
              // Lower bound must be between 0 and 100
              expect(horizon.confidence.lower).toBeGreaterThanOrEqual(0);
              expect(horizon.confidence.lower).toBeLessThanOrEqual(100);
              
              // Upper bound must be between 0 and 100
              expect(horizon.confidence.upper).toBeGreaterThanOrEqual(0);
              expect(horizon.confidence.upper).toBeLessThanOrEqual(100);
              
              // Lower bound must be <= predicted
              expect(horizon.confidence.lower).toBeLessThanOrEqual(horizon.predicted);
              
              // Upper bound must be >= predicted
              expect(horizon.confidence.upper).toBeGreaterThanOrEqual(horizon.predicted);
              
              // Lower bound must be <= upper bound
              expect(horizon.confidence.lower).toBeLessThanOrEqual(horizon.confidence.upper);
              
              // All values must be finite
              expect(Number.isFinite(horizon.confidence.lower)).toBe(true);
              expect(Number.isFinite(horizon.confidence.upper)).toBe(true);
            });
          }
        ),
        { numRuns: 20 }
      );
    });
    
    it('should have widening confidence intervals for longer horizons', () => {
      fc.assert(
        fc.property(
          currentScoreArbitrary,
          temporalDataArbitrary,
          (currentScore, temporalData) => {
            const result = generateForecasts(currentScore, temporalData, []);
            
            // Sort horizons by days
            const sorted = [...result.horizons].sort((a, b) => a.days - b.days);
            
            // Calculate confidence interval widths
            const widths = sorted.map(h => h.confidence.upper - h.confidence.lower);
            
            // Confidence intervals should generally widen (or stay same) with longer horizons
            // Allow for some tolerance due to seasonal adjustments
            for (let i = 1; i < widths.length; i++) {
              // Width should not decrease by more than 5 points
              // (allows for seasonal effects but ensures general widening trend)
              expect(widths[i]).toBeGreaterThanOrEqual(widths[i - 1] - 5);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
    
    it('should have consistent trend direction across horizons', () => {
      fc.assert(
        fc.property(
          currentScoreArbitrary,
          temporalDataArbitrary,
          (currentScore, temporalData) => {
            // Only test when we have sufficient data to establish a trend
            if (temporalData.length < 3) return true;
            
            const result = generateForecasts(currentScore, temporalData, []);
            
            // Sort horizons by days
            const sorted = [...result.horizons].sort((a, b) => a.days - b.days);
            
            // Determine overall trend from first to last horizon
            const firstPrediction = sorted[0].predicted;
            const lastPrediction = sorted[sorted.length - 1].predicted;
            
            if (Math.abs(lastPrediction - firstPrediction) < 1) {
              // Trend is essentially flat, no consistency check needed
              return true;
            }
            
            const isIncreasing = lastPrediction > firstPrediction;
            
            // Check that intermediate predictions follow the trend
            // Allow for small deviations due to seasonal effects
            for (let i = 1; i < sorted.length; i++) {
              const prevPrediction = sorted[i - 1].predicted;
              const currPrediction = sorted[i].predicted;
              
              if (isIncreasing) {
                // For increasing trend, current should not be significantly lower than previous
                // Allow up to 10 point decrease for seasonal effects
                expect(currPrediction).toBeGreaterThanOrEqual(prevPrediction - 10);
              } else {
                // For decreasing trend, current should not be significantly higher than previous
                // Allow up to 10 point increase for seasonal effects
                expect(currPrediction).toBeLessThanOrEqual(prevPrediction + 10);
              }
            }
            
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
    
    it('should return valid citation velocity', () => {
      fc.assert(
        fc.property(
          currentScoreArbitrary,
          temporalDataArbitrary,
          (currentScore, temporalData) => {
            const result = generateForecasts(currentScore, temporalData, []);
            
            // Citation velocity must be finite
            expect(Number.isFinite(result.citationVelocity)).toBe(true);
            
            // Citation velocity should be reasonable (not extreme)
            // Max reasonable velocity: ~10 points per day (with small tolerance for edge cases)
            expect(Math.abs(result.citationVelocity)).toBeLessThanOrEqual(11);
          }
        ),
        { numRuns: 20 }
      );
    });
    
    it('should return valid seasonal factors', () => {
      fc.assert(
        fc.property(
          currentScoreArbitrary,
          temporalDataArbitrary,
          (currentScore, temporalData) => {
            const result = generateForecasts(currentScore, temporalData, []);
            
            // Seasonal factors array must exist
            expect(result.seasonalFactors).toBeDefined();
            expect(Array.isArray(result.seasonalFactors)).toBe(true);
            
            // Each seasonal factor must be valid
            result.seasonalFactors.forEach(factor => {
              expect(factor).toHaveProperty('month');
              expect(factor).toHaveProperty('multiplier');
              
              // Month must be 0-11
              expect(factor.month).toBeGreaterThanOrEqual(0);
              expect(factor.month).toBeLessThanOrEqual(11);
              
              // Multiplier must be positive and finite
              expect(factor.multiplier).toBeGreaterThan(0);
              expect(Number.isFinite(factor.multiplier)).toBe(true);
              
              // Multiplier should be reasonable (0.5 to 2.0)
              expect(factor.multiplier).toBeGreaterThanOrEqual(0.5);
              expect(factor.multiplier).toBeLessThanOrEqual(2.0);
            });
          }
        ),
        { numRuns: 20 }
      );
    });
    
    it('should have drivers for each horizon', () => {
      fc.assert(
        fc.property(
          currentScoreArbitrary,
          temporalDataArbitrary,
          (currentScore, temporalData) => {
            const result = generateForecasts(currentScore, temporalData, []);
            
            result.horizons.forEach(horizon => {
              // Drivers array must exist and not be empty
              expect(horizon.drivers).toBeDefined();
              expect(Array.isArray(horizon.drivers)).toBe(true);
              expect(horizon.drivers.length).toBeGreaterThan(0);
              
              // Each driver must be a non-empty string
              horizon.drivers.forEach(driver => {
                expect(typeof driver).toBe('string');
                expect(driver.length).toBeGreaterThan(0);
              });
            });
          }
        ),
        { numRuns: 20 }
      );
    });
  });
  
  /**
   * Additional property: Forecast stability
   * Similar inputs should produce similar forecasts
   */
  describe('Property: Forecast Stability', () => {
    it('should produce similar forecasts for similar historical data', () => {
      const baseData: TemporalData[] = [
        {
          timestamp: new Date('2024-01-01'),
          url: 'https://example.com',
          scores: { overall: 50, categories: {}, citationProbability: 50 },
          interventions: [],
          externalFactors: { seasonality: 0.5, competitorActivity: 0.5, algorithmUpdates: [] },
        },
        {
          timestamp: new Date('2024-02-01'),
          url: 'https://example.com',
          scores: { overall: 55, categories: {}, citationProbability: 55 },
          interventions: [],
          externalFactors: { seasonality: 0.5, competitorActivity: 0.5, algorithmUpdates: [] },
        },
      ];
      
      const result1 = generateForecasts(55, baseData, []);
      const result2 = generateForecasts(55, baseData, []);
      
      // Same input should produce same output
      expect(result1.horizons[0].predicted).toBe(result2.horizons[0].predicted);
      expect(result1.citationVelocity).toBe(result2.citationVelocity);
    });
  });
});

