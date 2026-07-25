/**
 * Authority Gap Analyzer Property-Based Tests
 * 
 * **Feature: predictive-citation-intelligence, Property 12: Competitive Gap Identification**
 * 
 * Property: For any two Knowledge Graphs (user vs. competitor), if the competitor has entities
 * not present in the user graph, those entities must be identified as authority gaps with
 * non-zero gap scores.
 * 
 * **Validates: Requirements 8.2**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  identifyAuthorityGaps,
  getMissingEntities,
  calculateGapStatistics,
} from '../authorityGapAnalyzer';
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
const entityArbitrary = fc
  .record({
    id: fc.uuid(),
    name: fc.string({ minLength: 3, maxLength: 50 }),
    type: entityTypeArbitrary,
    properties: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
    mentions: fc.option(fc.nat({ max: 1000 }), { nil: undefined }),
    firstSeen: fc.option(fc.date(), { nil: undefined }),
    lastSeen: fc.option(fc.date(), { nil: undefined }),
    url: fc.option(fc.webUrl(), { nil: undefined }),
  })
  .filter(entity => {
    // Filter out entities with whitespace-only names
    return entity.name.trim().length > 0;
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
  fc
    .record({
      type: fc.constantFrom<'citation' | 'data' | 'expert_opinion'>(
        'citation',
        'data',
        'expert_opinion'
      ),
      source: fc.string({ minLength: 5, maxLength: 100 }),
      confidence: fc.float({ min: 0, max: 1, noNaN: true }),
    })
    .filter(evidence => {
      // Filter out evidence with NaN or invalid confidence
      return !isNaN(evidence.confidence) && isFinite(evidence.confidence);
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
  .integer({ min: 1, max: 20 })
  .chain(entityCount =>
    fc.array(entityArbitrary, { minLength: entityCount, maxLength: entityCount }).chain(entities => {
      // Ensure unique entity names (case-insensitive)
      const uniqueEntities: Entity[] = [];
      const seenNames = new Set<string>();
      
      for (const entity of entities) {
        const normalizedName = entity.name.toLowerCase().trim();
        if (!seenNames.has(normalizedName)) {
          seenNames.add(normalizedName);
          uniqueEntities.push(entity);
        }
      }
      
      // If we filtered out too many, skip this generation
      if (uniqueEntities.length === 0) {
        return fc.constant(null);
      }
      
      const entityIds = uniqueEntities.map(e => e.id);

      return fc
        .tuple(
          fc.array(relationshipArbitrary(entityIds), { minLength: 0, maxLength: uniqueEntities.length * 2 }),
          fc.array(claimArbitrary(entityIds), { minLength: 0, maxLength: uniqueEntities.length * 2 })
        )
        .map(([relationships, claims]) => ({
          entities: uniqueEntities,
          relationships,
          claims,
          metadata: {
            sourceUrl: 'https://example.com',
            extractedAt: new Date(),
            version: '1.0.0',
          },
        }));
    })
  )
  .filter(graph => graph !== null) as fc.Arbitrary<KnowledgeGraph>;

/**
 * Generate user and competitor graphs where competitor has additional entities
 */
const userCompetitorGraphsArbitrary = fc
  .tuple(
    fc.integer({ min: 1, max: 10 }), // User entity count
    fc.integer({ min: 1, max: 10 }) // Additional competitor entities
  )
  .chain(([userCount, additionalCount]) =>
    fc
      .array(entityArbitrary, { minLength: userCount, maxLength: userCount })
      .chain(userEntities => {
        const userEntityIds = userEntities.map(e => e.id);

        return fc
          .array(entityArbitrary, {
            minLength: additionalCount,
            maxLength: additionalCount,
          })
          .chain(additionalEntities => {
            // Competitor has all user entities plus additional ones
            const competitorEntities = [...userEntities, ...additionalEntities];
            const competitorEntityIds = competitorEntities.map(e => e.id);

            return fc
              .tuple(
                fc.array(relationshipArbitrary(userEntityIds), {
                  minLength: 0,
                  maxLength: userCount * 2,
                }),
                fc.array(claimArbitrary(userEntityIds), {
                  minLength: 0,
                  maxLength: userCount * 2,
                }),
                fc.array(relationshipArbitrary(competitorEntityIds), {
                  minLength: 0,
                  maxLength: (userCount + additionalCount) * 2,
                }),
                fc.array(claimArbitrary(competitorEntityIds), {
                  minLength: 0,
                  maxLength: (userCount + additionalCount) * 2,
                })
              )
              .map(([userRels, userClaims, compRels, compClaims]) => ({
                userGraph: {
                  entities: userEntities,
                  relationships: userRels,
                  claims: userClaims,
                  metadata: {
                    sourceUrl: 'https://user.com',
                    extractedAt: new Date(),
                    version: '1.0.0',
                  },
                },
                competitorGraph: {
                  entities: competitorEntities,
                  relationships: compRels,
                  claims: compClaims,
                  metadata: {
                    sourceUrl: 'https://competitor.com',
                    extractedAt: new Date(),
                    version: '1.0.0',
                  },
                },
                additionalEntityNames: additionalEntities.map(e => e.name.toLowerCase()),
              }));
          });
      })
  );

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 12: Competitive Gap Identification', () => {
  it('should identify all entities present in competitor but not in user graph', () => {
    fc.assert(
      fc.property(userCompetitorGraphsArbitrary, ({ userGraph, competitorGraph, additionalEntityNames }) => {
        const gaps = identifyAuthorityGaps(userGraph, [competitorGraph]);
        const missingEntities = getMissingEntities(gaps);

        // Property 1: All additional entities should be identified as missing
        for (const entityName of additionalEntityNames) {
          const found = missingEntities.some(
            gap => gap.entity.toLowerCase() === entityName
          );
          expect(found).toBe(true);
        }

        // Property 2: Missing entities should have userScore = 0
        for (const missing of missingEntities) {
          expect(missing.userScore).toBe(0);
        }

        // Property 3: Missing entities should have non-zero competitor score
        for (const missing of missingEntities) {
          expect(missing.competitorScore).toBeGreaterThan(0);
        }

        // Property 4: Gap should equal competitor score for missing entities
        for (const missing of missingEntities) {
          expect(missing.gap).toBe(missing.competitorScore);
        }
      }),
      { numRuns: 20 }
    );
  });

  it('should have non-zero gap scores for all identified gaps', () => {
    fc.assert(
      fc.property(
        knowledgeGraphArbitrary,
        knowledgeGraphArbitrary,
        (userGraph, competitorGraph) => {
          const gaps = identifyAuthorityGaps(userGraph, [competitorGraph]);

          // Property: All gaps must have non-zero gap scores
          for (const gap of gaps) {
            expect(gap.gap).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should provide recommendations for all identified gaps', () => {
    fc.assert(
      fc.property(
        knowledgeGraphArbitrary,
        knowledgeGraphArbitrary,
        (userGraph, competitorGraph) => {
          const gaps = identifyAuthorityGaps(userGraph, [competitorGraph]);

          // Property: All gaps must have at least one recommendation
          for (const gap of gaps) {
            expect(gap.recommendations).toBeDefined();
            expect(Array.isArray(gap.recommendations)).toBe(true);
            expect(gap.recommendations.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should categorize all gaps with valid opportunity levels', () => {
    fc.assert(
      fc.property(
        knowledgeGraphArbitrary,
        knowledgeGraphArbitrary,
        (userGraph, competitorGraph) => {
          const gaps = identifyAuthorityGaps(userGraph, [competitorGraph]);

          // Property: All gaps must have valid opportunity level
          const validOpportunities = ['high', 'medium', 'low'];
          for (const gap of gaps) {
            expect(validOpportunities).toContain(gap.opportunity);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should have competitor score >= user score for all gaps', () => {
    fc.assert(
      fc.property(
        knowledgeGraphArbitrary,
        knowledgeGraphArbitrary,
        (userGraph, competitorGraph) => {
          const gaps = identifyAuthorityGaps(userGraph, [competitorGraph]);

          // Property: Competitor score must be higher than user score
          for (const gap of gaps) {
            expect(gap.competitorScore).toBeGreaterThanOrEqual(gap.userScore);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should calculate gap as difference between competitor and user scores', () => {
    fc.assert(
      fc.property(
        knowledgeGraphArbitrary,
        knowledgeGraphArbitrary,
        (userGraph, competitorGraph) => {
          const gaps = identifyAuthorityGaps(userGraph, [competitorGraph]);

          // Property: Gap = competitorScore - userScore
          for (const gap of gaps) {
            const expectedGap = gap.competitorScore - gap.userScore;
            expect(Math.abs(gap.gap - expectedGap)).toBeLessThan(0.01); // Allow for rounding
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should handle multiple competitors consistently', () => {
    fc.assert(
      fc.property(
        knowledgeGraphArbitrary,
        fc.array(knowledgeGraphArbitrary, { minLength: 1, maxLength: 5 }),
        (userGraph, competitorGraphs) => {
          const gaps = identifyAuthorityGaps(userGraph, competitorGraphs);

          // Property 1: All gaps should have valid structure
          for (const gap of gaps) {
            expect(gap.entity).toBeDefined();
            expect(typeof gap.entity).toBe('string');
            expect(gap.userScore).toBeGreaterThanOrEqual(0);
            expect(gap.competitorScore).toBeGreaterThan(0);
            expect(gap.gap).toBeGreaterThan(0);
          }

          // Property 2: No duplicate entities in gaps
          const entityNames = gaps.map(g => g.entity.toLowerCase());
          const uniqueNames = new Set(entityNames);
          expect(uniqueNames.size).toBe(entityNames.length);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should calculate statistics correctly', () => {
    fc.assert(
      fc.property(
        knowledgeGraphArbitrary,
        knowledgeGraphArbitrary,
        (userGraph, competitorGraph) => {
          const gaps = identifyAuthorityGaps(userGraph, [competitorGraph]);
          const stats = calculateGapStatistics(gaps);

          // Property 1: Total gaps should match array length
          expect(stats.totalGaps).toBe(gaps.length);

          // Property 2: Missing + weak should be <= total
          expect(stats.missingEntities + stats.weakEntities).toBeLessThanOrEqual(
            stats.totalGaps
          );

          // Property 3: Opportunity counts should sum to total
          const opportunitySum =
            stats.highOpportunityCount +
            stats.mediumOpportunityCount +
            stats.lowOpportunityCount;
          expect(opportunitySum).toBe(stats.totalGaps);

          // Property 4: Average gap should be non-negative
          expect(stats.averageGap).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should sort gaps by opportunity and size', () => {
    fc.assert(
      fc.property(
        knowledgeGraphArbitrary,
        knowledgeGraphArbitrary,
        (userGraph, competitorGraph) => {
          const gaps = identifyAuthorityGaps(userGraph, [competitorGraph]);

          if (gaps.length < 2) return true; // Skip if not enough gaps

          // Property: Gaps should be sorted by opportunity (high > medium > low)
          // then by gap size within same opportunity
          const opportunityOrder = { high: 0, medium: 1, low: 2 };

          for (let i = 0; i < gaps.length - 1; i++) {
            const current = gaps[i];
            const next = gaps[i + 1];

            const currentOrder = opportunityOrder[current.opportunity];
            const nextOrder = opportunityOrder[next.opportunity];

            // Current should have higher or equal priority
            expect(currentOrder).toBeLessThanOrEqual(nextOrder);

            // If same opportunity, current gap should be >= next gap
            if (currentOrder === nextOrder) {
              expect(current.gap).toBeGreaterThanOrEqual(next.gap);
            }
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should handle empty user graph correctly', () => {
    fc.assert(
      fc.property(knowledgeGraphArbitrary, competitorGraph => {
        const emptyUserGraph: KnowledgeGraph = {
          entities: [],
          relationships: [],
          claims: [],
          metadata: {
            sourceUrl: 'https://user.com',
            extractedAt: new Date(),
            version: '1.0.0',
          },
        };

        const gaps = identifyAuthorityGaps(emptyUserGraph, [competitorGraph]);

        // Property 1: All competitor entities should be gaps
        expect(gaps.length).toBeGreaterThanOrEqual(competitorGraph.entities.length);

        // Property 2: All gaps should be missing entities (userScore = 0)
        const missingEntities = getMissingEntities(gaps);
        expect(missingEntities.length).toBe(gaps.length);
      }),
      { numRuns: 20 }
    );
  });

  it('should handle identical graphs correctly', () => {
    fc.assert(
      fc.property(knowledgeGraphArbitrary, graph => {
        // Create a deep copy for competitor
        const competitorGraph: KnowledgeGraph = JSON.parse(JSON.stringify(graph));

        const gaps = identifyAuthorityGaps(graph, [competitorGraph]);

        // Property: Should have minimal or no gaps for identical graphs
        // (small gaps may exist due to rounding or calculation differences)
        for (const gap of gaps) {
          expect(gap.gap).toBeLessThan(10); // Allow small differences
        }
      }),
      { numRuns: 20 }
    );
  });
});
