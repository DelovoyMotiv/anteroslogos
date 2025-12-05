/**
 * Feature Extraction Pipeline
 * Extracts features for citation probability prediction
 * 
 * Feature Categories:
 * 1. Content Quality: word count, readability, semantic density, entity count, claim count
 * 2. Entity Authority: relationship density, claim evidence, external validation
 * 3. Temporal: historical trends, seasonality, change points
 * 4. Competitive: relative positioning, gap analysis
 * 
 * @module lib/citationIntelligence/featureExtractor
 */

import type {
  FeatureVector,
  KnowledgeGraph,
  TemporalData,
} from '../../types/citation-intelligence.types';
import { extractEntities } from '../nlu/entityExtractor';

// ============================================================================
// Content Quality Features
// ============================================================================

/**
 * Calculate readability score using Flesch Reading Ease
 * Score: 0-100 (higher = easier to read)
 * 
 * Formula: 206.835 - 1.015(words/sentences) - 84.6(syllables/words)
 */
function calculateReadability(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  
  if (sentences.length === 0 || words.length === 0) return 0;
  
  const syllableCount = words.reduce((sum, word) => sum + countSyllables(word), 0);
  
  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllableCount / words.length;
  
  const score = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  
  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Count syllables in a word (approximation)
 */
function countSyllables(word: string): number {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  
  // Count vowel groups
  const vowelGroups = word.match(/[aeiouy]+/g);
  let count = vowelGroups ? vowelGroups.length : 1;
  
  // Adjust for silent e
  if (word.endsWith('e')) count--;
  
  // Ensure at least 1 syllable
  return Math.max(1, count);
}

/**
 * Calculate semantic density
 * Measures information richness and AI-parseable content quality
 * 
 * Factors:
 * - Entity density (entities per 100 words)
 * - Claim density (claims per 100 words)
 * - Technical term density
 * - Structured data presence
 */
function calculateSemanticDensity(
  text: string,
  entityCount: number,
  claimCount: number
): number {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  
  if (wordCount === 0) return 0;
  
  // Entity density (target: 5-10 entities per 100 words)
  const entityDensity = (entityCount / wordCount) * 100;
  const entityScore = Math.min(100, (entityDensity / 10) * 100);
  
  // Claim density (target: 2-5 claims per 100 words)
  const claimDensity = (claimCount / wordCount) * 100;
  const claimScore = Math.min(100, (claimDensity / 5) * 100);
  
  // Technical term density (words with 3+ syllables)
  const technicalWords = words.filter(w => countSyllables(w) >= 3).length;
  const technicalDensity = (technicalWords / wordCount) * 100;
  const technicalScore = Math.min(100, (technicalDensity / 20) * 100);
  
  // Weighted average
  return (entityScore * 0.4 + claimScore * 0.4 + technicalScore * 0.2);
}

/**
 * Extract content quality features
 */
export function extractContentQualityFeatures(
  content: string,
  knowledgeGraph?: KnowledgeGraph
): {
  wordCount: number;
  readabilityScore: number;
  semanticDensity: number;
  entityCount: number;
  claimCount: number;
} {
  const words = content.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  
  // Extract entities if knowledge graph not provided
  let entityCount = 0;
  let claimCount = 0;
  
  if (knowledgeGraph) {
    entityCount = knowledgeGraph.entities.length;
    claimCount = knowledgeGraph.claims.length;
  } else {
    const entityResult = extractEntities(content);
    entityCount = entityResult.totalCount;
    
    // Estimate claims (sentences with evidence indicators)
    const sentences = content.split(/[.!?]+/);
    claimCount = sentences.filter(s => 
      /\b(according to|research shows|studies indicate|proven|demonstrated|evidence)\b/i.test(s)
    ).length;
  }
  
  const readabilityScore = calculateReadability(content);
  const semanticDensity = calculateSemanticDensity(content, entityCount, claimCount);
  
  return {
    wordCount,
    readabilityScore,
    semanticDensity,
    entityCount,
    claimCount,
  };
}

// ============================================================================
// Entity Authority Features
// ============================================================================

/**
 * Calculate relationship density for an entity
 * Measures how well-connected an entity is in the knowledge graph
 */
function calculateRelationshipDensity(
  entityId: string,
  knowledgeGraph: KnowledgeGraph
): number {
  const relationships = knowledgeGraph.relationships.filter(
    r => r.sourceId === entityId || r.targetId === entityId
  );
  
  const totalEntities = knowledgeGraph.entities.length;
  if (totalEntities <= 1) return 0;
  
  // Normalize by maximum possible relationships
  const maxRelationships = totalEntities - 1;
  return (relationships.length / maxRelationships) * 100;
}

/**
 * Calculate claim evidence score for an entity
 * Measures how well-supported claims about this entity are
 */
function calculateClaimEvidence(
  entityId: string,
  knowledgeGraph: KnowledgeGraph
): number {
  // Find claims where entity is subject, predicate, or object
  const entityClaims = knowledgeGraph.claims.filter(
    c => c.subjectId === entityId || c.predicateId === entityId || c.objectId === entityId
  );
  
  if (entityClaims.length === 0) return 0;
  
  // Average evidence count per claim
  const avgEvidence = entityClaims.reduce(
    (sum, claim) => sum + (claim.evidence?.length || 0),
    0
  ) / entityClaims.length;
  
  // Score based on evidence (target: 2+ evidence per claim)
  return Math.min(100, (avgEvidence / 2) * 100);
}

/**
 * Calculate external validation score
 * Measures how many external sources validate this entity
 */
function calculateExternalValidation(
  entityId: string,
  knowledgeGraph: KnowledgeGraph
): number {
  const entity = knowledgeGraph.entities.find(e => e.id === entityId);
  if (!entity) return 0;
  
  // Check for URL in properties (external reference)
  const hasUrl = !!(entity.properties && entity.properties.url);
  
  // Check for external citations in claims
  const entityClaims = knowledgeGraph.claims.filter(
    c => c.subjectId === entityId || c.predicateId === entityId || c.objectId === entityId
  );
  
  const externalCitations = entityClaims.reduce((sum, claim) => {
    if (!claim.evidence || !Array.isArray(claim.evidence)) return sum;
    return sum + claim.evidence.filter(e => e && e.type === 'citation').length;
  }, 0);
  
  // Score based on external references
  const urlScore = hasUrl ? 50 : 0;
  const citationScore = Math.min(50, externalCitations * 10);
  
  return urlScore + citationScore;
}

/**
 * Calculate temporal consistency
 * Measures how stable the entity information is over time
 */
function calculateTemporalConsistency(
  entityId: string,
  knowledgeGraph: KnowledgeGraph
): number {
  const entity = knowledgeGraph.entities.find(e => e.id === entityId);
  if (!entity) return 0;
  
  // For now, return high score if entity has temporal data
  // In production, this would analyze historical changes
  return 80;
}

/**
 * Extract entity authority features from knowledge graph
 */
export function extractEntityAuthorityFeatures(
  knowledgeGraph: KnowledgeGraph
): {
  avgEntityAuthority: number;
  maxEntityAuthority: number;
  entityDiversity: number;
} {
  if (knowledgeGraph.entities.length === 0) {
    return {
      avgEntityAuthority: 0,
      maxEntityAuthority: 0,
      entityDiversity: 0,
    };
  }
  
  // Calculate authority for each entity
  const authorityScores = knowledgeGraph.entities.map(entity => {
    const relationshipDensity = calculateRelationshipDensity(entity.id, knowledgeGraph);
    const claimEvidence = calculateClaimEvidence(entity.id, knowledgeGraph);
    const externalValidation = calculateExternalValidation(entity.id, knowledgeGraph);
    const temporalConsistency = calculateTemporalConsistency(entity.id, knowledgeGraph);
    
    // Weighted average
    return (
      relationshipDensity * 0.3 +
      claimEvidence * 0.3 +
      externalValidation * 0.25 +
      temporalConsistency * 0.15
    );
  });
  
  const avgEntityAuthority = authorityScores.reduce((sum, score) => sum + score, 0) / authorityScores.length;
  const maxEntityAuthority = Math.max(...authorityScores);
  
  // Entity diversity: how many different entity types are present
  const entityTypes = new Set(knowledgeGraph.entities.map(e => e.type));
  const entityDiversity = (entityTypes.size / 8) * 100; // 8 possible entity types
  
  return {
    avgEntityAuthority,
    maxEntityAuthority,
    entityDiversity,
  };
}

// ============================================================================
// Temporal Features
// ============================================================================

/**
 * Calculate historical trend from temporal data
 * Returns slope of linear regression (positive = improving)
 */
function calculateHistoricalTrend(temporalData: TemporalData[]): number {
  if (temporalData.length < 2) return 0;
  
  // Sort by timestamp and filter out invalid scores
  const sorted = [...temporalData]
    .filter(d => Number.isFinite(d.scores.overall) && d.scores.overall >= 0 && d.scores.overall <= 100)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  if (sorted.length < 2) return 0;
  
  // Extract scores
  const scores = sorted.map(d => d.scores.overall);
  const n = scores.length;
  
  // Calculate linear regression slope
  const xMean = (n - 1) / 2; // Time indices: 0, 1, 2, ...
  const yMean = scores.reduce((sum, score) => sum + score, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (scores[i] - yMean);
    denominator += (i - xMean) ** 2;
  }
  
  const slope = denominator === 0 ? 0 : numerator / denominator;
  
  // Normalize to -100 to +100 range
  const result = Math.max(-100, Math.min(100, slope * 10));
  
  // Ensure result is finite
  return Number.isFinite(result) ? result : 0;
}

/**
 * Calculate seasonality index
 * Detects periodic patterns in temporal data
 */
function calculateSeasonalityIndex(temporalData: TemporalData[]): number {
  if (temporalData.length < 12) return 0; // Need at least 12 data points
  
  // Group by month
  const monthlyScores = new Map<number, number[]>();
  
  for (const data of temporalData) {
    const month = new Date(data.timestamp).getMonth();
    if (!monthlyScores.has(month)) {
      monthlyScores.set(month, []);
    }
    monthlyScores.get(month)!.push(data.scores.overall);
  }
  
  // Calculate variance between months
  const monthlyAverages = Array.from(monthlyScores.values()).map(scores =>
    scores.reduce((sum, score) => sum + score, 0) / scores.length
  );
  
  if (monthlyAverages.length < 2) return 0;
  
  const overallMean = monthlyAverages.reduce((sum, avg) => sum + avg, 0) / monthlyAverages.length;
  const variance = monthlyAverages.reduce((sum, avg) => sum + (avg - overallMean) ** 2, 0) / monthlyAverages.length;
  
  // Normalize variance to 0-100 scale
  return Math.min(100, Math.sqrt(variance));
}

/**
 * Calculate recent velocity (rate of change)
 * Measures how quickly scores are changing recently
 */
function calculateRecentVelocity(temporalData: TemporalData[]): number {
  if (temporalData.length < 2) return 0;
  
  // Sort by timestamp and filter out invalid scores
  const sorted = [...temporalData]
    .filter(d => Number.isFinite(d.scores.overall) && d.scores.overall >= 0 && d.scores.overall <= 100)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  if (sorted.length < 2) return 0;
  
  // Take last 5 data points (or all if less than 5)
  const recent = sorted.slice(-5);
  
  if (recent.length < 2) return 0;
  
  // Calculate average change between consecutive points
  let totalChange = 0;
  for (let i = 1; i < recent.length; i++) {
    totalChange += recent[i].scores.overall - recent[i - 1].scores.overall;
  }
  
  const avgChange = totalChange / (recent.length - 1);
  
  // Normalize to -100 to +100 range
  const result = Math.max(-100, Math.min(100, avgChange * 2));
  
  // Ensure result is finite
  return Number.isFinite(result) ? result : 0;
}

/**
 * Extract temporal features from historical data
 */
export function extractTemporalFeatures(
  temporalData: TemporalData[]
): {
  historicalTrend: number;
  seasonalityIndex: number;
  recentVelocity: number;
} {
  if (temporalData.length === 0) {
    return {
      historicalTrend: 0,
      seasonalityIndex: 0,
      recentVelocity: 0,
    };
  }
  
  return {
    historicalTrend: calculateHistoricalTrend(temporalData),
    seasonalityIndex: calculateSeasonalityIndex(temporalData),
    recentVelocity: calculateRecentVelocity(temporalData),
  };
}

// ============================================================================
// Competitive Features
// ============================================================================

/**
 * Calculate relative positioning vs competitors
 * Returns percentile rank (0-100, higher = better)
 */
function calculateRelativePositioning(
  userScore: number,
  competitorScores: number[]
): number {
  // Filter out invalid scores (NaN, Infinity, negative)
  const validScores = competitorScores.filter(score => 
    Number.isFinite(score) && score >= 0 && score <= 100
  );
  
  if (validScores.length === 0) return 50; // No valid competitors, assume median
  
  // Ensure user score is valid
  if (!Number.isFinite(userScore) || userScore < 0 || userScore > 100) {
    return 50;
  }
  
  // Count how many competitors have lower scores
  const lowerCount = validScores.filter(score => score < userScore).length;
  
  // Calculate percentile
  return (lowerCount / validScores.length) * 100;
}

/**
 * Calculate competitive gap score
 * Measures the gap between user and top competitor
 */
function calculateCompetitiveGapScore(
  userScore: number,
  competitorScores: number[]
): number {
  // Filter out invalid scores
  const validScores = competitorScores.filter(score => 
    Number.isFinite(score) && score >= 0 && score <= 100
  );
  
  if (validScores.length === 0) return 0;
  
  // Ensure user score is valid
  if (!Number.isFinite(userScore) || userScore < 0 || userScore > 100) {
    return 0;
  }
  
  const topCompetitorScore = Math.max(...validScores);
  const gap = topCompetitorScore - userScore;
  
  // Normalize to 0-100 scale (negative gap = user is ahead)
  return Math.max(-100, Math.min(100, gap));
}

/**
 * Extract competitive features
 */
export function extractCompetitiveFeatures(
  userScore: number,
  competitorScores: number[]
): {
  relativePositioning: number;
  competitiveGapScore: number;
} {
  return {
    relativePositioning: calculateRelativePositioning(userScore, competitorScores),
    competitiveGapScore: calculateCompetitiveGapScore(userScore, competitorScores),
  };
}

// ============================================================================
// Complete Feature Extraction
// ============================================================================

/**
 * Extract complete feature vector for citation probability prediction
 */
export function extractFeatures(
  content: string,
  knowledgeGraph: KnowledgeGraph,
  temporalData: TemporalData[],
  competitorScores: number[] = []
): FeatureVector {
  // Content quality features
  const contentFeatures = extractContentQualityFeatures(content, knowledgeGraph);
  
  // Entity authority features
  const entityFeatures = extractEntityAuthorityFeatures(knowledgeGraph);
  
  // Temporal features
  const temporalFeatures = extractTemporalFeatures(temporalData);
  
  // Competitive features
  const currentScore = temporalData.length > 0 
    ? temporalData[temporalData.length - 1].scores.overall 
    : 50;
  const competitiveFeatures = extractCompetitiveFeatures(currentScore, competitorScores);
  
  return {
    // Content quality
    wordCount: contentFeatures.wordCount,
    readabilityScore: contentFeatures.readabilityScore,
    semanticDensity: contentFeatures.semanticDensity,
    entityCount: contentFeatures.entityCount,
    claimCount: contentFeatures.claimCount,
    
    // Entity authority
    avgEntityAuthority: entityFeatures.avgEntityAuthority,
    maxEntityAuthority: entityFeatures.maxEntityAuthority,
    entityDiversity: entityFeatures.entityDiversity,
    
    // Temporal
    historicalTrend: temporalFeatures.historicalTrend,
    seasonalityIndex: temporalFeatures.seasonalityIndex,
    recentVelocity: temporalFeatures.recentVelocity,
    
    // Competitive
    relativePositioning: competitiveFeatures.relativePositioning,
    competitiveGapScore: competitiveFeatures.competitiveGapScore,
  };
}

/**
 * Normalize feature vector to 0-1 range for ML model input
 */
export function normalizeFeatures(features: FeatureVector): Record<string, number> {
  return {
    wordCount: Math.min(1, features.wordCount / 5000), // Normalize to 5000 words
    readabilityScore: features.readabilityScore / 100,
    semanticDensity: features.semanticDensity / 100,
    entityCount: Math.min(1, features.entityCount / 50), // Normalize to 50 entities
    claimCount: Math.min(1, features.claimCount / 20), // Normalize to 20 claims
    avgEntityAuthority: features.avgEntityAuthority / 100,
    maxEntityAuthority: features.maxEntityAuthority / 100,
    entityDiversity: features.entityDiversity / 100,
    historicalTrend: (features.historicalTrend + 100) / 200, // -100 to +100 -> 0 to 1
    seasonalityIndex: features.seasonalityIndex / 100,
    recentVelocity: (features.recentVelocity + 100) / 200, // -100 to +100 -> 0 to 1
    relativePositioning: features.relativePositioning / 100,
    competitiveGapScore: (features.competitiveGapScore + 100) / 200, // -100 to +100 -> 0 to 1
  };
}

