/**
 * Information-Theoretic Quality Analyzer
 * 
 * Implements Shannon entropy calculation, Kolmogorov complexity approximation,
 * and Sybil pattern detection for Byzantine resistance.
 * 
 * Based on:
 * - Shannon (1948) "A Mathematical Theory of Communication"
 * - Kolmogorov complexity approximation via compression
 * - Requirements 5.1, 5.2, 5.3, 6.1
 * 
 * @module lib/bft/qualityAnalyzer
 * @version 1.0.0
 */

import { createHash } from 'crypto';
import { gzipSync } from 'zlib';
import type {
  Entity,
  Relationship,
  SybilDetectionResult,
  SybilIndicator,
  QualityMetricsAccumulator,
} from '../../types/byzantine.types';
import { BYZANTINE_PARAMS } from '../../types/byzantine.types';

/**
 * Quality Analyzer for information-theoretic metrics
 * 
 * Implements:
 * - Shannon entropy: H(X) = -Σ p(x) log₂ p(x)
 * - Kolmogorov complexity approximation: K(x) ≈ |compressed(x)| / |x|
 * - Novelty-volume ratio tracking
 * - Sybil pattern detection
 */
export class QualityAnalyzer {
  private metricsCache: Map<string, QualityMetricsAccumulator>;
  
  constructor() {
    this.metricsCache = new Map();
  }
  
  /**
   * Calculate Shannon entropy of entities and relationships
   * 
   * Shannon entropy measures the information content and diversity of data.
   * Higher entropy indicates more diverse, higher-quality contributions.
   * 
   * Formula: H(X) = -Σ p(x) log₂ p(x)
   * where p(x) is the probability of each unique element
   * 
   * Edge cases:
   * - Empty input: returns 0
   * - Single element: returns 0 (no uncertainty)
   * - All identical: returns 0
   * - Uniform distribution: returns maximum entropy
   * 
   * @param entities - Array of entities to analyze
   * @param relationships - Array of relationships to analyze
   * @returns Shannon entropy value (bits), non-negative
   * 
   * @example
   * const entities = [
   *   { id: '1', name: 'Alice', type: 'Person' },
   *   { id: '2', name: 'Bob', type: 'Person' },
   *   { id: '3', name: 'Acme', type: 'Organization' }
   * ];
   * const entropy = analyzer.calculateEntropy(entities, []);
   * // Returns ~1.58 bits (3 unique types with some repetition)
   */
  calculateEntropy(entities: Entity[], relationships: Relationship[]): number {
    // Handle edge case: empty input
    if (entities.length === 0 && relationships.length === 0) {
      return 0;
    }
    
    // Combine entities and relationships into a single dataset
    // We'll analyze the distribution of types and names
    const elements: string[] = [];
    
    // Add entity types and names
    for (const entity of entities) {
      elements.push(`entity:${entity.type}`);
      elements.push(`name:${entity.name}`);
    }
    
    // Add relationship types
    for (const rel of relationships) {
      elements.push(`rel:${rel.type}`);
    }
    
    // Handle edge case: single element
    if (elements.length === 1) {
      return 0;
    }
    
    // Count frequency of each element
    const frequencies = new Map<string, number>();
    for (const element of elements) {
      frequencies.set(element, (frequencies.get(element) || 0) + 1);
    }
    
    // Calculate probabilities and entropy
    const total = elements.length;
    let entropy = 0;
    
    for (const count of frequencies.values()) {
      const probability = count / total;
      // H(X) = -Σ p(x) log₂ p(x)
      // Use natural log and convert to log₂: log₂(x) = ln(x) / ln(2)
      entropy -= probability * Math.log2(probability);
    }
    
    return entropy;
  }
  
  /**
   * Approximate Kolmogorov complexity using compression ratio
   * 
   * Kolmogorov complexity K(x) is the length of the shortest program
   * that produces x. Since K(x) is uncomputable, we approximate it
   * using gzip compression ratio as a proxy.
   * 
   * Formula: K(x) ≈ |compressed(x)| / |x|
   * 
   * Lower ratio = higher complexity = higher quality
   * Higher ratio = lower complexity = lower quality (repetitive data)
   * 
   * @param data - String data to analyze
   * @returns Compression ratio (0-1), where lower is better quality
   * 
   * @example
   * const highQuality = "unique diverse content with many different words";
   * const lowQuality = "spam spam spam spam spam spam spam spam spam";
   * 
   * analyzer.approximateKolmogorovComplexity(highQuality); // ~0.7
   * analyzer.approximateKolmogorovComplexity(lowQuality);  // ~0.3
   */
  approximateKolmogorovComplexity(data: string): number {
    // Handle edge case: empty string
    if (data.length === 0) {
      return 1.0; // Maximum ratio (worst quality)
    }
    
    // Convert string to buffer
    const buffer = Buffer.from(data, 'utf-8');
    const originalSize = buffer.length;
    
    // Compress using gzip
    const compressed = gzipSync(buffer);
    const compressedSize = compressed.length;
    
    // Calculate compression ratio
    // Lower ratio = more compressible = more repetitive = lower quality
    const ratio = compressedSize / originalSize;
    
    // Clamp to [0, 1] range
    return Math.min(1.0, Math.max(0.0, ratio));
  }
  
  /**
   * Compute novelty-to-volume ratio for an agent
   * 
   * Tracks the ratio of novel (unique) entities to total volume
   * over a time window. Low ratios indicate potential Sybil attacks
   * (high volume, low novelty).
   * 
   * @param agentId - Agent identifier
   * @param timeWindow - Time window in milliseconds
   * @returns Novelty-volume ratio (0-1)
   * 
   * @example
   * // Agent submits 100 entities, 30 are novel
   * const ratio = analyzer.computeNoveltyVolumeRatio('agent-123', 3600000);
   * // Returns 0.3
   */
  computeNoveltyVolumeRatio(agentId: string, timeWindow: number): number {
    const metrics = this.metricsCache.get(agentId);
    
    if (!metrics) {
      // No data for this agent yet
      return 1.0; // Assume good until proven otherwise
    }
    
    // Check if metrics are within time window
    const now = Date.now();
    if (now - metrics.windowEnd > timeWindow) {
      // Metrics are stale, return neutral value
      return 1.0;
    }
    
    // Calculate ratio
    if (metrics.totalEntities === 0) {
      return 1.0;
    }
    
    const ratio = metrics.novelEntities / metrics.totalEntities;
    return Math.min(1.0, Math.max(0.0, ratio));
  }
  
  /**
   * Update quality metrics for an agent
   * 
   * Accumulates metrics over time for novelty-volume ratio tracking.
   * 
   * @param agentId - Agent identifier
   * @param entities - New entities submitted
   * @param novelCount - Number of novel (unique) entities
   * @param entropy - Entropy of the submission
   */
  updateMetrics(
    agentId: string,
    entities: Entity[],
    novelCount: number,
    entropy: number
  ): void {
    const now = Date.now();
    let metrics = this.metricsCache.get(agentId);
    
    if (!metrics) {
      // Initialize new metrics
      metrics = {
        agentId,
        windowStart: now,
        windowEnd: now,
        totalEntities: 0,
        novelEntities: 0,
        totalVolume: 0,
        entropySum: 0,
        sampleCount: 0,
      };
      this.metricsCache.set(agentId, metrics);
    }
    
    // Update metrics
    metrics.windowEnd = now;
    metrics.totalEntities += entities.length;
    metrics.novelEntities += novelCount;
    metrics.totalVolume += entities.length;
    metrics.entropySum += entropy;
    metrics.sampleCount += 1;
  }
  
  /**
   * Detect Sybil attack patterns
   * 
   * Analyzes agent behavior for suspicious patterns:
   * - Low novelty-volume ratio (< 0.3)
   * - Low entropy (< 2.0 bits)
   * - High volume with low complexity
   * 
   * @param agentId - Agent identifier
   * @returns Sybil detection result with confidence and recommended action
   * 
   * @example
   * const result = analyzer.detectSybilPatterns('agent-123');
   * if (result.isSuspicious) {
   *   console.log(`Confidence: ${result.confidence}`);
   *   console.log(`Action: ${result.recommendedAction}`);
   * }
   */
  detectSybilPatterns(agentId: string): SybilDetectionResult {
    const metrics = this.metricsCache.get(agentId);
    
    if (!metrics || metrics.sampleCount === 0) {
      // No data, assume not suspicious
      return {
        isSuspicious: false,
        confidence: 0,
        indicators: [],
        noveltyVolumeRatio: 1.0,
        entropyScore: 0,
        recommendedAction: 'NONE',
      };
    }
    
    // Calculate metrics
    const noveltyVolumeRatio = this.computeNoveltyVolumeRatio(
      agentId,
      3600000 // 1 hour window
    );
    const avgEntropy = metrics.entropySum / metrics.sampleCount;
    
    // Collect indicators
    const indicators: SybilIndicator[] = [];
    let totalSeverity = 0;
    
    // Check novelty-volume ratio
    if (noveltyVolumeRatio < BYZANTINE_PARAMS.MIN_NOVELTY_VOLUME_RATIO) {
      const severity = 1.0 - (noveltyVolumeRatio / BYZANTINE_PARAMS.MIN_NOVELTY_VOLUME_RATIO);
      indicators.push({
        type: 'HIGH_VOLUME_LOW_NOVELTY',
        severity,
        evidence: `Novelty-volume ratio ${noveltyVolumeRatio.toFixed(3)} below threshold ${BYZANTINE_PARAMS.MIN_NOVELTY_VOLUME_RATIO}`,
      });
      totalSeverity += severity;
    }
    
    // Check entropy
    if (avgEntropy < BYZANTINE_PARAMS.MIN_ENTROPY_THRESHOLD) {
      const severity = 1.0 - (avgEntropy / BYZANTINE_PARAMS.MIN_ENTROPY_THRESHOLD);
      indicators.push({
        type: 'LOW_ENTROPY',
        severity,
        evidence: `Average entropy ${avgEntropy.toFixed(2)} bits below threshold ${BYZANTINE_PARAMS.MIN_ENTROPY_THRESHOLD}`,
      });
      totalSeverity += severity;
    }
    
    // Calculate confidence
    const confidence = indicators.length > 0
      ? Math.min(1.0, totalSeverity / indicators.length)
      : 0;
    
    // Determine recommended action
    let recommendedAction: 'FLAG' | 'THROTTLE' | 'BLOCK' | 'NONE' = 'NONE';
    if (confidence >= 0.8) {
      recommendedAction = 'BLOCK';
    } else if (confidence >= 0.5) {
      recommendedAction = 'THROTTLE';
    } else if (confidence >= 0.3) {
      recommendedAction = 'FLAG';
    }
    
    return {
      isSuspicious: indicators.length > 0,
      confidence,
      indicators,
      noveltyVolumeRatio,
      entropyScore: avgEntropy,
      recommendedAction,
    };
  }
  
  /**
   * Generate entity fingerprint for duplicate detection
   * 
   * Creates a hash-based fingerprint of an entity for detecting
   * duplicates and near-duplicates.
   * 
   * @param entity - Entity to fingerprint
   * @returns SHA-256 hash fingerprint
   */
  generateEntityFingerprint(entity: Entity): string {
    // Normalize entity data for consistent hashing
    const normalized = {
      name: entity.name.toLowerCase().trim(),
      type: entity.type.toLowerCase().trim(),
      // Include data if present
      ...(entity.data && { data: JSON.stringify(entity.data) }),
    };
    
    const hash = createHash('sha256');
    hash.update(JSON.stringify(normalized));
    return hash.digest('hex');
  }
  
  /**
   * Clear metrics cache for an agent
   * 
   * @param agentId - Agent identifier
   */
  clearMetrics(agentId: string): void {
    this.metricsCache.delete(agentId);
  }
  
  /**
   * Clear all metrics (for testing)
   */
  clearAllMetrics(): void {
    this.metricsCache.clear();
  }
  
  /**
   * Get metrics for an agent (for testing/debugging)
   * 
   * @param agentId - Agent identifier
   * @returns Metrics accumulator or undefined
   */
  getMetrics(agentId: string): QualityMetricsAccumulator | undefined {
    return this.metricsCache.get(agentId);
  }
}
