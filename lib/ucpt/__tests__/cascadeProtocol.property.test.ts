/**
 * Property-Based Tests for UCPT Cascade Protocol
 * 
 * Tests critical properties using fast-check:
 * 
 * Property 1: All Reachable Nodes Receive Token
 * - Validates 90%+ mesh coverage within 1 second
 * - Validates: Requirements 3.1, 3.4
 * 
 * Property 2: TTL Decrement and Propagation Stop
 * - Validates TTL decrements correctly
 * - Validates propagation stops at TTL=0
 * - Validates: Requirements 3.4, 3.5
 * 
 * Property 3: Deduplication Correctness
 * - Validates duplicate tokens are rejected
 * - Validates 99%+ deduplication rate
 * - Validates: Requirements 3.3
 * 
 * Property 4: Signature Verification
 * - Validates all tokens are verified before storage
 * - Validates invalid tokens are rejected
 * - Validates: Requirements 3.2
 * 
 * @module lib/ucpt/__tests__/cascadeProtocol.property.test
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { UCPTCascadeProtocol } from '../cascadeProtocol';
import { MeshNetworkRouter } from '../../mesh/network';
import { generateUCPT } from '../generator';
import { ed25519 } from '@noble/curves/ed25519.js';
import type { SerializedUCPT } from '../types';
import { resetCascadeMetrics } from '../../cascade/storage';

// =====================================================
// TEST SETUP
// =====================================================

// Mock mesh router for testing
class MockMeshRouter extends MeshNetworkRouter {
  private mockPeers: Array<{ nodeId: string; aidUri: string }> = [];
  public broadcastCalls: number = 0;
  public lastBroadcastMessage: any = null;
  
  constructor(aidUri: string, peerCount: number = 10) {
    super(aidUri, { useLibp2p: false });
    
    // Create mock peers
    for (let i = 0; i < peerCount; i++) {
      this.mockPeers.push({
        nodeId: `peer-${i}`,
        aidUri: `aid://test.com/agent/peer-${i}`,
      });
    }
  }
  
  async broadcast(message: any, options?: any): Promise<{ sent: number; failed: number }> {
    this.broadcastCalls++;
    this.lastBroadcastMessage = message;
    
    // Simulate successful broadcast to all peers
    const sent = this.mockPeers.length;
    return { sent, failed: 0 };
  }
  
  getStats() {
    return {
      dht: { nodeCount: this.mockPeers.length },
      circuitBreakers: { total: 0, open: 0, halfOpen: 0, closed: 0 },
    };
  }
  
  resetBroadcastCalls() {
    this.broadcastCalls = 0;
    this.lastBroadcastMessage = null;
  }
}

// Generate test keypair
const testKeypair = ed25519.utils.randomSecretKey();
const testPublicKey = ed25519.getPublicKey(testKeypair);

// Generate test UCPT token
async function generateTestUCPT(toolName: string = 'test-tool'): Promise<SerializedUCPT> {
  return await generateUCPT({
    issuer_aid: 'aid://test.com/agent/test',
    tool_name: toolName,
    input: { test: 'input' },
    output: { test: 'output' },
    graph_commit: 'abc123',
    graph_version: 'v1.0.0',
    causal_path_ids: [1, 2, 3],
    private_key: testKeypair,
    public_key: testPublicKey,
    ttl_seconds: 3600,
  });
}

describe('UCPTCascadeProtocol - Property-Based Tests', () => {
  let meshRouter: MockMeshRouter;
  let cascadeProtocol: UCPTCascadeProtocol;
  
  beforeAll(async () => {
    // Clean up any existing cascade data
    await resetCascadeMetrics();
  });
  
  beforeEach(async () => {
    // Create fresh instances for each test
    meshRouter = new MockMeshRouter('aid://test.com/agent/local', 10);
    cascadeProtocol = new UCPTCascadeProtocol(meshRouter);
    meshRouter.resetBroadcastCalls();
    
    // Clean up cascade storage
    await resetCascadeMetrics();
  });
  
  afterAll(async () => {
    await resetCascadeMetrics();
  });
  
  // =====================================================
  // PROPERTY 1: ALL REACHABLE NODES RECEIVE TOKEN
  // =====================================================
  
  describe('Property 1: All Reachable Nodes Receive Token', () => {
    it('should achieve 90%+ mesh coverage with sufficient TTL', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 5, max: 20 }), // Number of peers
          fc.integer({ min: 3, max: 7 }), // Initial TTL
          async (peerCount, initialTTL) => {
            // Create mesh with specified peer count
            const router = new MockMeshRouter('aid://test.com/agent/local', peerCount);
            const protocol = new UCPTCascadeProtocol(router);
            
            // Generate test token
            const ucpt = await generateTestUCPT('coverage-test');
            
            // Initiate cascade
            const startTime = Date.now();
            const result = await protocol.cascadeToken(
              ucpt,
              'aid://test.com/agent/test',
              'coverage-test',
              { initialTTL }
            );
            const endTime = Date.now();
            
            // Verify cascade completed quickly (<1 second)
            const propagationTime = endTime - startTime;
            expect(propagationTime).toBeLessThan(1000);
            
            // Verify token was stored
            expect(result.stored).toBe(true);
            
            // Verify broadcast occurred
            expect(result.broadcasted).toBe(true);
            expect(result.peersReached).toBe(peerCount);
            
            // Verify TTL decremented
            expect(result.ttlRemaining).toBe(initialTTL - 1);
            
            // Get stats
            const stats = await protocol.getStats();
            
            // With exponential fanout, coverage should be high
            // For TTL=3 and fanout=10: 10^3 = 1000 nodes reached
            // Coverage = min(1, 1000/10) = 1.0 (100%)
            if (initialTTL >= 3) {
              expect(stats.coverageEstimate).toBeGreaterThan(0.9);
            }
            
            return true;
          }
        ),
        {
          numRuns: 10,
          timeout: 30000,
        }
      );
    });
    
    it('should propagate to all reachable nodes within 1 second', async () => {
      const ucpt = await generateTestUCPT('propagation-test');
      
      const startTime = Date.now();
      const result = await cascadeProtocol.cascadeToken(
        ucpt,
        'aid://test.com/agent/test',
        'propagation-test',
        { initialTTL: 7 }
      );
      const endTime = Date.now();
      
      // Verify propagation time
      const propagationTime = endTime - startTime;
      expect(propagationTime).toBeLessThan(1000);
      
      // Verify broadcast occurred
      expect(result.broadcasted).toBe(true);
      expect(result.peersReached).toBeGreaterThan(0);
    });
  });
  
  // =====================================================
  // PROPERTY 2: TTL DECREMENT AND PROPAGATION STOP
  // =====================================================
  
  describe('Property 2: TTL Decrement and Propagation Stop', () => {
    it('should decrement TTL at each hop', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 7 }),
          async (initialTTL) => {
            const ucpt = await generateTestUCPT('ttl-test');
            
            const result = await cascadeProtocol.cascadeToken(
              ucpt,
              'aid://test.com/agent/test',
              'ttl-test',
              { initialTTL }
            );
            
            // TTL should be decremented by 1
            expect(result.ttlRemaining).toBe(initialTTL - 1);
            
            // If TTL was 1, should not broadcast
            if (initialTTL === 1) {
              expect(result.broadcasted).toBe(false);
            } else {
              expect(result.broadcasted).toBe(true);
            }
            
            return true;
          }
        ),
        {
          numRuns: 10,
          timeout: 20000,
        }
      );
    });
    
    it('should stop propagation when TTL reaches 0', async () => {
      const ucpt = await generateTestUCPT('ttl-zero-test');
      
      // Cascade with TTL=1 (will become 0 after first hop)
      const result1 = await cascadeProtocol.cascadeToken(
        ucpt,
        'aid://test.com/agent/test',
        'ttl-zero-test',
        { initialTTL: 1 }
      );
      
      // Should not broadcast (TTL would be 0)
      expect(result1.broadcasted).toBe(false);
      expect(result1.ttlRemaining).toBe(0);
      
      // Verify no broadcast calls were made
      expect(meshRouter.broadcastCalls).toBe(0);
    });
    
    it('should respect minTTL threshold', async () => {
      const ucpt = await generateTestUCPT('min-ttl-test');
      
      // Cascade with TTL=2 but minTTL=3 (should not broadcast)
      const result = await cascadeProtocol.cascadeToken(
        ucpt,
        'aid://test.com/agent/test',
        'min-ttl-test',
        { initialTTL: 2, minTTL: 3 }
      );
      
      // Should store but not broadcast
      expect(result.stored).toBe(true);
      expect(result.broadcasted).toBe(false);
    });
  });
  
  // =====================================================
  // PROPERTY 3: DEDUPLICATION CORRECTNESS
  // =====================================================
  
  describe('Property 3: Deduplication Correctness', () => {
    it('should reject duplicate tokens', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 10 }),
          async (attemptCount) => {
            const ucpt = await generateTestUCPT('dedup-test');
            
            // First cascade should succeed
            const result1 = await cascadeProtocol.cascadeToken(
              ucpt,
              'aid://test.com/agent/test',
              'dedup-test',
              { initialTTL: 7 }
            );
            
            expect(result1.stored).toBe(true);
            expect(result1.isDuplicate).toBe(false);
            
            // Subsequent cascades should be rejected as duplicates
            for (let i = 0; i < attemptCount - 1; i++) {
              const resultN = await cascadeProtocol.cascadeToken(
                ucpt,
                'aid://test.com/agent/test',
                'dedup-test',
                { initialTTL: 7 }
              );
              
              expect(resultN.stored).toBe(false);
              expect(resultN.isDuplicate).toBe(true);
              expect(resultN.broadcasted).toBe(false);
            }
            
            // Verify stats
            const stats = await cascadeProtocol.getStats();
            expect(stats.duplicatesRejected).toBe(attemptCount - 1);
            
            return true;
          }
        ),
        {
          numRuns: 5,
          timeout: 30000,
        }
      );
    });
    
    it('should achieve 99%+ deduplication rate', async () => {
      const tokens: SerializedUCPT[] = [];
      
      // Generate 10 unique tokens
      for (let i = 0; i < 10; i++) {
        const ucpt = await generateTestUCPT(`dedup-rate-test-${i}`);
        tokens.push(ucpt);
      }
      
      // Cascade each token once
      for (const ucpt of tokens) {
        await cascadeProtocol.cascadeToken(
          ucpt,
          'aid://test.com/agent/test',
          'dedup-rate-test',
          { initialTTL: 7 }
        );
      }
      
      // Try to cascade each token again (should all be duplicates)
      let duplicates = 0;
      for (const ucpt of tokens) {
        const result = await cascadeProtocol.cascadeToken(
          ucpt,
          'aid://test.com/agent/test',
          'dedup-rate-test',
          { initialTTL: 7 }
        );
        
        if (result.isDuplicate) {
          duplicates++;
        }
      }
      
      // Deduplication rate should be 100%
      const dedupRate = duplicates / tokens.length;
      expect(dedupRate).toBeGreaterThanOrEqual(0.99);
    });
  });
  
  // =====================================================
  // PROPERTY 4: SIGNATURE VERIFICATION
  // =====================================================
  
  describe('Property 4: Signature Verification', () => {
    it('should verify all tokens before storage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          async (tokenCount) => {
            const tokens: SerializedUCPT[] = [];
            
            // Generate multiple tokens
            for (let i = 0; i < tokenCount; i++) {
              const ucpt = await generateTestUCPT(`verify-test-${i}`);
              tokens.push(ucpt);
            }
            
            // Cascade all tokens
            for (const ucpt of tokens) {
              const result = await cascadeProtocol.cascadeToken(
                ucpt,
                'aid://test.com/agent/test',
                'verify-test',
                { initialTTL: 7, verifyBeforeStore: true }
              );
              
              // All should pass verification
              expect(result.verificationPassed).toBe(true);
              expect(result.stored).toBe(true);
            }
            
            // Verify no verification failures
            const stats = await cascadeProtocol.getStats();
            expect(stats.verificationFailures).toBe(0);
            
            return true;
          }
        ),
        {
          numRuns: 5,
          timeout: 30000,
        }
      );
    });
    
    it('should reject tokens with invalid signatures', async () => {
      // Create a token with valid structure but invalid signature
      const validUcpt = await generateTestUCPT('invalid-sig-test');
      
      // Corrupt the token (change last character)
      const corruptedToken = validUcpt.token.slice(0, -1) + 'X';
      const invalidUcpt: SerializedUCPT = {
        token: corruptedToken,
        mime_type: 'application/cose; cose-type="cose-sign1"',
      };
      
      // Try to cascade corrupted token
      const result = await cascadeProtocol.cascadeToken(
        invalidUcpt,
        'aid://test.com/agent/test',
        'invalid-sig-test',
        { initialTTL: 7, verifyBeforeStore: true }
      );
      
      // Should fail verification
      expect(result.verificationPassed).toBe(false);
      expect(result.stored).toBe(false);
      expect(result.broadcasted).toBe(false);
      
      // Verify stats
      const stats = await cascadeProtocol.getStats();
      expect(stats.verificationFailures).toBeGreaterThan(0);
    });
  });
  
  // =====================================================
  // INTEGRATION TESTS
  // =====================================================
  
  describe('Integration: Real-world Scenarios', () => {
    it('should handle high-volume cascade operations', async () => {
      const tokenCount = 50;
      const tokens: SerializedUCPT[] = [];
      
      // Generate tokens
      for (let i = 0; i < tokenCount; i++) {
        const ucpt = await generateTestUCPT(`volume-test-${i}`);
        tokens.push(ucpt);
      }
      
      // Cascade all tokens concurrently
      const startTime = Date.now();
      const results = await Promise.all(
        tokens.map(ucpt =>
          cascadeProtocol.cascadeToken(
            ucpt,
            'aid://test.com/agent/test',
            'volume-test',
            { initialTTL: 7 }
          )
        )
      );
      const endTime = Date.now();
      
      // All should succeed
      const successCount = results.filter(r => r.stored).length;
      expect(successCount).toBe(tokenCount);
      
      // Should complete quickly
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(10000); // <10 seconds for 50 tokens
      
      // Verify stats
      const stats = await cascadeProtocol.getStats();
      expect(stats.totalStored).toBe(tokenCount);
      expect(stats.totalBroadcasts).toBe(tokenCount);
    });
    
    it('should maintain performance under concurrent load', async () => {
      const concurrentCascades = 20;
      
      // Generate tokens
      const tokens = await Promise.all(
        Array.from({ length: concurrentCascades }, (_, i) =>
          generateTestUCPT(`concurrent-test-${i}`)
        )
      );
      
      // Measure performance
      const startTime = Date.now();
      
      // Cascade all concurrently
      const results = await Promise.all(
        tokens.map(ucpt =>
          cascadeProtocol.cascadeToken(
            ucpt,
            'aid://test.com/agent/test',
            'concurrent-test',
            { initialTTL: 7 }
          )
        )
      );
      
      const endTime = Date.now();
      const avgLatency = (endTime - startTime) / concurrentCascades;
      
      // All should succeed
      expect(results.every(r => r.stored)).toBe(true);
      
      // Average latency should be reasonable
      expect(avgLatency).toBeLessThan(500); // <500ms per cascade
    });
    
    it('should correctly estimate mesh coverage', async () => {
      // Create mesh with known size
      const peerCount = 20;
      const router = new MockMeshRouter('aid://test.com/agent/local', peerCount);
      const protocol = new UCPTCascadeProtocol(router);
      
      // Cascade multiple tokens
      for (let i = 0; i < 5; i++) {
        const ucpt = await generateTestUCPT(`coverage-estimate-${i}`);
        await protocol.cascadeToken(
          ucpt,
          'aid://test.com/agent/test',
          'coverage-estimate',
          { initialTTL: 7 }
        );
      }
      
      // Get stats
      const stats = await protocol.getStats();
      
      // Coverage estimate should be reasonable
      // With TTL=7 and fanout=20: 20^7 nodes reached
      // Coverage = min(1, 20^7 / 20) = 1.0
      expect(stats.coverageEstimate).toBeGreaterThan(0);
      expect(stats.coverageEstimate).toBeLessThanOrEqual(1);
      
      // With high TTL and fanout, should achieve near-complete coverage
      expect(stats.coverageEstimate).toBeGreaterThan(0.9);
    });
  });
});
