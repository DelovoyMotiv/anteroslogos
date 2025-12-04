/**
 * Property-Based Tests for Unified Graph Metrics Cache
 * 
 * Validates:
 * - Cache consistency across BFT and CCC consumers
 * - Performance improvements vs duplicate computation
 * - Correctness of PageRank, betweenness, novelty detection
 * 
 * @module lib/graph/__tests__/unifiedMetricsCache.property.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { 
  UnifiedGraphMetricsCache,
  initializeUnifiedCache,
  resetUnifiedCache 
} from '../unifiedMetricsCache';
import type { CausalGraph } from '../../../types/causalTracer.types';

describe('Unified Graph Metrics Cache - Property Tests', () => {
  let cache: UnifiedGraphMetricsCache;

  beforeEach(() => {
    resetUnifiedCache();
    cache = initializeUnifiedCache();
  });

  /**
   * Property 1: Cache consistency
   * For any node and graph, multiple reads return identical values
   * 
   * Validates: Requirements - Cache consistency
   */
  it('Property 1: Multiple cache reads return identical values', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }), // nodeId
        fc.integer({ min: 1, max: 100 }), // nodeCount
        async (nodeId, nodeCount) => {
          // Create mock graph
          const graph = createMockGraph(nodeCount);
          
          // First read
          const result1 = await cache.getPageRank(nodeId, graph);
          
          // Second read (should hit cache)
          const result2 = await cache.getPageRank(nodeId, graph);
          
          // Third read (should hit cache)
          const result3 = await cache.getPageRank(nodeId, graph);
          
          // All reads must return identical values
          expect(result1.rank).toBe(result2.rank);
          expect(result2.rank).toBe(result3.rank);
          expect(result1.inDegree).toBe(result2.inDegree);
          expect(result1.outDegree).toBe(result2.outDegree);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 2: PageRank non-negativity
   * For any node, PageRank is non-negative
   * 
   * Validates: Requirements - PageRank correctness
   */
  it('Property 2: PageRank values are non-negative', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 50 }), // nodeCount
        async (nodeCount) => {
          const graph = createMockGraph(nodeCount);
          
          // Recompute PageRank
          await cache.recomputePageRank(graph);
          
          // Check all PageRank values are non-negative
          for (const [nodeId] of graph.nodes) {
            const result = await cache.getPageRank(nodeId, graph);
            
            // PageRank must be non-negative
            expect(result.rank).toBeGreaterThanOrEqual(0);
            
            // PageRank should be reasonable (not infinity)
            expect(result.rank).toBeLessThan(1.0);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property 3: Betweenness bounds
   * For any node, betweenness centrality is in [0, 1]
   * 
   * Validates: Requirements - Betweenness correctness
   */
  it('Property 3: Betweenness centrality is bounded [0, 1]', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }), // nodeId
        fc.integer({ min: 5, max: 50 }), // nodeCount
        async (nodeId, nodeCount) => {
          const graph = createMockGraph(nodeCount);
          
          const result = await cache.getBetweenness(nodeId, graph);
          
          // Betweenness must be in [0, 1]
          expect(result.centrality).toBeGreaterThanOrEqual(0);
          expect(result.centrality).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 4: Novelty idempotence
   * For any entity, checking novelty twice returns same result
   * 
   * Validates: Requirements - Novelty detection consistency
   */
  it('Property 4: Novelty detection is idempotent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }), // entityName
        fc.string({ minLength: 1, maxLength: 20 }), // entityType
        fc.string({ minLength: 1, maxLength: 20 }), // entityId
        async (entityName, entityType, entityId) => {
          // First check
          const result1 = await cache.isEntityNovel(entityName, entityType, entityId);
          
          // Second check (should return same result)
          const result2 = await cache.isEntityNovel(entityName, entityType, entityId);
          
          // Results must be identical
          expect(result1.isNovel).toBe(result2.isNovel);
          expect(result1.existingCount).toBe(result2.existingCount);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 5: Cache hit rate improvement
   * For any sequence of reads, cache hit rate increases over time
   * 
   * Validates: Requirements - Performance improvement
   */
  it('Property 5: Cache hit rate improves with repeated reads', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 10, maxLength: 50 }),
        fc.integer({ min: 10, max: 50 }),
        async (nodeIds, nodeCount) => {
          const graph = createMockGraph(nodeCount);
          
          // First pass: populate cache
          for (const nodeId of nodeIds) {
            await cache.getPageRank(nodeId, graph);
          }
          
          const metrics1 = cache.getMetrics();
          const hitRate1 = metrics1.pageRank.hitRate;
          
          // Second pass: should hit cache more
          for (const nodeId of nodeIds) {
            await cache.getPageRank(nodeId, graph);
          }
          
          const metrics2 = cache.getMetrics();
          const hitRate2 = metrics2.pageRank.hitRate;
          
          // Hit rate should improve or stay same
          expect(hitRate2).toBeGreaterThanOrEqual(hitRate1);
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property 6: Epoch invalidation
   * For any future epoch, cache entries are invalidated
   * 
   * Validates: Requirements - Temporal consistency
   */
  it('Property 6: Future epoch entries are invalidated', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 100 }), // currentEpoch
        fc.integer({ min: 2, max: 10 }), // futureEpochDelta (at least 2 to ensure future)
        async (currentEpoch, futureEpochDelta) => {
          const futureEpoch = currentEpoch + futureEpochDelta;
          const graph = createMockGraph(10);
          const uniqueNodeId = `node-${currentEpoch}-${futureEpochDelta}`;
          
          // Store entry with future epoch
          await cache.getPageRank(uniqueNodeId, graph, futureEpoch, futureEpoch);
          
          // Get metrics before invalidation
          const metricsBefore = cache.getMetrics();
          const missesBefore = metricsBefore.pageRank.misses;
          
          // Invalidate future epochs
          cache.invalidateFutureEpochs(currentEpoch);
          
          // Try to read with current epoch (should miss cache because entry was invalidated)
          await cache.getPageRank(uniqueNodeId, graph, currentEpoch, currentEpoch);
          
          const metricsAfter = cache.getMetrics();
          const missesAfter = metricsAfter.pageRank.misses;
          
          // Should have caused at least one cache miss
          expect(missesAfter).toBeGreaterThanOrEqual(missesBefore + 1);
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property 7: Connectivity metrics consistency
   * For any set of relationships, connectivity ratio is in [0, 1]
   * 
   * Validates: Requirements - Connectivity correctness
   */
  it('Property 7: Connectivity ratio is bounded [0, 1]', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            sourceEntityId: fc.string({ minLength: 1, maxLength: 20 }),
            targetEntityId: fc.string({ minLength: 1, maxLength: 20 }),
            weight: fc.float({ min: 0, max: 1 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (relationships) => {
          const graph = createMockGraph(10);
          
          const result = await cache.getConnectivityMetrics(relationships, graph);
          
          // Connection ratio must be in [0, 1]
          expect(result.connectionRatio).toBeGreaterThanOrEqual(0);
          expect(result.connectionRatio).toBeLessThanOrEqual(1);
          
          // Quality boost must be non-negative
          expect(result.qualityBoost).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 50 }
    );
  });
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function createMockGraph(nodeCount: number): CausalGraph {
  const nodes = new Map();
  const edges = new Map();
  
  // Create nodes
  for (let i = 0; i < nodeCount; i++) {
    const nodeId = `node${i}`;
    nodes.set(nodeId, {
      id: nodeId,
      label: `Node ${i}`,
      type: 'entity',
      confidence: 0.8,
      eeatScore: 7,
      authorityScore: 50,
      freshnessScore: 70,
      relevanceScore: 60,
      validationScore: 65,
      uniquenessScore: 55,
      entities: [`entity${i}`],
      claims: [`claim${i}`],
      freshness: 30,
    });
  }
  
  // Create edges (random connections)
  let edgeCount = 0;
  for (let i = 0; i < nodeCount - 1; i++) {
    const source = `node${i}`;
    const target = `node${i + 1}`;
    const edgeId = `edge${edgeCount++}`;
    
    edges.set(edgeId, {
      id: edgeId,
      source,
      target,
      type: 'relates_to',
      weight: 0.5,
      causalStrength: 0.7,
    });
  }
  
  return {
    domain: 'test-domain',
    nodes,
    edges,
    nodeCount,
    edgeCount,
    density: edgeCount / (nodeCount * (nodeCount - 1)),
    avgPathLength: 2.5,
    clusteringCoefficient: 0.3,
    lastUpdated: new Date(),
    version: 1,
  };
}
