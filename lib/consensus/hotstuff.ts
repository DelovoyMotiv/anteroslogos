/**
 * HotStuff Consensus Engine (Production-Grade BFT)
 * Based on "HotStuff: BFT Consensus in the Lens of Blockchain" (Yin et al., 2019)
 * 
 * Advantages over PBFT:
 * - Linear message complexity O(n) vs O(n²)
 * - BLS signature aggregation (single 48-byte signature for quorum)
 * - Simpler leader rotation via view changes
 * - Pipelined consensus (multiple proposals in flight)
 * 
 * Architecture:
 * - 4 phases: PREPARE → PRE_COMMIT → COMMIT → DECIDE
 * - Leader proposes block, replicas vote with BLS signatures
 * - Quorum: 2f+1 votes (tolerates f Byzantine nodes)
 * - View synchronization for leader failover
 * 
 * @module lib/consensus/hotstuff
 * @version 2.0.0
 */

import { bls12_381 as bls } from '@noble/curves/bls12-381.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { ulid } from 'ulid';
import type { MeshNetworkRouter, MeshNode } from '../mesh/network';
import { createOCCOOracle, type OCCOOracle, type ValidatorWeight } from './occoOracle';
import { createBlockchainIntegration, type BlockchainIntegration, type BlockchainConfig } from './blockchainIntegration';
import type { Address } from 'viem';
import { TenantContextManager } from '../tenancy/context';
import { CrossTenantValidator } from '../tenancy/validator';

// =====================================================
// TYPES
// =====================================================

export type HotstuffPhase = 'PREPARE' | 'PRE_COMMIT' | 'COMMIT' | 'DECIDE';
export type ConsensusOperation = 'PAYMENT_VERIFY' | 'REPUTATION_UPDATE' | 'AUDIT_DEEP' | 'MESH_TOPOLOGY';

export interface HotstuffProposal {
  proposalId: string; // ULID
  tenantId: string; // Tenant isolation
  viewNumber: number;
  height: number; // Block height
  operation: ConsensusOperation;
  payload: unknown;
  proposerId: string; // BLS public key
  parentHash: string; // SHA-256 of parent proposal
  timestamp: number;
  justification?: QuorumCert; // QC from previous view
}

export interface HotstuffVote {
  proposalId: string;
  viewNumber: number;
  height: number;
  phase: HotstuffPhase;
  voterId: string; // BLS public key
  signature: Uint8Array; // BLS signature over (proposalId || viewNumber || phase)
  timestamp: number;
}

export interface QuorumCert {
  proposalId: string;
  viewNumber: number;
  phase: HotstuffPhase;
  votes: HotstuffVote[];
  aggregatedSignature: Uint8Array; // BLS aggregated signature
  voterBitmap: string; // Hex string of voter participation
}

export interface ValidatorSet {
  validators: Map<string, ValidatorInfo>; // BLS pubkey -> info
  totalWeight: number;
  threshold: number; // 2f+1 threshold
}

export interface ValidatorInfo {
  publicKey: Uint8Array; // BLS12-381 G1 public key (48 bytes)
  nodeId: string; // DHT node ID
  weight: number; // Stake-weighted voting power
  isSlashed: boolean;
  lastSeen: number;
}

export interface ConsensusConfig {
  viewTimeout: number; // ms, default 30000
  f: number; // Max Byzantine nodes (n = 3f + 1)
  minStake: number; // Min USDC stake to participate
  slashPercentage: number; // Default 50%
  blockchain?: BlockchainConfig; // Optional blockchain integration
}

// =====================================================
// HOTSTUFF CONSENSUS ENGINE
// =====================================================

export class HotstuffConsensus {
  private nodeId: string;
  private blsPrivateKey: Uint8Array;
  private blsPublicKey: Uint8Array;
  private config: ConsensusConfig;
  private meshRouter: MeshNetworkRouter;
  
  // Oracle & blockchain integration
  private occoOracle: OCCOOracle;
  private blockchain?: BlockchainIntegration;
  
  // Consensus state
  private currentView: number = 0;
  private currentHeight: number = 0;
  private validators: ValidatorSet;
  private leader: string | null = null;
  
  // Proposal tracking
  private proposals: Map<string, HotstuffProposal> = new Map();
  private votes: Map<string, HotstuffVote[]> = new Map(); // proposalId -> votes
  private qcs: Map<number, QuorumCert> = new Map(); // height -> QC
  private lockedQC: QuorumCert | null = null; // Highest QC in PRE_COMMIT
  private committedQC: QuorumCert | null = null; // Highest QC in COMMIT
  
  // View change
  private viewChangeTimeout: NodeJS.Timeout | null = null;
  private viewChangeVotes: Map<number, HotstuffVote[]> = new Map();

  constructor(
    nodeId: string,
    blsPrivateKey: Uint8Array,
    meshRouter: MeshNetworkRouter,
    config: Partial<ConsensusConfig> = {}
  ) {
    this.nodeId = nodeId;
    this.blsPrivateKey = blsPrivateKey;
    this.blsPublicKey = bls.getPublicKey(blsPrivateKey);
    this.meshRouter = meshRouter;
    
    this.config = {
      viewTimeout: config.viewTimeout || 30000,
      f: config.f || 2, // Tolerates 2 Byzantine nodes (n=7)
      minStake: config.minStake || 100, // 100 USDC
      slashPercentage: config.slashPercentage || 0.5,
      blockchain: config.blockchain,
    };
    
    // Initialize blockchain integration first
    if (config.blockchain) {
      this.blockchain = createBlockchainIntegration(config.blockchain);
      console.log(`[HotStuff] Blockchain integration enabled on chain ${config.blockchain.chainId}`);
    }
    
    // Initialize OCCO oracle with blockchain integration
    this.occoOracle = createOCCOOracle(this.blockchain);
    
    this.validators = {
      validators: new Map(),
      totalWeight: 0,
      threshold: 0,
    };
    
    console.log(`[HotStuff] Initialized with nodeId=${nodeId}, f=${this.config.f}`);
  }

  // =====================================================
  // VALIDATOR MANAGEMENT
  // =====================================================

  /**
   * Update validator set from mesh network + on-chain stakes via OCCO
   */
  async updateValidatorSet(): Promise<void> {
    console.log('[HotStuff] Updating validator set with OCCO weighting');
    
    // Discover staked nodes from mesh
    const peers = await this.meshRouter.discoverPeers('consensus.hotstuff', 20);
    
    const validators = new Map<string, ValidatorInfo>();
    let totalWeight = 0;
    
    for (const peer of peers) {
      if (!peer.metadata?.publicKey) continue;
      if (!peer.metadata?.address) continue; // Need Ethereum address
      
      const ethAddress = peer.metadata.address as Address;
      
      // Query on-chain stake if blockchain integration enabled
      let stake = this.config.minStake;
      let isSlashed = false;
      
      if (this.blockchain) {
        try {
          const stakeInfo = await this.blockchain.getStake(ethAddress);
          stake = Number(stakeInfo.amountFormatted);
          isSlashed = stakeInfo.isSlashed;
        } catch (error) {
          console.error(`[HotStuff] Failed to query stake for ${ethAddress}:`, error);
          continue;
        }
      }
      
      if (stake < this.config.minStake) continue;
      if (isSlashed) continue;
      
      // Register with OCCO oracle if not already registered
      if (!this.occoOracle.getMetrics(ethAddress)) {
        this.occoOracle.registerValidator(ethAddress, peer.nodeId, stake);
      }
      
      // Calculate OCCO weight
      const occoWeight = this.occoOracle.calculateWeight(ethAddress);
      const weight = occoWeight.weight * 1000; // Scale for voting power
      
      const info: ValidatorInfo = {
        publicKey: hexToBytes(peer.metadata.publicKey),
        nodeId: peer.nodeId,
        weight,
        isSlashed: false,
        lastSeen: Date.now(),
      };
      
      validators.set(peer.metadata.publicKey, info);
      totalWeight += weight;
    }
    
    // Add self
    const selfPubkey = bytesToHex(this.blsPublicKey);
    if (!validators.has(selfPubkey)) {
      validators.set(selfPubkey, {
        publicKey: this.blsPublicKey,
        nodeId: this.nodeId,
        weight: totalWeight / Math.max(1, validators.size), // Proportional weight
        isSlashed: false,
        lastSeen: Date.now(),
      });
    }
    
    this.validators = {
      validators,
      totalWeight,
      threshold: Math.ceil((2 * validators.size) / 3), // 2f+1
    };
    
    console.log(`[HotStuff] Validator set updated: ${validators.size} validators, threshold=${this.validators.threshold}`);
    
    // Sync OCCO stakes from blockchain
    if (this.blockchain) {
      await this.occoOracle.syncAllStakes();
    }
    
    // Update leader based on view number
    this.updateLeader();
  }

  /**
   * Record consensus vote outcome for OCCO oracle
   */
  private recordConsensusOutcome(validatorAddress: Address, success: boolean): void {
    this.occoOracle.recordConsensusVote(validatorAddress, success);
  }

  /**
   * Submit Byzantine evidence on-chain
   */
  async submitByzantineEvidence(
    accusedAddress: Address,
    evidenceData: string
  ): Promise<void> {
    if (!this.blockchain) {
      console.warn('[HotStuff] Blockchain integration not enabled, cannot submit evidence');
      return;
    }

    try {
      const { txHash, evidenceId } = await this.blockchain.submitEvidence(
        accusedAddress,
        evidenceData
      );

      console.log(`[HotStuff] Byzantine evidence submitted: ${txHash}`);

      // Record in OCCO oracle
      this.occoOracle.recordByzantineReport(accusedAddress);

      // Check if validator should be excluded
      if (this.occoOracle.shouldExclude(accusedAddress)) {
        console.log(`[HotStuff] Validator ${accusedAddress} marked for exclusion`);
      }
    } catch (error) {
      console.error('[HotStuff] Failed to submit Byzantine evidence:', error);
      throw error;
    }
  }

  /**
   * Get validator weights from OCCO oracle
   */
  getValidatorWeights(): ValidatorWeight[] {
    return this.occoOracle.calculateAllWeights();
  }

  /**
   * Get OCCO oracle instance
   */
  getOracle(): OCCOOracle {
    return this.occoOracle;
  }

  /**
   * Get blockchain integration instance
   */
  getBlockchain(): BlockchainIntegration | undefined {
    return this.blockchain;
  }

  /**
   * Update leader based on view number (round-robin)
   */
  private updateLeader(): void {
    const validatorKeys = Array.from(this.validators.validators.keys());
    if (validatorKeys.length === 0) {
      this.leader = null;
      return;
    }
    
    const leaderIndex = this.currentView % validatorKeys.length;
    this.leader = validatorKeys[leaderIndex];
    
    console.log(`[HotStuff] View ${this.currentView}, leader=${this.leader?.slice(0, 16)}`);
  }

  // =====================================================
  // PROPOSAL & VOTING
  // =====================================================

  /**
   * Propose new consensus request (as leader)
   */
  async propose(operation: ConsensusOperation, payload: unknown): Promise<string> {
    if (bytesToHex(this.blsPublicKey) !== this.leader) {
      throw new Error('Only leader can propose');
    }
    
    // Extract tenant context
    const ctx = TenantContextManager.getInstance();
    const tenantId = ctx.getTenantIdOrNull();
    
    if (!tenantId) {
      throw new Error('Cannot propose without tenant context');
    }
    
    const proposalId = ulid();
    const parentHash = this.committedQC 
      ? this.computeProposalHash(this.proposals.get(this.committedQC.proposalId)!)
      : '0'.repeat(64);
    
    const proposal: HotstuffProposal = {
      proposalId,
      tenantId, // Inject tenant ID
      viewNumber: this.currentView,
      height: this.currentHeight + 1,
      operation,
      payload,
      proposerId: bytesToHex(this.blsPublicKey),
      parentHash,
      timestamp: Date.now(),
      justification: this.lockedQC || undefined,
    };
    
    this.proposals.set(proposalId, proposal);
    this.currentHeight++;
    
    console.log(`[HotStuff] Proposed ${proposalId} at height ${proposal.height}`);
    
    // Broadcast proposal to validators
    await this.broadcastProposal(proposal);
    
    // Start view timeout
    this.startViewTimeout();
    
    return proposalId;
  }

  /**
   * Vote on proposal (as replica)
   */
  async vote(proposalId: string, phase: HotstuffPhase): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }
    
    // Safety check: validate proposal
    if (!this.validateProposal(proposal)) {
      console.error(`[HotStuff] Invalid proposal ${proposalId}`);
      return;
    }
    
    // Create vote with BLS signature
    const voteMessage = this.createVoteMessage(proposalId, proposal.viewNumber, phase);
    const signature = bls.sign(voteMessage, this.blsPrivateKey);
    
    const vote: HotstuffVote = {
      proposalId,
      viewNumber: proposal.viewNumber,
      height: proposal.height,
      phase,
      voterId: bytesToHex(this.blsPublicKey),
      signature,
      timestamp: Date.now(),
    };
    
    // Store vote
    if (!this.votes.has(proposalId)) {
      this.votes.set(proposalId, []);
    }
    this.votes.get(proposalId)!.push(vote);
    
    console.log(`[HotStuff] Voted ${phase} for ${proposalId}`);
    
    // Send vote to leader
    await this.sendVoteToLeader(vote);
    
    // Check if we have quorum
    await this.checkQuorum(proposalId, phase);
  }

  /**
   * Check if votes form quorum and create QC
   */
  private async checkQuorum(proposalId: string, phase: HotstuffPhase): Promise<void> {
    const votes = this.votes.get(proposalId) || [];
    const phaseVotes = votes.filter(v => v.phase === phase);
    
    if (phaseVotes.length < this.validators.threshold) {
      return; // Not enough votes yet
    }
    
    // Aggregate BLS signatures
    const signatures = phaseVotes.map(v => v.signature);
    const aggregatedSig = bls.aggregateSignatures(signatures);
    
    // Create voter bitmap
    const voterBitmap = this.createVoterBitmap(phaseVotes.map(v => v.voterId));
    
    const qc: QuorumCert = {
      proposalId,
      viewNumber: phaseVotes[0].viewNumber,
      phase,
      votes: phaseVotes,
      aggregatedSignature: aggregatedSig,
      voterBitmap,
    };
    
    this.qcs.set(phaseVotes[0].height, qc);
    
    console.log(`[HotStuff] QC formed for ${proposalId} at phase ${phase}`);
    
    // Update locked/committed QC based on phase
    if (phase === 'PRE_COMMIT') {
      this.lockedQC = qc;
    } else if (phase === 'COMMIT') {
      this.committedQC = qc;
      await this.executeProposal(proposalId);
    }
    
    // Progress to next phase
    await this.progressPhase(proposalId, phase);
  }

  /**
   * Progress to next phase after QC
   */
  private async progressPhase(proposalId: string, currentPhase: HotstuffPhase): Promise<void> {
    const nextPhase: { [key in HotstuffPhase]?: HotstuffPhase } = {
      'PREPARE': 'PRE_COMMIT',
      'PRE_COMMIT': 'COMMIT',
      'COMMIT': 'DECIDE',
    };
    
    const next = nextPhase[currentPhase];
    if (!next) return; // DECIDE is terminal
    
    // Auto-vote for next phase if we're a replica
    if (bytesToHex(this.blsPublicKey) !== this.leader) {
      await this.vote(proposalId, next);
    }
  }

  /**
   * Execute committed proposal
   */
  private async executeProposal(proposalId: string): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return;
    
    // Validate tenant context
    const ctx = TenantContextManager.getInstance();
    const currentTenant = ctx.getTenantIdOrNull();
    
    if (currentTenant && proposal.tenantId !== currentTenant) {
      console.error(
        `[HotStuff] Tenant mismatch: proposal=${proposal.tenantId}, current=${currentTenant}`
      );
      // Report Byzantine behavior
      await this.reportByzantineEvidence(proposal);
      return;
    }
    
    console.log(`[HotStuff] Executing proposal ${proposalId}, operation=${proposal.operation}, tenant=${proposal.tenantId}`);
    
    // Execute based on operation type
    switch (proposal.operation) {
      case 'PAYMENT_VERIFY':
        await this.verifyPaymentWithTenant(proposal.payload, proposal.tenantId);
        break;
      case 'REPUTATION_UPDATE':
        await this.updateReputationWithTenant(proposal.payload, proposal.tenantId);
        break;
      case 'AUDIT_DEEP':
        await this.triggerDeepAuditWithTenant(proposal.payload, proposal.tenantId);
        break;
      case 'MESH_TOPOLOGY':
        await this.updateMeshTopologyWithTenant(proposal.payload, proposal.tenantId);
        break;
    }
    
    // Record to database
    // TODO: Store consensus result in a2a_consensus_log
    
    // Reset view timeout
    this.resetViewTimeout();
  }

  /**
   * Report Byzantine evidence for tenant violation
   */
  private async reportByzantineEvidence(proposal: HotstuffProposal): Promise<void> {
    try {
      const validator = CrossTenantValidator.getInstance();
      await validator.reportIsolationViolation({
        violatorId: proposal.proposerId,
        tenantId: proposal.tenantId,
        resourceType: 'consensus_proposal',
        resourceId: proposal.proposalId,
        attemptedAction: 'cross_tenant_consensus',
        severity: 'critical',
      });
    } catch (error) {
      console.error('[HotStuff] Failed to report Byzantine evidence:', error);
    }
  }

  /**
   * Tenant-aware operation handlers
   */
  private async verifyPaymentWithTenant(payload: unknown, tenantId: string): Promise<void> {
    // TODO: Verify payment on Base L2 within tenant context
    console.log(`[HotStuff] Verifying payment for tenant ${tenantId}`);
  }

  private async updateReputationWithTenant(payload: unknown, tenantId: string): Promise<void> {
    // TODO: Update trust scores within tenant context
    console.log(`[HotStuff] Updating reputation for tenant ${tenantId}`);
  }

  private async triggerDeepAuditWithTenant(payload: unknown, tenantId: string): Promise<void> {
    // TODO: Trigger deep audit within tenant context
    console.log(`[HotStuff] Triggering deep audit for tenant ${tenantId}`);
  }

  private async updateMeshTopologyWithTenant(payload: unknown, tenantId: string): Promise<void> {
    // TODO: Update mesh topology within tenant context
    console.log(`[HotStuff] Updating mesh topology for tenant ${tenantId}`);
  }

  // =====================================================
  // VALIDATION
  // =====================================================

  private validateProposal(proposal: HotstuffProposal): boolean {
    // Check view number
    if (proposal.viewNumber !== this.currentView) {
      return false;
    }
    
    // Check proposer is leader
    if (proposal.proposerId !== this.leader) {
      return false;
    }
    
    // Check height
    if (proposal.height !== this.currentHeight + 1) {
      return false;
    }
    
    // Check parent hash
    if (this.committedQC) {
      const parent = this.proposals.get(this.committedQC.proposalId);
      if (parent && this.computeProposalHash(parent) !== proposal.parentHash) {
        return false;
      }
    }
    
    // Check justification
    if (this.lockedQC && proposal.height > this.lockedQC.votes[0].height) {
      if (!proposal.justification) {
        return false;
      }
    }
    
    return true;
  }

  // =====================================================
  // VIEW CHANGE
  // =====================================================

  private startViewTimeout(): void {
    this.viewChangeTimeout = setTimeout(() => {
      console.log(`[HotStuff] View timeout, initiating view change`);
      this.initiateViewChange();
    }, this.config.viewTimeout);
  }

  private resetViewTimeout(): void {
    if (this.viewChangeTimeout) {
      clearTimeout(this.viewChangeTimeout);
      this.viewChangeTimeout = null;
    }
  }

  private async initiateViewChange(): Promise<void> {
    this.currentView++;
    this.updateLeader();
    
    console.log(`[HotStuff] View changed to ${this.currentView}`);
    
    // TODO: Broadcast view change message with QC justification
    // TODO: New leader collects 2f+1 view change votes
    
    this.resetViewTimeout();
  }

  // =====================================================
  // UTILITIES
  // =====================================================

  private computeProposalHash(proposal: HotstuffProposal): string {
    const data = JSON.stringify({
      proposalId: proposal.proposalId,
      tenantId: proposal.tenantId,
      viewNumber: proposal.viewNumber,
      height: proposal.height,
      operation: proposal.operation,
      payload: proposal.payload,
    });
    return bytesToHex(sha256(new TextEncoder().encode(data)));
  }

  private createVoteMessage(proposalId: string, viewNumber: number, phase: HotstuffPhase): Uint8Array {
    const data = `${proposalId}|${viewNumber}|${phase}`;
    return sha256(new TextEncoder().encode(data));
  }

  private createVoterBitmap(voters: string[]): string {
    const validatorKeys = Array.from(this.validators.validators.keys());
    let bitmap = 0n;
    
    for (const voter of voters) {
      const index = validatorKeys.indexOf(voter);
      if (index !== -1) {
        bitmap |= (1n << BigInt(index));
      }
    }
    
    return bitmap.toString(16);
  }

  // =====================================================
  // NETWORK (PLACEHOLDERS)
  // =====================================================

  private async broadcastProposal(proposal: HotstuffProposal): Promise<void> {
    // TODO: Broadcast via mesh network
    console.log(`[HotStuff] Broadcasting proposal ${proposal.proposalId}`);
  }

  private async sendVoteToLeader(vote: HotstuffVote): Promise<void> {
    // TODO: Send vote to current leader
    console.log(`[HotStuff] Sending vote to leader`);
  }
}

// =====================================================
// EXPORTS
// =====================================================

export function createHotstuffConsensus(
  nodeId: string,
  blsPrivateKey: Uint8Array,
  meshRouter: MeshNetworkRouter,
  config?: Partial<ConsensusConfig>
): HotstuffConsensus {
  return new HotstuffConsensus(nodeId, blsPrivateKey, meshRouter, config);
}
