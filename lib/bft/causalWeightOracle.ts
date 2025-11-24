/**
 * Causal Consensus Oracle (CCO)
 * Dynamic quorum weighting based on provenance paths
 * 
 * Integrates Causal Citation Tracer with PBFT consensus:
 * - Nodes with deeper provenance paths receive higher weight
 * - E-E-A-T nodes in path boost credibility
 * - Freshness of knowledge contributes to weight
 * 
 * @module lib/bft/causalWeightOracle
 * @version 1.0.0
 */

import { traceCitationPath } from '../causalTracer/engine';
import type { CausalGraph, CausalPath } from '../../types/causalTracer.types';

// =====================================================
// IN-MEMORY LRU CACHE
// =====================================================

interface CacheEntry {
  weight: number;
  timestamp: number;
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

  get(key: string): number | null {
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
    
    this.metrics.hits++;
    
    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.weight;
  }

  set(key: string, weight: number): void {
    const now = Date.now();
    
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
        this.metrics.evictions++;
      }
    }
    
    this.cache.set(key, { weight, timestamp: now });
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
  
  async getOrCompute(key: string, computeFn: () => Promise<number>): Promise<number> {
    // Check cache first
    const cached = this.get(key);
    if (cached !== null) return cached;
    
    // Check if already computing (prevent duplicate work)
    const existingLock = this.lockMap.get(key);
    if (existingLock) return existingLock;
    
    // Compute with lock
    const promise = (async () => {
      try {
        const result = await computeFn();
        this.set(key, result);
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
 * Get cache metrics for monitoring
 */
export function getCCOMetrics(): CacheMetrics & { hitRate: number; size: number } {
  return cacheInstance.getMetrics();
}
