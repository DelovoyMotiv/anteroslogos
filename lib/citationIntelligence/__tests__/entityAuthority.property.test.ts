/**
 * Entity Authority Property-Based Tests
 * 
 * **Feature: predictive-citation-intelligence, Property 5: Entity Authority Completeness**
 * 
 * Property: For any Knowledge Graph with N entities, exactly N Entity Authority Scores
 * must be calculated, and no entity should have a missing or null authority score.
 * 
 * **Validates: Requirements 3.1**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  calculateAllEntityAuthorities,
  calculateEntityAuthority,
} from '../entityAuthority';
import type {
  KnowledgeGraph,
  Entity,
  Relationship,
  Claim,
  EntityType,
} from '../../../types/citation-intelligence.types';

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/**
 * Generate a random entity type
 */
const entityTypeArbitrary = fc.constantFrom<EntityType>(
  'Person',
  'Organization',
  'Product',
  'Event',
  'Place',
  'Concept',
  'CreativeWork',
  'Thing'
);

/**
 * Generate a random entity
 */
const entityArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 3, maxLength: 50 }),
  type: entityTypeArbitrary,
  properties: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
  mentions: fc.option(fc.nat({ max: 1000 }), { nil: undefined }),
  firstSeen: fc.option(fc.date(), { nil: undefined }),
  lastSeen: fc.option(fc.date(), { nil: undefined }),
  url: fc.option(fc.webUrl(), { nil: undefined }),
}) as fc.Arbitrary<Entity>;

/**
 * Generate a random relationship
 */
const relationshipArbitrary = (entityIds: string[]) =>
  fc.record({
    id: fc.uuid(),
    sourceId: fc.constantFrom(...entityIds),
    targetId: fc.constantFrom(...entityIds),
    type: fc.constantFrom('worksFor', 'owns', 'creates', 'relatedTo', 'cites'),
    properties: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
    strength: fc.option(fc.float({ min: 0, max: 1 }), { nil: undefined }),
    confidence: fc.option(fc.float({ min: 0, max: 1 }), { nil: undefined }),
  }) as fc.Arbitrary<Relationship>;

/**
 * Generate random evidence
 */
const evidenceArbitrary = fc.array(
  fc.record({
    type: fc.constantFrom<'citation' | 'data' | 'expert_opinion'>(
      'citation',
      'data',
      'expert_opinion'
    ),
    source: fc.string({ minLength: 5, maxLength: 100 }),
    confidence: fc.float({ min: 0, max: 1 }),
  }),
  { minLength: 0, maxLength: 5 }
);

/**
 * Generate a random claim
 */
const claimArbitrary = (entityIds: string[]) =>
  fc.record({
    id: fc.uuid(),
    statement: fc.string({ minLength: 10, maxLength: 200 }),
    subjectId: fc.option(fc.constantFrom(...entityIds), { nil: undefined }),
    predicateId: fc.option(fc.constantFrom(...entityIds), { nil: undefined }),
    objectId: fc.option(fc.constantFrom(...entityIds), { nil: undefined }),
    evidence: evidenceArbitrary,
    temporalScope: fc.option(
      fc.record({
        start: fc.option(fc.date(), { nil: undefined }),
        end: fc.option(fc.date(), { nil: undefined }),
      }),
      { nil: undefined }
    ),
  }) as fc.Arbitrary<Claim>;

/**
 * Generate a random knowledge graph
 */
const knowledgeGraphArbitrary = fc
  .integer({ min: 1, max: 50 })
  .chain(entityCount =>
    fc.array(entityArbitrary, { minLength: entityCount, maxLength: entityCount }).chain(entities => {
      const entityIds = entities.map(e => e.id);

      return fc
        .tuple(
          fc.array(relationshipArbitrary(entityIds), { minLength: 0, maxLength: entityCount * 2 }),
          fc.array(claimArbitrary(entityIds), { minLength: 0, maxLength: entityCount * 3 })
        )
        .map(([relationships, claims]) => ({
          entities,
          relationships,
          claims,
          metadata: {
            sourceUrl: 'https://example.com',
            extractedAt: new Date(),
            version: '1.0.0',
          },
        }));
    })
  ) as fc.Arbitrary<KnowledgeGraph>;

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 5: Entity Authority Completeness', () => {
  it('should calculate exactly N authority scores for N entities', () => {
    fc.assert(
      fc.property(knowledgeGraphArbitrary, graph => {
        // Calculate authorities for all entities
        const authorities = calculateAllEntityAuthorities(graph);

        // Property 1: Count must match
        expect(authorities.length).toBe(graph.entities.length);

        // Property 2: No missing or null scores
        for (const authority of authorities) {
          expect(authority).toBeDefined();
          expect(authority).not.toBeNull();
          expect(authority.authorityScore).toBeDefined();
          expect(authority.authorityScore).not.toBeNull();
          expect(typeof authority.authorityScore).toBe('number');
        }

        // Property 3: All entity IDs are present
        const authorityEntityIds = new Set(authorities.map(a => a.entityId));
        const graphEntityIds = new Set(graph.entities.map(e => e.id));

        expect(authorityEntityIds.size).toBe(graphEntityIds.size);
        for (const entityId of graphEntityIds) {
          expect(authorityEntityIds.has(entityId)).toBe(true);
        }

        // Property 4: No duplicate entity IDs
        expect(authorityEntityIds.size).toBe(authorities.length);
      }),
      { numRuns: 100 }
    );
  });

  it('should have all component scores defined and non-null', () => {
    fc.assert(
      fc.property(knowledgeGraphArbitrary, graph => {
        const authorities = calculateAllEntityAuthorities(graph);

        for (const authority of authorities) {
          // All components must be defined
          expect(authority.components).toBeDefined();
          expect(authority.components.relationshipDensity).toBeDefined();
          expect(authority.components.claimEvidence).toBeDefined();
          expect(authority.components.externalValidation).toBeDefined();
          expect(authority.components.temporalConsistency).toBeDefined();

          // All components must be numbers
          expect(typeof authority.components.relationshipDensity).toBe('number');
          expect(typeof authority.components.claimEvidence).toBe('number');
          expect(typeof authority.components.externalValidation).toBe('number');
          expect(typeof authority.components.temporalConsistency).toBe('number');

          // All components must be in valid range [0, 100]
          expect(authority.components.relationshipDensity).toBeGreaterThanOrEqual(0);
          expect(authority.components.relationshipDensity).toBeLessThanOrEqual(100);
          expect(authority.components.claimEvidence).toBeGreaterThanOrEqual(0);
          expect(authority.components.claimEvidence).toBeLessThanOrEqual(100);
          expect(authority.components.externalValidation).toBeGreaterThanOrEqual(0);
          expect(authority.components.externalValidation).toBeLessThanOrEqual(100);
          expect(authority.components.temporalConsistency).toBeGreaterThanOrEqual(0);
          expect(authority.components.temporalConsistency).toBeLessThanOrEqual(100);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should have overall authority score in valid range [0, 100]', () => {
    fc.assert(
      fc.property(knowledgeGraphArbitrary, graph => {
        const authorities = calculateAllEntityAuthorities(graph);

        for (const authority of authorities) {
          expect(authority.authorityScore).toBeGreaterThanOrEqual(0);
          expect(authority.authorityScore).toBeLessThanOrEqual(100);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve entity metadata in authority results', () => {
    fc.assert(
      fc.property(knowledgeGraphArbitrary, graph => {
        const authorities = calculateAllEntityAuthorities(graph);

        // Create a map for quick lookup
        const entityMap = new Map(graph.entities.map(e => [e.id, e]));

        for (const authority of authorities) {
          const originalEntity = entityMap.get(authority.entityId);
          expect(originalEntity).toBeDefined();

          // Verify metadata is preserved
          expect(authority.entityName).toBe(originalEntity!.name);
          expect(authority.entityType).toBe(originalEntity!.type);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should handle empty relationships and claims gracefully', () => {
    fc.assert(
      fc.property(
        fc.array(entityArbitrary, { minLength: 1, maxLength: 20 }),
        entities => {
          const graph: KnowledgeGraph = {
            entities,
            relationships: [], // No relationships
            claims: [], // No claims
            metadata: {
              sourceUrl: 'https://example.com',
              extractedAt: new Date(),
              version: '1.0.0',
            },
          };

          const authorities = calculateAllEntityAuthorities(graph);

          // Should still calculate N authorities
          expect(authorities.length).toBe(entities.length);

          // All should have valid scores (even if low)
          for (const authority of authorities) {
            expect(authority.authorityScore).toBeGreaterThanOrEqual(0);
            expect(authority.authorityScore).toBeLessThanOrEqual(100);
            expect(authority.components.relationshipDensity).toBe(0);
            expect(authority.components.claimEvidence).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should calculate individual entity authority consistently', () => {
    fc.assert(
      fc.property(knowledgeGraphArbitrary, graph => {
        if (graph.entities.length === 0) return true;

        // Pick a random entity
        const entity = graph.entities[0];

        // Calculate using both methods
        const individualAuthority = calculateEntityAuthority(entity, graph);
        const allAuthorities = calculateAllEntityAuthorities(graph);
        const batchAuthority = allAuthorities.find(a => a.entityId === entity.id);

        expect(batchAuthority).toBeDefined();

        // Scores should match
        expect(individualAuthority.authorityScore).toBe(batchAuthority!.authorityScore);
        expect(individualAuthority.components.relationshipDensity).toBe(
          batchAuthority!.components.relationshipDensity
        );
        expect(individualAuthority.components.claimEvidence).toBe(
          batchAuthority!.components.claimEvidence
        );
        expect(individualAuthority.components.externalValidation).toBe(
          batchAuthority!.components.externalValidation
        );
        expect(individualAuthority.components.temporalConsistency).toBe(
          batchAuthority!.components.temporalConsistency
        );
      }),
      { numRuns: 100 }
    );
  });

  it('should handle graphs with single entity', () => {
    fc.assert(
      fc.property(entityArbitrary, entity => {
        const graph: KnowledgeGraph = {
          entities: [entity],
          relationships: [],
          claims: [],
          metadata: {
            sourceUrl: 'https://example.com',
            extractedAt: new Date(),
            version: '1.0.0',
          },
        };

        const authorities = calculateAllEntityAuthorities(graph);

        expect(authorities.length).toBe(1);
        expect(authorities[0].entityId).toBe(entity.id);
        expect(authorities[0].authorityScore).toBeGreaterThanOrEqual(0);
        expect(authorities[0].authorityScore).toBeLessThanOrEqual(100);
      }),
      { numRuns: 100 }
    );
  });

  it('should have competitive ranking structure defined', () => {
    fc.assert(
      fc.property(knowledgeGraphArbitrary, graph => {
        const authorities = calculateAllEntityAuthorities(graph);

        for (const authority of authorities) {
          expect(authority.competitiveRanking).toBeDefined();
          expect(authority.competitiveRanking.percentile).toBeDefined();
          expect(typeof authority.competitiveRanking.percentile).toBe('number');
          expect(authority.competitiveRanking.topCompetitors).toBeDefined();
          expect(Array.isArray(authority.competitiveRanking.topCompetitors)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should have growth trend structure defined', () => {
    fc.assert(
      fc.property(knowledgeGraphArbitrary, graph => {
        const authorities = calculateAllEntityAuthorities(graph);

        for (const authority of authorities) {
          expect(authority.growthTrend).toBeDefined();
          expect(authority.growthTrend.direction).toBeDefined();
          expect(['increasing', 'decreasing', 'stable']).toContain(authority.growthTrend.direction);
          expect(authority.growthTrend.velocity).toBeDefined();
          expect(typeof authority.growthTrend.velocity).toBe('number');
          expect(authority.growthTrend.velocity).toBeGreaterThanOrEqual(0);
        }
      }),
      { numRuns: 100 }
    );
  });
});
