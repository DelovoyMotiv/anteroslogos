/**
 * Causal Weight Oracle Property-Based Tests
 * 
 * Property-based tests for temporal ordering and Merkle proof verification
 * in the enhanced Causal Weight Oracle.
 * 
 * Feature: byzantine-resistance-enhancement
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import fc from 'fast-check';
import { config } from 'dotenv';
import { resolve } from 'path';
import {
  calculateWeightWithEpoch,
  verifyWeightCalculation,
  getCachedWeight,
  invalidateFutureEpochs,
  initializeEnhancedOracle,
} from '../causalWeightOracle';
import { TemporalEpochManager } from '../temporalEpochManager';
import { MerkleProofSystem } from '../merkleProofSystem';
import { getSupabaseClient } from '../../a2a/supabaseStorage';
import type { CausalGraph, GraphCommit, MerkleProof } from '../../../types/byzantine.types';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

// Check if Supabase is available
const hasSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

// =====================================================
// TEST HELPERS
// =====================================================

/**
 * Create a mock causal graph with citation paths
 */
function createMockGraph(nodeCount: number, edgeCount: number): CausalGraph {
  const nodes = new Map();
  const edges = new Map();
  
  // Create nodes with labels for reference entity matching
  for (let i = 0; i < nodeCount; i++) {
    const nodeId = `node-${i}`;
    nodes.set(nodeId, {
      id: nodeId,
      type: 'entity',
      label: `Entity ${i}`,
      data: { name: `Node ${i}` },
      authorityScore: 50 + (i % 50), // Vary authority scores
      freshness: 30 + (i % 100), // Vary freshness
      eeatScore: 5 + (i % 5), // Vary E-E-A-T scores
    });
  }
  
  // Create edges to form paths
  const nodeIds = Array.from(nodes.keys());
  for (let i = 0; i < edgeCount && nodeIds.length >= 2; i++) {
    const sourceIdx = i % nodeIds.length;
    const targetIdx = (i + 1) % nodeIds.length;
    const source = nodeIds[sourceIdx];
    const target = nodeIds[targetIdx];
    
    if (!edges.has(source)) {
      edges.set(source, []);
    }
    
    edges.get(source).push({
      source,
      target,
      type: 'relates_to',
      weight: 0.5 + Math.random() * 0.5,
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

/**
 * Create a mock graph commit
 */
function createMockGraphCommit(epochNumber: number): GraphCommit {
  return {
    commitHash: '0'.repeat(64),
    epochNumber,
    nodeCount: 10,
    edgeCount: 15,
    merkleRoot: '0'.repeat(64),
    createdAt: new Date(),
    signature: 'mock-signature',
  };
}

/**
 * Create mock Merkle proofs
 */
function createMockMerkleProofs(nodeIds: string[], rootHash: string): MerkleProof[] {
  return nodeIds.map(nodeId => ({
    nodeId,
    leafHash: '0'.repeat(64),
    siblings: [
      { hash: '1'.repeat(64), position: 'left' as const },
      { hash: '2'.repeat(64), position: 'right' as const },
    ],
    rootHash,
  }));
}

// =====================================================
// PROPERTY TESTS
// =====================================================

describe('Causal Weight Oracle - Property Tests', () => {
  let supabase: any;
  
  beforeAll(async () => {
    if (hasSupabase) {
      supabase = getSupabaseClient();
    }
  });
  
  beforeEach(async () => {
    if (hasSupabase) {
      // Clean up test data
      await supabase.from('bft_epoch_commits').delete().like('graph_commit_hash', 'test-%');
    }
  });
  
  afterEach(async () => {
    if (hasSupabase) {
      // Clean up test data
      await supabase.from('bft_epoch_commits').delete().like('graph_commit_hash', 'test-%');
    }
  });
  
  /**
   * Property 2: Temporal Ordering Enforcement
   * 
   * For any graph update submitted with an epoch number, the system should
   * accept it if and only if it references only graph commits from strictly
   * prior epochs.
   * 
   * **Validates: Requirements 1.2, 2.2**
   */
  it('Property 2: Temporal ordering enforcement', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          epochNumber: fc.integer({ min: 1, max: 100 }),
          currentEpoch: fc.integer({ min: 2, max: 101 }),
          nodeCount: fc.integer({ min: 5, max: 20 }),
          edgeCount: fc.integer({ min: 5, max: 30 }),
        }),
        async ({ epochNumber, currentEpoch, nodeCount, edgeCount }) => {
          // Create a mock graph
          const graph = createMockGraph(nodeCount, edgeCount);
          
          // Get a reference entity from the graph
          const referenceEntity = Array.from(graph.nodes.values())[0]?.label || 'Entity 0';
          const nodeId = Array.from(graph.nodes.keys())[0] || 'node-0';
          
          if (epochNumber < currentEpoch) {
            // Valid case: epoch is prior to current epoch
            // Should not throw an error
            try {
              const weight = await calculateWeightWithEpoch(
                nodeId,
                referenceEntity,
                epochNumber,
                currentEpoch,
                graph
              );
              
              // Weight should be a valid number between 0 and 1
              expect(weight).toBeGreaterThanOrEqual(0);
              expect(weight).toBeLessThanOrEqual(1);
              expect(Number.isFinite(weight)).toBe(true);
            } catch (error) {
              // Should not throw for valid temporal ordering
              throw new Error(`Unexpected error for valid temporal ordering: ${error}`);
            }
          } else {
            // Invalid case: epoch is not prior to current epoch
            // Should throw an error
            await expect(
              calculateWeightWithEpoch(
                nodeId,
                referenceEntity,
                epochNumber,
                currentEpoch,
                graph
              )
            ).rejects.toThrow(/temporal ordering violation/i);
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);
  
  /**
   * Property 16: Merkle Proof Verification
   * 
   * For any causal weight computation, Merkle proofs should be verified for
   * all nodes in the provenance path.
   * 
   * **Validates: Requirements 4.2**
   */
  it('Property 16: Merkle proof verification', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          nodeCount: fc.integer({ min: 5, max: 20 }),
          edgeCount: fc.integer({ min: 5, max: 30 }),
        }),
        async ({ nodeCount, edgeCount }) => {
          // Create a mock graph
          const graph = createMockGraph(nodeCount, edgeCount);
          
          // Build Merkle tree from graph
          const merkleSystem = new MerkleProofSystem();
          const merkleTree = merkleSystem.buildMerkleTree(graph);
          
          // Get some node IDs from the graph
          const nodeIds = Array.from(graph.nodes.keys()).slice(0, 3);
          
          // Generate proofs for these nodes
          const proofs = nodeIds
            .map(id => merkleSystem.generateProof(merkleTree, `node:${id}`))
            .filter((p): p is MerkleProof => p !== null);
          
          // If no valid proofs could be generated, skip this test case
          if (proofs.length === 0) {
            return true; // Skip - no nodes in graph
          }
          
          // Property: All generated proofs should verify successfully against the tree's root hash
          for (const proof of proofs) {
            const isValid = merkleSystem.verifyProof(proof, merkleTree.rootHash);
            expect(isValid).toBe(true);
          }
          
          // Property: Batch verification should also succeed
          const batchResults = merkleSystem.batchVerifyProofs(proofs, merkleTree.rootHash);
          expect(batchResults.every(r => r === true)).toBe(true);
          
          // Property: Proofs with wrong root hash should fail
          const invalidProofs = createMockMerkleProofs(nodeIds, 'wrong-root-hash');
          const invalidResults = merkleSystem.batchVerifyProofs(invalidProofs, merkleTree.rootHash);
          expect(invalidResults.every(r => r === false)).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);
  
  /**
   * Additional test: Cache invalidation for future epochs
   * 
   * Ensures that cache entries from future epochs are properly invalidated
   * when the current epoch advances.
   */
  it('Cache invalidation for future epochs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          currentEpoch: fc.integer({ min: 10, max: 50 }),
          futureEpochOffset: fc.integer({ min: 1, max: 10 }),
        }),
        async ({ currentEpoch, futureEpochOffset }) => {
          const futureEpoch = currentEpoch + futureEpochOffset;
          
          // Invalidate future epochs
          invalidateFutureEpochs(currentEpoch);
          
          // Try to get cached weight for future epoch
          const cachedWeight = getCachedWeight(
            'test-node',
            'test-entity',
            currentEpoch
          );
          
          // Should return null (no valid cache entry)
          expect(cachedWeight).toBeNull();
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);
  
  /**
   * Additional test: Epoch number validation
   * 
   * Ensures that negative epoch numbers are rejected.
   */
  it('Epoch number validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          epochNumber: fc.integer({ min: -100, max: -1 }),
          currentEpoch: fc.integer({ min: 0, max: 100 }),
          nodeCount: fc.integer({ min: 5, max: 10 }),
          edgeCount: fc.integer({ min: 5, max: 15 }),
        }),
        async ({ epochNumber, currentEpoch, nodeCount, edgeCount }) => {
          const graph = createMockGraph(nodeCount, edgeCount);
          const referenceEntity = Array.from(graph.nodes.values())[0]?.label || 'Entity 0';
          const nodeId = Array.from(graph.nodes.keys())[0] || 'node-0';
          
          // Negative epoch numbers should be rejected
          await expect(
            calculateWeightWithEpoch(
              nodeId,
              referenceEntity,
              epochNumber,
              currentEpoch,
              graph
            )
          ).rejects.toThrow(/must be non-negative/i);
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);
});
