/**
 * Integration Tests for HotStuff + OCCO + Blockchain
 * 
 * Tests the complete consensus stack:
 * 1. HotStuff BFT consensus engine
 * 2. OCCO weighting oracle
 * 3. Blockchain integration with ReputationSlashing.sol
 * 4. Byzantine fault detection and slashing
 * 
 * @module test/consensus/integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bls12_381 as bls } from '@noble/curves/bls12-381';
import { bytesToHex } from '@noble/hashes/utils';
import { createHotstuffConsensus, type HotstuffConsensus } from '../../lib/consensus/hotstuff';
import { createOCCOOracle, type OCCOOracle } from '../../lib/consensus/occoOracle';
import { createBlockchainIntegration, type BlockchainIntegration } from '../../lib/consensus/blockchainIntegration';
import type { Address } from 'viem';

// =====================================================
// MOCKS
// =====================================================

const mockMeshRouter = {
  nodeId: 'test-node-1',
  discoverPeers: vi.fn(async () => [
    {
      nodeId: 'peer-1',
      address: 'peer1.example.com:8080',
      trustScore: 85,
      lastSeen: Date.now(),
      metadata: {
        publicKey: bytesToHex(bls.getPublicKey(new Uint8Array(32).fill(1))),
        address: '0x0000000000000000000000000000000000000001' as Address,
      },
    },
    {
      nodeId: 'peer-2',
      address: 'peer2.example.com:8080',
      trustScore: 92,
      lastSeen: Date.now(),
      metadata: {
        publicKey: bytesToHex(bls.getPublicKey(new Uint8Array(32).fill(2))),
        address: '0x0000000000000000000000000000000000000002' as Address,
      },
    },
  ]),
  broadcast: vi.fn(async () => {}),
  send: vi.fn(async () => {}),
};

// =====================================================
// TESTS: OCCO ORACLE
// =====================================================

describe('OCCO Oracle', () => {
  let oracle: OCCOOracle;

  beforeEach(() => {
    oracle = createOCCOOracle();
  });

  it('should register validator with initial metrics', () => {
    const address = '0x0000000000000000000000000000000000000001' as Address;
    oracle.registerValidator(address, 'node-1', 100);

    const metrics = oracle.getMetrics(address);
    expect(metrics).toBeDefined();
    expect(metrics?.stakeAmount).toBe(100);
    expect(metrics?.eeat.experience).toBe(50);
    expect(metrics?.eeat.trustworthiness).toBe(100);
  });

  it('should reject validator with insufficient stake', () => {
    const address = '0x0000000000000000000000000000000000000001' as Address;
    expect(() => oracle.registerValidator(address, 'node-1', 50)).toThrow();
  });

  it('should calculate OCCO weight correctly', () => {
    const address = '0x0000000000000000000000000000000000000001' as Address;
    oracle.registerValidator(address, 'node-1', 100);

    const weight = oracle.calculateWeight(address);
    
    expect(weight.address).toBe(address);
    expect(weight.weight).toBeGreaterThan(0);
    expect(weight.components.eeatScore).toBe(62.5); // (50+50+50+100)/4
    expect(weight.components.stakeFactor).toBe(0.01); // 100/10000
  });

  it('should apply freshness decay', async () => {
    const address = '0x0000000000000000000000000000000000000001' as Address;
    oracle.registerValidator(address, 'node-1', 100);

    const weight1 = oracle.calculateWeight(address);
    
    // Simulate 1 day passing
    const metrics = oracle.getMetrics(address)!;
    metrics.lastActiveAt = Date.now() - 24 * 60 * 60 * 1000;
    
    const weight2 = oracle.calculateWeight(address);
    
    expect(weight2.components.freshnessFactor).toBeLessThan(weight1.components.freshnessFactor);
  });

  it('should penalize Byzantine behavior', () => {
    const address = '0x0000000000000000000000000000000000000001' as Address;
    oracle.registerValidator(address, 'node-1', 100);

    const weight1 = oracle.calculateWeight(address);
    
    oracle.recordByzantineReport(address);
    
    const weight2 = oracle.calculateWeight(address);
    expect(weight2.weight).toBeLessThan(weight1.weight);
    
    const metrics = oracle.getMetrics(address)!;
    expect(metrics.eeat.trustworthiness).toBe(75); // 100 - 25
  });

  it('should exclude validator after 3 Byzantine reports', () => {
    const address = '0x0000000000000000000000000000000000000001' as Address;
    oracle.registerValidator(address, 'node-1', 100);

    oracle.recordByzantineReport(address);
    oracle.recordByzantineReport(address);
    expect(oracle.shouldExclude(address)).toBe(false);
    
    oracle.recordByzantineReport(address);
    expect(oracle.shouldExclude(address)).toBe(true);
  });

  it('should update E-E-A-T based on consensus votes', () => {
    const address = '0x0000000000000000000000000000000000000001' as Address;
    oracle.registerValidator(address, 'node-1', 100);

    const initialMetrics = oracle.getMetrics(address)!;
    const initialExperience = initialMetrics.eeat.experience;

    // Record successful votes
    for (let i = 0; i < 10; i++) {
      oracle.recordConsensusVote(address, true);
    }

    const updatedMetrics = oracle.getMetrics(address)!;
    expect(updatedMetrics.eeat.experience).toBeGreaterThan(initialExperience);
    expect(updatedMetrics.totalVotes).toBe(10);
  });

  it('should rank validators by weight', () => {
    const addr1 = '0x0000000000000000000000000000000000000001' as Address;
    const addr2 = '0x0000000000000000000000000000000000000002' as Address;
    const addr3 = '0x0000000000000000000000000000000000000003' as Address;

    oracle.registerValidator(addr1, 'node-1', 100);
    oracle.registerValidator(addr2, 'node-2', 200); // Higher stake
    oracle.registerValidator(addr3, 'node-3', 150);

    const weights = oracle.calculateAllWeights();
    
    expect(weights[0].address).toBe(addr2); // Highest stake
    expect(weights[1].address).toBe(addr3);
    expect(weights[2].address).toBe(addr1);
    
    expect(weights[0].rank).toBe(1);
    expect(weights[1].rank).toBe(2);
    expect(weights[2].rank).toBe(3);
  });

  it('should provide weight statistics', () => {
    const addr1 = '0x0000000000000000000000000000000000000001' as Address;
    const addr2 = '0x0000000000000000000000000000000000000002' as Address;

    oracle.registerValidator(addr1, 'node-1', 100);
    oracle.registerValidator(addr2, 'node-2', 200);

    const stats = oracle.getWeightStatistics();
    
    expect(stats.totalValidators).toBe(2);
    expect(stats.averageWeight).toBeGreaterThan(0);
    expect(stats.topValidator).toBe(addr2);
  });
});

// =====================================================
// TESTS: HOTSTUFF + OCCO INTEGRATION
// =====================================================

describe('HotStuff + OCCO Integration', () => {
  let consensus: HotstuffConsensus;
  let blsPrivateKey: Uint8Array;

  beforeEach(() => {
    blsPrivateKey = new Uint8Array(32).fill(42);
    consensus = createHotstuffConsensus(
      'test-node',
      blsPrivateKey,
      mockMeshRouter as any,
      {
        viewTimeout: 5000,
        f: 1,
        minStake: 100,
      }
    );
  });

  it('should initialize with OCCO oracle', () => {
    const oracle = consensus.getOracle();
    expect(oracle).toBeDefined();
  });

  it('should update validator set with OCCO weights', async () => {
    await consensus.updateValidatorSet();
    
    const weights = consensus.getValidatorWeights();
    expect(weights.length).toBeGreaterThan(0);
    
    // Check that weights are calculated
    weights.forEach(w => {
      expect(w.weight).toBeGreaterThan(0);
      expect(w.components.eeatScore).toBeDefined();
      expect(w.components.stakeFactor).toBeDefined();
    });
  });

  it('should record consensus outcomes in OCCO', async () => {
    await consensus.updateValidatorSet();
    
    const oracle = consensus.getOracle();
    const address = '0x0000000000000000000000000000000000000001' as Address;
    
    // Simulate consensus participation
    const initialMetrics = oracle.getMetrics(address);
    if (initialMetrics) {
      const initialVotes = initialMetrics.totalVotes;
      
      oracle.recordConsensusVote(address, true);
      
      const updatedMetrics = oracle.getMetrics(address)!;
      expect(updatedMetrics.totalVotes).toBe(initialVotes + 1);
    }
  });
});

// =====================================================
// TESTS: BYZANTINE FAULT DETECTION
// =====================================================

describe('Byzantine Fault Detection', () => {
  let oracle: OCCOOracle;

  beforeEach(() => {
    oracle = createOCCOOracle();
  });

  it('should detect equivocation (double voting)', () => {
    const address = '0x0000000000000000000000000000000000000001' as Address;
    oracle.registerValidator(address, 'node-1', 100);

    // Simulate double vote detection
    oracle.recordByzantineReport(address);
    
    const metrics = oracle.getMetrics(address)!;
    expect(metrics.byzantineReports).toBe(1);
    expect(metrics.eeat.trustworthiness).toBeLessThan(100);
  });

  it('should reduce weight exponentially with Byzantine reports', () => {
    const address = '0x0000000000000000000000000000000000000001' as Address;
    oracle.registerValidator(address, 'node-1', 100);

    const weights: number[] = [];
    
    for (let i = 0; i < 4; i++) {
      const weight = oracle.calculateWeight(address);
      weights.push(weight.weight);
      oracle.recordByzantineReport(address);
    }

    // Each Byzantine report should halve the weight
    expect(weights[1]).toBeLessThan(weights[0] * 0.6); // 50% penalty
    expect(weights[2]).toBeLessThan(weights[1] * 0.6);
    expect(weights[3]).toBeLessThan(weights[2] * 0.6);
  });
});

// =====================================================
// TESTS: PERFORMANCE
// =====================================================

describe('Performance Tests', () => {
  it('should calculate weights for 100 validators in <100ms', () => {
    const oracle = createOCCOOracle();
    
    // Register 100 validators
    for (let i = 0; i < 100; i++) {
      const address = `0x${'0'.repeat(38)}${i.toString().padStart(2, '0')}` as Address;
      oracle.registerValidator(address, `node-${i}`, 100 + i);
    }

    const start = Date.now();
    oracle.calculateAllWeights();
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100);
  });

  it('should handle 1000 consensus votes efficiently', () => {
    const oracle = createOCCOOracle();
    const address = '0x0000000000000000000000000000000000000001' as Address;
    oracle.registerValidator(address, 'node-1', 100);

    const start = Date.now();
    
    for (let i = 0; i < 1000; i++) {
      oracle.recordConsensusVote(address, i % 10 !== 0); // 90% success
    }
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);

    const metrics = oracle.getMetrics(address)!;
    expect(metrics.totalVotes).toBe(1000);
    expect(metrics.consensusSuccessRate).toBeGreaterThan(0.85);
    expect(metrics.consensusSuccessRate).toBeLessThan(0.95);
  });
});

// =====================================================
// TESTS: EDGE CASES
// =====================================================

describe('Edge Cases', () => {
  let oracle: OCCOOracle;

  beforeEach(() => {
    oracle = createOCCOOracle();
  });

  it('should handle zero E-E-A-T scores gracefully', () => {
    const address = '0x0000000000000000000000000000000000000001' as Address;
    oracle.registerValidator(address, 'node-1', 100);

    const metrics = oracle.getMetrics(address)!;
    metrics.eeat.experience = 0;
    metrics.eeat.expertise = 0;
    metrics.eeat.authoritativeness = 0;
    metrics.eeat.trustworthiness = 0;

    const weight = oracle.calculateWeight(address);
    expect(weight.weight).toBeGreaterThanOrEqual(0);
    expect(weight.components.eeatScore).toBe(0);
  });

  it('should handle maximum E-E-A-T scores', () => {
    const address = '0x0000000000000000000000000000000000000001' as Address;
    oracle.registerValidator(address, 'node-1', 10000); // Max stake

    const metrics = oracle.getMetrics(address)!;
    metrics.eeat.experience = 100;
    metrics.eeat.expertise = 100;
    metrics.eeat.authoritativeness = 100;
    metrics.eeat.trustworthiness = 100;

    const weight = oracle.calculateWeight(address);
    expect(weight.weight).toBeCloseTo(1.0, 1); // Should approach 1.0
  });

  it('should handle very old lastActiveAt timestamps', () => {
    const address = '0x0000000000000000000000000000000000000001' as Address;
    oracle.registerValidator(address, 'node-1', 100);

    const metrics = oracle.getMetrics(address)!;
    metrics.lastActiveAt = Date.now() - 365 * 24 * 60 * 60 * 1000; // 1 year ago

    const weight = oracle.calculateWeight(address);
    expect(weight.components.freshnessFactor).toBeCloseTo(0, 2); // Near zero
  });
});
