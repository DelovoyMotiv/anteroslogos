/**
 * Anóteros Watermark Ledger Client
 * Interfaces with BFT consensus to verify agent trust history
 * 
 * @module src/core/trust/ledger
 * @version 1.0.0
 */

import type { DIDString } from '../../protocols/uap/types';
import type {
  WatermarkRecord,
  TrustHistory,
  LedgerQueryParams,
  LedgerQueryResult,
} from './types';
import { PBFTConsensus } from '../../../lib/bft/pbftConsensus';

// =====================================================
// LEDGER CLIENT
// =====================================================

/**
 * Watermark Ledger Client
 * Queries BFT consensus for agent trust data
 */
export class WatermarkLedgerClient {
  private consensusNode: PBFTConsensus | null = null;
  private cache: Map<string, LedgerQueryResult> = new Map();
  private readonly CACHE_TTL = 60_000; // 1 minute

  constructor(
    private readonly nodeId: string
    // consensusConfig reserved for future use (f, viewTimeout tuning)
  ) {
    console.log(`[WatermarkLedger] Initialized for node: ${nodeId}`);
  }

  /**
   * Initialize connection to BFT consensus
   * Lazy initialization on first query
   */
  private async ensureConsensusNode(): Promise<PBFTConsensus> {
    if (this.consensusNode) {
      return this.consensusNode;
    }

    // Initialize PBFT consensus node
    // Note: consensusConfig (f, viewTimeout) reserved for future consensus tuning

    // Create minimal mock router for read-only consensus queries
    const mockRouter = {
      localAidUri: `aid:mesh:${this.nodeId}`,
      localNodeId: this.nodeId,
    } as any; // Minimal interface for read-only ledger access

    // PBFTConsensus signature: (nodeId, meshRouter, storage?, causalGraph?)
    this.consensusNode = new PBFTConsensus(
      this.nodeId,
      mockRouter
    );

    // Initialize without starting (read-only mode)
    console.log('[WatermarkLedger] Consensus node initialized (read-only)');

    return this.consensusNode;
  }

  /**
   * Verify agent exists in watermark ledger
   * Returns true if agent has participated in consensus
   */
  async verify(agentDid: DIDString): Promise<boolean> {
    try {
      const result = await this.queryLedger({ agentDid, limit: 1 });
      return result.watermarks.length > 0 && result.history.totalRounds > 0;
    } catch (error) {
      console.error(`[WatermarkLedger] Verification failed for ${agentDid}:`, error);
      return false;
    }
  }

  /**
   * Get agent trust history from consensus ledger
   * Aggregates watermark data into trust metrics
   */
  async getTrustHistory(agentDid: DIDString): Promise<TrustHistory> {
    const result = await this.queryLedger({ agentDid, includeInvalid: true });
    return result.history;
  }

  /**
   * Get watermark records for agent
   * Returns chronological list of consensus participation
   */
  async getWatermarks(
    agentDid: DIDString,
    fromRound?: number,
    toRound?: number,
    limit: number = 100
  ): Promise<WatermarkRecord[]> {
    const result = await this.queryLedger({
      agentDid,
      fromRound,
      toRound,
      limit,
      includeInvalid: false,
    });
    return result.watermarks;
  }

  /**
   * Query ledger with caching
   * Returns watermarks and aggregated history
   */
  async queryLedger(params: LedgerQueryParams): Promise<LedgerQueryResult> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(params);

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - startTime < this.CACHE_TTL) {
      console.log(`[WatermarkLedger] Cache hit for ${params.agentDid}`);
      return {
        ...cached,
        metadata: {
          ...cached.metadata,
          cacheHit: true,
        },
      };
    }

    // Query consensus node
    const consensusNode = await this.ensureConsensusNode();
    const watermarks = await this.fetchWatermarksFromConsensus(
      consensusNode,
      params
    );

    // Compute trust history
    const history = this.computeTrustHistory(params.agentDid, watermarks);

    const result: LedgerQueryResult = {
      agentDid: params.agentDid,
      watermarks,
      history,
      metadata: {
        totalRecords: watermarks.length,
        queryTime: Date.now() - startTime,
        cacheHit: false,
      },
    };

    // Cache result
    this.cache.set(cacheKey, result);

    // Cleanup old cache entries
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    console.log(
      `[WatermarkLedger] Queried ${watermarks.length} watermarks for ${params.agentDid} in ${result.metadata.queryTime}ms`
    );

    return result;
  }

  /**
   * Fetch watermarks from PBFT consensus
   * Queries committed blocks for agent signatures
   */
  private async fetchWatermarksFromConsensus(
    node: PBFTConsensus,
    params: LedgerQueryParams
  ): Promise<WatermarkRecord[]> {
    const watermarks: WatermarkRecord[] = [];

    try {
      // Get committed blocks from consensus
      const state = (node as any).getState?.() || {};
      const committedBlocks = state.committedBlocks || [];

      // Filter blocks by round range
      const relevantBlocks = committedBlocks.filter((block: any) => {
        if (params.fromRound && block.viewNumber < params.fromRound) return false;
        if (params.toRound && block.viewNumber > params.toRound) return false;
        return true;
      });

      // Extract watermarks for this agent
      for (const block of relevantBlocks.slice(0, params.limit || 100)) {
        // Check if agent participated in this round
        const votes = block.votes || [];
        const agentVote = votes.find((v: any) => v.nodeId === params.agentDid);

        if (agentVote) {
          watermarks.push({
            agentDid: params.agentDid,
            round: block.viewNumber,
            blockHash: block.hash || '',
            signature: agentVote.signature || '',
            timestamp: new Date(block.timestamp || Date.now()).toISOString(),
            voteType: this.mapVoteType(agentVote.phase),
            valid: agentVote.valid !== false,
            ledgerHash: block.stateHash || '',
          });
        }
      }

      // Sort by round (descending)
      watermarks.sort((a, b) => b.round - a.round);

      // Apply limit
      return watermarks.slice(0, params.limit || 100);
    } catch (error) {
      console.error('[WatermarkLedger] Failed to fetch from consensus:', error);
      // Return empty result rather than failing completely
      return [];
    }
  }

  /**
   * Map PBFT phase to watermark vote type
   */
  private mapVoteType(
    phase: string
  ): 'PREPARE' | 'COMMIT' | 'VIEW_CHANGE' {
    switch (phase?.toUpperCase()) {
      case 'PREPARE':
        return 'PREPARE';
      case 'COMMIT':
        return 'COMMIT';
      case 'VIEW_CHANGE':
      case 'VIEW-CHANGE':
        return 'VIEW_CHANGE';
      default:
        return 'PREPARE';
    }
  }

  /**
   * Compute trust history from watermarks
   * Aggregates metrics for trust score calculation
   */
  private computeTrustHistory(
    agentDid: DIDString,
    watermarks: WatermarkRecord[]
  ): TrustHistory {
    if (watermarks.length === 0) {
      // New agent with no history
      return {
        agentDid,
        totalRounds: 0,
        validWatermarks: 0,
        invalidWatermarks: 0,
        byzantineIncidents: 0,
        uptimePercentage: 0,
        peerEndorsements: 0,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        slashingEvents: 0,
      };
    }

    const validWatermarks = watermarks.filter(w => w.valid).length;
    const invalidWatermarks = watermarks.filter(w => !w.valid).length;

    // Detect Byzantine behavior patterns
    const byzantineIncidents = this.detectByzantinePatterns(watermarks);

    // Calculate uptime based on participation consistency
    const uptimePercentage = this.calculateUptime(watermarks);

    // Get endorsement count (from peer reputation if available)
    const peerEndorsements = this.getPeerEndorsements(agentDid);

    return {
      agentDid,
      totalRounds: watermarks.length,
      validWatermarks,
      invalidWatermarks,
      byzantineIncidents,
      uptimePercentage,
      peerEndorsements,
      firstSeen: watermarks[watermarks.length - 1]?.timestamp || new Date().toISOString(),
      lastSeen: watermarks[0]?.timestamp || new Date().toISOString(),
      slashingEvents: this.getSlashingEvents(agentDid),
    };
  }

  /**
   * Detect Byzantine behavior patterns
   * Returns count of suspicious incidents
   */
  private detectByzantinePatterns(watermarks: WatermarkRecord[]): number {
    let incidents = 0;

    // Pattern 1: Multiple invalid watermarks in sequence
    let consecutiveInvalid = 0;
    for (const wm of watermarks) {
      if (!wm.valid) {
        consecutiveInvalid++;
        if (consecutiveInvalid >= 3) {
          incidents++;
          consecutiveInvalid = 0;
        }
      } else {
        consecutiveInvalid = 0;
      }
    }

    // Pattern 2: Conflicting votes in same round (if detectable)
    const roundVotes = new Map<number, WatermarkRecord[]>();
    for (const wm of watermarks) {
      if (!roundVotes.has(wm.round)) {
        roundVotes.set(wm.round, []);
      }
      roundVotes.get(wm.round)!.push(wm);
    }

    for (const [_round, votes] of roundVotes) {
      if (votes.length > 1) {
        // Multiple votes in same round = potential equivocation
        incidents++;
      }
    }

    return incidents;
  }

  /**
   * Calculate uptime percentage
   * Based on participation consistency over time
   */
  private calculateUptime(watermarks: WatermarkRecord[]): number {
    if (watermarks.length === 0) return 0;

    // Get time range
    const firstSeen = new Date(watermarks[watermarks.length - 1].timestamp).getTime();
    const lastSeen = new Date(watermarks[0].timestamp).getTime();
    const totalTime = lastSeen - firstSeen;

    if (totalTime === 0) return 100;

    // Expected rounds = total time / average block time (assume 10s)
    const expectedRounds = totalTime / 10_000;
    const actualRounds = watermarks.length;

    // Uptime = actual participation / expected participation
    const uptime = Math.min(100, (actualRounds / expectedRounds) * 100);
    return Math.round(uptime * 100) / 100;
  }

  /**
   * Get peer endorsement count
   * Query reputation system if available
   */
  private getPeerEndorsements(_agentDid: DIDString): number {
    // TODO: Integrate with reputation system when available
    // For now, return 0 (neutral)
    return 0;
  }

  /**
   * Get slashing event count
   * Query slashing contract if available
   */
  private getSlashingEvents(_agentDid: DIDString): number {
    // TODO: Integrate with ReputationSlashing contract
    // For now, return 0
    return 0;
  }

  /**
   * Generate cache key from query params
   */
  private getCacheKey(params: LedgerQueryParams): string {
    return `${params.agentDid}:${params.fromRound || 0}:${params.toRound || 'latest'}:${params.limit || 100}`;
  }

  /**
   * Clear cache (admin function)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[WatermarkLedger] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; ttl: number } {
    return {
      size: this.cache.size,
      ttl: this.CACHE_TTL,
    };
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let ledgerInstance: WatermarkLedgerClient | null = null;

/**
 * Get singleton ledger client instance
 */
export function getLedgerClient(): WatermarkLedgerClient {
  if (!ledgerInstance) {
    const nodeId = process.env.AGENT_AID || 'did:aid:anoteroslogos';
    ledgerInstance = new WatermarkLedgerClient(nodeId);
  }
  return ledgerInstance;
}

/**
 * Initialize ledger client with custom node ID
 */
export function initLedgerClient(
  nodeId: string
  // config reserved for future use
): WatermarkLedgerClient {
  ledgerInstance = new WatermarkLedgerClient(nodeId);
  return ledgerInstance;
}

// Exports handled by class declaration above
export default WatermarkLedgerClient;
