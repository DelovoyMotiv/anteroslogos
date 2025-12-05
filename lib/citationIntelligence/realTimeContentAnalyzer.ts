/**
 * Real-Time Content Analyzer
 * Analyzes content in real-time (< 2s) for citation optimization
 * 
 * This module implements:
 * 1. Semantic density calculation
 * 2. Entity extraction using NER
 * 3. Claim structure analysis
 * 4. Citation potential score calculation
 * 
 * @module lib/citationIntelligence/realTimeContentAnalyzer
 */

import type {
  Entity,
  Claim,
} from '../../types/citation-intelligence.types';
import { extractEntities } from '../nlu/entityExtractor';

// ============================================================================
// Types
// ============================================================================

export interface RealTimeAnalysisResult {
  semanticDensity: number; // 0-100
  entityPresence: {
    count: number;
    entities: Entity[];
    diversity: number; // 0-100
  };
  claimStructure: {
    totalClaims: number;
    claims: Claim[];
    evidenceRatio: number; // Claims with evidence / total claims
  };
  citationPotential: number; // 0-100
  analysisTime: number; // milliseconds
}

interface ClaimCandidate {
  text: string;
  startIndex: number;
  endIndex: number;
  hasEvidence: boolean;
  evidenceIndicators: string[];
}

// ============================================================================
// Semantic Density Calculation
// ============================================================================

/**
 * Calculate semantic density in real-time
 * Measures information richness and AI-parseable content quality
 */
function calculateSemanticDensity(
  content: string,
  entityCount: number,
  claimCount: number
): number {
  const words = content.split(/\s+/).filter(w => w.length > 0);
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
  
  // Structured content indicators
  const hasLists = /^[\s]*[-*•]\s/m.test(content) || /^\s*\d+\.\s/m.test(content);
  const hasHeadings = /^#{1,6}\s/m.test(content) || /<h[1-6]>/i.test(content);
  const hasCode = /```|<code>/i.test(content);
  const structureScore = (
    (hasLists ? 33 : 0) +
    (hasHeadings ? 33 : 0) +
    (hasCode ? 34 : 0)
  );
  
  // Weighted average
  return (
    entityScore * 0.35 +
    claimScore * 0.35 +
    technicalScore * 0.20 +
    structureScore * 0.10
  );
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

// ============================================================================
// Entity Extraction (NER)
// ============================================================================

/**
 * Extract entities using Named Entity Recognition
 * Uses the existing entityExtractor module
 */
function extractEntitiesForAnalysis(content: string): {
  count: number;
  entities: Entity[];
  diversity: number;
} {
  // Use existing entity extractor
  const extractionResult = extractEntities(content);
  
  // Convert to Entity format
  const entities: Entity[] = extractionResult.entities.map((entity, index) => ({
    id: `entity_${index}`,
    name: entity.text,
    type: entity.type,
    properties: {
      confidence: entity.confidence,
      startIndex: entity.startIndex,
      endIndex: entity.endIndex,
    },
  }));
  
  // Calculate diversity (how many different entity types)
  const entityTypes = new Set(entities.map(e => e.type));
  const diversity = (entityTypes.size / 8) * 100; // 8 possible entity types
  
  return {
    count: entities.length,
    entities,
    diversity,
  };
}

// ============================================================================
// Claim Structure Analysis
// ============================================================================

/**
 * Evidence indicators that suggest a claim has supporting evidence
 */
const EVIDENCE_INDICATORS = [
  'according to',
  'research shows',
  'studies indicate',
  'study found',
  'proven',
  'demonstrated',
  'evidence',
  'data shows',
  'statistics show',
  'reported',
  'published',
  'survey found',
  'analysis reveals',
  'findings suggest',
  'results indicate',
  'documented',
  'confirmed',
  'verified',
  'established',
  'observed',
];

/**
 * Patterns that indicate factual claims
 */
const CLAIM_PATTERNS = [
  // Causal claims
  /\b(causes?|leads? to|results? in|due to|because of)\b/i,
  // Comparative claims
  /\b(more|less|better|worse|higher|lower|faster|slower) than\b/i,
  // Quantitative claims
  /\b\d+(\.\d+)?%?\b.*\b(increase|decrease|growth|decline|rise|fall)\b/i,
  // Definitive statements
  /\b(is|are|was|were|will be|has been)\b.*\b(the|a|an)\b/i,
  // Research claims
  /\b(research|study|studies|analysis|data|evidence|findings)\b.*\b(shows?|indicates?|suggests?|reveals?|demonstrates?)\b/i,
];

/**
 * Extract claim candidates from content
 */
function extractClaimCandidates(content: string): ClaimCandidate[] {
  const claims: ClaimCandidate[] = [];
  
  // Split into sentences
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let currentIndex = 0;
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    
    // Check if sentence matches claim patterns
    const isClaimCandidate = CLAIM_PATTERNS.some(pattern => pattern.test(trimmedSentence));
    
    if (isClaimCandidate && trimmedSentence.split(/\s+/).length >= 5) {
      // Check for evidence indicators
      const evidenceIndicators = EVIDENCE_INDICATORS.filter(indicator =>
        trimmedSentence.toLowerCase().includes(indicator)
      );
      
      const hasEvidence = evidenceIndicators.length > 0;
      
      claims.push({
        text: trimmedSentence,
        startIndex: currentIndex,
        endIndex: currentIndex + trimmedSentence.length,
        hasEvidence,
        evidenceIndicators,
      });
    }
    
    currentIndex += sentence.length + 1; // +1 for delimiter
  }
  
  return claims;
}

/**
 * Analyze claim structure
 */
function analyzeClaimStructure(content: string): {
  totalClaims: number;
  claims: Claim[];
  evidenceRatio: number;
} {
  const claimCandidates = extractClaimCandidates(content);
  
  // Convert to Claim format
  const claims: Claim[] = claimCandidates.map((candidate, index) => ({
    id: `claim_${index}`,
    statement: candidate.text,
    subjectId: `entity_unknown`,
    predicateId: `predicate_${index}`,
    objectId: `entity_unknown`,
    confidence: candidate.hasEvidence ? 0.8 : 0.5,
    evidence: candidate.hasEvidence
      ? candidate.evidenceIndicators.map(indicator => ({
          type: 'citation' as const,
          source: indicator,
          confidence: 0.8,
        }))
      : [],
  }));
  
  // Calculate evidence ratio
  const claimsWithEvidence = claimCandidates.filter(c => c.hasEvidence).length;
  const evidenceRatio = claimCandidates.length > 0
    ? claimsWithEvidence / claimCandidates.length
    : 0;
  
  return {
    totalClaims: claims.length,
    claims,
    evidenceRatio,
  };
}

// ============================================================================
// Citation Potential Score
// ============================================================================

/**
 * Calculate citation potential score
 * Combines semantic density, entity presence, and claim structure
 */
function calculateCitationPotential(
  semanticDensity: number,
  entityCount: number,
  claimCount: number,
  evidenceRatio: number
): number {
  // Normalize entity count (target: 10-20 entities)
  const entityScore = Math.min(100, (entityCount / 15) * 100);
  
  // Normalize claim count (target: 5-10 claims)
  const claimScore = Math.min(100, (claimCount / 7.5) * 100);
  
  // Evidence ratio score (0-1 -> 0-100)
  const evidenceScore = evidenceRatio * 100;
  
  // Weighted average
  return (
    semanticDensity * 0.30 +
    entityScore * 0.25 +
    claimScore * 0.25 +
    evidenceScore * 0.20
  );
}

// ============================================================================
// Real-Time Content Analyzer
// ============================================================================

/**
 * Analyze content in real-time
 * Must complete in < 2 seconds
 */
export async function analyzeContentRealTime(
  content: string
): Promise<RealTimeAnalysisResult> {
  const startTime = Date.now();
  
  // Validate input
  if (!content || content.trim().length === 0) {
    return {
      semanticDensity: 0,
      entityPresence: {
        count: 0,
        entities: [],
        diversity: 0,
      },
      claimStructure: {
        totalClaims: 0,
        claims: [],
        evidenceRatio: 0,
      },
      citationPotential: 0,
      analysisTime: Date.now() - startTime,
    };
  }
  
  // Extract entities (parallel with claim analysis)
  const entityAnalysis = extractEntitiesForAnalysis(content);
  
  // Analyze claim structure
  const claimAnalysis = analyzeClaimStructure(content);
  
  // Calculate semantic density
  const semanticDensity = calculateSemanticDensity(
    content,
    entityAnalysis.count,
    claimAnalysis.totalClaims
  );
  
  // Calculate citation potential
  const citationPotential = calculateCitationPotential(
    semanticDensity,
    entityAnalysis.count,
    claimAnalysis.totalClaims,
    claimAnalysis.evidenceRatio
  );
  
  const analysisTime = Date.now() - startTime;
  
  return {
    semanticDensity: Math.round(semanticDensity * 100) / 100,
    entityPresence: {
      count: entityAnalysis.count,
      entities: entityAnalysis.entities,
      diversity: Math.round(entityAnalysis.diversity * 100) / 100,
    },
    claimStructure: {
      totalClaims: claimAnalysis.totalClaims,
      claims: claimAnalysis.claims,
      evidenceRatio: Math.round(claimAnalysis.evidenceRatio * 100) / 100,
    },
    citationPotential: Math.round(citationPotential * 100) / 100,
    analysisTime,
  };
}

/**
 * Batch analyze multiple content pieces
 * Useful for analyzing multiple sections or pages
 */
export async function analyzeContentBatch(
  contents: string[]
): Promise<RealTimeAnalysisResult[]> {
  // Process in parallel for better performance
  const results = await Promise.all(
    contents.map(content => analyzeContentRealTime(content))
  );
  
  return results;
}

/**
 * Get analysis summary statistics
 */
export function getAnalysisSummary(
  results: RealTimeAnalysisResult[]
): {
  avgSemanticDensity: number;
  avgEntityCount: number;
  avgClaimCount: number;
  avgCitationPotential: number;
  totalAnalysisTime: number;
} {
  if (results.length === 0) {
    return {
      avgSemanticDensity: 0,
      avgEntityCount: 0,
      avgClaimCount: 0,
      avgCitationPotential: 0,
      totalAnalysisTime: 0,
    };
  }
  
  const sum = results.reduce(
    (acc, result) => ({
      semanticDensity: acc.semanticDensity + result.semanticDensity,
      entityCount: acc.entityCount + result.entityPresence.count,
      claimCount: acc.claimCount + result.claimStructure.totalClaims,
      citationPotential: acc.citationPotential + result.citationPotential,
      analysisTime: acc.analysisTime + result.analysisTime,
    }),
    {
      semanticDensity: 0,
      entityCount: 0,
      claimCount: 0,
      citationPotential: 0,
      analysisTime: 0,
    }
  );
  
  return {
    avgSemanticDensity: Math.round((sum.semanticDensity / results.length) * 100) / 100,
    avgEntityCount: Math.round(sum.entityCount / results.length),
    avgClaimCount: Math.round(sum.claimCount / results.length),
    avgCitationPotential: Math.round((sum.citationPotential / results.length) * 100) / 100,
    totalAnalysisTime: sum.analysisTime,
  };
}
