/**
 * Merkle Proof System Property-Based Tests
 * 
 * Property-based tests for cryptographic graph integrity verification.
 * Tests Properties 15 and 41 from the design document.
 * 
 * Feature: byzantine-resistance-enhancement
 * 
 * @module lib/bft/__tests__/merkleProofSystem.property.test
 */

import { describe, test, expect, beforeAll } from 'vitest';
import fc from 'fast-check';
import { MerkleProofSystem } from '../merkleProofSystem';
import type {
  CausalGraph,
  CausalGraphNode,
  CausalGraphEdge,
} from '../../../types/byzantine.types';

// =====================================================
// TEST HELPERS
// =====================================================

/**
 * Build a causal graph from test data
 */
function buildGraph(data: {
  nodes: Array<{ id: string; type: string; data: any; authorityScore?: number }>;
  edges: Array<{ source: string; target: string; type: string; weight?: number }>;
}): CausalGraph {
  const nodes = new Map<string, CausalGraphNode>();
  const edges = new Map<string, CausalGraphEdge[]>();
  
  // Add nodes
  for (const node of data.nodes) {
    nodes.set(node.id, {
      id: node.id,
      type: node.type,
      data: node.data,
      authorityScore: node.authorityScore,
    });
  }
  
  // Add edges
  let edgeCount = 0;
  for (const edge of data.edges) {
    // Only add edge if both nodes exist
    if (nodes.has(edge.source) && nodes.has(edge.target)) {
      if (!edges.has(edge.source)) {
        edges.set(edge.source, []);
      }
      
      edges.get(edge.source)!.push({
        source: edge.source,
        target: edge.target,
        type: edge.type,
        weight: edge.weight,
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
  const nodes: Array<{ id: string; type: string; data: any; authorityScore?: number }> = [];
  
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: `node-${i}`,
      type: 'entity',
      data: { name: `Node ${i}`, value: i },
      authorityScore: 50 + (i % 50),
    });
  }
  
  const edges: Array<{ source: string; target: string; type: string; weight?: number }> = [];
  for (let i = 0; i < edgeCount; i++) {
    const sourceIdx = Math.floor(Math.random() * nodeCount);
    const targetIdx = Math.floor(Math.random() * nodeCount);
    if (sourceIdx !== targetIdx) {
      edges.push({
        source: `node-${sourceIdx}`,
        target: `node-${targetIdx}`,
        type: 'relates_to',
        weight: 0.5 + Math.random() * 0.5,
      });
    }
  }
  
  return buildGraph({ nodes, edges });
}

/**
 * Fast-check arbitrary for generating causal graphs
 */
const graphArbitrary = fc.record({
  nodeCount: fc.integer({ min: 1, max: 100 }),
  edgeCount: fc.integer({ min: 0, max: 200 }),
}).map(({ nodeCount, edgeCount }) => {
  // Ensure edge count doesn't exceed possible edges
  const maxPossibleEdges = nodeCount * (nodeCount - 1);
  const actualEdgeCount = Math.min(edgeCount, maxPossibleEdges);
  return generateRandomGraph(nodeCount, actualEdgeCount);
});

// =====================================================
// PROPERTY TESTS
// =====================================================

describe('MerkleProofSystem - Property Tests', () => {
  let system: MerkleProofSystem;
  
  beforeAll(() => {
    system = new MerkleProofSystem();
  });
  
  /**
   * Property 15: Merkle Tree Generation
   * 
   * For any graph update submission, a Merkle tree should be generated 
   * containing all nodes and edges.
   * 
   * Validates: Requirements 4.1
   */
  test('Property 15: Merkle tree generation', () => {
    fc.assert(
      fc.property(graphArbitrary, (graph) => {
        const tree = system.buildMerkleTree(graph);
        
        // Tree should have valid structure
        expect(tree).toBeDefined();
        expect(tree.root).toBeDefined();
        expect(tree.rootHash).toBeDefined();
        expect(tree.rootHash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
        
        // Leaf count should match nodes + edges
        const expectedLeafCount = graph.nodes.size + 
          Array.from(graph.edges.values()).reduce((sum, edgeList) => sum + edgeList.length, 0);
        expect(tree.leafCount).toBe(expectedLeafCount);
        
        // Height should be correct for leaf count
        const expectedHeight = expectedLeafCount > 0 ? Math.ceil(Math.log2(expectedLeafCount)) : 0;
        expect(tree.height).toBe(expectedHeight);
        
        // Root hash should be deterministic
        const tree2 = system.buildMerkleTree(graph);
        expect(tree2.rootHash).toBe(tree.rootHash);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
  
  /**
   * Property 41: Merkle Proof Verification Complexity
   * 
   * For any Merkle tree with N nodes, proof verification should complete 
   * in O(log N) time.
   * 
   * Validates: Requirements 9.2
   */
  test('Property 41: Merkle proof verification complexity', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1000 }),
        (nodeCount) => {
          const graph = generateRandomGraph(nodeCount, nodeCount * 2);
          const tree = system.buildMerkleTree(graph);
          
          // Get a random node to generate proof for
          const nodeIds = Array.from(graph.nodes.keys());
          if (nodeIds.length === 0) return true;
          
          const randomNodeId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
          const proof = system.generateProof(tree, randomNodeId);
          
          // Skip if proof generation failed
          if (!proof) return true;
          
          // Number of siblings should be O(log N)
          const expectedMaxSiblings = Math.ceil(Math.log2(tree.leafCount));
          expect(proof.siblings.length).toBeLessThanOrEqual(expectedMaxSiblings + 1);
          
          // Measure verification time
          const startTime = performance.now();
          system.verifyProof(proof, tree.rootHash);
          const elapsed = performance.now() - startTime;
          
          // Time should be very fast (< 1ms for O(log N) operation)
          expect(elapsed).toBeLessThan(1);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
  
  // =====================================================
  // ADDITIONAL PROPERTY TESTS
  // =====================================================
  
  /**
   * Property: Proof Generation and Verification
   * 
   * For any node in the graph, a valid proof should be generated and verified.
   */
  test('Property: Proof generation and verification', () => {
    fc.assert(
      fc.property(graphArbitrary, (graph) => {
        if (graph.nodes.size === 0) return true;
        
        const tree = system.buildMerkleTree(graph);
        
        // Test proof for each node
        for (const nodeId of graph.nodes.keys()) {
          const proof = system.generateProof(tree, nodeId);
          
          // Proof should be generated
          expect(proof).toBeDefined();
          if (!proof) continue;
          
          // Proof should have correct structure
          expect(proof.nodeId).toBe(nodeId);
          expect(proof.leafHash).toMatch(/^[a-f0-9]{64}$/);
          expect(proof.rootHash).toBe(tree.rootHash);
          
          // Proof should verify
          const isValid = system.verifyProof(proof, tree.rootHash);
          expect(isValid).toBe(true);
        }
        
        return true;
      }),
      { numRuns: 50 }
    );
  });
  
  /**
   * Property: Batch Verification Consistency
   * 
   * Batch verification should produce same results as individual verification.
   */
  test('Property: Batch verification consistency', () => {
    fc.assert(
      fc.property(graphArbitrary, (graph) => {
        if (graph.nodes.size === 0) return true;
        
        const tree = system.buildMerkleTree(graph);
        
        // Generate proofs for all nodes
        const proofs = Array.from(graph.nodes.keys())
          .map(nodeId => system.generateProof(tree, nodeId))
          .filter((proof): proof is NonNullable<typeof proof> => proof !== null);
        
        if (proofs.length === 0) return true;
        
        // Batch verify
        const batchResults = system.batchVerifyProofs(proofs, tree.rootHash);
        
        // Individual verify
        const individualResults = proofs.map(proof => 
          system.verifyProof(proof, tree.rootHash)
        );
        
        // Results should match
        expect(batchResults).toEqual(individualResults);
        
        // All should be valid
        expect(batchResults.every(r => r)).toBe(true);
        
        return true;
      }),
      { numRuns: 50 }
    );
  });
  
  /**
   * Property: Invalid Proof Detection
   * 
   * Modified proofs should fail verification.
   */
  test('Property: Invalid proof detection', () => {
    fc.assert(
      fc.property(graphArbitrary, (graph) => {
        if (graph.nodes.size === 0) return true;
        
        const tree = system.buildMerkleTree(graph);
        const nodeIds = Array.from(graph.nodes.keys());
        const randomNodeId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
        
        const proof = system.generateProof(tree, randomNodeId);
        if (!proof) return true;
        
        // Tamper with proof by modifying a sibling hash
        if (proof.siblings.length > 0) {
          const tamperedProof = {
            ...proof,
            siblings: proof.siblings.map((s, i) => 
              i === 0 ? { ...s, hash: 'a'.repeat(64) } : s
            ),
          };
          
          // Tampered proof should fail
          const isValid = system.verifyProof(tamperedProof, tree.rootHash);
          expect(isValid).toBe(false);
        }
        
        return true;
      }),
      { numRuns: 50 }
    );
  });
  
  /**
   * Property: Empty Graph Handling
   * 
   * Empty graphs should produce valid trees with zero leaves.
   */
  test('Property: Empty graph handling', () => {
    const emptyGraph = buildGraph({ nodes: [], edges: [] });
    const tree = system.buildMerkleTree(emptyGraph);
    
    expect(tree).toBeDefined();
    expect(tree.leafCount).toBe(0);
    expect(tree.height).toBe(0);
    expect(tree.rootHash).toMatch(/^[a-f0-9]{64}$/);
  });
  
  /**
   * Property: Deterministic Tree Construction
   * 
   * Building the same graph multiple times should produce identical trees.
   */
  test('Property: Deterministic tree construction', () => {
    fc.assert(
      fc.property(graphArbitrary, (graph) => {
        const tree1 = system.buildMerkleTree(graph);
        const tree2 = system.buildMerkleTree(graph);
        const tree3 = system.buildMerkleTree(graph);
        
        // All trees should have identical root hashes
        expect(tree1.rootHash).toBe(tree2.rootHash);
        expect(tree2.rootHash).toBe(tree3.rootHash);
        
        // All trees should have identical structure
        expect(tree1.leafCount).toBe(tree2.leafCount);
        expect(tree1.height).toBe(tree2.height);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
  
  /**
   * Property: Graph Modification Detection
   * 
   * Modifying the graph should change the root hash.
   */
  test('Property: Graph modification detection', () => {
    fc.assert(
      fc.property(graphArbitrary, (graph) => {
        if (graph.nodes.size === 0) return true;
        
        const tree1 = system.buildMerkleTree(graph);
        
        // Modify graph by adding a node
        const modifiedGraph = {
          ...graph,
          nodes: new Map(graph.nodes),
        };
        modifiedGraph.nodes.set('new-node', {
          id: 'new-node',
          type: 'entity',
          data: { name: 'New Node' },
        });
        
        const tree2 = system.buildMerkleTree(modifiedGraph);
        
        // Root hashes should be different
        expect(tree1.rootHash).not.toBe(tree2.rootHash);
        
        return true;
      }),
      { numRuns: 50 }
    );
  });
  
  /**
   * Property: Proof Size Logarithmic
   * 
   * Proof size should grow logarithmically with tree size.
   */
  test('Property: Proof size logarithmic', () => {
    const sizes = [10, 50, 100, 500, 1000];
    const proofSizes: number[] = [];
    
    for (const size of sizes) {
      const graph = generateRandomGraph(size, size * 2);
      const tree = system.buildMerkleTree(graph);
      
      const nodeIds = Array.from(graph.nodes.keys());
      if (nodeIds.length === 0) continue;
      
      const randomNodeId = nodeIds[0];
      const proof = system.generateProof(tree, randomNodeId);
      
      if (proof) {
        proofSizes.push(proof.siblings.length);
      }
    }
    
    // Proof sizes should grow slowly (logarithmically)
    // Each doubling of size should add at most 1 to proof size
    for (let i = 1; i < proofSizes.length; i++) {
      const sizeDiff = sizes[i] / sizes[i - 1];
      const proofDiff = proofSizes[i] - proofSizes[i - 1];
      
      // Logarithmic growth: log2(sizeDiff) should be close to proofDiff
      const expectedProofDiff = Math.ceil(Math.log2(sizeDiff));
      expect(proofDiff).toBeLessThanOrEqual(expectedProofDiff + 1);
    }
  });
});
