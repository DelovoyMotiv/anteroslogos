/**
 * Property-Based Tests for CCC Causal Value Computation
 * 
 * Tests quality multiplier application and path creation bonus
 * using fast-check property-based testing framework.
 * 
 * Requirements: 6.4, 6.5
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import {
  computeCausalValue,
  computeCCCReward,
  mergeIntoGlobalGraph
} from '../causalValue';
import type { KnowledgeGraphDelta } from '../types';

/**
 * Arbitrary generator for KnowledgeGraphDelta
 */
const knowledgeGraphDeltaArbitrary = fc.record({
  id: fc.uuid(),
  agentId: fc.uuid(),
  timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString()),
  entities: fc.array(
    fc.record({
      id: fc.uuid(),
      type: fc.constantFrom('Organization', 'Person', 'Technology', 'Concept', 'Research'),
      name: fc.string({ minLength: 3, maxLength: 50 }),
      properties: fc.dictionary(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.boolean(),
          fc.constant(null)
        )
      ),
      confidence: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0) })
    }),
    { minLength: 1, maxLength: 20 }
  ),
  relationships: fc.array(
    fc.record({
      id: fc.uuid(),
      sourceEntityId: fc.uuid(),
      targetEntityId: fc.uuid(),
      type: fc.constantFrom('cites', 'influences', 'mentions', 'references', 'owns', 'derives_from'),
      weight: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0) }),
      confidence: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0) })
    }),
    { minLength: 0, maxLength: 30 }
  ),
  metadata: fc.record({
    sourceUrl: fc.webUrl(),
    extractionMethod: fc.constantFrom('llm', 'manual', 'api'),
    llmModel: fc.constantFrom('gpt-4', 'claude-3', 'gemini-pro')
  })
});

describe('Property 28: Quality Multiplier Application', () => {
  /**
   * Feature: byzantine-resistance-enhancement, Property 28: Quality Multiplier Application
   * Validates: Requirements 6.4
   * 
   * For any contribution reward, a quality multiplier based on entropy-to-volume
   * ratio should be applied.
   */
  test('Property 28: Quality multiplier is applied to all rewards', () => {
    fc.assert(
      fc.property(
        knowledgeGraphDeltaArbitrary,
        async (delta) => {
          // Skip degenerate cases
          if (delta.entities.length === 0) {
            return true;
          }
          
          // Ensure relationships reference entities in the delta
          const entityIds = delta.entities.map(e => e.id);
          if (entityIds.length > 0 && delta.relationships.length > 0) {
            delta.relationships = delta.relationships.map(rel => ({
              ...rel,
              sourceEntityId: fc.sample(fc.constantFrom(...entityIds), 1)[0],
              targetEntityId: fc.sample(fc.constantFrom(...entityIds), 1)[0]
            }));
          }
          
          // Compute causal value
          const causalValue = await computeCausalValue(delta);
          
          // Compute reward
          const reward = computeCCCReward(causalValue, delta);
          
          // Property: Quality multiplier should be present in metadata
          expect(causalValue.metadata.qualityMultiplier).toBeDefined();
          
          // Property: Quality multiplier should be in range [1.0, 2.0]
          const qualityMultiplier = causalValue.metadata.qualityMultiplier!;
          expect(qualityMultiplier).toBeGreaterThanOrEqual(1.0);
          expect(qualityMultiplier).toBeLessThanOrEqual(2.0);
          
          // Property: Higher entropy AND Kolmogorov should result in higher quality multiplier
          const entropyScore = causalValue.components.entropyScore || 0;
          const kolmogorovScore = causalValue.components.kolmogorovScore || 0;
          
          if (entropyScore > 70 && kolmogorovScore > 70) {
            expect(qualityMultiplier).toBeGreaterThan(1.3);
          }
          
          // Property: Low entropy AND low Kolmogorov should result in lower multiplier
          if (entropyScore < 30 && kolmogorovScore < 30) {
            expect(qualityMultiplier).toBeLessThan(1.3);
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
  
  test('Property 28: Quality multiplier increases with entropy-volume ratio', () => {
    fc.assert(
      fc.property(
        knowledgeGraphDeltaArbitrary,
        knowledgeGraphDeltaArbitrary,
        async (delta1, delta2) => {
          // Ensure relationships reference entities
          const fixDelta = (d: KnowledgeGraphDelta) => {
            const entityIds = d.entities.map(e => e.id);
            if (entityIds.length > 0) {
              d.relationships = d.relationships.map(rel => ({
                ...rel,
                sourceEntityId: fc.sample(fc.constantFrom(...entityIds), 1)[0],
                targetEntityId: fc.sample(fc.constantFrom(...entityIds), 1)[0]
              }));
            }
            return d;
          };
          
          delta1 = fixDelta(delta1);
          delta2 = fixDelta(delta2);
          
          // Compute causal values
          const causalValue1 = await computeCausalValue(delta1);
          const causalValue2 = await computeCausalValue(delta2);
          
          const entropy1 = causalValue1.components.entropyScore || 0;
          const entropy2 = causalValue2.components.entropyScore || 0;
          
          const volume1 = delta1.entities.length + delta1.relationships.length;
          const volume2 = delta2.entities.length + delta2.relationships.length;
          
          // Skip if volumes are zero
          if (volume1 === 0 || volume2 === 0) {
            return true;
          }
          
          const ratio1 = entropy1 / Math.log2(volume1 + 1);
          const ratio2 = entropy2 / Math.log2(volume2 + 1);
          
          const multiplier1 = causalValue1.metadata.qualityMultiplier!;
          const multiplier2 = causalValue2.metadata.qualityMultiplier!;
          
          // Property: Higher entropy-volume ratio should result in higher multiplier
          // Allow for small differences due to Kolmogorov complexity component
          if (Math.abs(ratio1 - ratio2) > 0.2) {
            if (ratio1 > ratio2) {
              expect(multiplier1).toBeGreaterThanOrEqual(multiplier2 * 0.9);
            } else {
              expect(multiplier2).toBeGreaterThanOrEqual(multiplier1 * 0.9);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
  
  test('Property 28: Quality multiplier is monotonic with respect to quality scores', () => {
    fc.assert(
      fc.property(
        knowledgeGraphDeltaArbitrary,
        async (delta) => {
          // Ensure relationships reference entities
          const entityIds = delta.entities.map(e => e.id);
          if (entityIds.length > 0 && delta.relationships.length > 0) {
            delta.relationships = delta.relationships.map(rel => ({
              ...rel,
              sourceEntityId: fc.sample(fc.constantFrom(...entityIds), 1)[0],
              targetEntityId: fc.sample(fc.constantFrom(...entityIds), 1)[0]
            }));
          }
          
          // Compute causal value
          const causalValue = await computeCausalValue(delta);
          
          const entropyScore = causalValue.components.entropyScore || 0;
          const kolmogorovScore = causalValue.components.kolmogorovScore || 0;
          const qualityMultiplier = causalValue.metadata.qualityMultiplier!;
          
          // Property: Quality multiplier should be correlated with quality scores
          // Using geometric mean, both must be high for high multiplier
          if (entropyScore > 70 && kolmogorovScore > 70) {
            expect(qualityMultiplier).toBeGreaterThan(1.6);
          }
          
          // If both scores are low, multiplier should be closer to 1.0
          if (entropyScore < 30 && kolmogorovScore < 30) {
            expect(qualityMultiplier).toBeLessThan(1.3);
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
});


describe('Property 29: Path Creation Bonus', () => {
  /**
   * Feature: byzantine-resistance-enhancement, Property 29: Path Creation Bonus
   * Validates: Requirements 6.5
   * 
   * For any contribution that creates new causal paths, a bonus reward based on
   * path uniqueness score should be calculated.
   */
  test('Property 29: Path creation bonus is calculated for causal relationships', () => {
    fc.assert(
      fc.property(
        knowledgeGraphDeltaArbitrary,
        async (delta) => {
          // Ensure relationships reference entities
          const entityIds = delta.entities.map(e => e.id);
          if (entityIds.length > 0 && delta.relationships.length > 0) {
            delta.relationships = delta.relationships.map(rel => ({
              ...rel,
              sourceEntityId: fc.sample(fc.constantFrom(...entityIds), 1)[0],
              targetEntityId: fc.sample(fc.constantFrom(...entityIds), 1)[0]
            }));
          }
          
          // Compute causal value
          const causalValue = await computeCausalValue(delta);
          
          // Property: Path creation bonus should be present in metadata
          expect(causalValue.metadata.pathCreationBonus).toBeDefined();
          
          // Property: Path creation bonus should be non-negative
          const pathCreationBonus = causalValue.metadata.pathCreationBonus!;
          expect(pathCreationBonus).toBeGreaterThanOrEqual(0);
          
          // Property: If there are causal relationships, bonus should be positive
          const causalTypes = ['cites', 'influences', 'mentions', 'references', 'derives_from'];
          const hasCausalRelationships = delta.relationships.some(r => causalTypes.includes(r.type));
          
          if (hasCausalRelationships) {
            expect(pathCreationBonus).toBeGreaterThan(0);
          }
          
          // Property: If no relationships, bonus should be 0
          if (delta.relationships.length === 0) {
            expect(pathCreationBonus).toBe(0);
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
  
  test('Property 29: Path creation bonus increases with number of causal paths', () => {
    fc.assert(
      fc.property(
        knowledgeGraphDeltaArbitrary,
        knowledgeGraphDeltaArbitrary,
        async (delta1, delta2) => {
          // Ensure relationships reference entities
          const fixDelta = (d: KnowledgeGraphDelta) => {
            const entityIds = d.entities.map(e => e.id);
            if (entityIds.length > 0 && d.relationships.length > 0) {
              d.relationships = d.relationships.map(rel => ({
                ...rel,
                sourceEntityId: fc.sample(fc.constantFrom(...entityIds), 1)[0],
                targetEntityId: fc.sample(fc.constantFrom(...entityIds), 1)[0]
              }));
            }
            return d;
          };
          
          delta1 = fixDelta(delta1);
          delta2 = fixDelta(delta2);
          
          // Count causal relationships
          const causalTypes = ['cites', 'influences', 'mentions', 'references', 'derives_from'];
          const causalCount1 = delta1.relationships.filter(r => causalTypes.includes(r.type)).length;
          const causalCount2 = delta2.relationships.filter(r => causalTypes.includes(r.type)).length;
          
          // Skip if both have no causal relationships
          if (causalCount1 === 0 && causalCount2 === 0) {
            return true;
          }
          
          // Compute causal values
          const causalValue1 = await computeCausalValue(delta1);
          const causalValue2 = await computeCausalValue(delta2);
          
          const bonus1 = causalValue1.metadata.pathCreationBonus!;
          const bonus2 = causalValue2.metadata.pathCreationBonus!;
          
          // Property: More causal relationships should generally result in higher bonus
          // Allow for variance due to relationship weights and other factors
          if (causalCount1 > causalCount2 * 2 && causalCount2 > 0) {
            expect(bonus1).toBeGreaterThanOrEqual(bonus2 * 0.5);
          } else if (causalCount2 > causalCount1 * 2 && causalCount1 > 0) {
            expect(bonus2).toBeGreaterThanOrEqual(bonus1 * 0.5);
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
  
  test('Property 29: Path creation bonus is weighted by relationship confidence', () => {
    fc.assert(
      fc.property(
        knowledgeGraphDeltaArbitrary,
        async (delta) => {
          // Skip if no entities or relationships
          if (delta.entities.length === 0 || delta.relationships.length === 0) {
            return true;
          }
          
          // Ensure relationships reference entities
          const entityIds = delta.entities.map(e => e.id);
          delta.relationships = delta.relationships.map(rel => ({
            ...rel,
            sourceEntityId: fc.sample(fc.constantFrom(...entityIds), 1)[0],
            targetEntityId: fc.sample(fc.constantFrom(...entityIds), 1)[0],
            type: 'cites' // Force causal type
          }));
          
          // Create two versions: one with high confidence, one with low
          const highConfidenceDelta = {
            ...delta,
            relationships: delta.relationships.map(r => ({ ...r, weight: Math.fround(0.9) }))
          };
          
          const lowConfidenceDelta = {
            ...delta,
            relationships: delta.relationships.map(r => ({ ...r, weight: Math.fround(0.1) }))
          };
          
          // Compute causal values
          const highValue = await computeCausalValue(highConfidenceDelta);
          const lowValue = await computeCausalValue(lowConfidenceDelta);
          
          const highBonus = highValue.metadata.pathCreationBonus!;
          const lowBonus = lowValue.metadata.pathCreationBonus!;
          
          // Property: Higher confidence should result in higher bonus
          if (highBonus > 0 && lowBonus > 0) {
            expect(highBonus).toBeGreaterThan(lowBonus);
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
});
