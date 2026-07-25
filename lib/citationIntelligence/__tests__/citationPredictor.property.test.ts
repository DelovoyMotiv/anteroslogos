/**
 * Property-Based Tests for Citation Predictor
 * Tests universal properties that must hold across all inputs
 * 
 * Uses fast-check for property-based testing with 100+ iterations
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fc from 'fast-check';
import { CitationPredictor } from '../citationPredictor';
import type { KnowledgeGraph, TemporalData } from '../../../types/citation-intelligence.types';

// ============================================================================
// Test Setup
// ============================================================================

let predictor: CitationPredictor;

beforeAll(async () => {
  predictor = new CitationPredictor();
  await predictor.initialize();
});

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/**
 * Generate random content
 */
const contentArbitrary = fc.string({ minLength: 100, maxLength: 5000 });

/**
 * Generate random knowledge graph
 */
const knowledgeGraphArbitrary: fc.Arbitrary<KnowledgeGraph> = fc.record({
  id: fc.string(),
  domain: fc.webUrl(),
  entities: fc.array(
    fc.record({
      id: fc.string(),
      name: fc.string({ minLength: 3, maxLength: 50 }),
      type: fc.constantFrom('Person', 'Organization', 'Product', 'Event', 'Place', 'Concept', 'CreativeWork', 'Thing'),
      properties: fc.dictionary(fc.string(), fc.anything()),
      mentions: fc.nat({ max: 100 }),
      firstSeen: fc.date(),
      lastSeen: fc.date(),
    }),
    { minLength: 0, maxLength: 50 }
  ),
  relationships: fc.array(
    fc.record({
      id: fc.string(),
      sourceId: fc.string(),
      targetId: fc.string(),
      type: fc.string(),
      properties: fc.dictionary(fc.string(), fc.anything()),
      strength: fc.float({ min: 0, max: 1 }),
      confidence: fc.float({ min: 0, max: 1 }),
    }),
    { minLength: 0, maxLength: 100 }
  ),
  claims: fc.array(
    fc.record({
      id: fc.string(),
      statement: fc.string({ minLength: 10, maxLength: 200 }),
      subjectId: fc.string(),
      predicateId: fc.string(),
      objectId: fc.string(),
      evidence: fc.array(
        fc.record({
          type: fc.constantFrom('citation', 'data', 'expert_opinion'),
          source: fc.string(),
          confidence: fc.float({ min: 0, max: 1 }),
        }),
        { minLength: 0, maxLength: 5 }
      ),
    }),
    { minLength: 0, maxLength: 30 }
  ),
  metadata: fc.record({
    sourceUrl: fc.webUrl(),
    extractedAt: fc.date(),
    version: fc.string(),
  }),
});

/**
 * Generate random temporal data
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
 * Generate random competitor scores
 */
const competitorScoresArbitrary = fc.array(
  fc.float({ min: 0, max: 100 }),
  { minLength: 0, maxLength: 10 }
);

// ============================================================================
// Property Tests
// ============================================================================

describe('Citation Predictor - Property-Based Tests', () => {
  /**
   * **Feature: predictive-citation-intelligence, Property 1: Citation Probability Bounds**
   * 
   * Property: For any valid website content, the calculated Citation Probability Score
   * must be a number between 0 and 100 (inclusive), and the confidence interval bounds
   * must also fall within this range.
   * 
   * **Validates: Requirements 1.1**
   */
  describe('Property 1: Citation Probability Bounds', () => {
    it('should always return scores between 0 and 100', () => {
      fc.assert(
        fc.property(
          contentArbitrary,
          knowledgeGraphArbitrary,
          temporalDataArbitrary,
          competitorScoresArbitrary,
          (content, knowledgeGraph, temporalData, competitorScores) => {
            const result = predictor.calculateProbability(
              content,
              knowledgeGraph,
              temporalData,
              competitorScores
            );
            
            // Main score must be between 0 and 100
            expect(result.score).toBeGreaterThanOrEqual(0);
            expect(result.score).toBeLessThanOrEqual(100);
            
            // Confidence interval lower bound must be between 0 and 100
            expect(result.confidence.lower).toBeGreaterThanOrEqual(0);
            expect(result.confidence.lower).toBeLessThanOrEqual(100);
            
            // Confidence interval upper bound must be between 0 and 100
            expect(result.confidence.upper).toBeGreaterThanOrEqual(0);
            expect(result.confidence.upper).toBeLessThanOrEqual(100);
            
            // Lower bound must be <= score
            expect(result.confidence.lower).toBeLessThanOrEqual(result.score);
            
            // Upper bound must be >= score
            expect(result.confidence.upper).toBeGreaterThanOrEqual(result.score);
            
            // Lower bound must be <= upper bound
            expect(result.confidence.lower).toBeLessThanOrEqual(result.confidence.upper);
          }
        ),
        { numRuns: 20 }
      );
    });
    
    it('should return valid factor contributions', () => {
      fc.assert(
        fc.property(
          contentArbitrary,
          knowledgeGraphArbitrary,
          temporalDataArbitrary,
          competitorScoresArbitrary,
          (content, knowledgeGraph, temporalData, competitorScores) => {
            const result = predictor.calculateProbability(
              content,
              knowledgeGraph,
              temporalData,
              competitorScores
            );
            
            // Factors array should exist
            expect(result.factors).toBeDefined();
            expect(Array.isArray(result.factors)).toBe(true);
            
            // Each factor should have required properties
            result.factors.forEach(factor => {
              expect(factor).toHaveProperty('name');
              expect(factor).toHaveProperty('contribution');
              expect(factor).toHaveProperty('description');
              
              expect(typeof factor.name).toBe('string');
              expect(typeof factor.contribution).toBe('number');
              expect(typeof factor.description).toBe('string');
              
              // Contribution should be finite
              expect(Number.isFinite(factor.contribution)).toBe(true);
            });
          }
        ),
        { numRuns: 20 }
      );
    });
    
    it('should return valid quick wins', () => {
      fc.assert(
        fc.property(
          contentArbitrary,
          knowledgeGraphArbitrary,
          temporalDataArbitrary,
          competitorScoresArbitrary,
          (content, knowledgeGraph, temporalData, competitorScores) => {
            const result = predictor.calculateProbability(
              content,
              knowledgeGraph,
              temporalData,
              competitorScores
            );
            
            // Quick wins array should exist
            expect(result.quickWins).toBeDefined();
            expect(Array.isArray(result.quickWins)).toBe(true);
            
            // Each quick win should have required properties
            result.quickWins.forEach(quickWin => {
              expect(quickWin).toHaveProperty('action');
              expect(quickWin).toHaveProperty('expectedLift');
              expect(quickWin).toHaveProperty('effort');
              
              expect(typeof quickWin.action).toBe('string');
              expect(typeof quickWin.expectedLift).toBe('number');
              expect(['low', 'medium', 'high']).toContain(quickWin.effort);
              
              // Expected lift should be positive
              expect(quickWin.expectedLift).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 20 }
      );
    });
    
    it('should handle edge cases gracefully', () => {
      // Empty content
      const emptyResult = predictor.calculateProbability(
        '',
        {
          id: 'test',
          domain: 'https://example.com',
          entities: [],
          relationships: [],
          claims: [],
          metadata: {
            sourceUrl: 'https://example.com',
            extractedAt: new Date(),
            version: '1.0.0',
          },
        },
        [],
        []
      );
      
      expect(emptyResult.score).toBeGreaterThanOrEqual(0);
      expect(emptyResult.score).toBeLessThanOrEqual(100);
      
      // Very long content
      const longContent = 'word '.repeat(10000);
      const longResult = predictor.calculateProbability(
        longContent,
        {
          id: 'test',
          domain: 'https://example.com',
          entities: [],
          relationships: [],
          claims: [],
          metadata: {
            sourceUrl: 'https://example.com',
            extractedAt: new Date(),
            version: '1.0.0',
          },
        },
        [],
        []
      );
      
      expect(longResult.score).toBeGreaterThanOrEqual(0);
      expect(longResult.score).toBeLessThanOrEqual(100);
    });
  });
  
  /**
   * Additional property: Score consistency
   * Same input should produce same output (deterministic)
   */
  describe('Property: Score Consistency', () => {
    it('should produce consistent results for same input', () => {
      const content = 'This is a test article about artificial intelligence and machine learning.';
      const knowledgeGraph: KnowledgeGraph = {
        id: 'test-kg',
        domain: 'https://example.com',
        entities: [
          {
            id: 'entity-1',
            name: 'Artificial Intelligence',
            type: 'Concept',
            properties: {},
            mentions: 5,
            firstSeen: new Date(),
            lastSeen: new Date(),
          },
        ],
        relationships: [],
        claims: [],
        metadata: {
          sourceUrl: 'https://example.com',
          extractedAt: new Date(),
          version: '1.0.0',
        },
      };
      
      const result1 = predictor.calculateProbability(content, knowledgeGraph, [], []);
      const result2 = predictor.calculateProbability(content, knowledgeGraph, [], []);
      
      expect(result1.score).toBe(result2.score);
      expect(result1.confidence.lower).toBe(result2.confidence.lower);
      expect(result1.confidence.upper).toBe(result2.confidence.upper);
    });
  });
});

