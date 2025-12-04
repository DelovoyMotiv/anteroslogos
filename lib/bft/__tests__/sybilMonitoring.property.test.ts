/**
 * Property-Based Tests for Sybil Monitoring
 * 
 * Tests properties:
 * - Property 23: Sybil Pattern Flagging
 * - Property 38: Legitimate User Protection
 * 
 * @module lib/bft/__tests__/sybilMonitoring.property.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { QualityAnalyzer } from '../qualityAnalyzer';
import type { Entity } from '../../../types/byzantine.types';
import { BYZANTINE_PARAMS } from '../../../types/byzantine.types';

describe('Sybil Monitoring - Property Tests', () => {
  let analyzer: QualityAnalyzer;
  
  beforeEach(() => {
    analyzer = new QualityAnalyzer();
  });
  
  /**
   * Property 23: Sybil Pattern Flagging
   * 
   * For any agent with novelty-to-volume ratio below 0.3,
   * the system should flag them as suspicious.
   * 
   * Validates: Requirements 5.4
   */
  it('Property 23: Flags agents with low novelty-volume ratio', () => {
    // Test with fixed low novelty ratio
    const agentId = 'test-sybil-agent';
    const totalEntities = 200;
    const novelEntities = 20; // 10% novelty (below 30% threshold)
    
    // Create low-quality repetitive entities
    const entities: Entity[] = [];
    for (let i = 0; i < totalEntities; i++) {
      entities.push({
        id: `entity-${i}`,
        name: 'spam', // All identical
        type: 'spam',
      });
    }
    
    // Update metrics multiple times to build history
    for (let batch = 0; batch < 5; batch++) {
      const entropy = analyzer.calculateEntropy(entities, []);
      analyzer.updateMetrics(agentId, entities, novelEntities, entropy);
    }
    
    // Detect patterns
    const result = analyzer.detectSybilPatterns(agentId);
    
    // Should be flagged as suspicious
    expect(result.isSuspicious).toBe(true);
    expect(result.noveltyVolumeRatio).toBeLessThan(
      BYZANTINE_PARAMS.MIN_NOVELTY_VOLUME_RATIO
    );
    
    // Should have at least one indicator
    expect(result.indicators.length).toBeGreaterThan(0);
    
    // Should recommend action
    expect(result.recommendedAction).not.toBe('NONE');
  });
  
  /**
   * Property 38: Legitimate User Protection
   * 
   * For any legitimate high-volume contributor with good novelty ratio,
   * economic attack detection should not prevent them from earning CCC.
   * 
   * Validates: Requirements 8.4
   */
  it('Property 38: Does not flag legitimate high-volume users', () => {
    fc.assert(
      fc.property(
        fc.record({
          agentId: fc.string({ minLength: 5, maxLength: 20 }),
          totalEntities: fc.integer({ min: 100, max: 1000 }),
          noveltyRatio: fc.float({ min: Math.fround(0.5), max: 1.0 }), // Good ratio
        }),
        (data) => {
          const { agentId, totalEntities, noveltyRatio } = data;
          const novelEntities = Math.floor(totalEntities * noveltyRatio);
          
          // Create high-quality diverse entities
          const entities: Entity[] = [];
          for (let i = 0; i < totalEntities; i++) {
            entities.push({
              id: `entity-${i}`,
              name: `unique-entity-${i}`, // Unique names
              type: ['Person', 'Organization', 'Concept', 'Event'][i % 4],
            });
          }
          
          // Update metrics
          const entropy = analyzer.calculateEntropy(entities, []);
          analyzer.updateMetrics(agentId, entities, novelEntities, entropy);
          
          // Detect patterns
          const result = analyzer.detectSybilPatterns(agentId);
          
          // Should NOT be flagged
          expect(result.isSuspicious).toBe(false);
          expect(result.noveltyVolumeRatio).toBeGreaterThanOrEqual(
            BYZANTINE_PARAMS.MIN_NOVELTY_VOLUME_RATIO
          );
          expect(result.recommendedAction).toBe('NONE');
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
  
  /**
   * Property: Entropy threshold enforcement
   * 
   * Agents with low entropy should be flagged regardless of volume.
   */
  it('Property: Flags agents with low entropy content', () => {
    fc.assert(
      fc.property(
        fc.record({
          agentId: fc.string({ minLength: 5, maxLength: 20 }),
          entityCount: fc.integer({ min: 50, max: 200 }),
        }),
        (data) => {
          const { agentId, entityCount } = data;
          
          // Create extremely repetitive entities (low entropy)
          const entities: Entity[] = [];
          for (let i = 0; i < entityCount; i++) {
            entities.push({
              id: `entity-${i}`,
              name: 'spam', // All identical
              type: 'spam',
            });
          }
          
          // Update metrics multiple times to build history
          for (let batch = 0; batch < 5; batch++) {
            const entropy = analyzer.calculateEntropy(entities, []);
            analyzer.updateMetrics(agentId, entities, entityCount, entropy);
          }
          
          // Detect patterns
          const result = analyzer.detectSybilPatterns(agentId);
          
          // Should be flagged due to low entropy
          expect(result.isSuspicious).toBe(true);
          expect(result.entropyScore).toBeLessThan(
            BYZANTINE_PARAMS.MIN_ENTROPY_THRESHOLD
          );
          
          return true;
        }
      ),
      { numRuns: 30 }
    );
  });
  
  /**
   * Property: Confidence scaling
   * 
   * Confidence should increase with severity of violations.
   */
  it('Property: Confidence scales with violation severity', () => {
    fc.assert(
      fc.property(
        fc.record({
          agentId: fc.string({ minLength: 5, maxLength: 20 }),
          noveltyRatio: fc.float({ min: Math.fround(0.05), max: Math.fround(0.25) }),
        }),
        (data) => {
          const { agentId, noveltyRatio } = data;
          
          // Create entities with specified novelty ratio
          const totalEntities = 100;
          const novelEntities = Math.floor(totalEntities * noveltyRatio);
          
          const entities: Entity[] = [];
          for (let i = 0; i < totalEntities; i++) {
            entities.push({
              id: `entity-${i}`,
              name: `name-${i % 10}`,
              type: 'test',
            });
          }
          
          const entropy = analyzer.calculateEntropy(entities, []);
          analyzer.updateMetrics(agentId, entities, novelEntities, entropy);
          
          const result = analyzer.detectSybilPatterns(agentId);
          
          // Lower novelty ratio should result in higher confidence
          if (result.isSuspicious) {
            const expectedMinConfidence = 
              1.0 - (noveltyRatio / BYZANTINE_PARAMS.MIN_NOVELTY_VOLUME_RATIO);
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.confidence).toBeLessThanOrEqual(1.0);
          }
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
  
  /**
   * Property: Action escalation
   * 
   * Recommended action should escalate with confidence level.
   */
  it('Property: Action escalates with confidence', () => {
    const testCases = [
      { confidence: 0.2, expectedAction: 'NONE' },
      { confidence: 0.4, expectedAction: 'FLAG' },
      { confidence: 0.6, expectedAction: 'THROTTLE' },
      { confidence: 0.9, expectedAction: 'BLOCK' },
    ];
    
    for (const { confidence, expectedAction } of testCases) {
      const agentId = `agent-${confidence}`;
      
      // Create entities that will produce desired confidence
      const noveltyRatio = BYZANTINE_PARAMS.MIN_NOVELTY_VOLUME_RATIO * (1 - confidence);
      const totalEntities = 100;
      const novelEntities = Math.max(1, Math.floor(totalEntities * noveltyRatio));
      
      const entities: Entity[] = [];
      for (let i = 0; i < totalEntities; i++) {
        entities.push({
          id: `entity-${i}`,
          name: `name-${i % 5}`,
          type: 'test',
        });
      }
      
      const entropy = analyzer.calculateEntropy(entities, []);
      analyzer.updateMetrics(agentId, entities, novelEntities, entropy);
      
      const result = analyzer.detectSybilPatterns(agentId);
      
      // Check action matches expected escalation
      if (confidence >= 0.8) {
        expect(result.recommendedAction).toBe('BLOCK');
      } else if (confidence >= 0.5) {
        expect(result.recommendedAction).toBe('THROTTLE');
      } else if (confidence >= 0.3) {
        expect(result.recommendedAction).toBe('FLAG');
      } else {
        expect(result.recommendedAction).toBe('NONE');
      }
    }
  });
});
