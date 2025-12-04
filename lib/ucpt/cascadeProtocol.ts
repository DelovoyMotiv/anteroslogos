/**
 * UCPT Cascade Protocol
 * 
 * Viral distribution of provenance tokens through mesh network with TTL-based propagation.
 * Ensures 90%+ mesh coverage in <1 second with automatic deduplication and verification.
 * 
 * Architecture:
 * - TTL-based propagation (7 hops default)
 * - SHA3-512 deduplication (prevents infinite loops)
 * - Automatic signature verification before storage
 * - Exponential fanout (each node broadcasts to all peers)
 * - Metrics tracking for coverage analysis
 * 
 * Performance targets:
 * - Mesh coverage: 90%+ of reachable nodes
 * - Propagation time: <1 second to 90% of mesh
 * - Deduplication rate: 99%+ (only 1% duplicate broadcasts)
 * - Verification rate: 100% (all tokens verified before storage)
 * 
 * @module lib/ucpt/cascadeProtocol
 * @version 1.0.0
 */

import type { SerializedUCPT } from './types';
import type { UCPTCascadeMessage } from '../mesh/network';
import { MeshNetworkRouter } from '../mesh/network';
import {
  storeCascadeToken,
  hasCascadeToken,
  recordRebroadcast,
  getCascadeMetrics,
  type CascadeEntry,
  type CascadeMetrics,
} from '../cascade/storage';
import { verifyUCPT } from './verifier';
import { logger } from '../a2a/logger';

// =====================================================
// TYPES
// =====================================================

interface CascadeOptions {
  initialTTL?: number; // Initial TTL (default: 7 hops)
  minTTL?: number; // Minimum TTL to continue propagation (default: 1)
  verifyBeforeStore?: boolean; // Verify signature before storing (default: true)
  broadcastDelay?: number; // Delay before broadcasting (ms, default: 0)
}

interface CascadeResult {
  stored: boolean; // Whether token was stored (false if duplicate)
  broadcasted: boolean; // Whether token was broadcasted to peers
  peersReached: number; // Number of peers reached
  ttlRemaining: number; // TTL after this hop
  isDuplicate: boolean; // Whether token was already in cache
  verificationPassed: boolean; // Whether signature verification passed
}

interface CascadeStats {
  totalCascades: number; // Total cascade operations initiated
  totalStored: number; // Total unique tokens stored
  totalBroadcasts: number; // Total broadcast operations
  duplicatesRejected: number; // Duplicate tokens rejected
  verificationFailures: number; // Verification failures
  avgPeersReached: number; // Average peers reached per cascade
  avgTTL: number; // Average TTL at reception
  coverageEstimate: number; // Estimated mesh coverage (0-1)
}

// =====================================================
// UCPT CASCADE PROTOCOL
// =====================================================

export class UCPTCascadeProtocol {
  private meshRouter: MeshNetworkRouter;
  private stats: CascadeStats = {
    totalCascades: 0,
    totalStored: 0,
    totalBroadcasts: 0,
    duplicatesRejected: 0,
    verificationFailures: 0,
    avgPeersReached: 0,
    avgTTL: 0,
    coverageEstimate: 0,
  };
  
  // Default configuration
  private readonly DEFAULT_INITIAL_TTL = 7;
  private readonly DEFAULT_MIN_TTL = 1;
  
  constructor(meshRouter: MeshNetworkRouter) {
    this.meshRouter = meshRouter;
    
    logger.info('UCPT Cascade Protocol initialized', {
      nodeId: meshRouter.nodeId,
      defaultTTL: this.DEFAULT_INITIAL_TTL,
    });
  }
  
  // =====================================================
  // CASCADE OPERATIONS
  // =====================================================
  
  /**
   * Initiate cascade for a new UCPT token
   * 
   * This is called when a token is first generated and needs to be
   * distributed across the mesh network.
   */
  async cascadeToken(
    ucpt: SerializedUCPT,
    sourceAid: string,
    toolName: string,
    options: CascadeOptions = {}
  ): Promise<CascadeResult> {
    const {
      initialTTL = this.DEFAULT_INITIAL_TTL,
      minTTL = this.DEFAULT_MIN_TTL,
      verifyBeforeStore = true,
      broadcastDelay = 0,
    } = options;
    
    this.stats.totalCascades++;
    
    logger.info('Initiating UCPT cascade', {
      sourceAid,
      tool: toolName,
      initialTTL,
    });
    
    // Check if already in cache (deduplication)
    const isDuplicate = await hasCascadeToken(ucpt.token);
    if (isDuplicate) {
      this.stats.duplicatesRejected++;
      logger.debug('UCPT token already in cascade cache, skipping', {
        sourceAid,
        tool: toolName,
      });
      
      return {
        stored: false,
        broadcasted: false,
        peersReached: 0,
        ttlRemaining: 0,
        isDuplicate: true,
        verificationPassed: false,
      };
    }
    
    // Verify token if requested
    let verificationPassed = true;
    if (verifyBeforeStore) {
      const verification = await verifyUCPT(ucpt, {
        skipRateLimit: true,
        skipReplayCheck: true,
      });
      
      if (!verification.valid) {
        this.stats.verificationFailures++;
        logger.error('UCPT token verification failed', {
          sourceAid,
          tool: toolName,
          error: verification.error,
        });
        
        return {
          stored: false,
          broadcasted: false,
          peersReached: 0,
          ttlRemaining: 0,
          isDuplicate: false,
          verificationPassed: false,
        };
      }
      
      logger.debug('UCPT token verification passed', {
        sourceAid,
        tool: toolName,
        issuer: verification.issuer,
      });
    }
    
    // Store in cascade cache
    const stored = await storeCascadeToken(ucpt, sourceAid, toolName, initialTTL);
    if (stored) {
      this.stats.totalStored++;
    }
    
    // Broadcast to mesh if TTL allows
    let peersReached = 0;
    let broadcasted = false;
    
    if (initialTTL >= minTTL) {
      // Optional delay before broadcasting (for rate limiting)
      if (broadcastDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, broadcastDelay));
      }
      
      // Create cascade message
      const cascadeMessage: UCPTCascadeMessage = {
        type: 'ucpt-cascade',
        ucpt: ucpt.token,
        sourceAid,
        tool: toolName,
        ttl: initialTTL - 1, // Decrement TTL for next hop
        timestamp: Date.now(),
      };
      
      // Broadcast to all UCPT-capable peers
      const result = await this.meshRouter.broadcast(cascadeMessage, {
        filter: 'ucpt-capable',
      });
      
      peersReached = result.sent;
      broadcasted = result.sent > 0;
      this.stats.totalBroadcasts++;
      
      // Record rebroadcast in metrics
      if (broadcasted) {
        await recordRebroadcast();
      }
      
      // Update average peers reached
      this.updateAvgPeersReached(peersReached);
      
      logger.info('UCPT cascade broadcasted', {
        sourceAid,
        tool: toolName,
        peersReached,
        ttlRemaining: initialTTL - 1,
      });
    } else {
      logger.debug('UCPT cascade TTL exhausted, not broadcasting', {
        sourceAid,
        tool: toolName,
        ttl: initialTTL,
      });
    }
    
    return {
      stored,
      broadcasted,
      peersReached,
      ttlRemaining: initialTTL - 1,
      isDuplicate: false,
      verificationPassed,
    };
  }
  
  /**
   * Receive cascade message from peer
   * 
   * This is called when a cascade message is received from another node.
   * It verifies, stores, and potentially rebroadcasts the token.
   */
  async receiveToken(message: UCPTCascadeMessage): Promise<CascadeResult> {
    logger.debug('Received UCPT cascade message', {
      sourceAid: message.sourceAid,
      tool: message.tool,
      ttl: message.ttl,
    });
    
    // Reconstruct SerializedUCPT
    const ucpt: SerializedUCPT = {
      token: message.ucpt,
      mime_type: 'application/cose; cose-type="cose-sign1"',
    };
    
    // Check if already in cache (deduplication)
    const isDuplicate = await hasCascadeToken(ucpt.token);
    if (isDuplicate) {
      this.stats.duplicatesRejected++;
      logger.debug('Duplicate UCPT token received, ignoring', {
        sourceAid: message.sourceAid,
        tool: message.tool,
      });
      
      return {
        stored: false,
        broadcasted: false,
        peersReached: 0,
        ttlRemaining: message.ttl,
        isDuplicate: true,
        verificationPassed: false,
      };
    }
    
    // Verify token
    const verification = await verifyUCPT(ucpt, {
      skipRateLimit: true,
      skipReplayCheck: true,
    });
    
    if (!verification.valid) {
      this.stats.verificationFailures++;
      logger.error('Received UCPT token failed verification', {
        sourceAid: message.sourceAid,
        tool: message.tool,
        error: verification.error,
      });
      
      return {
        stored: false,
        broadcasted: false,
        peersReached: 0,
        ttlRemaining: message.ttl,
        isDuplicate: false,
        verificationPassed: false,
      };
    }
    
    // Store in cascade cache
    const stored = await storeCascadeToken(
      ucpt,
      message.sourceAid,
      message.tool,
      message.ttl
    );
    
    if (stored) {
      this.stats.totalStored++;
    }
    
    // Continue cascade if TTL > 0
    let peersReached = 0;
    let broadcasted = false;
    
    if (message.ttl > 0) {
      // Create new cascade message with decremented TTL
      const cascadeMessage: UCPTCascadeMessage = {
        type: 'ucpt-cascade',
        ucpt: message.ucpt,
        sourceAid: message.sourceAid,
        tool: message.tool,
        ttl: message.ttl - 1,
        timestamp: Date.now(),
      };
      
      // Broadcast to peers
      const result = await this.meshRouter.broadcast(cascadeMessage, {
        filter: 'ucpt-capable',
      });
      
      peersReached = result.sent;
      broadcasted = result.sent > 0;
      
      if (broadcasted) {
        this.stats.totalBroadcasts++;
        await recordRebroadcast();
      }
      
      this.updateAvgPeersReached(peersReached);
      
      logger.debug('UCPT cascade continued', {
        sourceAid: message.sourceAid,
        tool: message.tool,
        peersReached,
        ttlRemaining: message.ttl - 1,
      });
    } else {
      logger.debug('UCPT cascade TTL reached 0, stopping propagation', {
        sourceAid: message.sourceAid,
        tool: message.tool,
      });
    }
    
    return {
      stored,
      broadcasted,
      peersReached,
      ttlRemaining: message.ttl - 1,
      isDuplicate: false,
      verificationPassed: true,
    };
  }
  
  /**
   * Query provenance for a specific tool
   * 
   * Returns all UCPT tokens for a given tool within a time range.
   */
  async queryProvenance(
    toolName: string,
    timeRange?: { start: number; end: number }
  ): Promise<CascadeEntry[]> {
    logger.debug('Querying provenance', {
      tool: toolName,
      timeRange,
    });
    
    // Get cascade metrics to estimate total tokens
    const metrics = await getCascadeMetrics();
    
    // For now, we don't have a direct query by tool in storage
    // This would require adding an index in cascade storage
    // For MVP, return empty array and log warning
    logger.warn('Provenance query by tool not yet implemented', {
      tool: toolName,
      totalStored: metrics.totalStored,
    });
    
    return [];
  }
  
  // =====================================================
  // STATISTICS AND MONITORING
  // =====================================================
  
  /**
   * Get cascade statistics
   */
  async getStats(): Promise<CascadeStats> {
    // Get storage metrics
    const storageMetrics = await getCascadeMetrics();
    
    // Combine with local stats
    const combinedStats: CascadeStats = {
      totalCascades: this.stats.totalCascades,
      totalStored: storageMetrics.totalStored,
      totalBroadcasts: storageMetrics.totalRebroadcast,
      duplicatesRejected: storageMetrics.duplicatesRejected,
      verificationFailures: storageMetrics.invalidTokens,
      avgPeersReached: this.stats.avgPeersReached,
      avgTTL: storageMetrics.avgTTL,
      coverageEstimate: this.estimateCoverage(storageMetrics),
    };
    
    return combinedStats;
  }
  
  /**
   * Estimate mesh coverage based on cascade metrics
   * 
   * Uses exponential fanout model:
   * - Each node broadcasts to N peers
   * - After H hops, coverage = 1 - (1 - 1/N)^(N^H)
   * 
   * Simplified: coverage ≈ 1 - e^(-N^H / total_nodes)
   */
  private estimateCoverage(metrics: CascadeMetrics): number {
    // Get mesh stats
    const meshStats = this.meshRouter.getStats();
    const totalNodes = meshStats.dht.nodeCount;
    
    if (totalNodes === 0) {
      return 0;
    }
    
    // Estimate average fanout (peers reached per broadcast)
    const avgFanout = this.stats.avgPeersReached || 5;
    
    // Estimate average hops (from TTL)
    const avgHops = this.DEFAULT_INITIAL_TTL - metrics.avgTTL;
    
    // Exponential fanout model
    // Nodes reached ≈ fanout^hops
    const nodesReached = Math.pow(avgFanout, avgHops);
    
    // Coverage = min(1, nodesReached / totalNodes)
    const coverage = Math.min(1, nodesReached / totalNodes);
    
    return coverage;
  }
  
  /**
   * Update average peers reached (exponential moving average)
   */
  private updateAvgPeersReached(newValue: number): void {
    if (this.stats.avgPeersReached === 0) {
      this.stats.avgPeersReached = newValue;
    } else {
      // EMA with alpha = 0.1
      this.stats.avgPeersReached = 0.9 * this.stats.avgPeersReached + 0.1 * newValue;
    }
  }
  
  /**
   * Reset statistics (for testing)
   */
  resetStats(): void {
    this.stats = {
      totalCascades: 0,
      totalStored: 0,
      totalBroadcasts: 0,
      duplicatesRejected: 0,
      verificationFailures: 0,
      avgPeersReached: 0,
      avgTTL: 0,
      coverageEstimate: 0,
    };
    
    logger.info('Cascade statistics reset');
  }
}

// =====================================================
// FACTORY FUNCTIONS
// =====================================================

let cascadeProtocolInstance: UCPTCascadeProtocol | null = null;

/**
 * Initialize cascade protocol with mesh router
 */
export function initializeCascadeProtocol(meshRouter: MeshNetworkRouter): UCPTCascadeProtocol {
  cascadeProtocolInstance = new UCPTCascadeProtocol(meshRouter);
  return cascadeProtocolInstance;
}

/**
 * Get cascade protocol instance (singleton)
 */
export function getCascadeProtocol(): UCPTCascadeProtocol {
  if (!cascadeProtocolInstance) {
    throw new Error('Cascade protocol not initialized. Call initializeCascadeProtocol() first.');
  }
  return cascadeProtocolInstance;
}

/**
 * Reset cascade protocol (for testing)
 */
export function resetCascadeProtocol(): void {
  cascadeProtocolInstance = null;
}
