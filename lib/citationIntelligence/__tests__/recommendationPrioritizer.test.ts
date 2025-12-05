/**
 * Unit tests for Recommendation Prioritization System
 * Tests causal impact calculation and recommendation ranking
 */

import { describe, it, expect } from 'vitest';
import {
  calculateCausalImpact,
  prioritizeRecommendations,
  calculateCausalImpactsByType,
  formatRecommendationWithCausalImpact,
  generateRecommendationSummary,
} from '../recommendationPrioritizer';
import type {
  Intervention,
  OutcomeData,
  StrategyRecommendation,
  TimeSeriesData,
} from '../../../types/citation-intelligence.types';

describe('Recommendation Prioritization System', () => {
  // ============================================================================
  // Test Data
  // ============================================================================

  const createTimeSeriesData = (
    values: number[],
    startDate: Date = new Date('2024-01-01')
  ): TimeSeriesData[] => {
    return values.map((value, i) => ({
      timestamp: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000),
      value,
    }));
  };

  const sampleIntervention: Intervention = {
    id: 'int-1',
    type: 'content_optimization',
    description: 'Added structured data and improved semantic density',
    implementedAt: new Date('2024-02-01'),
    url: 'https://example.com/page1',
    metadata: {},
    status: 'implemented',
  };

  // ============================================================================
  // Causal Impact Calculation Tests
  // ============================================================================

  describe('calculateCausalImpact', () => {
    it('should calculate positive causal impact with control group', () => {
      const outcomeData: OutcomeData = {
        interventionId: 'int-1',
        metric: 'citationProbability',
        before: createTimeSeriesData([50, 52, 51, 53, 52]),
        after: createTimeSeriesData([60, 62, 61, 63, 62], new Date('2024-02-01')),
        control: createTimeSeriesData([50, 51, 50, 52, 51, 51, 52, 51, 53, 52]),
      };

      const impact = calculateCausalImpact(sampleIntervention, outcomeData);

      expect(impact.effect).toBeGreaterThan(0);
      expect(impact.confidence.lower).toBeLessThan(impact.effect);
      expect(impact.confidence.upper).toBeGreaterThan(impact.effect);
      expect(impact.pValue).toBeGreaterThanOrEqual(0);
      expect(impact.pValue).toBeLessThanOrEqual(1);
      expect(impact.counterfactual).toHaveLength(5);
    });

    it('should calculate negative causal impact', () => {
      const outcomeData: OutcomeData = {
        interventionId: 'int-1',
        metric: 'citationProbability',
        before: createTimeSeriesData([60, 62, 61, 63, 62]),
        after: createTimeSeriesData([50, 52, 51, 53, 52], new Date('2024-02-01')),
      };

      const impact = calculateCausalImpact(sampleIntervention, outcomeData);

      expect(impact.effect).toBeLessThan(0);
      expect(impact.confidence.lower).toBeLessThan(impact.effect);
      expect(impact.confidence.upper).toBeGreaterThan(impact.effect);
    });

    it('should handle no change scenario', () => {
      const outcomeData: OutcomeData = {
        interventionId: 'int-1',
        metric: 'citationProbability',
        before: createTimeSeriesData([50, 50, 50, 50, 50]),
        after: createTimeSeriesData([50, 50, 50, 50, 50], new Date('2024-02-01')),
      };

      const impact = calculateCausalImpact(sampleIntervention, outcomeData);

      expect(Math.abs(impact.effect)).toBeLessThan(0.1);
      expect(impact.pValue).toBeGreaterThan(0.05);
      expect(impact.significance).toBe(false);
    });

    it('should mark significant effects with p < 0.05', () => {
      const outcomeData: OutcomeData = {
        interventionId: 'int-1',
        metric: 'citationProbability',
        before: createTimeSeriesData([50, 51, 50, 52, 51]),
        after: createTimeSeriesData([70, 71, 70, 72, 71], new Date('2024-02-01')),
      };

      const impact = calculateCausalImpact(sampleIntervention, outcomeData);

      expect(impact.effect).toBeGreaterThan(15);
      expect(impact.pValue).toBeLessThan(0.05);
      expect(impact.significance).toBe(true);
    });

    it('should handle empty data gracefully', () => {
      const outcomeData: OutcomeData = {
        interventionId: 'int-1',
        metric: 'citationProbability',
        before: [],
        after: [],
      };

      const impact = calculateCausalImpact(sampleIntervention, outcomeData);

      expect(impact.effect).toBe(0);
      expect(impact.pValue).toBe(1.0);
      expect(impact.significance).toBe(false);
      expect(impact.counterfactual).toEqual([]);
    });

    it('should generate counterfactual predictions', () => {
      const outcomeData: OutcomeData = {
        interventionId: 'int-1',
        metric: 'citationProbability',
        before: createTimeSeriesData([50, 52, 51]),
        after: createTimeSeriesData([60, 62, 61], new Date('2024-02-01')),
      };

      const impact = calculateCausalImpact(sampleIntervention, outcomeData);

      expect(impact.counterfactual).toHaveLength(3);
      expect(impact.counterfactual.every(v => typeof v === 'number')).toBe(true);
    });
  });

  // ============================================================================
  // Recommendation Prioritization Tests
  // ============================================================================

  describe('prioritizeRecommendations', () => {
    const createRecommendation = (
      id: string,
      category: string,
      lift: number = 5,
      effort: 'low' | 'medium' | 'high' = 'medium'
    ): StrategyRecommendation => ({
      id,
      title: `Recommendation ${id}`,
      description: `Description for ${id}`,
      category: category as any,
      type: category,
      priority: 'medium',
      expectedImpact: {
        citationLift: lift,
        confidence: { lower: lift - 2, upper: lift + 2 },
      },
      effort: {
        level: effort,
        estimatedHours: effort === 'low' ? 2 : effort === 'medium' ? 8 : 20,
      },
      implementation: {
        steps: [],
        resources: [],
        dependencies: [],
      },
    });

    it('should prioritize by expected citation lift', () => {
      const recommendations = [
        createRecommendation('rec-1', 'content', 5),
        createRecommendation('rec-2', 'schema', 15),
        createRecommendation('rec-3', 'entity', 10),
      ];

      const causalImpacts = new Map([
        ['content', { effect: 5, confidence: { lower: 3, upper: 7 }, pValue: 0.01, significance: true, counterfactual: [] }],
        ['schema', { effect: 15, confidence: { lower: 13, upper: 17 }, pValue: 0.001, significance: true, counterfactual: [] }],
        ['entity', { effect: 10, confidence: { lower: 8, upper: 12 }, pValue: 0.01, significance: true, counterfactual: [] }],
      ]);

      const prioritized = prioritizeRecommendations(recommendations, causalImpacts, false);

      expect(prioritized).toHaveLength(3);
      expect(prioritized[0].id).toBe('rec-2'); // Highest lift
      expect(prioritized[1].id).toBe('rec-3'); // Medium lift
      expect(prioritized[2].id).toBe('rec-1'); // Lowest lift
    });

    it('should filter by significance when requested', () => {
      const recommendations = [
        createRecommendation('rec-1', 'content', 5),
        createRecommendation('rec-2', 'schema', 15),
        createRecommendation('rec-3', 'entity', 10),
      ];

      const causalImpacts = new Map([
        ['content', { effect: 5, confidence: { lower: 3, upper: 7 }, pValue: 0.01, significance: true, counterfactual: [] }],
        ['schema', { effect: 15, confidence: { lower: 13, upper: 17 }, pValue: 0.10, significance: false, counterfactual: [] }],
        ['entity', { effect: 10, confidence: { lower: 8, upper: 12 }, pValue: 0.02, significance: true, counterfactual: [] }],
      ]);

      const prioritized = prioritizeRecommendations(recommendations, causalImpacts, true);

      expect(prioritized).toHaveLength(2);
      expect(prioritized.every(rec => rec.metadata?.causalImpact?.significance)).toBe(true);
      expect(prioritized.find(rec => rec.id === 'rec-2')).toBeUndefined();
    });

    it('should include all recommendations when not filtering', () => {
      const recommendations = [
        createRecommendation('rec-1', 'content', 5),
        createRecommendation('rec-2', 'schema', 15),
      ];

      const causalImpacts = new Map([
        ['content', { effect: 5, confidence: { lower: 3, upper: 7 }, pValue: 0.10, significance: false, counterfactual: [] }],
        ['schema', { effect: 15, confidence: { lower: 13, upper: 17 }, pValue: 0.10, significance: false, counterfactual: [] }],
      ]);

      const prioritized = prioritizeRecommendations(recommendations, causalImpacts, false);

      expect(prioritized).toHaveLength(2);
    });

    it('should use effort as tiebreaker', () => {
      const recommendations = [
        createRecommendation('rec-1', 'content', 10, 'high'),
        createRecommendation('rec-2', 'schema', 10, 'low'),
        createRecommendation('rec-3', 'entity', 10, 'medium'),
      ];

      const causalImpacts = new Map([
        ['content', { effect: 10, confidence: { lower: 8, upper: 12 }, pValue: 0.01, significance: true, counterfactual: [] }],
        ['schema', { effect: 10, confidence: { lower: 8, upper: 12 }, pValue: 0.01, significance: true, counterfactual: [] }],
        ['entity', { effect: 10, confidence: { lower: 8, upper: 12 }, pValue: 0.01, significance: true, counterfactual: [] }],
      ]);

      const prioritized = prioritizeRecommendations(recommendations, causalImpacts, false);

      expect(prioritized[0].effort.level).toBe('low');
      expect(prioritized[1].effort.level).toBe('medium');
      expect(prioritized[2].effort.level).toBe('high');
    });

    it('should enrich recommendations with causal impact data', () => {
      const recommendations = [createRecommendation('rec-1', 'content', 5)];

      const causalImpacts = new Map([
        ['content', { effect: 8, confidence: { lower: 6, upper: 10 }, pValue: 0.01, significance: true, counterfactual: [] }],
      ]);

      const prioritized = prioritizeRecommendations(recommendations, causalImpacts, false);

      expect(prioritized[0].expectedImpact.citationLift).toBe(8);
      expect(prioritized[0].expectedImpact.confidence.lower).toBe(6);
      expect(prioritized[0].expectedImpact.confidence.upper).toBe(10);
      expect(prioritized[0].metadata?.causalImpact?.pValue).toBe(0.01);
      expect(prioritized[0].metadata?.causalImpact?.significance).toBe(true);
    });
  });

  // ============================================================================
  // Causal Impacts by Type Tests
  // ============================================================================

  describe('calculateCausalImpactsByType', () => {
    it('should aggregate impacts by intervention type', () => {
      const interventions: Intervention[] = [
        { ...sampleIntervention, id: 'int-1', type: 'content' },
        { ...sampleIntervention, id: 'int-2', type: 'content' },
        { ...sampleIntervention, id: 'int-3', type: 'schema' },
      ];

      const outcomes = new Map<string, OutcomeData>([
        [
          'int-1',
          {
            interventionId: 'int-1',
            metric: 'citationProbability',
            before: createTimeSeriesData([50, 51, 50]),
            after: createTimeSeriesData([60, 61, 60], new Date('2024-02-01')),
          },
        ],
        [
          'int-2',
          {
            interventionId: 'int-2',
            metric: 'citationProbability',
            before: createTimeSeriesData([55, 56, 55]),
            after: createTimeSeriesData([65, 66, 65], new Date('2024-02-01')),
          },
        ],
        [
          'int-3',
          {
            interventionId: 'int-3',
            metric: 'citationProbability',
            before: createTimeSeriesData([50, 51, 50]),
            after: createTimeSeriesData([70, 71, 70], new Date('2024-02-01')),
          },
        ],
      ]);

      const impactsByType = calculateCausalImpactsByType(interventions, outcomes);

      expect(impactsByType.size).toBe(2);
      expect(impactsByType.has('content')).toBe(true);
      expect(impactsByType.has('schema')).toBe(true);

      const contentImpact = impactsByType.get('content')!;
      expect(contentImpact.effect).toBeGreaterThan(0);
      expect(contentImpact.confidence.lower).toBeLessThan(contentImpact.effect);
      expect(contentImpact.confidence.upper).toBeGreaterThan(contentImpact.effect);
    });

    it('should handle interventions without outcome data', () => {
      const interventions: Intervention[] = [
        { ...sampleIntervention, id: 'int-1', type: 'content' },
        { ...sampleIntervention, id: 'int-2', type: 'schema' },
      ];

      const outcomes = new Map<string, OutcomeData>([
        [
          'int-1',
          {
            interventionId: 'int-1',
            metric: 'citationProbability',
            before: createTimeSeriesData([50, 51, 50]),
            after: createTimeSeriesData([60, 61, 60], new Date('2024-02-01')),
          },
        ],
      ]);

      const impactsByType = calculateCausalImpactsByType(interventions, outcomes);

      expect(impactsByType.size).toBe(1);
      expect(impactsByType.has('content')).toBe(true);
      expect(impactsByType.has('schema')).toBe(false);
    });
  });

  // ============================================================================
  // Display Formatting Tests
  // ============================================================================

  describe('formatRecommendationWithCausalImpact', () => {
    it('should format recommendation with causal impact', () => {
      const recommendation: StrategyRecommendation = {
        id: 'rec-1',
        title: 'Add Structured Data',
        description: 'Implement JSON-LD schema markup',
        category: 'schema',
        priority: 'high',
        expectedImpact: {
          citationLift: 12.5,
          confidence: { lower: 10.2, upper: 14.8 },
        },
        effort: {
          level: 'medium',
          estimatedHours: 8,
        },
        implementation: {
          steps: [],
          resources: [],
          dependencies: [],
        },
        metadata: {
          causalImpact: {
            effect: 12.5,
            pValue: 0.0123,
            significance: true,
          },
        },
      };

      const formatted = formatRecommendationWithCausalImpact(recommendation);

      expect(formatted.title).toBe('Add Structured Data');
      expect(formatted.expectedLift).toBe('+12.5 points');
      expect(formatted.confidence).toBe('95% CI: [10.2, 14.8]');
      expect(formatted.significance).toContain('Significant');
      expect(formatted.significance).toContain('0.0123');
      expect(formatted.priority).toBe('HIGH');
      expect(formatted.effort).toBe('medium (8h)');
    });

    it('should handle non-significant recommendations', () => {
      const recommendation: StrategyRecommendation = {
        id: 'rec-1',
        title: 'Test Recommendation',
        description: 'Test description',
        category: 'content',
        priority: 'low',
        expectedImpact: {
          citationLift: 2.0,
          confidence: { lower: -1.0, upper: 5.0 },
        },
        effort: {
          level: 'low',
          estimatedHours: 2,
        },
        implementation: {
          steps: [],
          resources: [],
          dependencies: [],
        },
        metadata: {
          causalImpact: {
            effect: 2.0,
            pValue: 0.15,
            significance: false,
          },
        },
      };

      const formatted = formatRecommendationWithCausalImpact(recommendation);

      expect(formatted.significance).toBe('Not significant');
    });
  });

  // ============================================================================
  // Summary Statistics Tests
  // ============================================================================

  describe('generateRecommendationSummary', () => {
    it('should generate accurate summary statistics', () => {
      const recommendations: StrategyRecommendation[] = [
        {
          id: 'rec-1',
          title: 'Rec 1',
          description: 'Desc 1',
          category: 'content',
          priority: 'high',
          expectedImpact: { citationLift: 10, confidence: { lower: 8, upper: 12 } },
          effort: { level: 'low', estimatedHours: 2 },
          implementation: { steps: [], resources: [], dependencies: [] },
          metadata: { causalImpact: { effect: 10, pValue: 0.01, significance: true } },
        },
        {
          id: 'rec-2',
          title: 'Rec 2',
          description: 'Desc 2',
          category: 'schema',
          priority: 'high',
          expectedImpact: { citationLift: 15, confidence: { lower: 13, upper: 17 } },
          effort: { level: 'medium', estimatedHours: 8 },
          implementation: { steps: [], resources: [], dependencies: [] },
          metadata: { causalImpact: { effect: 15, pValue: 0.001, significance: true } },
        },
        {
          id: 'rec-3',
          title: 'Rec 3',
          description: 'Desc 3',
          category: 'entity',
          priority: 'medium',
          expectedImpact: { citationLift: 5, confidence: { lower: 2, upper: 8 } },
          effort: { level: 'low', estimatedHours: 3 },
          implementation: { steps: [], resources: [], dependencies: [] },
          metadata: { causalImpact: { effect: 5, pValue: 0.10, significance: false } },
        },
      ];

      const summary = generateRecommendationSummary(recommendations);

      expect(summary.totalRecommendations).toBe(3);
      expect(summary.significantRecommendations).toBe(2);
      expect(summary.averageExpectedLift).toBe(10);
      expect(summary.totalExpectedLift).toBe(30);
      expect(summary.highPriorityCount).toBe(2);
      expect(summary.lowEffortCount).toBe(2);
    });

    it('should handle empty recommendations list', () => {
      const summary = generateRecommendationSummary([]);

      expect(summary.totalRecommendations).toBe(0);
      expect(summary.significantRecommendations).toBe(0);
      expect(summary.averageExpectedLift).toBe(0);
      expect(summary.totalExpectedLift).toBe(0);
      expect(summary.highPriorityCount).toBe(0);
      expect(summary.lowEffortCount).toBe(0);
    });
  });
});
