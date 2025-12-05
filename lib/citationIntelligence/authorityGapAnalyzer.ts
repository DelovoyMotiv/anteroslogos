/**
 * Authority Gap Analyzer
 * Identifies gaps in entity authority between user and competitors
 * 
 * Helps identify opportunities to build authority by:
 * 1. Finding entities where competitors have stronger presence
 * 2. Identifying missing entities in user's knowledge graph
 * 3. Ranking gaps by opportunity (high/medium/low)
 * 4. Generating actionable recommendations
 */

import type {
  KnowledgeGraph,
  EntityAuthority,
  AuthorityGap,
} from '../../types/citation-intelligence.types';
import {
  calculateAllEntityAuthorities,
  calculateAverageAuthority,
} from './entityAuthority';

// ============================================================================
// Core Gap Identification
// ============================================================================

/**
 * Identify authority gaps between user and competitors
 * 
 * @param userGraph - User's knowledge graph
 * @param competitorGraphs - Array of competitor knowledge graphs
 * @returns Array of authority gaps ranked by opportunity
 */
export function identifyAuthorityGaps(
  userGraph: KnowledgeGraph,
  competitorGraphs: KnowledgeGraph[]
): AuthorityGap[] {
  // Calculate authorities for user and competitors
  const userAuthorities = calculateAllEntityAuthorities(userGraph);
  const competitorAuthorities = competitorGraphs.map(graph =>
    calculateAllEntityAuthorities(graph)
  );

  // Build entity authority maps
  const userAuthorityMap = new Map(
    userAuthorities.map(auth => [auth.entityName.toLowerCase(), auth])
  );

  // Collect all competitor entities with their max authority scores
  const competitorEntityMap = new Map<string, EntityAuthority>();

  for (const compAuth of competitorAuthorities) {
    for (const auth of compAuth) {
      const entityKey = auth.entityName.toLowerCase();
      const existing = competitorEntityMap.get(entityKey);

      // Keep the highest authority score among competitors
      if (!existing || auth.authorityScore > existing.authorityScore) {
        competitorEntityMap.set(entityKey, auth);
      }
    }
  }

  // Identify gaps
  const gaps: AuthorityGap[] = [];

  // 1. Entities where competitors have higher authority
  for (const [entityKey, competitorAuth] of competitorEntityMap.entries()) {
    const userAuth = userAuthorityMap.get(entityKey);

    if (userAuth) {
      // User has this entity, but competitor has higher authority
      const gap = competitorAuth.authorityScore - userAuth.authorityScore;

      if (gap > 5) {
        // Only include meaningful gaps (> 5 points)
        gaps.push({
          entity: competitorAuth.entityName,
          userScore: userAuth.authorityScore,
          competitorScore: competitorAuth.authorityScore,
          gap,
          opportunity: categorizeOpportunity(gap, competitorAuth.authorityScore),
          recommendations: generateGapRecommendations(
            competitorAuth.entityName,
            userAuth,
            competitorAuth
          ),
        });
      }
    } else {
      // User doesn't have this entity at all - missing entity gap
      gaps.push({
        entity: competitorAuth.entityName,
        userScore: 0,
        competitorScore: competitorAuth.authorityScore,
        gap: competitorAuth.authorityScore,
        opportunity: categorizeOpportunity(
          competitorAuth.authorityScore,
          competitorAuth.authorityScore
        ),
        recommendations: generateMissingEntityRecommendations(
          competitorAuth.entityName,
          competitorAuth
        ),
      });
    }
  }

  // Sort by opportunity (high > medium > low) and then by gap size
  return gaps.sort((a, b) => {
    const opportunityOrder = { high: 0, medium: 1, low: 2 };
    const orderDiff = opportunityOrder[a.opportunity] - opportunityOrder[b.opportunity];

    if (orderDiff !== 0) return orderDiff;
    return b.gap - a.gap;
  });
}

/**
 * Categorize opportunity level based on gap size and competitor score
 * 
 * High: Large gap (>30) or high competitor score (>70)
 * Medium: Moderate gap (15-30) or moderate competitor score (40-70)
 * Low: Small gap (<15) or low competitor score (<40)
 */
function categorizeOpportunity(
  gap: number,
  competitorScore: number
): 'high' | 'medium' | 'low' {
  // High opportunity: Large gap or competitor has very high authority
  if (gap > 30 || competitorScore > 70) {
    return 'high';
  }

  // Medium opportunity: Moderate gap or competitor has moderate authority
  if (gap > 15 || competitorScore > 40) {
    return 'medium';
  }

  // Low opportunity: Small gap or competitor has low authority
  return 'low';
}

/**
 * Generate recommendations for closing an authority gap
 */
function generateGapRecommendations(
  entityName: string,
  userAuth: EntityAuthority,
  competitorAuth: EntityAuthority
): string[] {
  const recommendations: string[] = [];

  // Analyze component gaps
  const componentGaps = {
    relationshipDensity:
      competitorAuth.components.relationshipDensity - userAuth.components.relationshipDensity,
    claimEvidence:
      competitorAuth.components.claimEvidence - userAuth.components.claimEvidence,
    externalValidation:
      competitorAuth.components.externalValidation - userAuth.components.externalValidation,
    temporalConsistency:
      competitorAuth.components.temporalConsistency - userAuth.components.temporalConsistency,
  };

  // Recommend based on largest gaps
  const sortedGaps = Object.entries(componentGaps)
    .sort(([, a], [, b]) => b - a)
    .filter(([, gap]) => gap > 10); // Only significant gaps

  for (const [component, gap] of sortedGaps) {
    switch (component) {
      case 'relationshipDensity':
        recommendations.push(
          `Build more relationships for "${entityName}" - competitor has ${Math.round(gap)} points higher relationship density. Add connections to related entities, concepts, and organizations.`
        );
        break;

      case 'claimEvidence':
        recommendations.push(
          `Strengthen claims about "${entityName}" with more evidence - competitor has ${Math.round(gap)} points higher claim evidence score. Add citations, data points, and expert opinions.`
        );
        break;

      case 'externalValidation':
        recommendations.push(
          `Increase external validation for "${entityName}" - competitor has ${Math.round(gap)} points higher external validation. Build backlinks, earn mentions, and get cited by authoritative sources.`
        );
        break;

      case 'temporalConsistency':
        recommendations.push(
          `Maintain consistent presence of "${entityName}" over time - competitor has ${Math.round(gap)} points higher temporal consistency. Regularly update content mentioning this entity.`
        );
        break;
    }
  }

  // If no specific component gaps, provide general recommendation
  if (recommendations.length === 0) {
    recommendations.push(
      `Improve overall authority for "${entityName}" by adding more content, relationships, and evidence.`
    );
  }

  return recommendations;
}

/**
 * Generate recommendations for missing entities
 */
function generateMissingEntityRecommendations(
  entityName: string,
  competitorAuth: EntityAuthority
): string[] {
  const recommendations: string[] = [];

  // Primary recommendation: Create content about this entity
  recommendations.push(
    `Create comprehensive content about "${entityName}" - this entity is present in competitor knowledge graphs but missing from yours. Competitor authority score: ${competitorAuth.authorityScore}/100.`
  );

  // Specific recommendations based on entity type
  switch (competitorAuth.entityType) {
    case 'Person':
      recommendations.push(
        `Add author bio, credentials, and expertise information for ${entityName}. Include their role, experience, and contributions to the field.`
      );
      break;

    case 'Organization':
      recommendations.push(
        `Create organization profile for ${entityName}. Include company information, products/services, and industry relationships.`
      );
      break;

    case 'Product':
      recommendations.push(
        `Add product information for ${entityName}. Include features, specifications, use cases, and customer testimonials.`
      );
      break;

    case 'Concept':
      recommendations.push(
        `Develop educational content explaining ${entityName}. Include definitions, examples, and practical applications.`
      );
      break;

    case 'Event':
      recommendations.push(
        `Document ${entityName} with details about date, location, participants, and outcomes.`
      );
      break;

    default:
      recommendations.push(
        `Add detailed information about ${entityName} including description, context, and relationships to other entities.`
      );
  }

  // Recommend building relationships
  recommendations.push(
    `Establish relationships between ${entityName} and existing entities in your knowledge graph to build authority.`
  );

  // Recommend schema markup
  recommendations.push(
    `Implement JSON-LD schema markup for ${entityName} to improve AI understanding and citation potential.`
  );

  return recommendations;
}

// ============================================================================
// Gap Analysis Utilities
// ============================================================================

/**
 * Get top N authority gaps
 */
export function getTopGaps(gaps: AuthorityGap[], n: number = 10): AuthorityGap[] {
  return gaps.slice(0, n);
}

/**
 * Filter gaps by opportunity level
 */
export function filterGapsByOpportunity(
  gaps: AuthorityGap[],
  opportunity: 'high' | 'medium' | 'low'
): AuthorityGap[] {
  return gaps.filter(gap => gap.opportunity === opportunity);
}

/**
 * Get high-priority gaps (high opportunity)
 */
export function getHighPriorityGaps(gaps: AuthorityGap[]): AuthorityGap[] {
  return filterGapsByOpportunity(gaps, 'high');
}

/**
 * Get missing entities (user score = 0)
 */
export function getMissingEntities(gaps: AuthorityGap[]): AuthorityGap[] {
  return gaps.filter(gap => gap.userScore === 0);
}

/**
 * Get weak entities (user has entity but low score)
 */
export function getWeakEntities(gaps: AuthorityGap[], threshold: number = 30): AuthorityGap[] {
  return gaps.filter(gap => gap.userScore > 0 && gap.userScore < threshold);
}

/**
 * Calculate gap statistics
 */
export function calculateGapStatistics(gaps: AuthorityGap[]): {
  totalGaps: number;
  missingEntities: number;
  weakEntities: number;
  averageGap: number;
  highOpportunityCount: number;
  mediumOpportunityCount: number;
  lowOpportunityCount: number;
} {
  const missing = getMissingEntities(gaps);
  const weak = getWeakEntities(gaps);

  const averageGap =
    gaps.length > 0 ? gaps.reduce((sum, gap) => sum + gap.gap, 0) / gaps.length : 0;

  return {
    totalGaps: gaps.length,
    missingEntities: missing.length,
    weakEntities: weak.length,
    averageGap: Math.round(averageGap),
    highOpportunityCount: filterGapsByOpportunity(gaps, 'high').length,
    mediumOpportunityCount: filterGapsByOpportunity(gaps, 'medium').length,
    lowOpportunityCount: filterGapsByOpportunity(gaps, 'low').length,
  };
}

/**
 * Group gaps by entity type
 */
export function groupGapsByEntityType(
  gaps: AuthorityGap[],
  competitorGraphs: KnowledgeGraph[]
): Map<string, AuthorityGap[]> {
  const grouped = new Map<string, AuthorityGap[]>();

  // Build entity type map from competitor graphs
  const entityTypeMap = new Map<string, string>();

  for (const graph of competitorGraphs) {
    for (const entity of graph.entities) {
      entityTypeMap.set(entity.name.toLowerCase(), entity.type);
    }
  }

  // Group gaps by type
  for (const gap of gaps) {
    const entityType = entityTypeMap.get(gap.entity.toLowerCase()) || 'Unknown';

    if (!grouped.has(entityType)) {
      grouped.set(entityType, []);
    }

    grouped.get(entityType)!.push(gap);
  }

  return grouped;
}

/**
 * Calculate competitive positioning score
 * 
 * Returns a score (0-100) indicating how well the user is positioned
 * relative to competitors. Higher is better.
 */
export function calculateCompetitivePositioning(
  userGraph: KnowledgeGraph,
  competitorGraphs: KnowledgeGraph[]
): {
  score: number;
  interpretation: string;
  strengths: string[];
  weaknesses: string[];
} {
  const userAuthorities = calculateAllEntityAuthorities(userGraph);
  const competitorAuthorities = competitorGraphs.map(graph =>
    calculateAllEntityAuthorities(graph)
  );

  const userAvgAuthority = calculateAverageAuthority(userAuthorities);
  const competitorAvgAuthorities = competitorAuthorities.map(auths =>
    calculateAverageAuthority(auths)
  );

  const avgCompetitorAuthority =
    competitorAvgAuthorities.reduce((sum, avg) => sum + avg, 0) /
    competitorAvgAuthorities.length;

  // Calculate positioning score
  // 100 = user is 50+ points ahead of average competitor
  // 50 = user is equal to average competitor
  // 0 = user is 50+ points behind average competitor
  const difference = userAvgAuthority - avgCompetitorAuthority;
  const score = Math.max(0, Math.min(100, 50 + difference));

  // Determine interpretation
  let interpretation: string;
  if (score >= 70) {
    interpretation = 'Strong competitive position - leading in entity authority';
  } else if (score >= 50) {
    interpretation = 'Competitive position - on par with competitors';
  } else if (score >= 30) {
    interpretation = 'Weak competitive position - behind competitors';
  } else {
    interpretation = 'Very weak competitive position - significant gaps exist';
  }

  // Identify strengths and weaknesses
  const gaps = identifyAuthorityGaps(userGraph, competitorGraphs);
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Find entities where user is ahead
  const userEntityMap = new Map(
    userAuthorities.map(auth => [auth.entityName.toLowerCase(), auth])
  );

  for (const compAuths of competitorAuthorities) {
    for (const compAuth of compAuths) {
      const userAuth = userEntityMap.get(compAuth.entityName.toLowerCase());

      if (userAuth && userAuth.authorityScore > compAuth.authorityScore + 10) {
        strengths.push(
          `Strong authority for "${userAuth.entityName}" (${userAuth.authorityScore} vs ${compAuth.authorityScore})`
        );
      }
    }
  }

  // Top weaknesses from gaps
  const topGaps = getTopGaps(gaps, 3);
  for (const gap of topGaps) {
    weaknesses.push(
      `${gap.entity}: ${gap.userScore} vs ${gap.competitorScore} (gap: ${gap.gap})`
    );
  }

  return {
    score: Math.round(score),
    interpretation,
    strengths: strengths.slice(0, 5), // Top 5 strengths
    weaknesses,
  };
}

/**
 * Generate competitive strategy report
 */
export function generateCompetitiveStrategy(
  userGraph: KnowledgeGraph,
  competitorGraphs: KnowledgeGraph[]
): {
  positioning: ReturnType<typeof calculateCompetitivePositioning>;
  gaps: AuthorityGap[];
  statistics: ReturnType<typeof calculateGapStatistics>;
  priorityActions: string[];
} {
  const gaps = identifyAuthorityGaps(userGraph, competitorGraphs);
  const positioning = calculateCompetitivePositioning(userGraph, competitorGraphs);
  const statistics = calculateGapStatistics(gaps);

  // Generate priority actions
  const priorityActions: string[] = [];
  const highPriorityGaps = getHighPriorityGaps(gaps).slice(0, 5);

  for (const gap of highPriorityGaps) {
    priorityActions.push(
      `${gap.entity} (Gap: ${gap.gap} points) - ${gap.recommendations[0]}`
    );
  }

  return {
    positioning,
    gaps,
    statistics,
    priorityActions,
  };
}
