/**
 * Anóteros Trust Middleware
 * THE KILLER FEATURE: Intercepts UAP handshakes and injects cryptographic trust attestations
 * 
 * Verification Flow:
 * 1. Extract DID from HandshakeSYN
 * 2. Query BFT watermark ledger
 * 3. Compute trust score (weighted formula)
 * 4. Generate Ed25519 proof
 * 5. Inject attestation into HandshakeACK
 * 6. OR reject with 403 + detailed reason
 * 
 * @module src/core/trust/middleware
 * @version 1.0.0
 */

import { ed25519 } from '@noble/curves/ed25519.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import type { DIDString, TrustAttestation, UAPMessage, HandshakeSYNPayload } from '../../protocols/uap/types';
import type {
  TrustScoreComponents,
  RejectionDecision,
  AttestationResult,
  VerificationOptions,
  VerificationResult,
} from './types';
import { RejectionReason } from './types';
import { TRUST_CONFIG } from '../../protocols/uap/constants';
import { getLedgerClient, WatermarkLedgerClient } from './ledger';
import { loadUCPTKeypair } from '../../../lib/ucpt/keys';
import { cccLedger } from '../ccc/ledger';

// =====================================================
// TRUST MIDDLEWARE CLASS
// =====================================================

/**
 * Trust Middleware
 * Intercepts UAP messages and injects/verifies trust attestations
 */
export class TrustMiddleware {
  private ledgerClient: WatermarkLedgerClient;
  private signingKey: Uint8Array | null = null;

  constructor(ledgerClient?: WatermarkLedgerClient) {
    this.ledgerClient = ledgerClient || getLedgerClient();
    this.loadKeys();
  }

  /**
   * Load Ed25519 keys for signing trust proofs
   */
  private loadKeys(): void {
    try {
      const keypair = loadUCPTKeypair();
      if (keypair) {
        this.signingKey = keypair.privateKey;
        console.log('[TrustMiddleware] Ed25519 keys loaded');
      } else {
        console.warn('[TrustMiddleware] No signing keys available - trust proofs will fail');
      }
    } catch (error) {
      console.error('[TrustMiddleware] Failed to load keys:', error);
    }
  }

  /**
   * Verify and inject trust attestation into HandshakeSYN
   * This is the core trust layer logic
   * 
   * @returns HandshakeACK with trust attestation OR rejection
   */
  async verifyAndInjectTrust(
    synMessage: UAPMessage<HandshakeSYNPayload>,
    options?: VerificationOptions
  ): Promise<VerificationResult> {
    const startTime = Date.now();
    const agentDid = synMessage.header.senderId;

    console.log(`[TrustMiddleware] Verifying trust for ${agentDid}`);

    try {
      // Step 1: Verify agent in ledger
      const verified = await this.ledgerClient.verify(agentDid);
      
      if (!verified) {
        // Agent not in ledger - REJECT
        const rejection = this.createRejection(
          agentDid,
          RejectionReason.UNVERIFIED_AGENT,
          'Agent has no consensus participation history',
          0
        );

        return {
          verified: false,
          rejection,
          metadata: {
            verificationTime: Date.now() - startTime,
            ledgerQueries: 1,
            cacheHits: 0,
          },
        };
      }

      // Step 2: Get trust history
      const history = await this.ledgerClient.getTrustHistory(agentDid);

      // Step 3: Check for Byzantine behavior
      if (history.byzantineIncidents > 0) {
        const rejection = this.createRejection(
          agentDid,
          RejectionReason.BYZANTINE_BEHAVIOR,
          `Agent has ${history.byzantineIncidents} Byzantine incident(s)`,
          (await this.computeTrustScore(history, agentDid)).finalScore
        );

        return {
          verified: false,
          rejection,
          metadata: {
            verificationTime: Date.now() - startTime,
            ledgerQueries: 2,
            cacheHits: 0,
          },
        };
      }

      // Step 4: Check for slashing
      if (history.slashingEvents > 0) {
        const rejection = this.createRejection(
          agentDid,
          RejectionReason.SLASHED_AGENT,
          `Agent has been slashed ${history.slashingEvents} time(s)`,
          (await this.computeTrustScore(history, agentDid)).finalScore
        );

        return {
          verified: false,
          rejection,
          metadata: {
            verificationTime: Date.now() - startTime,
            ledgerQueries: 2,
            cacheHits: 0,
          },
        };
      }

      // Step 5: Compute trust score (now async with CCC)
      const trustScore = await this.computeTrustScore(history, agentDid);

      // Step 6: Check minimum threshold
      const minScore = options?.minTrustScore || TRUST_CONFIG.MIN_TRUST_SCORE;
      if (trustScore.finalScore < minScore) {
        const rejection = this.createRejection(
          agentDid,
          RejectionReason.LOW_TRUST_SCORE,
          `Trust score ${trustScore.finalScore.toFixed(1)} below threshold ${minScore}`,
          trustScore.finalScore
        );

        return {
          verified: false,
          rejection,
          metadata: {
            verificationTime: Date.now() - startTime,
            ledgerQueries: 2,
            cacheHits: 0,
          },
        };
      }

      // Step 7: Check tenant isolation (if required)
      if (options?.checkTenantIsolation && options.tenantId) {
        const tenantOk = await this.checkTenantIsolation(agentDid, options.tenantId);
        if (!tenantOk) {
          const rejection = this.createRejection(
            agentDid,
            RejectionReason.TENANT_VIOLATION,
            'Tenant isolation policy violation',
            trustScore.finalScore
          );

          return {
            verified: false,
            rejection,
            metadata: {
              verificationTime: Date.now() - startTime,
              ledgerQueries: 3,
              cacheHits: 0,
            },
          };
        }
      }

      // Step 8: Generate trust attestation
      const attestation = await this.generateAttestation(agentDid, history, trustScore);

      console.log(
        `[TrustMiddleware] ✅ Trust verified for ${agentDid} - Score: ${trustScore.finalScore.toFixed(1)}`
      );

      return {
        verified: true,
        attestation,
        metadata: {
          verificationTime: Date.now() - startTime,
          ledgerQueries: 2,
          cacheHits: 0,
        },
      };
    } catch (error) {
      console.error(`[TrustMiddleware] Verification error for ${agentDid}:`, error);

      // Internal error - reject with retry recommendation
      const rejection = this.createRejection(
        agentDid,
        RejectionReason.UNVERIFIED_AGENT,
        'Internal verification error',
        0,
        30_000 // Retry after 30s
      );

      return {
        verified: false,
        rejection,
        metadata: {
          verificationTime: Date.now() - startTime,
          ledgerQueries: 0,
          cacheHits: 0,
        },
      };
    }
  }

  /**
   * Compute trust score from history
   * Weighted formula: 0.35*consensus + 0.25*watermark + 0.15*uptime + 0.10*endorsements + 0.15*causalContribution
   */
  private async computeTrustScore(history: any, agentDid: DIDString): Promise<TrustScoreComponents> {
    // Consensus participation score (0-100)
    const consensusParticipation = Math.min(100, (history.totalRounds / 1000) * 100);

    // Watermark validity score (0-100)
    const watermarkValidity =
      history.validWatermarks > 0
        ? (history.validWatermarks / (history.validWatermarks + history.invalidWatermarks)) * 100
        : 0;

    // Network uptime score (already 0-100)
    const networkUptime = history.uptimePercentage;

    // Peer endorsements score (0-100, assuming max 100 endorsements)
    const peerEndorsements = Math.min(100, history.peerEndorsements);

    // CCC causal contribution score (0-100)
    const causalContribution = await this.computeCCCContributionScore(agentDid);

    // Weighted final score (adjusted weights to total 1.0 with CCC)
    const finalScore =
      0.35 * consensusParticipation +
      0.25 * watermarkValidity +
      0.15 * networkUptime +
      0.10 * peerEndorsements +
      0.15 * causalContribution;

    return {
      consensusParticipation: Math.round(consensusParticipation * 100) / 100,
      watermarkValidity: Math.round(watermarkValidity * 100) / 100,
      networkUptime: Math.round(networkUptime * 100) / 100,
      peerEndorsements: Math.round(peerEndorsements * 100) / 100,
      causalContribution: Math.round(causalContribution * 100) / 100,
      finalScore: Math.round(finalScore * 100) / 100,
      computedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate trust attestation with Ed25519 proof
   * Proof = sign(agentDid + timestamp + trustScore, privateKey)
   */
  private async generateAttestation(
    agentDid: DIDString,
    _history: any,
    scoreComponents: TrustScoreComponents
  ): Promise<AttestationResult> {
    const now = new Date();
    const attestedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + 3600_000).toISOString(); // 1 hour expiry

    // Get latest watermark
    const watermarks = await this.ledgerClient.getWatermarks(agentDid, undefined, undefined, 1);
    const latestWatermark = watermarks[0];

    const consensusRound = latestWatermark?.round || 0;
    const ledgerHash = latestWatermark?.ledgerHash || '';
    const watermarkRef = latestWatermark?.signature || '';

    // Generate Ed25519 proof
    const proof = await this.generateTrustProof(
      agentDid,
      attestedAt,
      scoreComponents.finalScore,
      consensusRound
    );

    return {
      agentDid,
      trustScore: scoreComponents.finalScore,
      components: scoreComponents,
      proof,
      watermark: watermarkRef,
      consensusRound,
      ledgerHash,
      attestedAt,
      expiresAt,
    };
  }

  /**
   * Generate Ed25519 signature for trust proof
   * Message = agentDid || timestamp || trustScore || consensusRound
   */
  private async generateTrustProof(
    agentDid: DIDString,
    timestamp: string,
    trustScore: number,
    consensusRound: number
  ): Promise<string> {
    if (!this.signingKey) {
      throw new Error('Signing key not available');
    }

    // Construct canonical message
    const message = `${agentDid}|${timestamp}|${trustScore.toFixed(2)}|${consensusRound}`;
    const messageBytes = new TextEncoder().encode(message);

    // Sign with Ed25519
    const signature = ed25519.sign(messageBytes, this.signingKey);

    // Return base64url encoded signature
    return bytesToHex(signature);
  }

  /**
   * Verify trust proof signature
   * Used by clients to validate attestations
   */
  async verifyTrustProof(
    attestation: AttestationResult,
    publicKey: Uint8Array
  ): Promise<boolean> {
    try {
      const message = `${attestation.agentDid}|${attestation.attestedAt}|${attestation.trustScore.toFixed(2)}|${attestation.consensusRound}`;
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = hexToBytes(attestation.proof);

      return ed25519.verify(signatureBytes, messageBytes, publicKey);
    } catch (error) {
      console.error('[TrustMiddleware] Proof verification failed:', error);
      return false;
    }
  }

  /**
   * Compute CCC causal contribution score (0-100)
   * 
   * Formula:
   * - Base score from total CCC earned (logarithmic scale)
   * - Bonus for staked CCC (demonstrates commitment)
   * - Bonus for recent activity (last 30 days)
   * - Penalty for low balance (hoarding vs contributing)
   */
  private async computeCCCContributionScore(agentDid: DIDString): Promise<number> {
    try {
      const account = await cccLedger.getAccount(agentDid);
      
      // Base score from lifetime earnings (log scale, 0-40 points)
      // 1000 CCC earned = 30 points, 10000 CCC = 40 points
      const earningsScore = account.totalEarned > 0
        ? Math.min(40, Math.log10(account.totalEarned + 1) * 13.33)
        : 0;

      // Staking bonus (0-30 points)
      // Staking shows commitment to platform
      const stakingScore = Math.min(30, (account.stakedBalance / 100) * 30);

      // Activity bonus (0-20 points)
      // Recent transactions show active participation
      const recentActivity = await this.getRecentCCCActivity(agentDid);
      const activityScore = Math.min(20, recentActivity * 4); // 5+ activities = max

      // Endorsement bonus (0-10 points)
      const endorsementScore = Math.min(10, account.endorsementWeight);

      const totalScore = earningsScore + stakingScore + activityScore + endorsementScore;
      
      return Math.min(100, totalScore);
    } catch (error) {
      console.warn(`[TrustMiddleware] Failed to compute CCC score for ${agentDid}:`, error);
      return 0; // Default to 0 if CCC account doesn't exist
    }
  }

  /**
   * Get count of recent CCC transactions (last 30 days)
   */
  private async getRecentCCCActivity(agentDid: DIDString): Promise<number> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { transactions } = await cccLedger.queryTransactions({
        agentId: agentDid,
        startDate: thirtyDaysAgo,
        limit: 100
      });
      return transactions.length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Create rejection decision
   */
  private createRejection(
    _agentDid: DIDString,
    reason: RejectionReason,
    explanation: string,
    trustScore: number,
    retryAfter?: number
  ): RejectionDecision {
    return {
      rejected: true,
      reason,
      explanation,
      trustScore,
      retryAfter,
    };
  }

  /**
   * Check tenant isolation policy
   * Integrates with existing tenancy system
   */
  private async checkTenantIsolation(
    _agentDid: DIDString, // Reserved for future tenant extraction
    tenantId: string
  ): Promise<boolean> {
    try {
      // Import tenant validator dynamically
      const { validateCrossTenantAccess } = await import('../../../lib/tenancy/validator');

      // validateCrossTenantAccess signature: (targetTenantId, resourceType, operation?)
      // Source tenant is extracted from context automatically
      // TODO: In production, extract agent's tenant from DID and validate cross-tenant access
      const validation = await validateCrossTenantAccess(
        tenantId,
        'mesh_node' // Use closest matching ResourceType for UAP handshakes
      );

      return validation.allowed;
    } catch (error) {
      console.warn('[TrustMiddleware] Tenant isolation check failed:', error);
      // Fail open for now (allow access)
      return true;
    }
  }

  /**
   * Convert attestation to UAP TrustAttestation format
   */
  toUAPAttestation(attestation: AttestationResult): TrustAttestation {
    return {
      trustScore: attestation.trustScore,
      proof: attestation.proof,
      watermark: attestation.watermark,
      consensusRound: attestation.consensusRound,
      ledgerHash: attestation.ledgerHash,
      attestedAt: attestation.attestedAt,
    };
  }

  /**
   * Get ledger client (for testing/debugging)
   */
  getLedgerClient(): WatermarkLedgerClient {
    return this.ledgerClient;
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let middlewareInstance: TrustMiddleware | null = null;

/**
 * Get singleton trust middleware instance
 */
export function getTrustMiddleware(): TrustMiddleware {
  if (!middlewareInstance) {
    middlewareInstance = new TrustMiddleware();
  }
  return middlewareInstance;
}

/**
 * Initialize trust middleware with custom ledger client
 */
export function initTrustMiddleware(ledgerClient?: WatermarkLedgerClient): TrustMiddleware {
  middlewareInstance = new TrustMiddleware(ledgerClient);
  return middlewareInstance;
}

// Exports handled by class declaration above
export default TrustMiddleware;
