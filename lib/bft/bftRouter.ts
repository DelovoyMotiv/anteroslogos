/**
 * BFT Router - Consensus-Aware Routing Layer
 * Routes critical operations through PBFT consensus for Byzantine fault tolerance
 * 
 * Integration Points:
 * - Wraps MeshNetworkRouter for transparent consensus routing
 * - Routes PAYMENT_VERIFY, REPUTATION_UPDATE, AUDIT_DEEP through consensus
 * - Fallback to direct routing for non-critical operations
 * - Automatic quorum selection and validation
 * 
 * @module lib/bft/bftRouter
 * @version 1.0.0
 */

import { ulid } from 'ulid';
import { PBFTConsensus } from './pbftConsensus';
import { MeshNetworkRouter } from '../mesh/network';
import { BFTStorage, getBFTStorage } from './storage';
import {
  ConsensusRequest,
  ConsensusResult,
  ConsensusOperation,
  requiresConsensus,
} from './types';

// =====================================================
// TYPES
// =====================================================

/**
 * BFT routing options
 */
export interface BFTRoutingOptions {
  forceConsensus?: boolean; // Force consensus even for non-critical operations
  timeout?: number; // Override default consensus timeout
  fallbackOnFailure?: boolean; // Fallback to direct routing if consensus fails
  minQuorumSize?: number; // Minimum quorum size required
}

/**
 * BFT routing result
 */
export interface BFTRoutingResult<T = any> {
  success: boolean;
  data?: T;
  consensusUsed: boolean;
  consensusResult?: ConsensusResult;
  fallbackUsed: boolean;
  executionTimeMs: number;
  error?: string;
}

/**
 * Operation metadata for routing decisions
 */
interface OperationMetadata {
  operation: string;
  requiresConsensus: boolean;
  criticalityScore: number; // 0-100
  paymentAmount?: number; // For PAYMENT_VERIFY
}

// =====================================================
// BFT ROUTER
// =====================================================

export class BFTRouter {
  private consensus: PBFTConsensus;
  private storage: BFTStorage;
  private nodeId: string;
  
  // Statistics
  private stats = {
    totalRequests: 0,
    consensusRequests: 0,
    directRequests: 0,
    fallbackRequests: 0,
    failedRequests: 0,
  };

  constructor(
    nodeId: string,
    meshRouter: MeshNetworkRouter,
    consensus?: PBFTConsensus,
    storage?: BFTStorage
  ) {
    this.nodeId = nodeId;
    this.consensus = consensus || new PBFTConsensus(nodeId, meshRouter, storage);
    this.storage = storage || getBFTStorage();
    
    console.log('[BFTRouter] Initialized for node', nodeId);
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  /**
   * Route operation with automatic consensus detection
   */
  async route<T = any>(
    operation: string,
    payload: any,
    options: BFTRoutingOptions = {}
  ): Promise<BFTRoutingResult<T>> {
    const startTime = Date.now();
    this.stats.totalRequests++;
    
    try {
      // Analyze operation
      const metadata = this.analyzeOperation(operation, payload);
      
      // Decide if consensus is needed
      const needsConsensus = 
        options.forceConsensus || 
        metadata.requiresConsensus ||
        this.shouldUseConsensus(metadata);
      
      if (needsConsensus) {
        console.log(`[BFTRouter] Routing ${operation} through consensus`);
        return await this.routeThroughConsensus<T>(
          operation,
          payload,
          metadata,
          options,
          startTime
        );
      } else {
        console.log(`[BFTRouter] Direct routing for ${operation}`);
        return await this.routeDirect<T>(operation, payload, startTime);
      }
      
    } catch (error) {
      this.stats.failedRequests++;
      return {
        success: false,
        consensusUsed: false,
        fallbackUsed: false,
        executionTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify payment through consensus
   */
  async verifyPayment(
    txHash: string,
    amount: number,
    recipient: string
  ): Promise<BFTRoutingResult<{ verified: boolean }>> {
    return this.route<{ verified: boolean }>(
      'PAYMENT_VERIFY',
      { tx_hash: txHash, amount, recipient },
      { forceConsensus: true }
    );
  }

  /**
   * Update agent reputation through consensus
   */
  async updateReputation(
    agentId: string,
    newScore: number,
    reason: string
  ): Promise<BFTRoutingResult<{ updated: boolean }>> {
    return this.route<{ updated: boolean }>(
      'REPUTATION_UPDATE',
      { agent_id: agentId, new_score: newScore, reason },
      { forceConsensus: true }
    );
  }

  /**
   * Execute deep audit through consensus
   */
  async requestDeepAudit(
    url: string,
    options: any
  ): Promise<BFTRoutingResult<any>> {
    return this.route(
      'AUDIT_DEEP',
      { url, options },
      { forceConsensus: true }
    );
  }

  /**
   * Add/remove node from mesh topology through consensus
   */
  async updateMeshTopology(
    action: 'add' | 'remove',
    nodeId: string
  ): Promise<BFTRoutingResult<{ success: boolean }>> {
    return this.route<{ success: boolean }>(
      'MESH_TOPOLOGY_CHANGE',
      { action, node_id: nodeId },
      { forceConsensus: true }
    );
  }

  /**
   * Get routing statistics
   */
  getStats() {
    return {
      ...this.stats,
      consensusPercentage: this.stats.totalRequests > 0
        ? (this.stats.consensusRequests / this.stats.totalRequests) * 100
        : 0,
    };
  }

  /**
   * Get consensus view state
   */
  getConsensusState() {
    return this.consensus.getViewState();
  }

  /**
   * Check if node is primary
   */
  isPrimary(): boolean {
    return this.consensus.isPrimary();
  }

  // =====================================================
  // ROUTING LOGIC
  // =====================================================

  /**
   * Route through PBFT consensus
   */
  private async routeThroughConsensus<T>(
    operation: string,
    payload: any,
    _metadata: OperationMetadata,
    options: BFTRoutingOptions,
    startTime: number
  ): Promise<BFTRoutingResult<T>> {
    this.stats.consensusRequests++;
    
    try {
      // Create consensus request
      const request: ConsensusRequest = {
        requestId: ulid(),
        operation: operation as ConsensusOperation,
        payload,
        clientId: this.nodeId,
        clientSignature: await this.signPayload(payload),
        timestamp: Date.now(),
      };
      
      // Propose to consensus
      const consensusResult = await this.consensus.proposeRequest(request);
      
      if (consensusResult.success) {
        // Execute operation after consensus
        const data = await this.executeOperation<T>(operation, payload);
        
        return {
          success: true,
          data,
          consensusUsed: true,
          consensusResult,
          fallbackUsed: false,
          executionTimeMs: Date.now() - startTime,
        };
      } else {
        // Consensus failed
        if (options.fallbackOnFailure !== false) {
          console.warn('[BFTRouter] Consensus failed, using fallback');
          this.stats.fallbackRequests++;
          
          const data = await this.executeOperation<T>(operation, payload);
          
          return {
            success: true,
            data,
            consensusUsed: true,
            consensusResult,
            fallbackUsed: true,
            executionTimeMs: Date.now() - startTime,
          };
        } else {
          return {
            success: false,
            consensusUsed: true,
            consensusResult,
            fallbackUsed: false,
            executionTimeMs: Date.now() - startTime,
            error: consensusResult.error || 'Consensus failed',
          };
        }
      }
      
    } catch (error) {
      console.error('[BFTRouter] Consensus routing error:', error);
      
      // Fallback if enabled
      if (options.fallbackOnFailure !== false) {
        this.stats.fallbackRequests++;
        const data = await this.executeOperation<T>(operation, payload);
        
        return {
          success: true,
          data,
          consensusUsed: false,
          fallbackUsed: true,
          executionTimeMs: Date.now() - startTime,
        };
      }
      
      throw error;
    }
  }

  /**
   * Direct routing without consensus
   */
  private async routeDirect<T>(
    operation: string,
    payload: any,
    startTime: number
  ): Promise<BFTRoutingResult<T>> {
    this.stats.directRequests++;
    
    try {
      const data = await this.executeOperation<T>(operation, payload);
      
      return {
        success: true,
        data,
        consensusUsed: false,
        fallbackUsed: false,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        consensusUsed: false,
        fallbackUsed: false,
        executionTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // =====================================================
  // DECISION LOGIC
  // =====================================================

  /**
   * Analyze operation to determine routing strategy
   */
  private analyzeOperation(operation: string, payload: any): OperationMetadata {
    const requiresConsensusFlag = requiresConsensus(operation);
    
    let criticalityScore = 0;
    let paymentAmount: number | undefined;
    
    // Calculate criticality based on operation type and payload
    if (operation === 'PAYMENT_VERIFY') {
      paymentAmount = payload.amount || 0;
      // Payments >10 USDC are critical
      criticalityScore = (paymentAmount && paymentAmount > 10) ? 100 : 50;
    } else if (operation === 'REPUTATION_UPDATE') {
      // Reputation changes are always critical
      criticalityScore = 90;
    } else if (operation === 'AUDIT_DEEP') {
      // Deep audits with causal tracing are critical
      criticalityScore = 80;
    } else if (operation === 'MESH_TOPOLOGY_CHANGE') {
      // Topology changes are critical
      criticalityScore = 95;
    } else {
      // Default criticality
      criticalityScore = 20;
    }
    
    return {
      operation,
      requiresConsensus: requiresConsensusFlag,
      criticalityScore,
      paymentAmount,
    };
  }

  /**
   * Decide if operation should use consensus
   */
  private shouldUseConsensus(metadata: OperationMetadata): boolean {
    // Always use consensus for critical operations
    if (metadata.criticalityScore >= 80) {
      return true;
    }
    
    // Use consensus for payments >10 USDC
    if (metadata.operation === 'PAYMENT_VERIFY' && 
        metadata.paymentAmount && 
        metadata.paymentAmount > 10) {
      return true;
    }
    
    return false;
  }

  // =====================================================
  // EXECUTION
  // =====================================================

  /**
   * Execute operation (actual business logic)
   */
  private async executeOperation<T>(operation: string, payload: any): Promise<T> {
    // TODO: Integrate with actual operation handlers
    // For now: simulate execution based on operation type
    
    switch (operation) {
      case 'PAYMENT_VERIFY':
        return this.executePaymentVerify(payload) as Promise<T>;
      
      case 'REPUTATION_UPDATE':
        return this.executeReputationUpdate(payload) as Promise<T>;
      
      case 'AUDIT_DEEP':
        return this.executeDeepAudit(payload) as Promise<T>;
      
      case 'MESH_TOPOLOGY_CHANGE':
        return this.executeMeshTopologyChange(payload) as Promise<T>;
      
      default:
        // Generic operation execution via mesh router
        return this.executeGenericOperation(operation, payload) as Promise<T>;
    }
  }

  /**
   * Execute payment verification
   */
  private async executePaymentVerify(payload: any): Promise<{ verified: boolean }> {
    // TODO: Integrate with lib/payments/ledger.ts
    // For MVP: basic validation
    const { tx_hash, amount, recipient } = payload;
    
    if (!tx_hash || !amount || !recipient) {
      return { verified: false };
    }
    
    // Simulate blockchain verification
    console.log(`[BFTRouter] Verifying payment: ${tx_hash} (${amount} USDC to ${recipient})`);
    
    // In production: verify tx on Base L2 blockchain
    return { verified: true };
  }

  /**
   * Execute reputation update
   */
  private async executeReputationUpdate(payload: any): Promise<{ updated: boolean }> {
    // TODO: Integrate with agentRegistry
    const { agent_id, new_score, reason } = payload;
    
    console.log(`[BFTRouter] Updating reputation for ${agent_id}: ${new_score} (${reason})`);
    
    // In production: update agentRegistry trust score
    return { updated: true };
  }

  /**
   * Execute deep audit
   */
  private async executeDeepAudit(payload: any): Promise<any> {
    // TODO: Integrate with GEO audit system
    const { url } = payload;
    
    console.log(`[BFTRouter] Executing deep audit for ${url}`);
    
    // In production: trigger deep GEO audit with causal tracing
    return {
      url,
      score: 85,
      depth: 'deep',
      causalPaths: [],
    };
  }

  /**
   * Execute mesh topology change
   */
  private async executeMeshTopologyChange(payload: any): Promise<{ success: boolean }> {
    const { action, node_id } = payload;
    
    console.log(`[BFTRouter] Mesh topology change: ${action} node ${node_id}`);
    
    // In production: update mesh network topology
    return { success: true };
  }

  /**
   * Execute generic operation
   */
  private async executeGenericOperation(operation: string, payload: any): Promise<any> {
    console.log(`[BFTRouter] Executing generic operation: ${operation}`);
    
    // Route through mesh network
    // In production: use meshRouter to find and call appropriate service
    return { result: 'executed', operation, payload };
  }

  // =====================================================
  // HELPERS
  // =====================================================

  /**
   * Sign payload using Ed25519
   */
  private async signPayload(payload: any): Promise<string> {
    // TODO: Integrate with lib/a2a/ed25519Signatures.ts
    // For MVP: use hash as signature placeholder
    const canonical = JSON.stringify(payload);
    const { createHash } = await import('crypto');
    return createHash('sha256').update(canonical).digest('base64');
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    bftRouter: boolean;
    consensus: boolean;
    storage: boolean;
    meshNetwork: boolean;
  }> {
    const storageHealthy = await this.storage.healthCheck();
    
    return {
      bftRouter: true,
      consensus: true, // TODO: add consensus health check
      storage: storageHealthy,
      meshNetwork: true, // TODO: check mesh network connectivity
    };
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let bftRouterInstance: BFTRouter | null = null;

export function getBFTRouter(
  nodeId?: string,
  meshRouter?: MeshNetworkRouter
): BFTRouter {
  if (!bftRouterInstance) {
    if (!nodeId || !meshRouter) {
      throw new Error('BFTRouter not initialized. Provide nodeId and meshRouter.');
    }
    bftRouterInstance = new BFTRouter(nodeId, meshRouter);
  }
  return bftRouterInstance;
}

/**
 * Initialize BFT Router singleton
 */
export function initializeBFTRouter(
  nodeId: string,
  meshRouter: MeshNetworkRouter,
  consensus?: PBFTConsensus,
  storage?: BFTStorage
): BFTRouter {
  bftRouterInstance = new BFTRouter(nodeId, meshRouter, consensus, storage);
  return bftRouterInstance;
}
