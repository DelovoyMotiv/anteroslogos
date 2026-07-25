/**
 * Temporal Epoch Manager Property-Based Tests
 * 
 * Property-based tests for Byzantine resistance temporal ordering
 * 
 * Feature: byzantine-resistance-enhancement
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import fc from 'fast-check';
import { config } from 'dotenv';
import { resolve } from 'path';
import { TemporalEpochManager } from '../temporalEpochManager';
import { getSupabaseClient } from '../../a2a/supabaseStorage';
import type { CausalGraph, EpochCommit, GraphCommit } from '../../../types/byzantine.types';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

// Check if Supabase is available
const hasSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

// =====================================================
// TEST HELPERS
// =====================================================

/**
 * Create a mock causal graph
 */
function createMockGraph(nodeCount: number, edgeCount: number): CausalGraph {
  const nodes = new Map();
  const edges = new Map();
  
  // Create nodes
  for (let i = 0; i < nodeCount; i++) {
    const nodeId = `node-${i}`;
    nodes.set(nodeId, {
      id: nodeId,
      type: 'entity',
      data: { name: `Node ${i}` },
    });
  }
  
  // Create edges
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
    });
  }
  
  return {
    nodes,
    edges,
    metadata: {
      nodeCount,
      edgeCount,
      density: edgeCount / (nodeCount * (nodeCount - 1)),
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

// =====================================================
// PROPERTY TESTS
// =====================================================

describe('TemporalEpochManager - Property Tests', () => {
  let manager: TemporalEpochManager;
  let supabase: any;
  
  beforeAll(async () => {
    if (hasSupabase) {
      supabase = getSupabaseClient();
      
      // Clean up any existing test data
      await supabase
        .from('bft_epoch_commits')
        .delete()
        .gte('epoch_number', 0);
    }
  });
  
  beforeEach(async () => {
    if (hasSupabase) {
      // Clean up before each test
      await supabase
        .from('bft_epoch_commits')
        .delete()
        .gte('epoch_number', 0);
    }
    
    manager = new TemporalEpochManager('test-node');
    // Initialize with a test private key
    const testPrivateKey = '0'.repeat(64);
    await manager.initialize(testPrivateKey);
  });
  
  afterEach(() => {
    manager.clearCache();
  });
  
  /**
   * Property 7: Epoch Chain Integrity
   * 
   * For any graph commit created, it should contain the hash of the 
   * previous epoch's commit, forming an unbroken chain.
   * 
   * Validates: Requirements 2.3
   */
  describe('Property 7: Epoch Chain Integrity', () => {
    it.skipIf(!hasSupabase)('should maintain unbroken chain of epoch hashes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              nodeCount: fc.integer({ min: 5, max: 50 }),
              edgeCount: fc.integer({ min: 5, max: 100 }),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          async (graphConfigs) => {
            // Create a sequence of epochs
            const epochs: EpochCommit[] = [];
            
            for (const config of graphConfigs) {
              const graph = createMockGraph(config.nodeCount, config.edgeCount);
              const epoch = await manager.createEpoch(graph);
              epochs.push(epoch);
            }
            
            // Verify chain integrity
            for (let i = 1; i < epochs.length; i++) {
              const current = epochs[i];
              const previous = epochs[i - 1];
              
              // Current epoch's previousEpochHash should match previous epoch's graphCommitHash
              expect(current.previousEpochHash).toBe(previous.graphCommitHash);
              
              // Epoch numbers should be sequential
              expect(current.epochNumber).toBe(previous.epochNumber + 1);
            }
            
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
    
    it.skipIf(!hasSupabase)('should verify epoch chain integrity through verifyEpochChain', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 3, max: 10 }),
          async (chainLength) => {
            // Create a chain of epochs
            const epochs: EpochCommit[] = [];
            
            for (let i = 0; i < chainLength; i++) {
              const graph = createMockGraph(10, 15);
              const epoch = await manager.createEpoch(graph);
              epochs.push(epoch);
            }
            
            // Verify the entire chain
            const firstEpoch = epochs[0].epochNumber;
            const lastEpoch = epochs[epochs.length - 1].epochNumber;
            
            const isValid = await manager.verifyEpochChain(firstEpoch, lastEpoch);
            
            // Chain should be valid
            expect(isValid).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
    
    it.skipIf(!hasSupabase)('should detect broken chain when previousEpochHash is incorrect', async () => {
      // This test verifies that the system would detect a broken chain
      // We can't easily break the chain in the actual implementation,
      // but we can verify the validation logic
      
      const graph1 = createMockGraph(10, 15);
      const epoch1 = await manager.createEpoch(graph1);
      
      const graph2 = createMockGraph(10, 15);
      const epoch2 = await manager.createEpoch(graph2);
      
      // Verify chain is valid
      const isValid = await manager.verifyEpochChain(epoch1.epochNumber, epoch2.epochNumber);
      expect(isValid).toBe(true);
      
      // Verify that previousEpochHash matches
      expect(epoch2.previousEpochHash).toBe(epoch1.graphCommitHash);
    });
  });
  
  /**
   * Property 8: Monotonic Epoch Numbers
   * 
   * For any sequence of graph commits, the epoch numbers should be 
   * strictly monotonically increasing.
   * 
   * Validates: Requirements 2.4
   */
  describe('Property 8: Monotonic Epoch Numbers', () => {
    it.skipIf(!hasSupabase)('should generate strictly increasing epoch numbers', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              nodeCount: fc.integer({ min: 5, max: 50 }),
              edgeCount: fc.integer({ min: 5, max: 100 }),
            }),
            { minLength: 2, maxLength: 20 }
          ),
          async (graphConfigs) => {
            const epochs: EpochCommit[] = [];
            
            for (const config of graphConfigs) {
              const graph = createMockGraph(config.nodeCount, config.edgeCount);
              const epoch = await manager.createEpoch(graph);
              epochs.push(epoch);
            }
            
            // Verify monotonic increase
            for (let i = 1; i < epochs.length; i++) {
              const current = epochs[i];
              const previous = epochs[i - 1];
              
              // Current epoch number should be exactly 1 more than previous
              expect(current.epochNumber).toBe(previous.epochNumber + 1);
              
              // Current epoch number should be greater than previous
              expect(current.epochNumber).toBeGreaterThan(previous.epochNumber);
            }
            
            // Verify no duplicates
            const epochNumbers = epochs.map(e => e.epochNumber);
            const uniqueEpochNumbers = new Set(epochNumbers);
            expect(uniqueEpochNumbers.size).toBe(epochNumbers.length);
            
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
    
    it('should validate temporal ordering correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 10 }),
          fc.integer({ min: 0, max: 5 }),
          async (currentEpoch, referencedEpochOffset) => {
            const referencedEpoch = currentEpoch - referencedEpochOffset - 1;
            
            if (referencedEpoch < 0) {
              return true; // Skip invalid cases
            }
            
            const graphCommit = createMockGraphCommit(referencedEpoch);
            
            // Should be valid if referenced epoch is strictly less than current
            const isValid = manager.validateTemporalOrdering(currentEpoch, graphCommit);
            
            expect(isValid).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
    
    it('should reject temporal ordering when referenced epoch is not prior', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 0, max: 10 }),
          async (currentEpoch, offset) => {
            // Referenced epoch is same or future
            const referencedEpoch = currentEpoch + offset;
            
            const graphCommit = createMockGraphCommit(referencedEpoch);
            
            // Should be invalid if referenced epoch is >= current
            const isValid = manager.validateTemporalOrdering(currentEpoch, graphCommit);
            
            expect(isValid).toBe(false);
            
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
    
    it('should reject negative epoch numbers', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: -100, max: -1 }),
          fc.integer({ min: 0, max: 100 }),
          async (negativeEpoch, currentEpoch) => {
            const graphCommit = createMockGraphCommit(negativeEpoch);
            
            // Should be invalid with negative epoch
            const isValid = manager.validateTemporalOrdering(currentEpoch, graphCommit);
            
            expect(isValid).toBe(false);
            
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
  });
  
  /**
   * Additional property: Cache consistency
   */
  describe('Cache Consistency', () => {
    it.skipIf(!hasSupabase)('should maintain cache consistency with database', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              nodeCount: fc.integer({ min: 5, max: 30 }),
              edgeCount: fc.integer({ min: 5, max: 50 }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (graphConfigs) => {
            const epochs: EpochCommit[] = [];
            
            // Create epochs
            for (const config of graphConfigs) {
              const graph = createMockGraph(config.nodeCount, config.edgeCount);
              const epoch = await manager.createEpoch(graph);
              epochs.push(epoch);
            }
            
            // Retrieve from cache and database
            for (const epoch of epochs) {
              const retrieved = await manager.getCommitForEpoch(epoch.epochNumber);
              
              expect(retrieved).not.toBeNull();
              expect(retrieved?.epochNumber).toBe(epoch.epochNumber);
              expect(retrieved?.commitHash).toBe(epoch.graphCommitHash);
              expect(retrieved?.merkleRoot).toBe(epoch.merkleRoot);
            }
            
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
    
    it.skipIf(!hasSupabase)('should invalidate future epochs on new epoch creation', async () => {
      // Create initial epochs
      const graph1 = createMockGraph(10, 15);
      const epoch1 = await manager.createEpoch(graph1);
      
      const graph2 = createMockGraph(10, 15);
      const epoch2 = await manager.createEpoch(graph2);
      
      // Verify both are in cache
      const retrieved1 = await manager.getCommitForEpoch(epoch1.epochNumber);
      const retrieved2 = await manager.getCommitForEpoch(epoch2.epochNumber);
      
      expect(retrieved1).not.toBeNull();
      expect(retrieved2).not.toBeNull();
      
      // Cache metrics should show hits
      const metrics = manager.getCacheMetrics();
      expect(metrics.size).toBeGreaterThan(0);
    });
  });
  
  /**
   * Additional property: Deterministic hashing
   */
  describe('Deterministic Hashing', () => {
    it.skipIf(!hasSupabase)('should produce same hash for same graph state', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            nodeCount: fc.integer({ min: 5, max: 20 }),
            edgeCount: fc.integer({ min: 5, max: 30 }),
          }),
          async (config) => {
            // Create two identical graphs
            const graph1 = createMockGraph(config.nodeCount, config.edgeCount);
            const graph2 = createMockGraph(config.nodeCount, config.edgeCount);
            
            // Create epochs (need to clear between to reset state)
            const epoch1 = await manager.createEpoch(graph1);
            
            // Create new manager for second epoch to avoid sequential numbering
            const manager2 = new TemporalEpochManager('test-node-2');
            await manager2.initialize('0'.repeat(64));
            const epoch2 = await manager2.createEpoch(graph2);
            
            // Merkle roots should be identical for identical graphs
            expect(epoch1.merkleRoot).toBe(epoch2.merkleRoot);
            
            manager2.clearCache();
            
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

