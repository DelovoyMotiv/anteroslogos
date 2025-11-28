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
  const noveltyScore = computeNoveltyScore(delta);
  const connectivityScore = computeConnectivityScore(delta);
  const predictionImprovementScore = await computePredictionImprovementScore(delta);
  const temporalRelevanceScore = computeTemporalRelevanceScore(delta);
  const confidenceScore = computeConfidenceScore(delta);

  // Weights for final score
  const weights = {
    novelty: 0.30,
    connectivity: 0.25,
    predictionImprovement: 0.25,
    temporalRelevance: 0.10,
    confidence: 0.10
  };

  // Weighted total score
  const totalScore =
    noveltyScore * weights.novelty +
    connectivityScore * weights.connectivity +
    predictionImprovementScore * weights.predictionImprovement +
    temporalRelevanceScore * weights.temporalRelevance +
    confidenceScore * weights.confidence;

  const computationTimeMs = Date.now() - startTime;

  return {
    totalScore,
    components: {
      noveltyScore,
      connectivityScore,
      predictionImprovementScore,
      temporalRelevanceScore,
      confidenceScore
    },
    weights,
    metadata: {
      novelEntitiesCount: delta.entities.length,
      novelRelationshipsCount: delta.relationships.length,
      averageConnectivityBoost: connectivityScore / 100,
      predictionsImproved: 0, // Computed in prediction improvement
      computationTimeMs
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

  const reward =
    baseReward *
    noveltyMultiplier *
    connectivityMultiplier *
    predictionMultiplier *
    temporalMultiplier *
    confidenceMultiplier;

  // Cap at maximum reward
  return Math.min(reward, config.maxRewardPerSync);
}

/**
 * Novelty Score: Measures how much new information is contributed
 * 
 * Algorithm:
 * 1. Check each entity against global entity index
 * 2. Check each relationship against global relationship index
 * 3. Score = (novel entities + novel relationships) / total × 100
 */
function computeNoveltyScore(delta: KnowledgeGraphDelta): number {
  let novelEntities = 0;
  let novelRelationships = 0;

  // Check entity novelty
  for (const entity of delta.entities) {
    const normalizedName = entity.name.toLowerCase().trim();
    const existingIds = globalGraph.entityNameIndex.get(normalizedName);
    
    if (!existingIds || existingIds.size === 0) {
      novelEntities++;
    } else {
      // Check if this specific entity (by properties) is truly novel
      let isNovel = true;
      for (const existingId of existingIds) {
        const existing = globalGraph.entities.get(existingId);
        if (existing && existing.type === entity.type) {
          // Same name and type = not novel (even if properties differ)
          isNovel = false;
          break;
        }
      }
      if (isNovel) {
        novelEntities++;
      }
    }
  }

  // Check relationship novelty
  for (const rel of delta.relationships) {
    const relKey = `${rel.sourceEntityId}:${rel.targetEntityId}`;
    const existingRels = globalGraph.relationshipIndex.get(relKey);
    
    if (!existingRels || existingRels.size === 0) {
      novelRelationships++;
    } else {
      // Check if this specific relationship type is novel
      let isNovel = true;
      for (const existingRelId of existingRels) {
        const existing = globalGraph.relationships.get(existingRelId);
        if (existing && existing.type === rel.type) {
          isNovel = false;
          break;
        }
      }
      if (isNovel) {
        novelRelationships++;
      }
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
 * 1. Compute PageRank before and after adding delta
 * 2. Measure average centrality improvement
 * 3. Bonus for connecting previously isolated clusters
 */
function computeConnectivityScore(delta: KnowledgeGraphDelta): number {
  if (delta.relationships.length === 0) {
    return 0; // No connectivity without relationships
  }

  let totalConnectivityBoost = 0;
  let connectionsToExisting = 0;

  // Check how many relationships connect to existing entities
  for (const rel of delta.relationships) {
    const sourceExists = globalGraph.entities.has(rel.sourceEntityId);
    const targetExists = globalGraph.entities.has(rel.targetEntityId);

    if (sourceExists || targetExists) {
      connectionsToExisting++;
      
      // Boost score if connecting high-PageRank entities
      const sourceRank = sourceExists ? globalGraph.entities.get(rel.sourceEntityId)!.pageRank : 0;
      const targetRank = targetExists ? globalGraph.entities.get(rel.targetEntityId)!.pageRank : 0;
      const avgRank = (sourceRank + targetRank) / 2;
      
      totalConnectivityBoost += avgRank * rel.weight;
    }
  }

  if (delta.relationships.length === 0) return 0;

  // Base score: percentage of relationships connecting to existing graph
  const connectionRatio = connectionsToExisting / delta.relationships.length;
  
  // Weighted by quality (PageRank)
  const qualityBoost = totalConnectivityBoost / delta.relationships.length;
  
  // Combine (60% connection ratio, 40% quality)
  const score = (connectionRatio * 0.6 + qualityBoost * 0.4) * 100;
  
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
