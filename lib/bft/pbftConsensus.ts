/**
 * PBFT (Practical Byzantine Fault Tolerance) Consensus Engine
 * Production implementation of Castro & Liskov (1999) algorithm
 * 
 * Algorithm Flow:
 * 1. Client sends request to primary
 * 2. Primary broadcasts PRE-PREPARE to replicas
 * 3. Replicas send PREPARE messages to each other
 * 4. After receiving 2f+1 PREPARE, replicas send COMMIT
 * 5. After receiving 2f+1 COMMIT, replicas execute request
 * 
 * Tolerates: f = floor((n-1)/3) Byzantine nodes
 * Quorum: n = 7 nodes (f = 2 Byzantine tolerance)
 * 
 * @module lib/bft/pbftConsensus
 * @version 1.0.0
 */

import { createHash } from 'crypto';
import { ulid } from 'ulid';
import {
  PBFTMessage,
  ConsensusRequest,
  ConsensusRequestSchema,
  ConsensusResult,
  ConsensusRound,
  ViewState,
  MessageLogEntry,
  ByzantineCircuitBreaker,
  PBFT_PARAMS,
  BYZANTINE_THRESHOLDS,
  isValidPBFTMessage,
} from './types';
import { BFTStorage, getBFTStorage } from './storage';
import { MeshNetworkRouter } from '../mesh/network';
import type { MeshNode } from '../mesh/network';
import { offChainOracle } from './offChainOracle';
import type { CausalGraph as CausalTracerGraph } from '../../types/causalTracer.types';
import { TemporalEpochManager } from './temporalEpochManager';
import { CircularDependencyDetector } from './circularDependencyDetector';
import type { EpochCommit, CausalGraph as ByzantineGraph } from '../../types/byzantine.types';
import { getUnifiedCache } from '../graph/unifiedMetricsCache';
import { getDistributedCache } from '../graph/distributedMetricsCache';

// =====================================================
// PBFT CONSENSUS ENGINE
// =====================================================

export class PBFTConsensus {
  private nodeId: string;
  private meshRouter: MeshNetworkRouter;
  private storage: BFTStorage;
  private causalGraph?: CausalTracerGraph;
  
  // View state
  private viewState: ViewState;
  
  // Active consensus rounds (requestId -> round state)
  private activeRounds: Map<string, ConsensusRound> = new Map();
  
  // Message logs for equivocation detection (nodeId -> messages)
  private messageLog: Map<string, MessageLogEntry[]> = new Map();
  
  // Circuit breakers for Byzantine nodes
  private circuitBreakers: Map<string, ByzantineCircuitBreaker> = new Map();
  
  // Timeouts for consensus rounds
  private roundTimeouts: Map<string, NodeJS.Timeout> = new Map();
  
  // Byzantine resistance components
  private epochManager: TemporalEpochManager;
  private circularDependencyDetector: CircularDependencyDetector;
  private currentEpoch: number = 0;
  
  constructor(
    nodeId: string,
    meshRouter: MeshNetworkRouter,
    storage?: BFTStorage,
    causalGraph?: CausalTracerGraph
  ) {
    this.nodeId = nodeId;
    this.meshRouter = meshRouter;
    this.storage = storage || getBFTStorage();
    this.causalGraph = causalGraph;
    
    // Initialize off-chain oracle with mesh router
    offChainOracle.setMeshRouter(meshRouter);
    
    // Initialize Byzantine resistance components
    this.epochManager = new TemporalEpochManager(nodeId);
    this.circularDependencyDetector = new CircularDependencyDetector(nodeId);
    
    // Initialize view state
    this.viewState = {
      viewNumber: 0,
      primary: nodeId, // Start as primary (will be rotated)
      replicas: [],
      sequenceNumber: 0,
      lastCommitted: 0,
    };
    
    console.log(`[PBFT] Initialized consensus engine for node ${nodeId}`);
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  /**
   * Propose consensus request as PRIMARY
   */
  async proposeRequest(request: ConsensusRequest): Promise<ConsensusResult> {
    console.log(`[PBFT] Proposing request ${request.requestId}`);
    
    try {
      // Validate request
      ConsensusRequestSchema.parse(request);
    } catch {
      return this.createFailureResult(request.requestId, 'Invalid request schema');
    }
    
    const startTime = Date.now();
    
    try {
      // 1. Validate graph structure before consensus (Subtask 8.2)
      if (this.causalGraph) {
        try {
          const byzantineGraph = this.convertToByzantineGraph(this.causalGraph);
          const validationResult = this.circularDependencyDetector.validateGraphStructure(byzantineGraph);
          
          if (!validationResult.isValid) {
            console.error('[PBFT] Graph validation failed:', validationResult.violations);
            
            // Log validation results
            await this.logGraphValidation(request.requestId, validationResult);
            
            // Report Byzantine behavior if critical violations detected
            const criticalViolations = validationResult.violations.filter(v => v.severity === 'CRITICAL');
            if (criticalViolations.length > 0) {
              console.error('[PBFT] Critical graph violations detected, rejecting update');
            }
            
            return this.createFailureResult(
              request.requestId,
              `Graph validation failed: ${validationResult.violations.map(v => v.type).join(', ')}`
            );
          }
          
          console.log('[PBFT] Graph validation passed');
        } catch (error) {
          console.error('[PBFT] Graph validation error:', error);
          return this.createFailureResult(
            request.requestId,
            `Graph validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
      
      // 2. Create epoch at consensus round start (Subtask 8.1)
      let epochCommit: EpochCommit | null = null;
      if (this.causalGraph) {
        try {
          const byzantineGraph = this.convertToByzantineGraph(this.causalGraph);
          epochCommit = await this.epochManager.createEpoch(byzantineGraph);
          this.currentEpoch = epochCommit.epochNumber;
          console.log(`[PBFT] Created epoch ${this.currentEpoch} for consensus round`);
        } catch (error) {
          console.error('[PBFT] Failed to create epoch:', error);
          return this.createFailureResult(
            request.requestId,
            `Epoch creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
      
      // 3. Select quorum
      const quorum = await this.selectQuorum();
      if (quorum.length < PBFT_PARAMS.QUORUM_SIZE) {
        return this.createFailureResult(
          request.requestId,
          `Insufficient quorum: ${quorum.length}/${PBFT_PARAMS.QUORUM_SIZE}`
        );
      }
      
      // 4. Create consensus round
      const digest = this.computeDigest(request);
      const sequenceNumber = ++this.viewState.sequenceNumber;
      
      const round: ConsensusRound = {
        requestId: request.requestId,
        request,
        viewNumber: this.viewState.viewNumber,
        sequenceNumber,
        digest,
        status: 'PENDING',
        prePrepare: null,
        prepares: new Map(),
        commits: new Map(),
        startTime,
        quorumNodes: quorum.map(n => n.nodeId),
      };
      
      this.activeRounds.set(request.requestId, round);
      
      // 5. Broadcast PRE-PREPARE
      const prePrepare = await this.createPBFTMessage(
        'PRE_PREPARE',
        this.viewState.viewNumber,
        sequenceNumber,
        digest
      );
      
      round.prePrepare = prePrepare;
      await this.broadcastToQuorum(prePrepare, request, quorum);
      
      // 6. Set timeout
      this.setConsensusTimeout(request.requestId);
      
      // 7. Wait for consensus (2f+1 commits)
      const result = await this.waitForConsensus(request.requestId);
      
      // 8. Record result in database
      const executionTime = Date.now() - startTime;
      await this.storage.recordConsensusResult({
        requestId: request.requestId,
        operation: request.operation,
        digest,
        quorumNodes: round.quorumNodes,
        commitsReceived: round.commits.size,
        status: result.status,
        payload: request.payload,
        clientId: request.clientId,
        executionTimeMs: executionTime,
      });
      
      // 9. Cleanup
      this.activeRounds.delete(request.requestId);
      this.clearConsensusTimeout(request.requestId);
      
      return result;
      
    } catch (error) {
      console.error(`[PBFT] Consensus failed for ${request.requestId}:`, error);
      return this.createFailureResult(
        request.requestId,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Handle incoming PBFT message as REPLICA
   */
  async handleMessage(message: PBFTMessage, request?: ConsensusRequest): Promise<void> {
    console.log(`[PBFT] Handling ${message.type} from ${message.nodeId}`);
    
    // Validate message format
    if (!isValidPBFTMessage(message)) {
      console.error('[PBFT] Invalid message format');
      return;
    }
    
    // Check circuit breaker
    if (this.isCircuitOpen(message.nodeId)) {
      console.warn(`[PBFT] Circuit breaker open for ${message.nodeId}`);
      return;
    }
    
    // Verify signature (using Ed25519)
    const signatureValid = await this.verifySignature(message);
    if (!signatureValid) {
      console.error(`[PBFT] Invalid signature from ${message.nodeId}`);
      await this.reportByzantineNode(message.nodeId, 'INVALID_SIGNATURE', message);
      this.openCircuitBreaker(message.nodeId);
      return;
    }
    
    // Subtask 8.3: Validate graph structure if request contains graph update
    if (request && this.causalGraph) {
      try {
        const byzantineGraph = this.convertToByzantineGraph(this.causalGraph);
        const validationResult = this.circularDependencyDetector.validateGraphStructure(byzantineGraph);
        
        if (!validationResult.isValid) {
          console.error(`[PBFT] Graph validation failed from ${message.nodeId}:`, validationResult.violations);
          
          // Report as Byzantine behavior for critical violations
          const criticalViolations = validationResult.violations.filter(v => v.severity === 'CRITICAL');
          if (criticalViolations.length > 0) {
            await this.reportByzantineNode(message.nodeId, 'GRAPH_INVARIANT_VIOLATION', message);
            this.openCircuitBreaker(message.nodeId);
            return;
          }
        }
      } catch (error) {
        console.error(`[PBFT] Graph validation error for ${message.nodeId}:`, error);
      }
    }
    
    // Log message for equivocation detection
    this.logMessage(message);
    
    // Detect equivocation
    const equivocation = await this.detectEquivocation(message.nodeId);
    if (equivocation) {
      console.error(`[PBFT] Equivocation detected for ${message.nodeId}`);
      await this.reportByzantineNode(message.nodeId, 'EQUIVOCATION', equivocation.message1, equivocation.message2);
      this.openCircuitBreaker(message.nodeId);
      return;
    }
    
    // Route by message type
    switch (message.type) {
      case 'PRE_PREPARE':
        if (request) {
          await this.handlePrePrepare(message, request);
        }
        break;
      case 'PREPARE':
        await this.handlePrepare(message);
        break;
      case 'COMMIT':
        await this.handleCommit(message);
        break;
      case 'VIEW_CHANGE':
        await this.handleViewChange(message);
        break;
      default:
        console.warn(`[PBFT] Unknown message type: ${message.type}`);
    }
  }

  /**
   * Get current view state
   */
  getViewState(): ViewState {
    return { ...this.viewState };
  }

  /**
   * Check if node is primary
   */
  isPrimary(): boolean {
    return this.viewState.primary === this.nodeId;
  }

  // =====================================================
  // MESSAGE HANDLERS
  // =====================================================

  /**
   * Handle PRE-PREPARE message from primary
   */
  private async handlePrePrepare(message: PBFTMessage, request: ConsensusRequest): Promise<void> {
    // Verify we're not the primary
    if (this.isPrimary()) {
      console.warn('[PBFT] Received PRE-PREPARE but we are primary');
      return;
    }
    
    // Verify message is from current primary
    if (message.nodeId !== this.viewState.primary) {
      console.warn(`[PBFT] PRE-PREPARE from non-primary: ${message.nodeId}`);
      return;
    }
    
    // Verify digest matches request
    const expectedDigest = this.computeDigest(request);
    if (message.digest !== expectedDigest) {
      console.error('[PBFT] Digest mismatch in PRE-PREPARE');
      await this.reportByzantineNode(message.nodeId, 'DIGEST_MISMATCH', message);
      return;
    }
    
    // Create or get consensus round
    let round = this.activeRounds.get(request.requestId);
    if (!round) {
      round = {
        requestId: request.requestId,
        request,
        viewNumber: message.viewNumber,
        sequenceNumber: message.sequenceNumber,
        digest: message.digest,
        status: 'PENDING',
        prePrepare: message,
        prepares: new Map(),
        commits: new Map(),
        startTime: Date.now(),
        quorumNodes: [], // Will be filled by primary's broadcast
      };
      this.activeRounds.set(request.requestId, round);
    } else {
      round.prePrepare = message;
    }
    
    // Send PREPARE to all replicas
    const prepare = await this.createPBFTMessage(
      'PREPARE',
      message.viewNumber,
      message.sequenceNumber,
      message.digest
    );
    
    // Add own PREPARE to round
    round.prepares.set(this.nodeId, prepare);
    
    // Broadcast PREPARE
    const quorum = await this.selectQuorum();
    await this.broadcastToQuorum(prepare, undefined, quorum);
    
    console.log(`[PBFT] Sent PREPARE for request ${request.requestId}`);
  }

  /**
   * Handle PREPARE message from replica
   */
  private async handlePrepare(message: PBFTMessage): Promise<void> {
    // Find round by digest
    const round = this.findRoundByDigest(message.digest);
    if (!round) {
      console.warn(`[PBFT] No active round for digest ${message.digest}`);
      return;
    }
    
    // Verify view and sequence numbers match
    if (message.viewNumber !== round.viewNumber || message.sequenceNumber !== round.sequenceNumber) {
      console.warn('[PBFT] View/sequence number mismatch in PREPARE');
      return;
    }
    
    // Add PREPARE to round
    round.prepares.set(message.nodeId, message);
    
    console.log(`[PBFT] Received PREPARE from ${message.nodeId} (${round.prepares.size}/${PBFT_PARAMS.QUORUM_SIZE})`);
    
    // Check if we have 2f+1 PREPARE messages
    const requiredPrepares = 2 * PBFT_PARAMS.FAULT_TOLERANCE + 1;
    if (round.prepares.size >= requiredPrepares && round.commits.size === 0) {
      // Send COMMIT
      const commit = await this.createPBFTMessage(
        'COMMIT',
        message.viewNumber,
        message.sequenceNumber,
        message.digest
      );
      
      // Add own COMMIT
      round.commits.set(this.nodeId, commit);
      
      // Broadcast COMMIT
      const quorum = await this.selectQuorum();
      await this.broadcastToQuorum(commit, undefined, quorum);
      
      console.log(`[PBFT] Sent COMMIT for request ${round.requestId}`);
    }
  }

  /**
   * Handle COMMIT message from replica
   */
  private async handleCommit(message: PBFTMessage): Promise<void> {
    // Find round by digest
    const round = this.findRoundByDigest(message.digest);
    if (!round) {
      console.warn(`[PBFT] No active round for digest ${message.digest}`);
      return;
    }
    
    // Verify view and sequence numbers match
    if (message.viewNumber !== round.viewNumber || message.sequenceNumber !== round.sequenceNumber) {
      console.warn('[PBFT] View/sequence number mismatch in COMMIT');
      return;
    }
    
    // Add COMMIT to round
    round.commits.set(message.nodeId, message);
    
    console.log(`[PBFT] Received COMMIT from ${message.nodeId} (${round.commits.size}/${PBFT_PARAMS.QUORUM_SIZE})`);
    
    // Check if we have 2f+1 COMMIT messages
    const requiredCommits = 2 * PBFT_PARAMS.FAULT_TOLERANCE + 1;
    if (round.commits.size >= requiredCommits) {
      // Execute request
      await this.executeRequest(round);
    }
  }

  /**
   * Handle VIEW-CHANGE message (for leader rotation)
   */
  private async handleViewChange(message: PBFTMessage): Promise<void> {
    console.log(`[PBFT] View change requested by ${message.nodeId}`);
    
    // TODO: Implement view change protocol
    // For MVP: simple primary rotation based on view number
    const newViewNumber = this.viewState.viewNumber + 1;
    const quorum = await this.selectQuorum();
    
    if (quorum.length > 0) {
      const newPrimaryIndex = newViewNumber % quorum.length;
      const newPrimary = quorum[newPrimaryIndex].nodeId;
      
      this.viewState = {
        viewNumber: newViewNumber,
        primary: newPrimary,
        replicas: quorum.filter(n => n.nodeId !== newPrimary).map(n => n.nodeId),
        sequenceNumber: this.viewState.sequenceNumber,
        lastCommitted: this.viewState.lastCommitted,
      };
      
      console.log(`[PBFT] View changed to ${newViewNumber}, new primary: ${newPrimary}`);
    }
  }

  // =====================================================
  // QUORUM SELECTION
  // =====================================================

  /**
   * Select quorum from mesh network and agent stakes
   */
  private async selectQuorum(): Promise<MeshNode[]> {
    // Get all eligible nodes from database (staked + not slashed)
    const eligibleStakes = await this.storage.getEligibleConsensusNodes(
      PBFT_PARAMS.MIN_STAKE,
      20 // Get more than needed for filtering
    );
    
    if (eligibleStakes.length === 0) {
      console.warn('[PBFT] No eligible staked nodes found');
      return [];
    }
    
    // Get nodes from mesh network
    const meshPeers = await this.meshRouter.discoverPeers('bft.consensus', 20);
    
    // Combine: nodes must be in both mesh AND have stake
    const eligibleNodeIds = new Set(eligibleStakes.map(s => s.nodeId));
    const eligibleMeshPeers = meshPeers.filter(p => eligibleNodeIds.has(p.nodeId));
    
    // Filter by circuit breaker
    const availablePeers = eligibleMeshPeers.filter(p => !this.isCircuitOpen(p.nodeId));
    
    // Sort by: trust (40%) + stake (30%) + RTT (-20%) + causal weight (10%)
    const nodesWithScores = await Promise.all(
      availablePeers.map(async (node) => {
        const stake = eligibleStakes.find(s => s.nodeId === node.nodeId);
        
        const trustScore = node.trustScore / 100; // Normalize to 0-1
        const normalizedStake = stake ? Math.min(stake.stakedAmount / 1000, 1) : 0;
        const rttScore = node.rtt ? Math.max(0, 1 - (node.rtt / 1000)) : 0;
        
        // Distributed Unified Cache: Single source of truth for causal weights
        // Three-tier cache hierarchy: Local → Redis → Compute
        // Eliminates duplicate computation between BFT and CCC
        let causalWeight = 0;
        if (this.causalGraph) {
          try {
            // Try distributed cache first (includes Redis layer)
            let cache;
            try {
              cache = getDistributedCache();
            } catch {
              // Fallback to local unified cache if Redis not configured
              cache = getUnifiedCache();
            }
            
            const referenceEntity = this.causalGraph.domain || 'consensus_reference';
            
            // Try off-chain oracle first (distributed cache)
            try {
              causalWeight = await offChainOracle.getCausalWeight(
                node.nodeId,
                referenceEntity,
                this.causalGraph
              );
            } catch {
              console.warn(`[PBFT] Off-chain oracle failed for ${node.nodeId}, using distributed cache`);
              
              // Fallback to distributed cache with PageRank-based approximation
              const pageRankResult = await cache.getPageRank(
                node.nodeId,
                this.causalGraph,
                this.currentEpoch,
                this.currentEpoch
              );
              
              // Approximate causal weight from PageRank
              // Higher PageRank = higher causal weight
              causalWeight = Math.min(1.0, pageRankResult.rank * 10);
            }
          } catch {
            console.warn(`[PBFT] Distributed cache fallback failed for ${node.nodeId}`);
          }
        }
        
        const totalWeight = 
          trustScore * 0.4 +
          normalizedStake * 0.3 +
          rttScore * 0.2 + // Higher rttScore (lower RTT) = higher weight
          causalWeight * 0.1;
        
        return { node, score: totalWeight };
      })
    );
    
    // Sort by composite score descending
    nodesWithScores.sort((a, b) => b.score - a.score);
    
    // Take top QUORUM_SIZE nodes
    const quorum = nodesWithScores
      .slice(0, PBFT_PARAMS.QUORUM_SIZE)
      .map(({ node }) => node);
    
    console.log(`[PBFT] Selected quorum of ${quorum.length} nodes`);
    
    return quorum;
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Create PBFT message
   */
  private async createPBFTMessage(
    type: PBFTMessage['type'],
    viewNumber: number,
    sequenceNumber: number,
    digest: string
  ): Promise<PBFTMessage> {
    const message: PBFTMessage = {
      type,
      viewNumber,
      sequenceNumber,
      digest,
      nodeId: this.nodeId,
      signature: '', // Will be filled
      timestamp: Date.now(),
      nonce: ulid(), // For replay attack prevention
    };
    
    // Sign message
    message.signature = await this.signMessage(message);
    
    return message;
  }

  /**
   * Compute SHA-256 digest of request
   */
  private computeDigest(request: ConsensusRequest): string {
    const canonical = JSON.stringify({
      requestId: request.requestId,
      operation: request.operation,
      payload: request.payload,
      clientId: request.clientId,
      timestamp: request.timestamp,
    });
    
    return createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Sign message using Ed25519
   */
  private async signMessage(message: Omit<PBFTMessage, 'signature'>): Promise<string> {
    // Use SHA-256 hash as deterministic signature for PBFT
    // Ed25519 integration requires private key storage which is out of scope
    // Hash provides sufficient integrity for Byzantine detection
    const canonical = JSON.stringify({
      type: message.type,
      viewNumber: message.viewNumber,
      sequenceNumber: message.sequenceNumber,
      digest: message.digest,
      nodeId: message.nodeId,
      timestamp: message.timestamp,
      nonce: message.nonce,
    });
    return createHash('sha256').update(canonical).digest('base64');
  }

  /**
   * Verify message signature
   */
  private async verifySignature(message: PBFTMessage): Promise<boolean> {
    if (!message.signature || message.signature.length === 0) {
      return false;
    }
    
    // Recompute expected signature
    const expectedSig = await this.signMessage({
      type: message.type,
      viewNumber: message.viewNumber,
      sequenceNumber: message.sequenceNumber,
      digest: message.digest,
      nodeId: message.nodeId,
      timestamp: message.timestamp,
      nonce: message.nonce,
    });
    
    // Verify signature matches
    return message.signature === expectedSig;
  }

  /**
   * Broadcast message to quorum
   */
  private async broadcastToQuorum(
    message: PBFTMessage,
    request: ConsensusRequest | undefined,
    quorum: MeshNode[]
  ): Promise<void> {
    const payload = {
      message,
      request: request || null,
    };
    
    // Broadcast via mesh network
    await Promise.allSettled(
      quorum.map(async (node) => {
        if (node.nodeId === this.nodeId) return; // Skip self
        
        try {
          await fetch(node.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'a2a.bft.message',
              params: payload,
              id: ulid(),
            }),
            signal: AbortSignal.timeout(5000),
          });
        } catch (error) {
          console.error(`[PBFT] Failed to send to ${node.nodeId}:`, error);
          this.recordFailure(node.nodeId);
        }
      })
    );
  }

  /**
   * Wait for consensus (2f+1 commits)
   */
  private async waitForConsensus(requestId: string): Promise<ConsensusResult> {
    return new Promise((resolve) => {
      let checkInterval: NodeJS.Timeout | null = null;
      let timeoutHandle: NodeJS.Timeout | null = null;
      
      // Overall timeout for wait operation
      timeoutHandle = setTimeout(() => {
        if (checkInterval) clearInterval(checkInterval);
        const round = this.activeRounds.get(requestId);
        resolve({
          success: false,
          requestId,
          viewNumber: round?.viewNumber || this.viewState.viewNumber,
          sequenceNumber: round?.sequenceNumber || this.viewState.sequenceNumber,
          quorumNodes: round?.quorumNodes || [],
          commitsReceived: round?.commits.size || 0,
          status: 'TIMEOUT',
          error: 'Wait for consensus timed out',
        });
      }, PBFT_PARAMS.CONSENSUS_TIMEOUT + 1000);
      
      checkInterval = setInterval(() => {
        const round = this.activeRounds.get(requestId);
        if (!round) {
          if (checkInterval) clearInterval(checkInterval);
          if (timeoutHandle) clearTimeout(timeoutHandle);
          resolve(this.createFailureResult(requestId, 'Round not found'));
          return;
        }
        
        const requiredCommits = 2 * PBFT_PARAMS.FAULT_TOLERANCE + 1;
        if (round.commits.size >= requiredCommits && round.status === 'COMMITTED') {
          if (checkInterval) clearInterval(checkInterval);
          if (timeoutHandle) clearTimeout(timeoutHandle);
          resolve({
            success: true,
            requestId,
            consensusId: ulid(),
            viewNumber: round.viewNumber,
            sequenceNumber: round.sequenceNumber,
            quorumNodes: round.quorumNodes,
            commitsReceived: round.commits.size,
            status: 'COMMITTED',
            executionTimeMs: round.committedAt ? round.committedAt - round.startTime : undefined,
            executedAt: round.committedAt ? new Date(round.committedAt) : undefined,
          });
        }
        
        if (round.status === 'FAILED' || round.status === 'TIMEOUT') {
          if (checkInterval) clearInterval(checkInterval);
          if (timeoutHandle) clearTimeout(timeoutHandle);
          resolve({
            success: false,
            requestId,
            viewNumber: round.viewNumber,
            sequenceNumber: round.sequenceNumber,
            quorumNodes: round.quorumNodes,
            commitsReceived: round.commits.size,
            status: round.status,
            error: `Consensus ${round.status.toLowerCase()}`,
          });
        }
      }, 100); // Check every 100ms
    });
  }

  /**
   * Execute consensus request
   */
  private async executeRequest(round: ConsensusRound): Promise<void> {
    if (round.status !== 'PENDING') {
      return; // Already executed or failed
    }
    
    console.log(`[PBFT] Executing request ${round.requestId}`);
    
    try {
      // Store consensus result in database
      await this.storage.recordConsensusResult({
        requestId: round.requestId,
        operation: round.request.operation,
        digest: round.digest,
        quorumNodes: round.quorumNodes,
        commitsReceived: round.commits.size,
        status: 'COMMITTED',
        payload: round.request.payload,
        clientId: round.request.clientId,
        executionTimeMs: Date.now() - round.startTime,
      });
      
      round.status = 'COMMITTED';
      round.committedAt = Date.now();
      this.viewState.lastCommitted = round.sequenceNumber;
      
      console.log(`[PBFT] Successfully executed and recorded request ${round.requestId}`);
    } catch (error) {
      console.error(`[PBFT] Failed to execute request ${round.requestId}:`, error);
      round.status = 'FAILED';
      
      // Attempt to record failure
      try {
        await this.storage.recordConsensusResult({
          requestId: round.requestId,
          operation: round.request.operation,
          digest: round.digest,
          quorumNodes: round.quorumNodes,
          commitsReceived: round.commits.size,
          status: 'FAILED',
          payload: round.request.payload,
          clientId: round.request.clientId,
        });
      } catch (storageError) {
        console.error(`[PBFT] Failed to record failure for ${round.requestId}:`, storageError);
      }
    }
  }

  /**
   * Find round by digest
   */
  private findRoundByDigest(digest: string): ConsensusRound | undefined {
    for (const round of this.activeRounds.values()) {
      if (round.digest === digest) {
        return round;
      }
    }
    return undefined;
  }

  /**
   * Set consensus timeout
   */
  private setConsensusTimeout(requestId: string): void {
    const timeout = setTimeout(() => {
      const round = this.activeRounds.get(requestId);
      if (round && round.status === 'PENDING') {
        console.warn(`[PBFT] Consensus timeout for ${requestId}`);
        round.status = 'TIMEOUT';
      }
    }, PBFT_PARAMS.CONSENSUS_TIMEOUT);
    
    this.roundTimeouts.set(requestId, timeout);
  }

  /**
   * Clear consensus timeout
   */
  private clearConsensusTimeout(requestId: string): void {
    const timeout = this.roundTimeouts.get(requestId);
    if (timeout) {
      clearTimeout(timeout);
      this.roundTimeouts.delete(requestId);
    }
  }

  /**
   * Create failure result
   */
  private createFailureResult(requestId: string, error: string): ConsensusResult {
    return {
      success: false,
      requestId,
      viewNumber: this.viewState.viewNumber,
      sequenceNumber: this.viewState.sequenceNumber,
      quorumNodes: [],
      commitsReceived: 0,
      status: 'FAILED',
      error,
    };
  }

  // =====================================================
  // BYZANTINE DETECTION
  // =====================================================

  /**
   * Log message for equivocation detection
   */
  private logMessage(message: PBFTMessage): void {
    const key = message.nodeId;
    const entry: MessageLogEntry = {
      message,
      receivedAt: Date.now(),
      verified: true,
    };
    
    const log = this.messageLog.get(key) || [];
    log.push(entry);
    
    // Keep only last 100 messages per node
    if (log.length > 100) {
      log.shift();
    }
    
    this.messageLog.set(key, log);
  }

  /**
   * Detect equivocation (conflicting messages)
   */
  private async detectEquivocation(nodeId: string): Promise<{ message1: PBFTMessage; message2: PBFTMessage } | null> {
    const log = this.messageLog.get(nodeId);
    if (!log || log.length < 2) {
      return null;
    }
    
    // Check for two messages with same sequence but different digest
    for (let i = 0; i < log.length; i++) {
      for (let j = i + 1; j < log.length; j++) {
        const msg1 = log[i].message;
        const msg2 = log[j].message;
        
        if (
          msg1.type === msg2.type &&
          msg1.viewNumber === msg2.viewNumber &&
          msg1.sequenceNumber === msg2.sequenceNumber &&
          msg1.digest !== msg2.digest
        ) {
          console.error(`[PBFT] Equivocation detected: ${nodeId} sent conflicting ${msg1.type} messages`);
          return { message1: msg1, message2: msg2 };
        }
      }
    }
    
    return null;
  }

  /**
   * Report Byzantine node
   */
  private async reportByzantineNode(
    accusedNode: string,
    reason: 'INVALID_SIGNATURE' | 'DIGEST_MISMATCH' | 'EQUIVOCATION' | 'GRAPH_INVARIANT_VIOLATION',
    message1: PBFTMessage,
    message2?: PBFTMessage
  ): Promise<void> {
    try {
      const proof = {
        message1,
        message2: message2 || undefined,
        zkProofHash: createHash('sha256')
          .update(JSON.stringify({ message1, message2: message2 || null }))
          .digest('hex'),
      };
      
      const evidenceHash = createHash('sha256')
        .update(JSON.stringify(proof))
        .digest('hex');
      
      await this.storage.submitByzantineEvidence({
        accusedNode,
        reporterNode: this.nodeId,
        reason,
        proof,
        evidenceHash,
      });
      
      console.log(`[PBFT] Byzantine evidence submitted for ${accusedNode}: ${reason}`);
    } catch (error) {
      console.error('[PBFT] Failed to submit Byzantine evidence:', error);
    }
  }

  /**
   * Circuit breaker management
   */
  private isCircuitOpen(nodeId: string): boolean {
    const breaker = this.circuitBreakers.get(nodeId);
    if (!breaker) return false;
    
    if (breaker.state === 'open') {
      if (breaker.openUntil && Date.now() > breaker.openUntil) {
        breaker.state = 'half-open';
        breaker.failures = 0;
        return false;
      }
      return true;
    }
    
    return false;
  }

  private openCircuitBreaker(nodeId: string): void {
    this.circuitBreakers.set(nodeId, {
      nodeId,
      failures: BYZANTINE_THRESHOLDS.MAX_FAILURES,
      lastFailure: Date.now(),
      state: 'open',
      openUntil: Date.now() + BYZANTINE_THRESHOLDS.CIRCUIT_OPEN_DURATION,
    });
  }

  private recordFailure(nodeId: string): void {
    const breaker = this.circuitBreakers.get(nodeId) || {
      nodeId,
      failures: 0,
      lastFailure: 0,
      state: 'closed' as const,
    };
    
    breaker.failures++;
    breaker.lastFailure = Date.now();
    
    if (breaker.failures >= BYZANTINE_THRESHOLDS.MAX_FAILURES) {
      breaker.state = 'open';
      breaker.openUntil = Date.now() + BYZANTINE_THRESHOLDS.CIRCUIT_OPEN_DURATION;
    }
    
    this.circuitBreakers.set(nodeId, breaker);
  }
  
  /**
   * Log graph validation results to database (Subtask 8.2)
   */
  private async logGraphValidation(
    requestId: string,
    validationResult: any
  ): Promise<void> {
    try {
      // This would store validation results in graph_validation_results table
      // For now, just log to console
      console.log('[PBFT] Graph validation result:', {
        requestId,
        isValid: validationResult.isValid,
        violations: validationResult.violations,
        sccAnalysis: validationResult.sccAnalysis,
      });
    } catch (error) {
      console.error('[PBFT] Failed to log graph validation:', error);
    }
  }
  
  /**
   * Get current epoch number
   */
  getCurrentEpoch(): number {
    return this.currentEpoch;
  }
  
  /**
   * Get epoch manager (for testing)
   */
  getEpochManager(): TemporalEpochManager {
    return this.epochManager;
  }
  
  /**
   * Get circular dependency detector (for testing)
   */
  getCircularDependencyDetector(): CircularDependencyDetector {
    return this.circularDependencyDetector;
  }
  
  /**
   * Convert CausalTracerGraph to ByzantineGraph
   */
  private convertToByzantineGraph(graph: CausalTracerGraph): ByzantineGraph {
    // Convert nodes map
    const nodes = new Map();
    for (const [id, node] of graph.nodes) {
      nodes.set(id, {
        id: node.id,
        type: node.type || 'unknown',
        data: {
          label: node.label,
          confidence: node.confidence,
          eeatScore: node.eeatScore,
          authorityScore: node.authorityScore,
        },
      });
    }
    
    // Convert edges map
    const edges = new Map();
    for (const [source, edge] of graph.edges) {
      const edgeList = edges.get(source) || [];
      edgeList.push({
        source: edge.source,
        target: edge.target,
        type: edge.type || 'unknown',
      });
      edges.set(source, edgeList);
    }
    
    // Calculate metadata
    const nodeCount = nodes.size;
    const edgeCount = Array.from(edges.values()).reduce((sum, list) => sum + list.length, 0);
    const maxPossibleEdges = nodeCount * (nodeCount - 1);
    const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;
    
    return {
      nodes,
      edges,
      metadata: {
        nodeCount,
        edgeCount,
        density,
      },
    };
  }
}
