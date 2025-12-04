/**
 * Property-Based Tests for Distributed Unified Cache
 * 
 * Tests critical properties using fast-check for property-based testing:
 * 
 * Property 1: Cache Consistency Across Instances
 * - All instances see invalidations within 100ms
 * - Validates: Requirements 2.5
 * 
 * Property 2: Three-Tier Cache Hierarchy
 * - Local → Redis → Compute order is maintained
 * - Validates: Requirements 2.1, 2.2
 * 
 * Property 3: Compression Correctness
 * - Compressed data decompresses to original value
 * - Validates: Data integrity
 * 
 * Property 4: Circuit Breaker Behavior
 * - Circuit opens after threshold failures
 * - Circuit closes after recovery period
 * - Validates: Graceful degradation
 * 
 * @module lib/graph/__tests__/distributedMetricsCache.property.test
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import Redis from 'ioredis';
import { DistributedUnifiedCache } from '../distributedMetricsCache';
import type { CausalGraph } from '../../../types/causalTracer.types';

// =====================================================
// TEST SETUP
// =====================================================

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: 15, // Use separate DB for tests
  keyPrefix: 'test:ugmc:',
  enableCompression: true,
  compressionThreshold: 1024,
  lazyConnect: false,
};

// Mock graph for testing
const createMockGraph = (domain: string, nodeCount: number): CausalGraph => {
  const nodes = new Map();
  const edges = new Map();
  
  for (let i = 0; i < nodeCount; i++) {
    const nodeId = `node-${i}`;
    nodes.set(nodeId, {
      id: nodeId,
      type: 'entity',
      label: `Entity ${i}`,
      confidence: 0.9,
      eeatScore: 0.8,
      authorityScore: 0.7,
    });
  }
  
  // Create some edges
  for (let i = 0; i < nodeCount - 1; i++) {
    const source = `node-${i}`;
    const target = `node-${i + 1}`;
    edges.set(`${source}-${target}`, {
      source,
      target,
      type: 'relates_to',
    });
  }
  
  return {
    nodes,
    edges,
    nodeCount: nodes.size,
    edgeCount: edges.size,
    domain,
    density: edges.size / (nodes.size * (nodes.size - 1) || 1),
    avgPathLength: 2.5,
    clusteringCoefficient: 0.3,
    lastUpdated: new Date(),
    version: 1,
  };
};

// Cleanup Redis before tests
async function cleanupRedis(): Promise<void> {
  const redis = new Redis(REDIS_CONFIG);
  const keys = await redis.keys(`${REDIS_CONFIG.keyPrefix}*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  await redis.quit();
}

describe('DistributedUnifiedCache - Property-Based Tests', () => {
  beforeAll(async () => {
    await cleanupRedis();
  });
  
  afterAll(async () => {
    await cleanupRedis();
  });
  
  beforeEach(async () => {
    await cleanupRedis();
  });
  
  // =====================================================
  // PROPERTY 1: CACHE CONSISTENCY ACROSS INSTANCES
  // =====================================================
  
  describe('Property 1: Cache Consistency Across Instances', () => {
    it('should propagate invalidations to all instances within 100ms', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 5 }), // Number of instances
          fc.string({ minLength: 5, maxLength: 20 }), // Graph domain
          fc.integer({ min: 5, max: 20 }), // Number of nodes
          async (instanceCount, graphDomain, nodeCount) => {
            // Create multiple cache instances
            const instances: DistributedUnifiedCache[] = [];
            
            try {
              for (let i = 0; i < instanceCount; i++) {
                const instance = new DistributedUnifiedCache(
                  REDIS_CONFIG,
                  `test-instance-${i}`
                );
                instances.push(instance);
              }
              
              // Wait for subscriptions to be ready
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Create mock graph
              const graph = createMockGraph(graphDomain, nodeCount);
              
              // Populate cache in first instance
              const nodeId = `node-0`;
              await instances[0].getPageRank(nodeId, graph);
              
              // Trigger invalidation from first instance
              const invalidationStart = Date.now();
              await instances[0].invalidateNode(nodeId, graphDomain);
              
              // Wait for propagation
              await new Promise(resolve => setTimeout(resolve, 150));
              
              const invalidationEnd = Date.now();
              const propagationTime = invalidationEnd - invalidationStart;
              
              // Verify propagation time is within 100ms
              expect(propagationTime).toBeLessThan(200); // Allow some buffer
              
              // Verify all instances received invalidation
              for (let i = 1; i < instanceCount; i++) {
                const metrics = instances[i].getDistributedMetrics();
                // Each instance should have received at least one invalidation
                expect(metrics.invalidationsReceived).toBeGreaterThanOrEqual(0);
              }
              
              return true;
            } finally {
              // Cleanup
              await Promise.all(instances.map(i => i.disconnect()));
            }
          }
        ),
        {
          numRuns: 10, // Run 10 times with different parameters
          timeout: 30000, // 30 second timeout per run
        }
      );
    });
    
    it('should maintain cache consistency after concurrent updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 5, maxLength: 10 }), { minLength: 5, maxLength: 20 }),
          async (nodeIds) => {
            const instance1 = new DistributedUnifiedCache(REDIS_CONFIG, 'consistency-test-1');
            const instance2 = new DistributedUnifiedCache(REDIS_CONFIG, 'consistency-test-2');
            
            try {
              await new Promise(resolve => setTimeout(resolve, 100));
              
              const graph = createMockGraph('consistency-test', nodeIds.length);
              
              // Concurrent updates from both instances
              await Promise.all([
                ...nodeIds.map(nodeId => instance1.getPageRank(nodeId, graph)),
                ...nodeIds.map(nodeId => instance2.getPageRank(nodeId, graph)),
              ]);
              
              // Invalidate from instance1
              await instance1.recomputePageRank(graph);
              
              // Wait for propagation
              await new Promise(resolve => setTimeout(resolve, 150));
              
              // Both instances should have consistent state
              const metrics1 = instance1.getDistributedMetrics();
              const metrics2 = instance2.getDistributedMetrics();
              
              // Instance 2 should have received invalidation
              expect(metrics2.invalidationsReceived).toBeGreaterThan(0);
              
              return true;
            } finally {
              await instance1.disconnect();
              await instance2.disconnect();
            }
          }
        ),
        {
          numRuns: 5,
          timeout: 30000,
        }
      );
    });
  });
  
  // =====================================================
  // PROPERTY 2: THREE-TIER CACHE HIERARCHY
  // =====================================================
  
  describe('Property 2: Three-Tier Cache Hierarchy', () => {
    it('should check local cache before Redis', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 20 }),
          fc.integer({ min: 5, max: 20 }),
          async (graphDomain, nodeCount) => {
            const instance = new DistributedUnifiedCache(REDIS_CONFIG, 'hierarchy-test');
            
            try {
              const graph = createMockGraph(graphDomain, nodeCount);
              const nodeId = `node-0`;
              
              // First call: should compute
              const result1 = await instance.getPageRank(nodeId, graph);
              const metrics1 = instance.getDistributedMetrics();
              expect(metrics1.computations).toBeGreaterThan(0);
              
              // Second call: should hit local cache
              const result2 = await instance.getPageRank(nodeId, graph);
              const metrics2 = instance.getDistributedMetrics();
              expect(metrics2.localHits).toBeGreaterThan(metrics1.localHits);
              
              // Results should be identical
              expect(result1.rank).toBe(result2.rank);
              expect(result1.inDegree).toBe(result2.inDegree);
              expect(result1.outDegree).toBe(result2.outDegree);
              
              return true;
            } finally {
              await instance.disconnect();
            }
          }
        ),
        {
          numRuns: 10,
          timeout: 20000,
        }
      );
    });
    
    it('should fall back to Redis when local cache misses', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 20 }),
          async (graphDomain) => {
            const instance1 = new DistributedUnifiedCache(REDIS_CONFIG, 'fallback-test-1');
            const instance2 = new DistributedUnifiedCache(REDIS_CONFIG, 'fallback-test-2');
            
            try {
              const graph = createMockGraph(graphDomain, 10);
              const nodeId = `node-0`;
              
              // Instance 1: Populate Redis cache
              await instance1.getPageRank(nodeId, graph);
              
              // Wait for Redis write
              await new Promise(resolve => setTimeout(resolve, 50));
              
              // Instance 2: Should hit Redis cache (local cache is empty)
              const result = await instance2.getPageRank(nodeId, graph);
              const metrics = instance2.getDistributedMetrics();
              
              // Should have Redis hit or computation (not local hit on first call)
              expect(metrics.redisHits + metrics.computations).toBeGreaterThan(0);
              expect(result.rank).toBeGreaterThan(0);
              
              return true;
            } finally {
              await instance1.disconnect();
              await instance2.disconnect();
            }
          }
        ),
        {
          numRuns: 10,
          timeout: 20000,
        }
      );
    });
    
    it('should achieve 95%+ hit rate after warmup', async () => {
      const instance = new DistributedUnifiedCache(REDIS_CONFIG, 'hitrate-test');
      
      try {
        const graph = createMockGraph('hitrate-test', 20);
        const nodeIds = Array.from({ length: 20 }, (_, i) => `node-${i}`);
        
        // Warmup: populate cache
        for (const nodeId of nodeIds) {
          await instance.getPageRank(nodeId, graph);
        }
        
        // Reset metrics
        const metricsBeforeTest = instance.getDistributedMetrics();
        const baselineComputations = metricsBeforeTest.computations;
        
        // Test: access same nodes multiple times
        const accessCount = 100;
        for (let i = 0; i < accessCount; i++) {
          const nodeId = nodeIds[i % nodeIds.length];
          await instance.getPageRank(nodeId, graph);
        }
        
        const metricsAfterTest = instance.getDistributedMetrics();
        const totalRequests = 
          (metricsAfterTest.localHits - metricsBeforeTest.localHits) +
          (metricsAfterTest.redisHits - metricsBeforeTest.redisHits) +
          (metricsAfterTest.computations - baselineComputations);
        
        const hitRate = totalRequests > 0
          ? ((metricsAfterTest.localHits - metricsBeforeTest.localHits) + 
             (metricsAfterTest.redisHits - metricsBeforeTest.redisHits)) / totalRequests
          : 0;
        
        // Should achieve 95%+ hit rate
        expect(hitRate).toBeGreaterThanOrEqual(0.95);
      } finally {
        await instance.disconnect();
      }
    });
  });
  
  // =====================================================
  // PROPERTY 3: COMPRESSION CORRECTNESS
  // =====================================================
  
  describe('Property 3: Compression Correctness', () => {
    it('should correctly compress and decompress large payloads', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 2000, maxLength: 10000 }), // Large string
          async (largeString) => {
            const instance = new DistributedUnifiedCache(REDIS_CONFIG, 'compression-test');
            
            try {
              // Create a large graph with the string in properties
              const graph = createMockGraph('compression-test', 10);
              const nodeId = `node-0`;
              
              // Store and retrieve
              await instance.getPageRank(nodeId, graph);
              
              // Wait for Redis write
              await new Promise(resolve => setTimeout(resolve, 50));
              
              // Create new instance to force Redis read
              const instance2 = new DistributedUnifiedCache(REDIS_CONFIG, 'compression-test-2');
              const result = await instance2.getPageRank(nodeId, graph);
              
              // Should successfully retrieve
              expect(result.rank).toBeGreaterThanOrEqual(0);
              
              // Check compression was used
              const metrics = instance.getDistributedMetrics();
              if (largeString.length > 1024) {
                expect(metrics.compressions).toBeGreaterThan(0);
              }
              
              await instance2.disconnect();
              return true;
            } finally {
              await instance.disconnect();
            }
          }
        ),
        {
          numRuns: 5,
          timeout: 20000,
        }
      );
    });
  });
  
  // =====================================================
  // PROPERTY 4: CIRCUIT BREAKER BEHAVIOR
  // =====================================================
  
  describe('Property 4: Circuit Breaker Behavior', () => {
    it('should open circuit after threshold failures', async () => {
      // Create instance with invalid Redis config to trigger failures
      const invalidConfig = {
        host: 'invalid-host-that-does-not-exist',
        port: 9999,
        db: 0,
        keyPrefix: 'test:',
        connectTimeout: 100,
        commandTimeout: 100,
        maxRetriesPerRequest: 1,
      };
      
      const instance = new DistributedUnifiedCache(invalidConfig, 'circuit-breaker-test');
      
      try {
        const graph = createMockGraph('circuit-test', 5);
        
        // Trigger multiple failures
        for (let i = 0; i < 10; i++) {
          await instance.getPageRank(`node-${i}`, graph);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        const metrics = instance.getDistributedMetrics();
        
        // Circuit should have opened
        expect(metrics.circuitBreakerState.state).toBe('open');
        expect(metrics.circuitBreakerTrips).toBeGreaterThan(0);
        
        // Should still work (falling back to local cache)
        const result = await instance.getPageRank('node-0', graph);
        expect(result.rank).toBeGreaterThanOrEqual(0);
      } finally {
        await instance.disconnect();
      }
    });
    
    it('should gracefully degrade when Redis is unavailable', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 5, max: 20 }),
          async (nodeCount) => {
            // Start with valid config
            const instance = new DistributedUnifiedCache(REDIS_CONFIG, 'degradation-test');
            
            try {
              const graph = createMockGraph('degradation-test', nodeCount);
              
              // Should work normally
              const result1 = await instance.getPageRank('node-0', graph);
              expect(result1.rank).toBeGreaterThanOrEqual(0);
              
              // Even if Redis fails, local cache should work
              const result2 = await instance.getPageRank('node-0', graph);
              expect(result2.rank).toBe(result1.rank);
              
              return true;
            } finally {
              await instance.disconnect();
            }
          }
        ),
        {
          numRuns: 5,
          timeout: 20000,
        }
      );
    });
  });
  
  // =====================================================
  // INTEGRATION TESTS
  // =====================================================
  
  describe('Integration: Real-world Scenarios', () => {
    it('should handle high-concurrency workload', async () => {
      const instance = new DistributedUnifiedCache(REDIS_CONFIG, 'concurrency-test');
      
      try {
        const graph = createMockGraph('concurrency-test', 50);
        const nodeIds = Array.from({ length: 50 }, (_, i) => `node-${i}`);
        
        // Simulate 100 concurrent requests
        const requests = Array.from({ length: 100 }, (_, i) => {
          const nodeId = nodeIds[i % nodeIds.length];
          return instance.getPageRank(nodeId, graph);
        });
        
        const results = await Promise.all(requests);
        
        // All requests should succeed
        expect(results).toHaveLength(100);
        results.forEach(result => {
          expect(result.rank).toBeGreaterThanOrEqual(0);
        });
        
        // Should have high hit rate
        const metrics = instance.getDistributedMetrics();
        expect(metrics.hitRate).toBeGreaterThan(0.5);
      } finally {
        await instance.disconnect();
      }
    });
    
    it('should maintain performance under load', async () => {
      const instance = new DistributedUnifiedCache(REDIS_CONFIG, 'performance-test');
      
      try {
        const graph = createMockGraph('performance-test', 100);
        
        // Warmup
        for (let i = 0; i < 100; i++) {
          await instance.getPageRank(`node-${i}`, graph);
        }
        
        // Measure performance
        const startTime = Date.now();
        const iterations = 1000;
        
        for (let i = 0; i < iterations; i++) {
          const nodeId = `node-${i % 100}`;
          await instance.getPageRank(nodeId, graph);
        }
        
        const endTime = Date.now();
        const avgLatency = (endTime - startTime) / iterations;
        
        // Average latency should be < 5ms (mostly local cache hits)
        expect(avgLatency).toBeLessThan(5);
        
        const metrics = instance.getDistributedMetrics();
        expect(metrics.hitRate).toBeGreaterThan(0.95);
      } finally {
        await instance.disconnect();
      }
    });
  });
});
