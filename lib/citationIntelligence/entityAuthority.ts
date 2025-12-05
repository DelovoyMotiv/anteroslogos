/**
 * Entity Authority Calculator
 * Calculates authority scores for entities in knowledge graphs
 * 
 * Authority is measured across four dimensions:
 * 1. Relationship Density - How well-connected the entity is
 * 2. Claim Evidence - Quality and quantity of supporting evidence
 * 3. External Validation - Backlinks, mentions, citations
 * 4. Temporal Consistency - Stability and persistence over time
 */

import type {
  KnowledgeGraph,
  Entity,
  EntityAuthority,
  EntityType,
  TemporalData,
} from '../../types/citation-intelligence.types';

// ============================================================================
// Core Authority Calculation
// ============================================================================

/**
 * Calculate entity authority score
 * 
 * @param entity - Entity to calculate authority for
 * @param graph - Knowledge graph containing the entity
 * @param historicalData - Optional historical data for temporal consistency
 * @param externalData - Optional external validation data (backlinks, mentions)
 * @returns EntityAuthority with overall score and component scores
 */
export function calculateEntityAuthority(
  entity: Entity,
  graph: KnowledgeGraph,
  historicalData?: TemporalData[],
  externalData?: ExternalValidationData
): EntityAuthority {
  // Calculate component scores
  const relationshipDensity = calculateRelationshipDensity(entity, graph);
  const claimEvidence = calculateClaimEvidence(entity, graph);
  const externalValidation = calculateExternalValidation(entity, externalData);
  const temporalConsistency = calculateTemporalConsistency(entity, historicalData);

  // Calculate weighted overall score
  const authorityScore = calculateWeightedScore({
    relationshipDensity,
    claimEvidence,
    externalValidation,
    temporalConsistency,
  });

  return {
    entityId: entity.id,
    entityName: entity.name,
    entityType: entity.type as EntityType,
    authorityScore,
    components: {
      relationshipDensity,
      claimEvidence,
      externalValidation,
      temporalConsistency,
    },
    competitiveRanking: {
      percentile: 0, // Will be calculated when comparing with competitors
      topCompetitors: [],
    },
    growthTrend: {
      direction: 'stable',
      velocity: 0,
    },
  };
}

/**
 * Calculate authority for all entities in a graph
 */
export function calculateAllEntityAuthorities(
  graph: KnowledgeGraph,
  historicalData?: TemporalData[],
  externalData?: Map<string, ExternalValidationData>
): EntityAuthority[] {
  return graph.entities.map(entity => {
    const entityExternalData = externalData?.get(entity.id);
    return calculateEntityAuthority(entity, graph, historicalData, entityExternalData);
  });
}

// ============================================================================
// Component Score Calculations
// ============================================================================

/**
 * Calculate relationship density (edges per node)
 * 
 * Measures how well-connected an entity is within the knowledge graph.
 * Higher density indicates more central, authoritative entities.
 * 
 * Score: 0-100
 * - 0-20: Isolated entity (0-2 relationships)
 * - 20-50: Moderately connected (3-10 relationships)
 * - 50-80: Well-connected (11-30 relationships)
 * - 80-100: Hub entity (30+ relationships)
 */
export function calculateRelationshipDensity(
  entity: Entity,
  graph: KnowledgeGraph
): number {
  // Count relationships where entity is source or target
  const relationships = graph.relationships.filter(
    rel => rel.sourceId === entity.id || rel.targetId === entity.id
  );

  const relationshipCount = relationships.length;

  // Calculate average relationship strength (confidence)
  const avgStrength = relationships.length > 0
    ? relationships.reduce((sum, rel) => sum + (rel.confidence || 0.5), 0) / relationships.length
    : 0;

  // Calculate diversity of relationship types
  const uniqueTypes = new Set(relationships.map(rel => rel.type)).size;
  const typeDiversity = Math.min(1, uniqueTypes / 5); // Normalize to 0-1 (5+ types = max diversity)

  // Calculate bidirectional ratio (entities that link back)
  const outgoing = relationships.filter(rel => rel.sourceId === entity.id);
  const incoming = relationships.filter(rel => rel.targetId === entity.id);
  const bidirectionalRatio = outgoing.length > 0
    ? Math.min(1, incoming.length / outgoing.length)
    : 0;

  // Scoring formula
  // Base score from count (logarithmic scale to handle wide range)
  const countScore = Math.min(100, Math.log10(relationshipCount + 1) * 50);
  
  // Adjust for quality factors
  const qualityMultiplier = (avgStrength * 0.4) + (typeDiversity * 0.3) + (bidirectionalRatio * 0.3);
  
  return Math.round(countScore * (0.6 + qualityMultiplier * 0.4));
}

/**
 * Score claim evidence (citations, data, expert opinions)
 * 
 * Measures the quality and quantity of evidence supporting claims about this entity.
 * 
 * Score: 0-100
 * - 0-20: No or weak evidence
 * - 20-50: Some evidence, mostly data
 * - 50-80: Strong evidence with citations
 * - 80-100: Exceptional evidence with expert opinions and multiple sources
 */
export function calculateClaimEvidence(
  entity: Entity,
  graph: KnowledgeGraph
): number {
  // Find claims mentioning this entity
  const entityClaims = graph.claims.filter(claim =>
    claim.subjectId === entity.id ||
    claim.predicateId === entity.id ||
    claim.objectId === entity.id
  );

  if (entityClaims.length === 0) {
    return 0;
  }

  // Count evidence by type
  const evidenceCounts = {
    citation: 0,
    data: 0,
    expert_opinion: 0,
  };

  let totalConfidence = 0;
  let evidenceCount = 0;

  for (const claim of entityClaims) {
    for (const evidence of claim.evidence) {
      evidenceCounts[evidence.type]++;
      totalConfidence += evidence.confidence;
      evidenceCount++;
    }
  }

  if (evidenceCount === 0) {
    return 10; // Has claims but no evidence
  }

  // Calculate average evidence confidence
  const avgConfidence = totalConfidence / evidenceCount;

  // Score based on evidence diversity and quality
  const citationScore = Math.min(40, evidenceCounts.citation * 10);
  const dataScore = Math.min(30, evidenceCounts.data * 5);
  const expertScore = Math.min(30, evidenceCounts.expert_opinion * 15);

  const baseScore = citationScore + dataScore + expertScore;

  // Adjust for claim count (more claims = more authority)
  const claimBonus = Math.min(20, entityClaims.length * 2);

  // Apply confidence multiplier
  const finalScore = (baseScore + claimBonus) * avgConfidence;

  return Math.round(Math.min(100, finalScore));
}

/**
 * Implement external validation scoring (backlinks, mentions)
 * 
 * Measures external recognition and validation of the entity.
 * 
 * Score: 0-100
 * - 0-20: No external validation
 * - 20-50: Some mentions
 * - 50-80: Multiple backlinks and mentions
 * - 80-100: Widely recognized with authoritative backlinks
 */
export function calculateExternalValidation(
  _entity: Entity,
  externalData?: ExternalValidationData
): number {
  if (!externalData) {
    return 0;
  }

  const { backlinks, mentions, citations, domainAuthority } = externalData;

  // Score backlinks (logarithmic scale)
  const backlinkScore = Math.min(40, Math.log10((backlinks || 0) + 1) * 15);

  // Score mentions
  const mentionScore = Math.min(30, Math.log10((mentions || 0) + 1) * 12);

  // Score citations
  const citationScore = Math.min(20, (citations || 0) * 2);

  // Domain authority bonus (0-10 points)
  const authorityBonus = Math.min(10, (domainAuthority || 0) / 10);

  return Math.round(backlinkScore + mentionScore + citationScore + authorityBonus);
}

/**
 * Calculate temporal consistency (entity stability over time)
 * 
 * Measures how consistently the entity appears and maintains its properties over time.
 * 
 * Score: 0-100
 * - 0-20: New or unstable entity
 * - 20-50: Moderately stable
 * - 50-80: Consistently present
 * - 80-100: Highly stable, long-term presence
 */
export function calculateTemporalConsistency(
  entity: Entity,
  historicalData?: TemporalData[]
): number {
  if (!historicalData || historicalData.length === 0) {
    return 50; // Neutral score for new entities
  }

  // Count appearances in historical data
  const appearances = historicalData.filter(data =>
    // Check if entity appears in the historical knowledge graph
    // This is a simplified check - in production, you'd extract entities from historical data
    data.url === entity.url || 
    JSON.stringify(data).includes(entity.name)
  ).length;

  const appearanceRatio = appearances / historicalData.length;

  // Calculate time span
  const sortedData = [...historicalData].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const firstAppearance = sortedData[0]?.timestamp;
  const lastAppearance = sortedData[sortedData.length - 1]?.timestamp;

  if (!firstAppearance || !lastAppearance) {
    return 50;
  }

  const timeSpanDays = (
    new Date(lastAppearance).getTime() - new Date(firstAppearance).getTime()
  ) / (1000 * 60 * 60 * 24);

  // Score based on appearance ratio and time span
  const consistencyScore = appearanceRatio * 60; // Up to 60 points
  const longevityScore = Math.min(40, (timeSpanDays / 365) * 40); // Up to 40 points (1 year = max)

  return Math.round(consistencyScore + longevityScore);
}

/**
 * Calculate weighted overall authority score
 * 
 * Weights:
 * - Relationship Density: 30%
 * - Claim Evidence: 35%
 * - External Validation: 25%
 * - Temporal Consistency: 10%
 */
function calculateWeightedScore(components: {
  relationshipDensity: number;
  claimEvidence: number;
  externalValidation: number;
  temporalConsistency: number;
}): number {
  const weights = {
    relationshipDensity: 0.30,
    claimEvidence: 0.35,
    externalValidation: 0.25,
    temporalConsistency: 0.10,
  };

  const score =
    components.relationshipDensity * weights.relationshipDensity +
    components.claimEvidence * weights.claimEvidence +
    components.externalValidation * weights.externalValidation +
    components.temporalConsistency * weights.temporalConsistency;

  return Math.round(score);
}

// ============================================================================
// Competitive Ranking
// ============================================================================

/**
 * Calculate competitive ranking for entities
 * Compares entity authority against competitors
 */
export function calculateCompetitiveRanking(
  userAuthorities: EntityAuthority[],
  competitorAuthorities: EntityAuthority[][]
): EntityAuthority[] {
  // Create a map of entity names to all authority scores
  const entityScores = new Map<string, number[]>();

  // Add user scores
  for (const auth of userAuthorities) {
    if (!entityScores.has(auth.entityName)) {
      entityScores.set(auth.entityName, []);
    }
    entityScores.get(auth.entityName)!.push(auth.authorityScore);
  }

  // Add competitor scores
  for (const competitorAuths of competitorAuthorities) {
    for (const auth of competitorAuths) {
      if (!entityScores.has(auth.entityName)) {
        entityScores.set(auth.entityName, []);
      }
      entityScores.get(auth.entityName)!.push(auth.authorityScore);
    }
  }

  // Calculate percentiles and top competitors
  return userAuthorities.map(userAuth => {
    const allScores = entityScores.get(userAuth.entityName) || [userAuth.authorityScore];
    const sortedScores = [...allScores].sort((a, b) => b - a);
    
    const rank = sortedScores.indexOf(userAuth.authorityScore) + 1;
    const percentile = ((sortedScores.length - rank + 1) / sortedScores.length) * 100;

    // Get top 3 competitors for this entity
    const topCompetitors = sortedScores
      .slice(0, 3)
      .filter(score => score !== userAuth.authorityScore)
      .map((score, idx) => ({
        name: `Competitor ${idx + 1}`,
        score,
      }));

    return {
      ...userAuth,
      competitiveRanking: {
        percentile: Math.round(percentile),
        topCompetitors,
      },
    };
  });
}

/**
 * Calculate growth trend for entities
 * Analyzes how entity authority has changed over time
 */
export function calculateGrowthTrend(
  _entity: Entity,
  historicalAuthorities: EntityAuthority[]
): {
  direction: 'increasing' | 'decreasing' | 'stable';
  velocity: number;
} {
  if (historicalAuthorities.length < 2) {
    return { direction: 'stable', velocity: 0 };
  }

  // Sort by time (assuming they're in chronological order)
  const scores = historicalAuthorities.map(auth => auth.authorityScore);

  // Calculate linear regression slope
  const n = scores.length;
  const xMean = (n - 1) / 2;
  const yMean = scores.reduce((sum, score) => sum + score, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (scores[i] - yMean);
    denominator += (i - xMean) ** 2;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;

  // Determine direction
  let direction: 'increasing' | 'decreasing' | 'stable';
  if (Math.abs(slope) < 0.5) {
    direction = 'stable';
  } else if (slope > 0) {
    direction = 'increasing';
  } else {
    direction = 'decreasing';
  }

  // Velocity is the absolute slope
  const velocity = Math.abs(slope);

  return { direction, velocity };
}

// ============================================================================
// Types
// ============================================================================

/**
 * External validation data from external sources
 */
export interface ExternalValidationData {
  /** Number of backlinks to entity */
  backlinks?: number;
  
  /** Number of mentions across the web */
  mentions?: number;
  
  /** Number of citations in academic/authoritative sources */
  citations?: number;
  
  /** Domain authority score (0-100) */
  domainAuthority?: number;
  
  /** Social media mentions */
  socialMentions?: number;
  
  /** News mentions */
  newsMentions?: number;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Get top N entities by authority score
 */
export function getTopEntities(
  authorities: EntityAuthority[],
  n: number = 10
): EntityAuthority[] {
  return [...authorities]
    .sort((a, b) => b.authorityScore - a.authorityScore)
    .slice(0, n);
}

/**
 * Get entities below authority threshold
 */
export function getLowAuthorityEntities(
  authorities: EntityAuthority[],
  threshold: number = 30
): EntityAuthority[] {
  return authorities.filter(auth => auth.authorityScore < threshold);
}

/**
 * Calculate average authority score for a graph
 */
export function calculateAverageAuthority(
  authorities: EntityAuthority[]
): number {
  if (authorities.length === 0) return 0;
  
  const sum = authorities.reduce((acc, auth) => acc + auth.authorityScore, 0);
  return Math.round(sum / authorities.length);
}

/**
 * Group entities by authority tier
 */
export function groupByAuthorityTier(
  authorities: EntityAuthority[]
): {
  high: EntityAuthority[];
  medium: EntityAuthority[];
  low: EntityAuthority[];
} {
  return {
    high: authorities.filter(auth => auth.authorityScore >= 70),
    medium: authorities.filter(auth => auth.authorityScore >= 40 && auth.authorityScore < 70),
    low: authorities.filter(auth => auth.authorityScore < 40),
  };
}
