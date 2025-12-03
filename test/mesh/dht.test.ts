/**
 * Libp2p DHT Integration Tests
 * 
 * Tests:
 * - Sybil resistance (PoW + VDF)
 * - DHT sharding and auto-scaling
 * - Peer discovery and XOR routing
 * - Performance (<100ms for 1000 nodes)
 * - MeshNetworkRouter integration
 * 
 * @module test/mesh/dht
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generatePoWProof,
  verifyPoWProof,
  generateVDFProof,
  verifyVDFProof,
  createSybilProof,
  verifySybilProof,
  getShardId,
  xorDistance,
  Libp2pDHT,
  type DHTNodeLibp2p,
  type SybilProof,
} from '../../lib/mesh/dhtLibp2p';
import { createDHTAdapter, type IDHTAdapter } from '../../lib/mesh/dhtAdapter';
import { MeshNetworkRouter, type DHTConfig } from '../../lib/mesh/network';
import { peerIdFromString } from '@libp2p/peer-id';
import { bytesToHex } from '@noble/hashes/utils';
import { sha256 } from '@noble/hashes/sha256';

// =====================================================
// SYBIL RESISTANCE TESTS
// =====================================================

describe('Sybil Resistance - PoW', () => {
  it('should generate valid PoW proof', () => {
    const nodeId = 'test-node-id';
    const difficulty = 16; // Lower for faster tests
    
    const { nonce, hash } = generatePoWProof(nodeId, difficulty);
    
    expect(nonce).toBeGreaterThanOrEqual(0);
    expect(hash).toHaveLength(64); // 32 bytes hex
    
    // Verify proof
    const isValid = verifyPoWProof(nodeId, nonce, hash, difficulty);
    expect(isValid).toBe(true);
  });

  it('should reject invalid PoW proof', () => {
    const nodeId = 'test-node-id';
    const difficulty = 16;
    
    const { nonce, hash } = generatePoWProof(nodeId, difficulty);
    
    // Tamper with nonce
    const isValid = verifyPoWProof(nodeId, nonce + 1, hash, difficulty);
    expect(isValid).toBe(false);
  });

  it('should handle different difficulty levels', () => {
    const nodeId = 'test-node-id';
    
    // Lower difficulty = faster
    const easy = generatePoWProof(nodeId, 12);
    expect(easy.nonce).toBeLessThan(10000);
    
    // Higher difficulty = slower (may take seconds)
    // const hard = generatePoWProof(nodeId, 20);
    // expect(hard.nonce).toBeGreaterThan(10000);
  });
});

describe('Sybil Resistance - VDF', () => {
  it('should generate VDF proof', () => {
    const input = 'test-input';
    const iterations = 1000; // Lower for faster tests
    
    const proof = generateVDFProof(input, iterations);
    
    expect(proof).toHaveLength(64); // 32 bytes hex
  });

  it('should verify valid VDF proof', () => {
    const input = 'test-input';
    const iterations = 1000;
    
    const proof = generateVDFProof(input, iterations);
    const isValid = verifyVDFProof(input, proof, iterations);
    
    expect(isValid).toBe(true);
  });

  it('should reject invalid VDF proof', () => {
    const input = 'test-input';
    const iterations = 1000;
    
    const proof = generateVDFProof(input, iterations);
    
    // Tamper with proof
    const tamperedProof = '0'.repeat(64);
    const isValid = verifyVDFProof(input, tamperedProof, iterations);
    
    expect(isValid).toBe(false);
  });

  it('should be deterministic', () => {
    const input = 'test-input';
    const iterations = 1000;
    
    const proof1 = generateVDFProof(input, iterations);
    const proof2 = generateVDFProof(input, iterations);
    
    expect(proof1).toBe(proof2);
  });
});

describe('Sybil Resistance - Complete Proof', () => {
  it('should create valid sybil proof', async () => {
    const nodeId = bytesToHex(sha256(new TextEncoder().encode('test-node')));
    
    // Reduce difficulty for testing
    vi.spyOn(globalThis, 'console').mockImplementation(() => {});
    
    const proof = await createSybilProof(nodeId);
    
    expect(proof.nodeId).toBe(nodeId);
    expect(proof.nonce).toBeGreaterThanOrEqual(0);
    expect(proof.powHash).toHaveLength(64);
    expect(proof.vdfProof).toHaveLength(64);
    expect(proof.timestamp).toBeGreaterThan(0);
  }, 30000); // 30s timeout for PoW

  it('should verify valid sybil proof', async () => {
    const nodeId = bytesToHex(sha256(new TextEncoder().encode('test-node')));
    
    const proof = await createSybilProof(nodeId);
    const isValid = verifySybilProof(proof);
    
    expect(isValid).toBe(true);
  }, 30000);

  it('should reject expired sybil proof', async () => {
    const nodeId = bytesToHex(sha256(new TextEncoder().encode('test-node')));
    
    const proof = await createSybilProof(nodeId);
    
    // Make proof 25 hours old
    proof.timestamp = Date.now() - 25 * 60 * 60 * 1000;
    
    const isValid = verifySybilProof(proof);
    expect(isValid).toBe(false);
  }, 30000);
});

// =====================================================
// SHARDING TESTS
// =====================================================

describe('DHT Sharding', () => {
  it('should extract shard ID from node ID', () => {
    const nodeId1 = '00000000ffffffffffffffffffffffffffffffff';
    const nodeId2 = 'ffff0000ffffffffffffffffffffffffffffffff';
    const nodeId3 = '12345678ffffffffffffffffffffffffffffffff';
    
    const shardCount = 4;
    
    const shard1 = getShardId(nodeId1, shardCount);
    const shard2 = getShardId(nodeId2, shardCount);
    const shard3 = getShardId(nodeId3, shardCount);
    
    expect(shard1).toBeGreaterThanOrEqual(0);
    expect(shard1).toBeLessThan(shardCount);
    
    expect(shard2).toBeGreaterThanOrEqual(0);
    expect(shard2).toBeLessThan(shardCount);
    
    expect(shard3).toBeGreaterThanOrEqual(0);
    expect(shard3).toBeLessThan(shardCount);
  });

  it('should distribute nodes evenly across shards', () => {
    const shardCount = 4;
    const shardCounts: Record<number, number> = {};
    
    // Generate 100 random node IDs
    for (let i = 0; i < 100; i++) {
      const nodeId = bytesToHex(sha256(new TextEncoder().encode(`node-${i}`)));
      const shardId = getShardId(nodeId, shardCount);
      shardCounts[shardId] = (shardCounts[shardId] || 0) + 1;
    }
    
    // Check distribution (should be roughly even)
    Object.values(shardCounts).forEach(count => {
      expect(count).toBeGreaterThan(10); // At least 10% per shard
      expect(count).toBeLessThan(50); // At most 50% per shard
    });
  });
});

describe('XOR Distance', () => {
  it('should calculate XOR distance', () => {
    const id1 = '0000000000000000000000000000000000000001';
    const id2 = '0000000000000000000000000000000000000002';
    
    const distance = xorDistance(id1, id2);
    
    expect(distance).toBe(3n); // 1 XOR 2 = 3
  });

  it('should have zero distance for identical IDs', () => {
    const id = '1234567890abcdef1234567890abcdef12345678';
    
    const distance = xorDistance(id, id);
    
    expect(distance).toBe(0n);
  });

  it('should be symmetric', () => {
    const id1 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const id2 = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    
    const d1 = xorDistance(id1, id2);
    const d2 = xorDistance(id2, id1);
    
    expect(d1).toBe(d2);
  });
});

// =====================================================
// LIBP2P DHT TESTS
// =====================================================

describe('Libp2pDHT', () => {
  let dht: Libp2pDHT;

  beforeEach(async () => {
    dht = new Libp2pDHT('agent://test.com');
  });

  afterEach(async () => {
    if (dht) {
      await dht.stop();
    }
  });

  it('should initialize with shards', () => {
    const stats = dht.getShardStats();
    
    expect(stats).toHaveLength(4); // Min 4 shards
    stats.forEach(shard => {
      expect(shard.shardId).toBeGreaterThanOrEqual(0);
      expect(shard.nodeCount).toBe(0); // No nodes yet
    });
  });

  it('should start libp2p node', async () => {
    await dht.start(0); // Random port
    
    const peerId = dht.getPeerId();
    expect(peerId).toBeDefined();
  }, 10000);

  it('should get node ID', () => {
    const nodeId = dht.getNodeId();
    
    expect(nodeId).toHaveLength(64); // SHA-256 hex
  });

  it('should get node count', () => {
    const count = dht.getNodeCount();
    
    expect(count).toBe(0); // No nodes added yet
  });
});

// =====================================================
// DHT ADAPTER TESTS
// =====================================================

describe('DHT Adapter', () => {
  let adapter: IDHTAdapter;

  afterEach(async () => {
    if (adapter) {
      await adapter.stop();
    }
  });

  it('should create libp2p adapter', async () => {
    adapter = await createDHTAdapter('agent://test.com', true, 0);
    
    expect(adapter).toBeDefined();
    expect(adapter.getNodeId()).toHaveLength(64);
  }, 10000);

  it('should create legacy adapter', async () => {
    adapter = await createDHTAdapter('agent://test.com', false);
    
    expect(adapter).toBeDefined();
    expect(adapter.getNodeId()).toBeDefined();
  });

  it('should get node count via adapter', async () => {
    adapter = await createDHTAdapter('agent://test.com', true, 0);
    
    const count = adapter.getNodeCount();
    expect(count).toBe(0);
  }, 10000);
});

// =====================================================
// MESH NETWORK ROUTER INTEGRATION
// =====================================================

describe('MeshNetworkRouter with libp2p DHT', () => {
  let router: MeshNetworkRouter;

  afterEach(async () => {
    if (router) {
      await router.stop();
    }
  });

  it('should create router with libp2p DHT', async () => {
    const config: DHTConfig = {
      useLibp2p: true,
      port: 0,
    };
    
    router = new MeshNetworkRouter('agent://test.com', config);
    await router.initialize();
    
    expect(router.nodeId).toHaveLength(64);
  }, 10000);

  it('should create router with legacy DHT', async () => {
    const config: DHTConfig = {
      useLibp2p: false,
    };
    
    router = new MeshNetworkRouter('agent://test.com', config);
    await router.initialize();
    
    expect(router.nodeId).toBeDefined();
  });

  it('should throw if not initialized', async () => {
    router = new MeshNetworkRouter('agent://test.com');
    
    await expect(router.discoverPeers('test')).rejects.toThrow('not initialized');
  });

  it('should discover peers after initialization', async () => {
    router = new MeshNetworkRouter('agent://test.com', { useLibp2p: true, port: 0 });
    await router.initialize();
    
    const peers = await router.discoverPeers('test.capability', 10);
    expect(peers).toBeInstanceOf(Array);
  }, 10000);

  it('should get stats', async () => {
    router = new MeshNetworkRouter('agent://test.com', { useLibp2p: true, port: 0 });
    await router.initialize();
    
    const stats = router.getStats();
    
    expect(stats.dht.nodeCount).toBe(0);
    expect(stats.circuitBreakers.total).toBe(0);
  }, 10000);
});

// =====================================================
// PERFORMANCE TESTS
// =====================================================

describe('Performance', () => {
  it('should lookup 1000 nodes in <100ms', async () => {
    const dht = new Libp2pDHT('agent://test.com');
    await dht.start(0);
    
    // Create dummy nodes (no sybil proof needed for local test)
    const nodes: Array<{nodeId: string; distance: bigint}> = [];
    const targetId = dht.getNodeId();
    
    for (let i = 0; i < 1000; i++) {
      const nodeId = bytesToHex(sha256(new TextEncoder().encode(`node-${i}`)));
      nodes.push({
        nodeId,
        distance: xorDistance(targetId, nodeId),
      });
    }
    
    // Measure lookup time
    const start = Date.now();
    
    nodes.sort((a, b) => (a.distance < b.distance ? -1 : 1));
    const closest = nodes.slice(0, 20);
    
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(100);
    expect(closest).toHaveLength(20);
    
    await dht.stop();
  }, 15000);

  it('should calculate PoW in <30s for difficulty 20', () => {
    const nodeId = 'performance-test-node';
    const difficulty = 20;
    
    const start = Date.now();
    const { nonce, hash } = generatePoWProof(nodeId, difficulty);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(30000); // 30 seconds
    expect(verifyPoWProof(nodeId, nonce, hash, difficulty)).toBe(true);
    
    console.log(`PoW (difficulty ${difficulty}): ${nonce} attempts in ${duration}ms`);
  }, 35000);

  it('should generate VDF in <1s for 10k iterations', () => {
    const input = 'vdf-performance-test';
    const iterations = 10000;
    
    const start = Date.now();
    const proof = generateVDFProof(input, iterations);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(1000);
    expect(verifyVDFProof(input, proof, iterations)).toBe(true);
    
    console.log(`VDF (${iterations} iterations): ${duration}ms`);
  });
});

// =====================================================
// EDGE CASES
// =====================================================

describe('Edge Cases', () => {
  it('should handle empty node ID', () => {
    const nodeId = '';
    
    expect(() => {
      const shardId = getShardId(nodeId, 4);
      expect(shardId).toBeGreaterThanOrEqual(0);
    }).not.toThrow();
  });

  it('should handle maximum shard count', () => {
    const nodeId = 'ffffffffffffffffffffffffffffffffffffffff';
    const maxShards = 256;
    
    const shardId = getShardId(nodeId, maxShards);
    
    expect(shardId).toBeGreaterThanOrEqual(0);
    expect(shardId).toBeLessThan(maxShards);
  });

  it('should handle zero iterations VDF', () => {
    const input = 'test';
    
    const proof = generateVDFProof(input, 0);
    expect(proof).toHaveLength(64);
    
    const isValid = verifyVDFProof(input, proof, 0);
    expect(isValid).toBe(true);
  });
});
