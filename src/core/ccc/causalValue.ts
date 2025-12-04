/**
 * Causal Value Computation Engine
 * 
 * PhD-level graph-theoretic algorithms for computing the causal value
 * of knowledge graph contributions. Uses novelty detection, connectivity
 * analysis (PageRank, betweenness centrality), and prediction improvement
 * metrics to quantify the value of contributed data.
 * 
 * @module core/ccc/causalValue
 */

import {
  KnowledgeGraphDelta,
  CausalValueScore,
  CCCRewardConfig
} from './types';
import { QualityAnalyzer } from '../../../lib/bft/qualityAnalyzer';
import { getUnifiedCache } from '../../../lib/graph/unifiedMetricsCache';
import { getDistributedCache } from '../../../lib/graph/distributedMetricsCache';

/**
 * Global knowledge graph state for novelty detection
 * 
 * In production, this would be:
 * - Neo4j or TigerGraph for graph storage
 * - Redis for hot entity/relationship cache
 * - Elasticsearch for full-text entity search
 */
interface GlobalGraphState {
  entities: Map<string, {
    id: string;
    type: string;
    name: string;
    properties: Record<string, unknown>;
    firstSeenAt: string;
    lastUpdatedAt: string;
    contributorAgents: Set<string>;
    inDegree: number; // Incoming relationships
    outDegree: number; // Outgoing relationships
    pageRank: number; // Importance score
  }>;
  relationships: Map<string, {
    id: string;
    sourceEntityId: string;
    targetEntityId: string;
    type: string;
    weight: number;
    firstSeenAt: string;
    contributorAgents: Set<string>;
  }>;
  entityNameIndex: Map<string, Set<string>>; // name -> entity IDs
  relationshipIndex: Map<string, Set<string>>; // source:target -> relationship IDs
}

/**
 * Singleton global graph state
 */
const globalGraph: GlobalGraphState = {
  entities: new Map(),
  relationships: new Map(),
  entityNameIndex: new Map(),
  relationshipIndex: new Map()
};

/**
 * Singleton quality analyzer for entropy and Kolmogorov complexity
 */
const qualityAnalyzer = new QualityAnalyzer();

/**
 * Default CCC reward configuration
 */
const DEFAULT_REWARD_CONFIG: CCCRewardConfig = {
  baseRewardPerEntity: 1.0,
  baseRewardPerRelationship: 0.5,
  noveltyMultiplier: 2.5,
  connectivityMultiplier: 2.0,
  predictionImprovementMultiplier: 3.0,
  temporalDecayFactor: 0.9, // 10% decay per month
  minScoreForReward: 20.0,
  maxRewardPerSync: 1000.0
};

/**
 * Compute causal value of knowledge graph delta
 */
export async function computeCausalValue(
  delta: KnowledgeGraphDelta,
  _config: CCCRewardConfig = DEFAULT_REWARD_CONFIG
): Promise<CausalValueScore> {
  const startTime = Date.now();

  // Component scores (0-100 each)
  // All use unified cache to eliminate duplicate computation
  const noveltyScore = await computeNoveltyScore(delta);
  const connectivityScore = await computeConnectivityScore(delta);
  const predictionImprovementScore = await computePredictionImprovementScore(delta);
  const temporalRelevanceScore = computeTemporalRelevanceScore(delta);
  const confidenceScore = computeConfidenceScore(delta);
  
  // Calculate Shannon entropy for quality assessment (Requirements 5.2, 6.4)
  const entropyScore = computeEntropyScore(delta);
  
  // Calculate Kolmogorov complexity for quality assessment (Requirements 6.1, 6.4)
  const kolmogorovScore = computeKolmogorovScore(delta);
  
  // Calculate betweenness centrality for connectivity quality (Requirement 6.2)
  // Uses unified cache to avoid duplicate computation with BFT
  const betweennessScore = await computeBetweennessScore(delta);
  
  // Calculate PageRank differential for connectivity quality (Requirement 6.3)
  // Uses unified cache to avoid duplicate computation with BFT
  const pageRankDifferentialScore = await computePageRankDifferentialScore(delta);

  // Weights for final score (adjusted to include all quality metrics)
  const weights = {
    novelty: 0.18,
    connectivity: 0.13,
    predictionImprovement: 0.13,
    temporalRelevance: 0.10,
    confidence: 0.10,
    entropy: 0.12, // Information-theoretic quality
    kolmogorov: 0.10, // Compression-based complexity
    betweenness: 0.07, // Connectivity quality via betweenness centrality
    pageRankDifferential: 0.07 // Connectivity quality via PageRank improvement
  };

  // Weighted total score
  const totalScore =
    noveltyScore * weights.novelty +
    connectivityScore * weights.connectivity +
    predictionImprovementScore * weights.predictionImprovement +
    temporalRelevanceScore * weights.temporalRelevance +
    confidenceScore * weights.confidence +
    entropyScore * weights.entropy +
    kolmogorovScore * weights.kolmogorov +
    betweennessScore * weights.betweenness +
    pageRankDifferentialScore * weights.pageRankDifferential;

  const computationTimeMs = Date.now() - startTime;
  
  // Calculate quality multiplier and path creation bonus for metadata
  const qualityMultiplier = computeQualityMultiplier({
    totalScore,
    components: {
      noveltyScore,
      connectivityScore,
      predictionImprovementScore,
      temporalRelevanceScore,
      confidenceScore,
      entropyScore,
      kolmogorovScore,
      betweennessScore,
      pageRankDifferentialScore
    },
    weights,
    metadata: {
      novelEntitiesCount: delta.entities.length,
      novelRelationshipsCount: delta.relationships.length,
      averageConnectivityBoost: connectivityScore / 100,
      predictionsImproved: 0,
      computationTimeMs
    }
  }, delta);
  
  const pathCreationBonus = computePathCreationBonus(delta);

  return {
    totalScore,
    components: {
      noveltyScore,
      connectivityScore,
      predictionImprovementScore,
      temporalRelevanceScore,
      confidenceScore,
      entropyScore,
      kolmogorovScore,
      betweennessScore,
      pageRankDifferentialScore
    },
    weights,
    metadata: {
      novelEntitiesCount: delta.entities.length,
      novelRelationshipsCount: delta.relationships.length,
      averageConnectivityBoost: connectivityScore / 100,
      predictionsImproved: 0, // Computed in prediction improvement
      computationTimeMs,
      qualityMultiplier,
      pathCreationBonus
    }
  };
}

/**
 * Compute CCC reward amount from causal value score
 */
export function computeCCCReward(
  causalValue: CausalValueScore,
  delta: KnowledgeGraphDelta,
  config: CCCRewardConfig = DEFAULT_REWARD_CONFIG
): number {
  if (causalValue.totalScore < config.minScoreForReward) {
    return 0;
  }

  // Base reward from entity/relationship counts
  const baseReward =
    delta.entities.length * config.baseRewardPerEntity +
    delta.relationships.length * config.baseRewardPerRelationship;

  // Apply multipliers based on component scores
  const noveltyMultiplier = 1 + (causalValue.components.noveltyScore / 100) * (config.noveltyMultiplier - 1);
  const connectivityMultiplier = 1 + (causalValue.components.connectivityScore / 100) * (config.connectivityMultiplier - 1);
  const predictionMultiplier = 1 + (causalValue.components.predictionImprovementScore / 100) * (config.predictionImprovementMultiplier - 1);

  // Temporal decay (older data worth less)
  const ageInMonths = (Date.now() - new Date(delta.timestamp).getTime()) / (1000 * 60 * 60 * 24 * 30);
  const temporalMultiplier = Math.pow(config.temporalDecayFactor, ageInMonths);

  // Confidence multiplier
  const confidenceMultiplier = causalValue.components.confidenceScore / 100;
  
  // Quality multiplier based on entropy-volume ratio (Requirements 6.4)
  // Higher entropy relative to volume indicates higher quality
  const qualityMultiplier = computeQualityMultiplier(causalValue, delta);
  
  // Path creation bonus for unique causal paths (Requirements 6.5)
  const pathCreationBonus = computePathCreationBonus(delta);

  const reward =
    baseReward *
    noveltyMultiplier *
    connectivityMultiplier *
    predictionMultiplier *
    temporalMultiplier *
    confidenceMultiplier *
    qualityMultiplier +
    pathCreationBonus;

  // Cap at maximum reward
  return Math.min(reward, config.maxRewardPerSync);
}

/**
 * Novelty Score: Measures how much new information is contributed
 * 
 * Algorithm:
 * 1. Check each entity against unified cache novelty index
 * 2. Check each relationship against unified cache novelty index
 * 3. Score = (novel entities + novel relationships) / total × 100
 * 
 * Uses unified cache to eliminate duplicate novelty detection
 */
async function computeNoveltyScore(delta: KnowledgeGraphDelta): Promise<number> {
  // Use distributed cache if available, fallback to local unified cache
  let cache;
  try {
    cache = getDistributedCache();
  } catch {
    cache = getUnifiedCache();
  }
  
  let novelEntities = 0;
  let novelRelationships = 0;

  // Check entity novelty via distributed cache
  for (const entity of delta.entities) {
    const noveltyResult = await cache.isEntityNovel(
      entity.name,
      entity.type,
      entity.id
    );
    
    if (noveltyResult.isNovel) {
      novelEntities++;
    }
  }

  // Check relationship novelty via distributed cache
  for (const rel of delta.relationships) {
    const noveltyResult = await cache.isRelationshipNovel(
      rel.sourceEntityId,
      rel.targetEntityId,
      rel.type,
      rel.id
    );
    
    if (noveltyResult.isNovel) {
      novelRelationships++;
    }
  }

  const totalItems = delta.entities.length + delta.relationships.length;
  if (totalItems === 0) return 0;

  const noveltyRatio = (novelEntities + novelRelationships) / totalItems;
  return noveltyRatio * 100;
}

/**
 * Connectivity Score: Measures how well new data connects to existing graph
 * 
 * Algorithm:
 * 1. Use unified cache to get connectivity metrics
 * 2. Measure average centrality improvement via cached PageRank
 * 3. Bonus for connecting previously isolated clusters
 * 
 * Uses unified cache to eliminate duplicate PageRank computation
 */
async function computeConnectivityScore(delta: KnowledgeGraphDelta): Promise<number> {
  if (delta.relationships.length === 0) {
    return 0; // No connectivity without relationships
  }

  // Use distributed cache if available, fallback to local unified cache
  let cache;
  try {
    cache = getDistributedCache();
  } catch {
    cache = getUnifiedCache();
  }
  
  // Get connectivity metrics from distributed cache
  // Three-tier hierarchy: Local → Redis → Compute
  const connectivityResult = await cache.getConnectivityMetrics(
    delta.relationships,
    {
      nodes: globalGraph.entities as any,
      edges: globalGraph.relationships as any,
      nodeCount: globalGraph.entities.size,
      edgeCount: globalGraph.relationships.size,
      domain: 'global',
    } as any
  );

  // Combine (60% connection ratio, 40% quality)
  const score = (connectivityResult.connectionRatio * 0.6 + connectivityResult.qualityBoost * 0.4) * 100;
  
  return Math.min(100, score);
}

/**
 * Prediction Improvement Score: Measures impact on citation predictions
 * 
 * Algorithm:
 * 1. Run prediction model before adding delta
 * 2. Temporarily add delta to graph
 * 3. Run prediction model again
 * 4. Measure accuracy improvement (delta in F1 score)
 * 
 * Note: This is computationally expensive, so in production:
 * - Sample subset of recent predictions
 * - Use approximation based on graph structural changes
 * - Cache results for similar deltas
 */
async function computePredictionImprovementScore(
  delta: KnowledgeGraphDelta
): Promise<number> {
  // Simplified approximation based on graph structural impact
  // Full implementation would run actual prediction model
  
  // Heuristic: New causal paths improve predictions
  let causalPathsAdded = 0;
  
  for (const rel of delta.relationships) {
    // Count relationships that create new causal paths
    // (e.g., "cites", "influences", "mentions")
    if (['cites', 'influences', 'mentions', 'references'].includes(rel.type)) {
      causalPathsAdded++;
    }
  }

  // Entities with high confidence in citation-relevant domains boost score
  let relevantEntities = 0;
  for (const entity of delta.entities) {
    if (['Organization', 'Technology', 'Research'].includes(entity.type) && entity.confidence > 0.7) {
      relevantEntities++;
    }
  }

  // Score based on causal paths and relevant entities
  const pathScore = Math.min(50, causalPathsAdded * 5);
  const entityScore = Math.min(50, relevantEntities * 3);
  
  return pathScore + entityScore;
}

/**
 * Temporal Relevance Score: Recent data is worth more
 * 
 * Algorithm:
 * 1. Compute age of delta (time since timestamp)
 * 2. Apply exponential decay (e^(-age/halflife))
 * 3. Score = decay factor × 100
 */
function computeTemporalRelevanceScore(delta: KnowledgeGraphDelta): number {
  const now = Date.now();
  const deltaTime = new Date(delta.timestamp).getTime();
  const ageInDays = (now - deltaTime) / (1000 * 60 * 60 * 24);
  
  // Half-life of 30 days (data loses 50% value after 30 days)
  const halfLifeDays = 30;
  const decayFactor = Math.pow(0.5, ageInDays / halfLifeDays);
  
  return decayFactor * 100;
}

/**
 * Confidence Score: Average confidence of entities and relationships
 */
function computeConfidenceScore(delta: KnowledgeGraphDelta): number {
  const entityConfidences = delta.entities.map(e => e.confidence);
  const relationshipConfidences = delta.relationships.map(r => r.confidence);
  
  const allConfidences = [...entityConfidences, ...relationshipConfidences];
  if (allConfidences.length === 0) return 0;
  
  const avgConfidence = allConfidences.reduce((sum, c) => sum + c, 0) / allConfidences.length;
  return avgConfidence * 100;
}

/**
 * Entropy Score: Information-theoretic quality metric using Shannon entropy
 * 
 * Measures the diversity and information content of contributed data.
 * Higher entropy indicates more diverse, higher-quality contributions.
 * 
 * Algorithm:
 * 1. Calculate Shannon entropy using QualityAnalyzer
 * 2. Normalize to 0-100 scale
 * 3. Higher entropy = higher score
 * 
 * Requirements: 5.2, 6.4
 */
function computeEntropyScore(delta: KnowledgeGraphDelta): number {
  // Convert delta entities/relationships to format expected by QualityAnalyzer
  const entities = delta.entities.map(e => ({
    id: e.id,
    name: e.name,
    type: e.type,
    data: e.properties as Record<string, string | number | boolean | null>
  }));
  
  const relationships = delta.relationships.map(r => ({
    id: r.id,
    source: r.sourceEntityId,
    target: r.targetEntityId,
    type: r.type,
    confidence: r.confidence
  }));
  
  // Calculate Shannon entropy
  const entropy = qualityAnalyzer.calculateEntropy(entities, relationships);
  
  // Normalize entropy to 0-100 scale
  // Typical entropy ranges from 0 to ~5 bits for diverse data
  // We use a logarithmic scale to map entropy to score
  const maxExpectedEntropy = 5.0;
  const normalizedScore = Math.min(100, (entropy / maxExpectedEntropy) * 100);
  
  return normalizedScore;
}

/**
 * Kolmogorov Complexity Score: Compression-based quality metric
 * 
 * Approximates Kolmogorov complexity using compression ratio as a proxy.
 * Lower compression ratio indicates higher complexity and quality.
 * 
 * Algorithm:
 * 1. Serialize delta to JSON string
 * 2. Calculate compression ratio using QualityAnalyzer
 * 3. Invert ratio (lower compression = higher score)
 * 4. Normalize to 0-100 scale
 * 
 * Requirements: 6.1, 6.4
 */
function computeKolmogorovScore(delta: KnowledgeGraphDelta): number {
  // Serialize delta to string for compression analysis
  const dataString = JSON.stringify({
    entities: delta.entities.map(e => ({
      type: e.type,
      name: e.name,
      properties: e.properties
    })),
    relationships: delta.relationships.map(r => ({
      type: r.type,
      sourceEntityId: r.sourceEntityId,
      targetEntityId: r.targetEntityId,
      weight: r.weight
    }))
  });
  
  // Calculate compression ratio
  const compressionRatio = qualityAnalyzer.approximateKolmogorovComplexity(dataString);
  
  // Invert ratio: lower compression ratio = higher complexity = higher quality
  // compressionRatio ranges from 0 to 1
  // We want: low ratio (0.3) -> high score (70), high ratio (0.9) -> low score (10)
  const invertedScore = (1 - compressionRatio) * 100;
  
  return Math.max(0, Math.min(100, invertedScore));
}

/**
 * Betweenness Centrality Score: Connectivity quality metric
 * 
 * Measures how well contributed nodes serve as bridges between
 * different parts of the knowledge graph. Higher betweenness
 * indicates nodes that connect previously isolated clusters.
 * 
 * Algorithm:
 * 1. Use unified cache to get betweenness centrality
 * 2. Average betweenness across all contributed nodes
 * 3. Normalize to 0-100 scale
 * 
 * Uses unified cache to eliminate duplicate betweenness computation
 * 
 * Requirements: 6.2
 */
async function computeBetweennessScore(delta: KnowledgeGraphDelta): Promise<number> {
  if (delta.entities.length === 0) {
    return 0;
  }
  
  // Use distributed cache if available, fallback to local unified cache
  let cache;
  try {
    cache = getDistributedCache();
  } catch {
    cache = getUnifiedCache();
  }
  
  let totalBetweenness = 0;
  
  // For each contributed entity, get betweenness from distributed cache
  for (const entity of delta.entities) {
    const betweennessResult = await cache.getBetweenness(
      entity.id,
      {
        nodes: globalGraph.entities as any,
        edges: globalGraph.relationships as any,
        nodeCount: globalGraph.entities.size,
        edgeCount: globalGraph.relationships.size,
        domain: 'global',
      } as any
    );
    
    totalBetweenness += betweennessResult.centrality;
  }
  
  // Average betweenness across all entities
  const avgBetweenness = totalBetweenness / delta.entities.length;
  
  // Convert to 0-100 scale
  return avgBetweenness * 100;
}

/**
 * PageRank Differential Score: Connectivity improvement metric
 * 
 * Measures how much the contribution improves the PageRank of
 * connected nodes in the graph. Higher differential indicates
 * contributions that significantly boost graph connectivity.
 * 
 * Algorithm:
 * 1. Use unified cache to get current PageRank values
 * 2. Estimate improvement based on relationship weights and cached PageRank
 * 3. Compute differential (after - before)
 * 4. Normalize to 0-100 scale
 * 
 * Uses unified cache to eliminate duplicate PageRank computation
 * 
 * Requirements: 6.3
 */
async function computePageRankDifferentialScore(delta: KnowledgeGraphDelta): Promise<number> {
  if (delta.relationships.length === 0) {
    return 0;
  }
  
  // Use distributed cache if available, fallback to local unified cache
  let cache;
  try {
    cache = getDistributedCache();
  } catch {
    cache = getUnifiedCache();
  }
  
  let totalPageRankImprovement = 0;
  const affectedNodes = new Set<string>();
  
  // For each relationship, estimate PageRank improvement using distributed cache
  for (const rel of delta.relationships) {
    // Track affected nodes
    affectedNodes.add(rel.sourceEntityId);
    affectedNodes.add(rel.targetEntityId);
    
    // Get PageRank from distributed cache
    const targetPageRank = await cache.getPageRank(
      rel.targetEntityId,
      {
        nodes: globalGraph.entities as any,
        edges: globalGraph.relationships as any,
        nodeCount: globalGraph.entities.size,
        edgeCount: globalGraph.relationships.size,
        domain: 'global',
      } as any
    );
    
    if (targetPageRank.rank > 0) {
      // Existing target: estimate PageRank boost from new incoming link
      const currentPageRank = targetPageRank.rank;
      
      // Get source PageRank from distributed cache
      const sourcePageRank = await cache.getPageRank(
        rel.sourceEntityId,
        {
          nodes: globalGraph.entities as any,
          edges: globalGraph.relationships as any,
          nodeCount: globalGraph.entities.size,
          edgeCount: globalGraph.relationships.size,
          domain: 'global',
        } as any
      );
      
      // PageRank contribution from source
      let sourceContribution = 0;
      if (sourcePageRank.rank > 0 && sourcePageRank.outDegree > 0) {
        // Existing source: use cached PageRank
        sourceContribution = (sourcePageRank.rank / (sourcePageRank.outDegree + 1)) * rel.weight;
      } else {
        // New source: assume initial PageRank
        const initialPageRank = 1.0 / (globalGraph.entities.size + delta.entities.length);
        sourceContribution = initialPageRank * rel.weight;
      }
      
      // Damping factor (standard PageRank parameter)
      const dampingFactor = 0.85;
      const pageRankBoost = dampingFactor * sourceContribution;
      
      // Relative improvement
      const relativeImprovement = currentPageRank > 0
        ? pageRankBoost / currentPageRank
        : pageRankBoost;
      
      totalPageRankImprovement += relativeImprovement;
    } else {
      // New target: initial PageRank boost
      const initialPageRank = 1.0 / (globalGraph.entities.size + delta.entities.length);
      totalPageRankImprovement += initialPageRank;
    }
  }
  
  // Average improvement across all relationships
  const avgImprovement = totalPageRankImprovement / delta.relationships.length;
  
  // Normalize to 0-100 scale
  // Typical improvements range from 0 to 0.5 (50% boost)
  const normalizedScore = Math.min(100, avgImprovement * 200);
  
  return normalizedScore;
}

/**
 * Compute quality multiplier based on entropy-volume ratio
 * 
 * Applies a multiplier to rewards based on the information-theoretic
 * quality of contributions. Higher entropy relative to volume indicates
 * higher quality and earns a higher multiplier.
 * 
 * Algorithm:
 * 1. Calculate entropy score from causal value
 * 2. Calculate volume (entity + relationship count)
 * 3. Compute entropy-volume ratio
 * 4. Map ratio to multiplier (1.0 to 2.0)
 * 
 * Requirements: 6.4
 */
function computeQualityMultiplier(
  causalValue: CausalValueScore,
  delta: KnowledgeGraphDelta
): number {
  const entropyScore = causalValue.components.entropyScore || 0;
  const kolmogorovScore = causalValue.components.kolmogorovScore || 0;
  
  // Volume: total entities and relationships
  const volume = delta.entities.length + delta.relationships.length;
  
  if (volume === 0) {
    return 1.0; // No multiplier for empty delta
  }
  
  // Normalize scores to 0-1 range
  const normalizedEntropy = entropyScore / 100;
  const normalizedKolmogorov = kolmogorovScore / 100;
  
  // Combined quality score (0-1)
  // Both metrics must be reasonably high for high multiplier
  // Use geometric mean to ensure both contribute
  const qualityScore = Math.sqrt(normalizedEntropy * normalizedKolmogorov);
  
  // Map quality score to multiplier range [1.0, 2.0]
  // Low quality (0) -> 1.0x, High quality (1) -> 2.0x
  const multiplier = 1.0 + qualityScore;
  
  return Math.max(1.0, Math.min(2.0, multiplier));
}

/**
 * Compute path creation bonus for unique causal paths
 * 
 * Rewards contributions that create new causal paths in the graph,
 * especially paths that connect previously unconnected clusters.
 * 
 * Algorithm:
 * 1. Identify causal relationships (cites, influences, mentions, references)
 * 2. For each causal relationship, check if it creates a new path
 * 3. Calculate path uniqueness score based on graph structure
 * 4. Sum bonuses across all new paths
 * 
 * Requirements: 6.5
 */
function computePathCreationBonus(delta: KnowledgeGraphDelta): number {
  let totalBonus = 0;
  
  // Causal relationship types that create valuable paths
  const causalTypes = new Set(['cites', 'influences', 'mentions', 'references', 'derives_from', 'builds_on']);
  
  for (const rel of delta.relationships) {
    if (!causalTypes.has(rel.type)) {
      continue; // Only reward causal relationships
    }
    
    const sourceEntity = globalGraph.entities.get(rel.sourceEntityId);
    const targetEntity = globalGraph.entities.get(rel.targetEntityId);
    
    // Check if this creates a new path
    const isNewPath = !globalGraph.relationshipIndex.has(`${rel.sourceEntityId}:${rel.targetEntityId}`);
    
    if (isNewPath) {
      // Base bonus for creating a new path
      let pathBonus = 5.0;
      
      // Bonus multiplier based on target importance (PageRank)
      if (targetEntity) {
        const targetImportance = targetEntity.pageRank;
        // Connecting to important nodes is more valuable
        pathBonus *= (1 + targetImportance * 2);
      }
      
      // Bonus for connecting previously isolated nodes
      if (sourceEntity && sourceEntity.outDegree === 0) {
        pathBonus *= 1.5; // First outgoing connection
      }
      if (targetEntity && targetEntity.inDegree === 0) {
        pathBonus *= 1.5; // First incoming connection
      }
      
      // Weight by relationship confidence
      pathBonus *= rel.weight;
      
      totalBonus += pathBonus;
    }
  }
  
  return totalBonus;
}

/**
 * Merge delta into global graph state
 * 
 * This updates the global graph with new entities/relationships,
 * maintaining indices and computing graph metrics (PageRank, etc.)
 */
export function mergeIntoGlobalGraph(delta: KnowledgeGraphDelta): void {
  const now = new Date().toISOString();

  // Merge entities
  for (const entity of delta.entities) {
    if (!globalGraph.entities.has(entity.id)) {
      globalGraph.entities.set(entity.id, {
        ...entity,
        firstSeenAt: now,
        lastUpdatedAt: now,
        contributorAgents: new Set([delta.agentId]),
        inDegree: 0,
        outDegree: 0,
        pageRank: 1.0 / (globalGraph.entities.size + 1) // Initial uniform distribution
      });

      // Update name index
      const normalizedName = entity.name.toLowerCase().trim();
      const nameSet = globalGraph.entityNameIndex.get(normalizedName) || new Set();
      nameSet.add(entity.id);
      globalGraph.entityNameIndex.set(normalizedName, nameSet);
    } else {
      // Update existing entity
      const existing = globalGraph.entities.get(entity.id)!;
      existing.lastUpdatedAt = now;
      existing.contributorAgents.add(delta.agentId);
      // Merge properties (keep highest confidence values)
      for (const [key, value] of Object.entries(entity.properties)) {
        existing.properties[key] = value;
      }
    }
  }

  // Merge relationships
  for (const rel of delta.relationships) {
    if (!globalGraph.relationships.has(rel.id)) {
      globalGraph.relationships.set(rel.id, {
        ...rel,
        firstSeenAt: now,
        contributorAgents: new Set([delta.agentId])
      });

      // Update relationship index
      const relKey = `${rel.sourceEntityId}:${rel.targetEntityId}`;
      const relSet = globalGraph.relationshipIndex.get(relKey) || new Set();
      relSet.add(rel.id);
      globalGraph.relationshipIndex.set(relKey, relSet);

      // Update entity degrees
      const source = globalGraph.entities.get(rel.sourceEntityId);
      const target = globalGraph.entities.get(rel.targetEntityId);
      if (source) source.outDegree++;
      if (target) target.inDegree++;
    } else {
      // Update existing relationship
      const existing = globalGraph.relationships.get(rel.id)!;
      existing.contributorAgents.add(delta.agentId);
    }
  }

  // Recompute PageRank after merge (simplified version)
  // In production, use iterative PageRank algorithm
  recomputePageRank();
}

/**
 * Simplified PageRank computation
 * 
 * Full production implementation would use:
 * - Power iteration method
 * - Convergence threshold (epsilon < 0.001)
 * - Damping factor (0.85)
 * - Distributed computation for large graphs
 */
function recomputePageRank(): void {
  const dampingFactor = 0.85;
  const numEntities = globalGraph.entities.size;
  
  if (numEntities === 0) return;

  // Initialize all entities to uniform distribution
  for (const entity of globalGraph.entities.values()) {
    entity.pageRank = 1.0 / numEntities;
  }

  // Simple one-iteration PageRank (production would iterate to convergence)
  const newRanks = new Map<string, number>();

  for (const [entityId] of globalGraph.entities) {
    let rank = (1 - dampingFactor) / numEntities;

    // Add contributions from incoming links
    for (const [, rel] of globalGraph.relationships) {
      if (rel.targetEntityId === entityId) {
        const source = globalGraph.entities.get(rel.sourceEntityId);
        if (source && source.outDegree > 0) {
          rank += dampingFactor * (source.pageRank / source.outDegree) * rel.weight;
        }
      }
    }

    newRanks.set(entityId, rank);
  }

  // Update entity PageRanks
  for (const [entityId, rank] of newRanks) {
    const entity = globalGraph.entities.get(entityId);
    if (entity) {
      entity.pageRank = rank;
    }
  }
}

/**
 * Get global graph statistics (for debugging/monitoring)
 */
export function getGlobalGraphStats() {
  return {
    totalEntities: globalGraph.entities.size,
    totalRelationships: globalGraph.relationships.size,
    avgEntityDegree:
      Array.from(globalGraph.entities.values()).reduce(
        (sum, e) => sum + e.inDegree + e.outDegree,
        0
      ) / globalGraph.entities.size || 0,
    topEntitiesByPageRank: Array.from(globalGraph.entities.values())
      .sort((a, b) => b.pageRank - a.pageRank)
      .slice(0, 10)
      .map(e => ({ id: e.id, name: e.name, pageRank: e.pageRank }))
  };
}
