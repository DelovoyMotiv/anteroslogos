/**
 * Causal Consensus Oracle (CCO)
 * Dynamic quorum weighting based on provenance paths
 * 
 * Integrates Causal Citation Tracer with PBFT consensus:
 * - Nodes with deeper provenance paths receive higher weight
 * - E-E-A-T nodes in path boost credibility
 * - Freshness of knowledge contributes to weight
 * 
 * Enhanced with temporal ordering and Merkle proof verification:
 * - Epoch-based graph state isolation
 * - Cryptographic integrity verification
 * - Cache invalidation for temporal consistency
 * 
 * @module lib/bft/causalWeightOracle
 * @version 2.0.0
 */

import { traceCitationPath } from '../causalTracer/engine';
import type { CausalGraph, CausalPath } from '../../types/causalTracer.types';
import type { GraphCommit, MerkleProof } from '../../types/byzantine.types';
import { TemporalEpochManager } from './temporalEpochManager';
import { MerkleProofSystem } from './merkleProofSystem';
import { logger } from '../a2a/logger';

// =====================================================
// IN-MEMORY LRU CACHE
// =====================================================

interface CacheEntry {
  weight: number;
  timestamp: number;
  epochNumber?: number; // Epoch number for temporal validation
}

interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  avgCalculationTimeMs: number;
}

class LRUCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly maxSize: number;
  private readonly ttl: number;
  private lockMap: Map<string, Promise<number>> = new Map(); // For concurrent access
  
  // Telemetry
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    avgCalculationTimeMs: 0,
  };
  private calculationTimes: number[] = [];

  constructor(maxSize: number = 10000, ttl: number = 30000) {
    this.maxSize = maxSize;
    this.ttl = ttl; // 30 seconds
  }

  get(key: string, currentEpoch?: number): number | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.metrics.misses++;
      return null;
    }
    
    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.metrics.misses++;
      return null;
    }
    
    // Validate epoch if provided
    if (currentEpoch !== undefined && entry.epochNumber !== undefined) {
      // Cache entry must be from a prior or same epoch
      if (entry.epochNumber > currentEpoch) {
        this.cache.delete(key);
        this.metrics.misses++;
        return null;
      }
    }
    
    this.metrics.hits++;
    
    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.weight;
  }

  set(key: string, weight: number, epochNumber?: number): void {
    const now = Date.now();
    
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
        this.metrics.evictions++;
      }
    }
    
    this.cache.set(key, { weight, timestamp: now, epochNumber });
  }
  
  /**
   * Invalidate cache entries from future epochs
   */
  invalidateFutureEpochs(currentEpoch: number): void {
    const toDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.epochNumber !== undefined && entry.epochNumber > currentEpoch) {
        toDelete.push(key);
      }
    }
    
    for (const key of toDelete) {
      this.cache.delete(key);
    }
    
    if (toDelete.length > 0) {
      logger.debug('Invalidated future epoch cache entries', {
        count: toDelete.length,
        currentEpoch,
      });
    }
  }
  
  recordCalculationTime(ms: number): void {
    this.calculationTimes.push(ms);
    if (this.calculationTimes.length > 100) {
      this.calculationTimes.shift(); // Keep last 100
    }
    this.metrics.avgCalculationTimeMs = 
      this.calculationTimes.reduce((a, b) => a + b, 0) / this.calculationTimes.length;
  }
  
  getMetrics(): CacheMetrics & { hitRate: number; size: number } {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      ...this.metrics,
      hitRate: total > 0 ? this.metrics.hits / total : 0,
      size: this.cache.size,
    };
  }
  
  async getOrCompute(
    key: string, 
    computeFn: () => Promise<number>,
    epochNumber?: number,
    currentEpoch?: number
  ): Promise<number> {
    // Check cache first with epoch validation
    const cached = this.get(key, currentEpoch);
    if (cached !== null) return cached;
    
    // Check if already computing (prevent duplicate work)
    const existingLock = this.lockMap.get(key);
    if (existingLock) return existingLock;
    
    // Compute with lock
    const promise = (async () => {
      try {
        const result = await computeFn();
        this.set(key, result, epochNumber);
        return result;
      } finally {
        this.lockMap.delete(key);
      }
    })();
    
    this.lockMap.set(key, promise);
    return promise;
  }
}

const cacheInstance = new LRUCache();

// Singleton instances for temporal ordering and Merkle proofs
let epochManagerInstance: TemporalEpochManager | null = null;
let merkleProofSystemInstance: MerkleProofSystem | null = null;

/**
 * Initialize the enhanced causal weight oracle with temporal ordering support
 */
export async function initializeEnhancedOracle(
  nodeId: string = 'default-node',
  privateKeyHex?: string
): Promise<void> {
  epochManagerInstance = new TemporalEpochManager(nodeId);
  await epochManagerInstance.initialize(privateKeyHex);
  merkleProofSystemInstance = new MerkleProofSystem();
  
  logger.info('Enhanced Causal Weight Oracle initialized', {
    nodeId,
    temporalOrdering: true,
    merkleProofs: true,
  });
}

/**
 * Get epoch manager instance
 */
function getEpochManager(): TemporalEpochManager {
  if (!epochManagerInstance) {
    throw new Error('Enhanced Oracle not initialized. Call initializeEnhancedOracle() first.');
  }
  return epochManagerInstance;
}

/**
 * Get Merkle proof system instance
 */
function getMerkleProofSystem(): MerkleProofSystem {
  if (!merkleProofSystemInstance) {
    merkleProofSystemInstance = new MerkleProofSystem();
  }
  return merkleProofSystemInstance;
}

// =====================================================
// CAUSAL WEIGHT CALCULATION
// =====================================================

/**
 * Calculate provenance score for a causal path
 * 
 * Score = (E-E-A-T nodes × 0.6) + (freshness × 0.4)
 * 
 * @param path Causal path from tracer
 * @returns Provenance score 0-1
 */
function calculateProvenanceScore(path: CausalPath): number {
  // Count E-E-A-T nodes (authority, evidence types)
  const eeatNodeCount = path.nodes.filter(node => 
    node.type === 'authority' || 
    node.type === 'evidence' ||
    node.eeatScore >= 7 // High E-E-A-T threshold
  ).length;
  
  const eeatRatio = eeatNodeCount / path.nodes.length;
  
  // Freshness score: inverse of average node age (days)
  const avgFreshness = path.nodes.reduce((sum, n) => sum + n.freshness, 0) / path.nodes.length;
  const freshnessScore = Math.max(0, 1 - (avgFreshness / 365)); // 1 year normalization
  
  return eeatRatio * 0.6 + freshnessScore * 0.4;
}

/**
 * Calculate causal weight for a node based on provenance path
 * 
 * Legacy method - does not use temporal ordering.
 * For new code, use calculateWeightWithEpoch() instead.
 * 
 * @param nodeId Node identifier
 * @param referenceEntity Knowledge entity to trace path to
 * @param graph Optional causal graph (if not provided, fetch from registry)
 * @returns Causal weight 0-1
 */
export async function calculateCausalWeight(
  nodeId: string,
  referenceEntity: string,
  graph?: CausalGraph
): Promise<number> {
  const cacheKey = `${nodeId}:${referenceEntity}`;
  
  // Use thread-safe getOrCompute
  return cacheInstance.getOrCompute(cacheKey, async () => {
    const startTime = performance.now();
    
    try {
      // Validate graph availability
      if (!graph) {
        console.warn(`[CCO] No causal graph available for ${nodeId}`);
        return 0;
      }
      
      // Validate graph structure
      if (graph.nodeCount === 0 || graph.edgeCount === 0) {
        console.warn(`[CCO] Empty graph for ${nodeId}`);
        return 0;
      }
      
      // Validate reference entity exists in graph (either as node or in labels)
      const hasReferenceEntity = Array.from(graph.nodes.values()).some(
        n => n.label.toLowerCase().includes(referenceEntity.toLowerCase()) ||
             n.id === referenceEntity
      );
      
      if (!hasReferenceEntity) {
        console.warn(`[CCO] Reference entity '${referenceEntity}' not found in graph`);
        return 0;
      }
      
      // Trace path from reference entity
      const result = await traceCitationPath(
        referenceEntity,
        graph,
        [],
        { maxPathLength: 10, maxPathsToExplore: 100 }
      );
      
      if (!result.topPath || result.paths.length === 0) {
        return 0;
      }
      
      const topPath = result.topPath;
      
      // Find maximum observed path length across all paths
      const maxObservedPathLength = Math.max(...result.paths.map(p => p.length));
      
      // Normalize path length: longer paths = more provenance
      const normalizedPathLength = maxObservedPathLength > 0 
        ? topPath.length / maxObservedPathLength 
        : 0;
      
      // Calculate provenance score
      const provenanceScore = calculateProvenanceScore(topPath);
      
      // Final causal weight
      const causalWeight = normalizedPathLength * provenanceScore;
      
      return causalWeight;
      
    } catch (error) {
      console.error(`[CCO] Error calculating causal weight for ${nodeId}:`, error);
      return 0;
    } finally {
      const elapsed = performance.now() - startTime;
      cacheInstance.recordCalculationTime(elapsed);
    }
  });
}

/**
 * Calculate causal weight using specific epoch's graph state
 * 
 * This method enforces temporal ordering by using only graph commits
 * from epochs prior to the current consensus round.
 * 
 * Requirements: 2.2
 * 
 * @param nodeId Node identifier
 * @param referenceEntity Knowledge entity to trace path to
 * @param epochNumber Epoch number to use for graph state
 * @param currentEpoch Current consensus epoch (for validation)
 * @param graph Optional causal graph (if not provided, fetch from epoch commit)
 * @returns Causal weight 0-1
 */
export async function calculateWeightWithEpoch(
  nodeId: string,
  referenceEntity: string,
  epochNumber: number,
  currentEpoch: number,
  graph?: CausalGraph
): Promise<number> {
  // Validate temporal ordering: epoch must be prior to current consensus round
  if (epochNumber >= currentEpoch) {
    logger.warn('Temporal ordering violation: epoch is not prior to current consensus round', {
      epochNumber,
      currentEpoch,
      nodeId,
    });
    throw new Error(
      `Temporal ordering violation: epoch ${epochNumber} must be < current epoch ${currentEpoch}`
    );
  }
  
  // Validate epoch numbers are non-negative
  if (epochNumber < 0 || currentEpoch < 0) {
    logger.warn('Invalid epoch numbers: must be non-negative', {
      epochNumber,
      currentEpoch,
      nodeId,
    });
    throw new Error('Epoch numbers must be non-negative');
  }
  
  const cacheKey = `${nodeId}:${referenceEntity}:epoch${epochNumber}`;
  
  // Use thread-safe getOrCompute with epoch tracking
  return cacheInstance.getOrCompute(
    cacheKey,
    async () => {
      const startTime = performance.now();
      
      try {
        // If graph not provided, fetch from epoch commit
        const graphToUse = graph;
        if (!graphToUse) {
          const epochManager = getEpochManager();
          const graphCommit = await epochManager.getCommitForEpoch(epochNumber);
          
          if (!graphCommit) {
            logger.warn('Graph commit not found for epoch', {
              epochNumber,
              nodeId,
            });
            return 0;
          }
          
          // In a real implementation, we would fetch the actual graph state
          // from storage using the commit hash. For now, we'll require
          // the graph to be provided.
          logger.warn('Graph must be provided when using epoch-based calculation', {
            epochNumber,
            nodeId,
          });
          return 0;
        }
        
        // Validate graph availability
        if (graphToUse.nodeCount === 0 || graphToUse.edgeCount === 0) {
          logger.warn('Empty graph for epoch', {
            epochNumber,
            nodeId,
          });
          return 0;
        }
        
        // Validate reference entity exists in graph
        const hasReferenceEntity = Array.from(graphToUse.nodes.values()).some(
          n => n.label.toLowerCase().includes(referenceEntity.toLowerCase()) ||
               n.id === referenceEntity
        );
        
        if (!hasReferenceEntity) {
          logger.warn('Reference entity not found in graph', {
            referenceEntity,
            epochNumber,
            nodeId,
          });
          return 0;
        }
        
        // Trace path from reference entity
        const result = await traceCitationPath(
          referenceEntity,
          graphToUse,
          [],
          { maxPathLength: 10, maxPathsToExplore: 100 }
        );
        
        if (!result.topPath || result.paths.length === 0) {
          return 0;
        }
        
        const topPath = result.topPath;
        
        // Find maximum observed path length across all paths
        const maxObservedPathLength = Math.max(...result.paths.map(p => p.length));
        
        // Normalize path length: longer paths = more provenance
        const normalizedPathLength = maxObservedPathLength > 0 
          ? topPath.length / maxObservedPathLength 
          : 0;
        
        // Calculate provenance score
        const provenanceScore = calculateProvenanceScore(topPath);
        
        // Final causal weight
        const causalWeight = normalizedPathLength * provenanceScore;
        
        logger.debug('Calculated causal weight with epoch', {
          nodeId,
          referenceEntity,
          epochNumber,
          currentEpoch,
          causalWeight,
        });
        
        return causalWeight;
        
      } catch (error) {
        logger.error('Error calculating causal weight with epoch', {
          nodeId,
          epochNumber,
          currentEpoch,
        }, error instanceof Error ? error : undefined);
        return 0;
      } finally {
        const elapsed = performance.now() - startTime;
        cacheInstance.recordCalculationTime(elapsed);
      }
    },
    epochNumber,
    currentEpoch
  );
}

/**
 * Verify weight calculation with Merkle proof
 * 
 * Verifies Merkle proofs for all nodes in the provenance path to ensure
 * cryptographic integrity of the weight calculation.
 * 
 * Requirements: 4.2
 * 
 * @param nodeId Node identifier
 * @param weight Calculated weight to verify
 * @param proofs Merkle proofs for nodes in provenance path
 * @param graphCommit Graph commit containing Merkle root
 * @returns True if all proofs are valid
 */
export function verifyWeightCalculation(
  nodeId: string,
  weight: number,
  proofs: MerkleProof[],
  graphCommit: GraphCommit
): boolean {
  try {
    const merkleSystem = getMerkleProofSystem();
    
    // Verify all proofs against the graph commit's Merkle root
    const results = merkleSystem.batchVerifyProofs(proofs, graphCommit.merkleRoot);
    
    // All proofs must be valid
    const allValid = results.every(result => result === true);
    
    if (!allValid) {
      logger.warn('Merkle proof verification failed', {
        nodeId,
        weight,
        epochNumber: graphCommit.epochNumber,
        validProofs: results.filter(r => r).length,
        totalProofs: results.length,
      });
    } else {
      logger.debug('Merkle proof verification succeeded', {
        nodeId,
        weight,
        epochNumber: graphCommit.epochNumber,
        proofsVerified: proofs.length,
      });
    }
    
    return allValid;
  } catch (error) {
    logger.error('Error verifying weight calculation', {
      nodeId,
      weight,
      epochNumber: graphCommit.epochNumber,
    }, error instanceof Error ? error : undefined);
    return false;
  }
}

/**
 * Get cached weight with epoch validation
 * 
 * Retrieves cached weight and validates it against the current epoch.
 * Cache entries from future epochs are invalidated.
 * 
 * Requirements: 2.2
 * 
 * @param nodeId Node identifier
 * @param referenceEntity Knowledge entity
 * @param currentEpoch Current consensus epoch
 * @returns Cached weight or null if not found/invalid
 */
export function getCachedWeight(
  nodeId: string,
  referenceEntity: string,
  currentEpoch: number
): number | null {
  const cacheKey = `${nodeId}:${referenceEntity}`;
  
  // Get with epoch validation
  const weight = cacheInstance.get(cacheKey, currentEpoch);
  
  if (weight !== null) {
    logger.debug('Cache hit with epoch validation', {
      nodeId,
      referenceEntity,
      currentEpoch,
      weight,
    });
  }
  
  return weight;
}

/**
 * Invalidate cache entries from future epochs
 * 
 * Called when epoch transitions occur to ensure temporal consistency.
 * 
 * @param currentEpoch Current consensus epoch
 */
export function invalidateFutureEpochs(currentEpoch: number): void {
  cacheInstance.invalidateFutureEpochs(currentEpoch);
  
  logger.info('Invalidated future epoch cache entries', {
    currentEpoch,
  });
}

/**
 * Get cache metrics for monitoring
 */
export function getCCOMetrics(): CacheMetrics & { hitRate: number; size: number } {
  return cacheInstance.getMetrics();
}
