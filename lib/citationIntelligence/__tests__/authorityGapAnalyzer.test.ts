/**
 * Authority Gap Analyzer Tests
 * Unit tests for authority gap identification and analysis
 */

import { describe, it, expect } from 'vitest';
import {
  identifyAuthorityGaps,
  getTopGaps,
  filterGapsByOpportunity,
  getHighPriorityGaps,
  getMissingEntities,
  getWeakEntities,
  calculateGapStatistics,
  calculateCompetitivePositioning,
  generateCompetitiveStrategy,
} from '../authorityGapAnalyzer';
import type {
  KnowledgeGraph,
  Entity,
  Relationship,
  Claim,
} from '../../../types/citation-intelligence.types';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockEntity(name: string, id?: string): Entity {
  return {
    id: id || `entity_${name.toLowerCase().replace(/\s+/g, '_')}`,
    name,
    type: 'Organization',
    properties: {},
    mentions: 5,
    firstSeen: new Date('2024-01-01'),
    lastSeen: new Date('2024-12-01'),
  };
}

function createMockGraph(
  entities: Entity[],
  relationships: Relationship[] = [],
  claims: Claim[] = []
): KnowledgeGraph {
  return {
    entities,
    relationships,
    claims,
    metadata: {
      sourceUrl: 'https://example.com',
      extractedAt: new Date(),
      version: '1.0.0',
    },
  };
}

function createMockRelationship(sourceId: string, targetId: string): Relationship {
  return {
    id: `rel_${sourceId}_${targetId}`,
    sourceId,
    targetId,
    type: 'relatedTo',
    confidence: 0.8,
  };
}

function createMockClaim(entityId: string): Claim {
  return {
    id: `claim_${entityId}`,
    statement: 'Test claim',
    subjectId: entityId,
    evidence: [
      {
        type: 'citation',
        source: 'Test Source',
        confidence: 0.9,
      },
    ],
  };
}

// ============================================================================
// Gap Identification Tests
// ============================================================================

describe('identifyAuthorityGaps', () => {
  it('should identify missing entities', () => {
    const userGraph = createMockGraph([createMockEntity('Entity A')]);

    const competitorGraph = createMockGraph([
      createMockEntity('Entity A'),
      createMockEntity('Entity B'),
      createMockEntity('Entity C'),
    ]);

    const gaps = identifyAuthorityGaps(userGraph, [competitorGraph]);

    // Should find Entity B and Entity C as missing
    const missingEntities = gaps.filter(gap => gap.userScore === 0);
    expect(missingEntities.length).toBeGreaterThanOrEqual(2);

    const missingNames = missingEntities.map(gap => gap.entity);
    expect(missingNames).toContain('Entity B');
    expect(missingNames).toContain('Entity C');
  });

  it('should identify entities with authority gaps', () => {
    // User has Entity A with minimal relationships
    const entityA1 = createMockEntity('Entity A', 'entity_a_user');
    const userGraph = createMockGraph([entityA1]);

    // Competitor has Entity A with many relationships
    const entityA2 = createMockEntity('Entity A', 'entity_a_comp');
    const entityB = createMockEntity('Entity B', 'entity_b');
    const entityC = createMockEntity('Entity C', 'entity_c');
    const entityD = createMockEntity('Entity D', 'entity_d');

    const competitorGraph = createMockGraph(
      [entityA2, entityB, entityC, entityD],
      [
        createMockRelationship('entity_a_comp', 'entity_b'),
        createMockRelationship('entity_a_comp', 'entity_c'),
        createMockRelationship('entity_a_comp', 'entity_d'),
      ]
    );

    const gaps = identifyAuthorityGaps(userGraph, [competitorGraph]);

    // Should find Entity A with a gap
    const entityAGap = gaps.find(gap => gap.entity === 'Entity A');
    expect(entityAGap).toBeDefined();
    expect(entityAGap!.userScore).toBeGreaterThan(0);
    expect(entityAGap!.competitorScore).toBeGreaterThan(entityAGap!.userScore);
    expect(entityAGap!.gap).toBeGreaterThan(0);
  });

  it('should categorize opportunities correctly', () => {
    const userGraph = createMockGraph([]);

    // Create competitor with high-authority entity
    const entityHigh = createMockEntity('High Authority Entity', 'entity_high');
    const supportEntities = Array.from({ length: 20 }, (_, i) =>
      createMockEntity(`Support ${i}`, `support_${i}`)
    );

    const relationships = supportEntities.map(e =>
      createMockRelationship('entity_high', e.id)
    );

    const claims = Array.from({ length: 10 }, () => createMockClaim('entity_high'));

    const competitorGraph = createMockGraph(
      [entityHigh, ...supportEntities],
      relationships,
      claims
    );

    const gaps = identifyAuthorityGaps(userGraph, [competitorGraph]);

    // High authority entity should be high opportunity
    const highGap = gaps.find(gap => gap.entity === 'High Authority Entity');
    expect(highGap).toBeDefined();
    expect(highGap!.opportunity).toBe('high');
  });

  it('should handle multiple competitors', () => {
    const userGraph = createMockGraph([createMockEntity('Entity A')]);

    const competitor1 = createMockGraph([
      createMockEntity('Entity A'),
      createMockEntity('Entity B'),
    ]);

    const competitor2 = createMockGraph([
      createMockEntity('Entity A'),
      createMockEntity('Entity C'),
    ]);

    const gaps = identifyAuthorityGaps(userGraph, [competitor1, competitor2]);

    // Should find both Entity B and Entity C
    const missingEntities = gaps.filter(gap => gap.userScore === 0);
    expect(missingEntities.length).toBeGreaterThanOrEqual(2);
  });

  it('should provide recommendations for gaps', () => {
    const userGraph = createMockGraph([]);
    const competitorGraph = createMockGraph([createMockEntity('Missing Entity')]);

    const gaps = identifyAuthorityGaps(userGraph, [competitorGraph]);

    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps[0].recommendations).toBeDefined();
    expect(gaps[0].recommendations.length).toBeGreaterThan(0);
  });

  it('should sort gaps by opportunity and size', () => {
    const userGraph = createMockGraph([]);

    // Create entities with varying authority levels
    const lowEntity = createMockEntity('Low Entity', 'low');
    const medEntity = createMockEntity('Medium Entity', 'med');
    const highEntity = createMockEntity('High Entity', 'high');

    // High entity has many relationships
    const highSupport = Array.from({ length: 15 }, (_, i) =>
      createMockEntity(`High Support ${i}`, `high_sup_${i}`)
    );
    const highRels = highSupport.map(e => createMockRelationship('high', e.id));

    // Medium entity has some relationships
    const medSupport = Array.from({ length: 5 }, (_, i) =>
      createMockEntity(`Med Support ${i}`, `med_sup_${i}`)
    );
    const medRels = medSupport.map(e => createMockRelationship('med', e.id));

    const competitorGraph = createMockGraph(
      [lowEntity, medEntity, highEntity, ...highSupport, ...medSupport],
      [...highRels, ...medRels]
    );

    const gaps = identifyAuthorityGaps(userGraph, [competitorGraph]);

    // First gap should be high opportunity
    if (gaps.length > 0) {
      expect(['high', 'medium']).toContain(gaps[0].opportunity);
    }
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('Gap Utility Functions', () => {
  const mockGaps = [
    {
      entity: 'High Gap 1',
      userScore: 20,
      competitorScore: 80,
      gap: 60,
      opportunity: 'high' as const,
      recommendations: ['Rec 1'],
    },
    {
      entity: 'High Gap 2',
      userScore: 0,
      competitorScore: 75,
      gap: 75,
      opportunity: 'high' as const,
      recommendations: ['Rec 2'],
    },
    {
      entity: 'Medium Gap',
      userScore: 40,
      competitorScore: 60,
      gap: 20,
      opportunity: 'medium' as const,
      recommendations: ['Rec 3'],
    },
    {
      entity: 'Low Gap',
      userScore: 50,
      competitorScore: 60,
      gap: 10,
      opportunity: 'low' as const,
      recommendations: ['Rec 4'],
    },
  ];

  describe('getTopGaps', () => {
    it('should return top N gaps', () => {
      const top = getTopGaps(mockGaps, 2);
      expect(top.length).toBe(2);
    });
  });

  describe('filterGapsByOpportunity', () => {
    it('should filter by opportunity level', () => {
      const high = filterGapsByOpportunity(mockGaps, 'high');
      expect(high.length).toBe(2);
      expect(high.every(gap => gap.opportunity === 'high')).toBe(true);
    });
  });

  describe('getHighPriorityGaps', () => {
    it('should return only high opportunity gaps', () => {
      const high = getHighPriorityGaps(mockGaps);
      expect(high.length).toBe(2);
      expect(high.every(gap => gap.opportunity === 'high')).toBe(true);
    });
  });

  describe('getMissingEntities', () => {
    it('should return gaps where user score is 0', () => {
      const missing = getMissingEntities(mockGaps);
      expect(missing.length).toBe(1);
      expect(missing[0].entity).toBe('High Gap 2');
    });
  });

  describe('getWeakEntities', () => {
    it('should return entities with low user scores', () => {
      const weak = getWeakEntities(mockGaps, 30);
      expect(weak.length).toBe(1);
      expect(weak[0].entity).toBe('High Gap 1');
    });
  });

  describe('calculateGapStatistics', () => {
    it('should calculate comprehensive statistics', () => {
      const stats = calculateGapStatistics(mockGaps);

      expect(stats.totalGaps).toBe(4);
      expect(stats.missingEntities).toBe(1);
      expect(stats.highOpportunityCount).toBe(2);
      expect(stats.mediumOpportunityCount).toBe(1);
      expect(stats.lowOpportunityCount).toBe(1);
      expect(stats.averageGap).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Competitive Positioning Tests
// ============================================================================

describe('calculateCompetitivePositioning', () => {
  it('should calculate positioning score', () => {
    const userGraph = createMockGraph([
      createMockEntity('Entity A'),
      createMockEntity('Entity B'),
    ]);

    const competitorGraph = createMockGraph([
      createMockEntity('Entity A'),
      createMockEntity('Entity B'),
    ]);

    const positioning = calculateCompetitivePositioning(userGraph, [competitorGraph]);

    expect(positioning.score).toBeGreaterThanOrEqual(0);
    expect(positioning.score).toBeLessThanOrEqual(100);
    expect(positioning.interpretation).toBeDefined();
    expect(Array.isArray(positioning.strengths)).toBe(true);
    expect(Array.isArray(positioning.weaknesses)).toBe(true);
  });

  it('should identify strong position when user is ahead', () => {
    // User has more entities and relationships
    const userEntities = Array.from({ length: 10 }, (_, i) =>
      createMockEntity(`Entity ${i}`, `user_${i}`)
    );
    const userRels = Array.from({ length: 20 }, (_, i) =>
      createMockRelationship(`user_${i % 10}`, `user_${(i + 1) % 10}`)
    );
    const userGraph = createMockGraph(userEntities, userRels);

    // Competitor has fewer entities
    const compEntities = Array.from({ length: 5 }, (_, i) =>
      createMockEntity(`Entity ${i}`, `comp_${i}`)
    );
    const competitorGraph = createMockGraph(compEntities);

    const positioning = calculateCompetitivePositioning(userGraph, [competitorGraph]);

    expect(positioning.score).toBeGreaterThan(50);
  });

  it('should identify weak position when user is behind', () => {
    // User has minimal entities
    const userGraph = createMockGraph([createMockEntity('Entity A')]);

    // Competitor has many entities with relationships
    const compEntities = Array.from({ length: 10 }, (_, i) =>
      createMockEntity(`Entity ${i}`, `comp_${i}`)
    );
    const compRels = Array.from({ length: 20 }, (_, i) =>
      createMockRelationship(`comp_${i % 10}`, `comp_${(i + 1) % 10}`)
    );
    const competitorGraph = createMockGraph(compEntities, compRels);

    const positioning = calculateCompetitivePositioning(userGraph, [competitorGraph]);

    expect(positioning.score).toBeLessThan(50);
  });
});

// ============================================================================
// Competitive Strategy Tests
// ============================================================================

describe('generateCompetitiveStrategy', () => {
  it('should generate comprehensive strategy report', () => {
    const userGraph = createMockGraph([createMockEntity('Entity A')]);

    const competitorGraph = createMockGraph([
      createMockEntity('Entity A'),
      createMockEntity('Entity B'),
      createMockEntity('Entity C'),
    ]);

    const strategy = generateCompetitiveStrategy(userGraph, [competitorGraph]);

    expect(strategy.positioning).toBeDefined();
    expect(strategy.gaps).toBeDefined();
    expect(Array.isArray(strategy.gaps)).toBe(true);
    expect(strategy.statistics).toBeDefined();
    expect(strategy.priorityActions).toBeDefined();
    expect(Array.isArray(strategy.priorityActions)).toBe(true);
  });

  it('should prioritize high-opportunity actions', () => {
    const userGraph = createMockGraph([]);

    // Create competitor with high-authority entities
    const entityA = createMockEntity('Entity A', 'entity_a');
    const supportEntities = Array.from({ length: 15 }, (_, i) =>
      createMockEntity(`Support ${i}`, `support_${i}`)
    );

    const relationships = supportEntities.map(e =>
      createMockRelationship('entity_a', e.id)
    );

    const claims = Array.from({ length: 10 }, () => createMockClaim('entity_a'));

    const competitorGraph = createMockGraph(
      [entityA, ...supportEntities],
      relationships,
      claims
    );

    const strategy = generateCompetitiveStrategy(userGraph, [competitorGraph]);

    // Should have priority actions for high-authority entities
    expect(strategy.priorityActions.length).toBeGreaterThan(0);
  });
});
