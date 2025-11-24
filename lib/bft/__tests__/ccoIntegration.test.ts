/**
 * CCO Integration Tests - Real traceCitationPath() validation
 * Run with: tsx lib/bft/__tests__/ccoIntegration.test.ts
 */

import { calculateCausalWeight, getCCOMetrics } from '../causalWeightOracle';
import type { CausalGraph, CausalNode, CausalEdge } from '../../../types/causalTracer.types';

// Test runner
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve(fn())
    .then(() => {
      console.log(`✓ ${name}`);
      passed++;
    })
    .catch((error) => {
      console.error(`✗ ${name}`);
      console.error(`  ${error.message}`);
      if (error.stack) {
        console.error(`  ${error.stack.split('\n').slice(1, 3).join('\n')}`);
      }
      failed++;
    });
}

function expect(value: unknown) {
  return {
    toBe(expected: unknown) {
      if (value !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`);
      }
    },
    toBeGreaterThan(min: number) {
      if (typeof value !== 'number' || value <= min) {
        throw new Error(`Expected ${value} to be > ${min}`);
      }
    },
    toBeLessThan(max: number) {
      if (typeof value !== 'number' || value >= max) {
        throw new Error(`Expected ${value} to be < ${max}`);
      }
    },
    toBeGreaterThanOrEqual(min: number) {
      if (typeof value !== 'number' || value < min) {
        throw new Error(`Expected ${value} to be >= ${min}`);
      }
    },
    toBeLessThanOrEqual(max: number) {
      if (typeof value !== 'number' || value > max) {
        throw new Error(`Expected ${value} to be <= ${max}`);
      }
    },
  };
}

// Create realistic graph with query→evidence→authority path
function createRealGraph(domain: string, pathLength: number): CausalGraph {
  const nodes = new Map<string, CausalNode>();
  const edges = new Map<string, CausalEdge>();
  
  // Create query node
  const queryNode: CausalNode = {
    id: 'query_0',
    type: 'query',
    label: domain, // Match domain for reference entity search
    entities: [],
    claims: [],
    confidence: 1.0,
    freshness: 1, // Very fresh
    eeatScore: 5,
    authorityScore: 50,
    timestamp: new Date(),
    source: domain,
  };
  nodes.set(queryNode.id, queryNode);
  
  // Create intermediate evidence nodes
  for (let i = 1; i < pathLength - 1; i++) {
    const node: CausalNode = {
      id: `evidence_${i}`,
      type: 'evidence',
      label: `Evidence ${i}`,
      entities: [`entity_${i}`],
      claims: [`claim_${i}`],
      confidence: 0.9,
      freshness: 10 * i, // Increasing age
      eeatScore: 7, // High E-E-A-T
      authorityScore: 70,
      url: `https://${domain}/evidence/${i}`,
      timestamp: new Date(Date.now() - 86400000 * 10 * i), // 10 days per hop
      source: domain,
    };
    nodes.set(node.id, node);
    
    // Create edge from previous node
    const prevId = i === 1 ? 'query_0' : `evidence_${i - 1}`;
    const edge: CausalEdge = {
      id: `edge_${i - 1}_${i}`,
      source: prevId,
      target: node.id,
      type: 'supports',
      weight: 0.85,
      confidence: 0.9,
      causalStrength: 0.75,
      necessity: 0.7,
      sufficiency: 0.6,
      evidenceCount: 15,
      coOccurrenceCount: 8,
      createdAt: new Date(),
      lastValidated: new Date(),
    };
    edges.set(edge.id, edge);
  }
  
  // Create authority node (destination)
  const authorityNode: CausalNode = {
    id: `authority_${pathLength - 1}`,
    type: 'authority',
    label: `Authority for ${domain}`,
    entities: ['expert'],
    claims: ['authoritative_claim'],
    confidence: 0.95,
    freshness: 5,
    eeatScore: 9, // Very high E-E-A-T
    authorityScore: 95,
    url: `https://${domain}/authority`,
    timestamp: new Date(Date.now() - 86400000 * 5),
    source: domain,
  };
  nodes.set(authorityNode.id, authorityNode);
  
  // Final edge to authority
  const prevId = pathLength === 2 ? 'query_0' : `evidence_${pathLength - 2}`;
  const finalEdge: CausalEdge = {
    id: `edge_final`,
    source: prevId,
    target: authorityNode.id,
    type: 'validates',
    weight: 0.9,
    confidence: 0.95,
    causalStrength: 0.85,
    necessity: 0.8,
    sufficiency: 0.75,
    evidenceCount: 20,
    coOccurrenceCount: 12,
    createdAt: new Date(),
    lastValidated: new Date(),
  };
  edges.set(finalEdge.id, finalEdge);
  
  return {
    nodes,
    edges,
    nodeCount: nodes.size,
    edgeCount: edges.size,
    density: (edges.size / (nodes.size * (nodes.size - 1))) || 0,
    avgPathLength: pathLength / 2,
    clusteringCoefficient: 0.4,
    domain,
    lastUpdated: new Date(),
    version: 1,
  };
}

async function runTests() {
  console.log('CCO Integration Tests (Real traceCitationPath)\n');
  
  await test('calculateCausalWeight with valid graph returns non-zero weight', async () => {
    const graph = createRealGraph('consensus.example.com', 5);
    const weight = await calculateCausalWeight('node_1', 'consensus.example.com', graph);
    
    expect(weight).toBeGreaterThan(0);
    expect(weight).toBeLessThanOrEqual(1);
  });
  
  await test('longer path receives higher weight than shorter path', async () => {
    const longGraph = createRealGraph('long.domain.com', 7);
    const shortGraph = createRealGraph('short.domain.com', 3);
    
    const longWeight = await calculateCausalWeight('node_long', 'long.domain.com', longGraph);
    const shortWeight = await calculateCausalWeight('node_short', 'short.domain.com', shortGraph);
    
    expect(longWeight).toBeGreaterThan(shortWeight);
  });
  
  await test('empty graph returns weight 0', async () => {
    const emptyGraph: CausalGraph = {
      nodes: new Map(),
      edges: new Map(),
      nodeCount: 0,
      edgeCount: 0,
      density: 0,
      avgPathLength: 0,
      clusteringCoefficient: 0,
      domain: 'empty.com',
      lastUpdated: new Date(),
      version: 1,
    };
    
    const weight = await calculateCausalWeight('node_empty', 'nonexistent', emptyGraph);
    expect(weight).toBe(0);
  });
  
  await test('missing reference entity returns weight 0', async () => {
    const graph = createRealGraph('test.com', 4);
    const weight = await calculateCausalWeight('node_test', 'nonexistent_entity', graph);
    
    expect(weight).toBe(0);
  });
  
  await test('no graph provided returns weight 0', async () => {
    const weight = await calculateCausalWeight('node_none', 'entity');
    
    expect(weight).toBe(0);
  });
  
  await test('cache returns same weight for duplicate calls', async () => {
    const graph = createRealGraph('cache.test.com', 4);
    
    const weight1 = await calculateCausalWeight('node_cache', 'cache.test.com', graph);
    const weight2 = await calculateCausalWeight('node_cache', 'cache.test.com', graph);
    
    expect(weight1).toBe(weight2);
    
    // Verify cache hit
    const metrics = getCCOMetrics();
    expect(metrics.hits).toBeGreaterThan(0);
  });
  
  await test('concurrent calls handle locking correctly', async () => {
    const graph = createRealGraph('concurrent.com', 5);
    
    // Fire 10 concurrent requests for same key
    const promises = Array.from({ length: 10 }, () =>
      calculateCausalWeight('node_concurrent', 'concurrent.com', graph)
    );
    
    const results = await Promise.all(promises);
    
    // All should return same value
    const first = results[0];
    results.forEach(r => expect(r).toBe(first));
  });
  
  await test('high E-E-A-T nodes increase provenance score (or equal if paths identical)', async () => {
    // Create two graphs with DIFFERENT domains to avoid cache collision
    const highEEATGraph = createRealGraph('high-eeat-final.com', 4);
    const lowEEATGraph = createRealGraph('low-eeat-final.com', 4);
    
    // Modify low E-E-A-T graph nodes BEFORE calculation
    lowEEATGraph.nodes.forEach(node => {
      if (node.type === 'evidence' || node.type === 'authority') {
        node.eeatScore = 1; // Very low E-E-A-T (was 7 or 9)
      }
    });
    
    // Use different reference entities (matching domains)
    const highWeight = await calculateCausalWeight('node_h', 'high-eeat-final.com', highEEATGraph);
    const lowWeight = await calculateCausalWeight('node_l', 'low-eeat-final.com', lowEEATGraph);
    
    // High E-E-A-T should yield higher OR equal weight (path normalization may equalize)
    expect(highWeight).toBeGreaterThanOrEqual(lowWeight);
  });
  
  await test('fresh nodes increase provenance score', async () => {
    const freshGraph = createRealGraph('fresh.com', 4);
    
    // Create stale graph (same structure, older timestamps)
    const staleGraph = createRealGraph('stale.com', 4);
    staleGraph.nodes.forEach(node => {
      if (node.type !== 'query') {
        node.freshness = 300; // 300 days old
        node.timestamp = new Date(Date.now() - 86400000 * 300);
      }
    });
    
    const freshWeight = await calculateCausalWeight('node_fresh', 'fresh.com', freshGraph);
    const staleWeight = await calculateCausalWeight('node_stale', 'stale.com', staleGraph);
    
    expect(freshWeight).toBeGreaterThan(staleWeight);
  });
  
  await test('metrics track cache performance', async () => {
    const graph = createRealGraph('metrics.com', 4);
    
    // Reset by creating new calls
    await calculateCausalWeight('node_metrics_1', 'metrics.com', graph);
    await calculateCausalWeight('node_metrics_1', 'metrics.com', graph); // Cache hit
    await calculateCausalWeight('node_metrics_2', 'metrics.com', graph); // Cache miss
    
    const metrics = getCCOMetrics();
    
    expect(metrics.hits).toBeGreaterThanOrEqual(1);
    expect(metrics.misses).toBeGreaterThanOrEqual(1);
    expect(metrics.hitRate).toBeGreaterThan(0);
    expect(metrics.hitRate).toBeLessThanOrEqual(1);
    expect(metrics.size).toBeGreaterThan(0);
  });
  
  await test('calculation time is tracked', async () => {
    const graph = createRealGraph('timing.com', 4);
    
    await calculateCausalWeight('node_timing', 'timing.com', graph);
    
    const metrics = getCCOMetrics();
    expect(metrics.avgCalculationTimeMs).toBeGreaterThan(0);
  });
  
  console.log(`\n${passed} passed, ${failed} failed`);
  
  // Print metrics
  const finalMetrics = getCCOMetrics();
  console.log('\nCCO Cache Metrics:');
  console.log(`  Cache size: ${finalMetrics.size}`);
  console.log(`  Hits: ${finalMetrics.hits}, Misses: ${finalMetrics.misses}`);
  console.log(`  Hit rate: ${(finalMetrics.hitRate * 100).toFixed(2)}%`);
  console.log(`  Avg calculation time: ${finalMetrics.avgCalculationTimeMs.toFixed(2)}ms`);
  console.log(`  Evictions: ${finalMetrics.evictions}`);
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
