/**
 * Temporal Epoch Manager
 * 
 * Manages consensus epochs and enforces temporal ordering of graph commits.
 * Breaks circular dependencies through time-based separation.
 * 
 * @module lib/bft/temporalEpochManager
 * @version 1.0.0
 */

import { createHash } from 'crypto';
import { ed25519 } from '@noble/curves/ed25519.js';
import { bytesToHex, hexToBytes, randomBytes } from '@noble/hashes/utils.js';
import { getSupabaseClient } from '../a2a/supabaseStorage';
import { logger } from '../a2a/logger';
import type {
  EpochCommit,
  GraphCommit,
  CausalGraph,
  ByzantineError,
} from '../../types/byzantine.types';
import { BYZANTINE_PARAMS } from '../../types/byzantine.types';

// =====================================================
// LRU CACHE IMPLEMENTATION
// =====================================================

/**
 * LRU Cache for epoch commits
 */
class EpochCache {
  private cache: Map<number, EpochCommit>;
  private accessOrder: number[];
  private readonly maxSize: number;
  private readonly ttl: number;
  private timestamps: Map<number, number>;
  
  // Cache metrics
  private hits: number = 0;
  private misses: number = 0;
  
  constructor(maxSize: number = BYZANTINE_PARAMS.EPOCH_CACHE_SIZE, ttl: number = BYZANTINE_PARAMS.EPOCH_CACHE_TTL) {
    this.cache = new Map();
    this.accessOrder = [];
    this.timestamps = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }
  
  /**
   * Get epoch commit from cache
   */
  get(epochNumber: number): EpochCommit | null {
    const entry = this.cache.get(epochNumber);
    
    if (!entry) {
      this.misses++;
      return null;
    }
    
    // Check TTL
    const timestamp = this.timestamps.get(epochNumber);
    if (timestamp && Date.now() - timestamp > this.ttl) {
      this.cache.delete(epochNumber);
      this.timestamps.delete(epochNumber);
      this.accessOrder = this.accessOrder.filter(n => n !== epochNumber);
      this.misses++;
      return null;
    }
    
    // Update access order (move to end)
    this.accessOrder = this.accessOrder.filter(n => n !== epochNumber);
    this.accessOrder.push(epochNumber);
    
    this.hits++;
    return entry;
  }
  
  /**
   * Set epoch commit in cache
   */
  set(epochNumber: number, commit: EpochCommit): void {
    // Remove if already exists
    if (this.cache.has(epochNumber)) {
      this.accessOrder = this.accessOrder.filter(n => n !== epochNumber);
    }
    
    // Evict LRU if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(epochNumber)) {
      const lru = this.accessOrder.shift();
      if (lru !== undefined) {
        this.cache.delete(lru);
        this.timestamps.delete(lru);
      }
    }
    
    // Add new entry
    this.cache.set(epochNumber, commit);
    this.timestamps.set(epochNumber, Date.now());
    this.accessOrder.push(epochNumber);
  }
  
  /**
   * Invalidate cache entries from future epochs
   */
  invalidateFutureEpochs(currentEpoch: number): void {
    const toRemove: number[] = [];
    
    for (const epochNumber of this.cache.keys()) {
      if (epochNumber > currentEpoch) {
        toRemove.push(epochNumber);
      }
    }
    
    for (const epochNumber of toRemove) {
      this.cache.delete(epochNumber);
      this.timestamps.delete(epochNumber);
      this.accessOrder = this.accessOrder.filter(n => n !== epochNumber);
    }
    
    if (toRemove.length > 0) {
      logger.debug('Invalidated future epoch cache entries', {
        count: toRemove.length,
        currentEpoch,
      });
    }
  }
  
  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.timestamps.clear();
    this.hits = 0;
    this.misses = 0;
  }
  
  /**
   * Get cache metrics
   */
  getMetrics(): { size: number; hitRate: number; hits: number; misses: number } {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;
    
    return {
      size: this.cache.size,
      hitRate,
      hits: this.hits,
      misses: this.misses,
    };
  }
  
  /**
   * Validate epoch chain integrity
   */
  validateChain(fromEpoch: number, toEpoch: number): boolean {
    if (fromEpoch >= toEpoch) {
      return false;
    }
    
    // Check if we have all epochs in cache
    for (let i = fromEpoch; i <= toEpoch; i++) {
      if (!this.cache.has(i)) {
        return false;
      }
    }
    
    // Verify chain integrity
    for (let i = fromEpoch + 1; i <= toEpoch; i++) {
      const current = this.cache.get(i);
      const previous = this.cache.get(i - 1);
      
      if (!current || !previous) {
        return false;
      }
      
      if (current.previousEpochHash !== previous.graphCommitHash) {
        return false;
      }
    }
    
    return true;
  }
}

// =====================================================
// TEMPORAL EPOCH MANAGER
// =====================================================

/**
 * Temporal Epoch Manager
 * 
 * Manages consensus epochs and enforces temporal ordering.
 */
export class TemporalEpochManager {
  private supabase;
  private cache: EpochCache;
  private privateKey: Uint8Array | null = null;
  private publicKey: Uint8Array | null = null;
  private nodeId: string;
  
  constructor(nodeId: string = 'default-node') {
    this.supabase = getSupabaseClient();
    this.cache = new EpochCache();
    this.nodeId = nodeId;
  }
  
  /**
   * Initialize with Ed25519 key pair
   */
  async initialize(privateKeyHex?: string): Promise<void> {
    if (privateKeyHex) {
      this.privateKey = hexToBytes(privateKeyHex);
      this.publicKey = ed25519.getPublicKey(this.privateKey);
      
      logger.info('TemporalEpochManager initialized with provided key', {
        nodeId: this.nodeId,
        publicKey: bytesToHex(this.publicKey),
      });
    } else {
      // Generate new key pair using randomBytes (32 bytes for Ed25519)
      this.privateKey = randomBytes(32);
      this.publicKey = ed25519.getPublicKey(this.privateKey);
      
      logger.info('TemporalEpochManager initialized with generated key', {
        nodeId: this.nodeId,
        publicKey: bytesToHex(this.publicKey),
      });
    }
  }
  
  /**
   * Create new epoch and freeze current graph state
   * 
   * Requirements: 2.1, 4.3
   */
  async createEpoch(graphState: CausalGraph): Promise<EpochCommit> {
    if (!this.privateKey || !this.publicKey) {
      throw this.createByzantineError(
        'TEMPORAL_ORDERING_VIOLATION',
        'CRITICAL',
        'TemporalEpochManager not initialized with keys'
      );
    }
    
    try {
      // Get the latest epoch number
      const latestEpoch = await this.getLatestEpochNumber();
      const newEpochNumber = latestEpoch + 1;
      
      // Get previous epoch hash
      let previousEpochHash: string;
      if (latestEpoch === 0) {
        // Genesis epoch - use zero hash
        previousEpochHash = '0'.repeat(64);
      } else {
        const previousEpoch = await this.getCommitForEpoch(latestEpoch);
        if (!previousEpoch) {
          throw this.createByzantineError(
            'EPOCH_CHAIN_BROKEN',
            'CRITICAL',
            `Previous epoch ${latestEpoch} not found`
          );
        }
        previousEpochHash = previousEpoch.commitHash;
      }
      
      // Build Merkle root from graph state
      const merkleRoot = this.buildMerkleRoot(graphState);
      
      // Generate commit hash (SHA-256 of Merkle root)
      const graphCommitHash = this.hashData(merkleRoot);
      
      // Create timestamp
      const timestamp = Date.now();
      
      // Create signature message
      const signatureMessage = this.buildSignatureMessage(
        newEpochNumber,
        graphCommitHash,
        previousEpochHash,
        timestamp,
        merkleRoot
      );
      
      // Sign with Ed25519
      const signatureBytes = ed25519.sign(signatureMessage, this.privateKey);
      const signature = bytesToHex(signatureBytes);
      
      // Create epoch commit
      const epochCommit: EpochCommit = {
        epochNumber: newEpochNumber,
        graphCommitHash,
        previousEpochHash,
        timestamp,
        signature,
        merkleRoot,
      };
      
      // Persist to database
      await this.persistEpochCommit(epochCommit, graphState);
      
      // Add to cache
      this.cache.set(newEpochNumber, epochCommit);
      
      // Invalidate future epochs in cache
      this.cache.invalidateFutureEpochs(newEpochNumber);
      
      logger.info('Epoch created', {
        epochNumber: newEpochNumber,
        graphCommitHash,
        nodeCount: graphState.metadata.nodeCount,
        edgeCount: graphState.metadata.edgeCount,
        tags: ['epoch', 'created'],
      });
      
      return epochCommit;
    } catch (error) {
      logger.error('Failed to create epoch', { nodeId: this.nodeId }, error instanceof Error ? error : undefined);
      throw error;
    }
  }
  
  /**
   * Validate temporal ordering
   * 
   * Requirements: 2.2, 2.4
   */
  validateTemporalOrdering(
    currentEpoch: number,
    referencedCommit: GraphCommit
  ): boolean {
    // Referenced commit must be from a prior epoch
    if (referencedCommit.epochNumber >= currentEpoch) {
      logger.warn('Temporal ordering violation: referenced commit is not from prior epoch', {
        currentEpoch,
        referencedEpoch: referencedCommit.epochNumber,
      });
      return false;
    }
    
    // Epoch numbers must be non-negative
    if (referencedCommit.epochNumber < 0 || currentEpoch < 0) {
      logger.warn('Temporal ordering violation: negative epoch number', {
        currentEpoch,
        referencedEpoch: referencedCommit.epochNumber,
      });
      return false;
    }
    
    return true;
  }
  
  /**
   * Get graph commit for a specific epoch
   */
  async getCommitForEpoch(epochNumber: number): Promise<GraphCommit | null> {
    // Check cache first
    const cached = this.cache.get(epochNumber);
    if (cached) {
      return this.epochCommitToGraphCommit(cached);
    }
    
    // Query database
    try {
      const { data, error } = await this.supabase
        .from('bft_epoch_commits')
        .select('*')
        .eq('epoch_number', epochNumber)
        .single();
      
      if (error || !data) {
        return null;
      }
      
      const epochCommit = this.dbRowToEpochCommit(data);
      
      // Add to cache
      this.cache.set(epochNumber, epochCommit);
      
      return this.epochCommitToGraphCommit(epochCommit);
    } catch (error) {
      logger.error('Failed to get commit for epoch', { epochNumber }, error instanceof Error ? error : undefined);
      return null;
    }
  }
  
  /**
   * Verify epoch chain integrity
   */
  async verifyEpochChain(fromEpoch: number, toEpoch: number): Promise<boolean> {
    if (fromEpoch >= toEpoch) {
      return false;
    }
    
    // Try cache first
    if (this.cache.validateChain(fromEpoch, toEpoch)) {
      return true;
    }
    
    // Fetch from database and verify
    try {
      const { data, error } = await this.supabase
        .from('bft_epoch_commits')
        .select('*')
        .gte('epoch_number', fromEpoch)
        .lte('epoch_number', toEpoch)
        .order('epoch_number', { ascending: true });
      
      if (error || !data || data.length !== (toEpoch - fromEpoch + 1)) {
        return false;
      }
      
      // Verify chain integrity
      for (let i = 1; i < data.length; i++) {
        const current = data[i];
        const previous = data[i - 1];
        
        if (current.previous_epoch_hash !== previous.graph_commit_hash) {
          logger.warn('Epoch chain integrity violation', {
            currentEpoch: current.epoch_number,
            previousEpoch: previous.epoch_number,
          });
          return false;
        }
        
        // Verify epoch numbers are monotonically increasing
        if (current.epoch_number !== previous.epoch_number + 1) {
          logger.warn('Epoch numbers not monotonically increasing', {
            currentEpoch: current.epoch_number,
            previousEpoch: previous.epoch_number,
          });
          return false;
        }
      }
      
      // Add verified epochs to cache
      for (const row of data) {
        const epochCommit = this.dbRowToEpochCommit(row);
        this.cache.set(epochCommit.epochNumber, epochCommit);
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to verify epoch chain', { fromEpoch, toEpoch }, error instanceof Error ? error : undefined);
      return false;
    }
  }
  
  /**
   * Get cache metrics
   */
  getCacheMetrics(): { size: number; hitRate: number; hits: number; misses: number } {
    return this.cache.getMetrics();
  }
  
  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================
  
  /**
   * Get latest epoch number from database
   */
  private async getLatestEpochNumber(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('bft_epoch_commits')
        .select('epoch_number')
        .order('epoch_number', { ascending: false })
        .limit(1)
        .single();
      
      if (error || !data) {
        return 0; // Genesis epoch
      }
      
      return data.epoch_number;
    } catch {
      return 0; // Genesis epoch
    }
  }
  
  /**
   * Build Merkle root from graph state
   */
  private buildMerkleRoot(graphState: CausalGraph): string {
    // Collect all node and edge data
    const items: string[] = [];
    
    // Add nodes (sorted by ID for determinism)
    const sortedNodes = Array.from(graphState.nodes.values())
      .sort((a, b) => a.id.localeCompare(b.id));
    
    for (const node of sortedNodes) {
      const nodeData = JSON.stringify({
        id: node.id,
        type: node.type,
        data: node.data,
      });
      items.push(this.hashData(nodeData));
    }
    
    // Add edges (sorted by source then target for determinism)
    const allEdges: Array<{ source: string; edge: any }> = [];
    for (const [source, edges] of graphState.edges.entries()) {
      for (const edge of edges) {
        allEdges.push({ source, edge });
      }
    }
    
    allEdges.sort((a, b) => {
      const sourceCmp = a.source.localeCompare(b.source);
      if (sourceCmp !== 0) return sourceCmp;
      return a.edge.target.localeCompare(b.edge.target);
    });
    
    for (const { edge } of allEdges) {
      const edgeData = JSON.stringify({
        source: edge.source,
        target: edge.target,
        type: edge.type,
      });
      items.push(this.hashData(edgeData));
    }
    
    // Build Merkle tree
    return this.buildMerkleTreeFromHashes(items);
  }
  
  /**
   * Build Merkle tree from leaf hashes
   */
  private buildMerkleTreeFromHashes(hashes: string[]): string {
    if (hashes.length === 0) {
      return this.hashData('');
    }
    
    if (hashes.length === 1) {
      return hashes[0];
    }
    
    // Build tree level by level
    let currentLevel = hashes;
    
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        if (i + 1 < currentLevel.length) {
          // Pair exists
          const combined = currentLevel[i] + currentLevel[i + 1];
          nextLevel.push(this.hashData(combined));
        } else {
          // Odd number - duplicate last hash
          const combined = currentLevel[i] + currentLevel[i];
          nextLevel.push(this.hashData(combined));
        }
      }
      
      currentLevel = nextLevel;
    }
    
    return currentLevel[0];
  }
  
  /**
   * Hash data using SHA-256
   */
  private hashData(data: string): string {
    const hash = createHash('sha256');
    hash.update(data);
    return hash.digest('hex');
  }
  
  /**
   * Build signature message
   */
  private buildSignatureMessage(
    epochNumber: number,
    graphCommitHash: string,
    previousEpochHash: string,
    timestamp: number,
    merkleRoot: string
  ): Uint8Array {
    const message = `${epochNumber}|${graphCommitHash}|${previousEpochHash}|${timestamp}|${merkleRoot}`;
    return new TextEncoder().encode(message);
  }
  
  /**
   * Persist epoch commit to database
   */
  private async persistEpochCommit(
    epochCommit: EpochCommit,
    graphState: CausalGraph
  ): Promise<void> {
    const { error } = await this.supabase
      .from('bft_epoch_commits')
      .insert({
        epoch_number: epochCommit.epochNumber,
        graph_commit_hash: epochCommit.graphCommitHash,
        previous_epoch_hash: epochCommit.previousEpochHash,
        merkle_root: epochCommit.merkleRoot,
        node_count: graphState.metadata.nodeCount,
        edge_count: graphState.metadata.edgeCount,
        signature: epochCommit.signature,
        created_at: new Date(epochCommit.timestamp).toISOString(),
      });
    
    if (error) {
      throw this.createByzantineError(
        'TEMPORAL_ORDERING_VIOLATION',
        'CRITICAL',
        `Failed to persist epoch commit: ${error.message}`
      );
    }
  }
  
  /**
   * Convert database row to EpochCommit
   */
  private dbRowToEpochCommit(row: any): EpochCommit {
    return {
      epochNumber: row.epoch_number,
      graphCommitHash: row.graph_commit_hash,
      previousEpochHash: row.previous_epoch_hash,
      timestamp: new Date(row.created_at).getTime(),
      signature: row.signature,
      merkleRoot: row.merkle_root,
    };
  }
  
  /**
   * Convert EpochCommit to GraphCommit
   */
  private epochCommitToGraphCommit(epochCommit: EpochCommit): GraphCommit {
    return {
      commitHash: epochCommit.graphCommitHash,
      epochNumber: epochCommit.epochNumber,
      nodeCount: 0, // Will be populated from database if needed
      edgeCount: 0, // Will be populated from database if needed
      merkleRoot: epochCommit.merkleRoot,
      createdAt: new Date(epochCommit.timestamp),
      signature: epochCommit.signature,
    };
  }
  
  /**
   * Create Byzantine error
   */
  private createByzantineError(
    type: string,
    severity: string,
    message: string
  ): ByzantineError {
    const error = new Error(message) as ByzantineError;
    error.type = type as any;
    error.severity = severity as any;
    error.nodeId = this.nodeId;
    return error;
  }
}

