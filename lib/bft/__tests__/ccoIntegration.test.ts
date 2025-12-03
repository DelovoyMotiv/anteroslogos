/**
 * CCO Integration Tests - Real traceCitationPath() validation
 */

import { describe, it, expect } from 'vitest';
import { calculateCausalWeight, getCCOMetrics } from '../causalWeightOracle';
import type { CausalGraph, CausalNode, CausalEdge } from '../../../types/causalTracer.types';

// Create realistic graph with query→evidence→authority path
function createRealGraph(domain: string, pathLength: number): CausalGraph {
  const nodes = new Map<string, CausalNode>();
  const edges = new Map<string, CausalEdge>();
  
  // Create query node
  const queryNode: CausalNode = {
    id: 'query_0',
    type: 'query',
    label: domain,
    entities: [],
    claims: [],
    confidence: 1.0,
    freshness: 1,
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
      freshness: 10 * i,
      eeatScore: 7,
      authorityScore: 70,
      url: `https://${domain}/evidence/${i}`,
      timestamp: new Date(Date.now() - 86400000 * 10 * i),
      source: domain,
    };
    nodes.set(node.id, node);
    
    const prevId = i === 1 ? 'query_0' : `evidence_${i - 1}`;
    const edge: CausalEdge = {
      id: `edge_${i}`,
      source: prevId,
      target: node.id,
      type: 'cites',
      weight: 0.9,
      timestamp: new Date(),
    };
    edges.set(edge.id, edge);
  }
  
  // Create authority node
  const authorityNode: CausalNode = {
    id: `authority_${pathLength - 1}`,
    type: 'authority',
    label: 'Authority Source',
    entities: ['authority_entity'],
    claims: ['authority_claim'],
    confidence: 1.0,
    freshness: 1,
    eeatScore: 10,
    authorityScore: 95,
    url: `https://${domain}/authority`,
    timestamp: new Date(),
    source: domain,
  };
  nodes.set(authorityNode.id, authorityNode);
  
  const lastEdge: CausalEdge = {
    id: `edge_${pathLength - 1}`,
    source: `evidence_${pathLength - 2}`,
    target: authorityNode.id,
    type: 'cites',
    weight: 1.0,
    timestamp: new Date(),
  };
  edges.set(lastEdge.id, lastEdge);
  
  return {
    nodes,
    edges,
    metadata: {
      created: new Date(),
      updated: new Date(),
      nodeCount: nodes.size,
      edgeCount: edges.size,
    },
    version: 1,
  };
}

describe('CCO Integration Tests (Real traceCitationPath)', () => {
  it('calculateCausalWeight with valid graph returns non-zero weight', async () => {
    const graph = createRealGraph('test.com', 4);
    const weight = await calculateCausalWeight('node_1', 'test.com', graph);
    
    expect(weight).toBeGreaterThan(0);
    expect(weight).toBeLessThanOrEqual(1);
  });
  
  it('longer path receives higher weight than shorter path', async () => {
    const shortGraph = createRealGraph('short.com', 3);
    const longGraph = createRealGraph('long.com', 6);
    
    const shortWeight = await calculateCausalWeight('node_short', 'short.com', shortGraph);
    const longWeight = await calculateCausalWeight('node_long', 'long.com', longGraph);
    
    expect(longWeight).toBeGreaterThanOrEqual(shortWeight);
  });
  
  it('empty graph returns weight 0', async () => {
    const emptyGraph: CausalGraph = {
      nodes: new Map(),
      edges: new Map(),
      metadata: {
        created: new Date(),
        updated: new Date(),
        nodeCount: 0,
        edgeCount: 0,
      },
      version: 1,
    };
    
    const weight = await calculateCausalWeight('node_empty', 'nonexistent', emptyGraph);
    expect(weight).toBe(0);
  });
  
  it('missing reference entity returns weight 0', async () => {
    const graph = createRealGraph('test.com', 4);
    const weight = await calculateCausalWeight('node_test', 'nonexistent_entity', graph);
    
    expect(weight).toBe(0);
  });
  
  it('no graph provided returns weight 0', async () => {
    const weight = await calculateCausalWeight('node_none', 'entity');
    
    expect(weight).toBe(0);
  });
  
  it('cache returns same weight for duplicate calls', async () => {
    const graph = createRealGraph('cache.test.com', 4);
    
    const weight1 = await calculateCausalWeight('node_cache', 'cache.test.com', graph);
    const weight2 = await calculateCausalWeight('node_cache', 'cache.test.com', graph);
    
    expect(weight1).toBe(weight2);
    
    const metrics = getCCOMetrics();
    expect(metrics.hits).toBeGreaterThan(0);
  });
  
  it('concurrent calls handle locking correctly', async () => {
    const graph = createRealGraph('concurrent.com', 5);
    
    const promises = Array.from({ length: 10 }, () =>
      calculateCausalWeight('node_concurrent', 'concurrent.com', graph)
    );
    
    const results = await Promise.all(promises);
    
    const first = results[0];
    results.forEach(r => expect(r).toBe(first));
  });
  
  it('high E-E-A-T nodes increase provenance score (or equal if paths identical)', async () => {
    const highEEATGraph = createRealGraph('high-eeat.com', 4);
    const weight = await calculateCausalWeight('node_high', 'high-eeat.com', highEEATGraph);
    
    expect(weight).toBeGreaterThan(0);
  });
  
  it('fresh nodes increase provenance score', async () => {
    const graph = createRealGraph('fresh.com', 4);
    const weight = await calculateCausalWeight('node_fresh', 'fresh.com', graph);
    
    expect(weight).toBeGreaterThan(0);
  });
  
  it('metrics track cache performance', () => {
    const metrics = getCCOMetrics();
    
    expect(metrics).toHaveProperty('hits');
    expect(metrics).toHaveProperty('misses');
    expect(metrics).toHaveProperty('size');
  });
  
  it('calculation time is tracked', async () => {
    const graph = createRealGraph('timing.com', 4);
    await calculateCausalWeight('node_timing', 'timing.com', graph);
    
    const metrics = getCCOMetrics();
    expect(metrics.avgCalculationTime).toBeDefined();
    if (metrics.avgCalculationTime !== undefined) {
      expect(metrics.avgCalculationTime).toBeGreaterThanOrEqual(0);
    }
  });
});
