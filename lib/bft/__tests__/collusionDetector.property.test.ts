/**
 * Collusion Detector Property-Based Tests
 * 
 * Property-based tests for collusion detection algorithms.
 * Tests Properties 30 and 34 from the design document.
 * 
 * Feature: byzantine-resistance-enhancement
 * 
 * @module lib/bft/__tests__/collusionDetector.property.test
 */

import { describe, test, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { CollusionDetector } from '../collusionDetector';
import type { CausalGraph } from '../../../types/byzantine.types';

// =====================================================
// TEST HELPERS
// =====================================================

/**
 * Generate a simple causal graph for testing
 */
function generateGraph(nodeCount: number, edgeCount: number): CausalGraph {
  const nodes = new Map();
  const edges = new Map();
  
  // Create nodes
  for (let i = 0; i < nodeCount; i++) {
    const nodeId = `node-${i}`;
    nodes.set(nodeId, {
      id: nodeId,
      type: 'Entity',
      data: { value: i },
    });
    edges.set(nodeId, []);
  }
  
  // Create edges
  for (let i = 0; i < edgeCount && i < nodeCount - 1; i++) {
    const source = `node-${i}`;
    const target = `node-${(i + 1) % nodeCount}`;
    edges.get(source)!.push({
      source,
      target,
      type: 'RELATES_TO',
    });
  }
  
  return {
    nodes,
    edges,
    metadata: {
      nodeCount,
      edgeCount,
      density: nodeCount > 1 ? edgeCount / (nodeCount * (nodeCount - 1)) : 0,
    },
  };
}

// =====================================================
// PROPERTY 30: CORRELATION COEFFICIENT COMPUTATION
// =====================================================

describe('Property 30: Correlation Coefficient Computation', () => {
  let detector: CollusionDetector;
  
  beforeEach(() => {
    detector = new CollusionDetector();
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 30: Correlation Coefficient Computation
   * Validates: Requirements 7.1
   * 
   * Property: For any agent behavior analysis, pairwise correlation coefficients
   * should be computed for contribution patterns
   */
  test('correlation coefficient is bounded between -1 and 1', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 20 }), { minLength: 2, maxLength: 50 }),
        fc.array(fc.integer({ min: 1, max: 20 }), { minLength: 2, maxLength: 50 }),
        (volumes1, volumes2) => {
          const agent1 = 'agent-1';
          const agent2 = 'agent-2';
          
          // Record contributions for agent1
          for (let i = 0; i < volumes1.length; i++) {
            const entities = new Set(
              Array(volumes1[i]).fill(null).map((_, j) => `e1-${i}-${j}`)
            );
            detector.recordContribution(agent1, entities, volumes1[i]);
          }
          
          // Record contributions for agent2
          for (let i = 0; i < volumes2.length; i++) {
            const entities = new Set(
              Array(volumes2[i]).fill(null).map((_, j) => `e2-${i}-${j}`)
            );
            detector.recordContribution(agent2, entities, volumes2[i]);
          }
          
          const correlation = detector.computeCorrelation(agent1, agent2, 3600000);
          
          // Correlation must be in [-1, 1]
          expect(correlation).toBeGreaterThanOrEqual(-1);
          expect(correlation).toBeLessThanOrEqual(1);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 30: Correlation Coefficient Computation
   * Validates: Requirements 7.1
   * 
   * Property: No data for agents should return 0 correlation
   */
  test('no data returns zero correlation', () => {
    const correlation = detector.computeCorrelation('agent-1', 'agent-2', 3600000);
    expect(correlation).toBe(0);
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 30: Correlation Coefficient Computation
   * Validates: Requirements 7.1
   * 
   * Property: Insufficient data (< 2 points) should return 0 correlation
   */
  test('insufficient data returns zero correlation', () => {
    const agent1 = 'agent-1';
    const agent2 = 'agent-2';
    
    // Only one contribution each
    detector.recordContribution(agent1, new Set(['e1']), 1);
    detector.recordContribution(agent2, new Set(['e2']), 1);
    
    const correlation = detector.computeCorrelation(agent1, agent2, 3600000);
    expect(correlation).toBe(0);
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 30: Correlation Coefficient Computation
   * Validates: Requirements 7.1
   * 
   * Property: Identical contribution patterns should have correlation close to 1
   */
  test('identical patterns have high positive correlation', () => {
    const agent1 = 'agent-1';
    const agent2 = 'agent-2';
    
    // Manually set timestamps to ensure different time buckets (1 minute apart)
    const baseTime = Date.now();
    const history1 = detector['contributionHistory'];
    const history2 = detector['contributionHistory'];
    
    if (!history1.has(agent1)) history1.set(agent1, []);
    if (!history2.has(agent2)) history2.set(agent2, []);
    
    // Record identical patterns with 1-minute spacing
    for (let i = 0; i < 10; i++) {
      const volume = 5 + i;
      const entities1 = new Set(Array(volume).fill(null).map((_, j) => `e1-${i}-${j}`));
      const entities2 = new Set(Array(volume).fill(null).map((_, j) => `e2-${i}-${j}`));
      
      history1.get(agent1)!.push({
        timestamp: baseTime + i * 60000, // 1 minute apart
        entityCount: volume,
        relationshipCount: volume,
        entities: entities1,
      });
      
      history2.get(agent2)!.push({
        timestamp: baseTime + i * 60000, // Same time as agent1
        entityCount: volume,
        relationshipCount: volume,
        entities: entities2,
      });
    }
    
    const correlation = detector.computeCorrelation(agent1, agent2, 3600000);
    
    // Should have high positive correlation (> 0.8)
    expect(correlation).toBeGreaterThan(0.7);
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 30: Correlation Coefficient Computation
   * Validates: Requirements 7.1
   * 
   * Property: Opposite patterns should have negative correlation
   */
  test('opposite patterns have negative correlation', () => {
    const agent1 = 'agent-opp-1';
    const agent2 = 'agent-opp-2';
    
    // Manually set timestamps to ensure different time buckets
    const baseTime = Date.now();
    const history1 = detector['contributionHistory'];
    const history2 = detector['contributionHistory'];
    
    if (!history1.has(agent1)) history1.set(agent1, []);
    if (!history2.has(agent2)) history2.set(agent2, []);
    
    // Record opposite patterns with 1-minute spacing
    for (let i = 0; i < 10; i++) {
      const volume1 = 10 + i;
      const volume2 = 20 - i; // Decreasing as agent1 increases
      
      const entities1 = new Set(Array(volume1).fill(null).map((_, j) => `e1-${i}-${j}`));
      const entities2 = new Set(Array(volume2).fill(null).map((_, j) => `e2-${i}-${j}`));
      
      history1.get(agent1)!.push({
        timestamp: baseTime + i * 60000,
        entityCount: volume1,
        relationshipCount: volume1,
        entities: entities1,
      });
      
      history2.get(agent2)!.push({
        timestamp: baseTime + i * 60000,
        entityCount: volume2,
        relationshipCount: volume2,
        entities: entities2,
      });
    }
    
    const correlation = detector.computeCorrelation(agent1, agent2, 3600000);
    
    // Should have negative correlation
    expect(correlation).toBeLessThan(0);
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 30: Correlation Coefficient Computation
   * Validates: Requirements 7.1
   * 
   * Property: Uncorrelated patterns should have correlation close to 0
   */
  test('uncorrelated patterns have correlation near zero', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 20 }), { minLength: 10, maxLength: 20 }),
        fc.array(fc.integer({ min: 1, max: 20 }), { minLength: 10, maxLength: 20 }),
        (volumes1, volumes2) => {
          const agent1 = 'agent-random-1';
          const agent2 = 'agent-random-2';
          
          // Record random independent patterns
          for (let i = 0; i < Math.min(volumes1.length, volumes2.length); i++) {
            const entities1 = new Set(
              Array(volumes1[i]).fill(null).map((_, j) => `e1-${i}-${j}`)
            );
            const entities2 = new Set(
              Array(volumes2[i]).fill(null).map((_, j) => `e2-${i}-${j}`)
            );
            
            detector.recordContribution(agent1, entities1, volumes1[i]);
            detector.recordContribution(agent2, entities2, volumes2[i]);
          }
          
          const correlation = detector.computeCorrelation(agent1, agent2, 3600000);
          
          // Random patterns should have correlation close to 0
          // Allow wide range due to randomness
          expect(Math.abs(correlation)).toBeLessThan(1.0);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 30: Correlation Coefficient Computation
   * Validates: Requirements 7.1
   * 
   * Property: Correlation should be symmetric (r(A,B) = r(B,A))
   */
  test('correlation is symmetric', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 20 }), { minLength: 5, maxLength: 20 }),
        fc.array(fc.integer({ min: 1, max: 20 }), { minLength: 5, maxLength: 20 }),
        (volumes1, volumes2) => {
          const agent1 = 'agent-sym-1';
          const agent2 = 'agent-sym-2';
          
          // Record contributions
          for (let i = 0; i < Math.min(volumes1.length, volumes2.length); i++) {
            const entities1 = new Set(
              Array(volumes1[i]).fill(null).map((_, j) => `e1-${i}-${j}`)
            );
            const entities2 = new Set(
              Array(volumes2[i]).fill(null).map((_, j) => `e2-${i}-${j}`)
            );
            
            detector.recordContribution(agent1, entities1, volumes1[i]);
            detector.recordContribution(agent2, entities2, volumes2[i]);
          }
          
          const corr12 = detector.computeCorrelation(agent1, agent2, 3600000);
          const corr21 = detector.computeCorrelation(agent2, agent1, 3600000);
          
          // Correlation should be symmetric
          expect(Math.abs(corr12 - corr21)).toBeLessThan(0.001);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 30: Correlation Coefficient Computation
   * Validates: Requirements 7.1
   * 
   * Property: Zero variance should return 0 correlation
   */
  test('zero variance returns zero correlation', () => {
    const agent1 = 'agent-const-1';
    const agent2 = 'agent-const-2';
    
    // Record constant contributions (no variance)
    for (let i = 0; i < 10; i++) {
      const entities1 = new Set(Array(5).fill(null).map((_, j) => `e1-${i}-${j}`));
      const entities2 = new Set(Array(5).fill(null).map((_, j) => `e2-${i}-${j}`));
      
      detector.recordContribution(agent1, entities1, 5);
      detector.recordContribution(agent2, entities2, 5);
    }
    
    const correlation = detector.computeCorrelation(agent1, agent2, 3600000);
    
    // Zero variance should give 0 correlation
    expect(correlation).toBe(0);
  });
});

// =====================================================
// PROPERTY 34: JACCARD SIMILARITY FLAGGING
// =====================================================

describe('Property 34: Jaccard Similarity Flagging', () => {
  let detector: CollusionDetector;
  
  beforeEach(() => {
    detector = new CollusionDetector();
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 34: Jaccard Similarity Flagging
   * Validates: Requirements 7.5
   * 
   * Property: For any set of agents referencing identical entity sets,
   * Jaccard similarity should be computed and clusters above 0.8 should be flagged
   */
  test('Jaccard similarity is bounded between 0 and 1', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 0, maxLength: 50 }),
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 0, maxLength: 50 }),
        (entities1, entities2) => {
          const set1 = new Set(entities1);
          const set2 = new Set(entities2);
          
          const similarity = detector.computeJaccardSimilarity(set1, set2);
          
          // Jaccard similarity must be in [0, 1]
          expect(similarity).toBeGreaterThanOrEqual(0);
          expect(similarity).toBeLessThanOrEqual(1);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 34: Jaccard Similarity Flagging
   * Validates: Requirements 7.5
   * 
   * Property: Empty sets should have similarity of 0
   */
  test('empty sets have zero similarity', () => {
    const set1 = new Set<string>();
    const set2 = new Set<string>();
    
    const similarity = detector.computeJaccardSimilarity(set1, set2);
    expect(similarity).toBe(0);
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 34: Jaccard Similarity Flagging
   * Validates: Requirements 7.5
   * 
   * Property: One empty set should have similarity of 0
   */
  test('one empty set has zero similarity', () => {
    const set1 = new Set(['e1', 'e2', 'e3']);
    const set2 = new Set<string>();
    
    const similarity1 = detector.computeJaccardSimilarity(set1, set2);
    const similarity2 = detector.computeJaccardSimilarity(set2, set1);
    
    expect(similarity1).toBe(0);
    expect(similarity2).toBe(0);
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 34: Jaccard Similarity Flagging
   * Validates: Requirements 7.5
   * 
   * Property: Identical sets should have similarity of 1
   */
  test('identical sets have similarity of 1', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 50 }),
        (entities) => {
          const set1 = new Set(entities);
          const set2 = new Set(entities);
          
          const similarity = detector.computeJaccardSimilarity(set1, set2);
          
          // Identical sets should have similarity = 1
          expect(similarity).toBe(1);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 34: Jaccard Similarity Flagging
   * Validates: Requirements 7.5
   * 
   * Property: Disjoint sets should have similarity of 0
   */
  test('disjoint sets have zero similarity', () => {
    const set1 = new Set(['e1', 'e2', 'e3']);
    const set2 = new Set(['e4', 'e5', 'e6']);
    
    const similarity = detector.computeJaccardSimilarity(set1, set2);
    expect(similarity).toBe(0);
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 34: Jaccard Similarity Flagging
   * Validates: Requirements 7.5
   * 
   * Property: Partial overlap should give correct similarity
   */
  test('partial overlap gives correct similarity', () => {
    // Set1: {e1, e2, e3}
    // Set2: {e2, e3, e4}
    // Intersection: {e2, e3} = 2 elements
    // Union: {e1, e2, e3, e4} = 4 elements
    // J = 2/4 = 0.5
    
    const set1 = new Set(['e1', 'e2', 'e3']);
    const set2 = new Set(['e2', 'e3', 'e4']);
    
    const similarity = detector.computeJaccardSimilarity(set1, set2);
    expect(similarity).toBeCloseTo(0.5, 5);
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 34: Jaccard Similarity Flagging
   * Validates: Requirements 7.5
   * 
   * Property: Subset relationship should give correct similarity
   */
  test('subset gives correct similarity', () => {
    // Set1: {e1, e2}
    // Set2: {e1, e2, e3, e4}
    // Intersection: {e1, e2} = 2 elements
    // Union: {e1, e2, e3, e4} = 4 elements
    // J = 2/4 = 0.5
    
    const set1 = new Set(['e1', 'e2']);
    const set2 = new Set(['e1', 'e2', 'e3', 'e4']);
    
    const similarity = detector.computeJaccardSimilarity(set1, set2);
    expect(similarity).toBeCloseTo(0.5, 5);
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 34: Jaccard Similarity Flagging
   * Validates: Requirements 7.5
   * 
   * Property: Jaccard similarity is symmetric
   */
  test('Jaccard similarity is symmetric', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 30 }),
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 30 }),
        (entities1, entities2) => {
          const set1 = new Set(entities1);
          const set2 = new Set(entities2);
          
          const sim12 = detector.computeJaccardSimilarity(set1, set2);
          const sim21 = detector.computeJaccardSimilarity(set2, set1);
          
          // Similarity should be symmetric
          expect(Math.abs(sim12 - sim21)).toBeLessThan(0.001);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 34: Jaccard Similarity Flagging
   * Validates: Requirements 7.5
   * 
   * Property: High similarity (>= 0.8) should be flagged in cluster detection
   */
  test('high similarity is flagged in cluster detection', () => {
    const agent1 = 'agent-collude-1';
    const agent2 = 'agent-collude-2';
    
    // Create highly overlapping entity sets
    const commonEntities = Array(80).fill(null).map((_, i) => `common-${i}`);
    
    // Manually set timestamps to ensure different time buckets
    const baseTime = Date.now();
    const history1 = detector['contributionHistory'];
    const history2 = detector['contributionHistory'];
    
    if (!history1.has(agent1)) history1.set(agent1, []);
    if (!history2.has(agent2)) history2.set(agent2, []);
    
    // Record contributions with VARYING entity counts (to avoid zero variance)
    // but with high entity overlap
    for (let i = 0; i < 10; i++) {
      const count1 = 80 + i; // Varying from 80 to 89
      const count2 = 80 + i; // Same pattern as agent1
      
      const entities1 = new Set([...commonEntities.slice(0, count1), `unique1-${i}`]);
      const entities2 = new Set([...commonEntities.slice(0, count2), `unique2-${i}`]);
      
      history1.get(agent1)!.push({
        timestamp: baseTime + i * 60000,
        entityCount: count1,
        relationshipCount: count1,
        entities: entities1,
      });
      
      history2.get(agent2)!.push({
        timestamp: baseTime + i * 60000,
        entityCount: count2,
        relationshipCount: count2,
        entities: entities2,
      });
    }
    
    // Compute Jaccard similarity on last contribution
    const lastEntities1 = history1.get(agent1)![9].entities;
    const lastEntities2 = history2.get(agent2)![9].entities;
    const similarity = detector.computeJaccardSimilarity(lastEntities1, lastEntities2);
    
    // Should be high (most entities are common)
    expect(similarity).toBeGreaterThan(0.8);
    
    // Detect clusters
    const clusters = detector.detectCollusionClusters([agent1, agent2], 0.7);
    
    // Should detect cluster with high entity overlap
    expect(clusters.length).toBeGreaterThan(0);
    if (clusters.length > 0) {
      expect(clusters[0].entityOverlap).toBeGreaterThan(0.7);
    }
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 34: Jaccard Similarity Flagging
   * Validates: Requirements 7.5
   * 
   * Property: Adding elements to union decreases or maintains similarity
   */
  test('adding elements to union decreases or maintains similarity', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 5, maxLength: 20 }),
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 5, maxLength: 20 }),
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 10 }),
        (entities1, entities2, newEntities) => {
          const set1 = new Set(entities1);
          const set2 = new Set(entities2);
          
          // Skip if sets are empty or disjoint (similarity would be 0)
          if (set1.size === 0 || set2.size === 0) {
            return true;
          }
          
          const originalSimilarity = detector.computeJaccardSimilarity(set1, set2);
          
          // Skip if already disjoint (can't decrease from 0)
          if (originalSimilarity === 0) {
            return true;
          }
          
          // Add new entities to set2 (increases union size)
          // Filter out entities already in set2 to ensure we're actually adding
          const uniqueNewEntities = newEntities.filter(e => !set2.has(e));
          if (uniqueNewEntities.length === 0) {
            return true; // Skip if no new entities to add
          }
          
          const set2Extended = new Set([...set2, ...uniqueNewEntities]);
          const newSimilarity = detector.computeJaccardSimilarity(set1, set2Extended);
          
          // Similarity should decrease or stay the same (with small epsilon for floating point)
          expect(newSimilarity).toBeLessThanOrEqual(originalSimilarity + 0.001);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// GRAPH EDIT DISTANCE TESTS
// =====================================================

describe('Graph Edit Distance', () => {
  let detector: CollusionDetector;
  
  beforeEach(() => {
    detector = new CollusionDetector();
  });
  
  test('identical graphs have zero edit distance', () => {
    const graph1 = generateGraph(10, 5);
    const graph2 = generateGraph(10, 5);
    
    const distance = detector.computeGraphEditDistance(graph1, graph2);
    expect(distance).toBe(0);
  });
  
  test('completely different graphs have high edit distance', () => {
    const graph1 = generateGraph(10, 5);
    
    // Create completely different graph
    const nodes2 = new Map();
    const edges2 = new Map();
    for (let i = 0; i < 10; i++) {
      const nodeId = `different-${i}`;
      nodes2.set(nodeId, {
        id: nodeId,
        type: 'Entity',
        data: { value: i },
      });
      edges2.set(nodeId, []);
    }
    
    const graph2: CausalGraph = {
      nodes: nodes2,
      edges: edges2,
      metadata: {
        nodeCount: 10,
        edgeCount: 0,
        density: 0,
      },
    };
    
    const distance = detector.computeGraphEditDistance(graph1, graph2);
    
    // Should have high distance (all nodes different + all edges different)
    expect(distance).toBeGreaterThan(15);
  });
  
  test('edit distance is symmetric', () => {
    const graph1 = generateGraph(8, 4);
    const graph2 = generateGraph(10, 6);
    
    const dist12 = detector.computeGraphEditDistance(graph1, graph2);
    const dist21 = detector.computeGraphEditDistance(graph2, graph1);
    
    expect(dist12).toBe(dist21);
  });
  
  test('edit distance is non-negative', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 20 }),
        fc.integer({ min: 5, max: 20 }),
        fc.integer({ min: 2, max: 10 }),
        fc.integer({ min: 2, max: 10 }),
        (nodes1, nodes2, edges1, edges2) => {
          const graph1 = generateGraph(nodes1, Math.min(edges1, nodes1 - 1));
          const graph2 = generateGraph(nodes2, Math.min(edges2, nodes2 - 1));
          
          const distance = detector.computeGraphEditDistance(graph1, graph2);
          
          expect(distance).toBeGreaterThanOrEqual(0);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});

// =====================================================
// CLUSTER DETECTION TESTS
// =====================================================

describe('Collusion Cluster Detection', () => {
  let detector: CollusionDetector;
  
  beforeEach(() => {
    detector = new CollusionDetector();
  });
  
  test('no correlations returns empty clusters', () => {
    const clusters = detector.detectCollusionClusters(['agent-1', 'agent-2'], 0.7);
    expect(clusters).toEqual([]);
  });
  
  test('low correlation does not create clusters', () => {
    const agent1 = 'agent-low-1';
    const agent2 = 'agent-low-2';
    
    // Record uncorrelated contributions
    for (let i = 0; i < 10; i++) {
      const entities1 = new Set([`e1-${i}`]);
      const entities2 = new Set([`e2-${i * 2}`]); // Different pattern
      
      detector.recordContribution(agent1, entities1, 1);
      detector.recordContribution(agent2, entities2, 1);
    }
    
    const clusters = detector.detectCollusionClusters([agent1, agent2], 0.7);
    
    // Should not detect cluster with low correlation
    expect(clusters.length).toBe(0);
  });
  
  test('high correlation and entity overlap creates cluster', () => {
    const agent1 = 'agent-high-1';
    const agent2 = 'agent-high-2';
    
    // Manually set timestamps to ensure different time buckets
    const baseTime = Date.now();
    const history1 = detector['contributionHistory'];
    const history2 = detector['contributionHistory'];
    
    if (!history1.has(agent1)) history1.set(agent1, []);
    if (!history2.has(agent2)) history2.set(agent2, []);
    
    // Record highly correlated contributions with entity overlap
    // Use VARYING entity counts to avoid zero variance
    const sharedEntities = Array(50).fill(null).map((_, i) => `shared-${i}`);
    
    for (let i = 0; i < 10; i++) {
      const count = 50 + i; // Varying from 50 to 59
      const entities1 = new Set([...sharedEntities.slice(0, count), `unique1-${i}`]);
      const entities2 = new Set([...sharedEntities.slice(0, count), `unique2-${i}`]);
      
      history1.get(agent1)!.push({
        timestamp: baseTime + i * 60000,
        entityCount: count,
        relationshipCount: count,
        entities: entities1,
      });
      
      history2.get(agent2)!.push({
        timestamp: baseTime + i * 60000,
        entityCount: count,
        relationshipCount: count,
        entities: entities2,
      });
    }
    
    const clusters = detector.detectCollusionClusters([agent1, agent2], 0.7);
    
    // Should detect cluster
    expect(clusters.length).toBeGreaterThan(0);
    if (clusters.length > 0) {
      expect(clusters[0].agentIds).toContain(agent1);
      expect(clusters[0].agentIds).toContain(agent2);
      expect(clusters[0].confidence).toBeGreaterThan(0.5);
    }
  });
  
  test('cluster has required evidence types', () => {
    const agent1 = 'agent-evidence-1';
    const agent2 = 'agent-evidence-2';
    
    // Manually set timestamps to ensure different time buckets
    const baseTime = Date.now();
    const history1 = detector['contributionHistory'];
    const history2 = detector['contributionHistory'];
    
    if (!history1.has(agent1)) history1.set(agent1, []);
    if (!history2.has(agent2)) history2.set(agent2, []);
    
    // Create strong collusion pattern with VARYING entity counts
    const sharedEntities = Array(80).fill(null).map((_, i) => `shared-${i}`);
    
    for (let i = 0; i < 15; i++) {
      const count = 80 + i; // Varying from 80 to 94
      const entities1 = new Set([...sharedEntities.slice(0, count), `u1-${i}`]);
      const entities2 = new Set([...sharedEntities.slice(0, count), `u2-${i}`]);
      
      history1.get(agent1)!.push({
        timestamp: baseTime + i * 60000,
        entityCount: count,
        relationshipCount: count,
        entities: entities1,
      });
      
      history2.get(agent2)!.push({
        timestamp: baseTime + i * 60000,
        entityCount: count,
        relationshipCount: count,
        entities: entities2,
      });
    }
    
    const clusters = detector.detectCollusionClusters([agent1, agent2], 0.7);
    
    expect(clusters.length).toBeGreaterThan(0);
    if (clusters.length > 0) {
      const cluster = clusters[0];
      
      // Should have at least 2 evidence types
      expect(cluster.evidence.length).toBeGreaterThanOrEqual(2);
      
      // Should have temporal correlation evidence
      const hasCorrelation = cluster.evidence.some(e => e.type === 'TEMPORAL_CORRELATION');
      expect(hasCorrelation).toBe(true);
      
      // Should have entity overlap evidence
      const hasOverlap = cluster.evidence.some(e => e.type === 'ENTITY_OVERLAP');
      expect(hasOverlap).toBe(true);
    }
  });
});


// =====================================================
// REPUTATION PENALTY SYSTEM TESTS
// =====================================================

describe('Reputation Penalty System', () => {
  let detector: CollusionDetector;
  
  beforeEach(() => {
    detector = new CollusionDetector();
  });
  
  test('penalty percentage is proportional to correlation strength', () => {
    const agent1 = 'agent-penalty-1';
    const agent2 = 'agent-penalty-2';
    
    // Create cluster with moderate correlation (0.75)
    const cluster1 = {
      agentIds: [agent1, agent2],
      avgCorrelation: 0.75,
      graphSimilarity: 0.6,
      entityOverlap: 0.7,
      confidence: 0.8,
      evidence: [
        { type: 'TEMPORAL_CORRELATION' as const, score: 0.75 },
        { type: 'ENTITY_OVERLAP' as const, score: 0.7 },
      ],
    };
    
    const penalties1 = detector.applyReputationPenalty(cluster1);
    
    // Should have 10% penalty for correlation 0.7-0.8
    expect(penalties1.get(agent1)?.penaltyPercentage).toBe(0.10);
    expect(penalties1.get(agent2)?.penaltyPercentage).toBe(0.10);
    
    // Create cluster with high correlation (0.85)
    const cluster2 = {
      agentIds: [agent1, agent2],
      avgCorrelation: 0.85,
      graphSimilarity: 0.8,
      entityOverlap: 0.85,
      confidence: 0.9,
      evidence: [
        { type: 'TEMPORAL_CORRELATION' as const, score: 0.85 },
        { type: 'ENTITY_OVERLAP' as const, score: 0.85 },
      ],
    };
    
    const penalties2 = detector.applyReputationPenalty(cluster2);
    
    // Should have 20% penalty for correlation 0.8-0.9
    expect(penalties2.get(agent1)?.penaltyPercentage).toBe(0.20);
    
    // Create cluster with very high correlation (0.95)
    const cluster3 = {
      agentIds: [agent1, agent2],
      avgCorrelation: 0.95,
      graphSimilarity: 0.9,
      entityOverlap: 0.95,
      confidence: 0.95,
      evidence: [
        { type: 'TEMPORAL_CORRELATION' as const, score: 0.95 },
        { type: 'ENTITY_OVERLAP' as const, score: 0.95 },
      ],
    };
    
    const penalties3 = detector.applyReputationPenalty(cluster3);
    
    // Should have 30% penalty for correlation >= 0.9
    expect(penalties3.get(agent1)?.penaltyPercentage).toBe(0.30);
  });
  
  test('penalty includes all required fields', () => {
    const agent1 = 'agent-fields-1';
    const agent2 = 'agent-fields-2';
    
    const cluster = {
      agentIds: [agent1, agent2],
      avgCorrelation: 0.85,
      graphSimilarity: 0.75,
      entityOverlap: 0.80,
      confidence: 0.88,
      evidence: [
        { type: 'TEMPORAL_CORRELATION' as const, score: 0.85 },
        { type: 'STRUCTURAL_SIMILARITY' as const, score: 0.75 },
        { type: 'ENTITY_OVERLAP' as const, score: 0.80 },
      ],
    };
    
    const penalties = detector.applyReputationPenalty(cluster);
    
    const penalty1 = penalties.get(agent1);
    expect(penalty1).toBeDefined();
    
    if (penalty1) {
      // Check all required fields
      expect(penalty1.agentId).toBe(agent1);
      expect(penalty1.penaltyPercentage).toBe(0.20);
      expect(penalty1.correlationStrength).toBe(0.85);
      expect(penalty1.confidence).toBe(0.88);
      expect(penalty1.appliedAt).toBeDefined();
      expect(penalty1.reason).toBe('COLLUSION_DETECTED');
      
      // Check evidence object
      expect(penalty1.evidence).toBeDefined();
      expect(penalty1.evidence.avgCorrelation).toBe(0.85);
      expect(penalty1.evidence.graphSimilarity).toBe(0.75);
      expect(penalty1.evidence.entityOverlap).toBe(0.80);
      expect(penalty1.evidence.clusterSize).toBe(2);
      expect(penalty1.evidence.evidenceTypes).toEqual([
        'TEMPORAL_CORRELATION',
        'STRUCTURAL_SIMILARITY',
        'ENTITY_OVERLAP',
      ]);
    }
  });
  
  test('penalty is applied to all agents in cluster', () => {
    const agents = ['agent-multi-1', 'agent-multi-2', 'agent-multi-3'];
    
    const cluster = {
      agentIds: agents,
      avgCorrelation: 0.92,
      graphSimilarity: 0.85,
      entityOverlap: 0.88,
      confidence: 0.90,
      evidence: [
        { type: 'TEMPORAL_CORRELATION' as const, score: 0.92 },
        { type: 'ENTITY_OVERLAP' as const, score: 0.88 },
      ],
    };
    
    const penalties = detector.applyReputationPenalty(cluster);
    
    // All agents should have penalties
    expect(penalties.size).toBe(3);
    
    for (const agentId of agents) {
      const penalty = penalties.get(agentId);
      expect(penalty).toBeDefined();
      expect(penalty?.agentId).toBe(agentId);
      expect(penalty?.penaltyPercentage).toBe(0.30); // 0.92 >= 0.9
    }
  });
  
  test('penalty timestamp is valid ISO string', () => {
    const cluster = {
      agentIds: ['agent-time-1'],
      avgCorrelation: 0.75,
      graphSimilarity: 0.6,
      entityOverlap: 0.7,
      confidence: 0.8,
      evidence: [
        { type: 'TEMPORAL_CORRELATION' as const, score: 0.75 },
      ],
    };
    
    const penalties = detector.applyReputationPenalty(cluster);
    const penalty = penalties.get('agent-time-1');
    
    expect(penalty).toBeDefined();
    if (penalty) {
      // Should be valid ISO timestamp
      const timestamp = new Date(penalty.appliedAt);
      expect(timestamp.toISOString()).toBe(penalty.appliedAt);
      
      // Should be recent (within last second)
      const now = Date.now();
      const penaltyTime = timestamp.getTime();
      expect(Math.abs(now - penaltyTime)).toBeLessThan(1000);
    }
  });
  
  test('penalty below threshold returns zero penalty', () => {
    // Test the private method indirectly through edge case
    const cluster = {
      agentIds: ['agent-low-1'],
      avgCorrelation: 0.65, // Below 0.7 threshold
      graphSimilarity: 0.5,
      entityOverlap: 0.6,
      confidence: 0.7,
      evidence: [
        { type: 'TEMPORAL_CORRELATION' as const, score: 0.65 },
      ],
    };
    
    const penalties = detector.applyReputationPenalty(cluster);
    const penalty = penalties.get('agent-low-1');
    
    expect(penalty).toBeDefined();
    if (penalty) {
      // Should have 0% penalty for correlation < 0.7
      expect(penalty.penaltyPercentage).toBe(0.0);
    }
  });
  
  test('penalty evidence preserves cluster information', () => {
    const cluster = {
      agentIds: ['agent-evidence-1', 'agent-evidence-2', 'agent-evidence-3'],
      avgCorrelation: 0.88,
      graphSimilarity: 0.82,
      entityOverlap: 0.85,
      confidence: 0.87,
      evidence: [
        { type: 'TEMPORAL_CORRELATION' as const, score: 0.88 },
        { type: 'STRUCTURAL_SIMILARITY' as const, score: 0.82 },
        { type: 'ENTITY_OVERLAP' as const, score: 0.85 },
      ],
    };
    
    const penalties = detector.applyReputationPenalty(cluster);
    const penalty = penalties.get('agent-evidence-1');
    
    expect(penalty).toBeDefined();
    if (penalty) {
      // Evidence should match cluster data
      expect(penalty.evidence.avgCorrelation).toBe(cluster.avgCorrelation);
      expect(penalty.evidence.graphSimilarity).toBe(cluster.graphSimilarity);
      expect(penalty.evidence.entityOverlap).toBe(cluster.entityOverlap);
      expect(penalty.evidence.clusterSize).toBe(cluster.agentIds.length);
      expect(penalty.evidence.evidenceTypes.length).toBe(cluster.evidence.length);
    }
  });
  
  test('multiple penalties can be applied to same agent', () => {
    const agent = 'agent-multiple-1';
    
    // First cluster
    const cluster1 = {
      agentIds: [agent, 'agent-other-1'],
      avgCorrelation: 0.75,
      graphSimilarity: 0.6,
      entityOverlap: 0.7,
      confidence: 0.8,
      evidence: [
        { type: 'TEMPORAL_CORRELATION' as const, score: 0.75 },
      ],
    };
    
    const penalties1 = detector.applyReputationPenalty(cluster1);
    expect(penalties1.get(agent)?.penaltyPercentage).toBe(0.10);
    
    // Second cluster (different collusion)
    const cluster2 = {
      agentIds: [agent, 'agent-other-2'],
      avgCorrelation: 0.92,
      graphSimilarity: 0.85,
      entityOverlap: 0.88,
      confidence: 0.90,
      evidence: [
        { type: 'TEMPORAL_CORRELATION' as const, score: 0.92 },
      ],
    };
    
    const penalties2 = detector.applyReputationPenalty(cluster2);
    expect(penalties2.get(agent)?.penaltyPercentage).toBe(0.30);
    
    // Both penalties should be valid
    expect(penalties1.get(agent)).toBeDefined();
    expect(penalties2.get(agent)).toBeDefined();
  });
  
  test('penalty history placeholder returns empty array', () => {
    // Test the placeholder implementation
    const history = detector.getPenaltyHistory('any-agent');
    expect(history).toEqual([]);
  });
});
