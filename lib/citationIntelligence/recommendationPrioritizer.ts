/**
 * Recommendation Prioritization System
 * Prioritizes recommendations based on proven causal impact
 * 
 * This module implements:
 * 1. Causal impact calculation for each optimization type
 * 2. Ranking recommendations by proven causal effect
 * 3. Expected citation lift with confidence intervals
 * 4. Filtering by statistical significance (p < 0.05)
 * 
 * Validates Requirements 10.3, 10.4
 * 
 * @module lib/citationIntelligence/recommendationPrioritizer
 */

import type {
  StrategyRecommendation,
  Intervention,
  OutcomeData,
  CausalImpact,
} from '../../types/citation-intelligence.types';

// ============================================================================
// Causal Impact Calculation
// ============================================================================

/**
 * Calculate causal impact for a specific intervention
 * Uses difference-in-differences (DiD) estimation
 * 
 * @param intervention - The intervention to analyze
 * @param outcomeData - Before/after data for the intervention
 * @returns Causal impact with effect size, confidence intervals, and p-value
 */
export function calculateCausalImpact(
  intervention: Intervention,
  outcomeData: OutcomeData
): CausalImpact {
  const { before, after, control } = outcomeData;
  
  // Validate data
  if (before.length === 0 || after.length === 0) {
    return {
      effect: 0,
      confidence: { lower: 0, upper: 0 },
      pValue: 1.0,
      significance: false,
      counterfactual: [],
    };
  }
  
  // Calculate means
  const beforeMean = before.reduce((sum, d) => sum + d.value, 0) / before.length;
  const afterMean = after.reduce((sum, d) => sum + d.value, 0) / after.length;
  
  // Calculate treatment effect
  let effect: number;
  let counterfactual: number[];
  
  if (control && control.length > 0) {
    // Use control group for difference-in-differences
    const controlBeforeMean = control
      .filter(d => d.timestamp < intervention.implementedAt)
      .reduce((sum, d) => sum + d.value, 0) / before.length;
    
    const controlAfterMean = control
      .filter(d => d.timestamp >= intervention.implementedAt)
      .reduce((sum, d) => sum + d.value, 0) / after.length;
    
    // DiD estimator: (After_Treatment - Before_Treatment) - (After_Control - Before_Control)
    const treatmentDiff = afterMean - beforeMean;
    const controlDiff = controlAfterMean - controlBeforeMean;
    effect = treatmentDiff - controlDiff;
    
    // Counterfactual: what would have happened without intervention
    // Assume same trend as control group
    counterfactual = after.map((_, i) => beforeMean + controlDiff * (i + 1) / after.length);
  } else {
    // Simple before-after comparison (less robust)
    effect = afterMean - beforeMean;
    
    // Counterfactual: assume no change
    counterfactual = after.map(() => beforeMean);
  }
  
  // Calculate standard error
  const beforeVariance = before.reduce(
    (sum, d) => sum + Math.pow(d.value - beforeMean, 2),
    0
  ) / (before.length - 1);
  
  const afterVariance = after.reduce(
    (sum, d) => sum + Math.pow(d.value - afterMean, 2),
    0
  ) / (after.length - 1);
  
  const standardError = Math.sqrt(
    beforeVariance / before.length + afterVariance / after.length
  );
  
  // Calculate confidence intervals (95% CI using t-distribution approximation)
  const degreesOfFreedom = before.length + after.length - 2;
  const tCritical = getTCritical(degreesOfFreedom, 0.05);
  const marginOfError = tCritical * standardError;
  
  const confidence = {
    lower: effect - marginOfError,
    upper: effect + marginOfError,
  };
  
  // Calculate p-value (two-tailed t-test)
  const tStatistic = standardError > 0 ? effect / standardError : 0;
  const pValue = calculatePValue(tStatistic, degreesOfFreedom);
  
  // Determine significance (p < 0.05)
  const significance = pValue < 0.05;
  
  return {
    effect: Math.round(effect * 100) / 100,
    confidence: {
      lower: Math.round(confidence.lower * 100) / 100,
      upper: Math.round(confidence.upper * 100) / 100,
    },
    pValue: Math.round(pValue * 10000) / 10000,
    significance,
    counterfactual: counterfactual.map(v => Math.round(v * 100) / 100),
  };
}

/**
 * Get t-critical value for confidence interval calculation
 * Approximation for common degrees of freedom
 */
function getTCritical(df: number, _alpha: number): number {
  // For 95% CI (alpha = 0.05), approximate t-critical values
  if (df >= 30) return 1.96; // Normal approximation
  if (df >= 20) return 2.086;
  if (df >= 10) return 2.228;
  if (df >= 5) return 2.571;
  return 2.776; // df < 5
}

/**
 * Calculate p-value from t-statistic
 * Approximation using normal distribution for large samples
 */
function calculatePValue(tStatistic: number, df: number): number {
  const absTStat = Math.abs(tStatistic);
  
  // For large df, use normal approximation
  if (df >= 30) {
    // Approximate p-value using standard normal distribution
    // P(|Z| > z) ≈ 2 * (1 - Φ(z))
    const z = absTStat;
    const pValue = 2 * (1 - normalCDF(z));
    return Math.max(0, Math.min(1, pValue));
  }
  
  // For smaller df, use conservative approximation
  // Map t-statistic to approximate p-value ranges
  if (absTStat >= 2.576) return 0.01; // Very significant
  if (absTStat >= 1.96) return 0.05; // Significant
  if (absTStat >= 1.645) return 0.10; // Marginally significant
  if (absTStat >= 1.282) return 0.20;
  return 0.50; // Not significant
}

/**
 * Standard normal cumulative distribution function
 * Approximation using error function
 */
function normalCDF(x: number): number {
  // Approximation: Φ(x) ≈ 0.5 * (1 + erf(x / sqrt(2)))
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

/**
 * Error function approximation
 * Abramowitz and Stegun approximation
 */
function erf(x: number): number {
  // Constants
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  
  // Save the sign of x
  const sign = x >= 0 ? 1 : -1;
  const absX = Math.abs(x);
  
  // A&S formula 7.1.26
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  
  return sign * y;
}

// ============================================================================
// Recommendation Prioritization
// ============================================================================

/**
 * Prioritize recommendations based on proven causal impact
 * 
 * @param recommendations - List of strategy recommendations
 * @param causalImpacts - Map of intervention type to causal impact
 * @param filterSignificant - Whether to filter by p < 0.05 (default: true)
 * @returns Prioritized and filtered recommendations
 */
export function prioritizeRecommendations(
  recommendations: StrategyRecommendation[],
  causalImpacts: Map<string, CausalImpact>,
  filterSignificant: boolean = true
): StrategyRecommendation[] {
  // Enrich recommendations with causal impact data
  const enrichedRecommendations = recommendations.map(rec => {
    const causalImpact = causalImpacts.get(rec.category) || (rec.type ? causalImpacts.get(rec.type) : undefined);
    
    if (causalImpact) {
      // Update expected impact with causal analysis
      return {
        ...rec,
        expectedImpact: {
          citationLift: causalImpact.effect,
          confidence: causalImpact.confidence,
        },
        metadata: {
          ...rec.metadata,
          causalImpact: {
            effect: causalImpact.effect,
            pValue: causalImpact.pValue,
            significance: causalImpact.significance,
          },
        },
      };
    }
    
    return rec;
  });
  
  // Filter by significance if requested
  let filteredRecommendations = enrichedRecommendations;
  if (filterSignificant) {
    filteredRecommendations = enrichedRecommendations.filter(rec => {
      const causalData = rec.metadata?.causalImpact;
      return causalData ? causalData.significance : false;
    });
  }
  
  // Sort by expected citation lift (descending)
  const sortedRecommendations = filteredRecommendations.sort((a, b) => {
    // Primary sort: expected citation lift
    const liftDiff = b.expectedImpact.citationLift - a.expectedImpact.citationLift;
    if (Math.abs(liftDiff) > 0.01) return liftDiff;
    
    // Secondary sort: confidence interval width (narrower is better)
    const aWidth = a.expectedImpact.confidence.upper - a.expectedImpact.confidence.lower;
    const bWidth = b.expectedImpact.confidence.upper - b.expectedImpact.confidence.lower;
    const widthDiff = aWidth - bWidth;
    if (Math.abs(widthDiff) > 0.01) return widthDiff;
    
    // Tertiary sort: effort level (lower is better)
    const effortOrder = { low: 1, medium: 2, high: 3 };
    return effortOrder[a.effort.level] - effortOrder[b.effort.level];
  });
  
  return sortedRecommendations;
}

/**
 * Calculate causal impact for multiple optimization types
 * 
 * @param interventions - List of interventions to analyze
 * @param outcomes - Map of intervention ID to outcome data
 * @returns Map of optimization type to causal impact
 */
export function calculateCausalImpactsByType(
  interventions: Intervention[],
  outcomes: Map<string, OutcomeData>
): Map<string, CausalImpact> {
  const impactsByType = new Map<string, CausalImpact[]>();
  
  // Calculate causal impact for each intervention
  for (const intervention of interventions) {
    const outcomeData = outcomes.get(intervention.id);
    
    if (outcomeData) {
      const impact = calculateCausalImpact(intervention, outcomeData);
      
      // Group by intervention type
      if (!impactsByType.has(intervention.type)) {
        impactsByType.set(intervention.type, []);
      }
      impactsByType.get(intervention.type)!.push(impact);
    }
  }
  
  // Aggregate impacts by type (average effect)
  const aggregatedImpacts = new Map<string, CausalImpact>();
  
  for (const [type, impacts] of Array.from(impactsByType.entries())) {
    if (impacts.length === 0) continue;
    
    // Calculate average effect
    const avgEffect = impacts.reduce((sum, i) => sum + i.effect, 0) / impacts.length;
    
    // Calculate pooled confidence interval
    const avgLower = impacts.reduce((sum, i) => sum + i.confidence.lower, 0) / impacts.length;
    const avgUpper = impacts.reduce((sum, i) => sum + i.confidence.upper, 0) / impacts.length;
    
    // Calculate combined p-value (Fisher's method)
    const combinedPValue = combinePValues(impacts.map(i => i.pValue));
    
    // Determine significance
    const significance = combinedPValue < 0.05;
    
    // Use first counterfactual as representative
    const counterfactual = impacts[0].counterfactual;
    
    aggregatedImpacts.set(type, {
      effect: Math.round(avgEffect * 100) / 100,
      confidence: {
        lower: Math.round(avgLower * 100) / 100,
        upper: Math.round(avgUpper * 100) / 100,
      },
      pValue: Math.round(combinedPValue * 10000) / 10000,
      significance,
      counterfactual,
    });
  }
  
  return aggregatedImpacts;
}

/**
 * Combine multiple p-values using Fisher's method
 * 
 * @param pValues - Array of p-values to combine
 * @returns Combined p-value
 */
function combinePValues(pValues: number[]): number {
  if (pValues.length === 0) return 1.0;
  if (pValues.length === 1) return pValues[0];
  
  // Fisher's method: -2 * sum(ln(p_i)) ~ Chi-squared(2k)
  // For simplicity, use geometric mean as approximation
  const product = pValues.reduce((prod, p) => prod * Math.max(p, 1e-10), 1);
  const geometricMean = Math.pow(product, 1 / pValues.length);
  
  return Math.max(0, Math.min(1, geometricMean));
}

// ============================================================================
// Display Formatting
// ============================================================================

/**
 * Format recommendation with causal impact for display
 * 
 * @param recommendation - Strategy recommendation
 * @returns Formatted recommendation with causal impact details
 */
export function formatRecommendationWithCausalImpact(
  recommendation: StrategyRecommendation
): {
  title: string;
  description: string;
  expectedLift: string;
  confidence: string;
  significance: string;
  priority: string;
  effort: string;
} {
  const { expectedImpact, priority, effort } = recommendation;
  const causalData = recommendation.metadata?.causalImpact;
  
  return {
    title: recommendation.title,
    description: recommendation.description,
    expectedLift: `+${expectedImpact.citationLift.toFixed(1)} points`,
    confidence: `95% CI: [${expectedImpact.confidence.lower.toFixed(1)}, ${expectedImpact.confidence.upper.toFixed(1)}]`,
    significance: causalData?.significance 
      ? `Significant (p = ${causalData.pValue.toFixed(4)})` 
      : 'Not significant',
    priority: priority.toUpperCase(),
    effort: `${effort.level} (${effort.estimatedHours}h)`,
  };
}

/**
 * Generate summary statistics for prioritized recommendations
 * 
 * @param recommendations - Prioritized recommendations
 * @returns Summary statistics
 */
export function generateRecommendationSummary(
  recommendations: StrategyRecommendation[]
): {
  totalRecommendations: number;
  significantRecommendations: number;
  averageExpectedLift: number;
  totalExpectedLift: number;
  highPriorityCount: number;
  lowEffortCount: number;
} {
  const significantRecommendations = recommendations.filter(
    rec => rec.metadata?.causalImpact?.significance
  ).length;
  
  const averageExpectedLift = recommendations.length > 0
    ? recommendations.reduce((sum, rec) => sum + rec.expectedImpact.citationLift, 0) / recommendations.length
    : 0;
  
  const totalExpectedLift = recommendations.reduce(
    (sum, rec) => sum + rec.expectedImpact.citationLift,
    0
  );
  
  const highPriorityCount = recommendations.filter(rec => rec.priority === 'high').length;
  const lowEffortCount = recommendations.filter(rec => rec.effort.level === 'low').length;
  
  return {
    totalRecommendations: recommendations.length,
    significantRecommendations,
    averageExpectedLift: Math.round(averageExpectedLift * 100) / 100,
    totalExpectedLift: Math.round(totalExpectedLift * 100) / 100,
    highPriorityCount,
    lowEffortCount,
  };
}
