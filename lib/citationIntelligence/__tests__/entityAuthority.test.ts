/**
 * Entity Authority Calculator Tests
 * Unit tests for entity authority calculation functions
 */

import { describe, it, expect } from 'vitest';
import {
  calculateEntityAuthority,
  calculateAllEntityAuthorities,
  calculateRelationshipDensity,
  calculateClaimEvidence,
  calculateExternalValidation,
  calculateTemporalConsistency,
  calculateCompetitiveRanking,
  calculateGrowthTrend,
  getTopEntities,
  getLowAuthorityEntities,
  calculateAverageAuthority,
  groupByAuthorityTier,
  type ExternalValidationData,
} from '../entityAuthority';
import type {
  KnowledgeGraph,
  Entity,
  Relationship,
  Claim,
  EntityAuthority,
  TemporalData,
} from '../../../types/citation-intelligence.types';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockEntity(overrides?: Partial<Entity>): Entity {
  return {
    id: 'entity_1',
    name: 'Test Entity',
    type: 'Organization',
    properties: {},
    mentions: 5,
    firstSeen: new Date('2024-01-01'),
    lastSeen: new Date('2024-12-01'),
    ...overrides,
  };
}

function createMockRelationship(
  sourceId: string,
  targetId: string,
  overrides?: Partial<Relationship>
): Relationship {
  return {
    id: `rel_${sourceId}_${targetId}`,
    sourceId,
    targetId,
    type: 'relatedTo',
    confidence: 0.8,
    ...overrides,
  };
}

function createMockClaim(entityId: string, overrides?: Partial<Claim>): Claim {
  return {
    id: `claim_${entityId}`,
    statement: 'Test claim statement',
    subjectId: entityId,
    evidence: [
      {
        type: 'citation',
        source: 'Test Source',
        confidence: 0.9,
      },
    ],
    ...overrides,
  };
}

function createMockGraph(
  entities: Entity[],
  relationships: Relationship[],
  claims: Claim[]
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

// ============================================================================
// Relationship Density Tests
// ============================================================================

describe('calculateRelationshipDensity', () => {
  it('should return 0 for entity with no relationships', () => {
    const entity = createMockEntity();
    const graph = createMockGraph([entity], [], []);

    const score = calculateRelationshipDensity(entity, graph);

    expect(score).toBe(0);
  });

  it('should calculate score for entity with relationships', () => {
    const entity1 = createMockEntity({ id: 'entity_1' });
    const entity2 = createMockEntity({ id: 'entity_2' });
    const entity3 = createMockEntity({ id: 'entity_3' });

    const relationships = [
      createMockRelationship('entity_1', 'entity_2'),
      createMockRelationship('entity_1', 'entity_3'),
    ];

    const graph = createMockGraph([entity1, entity2, entity3], relationships, []);

    const score = calculateRelationshipDensity(entity1, graph);

    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should give higher scores for more relationships', () => {
    const entity1 = createMockEntity({ id: 'entity_1' });
    const entities = [entity1];
    
    // Create 10 additional entities
    for (let i = 2; i <= 11; i++) {
      entities.push(createMockEntity({ id: `entity_${i}` }));
    }

    // Create relationships from entity1 to all others
    const relationships = entities
      .slice(1)
      .map(e => createMockRelationship('entity_1', e.id));

    const graph = createMockGraph(entities, relationships, []);

    const score = calculateRelationshipDensity(entity1, graph);

    // 10 relationships should give a moderate score
    expect(score).toBeGreaterThan(30);
    expect(score).toBeLessThan(60);
  });

  it('should consider relationship confidence', () => {
    const entity1 = createMockEntity({ id: 'entity_1' });
    const entity2 = createMockEntity({ id: 'entity_2' });

    const highConfidenceRel = createMockRelationship('entity_1', 'entity_2', {
      confidence: 0.95,
    });

    const lowConfidenceRel = createMockRelationship('entity_1', 'entity_2', {
      confidence: 0.3,
    });

    const graphHigh = createMockGraph([entity1, entity2], [highConfidenceRel], []);
    const graphLow = createMockGraph([entity1, entity2], [lowConfidenceRel], []);

    const scoreHigh = calculateRelationshipDensity(entity1, graphHigh);
    const scoreLow = calculateRelationshipDensity(entity1, graphLow);

    expect(scoreHigh).toBeGreaterThan(scoreLow);
  });
});

// ============================================================================
// Claim Evidence Tests
// ============================================================================

describe('calculateClaimEvidence', () => {
  it('should return 0 for entity with no claims', () => {
    const entity = createMockEntity();
    const graph = createMockGraph([entity], [], []);

    const score = calculateClaimEvidence(entity, graph);

    expect(score).toBe(0);
  });

  it('should calculate score for entity with claims', () => {
    const entity = createMockEntity({ id: 'entity_1' });
    const claim = createMockClaim('entity_1');
    const graph = createMockGraph([entity], [], [claim]);

    const score = calculateClaimEvidence(entity, graph);

    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should give higher scores for more evidence', () => {
    const entity = createMockEntity({ id: 'entity_1' });
    
    const claimWithMultipleEvidence = createMockClaim('entity_1', {
      evidence: [
        { type: 'citation', source: 'Source 1', confidence: 0.9 },
        { type: 'data', source: 'Source 2', confidence: 0.85 },
        { type: 'expert_opinion', source: 'Expert', confidence: 0.95 },
      ],
    });

    const claimWithSingleEvidence = createMockClaim('entity_1', {
      evidence: [
        { type: 'data', source: 'Source 1', confidence: 0.8 },
      ],
    });

    const graphMultiple = createMockGraph([entity], [], [claimWithMultipleEvidence]);
    const graphSingle = createMockGraph([entity], [], [claimWithSingleEvidence]);

    const scoreMultiple = calculateClaimEvidence(entity, graphMultiple);
    const scoreSingle = calculateClaimEvidence(entity, graphSingle);

    expect(scoreMultiple).toBeGreaterThan(scoreSingle);
  });

  it('should value expert opinions highly', () => {
    const entity = createMockEntity({ id: 'entity_1' });
    
    const claimWithExpert = createMockClaim('entity_1', {
      evidence: [
        { type: 'expert_opinion', source: 'Dr. Expert', confidence: 0.9 },
      ],
    });

    const claimWithData = createMockClaim('entity_1', {
      evidence: [
        { type: 'data', source: 'Data Source', confidence: 0.9 },
      ],
    });

    const graphExpert = createMockGraph([entity], [], [claimWithExpert]);
    const graphData = createMockGraph([entity], [], [claimWithData]);

    const scoreExpert = calculateClaimEvidence(entity, graphExpert);
    const scoreData = calculateClaimEvidence(entity, graphData);

    expect(scoreExpert).toBeGreaterThan(scoreData);
  });
});

// ============================================================================
// External Validation Tests
// ============================================================================

describe('calculateExternalValidation', () => {
  it('should return 0 when no external data provided', () => {
    const entity = createMockEntity();
    const score = calculateExternalValidation(entity);

    expect(score).toBe(0);
  });

  it('should calculate score based on backlinks', () => {
    const entity = createMockEntity();
    const externalData: ExternalValidationData = {
      backlinks: 100,
      mentions: 0,
      citations: 0,
    };

    const score = calculateExternalValidation(entity, externalData);

    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should give higher scores for more validation signals', () => {
    const entity = createMockEntity();
    
    const highValidation: ExternalValidationData = {
      backlinks: 500,
      mentions: 1000,
      citations: 50,
      domainAuthority: 80,
    };

    const lowValidation: ExternalValidationData = {
      backlinks: 10,
      mentions: 20,
      citations: 1,
      domainAuthority: 20,
    };

    const scoreHigh = calculateExternalValidation(entity, highValidation);
    const scoreLow = calculateExternalValidation(entity, lowValidation);

    expect(scoreHigh).toBeGreaterThan(scoreLow);
  });
});

// ============================================================================
// Temporal Consistency Tests
// ============================================================================

describe('calculateTemporalConsistency', () => {
  it('should return neutral score when no historical data', () => {
    const entity = createMockEntity();
    const score = calculateTemporalConsistency(entity);

    expect(score).toBe(50);
  });

  it('should calculate score based on appearance frequency', () => {
    const entity = createMockEntity({ name: 'Test Entity' });
    
    const historicalData: TemporalData[] = [
      {
        timestamp: new Date('2024-01-01'),
        url: 'https://example.com',
        scores: { overall: 80, categories: {}, citationProbability: 75 },
        interventions: [],
        externalFactors: { seasonality: 1, competitorActivity: 0.5, algorithmUpdates: [] },
      },
      {
        timestamp: new Date('2024-06-01'),
        url: 'https://example.com',
        scores: { overall: 85, categories: {}, citationProbability: 78 },
        interventions: [],
        externalFactors: { seasonality: 1, competitorActivity: 0.5, algorithmUpdates: [] },
      },
    ];

    const score = calculateTemporalConsistency(entity, historicalData);

    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ============================================================================
// Overall Authority Calculation Tests
// ============================================================================

describe('calculateEntityAuthority', () => {
  it('should calculate complete authority score', () => {
    const entity = createMockEntity({ id: 'entity_1' });
    const entity2 = createMockEntity({ id: 'entity_2' });
    
    const relationships = [createMockRelationship('entity_1', 'entity_2')];
    const claims = [createMockClaim('entity_1')];
    const graph = createMockGraph([entity, entity2], relationships, claims);

    const authority = calculateEntityAuthority(entity, graph);

    expect(authority.entityId).toBe('entity_1');
    expect(authority.entityName).toBe('Test Entity');
    expect(authority.authorityScore).toBeGreaterThanOrEqual(0);
    expect(authority.authorityScore).toBeLessThanOrEqual(100);
    expect(authority.components).toBeDefined();
    expect(authority.components.relationshipDensity).toBeGreaterThanOrEqual(0);
    expect(authority.components.claimEvidence).toBeGreaterThanOrEqual(0);
    expect(authority.components.externalValidation).toBeGreaterThanOrEqual(0);
    expect(authority.components.temporalConsistency).toBeGreaterThanOrEqual(0);
  });

  it('should calculate authority for all entities', () => {
    const entities = [
      createMockEntity({ id: 'entity_1' }),
      createMockEntity({ id: 'entity_2' }),
      createMockEntity({ id: 'entity_3' }),
    ];

    const relationships = [
      createMockRelationship('entity_1', 'entity_2'),
      createMockRelationship('entity_2', 'entity_3'),
    ];

    const graph = createMockGraph(entities, relationships, []);

    const authorities = calculateAllEntityAuthorities(graph);

    expect(authorities).toHaveLength(3);
    authorities.forEach(auth => {
      expect(auth.authorityScore).toBeGreaterThanOrEqual(0);
      expect(auth.authorityScore).toBeLessThanOrEqual(100);
    });
  });
});

// ============================================================================
// Competitive Ranking Tests
// ============================================================================

describe('calculateCompetitiveRanking', () => {
  it('should calculate percentile ranking', () => {
    const userAuthorities: EntityAuthority[] = [
      {
        entityId: 'entity_1',
        entityName: 'Entity A',
        entityType: 'Organization',
        authorityScore: 70,
        components: {
          relationshipDensity: 70,
          claimEvidence: 70,
          externalValidation: 70,
          temporalConsistency: 70,
        },
        competitiveRanking: { percentile: 0, topCompetitors: [] },
        growthTrend: { direction: 'stable', velocity: 0 },
      },
    ];

    const competitorAuthorities: EntityAuthority[][] = [
      [
        {
          entityId: 'comp_1',
          entityName: 'Entity A',
          entityType: 'Organization',
          authorityScore: 80,
          components: {
            relationshipDensity: 80,
            claimEvidence: 80,
            externalValidation: 80,
            temporalConsistency: 80,
          },
          competitiveRanking: { percentile: 0, topCompetitors: [] },
          growthTrend: { direction: 'stable', velocity: 0 },
        },
      ],
    ];

    const ranked = calculateCompetitiveRanking(userAuthorities, competitorAuthorities);

    expect(ranked[0].competitiveRanking.percentile).toBeGreaterThan(0);
    expect(ranked[0].competitiveRanking.percentile).toBeLessThanOrEqual(100);
  });
});

// ============================================================================
// Growth Trend Tests
// ============================================================================

describe('calculateGrowthTrend', () => {
  it('should return stable for insufficient data', () => {
    const entity = createMockEntity();
    const trend = calculateGrowthTrend(entity, []);

    expect(trend.direction).toBe('stable');
    expect(trend.velocity).toBe(0);
  });

  it('should detect increasing trend', () => {
    const entity = createMockEntity();
    const historicalAuthorities: EntityAuthority[] = [
      {
        entityId: 'entity_1',
        entityName: 'Test Entity',
        entityType: 'Organization',
        authorityScore: 50,
        components: {
          relationshipDensity: 50,
          claimEvidence: 50,
          externalValidation: 50,
          temporalConsistency: 50,
        },
        competitiveRanking: { percentile: 50, topCompetitors: [] },
        growthTrend: { direction: 'stable', velocity: 0 },
      },
      {
        entityId: 'entity_1',
        entityName: 'Test Entity',
        entityType: 'Organization',
        authorityScore: 70,
        components: {
          relationshipDensity: 70,
          claimEvidence: 70,
          externalValidation: 70,
          temporalConsistency: 70,
        },
        competitiveRanking: { percentile: 60, topCompetitors: [] },
        growthTrend: { direction: 'stable', velocity: 0 },
      },
      {
        entityId: 'entity_1',
        entityName: 'Test Entity',
        entityType: 'Organization',
        authorityScore: 85,
        components: {
          relationshipDensity: 85,
          claimEvidence: 85,
          externalValidation: 85,
          temporalConsistency: 85,
        },
        competitiveRanking: { percentile: 70, topCompetitors: [] },
        growthTrend: { direction: 'stable', velocity: 0 },
      },
    ];

    const trend = calculateGrowthTrend(entity, historicalAuthorities);

    expect(trend.direction).toBe('increasing');
    expect(trend.velocity).toBeGreaterThan(0);
  });

  it('should detect decreasing trend', () => {
    const entity = createMockEntity();
    const historicalAuthorities: EntityAuthority[] = [
      {
        entityId: 'entity_1',
        entityName: 'Test Entity',
        entityType: 'Organization',
        authorityScore: 85,
        components: {
          relationshipDensity: 85,
          claimEvidence: 85,
          externalValidation: 85,
          temporalConsistency: 85,
        },
        competitiveRanking: { percentile: 70, topCompetitors: [] },
        growthTrend: { direction: 'stable', velocity: 0 },
      },
      {
        entityId: 'entity_1',
        entityName: 'Test Entity',
        entityType: 'Organization',
        authorityScore: 60,
        components: {
          relationshipDensity: 60,
          claimEvidence: 60,
          externalValidation: 60,
          temporalConsistency: 60,
        },
        competitiveRanking: { percentile: 50, topCompetitors: [] },
        growthTrend: { direction: 'stable', velocity: 0 },
      },
    ];

    const trend = calculateGrowthTrend(entity, historicalAuthorities);

    expect(trend.direction).toBe('decreasing');
    expect(trend.velocity).toBeGreaterThan(0);
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('Utility Functions', () => {
  const mockAuthorities: EntityAuthority[] = [
    {
      entityId: '1',
      entityName: 'High Authority',
      entityType: 'Organization',
      authorityScore: 85,
      components: {
        relationshipDensity: 85,
        claimEvidence: 85,
        externalValidation: 85,
        temporalConsistency: 85,
      },
      competitiveRanking: { percentile: 90, topCompetitors: [] },
      growthTrend: { direction: 'increasing', velocity: 5 },
    },
    {
      entityId: '2',
      entityName: 'Medium Authority',
      entityType: 'Person',
      authorityScore: 55,
      components: {
        relationshipDensity: 55,
        claimEvidence: 55,
        externalValidation: 55,
        temporalConsistency: 55,
      },
      competitiveRanking: { percentile: 50, topCompetitors: [] },
      growthTrend: { direction: 'stable', velocity: 0 },
    },
    {
      entityId: '3',
      entityName: 'Low Authority',
      entityType: 'Product',
      authorityScore: 25,
      components: {
        relationshipDensity: 25,
        claimEvidence: 25,
        externalValidation: 25,
        temporalConsistency: 25,
      },
      competitiveRanking: { percentile: 20, topCompetitors: [] },
      growthTrend: { direction: 'decreasing', velocity: 3 },
    },
  ];

  describe('getTopEntities', () => {
    it('should return top N entities by score', () => {
      const top = getTopEntities(mockAuthorities, 2);

      expect(top).toHaveLength(2);
      expect(top[0].authorityScore).toBe(85);
      expect(top[1].authorityScore).toBe(55);
    });
  });

  describe('getLowAuthorityEntities', () => {
    it('should return entities below threshold', () => {
      const low = getLowAuthorityEntities(mockAuthorities, 50);

      expect(low).toHaveLength(1);
      expect(low[0].authorityScore).toBe(25);
    });
  });

  describe('calculateAverageAuthority', () => {
    it('should calculate average score', () => {
      const avg = calculateAverageAuthority(mockAuthorities);

      expect(avg).toBe(55); // (85 + 55 + 25) / 3 = 55
    });

    it('should return 0 for empty array', () => {
      const avg = calculateAverageAuthority([]);

      expect(avg).toBe(0);
    });
  });

  describe('groupByAuthorityTier', () => {
    it('should group entities by tier', () => {
      const grouped = groupByAuthorityTier(mockAuthorities);

      expect(grouped.high).toHaveLength(1);
      expect(grouped.medium).toHaveLength(1);
      expect(grouped.low).toHaveLength(1);
    });
  });
});
