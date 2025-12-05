/**
 * Quick-Win Identifier
 * Identifies low-effort, high-impact optimization opportunities
 * 
 * This module analyzes citation probability factors and feature vectors
 * to identify quick wins that can be implemented with minimal effort
 * but provide significant citation probability improvements.
 * 
 * @module lib/citationIntelligence/quickWinIdentifier
 */

import type {
  CitationProbabilityResult,
  FeatureVector,
} from '../../types/citation-intelligence.types';

// ============================================================================
// Types
// ============================================================================

interface QuickWin {
  action: string;
  expectedLift: number;
  effort: 'low' | 'medium' | 'high';
  priority: number; // 1-10, higher = more important
  category: 'content' | 'entity' | 'technical' | 'competitive';
  implementation: string[];
}

interface QuickWinAnalysis {
  quickWins: QuickWin[];
  totalPotentialLift: number;
  recommendedSequence: string[];
  estimatedTimeToImplement: string;
}

// ============================================================================
// Quick-Win Rules
// ============================================================================

/**
 * Analyze feature vector and identify quick wins
 */
export function identifyQuickWins(
  featureVector: FeatureVector,
  _citationResult: CitationProbabilityResult
): QuickWinAnalysis {
  // _citationResult can be used for future enhancements
  const quickWins: QuickWin[] = [];
  
  // Content Quality Quick Wins
  if (featureVector.entityCount < 10) {
    quickWins.push({
      action: 'Add more entities to content',
      expectedLift: calculateExpectedLift(featureVector.entityCount, 10, 5),
      effort: 'low',
      priority: 9,
      category: 'content',
      implementation: [
        'Identify key concepts, people, and organizations in your content',
        'Add proper names and technical terms',
        'Target: 10-20 entities per page',
        'Use structured data markup for entities',
      ],
    });
  }
  
  if (featureVector.claimCount < 5) {
    quickWins.push({
      action: 'Add more factual claims with evidence',
      expectedLift: calculateExpectedLift(featureVector.claimCount, 5, 4),
      effort: 'low',
      priority: 8,
      category: 'content',
      implementation: [
        'Add specific, verifiable statements',
        'Include data points and statistics',
        'Cite authoritative sources',
        'Target: 5-10 claims per page',
      ],
    });
  }
  
  if (featureVector.semanticDensity < 50) {
    quickWins.push({
      action: 'Increase semantic density',
      expectedLift: calculateExpectedLift(featureVector.semanticDensity, 50, 6),
      effort: 'medium',
      priority: 7,
      category: 'content',
      implementation: [
        'Add technical terms and domain-specific vocabulary',
        'Include structured data (JSON-LD, microdata)',
        'Use clear, information-rich language',
        'Avoid filler words and vague statements',
      ],
    });
  }
  
  if (featureVector.wordCount < 1000) {
    quickWins.push({
      action: 'Expand content length',
      expectedLift: calculateExpectedLift(featureVector.wordCount, 1000, 3),
      effort: 'medium',
      priority: 6,
      category: 'content',
      implementation: [
        'Add more detailed explanations',
        'Include examples and case studies',
        'Target: 1500-2500 words for comprehensive coverage',
        'Ensure added content is high-quality and relevant',
      ],
    });
  }
  
  // Entity Authority Quick Wins
  if (featureVector.avgEntityAuthority < 50) {
    quickWins.push({
      action: 'Strengthen entity authority',
      expectedLift: calculateExpectedLift(featureVector.avgEntityAuthority, 50, 7),
      effort: 'medium',
      priority: 8,
      category: 'entity',
      implementation: [
        'Add citations for entity claims',
        'Link to authoritative external sources',
        'Include expert opinions and credentials',
        'Build relationships between entities',
      ],
    });
  }
  
  if (featureVector.entityDiversity < 40) {
    quickWins.push({
      action: 'Diversify entity types',
      expectedLift: calculateExpectedLift(featureVector.entityDiversity, 40, 3),
      effort: 'low',
      priority: 5,
      category: 'entity',
      implementation: [
        'Include different entity types: people, organizations, products, concepts',
        'Add geographic locations and events',
        'Reference creative works and technologies',
        'Target: 4-6 different entity types',
      ],
    });
  }
  
  // Technical Quick Wins
  if (featureVector.readabilityScore < 60) {
    quickWins.push({
      action: 'Improve readability',
      expectedLift: calculateExpectedLift(featureVector.readabilityScore, 60, 2),
      effort: 'low',
      priority: 4,
      category: 'technical',
      implementation: [
        'Use shorter sentences (15-20 words average)',
        'Break up long paragraphs',
        'Use bullet points and lists',
        'Add headings and subheadings',
      ],
    });
  }
  
  // Competitive Quick Wins
  if (featureVector.relativePositioning < 50) {
    quickWins.push({
      action: 'Close competitive gaps',
      expectedLift: calculateExpectedLift(featureVector.relativePositioning, 50, 5),
      effort: 'medium',
      priority: 7,
      category: 'competitive',
      implementation: [
        'Analyze top competitor content',
        'Identify missing topics and entities',
        'Match or exceed competitor content depth',
        'Add unique insights competitors lack',
      ],
    });
  }
  
  // Temporal Quick Wins
  if (featureVector.recentVelocity < 0) {
    quickWins.push({
      action: 'Reverse negative trend',
      expectedLift: 4,
      effort: 'high',
      priority: 9,
      category: 'content',
      implementation: [
        'Review recent changes that may have caused decline',
        'Restore removed content if appropriate',
        'Implement multiple quick wins simultaneously',
        'Monitor daily for improvement',
      ],
    });
  }
  
  // Sort by priority (descending) and expected lift (descending)
  quickWins.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return b.expectedLift - a.expectedLift;
  });
  
  // Calculate total potential lift
  const totalPotentialLift = quickWins.reduce((sum, qw) => sum + qw.expectedLift, 0);
  
  // Generate recommended sequence (prioritize low-effort, high-impact)
  const recommendedSequence = generateRecommendedSequence(quickWins);
  
  // Estimate time to implement
  const estimatedTimeToImplement = estimateImplementationTime(quickWins.slice(0, 5));
  
  return {
    quickWins: quickWins.slice(0, 10), // Top 10 quick wins
    totalPotentialLift: Math.round(totalPotentialLift * 10) / 10,
    recommendedSequence,
    estimatedTimeToImplement,
  };
}

/**
 * Calculate expected lift based on current value and target
 */
function calculateExpectedLift(
  currentValue: number,
  targetValue: number,
  maxLift: number
): number {
  if (currentValue >= targetValue) return 0;
  
  const gap = targetValue - currentValue;
  const gapPercentage = gap / targetValue;
  
  // Lift is proportional to gap
  const lift = maxLift * gapPercentage;
  
  return Math.round(lift * 10) / 10;
}

/**
 * Generate recommended implementation sequence
 * Prioritizes low-effort, high-impact wins first
 */
function generateRecommendedSequence(quickWins: QuickWin[]): string[] {
  // Calculate impact-to-effort ratio
  const effortScores = { low: 1, medium: 2, high: 3 };
  
  const scored = quickWins.map(qw => ({
    action: qw.action,
    ratio: qw.expectedLift / effortScores[qw.effort],
  }));
  
  // Sort by ratio (descending)
  scored.sort((a, b) => b.ratio - a.ratio);
  
  return scored.slice(0, 5).map(s => s.action);
}

/**
 * Estimate total implementation time
 */
function estimateImplementationTime(quickWins: QuickWin[]): string {
  const effortHours = { low: 2, medium: 4, high: 8 };
  
  const totalHours = quickWins.reduce((sum, qw) => sum + effortHours[qw.effort], 0);
  
  if (totalHours < 4) return '2-4 hours';
  if (totalHours < 8) return '4-8 hours';
  if (totalHours < 16) return '1-2 days';
  if (totalHours < 40) return '3-5 days';
  return '1-2 weeks';
}

/**
 * Rank pages by citation potential
 * Identifies which pages should be prioritized for optimization
 */
export function rankPagesByCitationPotential(
  pages: Array<{
    url: string;
    currentScore: number;
    featureVector: FeatureVector;
  }>
): Array<{
  url: string;
  currentScore: number;
  potentialScore: number;
  potentialLift: number;
  priority: 'high' | 'medium' | 'low';
  quickWinCount: number;
}> {
  const ranked = pages.map(page => {
    // Calculate potential score based on feature gaps
    const gaps = [
      page.featureVector.entityCount < 10 ? 5 : 0,
      page.featureVector.claimCount < 5 ? 4 : 0,
      page.featureVector.semanticDensity < 50 ? 6 : 0,
      page.featureVector.avgEntityAuthority < 50 ? 7 : 0,
      page.featureVector.entityDiversity < 40 ? 3 : 0,
    ];
    
    const potentialLift = gaps.reduce((sum, gap) => sum + gap, 0);
    const potentialScore = Math.min(100, page.currentScore + potentialLift);
    
    // Count quick wins
    const quickWinCount = gaps.filter(gap => gap > 0).length;
    
    // Determine priority
    let priority: 'high' | 'medium' | 'low';
    if (potentialLift >= 15 && page.currentScore < 70) {
      priority = 'high';
    } else if (potentialLift >= 8 || page.currentScore < 50) {
      priority = 'medium';
    } else {
      priority = 'low';
    }
    
    return {
      url: page.url,
      currentScore: page.currentScore,
      potentialScore,
      potentialLift,
      priority,
      quickWinCount,
    };
  });
  
  // Sort by potential lift (descending)
  ranked.sort((a, b) => b.potentialLift - a.potentialLift);
  
  return ranked;
}

/**
 * Generate implementation roadmap
 * Creates a phased plan for implementing quick wins
 */
export function generateImplementationRoadmap(
  quickWins: QuickWin[]
): {
  phase1: { title: string; actions: string[]; duration: string };
  phase2: { title: string; actions: string[]; duration: string };
  phase3: { title: string; actions: string[]; duration: string };
} {
  // Phase 1: Low-effort wins
  const phase1Actions = quickWins
    .filter(qw => qw.effort === 'low')
    .slice(0, 3)
    .map(qw => qw.action);
  
  // Phase 2: Medium-effort wins
  const phase2Actions = quickWins
    .filter(qw => qw.effort === 'medium')
    .slice(0, 3)
    .map(qw => qw.action);
  
  // Phase 3: High-effort wins
  const phase3Actions = quickWins
    .filter(qw => qw.effort === 'high')
    .slice(0, 2)
    .map(qw => qw.action);
  
  return {
    phase1: {
      title: 'Quick Wins (Week 1)',
      actions: phase1Actions,
      duration: '3-5 days',
    },
    phase2: {
      title: 'Medium-Term Improvements (Week 2-3)',
      actions: phase2Actions,
      duration: '1-2 weeks',
    },
    phase3: {
      title: 'Strategic Enhancements (Month 2)',
      actions: phase3Actions,
      duration: '2-4 weeks',
    },
  };
}

