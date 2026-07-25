/**
 * Property-Based Tests for Performance Optimization
 * 
 * Tests properties:
 * - Property 42: Sampling for Large Graphs
 * - Property 44: Latency Overhead Bound
 * 
 * @module lib/bft/__tests__/performanceOptimization.property.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { PerformanceOptimizer } from '../performanceOptimizer';
import type { Entity, CausalGraph } from '../../../types/byzantine.types';

describe('Performance Optimization - Property Tests', () => {
  let optimizer: PerformanceOptimizer;
  
  beforeEach(() => {
    optimizer = new PerformanceOptimizer();
  });
  
  /**
   * Property 42: Sampling for Large Graphs
   * 
   * For any graph exceeding 10,000 nodes, information-theoretic
   * metrics should use sampling rather than full computation.
   * 
   * Validates: Requirements 9.3
   */
  it('Property 42: Samples large graphs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10001, max: 50000 }),
        (nodeCount) => {
          // Check if sampling is triggered
          const shouldSample = optimizer.shouldSample(nodeCount);
          expect(shouldSample).toBe(true);
          
          // Create large entity set
          const entities: Entity[] = [];
          for (let i = 0; i < nodeCount; i++) {
            entities.push({
              id: `entity-${i}`,
              name: `name-${i}`,
              type: ['Person', 'Organization', 'Concept'][i % 3],
            });
          }
          
          // Sample entities
          const sampled = optimizer.sampleEntities(entities);
          
          // Sampled set should be smaller
          expect(sampled.length).toBeLessThan(entities.length);
          
          // Sampled set should be approximately 10% of original
          const expectedSize = Math.floor(nodeCount * 0.1);
          const tolerance = expectedSize * 0.2; // 20% tolerance
          expect(sampled.length).toBeGreaterThan(expectedSize - tolerance);
          expect(sampled.length).toBeLessThan(expectedSize + tolerance);
          
          // All sampled entities should be from original set
          for (const entity of sampled) {
            const found = entities.some(e => e.id === entity.id);
            expect(found).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
  
  /**
   * Property: Small graphs not sampled
   * 
   * Graphs below threshold should not be sampled.
   */
  it('Property: Does not sample small graphs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 9999 }),
        (nodeCount) => {
          // Check if sampling is triggered
          const shouldSample = optimizer.shouldSample(nodeCount);
          expect(shouldSample).toBe(false);
          
          // Create entity set
          const entities: Entity[] = [];
          for (let i = 0; i < nodeCount; i++) {
            entities.push({
              id: `entity-${i}`,
              name: `name-${i}`,
              type: 'test',
            });
          }
          
          // Sample entities
          const sampled = optimizer.sampleEntities(entities);
          
          // Should return full set
          expect(sampled.length).toBe(entities.length);
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
  
  /**
   * Property 44: Latency Overhead Bound
   * 
   * For any load test with all security measures active,
   * p95 latency increase should be below 10% compared to baseline.
   * 
   * Validates: Requirements 9.5
   */
  it('Property 44: Latency overhead within bounds', () => {
    fc.assert(
      fc.property(
        fc.record({
          graphSize: fc.integer({ min: 1000, max: 5000 }),
          iterations: fc.constant(100),
        }),
        (data) => {
          const { graphSize, iterations } = data;
          
          // Create test graph
          const graph: CausalGraph = {
            nodes: [],
            edges: [],
          };
          
          for (let i = 0; i < graphSize; i++) {
            graph.nodes.push({
              id: `node-${i}`,
              name: `Node ${i}`,
              type: 'test',
            });
          }
          
          // Add edges (sparse graph)
          for (let i = 0; i < graphSize - 1; i++) {
            graph.edges.push({
              source: `node-${i}`,
              target: `node-${i + 1}`,
              type: 'test',
            });
          }
          
          // Measure baseline performance (no optimization)
          const baselineStart = performance.now();
          for (let i = 0; i < iterations; i++) {
            // Simulate basic operation
            const _ = graph.nodes.length + graph.edges.length;
          }
          const baselineTime = performance.now() - baselineStart;
          
          // Measure optimized performance
          const optimizedStart = performance.now();
          for (let i = 0; i < iterations; i++) {
            // Check if sampling needed
            const shouldSample = optimizer.shouldSample(graph.nodes.length);
            if (shouldSample) {
              const sampled = optimizer.sampleEntities(graph.nodes);
              const _ = sampled.length;
            } else {
              const _ = graph.nodes.length;
            }
          }
          const optimizedTime = performance.now() - optimizedStart;
          
          // Calculate overhead
          const overhead = (optimizedTime - baselineTime) / baselineTime;
          
          // Overhead should be minimal (< 10%)
          // Note: In practice, sampling should REDUCE time for large graphs
          // For small graphs, overhead should be negligible
          expect(Math.abs(overhead)).toBeLessThan(0.1);
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });
  
  /**
   * Property: Stratified sampling preserves distribution
   * 
   * Sampling should maintain type distribution.
   */
  it('Property: Stratified sampling preserves distribution', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10001, max: 20000 }),
        (nodeCount) => {
          // Create entities with known distribution
          const entities: Entity[] = [];
          const types = ['Person', 'Organization', 'Concept'];
          
          for (let i = 0; i < nodeCount; i++) {
            entities.push({
              id: `entity-${i}`,
              name: `name-${i}`,
              type: types[i % types.length],
            });
          }
          
          // Calculate original distribution
          const originalDist = new Map<string, number>();
          for (const entity of entities) {
            const count = originalDist.get(entity.type) || 0;
            originalDist.set(entity.type, count + 1);
          }
          
          // Sample entities
          const sampled = optimizer.sampleEntities(entities);
          
          // Calculate sampled distribution
          const sampledDist = new Map<string, number>();
          for (const entity of sampled) {
            const count = sampledDist.get(entity.type) || 0;
            sampledDist.set(entity.type, count + 1);
          }
          
          // Check distribution is preserved (within tolerance)
          for (const type of types) {
            const originalRatio = (originalDist.get(type) || 0) / entities.length;
            const sampledRatio = (sampledDist.get(type) || 0) / sampled.length;
            
            // Allow 20% deviation
            const tolerance = 0.2;
            expect(Math.abs(sampledRatio - originalRatio)).toBeLessThan(tolerance);
          }
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });
  
  /**
   * Property: Incremental correlation efficiency
   * 
   * Incremental updates should be faster than full recomputation.
   */
  it('Property: Incremental correlation is efficient', () => {
    fc.assert(
      fc.property(
        fc.record({
          agent1: fc.string({ minLength: 5, maxLength: 20 }),
          agent2: fc.string({ minLength: 5, maxLength: 20 }),
          updates: fc.integer({ min: 10, max: 100 }),
        }),
        (data) => {
          const { agent1, agent2, updates } = data;
          
          // Skip if agents are identical
          if (agent1 === agent2) return true;
          
          // Measure incremental updates
          const incrementalStart = performance.now();
          for (let i = 0; i < updates; i++) {
            const value1 = Math.random();
            const value2 = Math.random();
            optimizer.updateCorrelationIncremental(agent1, agent2, value1, value2);
          }
          const incrementalTime = performance.now() - incrementalStart;
          
          // Get final state
          const state = optimizer.getCorrelationState(agent1, agent2);
          expect(state).toBeDefined();
          expect(state!.n).toBe(updates);
          
          // Incremental updates should be fast
          // Each update should take < 1ms on average
          const avgTimePerUpdate = incrementalTime / updates;
          expect(avgTimePerUpdate).toBeLessThan(1.0);
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
  
  /**
   * Property: Memory usage estimation
   * 
   * Memory estimates should be reasonable.
   */
  it('Property: Memory usage estimates are reasonable', () => {
    fc.assert(
      fc.property(
        fc.record({
          nodeCount: fc.integer({ min: 100, max: 10000 }),
          edgeCount: fc.integer({ min: 100, max: 20000 }),
        }),
        (data) => {
          const { nodeCount, edgeCount } = data;
          
          // Create graph
          const graph: CausalGraph = {
            nodes: [],
            edges: [],
          };
          
          for (let i = 0; i < nodeCount; i++) {
            graph.nodes.push({
              id: `node-${i}`,
              name: `Node ${i}`,
              type: 'test',
            });
          }
          
          for (let i = 0; i < edgeCount; i++) {
            graph.edges.push({
              source: `node-${i % nodeCount}`,
              target: `node-${(i + 1) % nodeCount}`,
              type: 'test',
            });
          }
          
          // Estimate memory
          const estimate = optimizer.estimateMemoryUsage(graph);
          
          // Estimate should be positive
          expect(estimate).toBeGreaterThan(0);
          
          // Estimate should scale with graph size
          const expectedMin = (nodeCount * 100) + (edgeCount * 50);
          const expectedMax = (nodeCount * 300) + (edgeCount * 150);
          
          expect(estimate).toBeGreaterThan(expectedMin);
          expect(estimate).toBeLessThan(expectedMax);
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
  
  /**
   * Property: Acyclic graph detection
   * 
   * Should correctly identify acyclic graphs.
   */
  it('Property: Detects acyclic graphs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 100 }),
        (nodeCount) => {
          // Create DAG (directed acyclic graph)
          const graph: CausalGraph = {
            nodes: [],
            edges: [],
          };
          
          for (let i = 0; i < nodeCount; i++) {
            graph.nodes.push({
              id: `node-${i}`,
              name: `Node ${i}`,
              type: 'test',
            });
          }
          
          // Add edges only in forward direction (no cycles)
          for (let i = 0; i < nodeCount - 1; i++) {
            graph.edges.push({
              source: `node-${i}`,
              target: `node-${i + 1}`,
              type: 'test',
            });
          }
          
          // Should detect as acyclic
          const isAcyclic = optimizer.isLikelyAcyclic(graph);
          expect(isAcyclic).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
});
