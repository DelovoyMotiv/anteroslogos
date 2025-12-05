/**
 * Integration tests for Recommendation Prioritization System
 * Tests integration with other citation intelligence components
 */

import { describe, it, expect } from 'vitest';
import {
  calculateCausalImpact,
  prioritizeRecommendations,
  calculateCausalImpactsByType,
} from '../recommendationPrioritizer';
import type {
  Intervention,
  OutcomeData,
  StrategyRecommendation,
  TimeSeriesData,
} from '../../../types/citation-intelligence.types';

describe('Recommendation Prioritization Integration', () => {
  // ============================================================================
  // Real-world Scenario: Content Optimization Campaign
  // ============================================================================

  it('should prioritize recommendations for a content optimization campaign', () => {
    // Scenario: A website implemented multiple optimizations over 3 months
    // We want to identify which optimizations had the most impact

    // Historical interventions
    const interventions: Intervention[] = [
      {
        id: 'int-001',
        type: 'content_quality',
        description: 'Improved semantic density on 10 blog posts',
        implementedAt: new Date('2024-01-15'),
        url: 'https://example.com/blog',
        metadata: { pageCount: 10 },
        status: 'implemented',
      },
      {
        id: 'int-002',
        type: 'content_quality',
        description: 'Added entity mentions to 8 articles',
        implementedAt: new Date('2024-02-01'),
        url: 'https://example.com/articles',
        metadata: { pageCount: 8 },
        status: 'implemented',
      },
      {
        id: 'int-003',
        type: 'schema_markup',
        description: 'Added JSON-LD schema to all product pages',
        implementedAt: new Date('2024-01-20'),
        url: 'https://example.com/products',
        metadata: { pageCount: 50 },
        status: 'implemented',
      },
      {
        id: 'int-004',
        type: 'schema_markup',
        description: 'Implemented FAQ schema on support pages',
        implementedAt: new Date('2024-02-10'),
        url: 'https://example.com/support',
        metadata: { pageCount: 15 },
        status: 'implemented',
      },
      {
        id: 'int-005',
        type: 'entity_relationships',
        description: 'Built entity connections in knowledge base',
        implementedAt: new Date('2024-01-25'),
        url: 'https://example.com/kb',
        metadata: { entityCount: 100 },
        status: 'implemented',
      },
    ];

    // Outcome data showing before/after citation probability
    const outcomes = new Map<string, OutcomeData>([
      [
        'int-001',
        {
          interventionId: 'int-001',
          metric: 'citationProbability',
          before: [
            { timestamp: new Date('2024-01-01'), value: 45 },
            { timestamp: new Date('2024-01-08'), value: 46 },
            { timestamp: new Date('2024-01-14'), value: 45 },
          ],
          after: [
            { timestamp: new Date('2024-01-22'), value: 52 },
            { timestamp: new Date('2024-01-29'), value: 54 },
            { timestamp: new Date('2024-02-05'), value: 53 },
          ],
        },
      ],
      [
        'int-002',
        {
          interventionId: 'int-002',
          metric: 'citationProbability',
          before: [
            { timestamp: new Date('2024-01-15'), value: 48 },
            { timestamp: new Date('2024-01-22'), value: 49 },
            { timestamp: new Date('2024-01-29'), value: 48 },
          ],
          after: [
            { timestamp: new Date('2024-02-08'), value: 56 },
            { timestamp: new Date('2024-02-15'), value: 58 },
            { timestamp: new Date('2024-02-22'), value: 57 },
          ],
        },
      ],
      [
        'int-003',
        {
          interventionId: 'int-003',
          metric: 'citationProbability',
          before: [
            { timestamp: new Date('2024-01-01'), value: 50 },
            { timestamp: new Date('2024-01-08'), value: 51 },
            { timestamp: new Date('2024-01-15'), value: 50 },
          ],
          after: [
            { timestamp: new Date('2024-01-27'), value: 68 },
            { timestamp: new Date('2024-02-03'), value: 70 },
            { timestamp: new Date('2024-02-10'), value: 69 },
          ],
        },
      ],
      [
        'int-004',
        {
          interventionId: 'int-004',
          metric: 'citationProbability',
          before: [
            { timestamp: new Date('2024-01-25'), value: 52 },
            { timestamp: new Date('2024-02-01'), value: 53 },
            { timestamp: new Date('2024-02-08'), value: 52 },
          ],
          after: [
            { timestamp: new Date('2024-02-17'), value: 66 },
            { timestamp: new Date('2024-02-24'), value: 68 },
            { timestamp: new Date('2024-03-02'), value: 67 },
          ],
        },
      ],
      [
        'int-005',
        {
          interventionId: 'int-005',
          metric: 'citationProbability',
          before: [
            { timestamp: new Date('2024-01-10'), value: 55 },
            { timestamp: new Date('2024-01-17'), value: 56 },
            { timestamp: new Date('2024-01-24'), value: 55 },
          ],
          after: [
            { timestamp: new Date('2024-02-01'), value: 62 },
            { timestamp: new Date('2024-02-08'), value: 64 },
            { timestamp: new Date('2024-02-15'), value: 63 },
          ],
        },
      ],
    ]);

    // Calculate causal impacts by type
    const impactsByType = calculateCausalImpactsByType(interventions, outcomes);

    // Verify we have impacts for all three types
    expect(impactsByType.size).toBe(3);
    expect(impactsByType.has('content_quality')).toBe(true);
    expect(impactsByType.has('schema_markup')).toBe(true);
    expect(impactsByType.has('entity_relationships')).toBe(true);

    // Verify schema_markup has the highest impact
    const schemaImpact = impactsByType.get('schema_markup')!;
    const contentImpact = impactsByType.get('content_quality')!;
    const entityImpact = impactsByType.get('entity_relationships')!;

    expect(schemaImpact.effect).toBeGreaterThan(contentImpact.effect);
    expect(schemaImpact.effect).toBeGreaterThan(entityImpact.effect);

    // All should be statistically significant
    expect(schemaImpact.significance).toBe(true);
    expect(contentImpact.significance).toBe(true);
    expect(entityImpact.significance).toBe(true);

    // Create recommendations for future work
    const recommendations: StrategyRecommendation[] = [
      {
        id: 'rec-001',
        title: 'Expand Content Quality Improvements',
        description: 'Apply semantic density improvements to remaining 50 blog posts',
        category: 'content',
        type: 'content_quality',
        priority: 'medium',
        expectedImpact: {
          citationLift: 5,
          confidence: { lower: 3, upper: 7 },
        },
        effort: {
          level: 'high',
          estimatedHours: 40,
        },
        implementation: {
          steps: ['Audit remaining posts', 'Improve semantic density', 'Add entity mentions'],
          resources: ['Content team'],
          dependencies: [],
        },
      },
      {
        id: 'rec-002',
        title: 'Add Schema to Landing Pages',
        description: 'Implement JSON-LD schema on all landing pages',
        category: 'schema',
        type: 'schema_markup',
        priority: 'high',
        expectedImpact: {
          citationLift: 10,
          confidence: { lower: 8, upper: 12 },
        },
        effort: {
          level: 'low',
          estimatedHours: 8,
        },
        implementation: {
          steps: ['Generate schema', 'Validate', 'Deploy'],
          resources: ['Technical SEO'],
          dependencies: [],
        },
      },
      {
        id: 'rec-003',
        title: 'Build Entity Network',
        description: 'Expand entity relationships across all content',
        category: 'entity',
        type: 'entity_relationships',
        priority: 'medium',
        expectedImpact: {
          citationLift: 7,
          confidence: { lower: 5, upper: 9 },
        },
        effort: {
          level: 'medium',
          estimatedHours: 20,
        },
        implementation: {
          steps: ['Identify entities', 'Map relationships', 'Update content'],
          resources: ['Content strategist'],
          dependencies: ['Knowledge graph'],
        },
      },
    ];

    // Prioritize recommendations based on proven causal impact
    const prioritized = prioritizeRecommendations(
      recommendations,
      impactsByType,
      true // Filter significant only
    );

    // Verify prioritization
    expect(prioritized).toHaveLength(3); // All are significant
    expect(prioritized[0].type).toBe('schema_markup'); // Highest impact
    expect(prioritized[1].type).toBe('content_quality'); // Medium impact
    expect(prioritized[2].type).toBe('entity_relationships'); // Lower impact

    // Verify recommendations are enriched with causal data
    expect(prioritized[0].expectedImpact.citationLift).toBeGreaterThan(10);
    expect(prioritized[0].metadata?.causalImpact?.significance).toBe(true);
    expect(prioritized[0].metadata?.causalImpact?.pValue).toBeLessThan(0.05);

    // Verify confidence intervals are reasonable
    prioritized.forEach(rec => {
      expect(rec.expectedImpact.confidence.lower).toBeLessThan(rec.expectedImpact.citationLift);
      expect(rec.expectedImpact.confidence.upper).toBeGreaterThan(rec.expectedImpact.citationLift);
    });
  });

  // ============================================================================
  // Edge Case: Mixed Significance Levels
  // ============================================================================

  it('should handle recommendations with mixed significance levels', () => {
    const interventions: Intervention[] = [
      {
        id: 'int-001',
        type: 'high_impact',
        description: 'High impact intervention',
        implementedAt: new Date('2024-01-01'),
        url: 'https://example.com/page1',
        metadata: {},
        status: 'implemented',
      },
      {
        id: 'int-002',
        type: 'low_impact',
        description: 'Low impact intervention',
        implementedAt: new Date('2024-01-01'),
        url: 'https://example.com/page2',
        metadata: {},
        status: 'implemented',
      },
    ];

    const outcomes = new Map<string, OutcomeData>([
      [
        'int-001',
        {
          interventionId: 'int-001',
          metric: 'citationProbability',
          before: [
            { timestamp: new Date('2024-01-01'), value: 50 },
            { timestamp: new Date('2024-01-02'), value: 51 },
            { timestamp: new Date('2024-01-03'), value: 50 },
          ],
          after: [
            { timestamp: new Date('2024-01-04'), value: 70 },
            { timestamp: new Date('2024-01-05'), value: 72 },
            { timestamp: new Date('2024-01-06'), value: 71 },
          ],
        },
      ],
      [
        'int-002',
        {
          interventionId: 'int-002',
          metric: 'citationProbability',
          before: [
            { timestamp: new Date('2024-01-01'), value: 50 },
            { timestamp: new Date('2024-01-02'), value: 51 },
            { timestamp: new Date('2024-01-03'), value: 50 },
          ],
          after: [
            { timestamp: new Date('2024-01-04'), value: 52 },
            { timestamp: new Date('2024-01-05'), value: 53 },
            { timestamp: new Date('2024-01-06'), value: 52 },
          ],
        },
      ],
    ]);

    const impactsByType = calculateCausalImpactsByType(interventions, outcomes);

    const recommendations: StrategyRecommendation[] = [
      {
        id: 'rec-001',
        title: 'High Impact Recommendation',
        description: 'Based on proven high impact',
        category: 'content',
        type: 'high_impact',
        priority: 'high',
        expectedImpact: { citationLift: 5, confidence: { lower: 3, upper: 7 } },
        effort: { level: 'medium', estimatedHours: 10 },
        implementation: { steps: [], resources: [], dependencies: [] },
      },
      {
        id: 'rec-002',
        title: 'Low Impact Recommendation',
        description: 'Based on low impact',
        category: 'content',
        type: 'low_impact',
        priority: 'low',
        expectedImpact: { citationLift: 2, confidence: { lower: 0, upper: 4 } },
        effort: { level: 'low', estimatedHours: 2 },
        implementation: { steps: [], resources: [], dependencies: [] },
      },
    ];

    // Filter by significance
    const significantOnly = prioritizeRecommendations(recommendations, impactsByType, true);
    expect(significantOnly.length).toBeLessThanOrEqual(recommendations.length);
    expect(significantOnly.every(rec => rec.metadata?.causalImpact?.significance)).toBe(true);
    
    // Verify high impact is more significant than low impact
    const highImpact = impactsByType.get('high_impact')!;
    const lowImpact = impactsByType.get('low_impact')!;
    expect(highImpact.effect).toBeGreaterThan(lowImpact.effect);

    // Don't filter
    const all = prioritizeRecommendations(recommendations, impactsByType, false);
    expect(all).toHaveLength(recommendations.length);
    expect(all[0].expectedImpact.citationLift).toBeGreaterThan(all[1].expectedImpact.citationLift);
  });

  // ============================================================================
  // Performance Test: Large Dataset
  // ============================================================================

  it('should handle large datasets efficiently', () => {
    const startTime = Date.now();

    // Create 100 interventions
    const interventions: Intervention[] = Array.from({ length: 100 }, (_, i) => ({
      id: `int-${i}`,
      type: `type-${i % 10}`, // 10 different types
      description: `Intervention ${i}`,
      implementedAt: new Date('2024-01-01'),
      url: `https://example.com/page${i}`,
      metadata: {},
      status: 'implemented' as const,
    }));

    // Create outcome data for each
    const outcomes = new Map<string, OutcomeData>();
    for (let i = 0; i < 100; i++) {
      outcomes.set(`int-${i}`, {
        interventionId: `int-${i}`,
        metric: 'citationProbability',
        before: [
          { timestamp: new Date('2024-01-01'), value: 50 + Math.random() * 10 },
          { timestamp: new Date('2024-01-02'), value: 50 + Math.random() * 10 },
          { timestamp: new Date('2024-01-03'), value: 50 + Math.random() * 10 },
        ],
        after: [
          { timestamp: new Date('2024-01-04'), value: 60 + Math.random() * 10 },
          { timestamp: new Date('2024-01-05'), value: 60 + Math.random() * 10 },
          { timestamp: new Date('2024-01-06'), value: 60 + Math.random() * 10 },
        ],
      });
    }

    // Calculate impacts
    const impactsByType = calculateCausalImpactsByType(interventions, outcomes);

    // Create 100 recommendations
    const recommendations: StrategyRecommendation[] = Array.from({ length: 100 }, (_, i) => ({
      id: `rec-${i}`,
      title: `Recommendation ${i}`,
      description: `Description ${i}`,
      category: 'content' as const,
      type: `type-${i % 10}`,
      priority: 'medium' as const,
      expectedImpact: { citationLift: 5, confidence: { lower: 3, upper: 7 } },
      effort: { level: 'medium' as const, estimatedHours: 10 },
      implementation: { steps: [], resources: [], dependencies: [] },
    }));

    // Prioritize
    const prioritized = prioritizeRecommendations(recommendations, impactsByType, false);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete in reasonable time (< 1 second)
    expect(duration).toBeLessThan(1000);
    expect(prioritized).toHaveLength(100);
    expect(impactsByType.size).toBe(10); // 10 types
  });
});
