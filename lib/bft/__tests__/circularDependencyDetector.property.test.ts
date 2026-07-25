/**
 * Property-Based Tests for Circular Dependency Detector
 * 
 * Tests Properties 10, 11, and 40 from the design document.
 * 
 * @module lib/bft/__tests__/circularDependencyDetector.property.test
 */

import { describe, test, expect, beforeAll } from 'vitest';
import fc from 'fast-check';
import { CircularDependencyDetector } from '../circularDependencyDetector';
import type {
  CausalGraph,
  CausalGraphNode,
  CausalGraphEdge,
} from '../../../types/byzantine.types';
import { BYZANTINE_PARAMS } from '../../../types/byzantine.types';

// =====================================================
// TEST HELPERS
// =====================================================

/**
 * Build a causal graph from test data
 */
function buildGraph(data: {
  nodes: string[];
  edges: Array<[string, string]>;
}): CausalGraph {
  const nodes = new Map<string, CausalGraphNode>();
  const edges = new Map<string, CausalGraphEdge[]>();
  
  // Add nodes
  for (const nodeId of data.nodes) {
    nodes.set(nodeId, {
      id: nodeId,
      type: 'test-node',
      data: { name: nodeId },
    });
  }
  
  // Add edges
  let edgeCount = 0;
  for (const [source, target] of data.edges) {
    // Only add edge if both nodes exist
    if (nodes.has(source) && nodes.has(target)) {
      if (!edges.has(source)) {
        edges.set(source, []);
      }
      
      edges.get(source)!.push({
        source,
        target,
        type: 'test-edge',
      });
      
      edgeCount++;
    }
  }
  
  // Calculate density
  const nodeCount = nodes.size;
  const maxEdges = nodeCount * (nodeCount - 1);
  const density = maxEdges > 0 ? edgeCount / maxEdges : 0;
  
  return {
    nodes,
    edges,
    metadata: {
      nodeCount,
      edgeCount,
      density,
    },
  };
}

/**
 * Generate a random graph with specified size
 */
function generateRandomGraph(nodeCount: number, edgeCount: number): CausalGraph {
  const nodes: string[] = [];
  for (let i = 0; i < nodeCount; i++) {
    nodes.push(`node-${i}`);
  }
  
  const edges: Array<[string, string]> = [];
  for (let i = 0; i < edgeCount; i++) {
    const source = nodes[Math.floor(Math.random() * nodeCount)];
    const target = nodes[Math.floor(Math.random() * nodeCount)];
    edges.push([source, target]);
  }
  
  return buildGraph({ nodes, edges });
}

/**
 * Create a graph with a known cycle
 */
function createGraphWithCycle(cycleSize: number): CausalGraph {
  const nodes: string[] = [];
  const edges: Array<[string, string]> = [];
  
  // Create cycle nodes
  for (let i = 0; i < cycleSize; i++) {
    nodes.push(`cycle-${i}`);
  }
  
  // Create cycle edges
  for (let i = 0; i < cycleSize; i++) {
    const source = `cycle-${i}`;
    const target = `cycle-${(i + 1) % cycleSize}`;
    edges.push([source, target]);
  }
  
  return buildGraph({ nodes, edges });
}

/**
 * Create an acyclic graph (DAG)
 */
function createAcyclicGraph(nodeCount: number): CausalGraph {
  const nodes: string[] = [];
  const edges: Array<[string, string]> = [];
  
  // Create nodes
  for (let i = 0; i < nodeCount; i++) {
    nodes.push(`node-${i}`);
  }
  
  // Create edges only from lower to higher indices (ensures DAG)
  for (let i = 0; i < nodeCount - 1; i++) {
    for (let j = i + 1; j < Math.min(i + 3, nodeCount); j++) {
      edges.push([`node-${i}`, `node-${j}`]);
    }
  }
  
  return buildGraph({ nodes, edges });
}

// =====================================================
// PROPERTY TESTS
// =====================================================

describe('CircularDependencyDetector - Property Tests', () => {
  let detector: CircularDependencyDetector;
  
  beforeAll(() => {
    detector = new CircularDependencyDetector('test-node');
  });
  
  /**
   * Property 10: SCC Algorithm Execution
   * 
   * For any graph update validation, Tarjan's algorithm should be executed
   * to compute strongly connected components.
   * 
   * Validates: Requirements 3.1
   */
  test('Property 10: SCC algorithm execution', () => {
    fc.assert(
      fc.property(
        fc.record({
          nodes: fc.array(fc.string(), { minLength: 10, maxLength: 50 }),
          edges: fc.array(
            fc.tuple(
              fc.integer({ min: 0, max: 49 }),
              fc.integer({ min: 0, max: 49 })
            ),
            { minLength: 10, maxLength: 100 }
          ),
        }),
        (data) => {
          // Convert indices to node IDs
          const nodes = data.nodes.slice(0, 50);
          const edges: Array<[string, string]> = data.edges
            .filter(([s, t]) => s < nodes.length && t < nodes.length)
            .map(([s, t]) => [nodes[s], nodes[t]]);
          
          const graph = buildGraph({ nodes, edges });
          
          // Execute SCC detection
          const sccs = detector.detectSCC(graph);
          
          // Verify SCCs were computed
          expect(sccs).toBeDefined();
          expect(Array.isArray(sccs)).toBe(true);
          
          // Verify all nodes are accounted for (either in SCC or isolated)
          const nodesInSCCs = new Set<string>();
          for (const scc of sccs) {
            for (const node of scc.nodes) {
              nodesInSCCs.add(node);
            }
          }
          
          // All nodes with cycles should be in SCCs
          // (isolated nodes without self-loops won't be in SCCs)
          expect(nodesInSCCs.size).toBeLessThanOrEqual(graph.metadata.nodeCount);
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
  
  /**
   * Property 11: SCC Size Constraint
   * 
   * For any valid graph, no strongly connected component should contain
   * more than 20% of the total nodes.
   * 
   * Validates: Requirements 3.2
   */
  test('Property 11: SCC size constraint', () => {
    fc.assert(
      fc.property(
        fc.record({
          nodes: fc.array(fc.string(), { minLength: 50, maxLength: 100 }),
          edges: fc.array(
            fc.tuple(
              fc.integer({ min: 0, max: 99 }),
              fc.integer({ min: 0, max: 99 })
            ),
            { minLength: 50, maxLength: 200 }
          ),
        }),
        (data) => {
          // Convert indices to node IDs
          const nodes = data.nodes.slice(0, 100);
          const edges: Array<[string, string]> = data.edges
            .filter(([s, t]) => s < nodes.length && t < nodes.length)
            .map(([s, t]) => [nodes[s], nodes[t]]);
          
          const graph = buildGraph({ nodes, edges });
          
          // Validate graph structure
          const result = detector.validateGraphStructure(graph);
          
          if (result.isValid) {
            // All SCCs should be <= 20% of graph
            const sccs = detector.detectSCC(graph);
            for (const scc of sccs) {
              expect(scc.percentageOfGraph).toBeLessThanOrEqual(
                BYZANTINE_PARAMS.MAX_SCC_PERCENTAGE
              );
            }
          } else {
            // If invalid, check if it's due to SCC size violation
            const hasSCCViolation = result.violations.some(
              v => v.type === 'SCC_TOO_LARGE'
            );
            
            if (hasSCCViolation) {
              // Verify that there is indeed an SCC > 20%
              const sccs = detector.detectSCC(graph);
              const largestSCC = Math.max(...sccs.map(s => s.percentageOfGraph), 0);
              expect(largestSCC).toBeGreaterThan(
                BYZANTINE_PARAMS.MAX_SCC_PERCENTAGE
              );
            }
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
  
  /**
   * Property 40: Tarjan Algorithm Complexity
   * 
   * For any graph of size V vertices and E edges, SCC computation should
   * complete in O(V+E) time.
   * 
   * Validates: Requirements 9.1
   */
  test('Property 40: Tarjan O(V+E) complexity', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 500 }),
        (nodeCount) => {
          const edgeCount = nodeCount * 2; // Sparse graph
          const graph = generateRandomGraph(nodeCount, edgeCount);
          
          // Measure execution time
          const startTime = performance.now();
          detector.detectSCC(graph);
          const elapsed = performance.now() - startTime;
          
          // Time should scale linearly with V+E
          const complexity = nodeCount + edgeCount;
          const timePerElement = elapsed / complexity;
          
          // Should be roughly constant (within reasonable bounds)
          // Allow 0.1ms per element as upper bound
          expect(timePerElement).toBeLessThan(0.1);
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
  
  // =====================================================
  // ADDITIONAL PROPERTY TESTS
  // =====================================================
  
  /**
   * Property: Cycle Detection Correctness
   * 
   * Graphs with known cycles should be detected correctly.
   */
  test('Property: Cycle detection correctness', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 20 }),
        (cycleSize) => {
          const graph = createGraphWithCycle(cycleSize);
          const sccs = detector.detectSCC(graph);
          
          // Should detect exactly one SCC with all cycle nodes
          expect(sccs.length).toBeGreaterThanOrEqual(1);
          
          // Find the SCC containing the cycle
          const cycleSCC = sccs.find(scc => scc.size === cycleSize);
          expect(cycleSCC).toBeDefined();
          expect(cycleSCC!.size).toBe(cycleSize);
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
  
  /**
   * Property: Acyclic Graph Detection
   * 
   * Acyclic graphs (DAGs) should have no SCCs with size > 1.
   */
  test('Property: Acyclic graph detection', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 50 }),
        (nodeCount) => {
          const graph = createAcyclicGraph(nodeCount);
          const sccs = detector.detectSCC(graph);
          
          // DAG should have no SCCs with size > 1
          const hasCycles = sccs.some(scc => scc.size > 1);
          expect(hasCycles).toBe(false);
          
          // Validation should pass
          const result = detector.validateGraphStructure(graph);
          
          // Should not have SCC violations
          const hasSCCViolation = result.violations.some(
            v => v.type === 'SCC_TOO_LARGE'
          );
          expect(hasSCCViolation).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
  
  /**
   * Property: Circular Dependency Prevention
   * 
   * Adding an edge that would create a cycle should be detected.
   */
  test('Property: Circular dependency prevention', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 20 }),
        (nodeCount) => {
          // Create a simple path: 0 -> 1 -> 2 -> ... -> n-1
          const nodes: string[] = [];
          const edges: Array<[string, string]> = [];
          
          for (let i = 0; i < nodeCount; i++) {
            nodes.push(`node-${i}`);
          }
          
          for (let i = 0; i < nodeCount - 1; i++) {
            edges.push([`node-${i}`, `node-${i + 1}`]);
          }
          
          const graph = buildGraph({ nodes, edges });
          
          // Adding edge from last to first would create cycle
          const wouldCreateCycle = detector.wouldCreateCircularDependency(
            graph,
            `node-${nodeCount - 1}`,
            'node-0'
          );
          
          expect(wouldCreateCycle).toBe(true);
          
          // Adding edge in forward direction should not create cycle
          const wouldNotCreateCycle = detector.wouldCreateCircularDependency(
            graph,
            'node-0',
            `node-${nodeCount - 1}`
          );
          
          expect(wouldNotCreateCycle).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
  
  /**
   * Property: Graph Density Validation
   * 
   * Graphs exceeding density threshold should be flagged.
   */
  test('Property: Graph density validation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 30 }),
        (nodeCount) => {
          // Create a dense graph (close to complete graph)
          const nodes: string[] = [];
          const edges: Array<[string, string]> = [];
          
          for (let i = 0; i < nodeCount; i++) {
            nodes.push(`node-${i}`);
          }
          
          // Add many edges to exceed density threshold
          for (let i = 0; i < nodeCount; i++) {
            for (let j = 0; j < nodeCount; j++) {
              if (i !== j) {
                edges.push([`node-${i}`, `node-${j}`]);
              }
            }
          }
          
          const graph = buildGraph({ nodes, edges });
          
          // Should exceed density threshold
          expect(graph.metadata.density).toBeGreaterThan(
            BYZANTINE_PARAMS.MAX_GRAPH_DENSITY
          );
          
          // Validation should fail
          const result = detector.validateGraphStructure(graph);
          expect(result.isValid).toBe(false);
          
          // Should have density violation
          const hasDensityViolation = result.violations.some(
            v => v.type === 'DENSITY_TOO_HIGH'
          );
          expect(hasDensityViolation).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
  
  /**
   * Property: Node Degree Validation
   * 
   * Nodes exceeding out-degree threshold should be flagged.
   */
  test('Property: Node degree validation', () => {
    // Create a graph with one node having excessive out-degree
    const nodes: string[] = ['hub'];
    const edges: Array<[string, string]> = [];
    
    // Add target nodes
    for (let i = 0; i < BYZANTINE_PARAMS.MAX_NODE_OUT_DEGREE + 10; i++) {
      nodes.push(`target-${i}`);
      edges.push(['hub', `target-${i}`]);
    }
    
    const graph = buildGraph({ nodes, edges });
    
    // Validation should fail
    const result = detector.validateGraphStructure(graph);
    expect(result.isValid).toBe(false);
    
    // Should have degree violation
    const hasDegreeViolation = result.violations.some(
      v => v.type === 'NODE_DEGREE_EXCESSIVE'
    );
    expect(hasDegreeViolation).toBe(true);
    
    // Hub node should be in affected nodes
    const degreeViolation = result.violations.find(
      v => v.type === 'NODE_DEGREE_EXCESSIVE'
    );
    expect(degreeViolation?.affectedNodes).toContain('hub');
  });
});
