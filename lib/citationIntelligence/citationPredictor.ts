/**
 * Citation Predictor
 * Predicts citation probability using gradient boosting and provides SHAP-like explanations
 * 
 * This module implements:
 * 1. Synthetic data generation for initial model training
 * 2. Gradient boosting prediction (simplified XGBoost-like algorithm)
 * 3. Quantile regression for confidence intervals
 * 4. SHAP-like explainability for factor contributions
 * 
 * @module lib/citationIntelligence/citationPredictor
 */

import type {
  CitationProbabilityResult,
  FeatureVector,
  KnowledgeGraph,
  TemporalData,
} from '../../types/citation-intelligence.types';
import { extractFeatures, normalizeFeatures } from './featureExtractor';

// ============================================================================
// Types
// ============================================================================

interface TrainingSample {
  features: Record<string, number>;
  label: number; // Citation probability (0-100)
}

interface GradientBoostingModel {
  trees: DecisionTree[];
  featureImportance: Record<string, number>;
  learningRate: number;
  numTrees: number;
}

interface DecisionTree {
  feature: string | null;
  threshold: number | null;
  left: DecisionTree | null;
  right: DecisionTree | null;
  value: number | null; // Leaf node value
}

// ============================================================================
// Synthetic Data Generation
// ============================================================================

/**
 * Generate synthetic training data
 * Creates 1000+ samples with known outcomes based on feature relationships
 */
function generateSyntheticData(numSamples: number = 1000): TrainingSample[] {
  const samples: TrainingSample[] = [];
  
  for (let i = 0; i < numSamples; i++) {
    // Generate random features (normalized 0-1)
    const features = {
      wordCount: Math.random(),
      readabilityScore: Math.random(),
      semanticDensity: Math.random(),
      entityCount: Math.random(),
      claimCount: Math.random(),
      avgEntityAuthority: Math.random(),
      maxEntityAuthority: Math.random(),
      entityDiversity: Math.random(),
      historicalTrend: Math.random(),
      seasonalityIndex: Math.random(),
      recentVelocity: Math.random(),
      relativePositioning: Math.random(),
      competitiveGapScore: Math.random(),
    };
    
    // Calculate label based on feature relationships
    // Higher weights for more important features
    let score = 0;
    
    // Content quality (30% weight)
    score += features.semanticDensity * 15;
    score += features.entityCount * 10;
    score += features.claimCount * 5;
    
    // Entity authority (30% weight)
    score += features.avgEntityAuthority * 15;
    score += features.maxEntityAuthority * 10;
    score += features.entityDiversity * 5;
    
    // Temporal (20% weight)
    score += features.historicalTrend * 10;
    score += features.recentVelocity * 10;
    
    // Competitive (20% weight)
    score += features.relativePositioning * 15;
    score += (1 - features.competitiveGapScore) * 5; // Lower gap = better
    
    // Add some noise
    score += (Math.random() - 0.5) * 10;
    
    // Clamp to 0-100
    score = Math.max(0, Math.min(100, score));
    
    samples.push({ features, label: score });
  }
  
  return samples;
}

// ============================================================================
// Decision Tree Implementation
// ============================================================================

/**
 * Build a decision tree for gradient boosting
 * Simplified implementation with max depth = 3
 */
function buildDecisionTree(
  samples: TrainingSample[],
  residuals: number[],
  maxDepth: number = 3,
  currentDepth: number = 0
): DecisionTree {
  // Base case: max depth reached or too few samples
  if (currentDepth >= maxDepth || samples.length < 10) {
    const avgResidual = residuals.reduce((sum, r) => sum + r, 0) / residuals.length;
    return {
      feature: null,
      threshold: null,
      left: null,
      right: null,
      value: avgResidual,
    };
  }
  
  // Find best split
  const featureNames = Object.keys(samples[0].features);
  let bestFeature = featureNames[0];
  let bestThreshold = 0.5;
  let bestGain = -Infinity;
  
  for (const feature of featureNames) {
    // Try different thresholds
    for (let t = 0.2; t <= 0.8; t += 0.2) {
      const { leftIndices, rightIndices } = splitSamples(samples, feature, t);
      
      if (leftIndices.length === 0 || rightIndices.length === 0) continue;
      
      const gain = calculateGain(residuals, leftIndices, rightIndices);
      
      if (gain > bestGain) {
        bestGain = gain;
        bestFeature = feature;
        bestThreshold = t;
      }
    }
  }
  
  // Split samples
  const { leftIndices, rightIndices } = splitSamples(samples, bestFeature, bestThreshold);
  
  if (leftIndices.length === 0 || rightIndices.length === 0) {
    // Can't split, return leaf
    const avgResidual = residuals.reduce((sum, r) => sum + r, 0) / residuals.length;
    return {
      feature: null,
      threshold: null,
      left: null,
      right: null,
      value: avgResidual,
    };
  }
  
  // Recursively build left and right subtrees
  const leftSamples = leftIndices.map(i => samples[i]);
  const leftResiduals = leftIndices.map(i => residuals[i]);
  
  const rightSamples = rightIndices.map(i => samples[i]);
  const rightResiduals = rightIndices.map(i => residuals[i]);
  
  return {
    feature: bestFeature,
    threshold: bestThreshold,
    left: buildDecisionTree(leftSamples, leftResiduals, maxDepth, currentDepth + 1),
    right: buildDecisionTree(rightSamples, rightResiduals, maxDepth, currentDepth + 1),
    value: null,
  };
}

/**
 * Split samples based on feature threshold
 */
function splitSamples(
  samples: TrainingSample[],
  feature: string,
  threshold: number
): { leftIndices: number[]; rightIndices: number[] } {
  const leftIndices: number[] = [];
  const rightIndices: number[] = [];
  
  samples.forEach((sample, i) => {
    if (sample.features[feature] <= threshold) {
      leftIndices.push(i);
    } else {
      rightIndices.push(i);
    }
  });
  
  return { leftIndices, rightIndices };
}

/**
 * Calculate information gain for a split
 */
function calculateGain(
  residuals: number[],
  leftIndices: number[],
  rightIndices: number[]
): number {
  const totalVariance = calculateVariance(residuals);
  
  const leftResiduals = leftIndices.map(i => residuals[i]);
  const rightResiduals = rightIndices.map(i => residuals[i]);
  
  const leftVariance = calculateVariance(leftResiduals);
  const rightVariance = calculateVariance(rightResiduals);
  
  const weightedVariance = 
    (leftIndices.length / residuals.length) * leftVariance +
    (rightIndices.length / residuals.length) * rightVariance;
  
  return totalVariance - weightedVariance;
}

/**
 * Calculate variance of residuals
 */
function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map(v => (v - mean) ** 2);
  return squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length;
}

/**
 * Predict using a decision tree
 */
function predictTree(tree: DecisionTree, features: Record<string, number>): number {
  if (tree.value !== null) {
    return tree.value; // Leaf node
  }
  
  if (tree.feature === null || tree.threshold === null) {
    return 0; // Invalid tree
  }
  
  if (features[tree.feature] <= tree.threshold) {
    return tree.left ? predictTree(tree.left, features) : 0;
  } else {
    return tree.right ? predictTree(tree.right, features) : 0;
  }
}

// ============================================================================
// Gradient Boosting Model
// ============================================================================

/**
 * Train gradient boosting model
 */
function trainGradientBoostingModel(
  samples: TrainingSample[],
  numTrees: number = 50,
  learningRate: number = 0.1
): GradientBoostingModel {
  const trees: DecisionTree[] = [];
  
  // Initialize predictions with mean
  const meanLabel = samples.reduce((sum, s) => sum + s.label, 0) / samples.length;
  const predictions = samples.map(() => meanLabel);
  
  // Build trees iteratively
  for (let t = 0; t < numTrees; t++) {
    // Calculate residuals
    const residuals = samples.map((sample, i) => sample.label - predictions[i]);
    
    // Build tree to predict residuals
    const tree = buildDecisionTree(samples, residuals);
    trees.push(tree);
    
    // Update predictions
    samples.forEach((sample, i) => {
      predictions[i] += learningRate * predictTree(tree, sample.features);
    });
  }
  
  // Calculate feature importance
  const featureImportance = calculateFeatureImportance(trees);
  
  return {
    trees,
    featureImportance,
    learningRate,
    numTrees,
  };
}

/**
 * Calculate feature importance from trees
 */
function calculateFeatureImportance(trees: DecisionTree[]): Record<string, number> {
  const importance: Record<string, number> = {};
  
  function traverseTree(tree: DecisionTree) {
    if (tree.feature !== null) {
      importance[tree.feature] = (importance[tree.feature] || 0) + 1;
      if (tree.left) traverseTree(tree.left);
      if (tree.right) traverseTree(tree.right);
    }
  }
  
  trees.forEach(tree => traverseTree(tree));
  
  // Normalize to sum to 1
  const total = Object.values(importance).reduce((sum, v) => sum + v, 0);
  Object.keys(importance).forEach(key => {
    importance[key] = importance[key] / total;
  });
  
  return importance;
}

/**
 * Predict using gradient boosting model
 */
function predictGradientBoosting(
  model: GradientBoostingModel,
  features: Record<string, number>
): number {
  // Start with mean (implicit in first tree)
  let prediction = 50; // Assume mean of 50
  
  // Add predictions from all trees
  for (const tree of model.trees) {
    prediction += model.learningRate * predictTree(tree, features);
  }
  
  // Clamp to 0-100
  return Math.max(0, Math.min(100, prediction));
}

// ============================================================================
// Confidence Intervals (Quantile Regression)
// ============================================================================

/**
 * Calculate confidence intervals using quantile regression
 * Simplified approach: use prediction variance from ensemble
 */
function calculateConfidenceIntervals(
  model: GradientBoostingModel,
  features: Record<string, number>,
  prediction: number
): { lower: number; upper: number } {
  // Calculate prediction variance by looking at tree predictions
  const treePredictions = model.trees.map(tree => predictTree(tree, features));
  
  const mean = treePredictions.reduce((sum, p) => sum + p, 0) / treePredictions.length;
  const variance = treePredictions.reduce((sum, p) => sum + (p - mean) ** 2, 0) / treePredictions.length;
  const stdDev = Math.sqrt(variance);
  
  // 95% confidence interval (±1.96 standard deviations)
  const margin = 1.96 * stdDev * model.learningRate * model.numTrees;
  
  return {
    lower: Math.max(0, prediction - margin),
    upper: Math.min(100, prediction + margin),
  };
}

// ============================================================================
// SHAP-like Explainability
// ============================================================================

/**
 * Calculate SHAP-like feature contributions
 * Simplified approach: use feature importance and feature values
 */
function calculateFeatureContributions(
  model: GradientBoostingModel,
  features: Record<string, number>,
  prediction: number
): Array<{ name: string; contribution: number; description: string }> {
  const contributions: Array<{ name: string; contribution: number; description: string }> = [];
  
  const baseline = 50; // Assume baseline of 50
  const totalEffect = prediction - baseline;
  
  // Calculate contribution for each feature
  for (const [feature, importance] of Object.entries(model.featureImportance)) {
    // Contribution = importance * feature value * total effect
    const featureValue = features[feature];
    const contribution = importance * (featureValue - 0.5) * totalEffect * 2;
    
    contributions.push({
      name: formatFeatureName(feature),
      contribution: Math.round(contribution * 100) / 100,
      description: getFeatureDescription(feature, featureValue),
    });
  }
  
  // Sort by absolute contribution
  contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  
  return contributions;
}

/**
 * Format feature name for display
 */
function formatFeatureName(feature: string): string {
  return feature
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Get feature description
 */
function getFeatureDescription(feature: string, value: number): string {
  const percentage = Math.round(value * 100);
  
  const descriptions: Record<string, string> = {
    wordCount: `Content length is at ${percentage}% of optimal`,
    readabilityScore: `Readability score is ${percentage}/100`,
    semanticDensity: `Semantic density is ${percentage}% of target`,
    entityCount: `Entity count is at ${percentage}% of optimal`,
    claimCount: `Claim count is at ${percentage}% of target`,
    avgEntityAuthority: `Average entity authority is ${percentage}/100`,
    maxEntityAuthority: `Highest entity authority is ${percentage}/100`,
    entityDiversity: `Entity diversity is ${percentage}% of maximum`,
    historicalTrend: `Historical trend shows ${percentage > 50 ? 'improvement' : 'decline'}`,
    seasonalityIndex: `Seasonality impact is ${percentage}%`,
    recentVelocity: `Recent velocity is ${percentage > 50 ? 'positive' : 'negative'}`,
    relativePositioning: `Positioned at ${percentage}th percentile vs competitors`,
    competitiveGapScore: `Competitive gap is ${percentage > 50 ? 'significant' : 'minimal'}`,
  };
  
  return descriptions[feature] || `${feature} value is ${percentage}%`;
}

// ============================================================================
// Citation Predictor Class
// ============================================================================

export class CitationPredictor {
  private model: GradientBoostingModel | null = null;
  private isInitialized = false;
  
  /**
   * Initialize predictor with synthetic data
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('Training citation probability model with synthetic data...');
    
    // Generate synthetic training data
    const trainingData = generateSyntheticData(1000);
    
    // Train model
    this.model = trainGradientBoostingModel(trainingData, 50, 0.1);
    
    this.isInitialized = true;
    console.log('Model training complete');
  }
  
  /**
   * Calculate citation probability
   */
  calculateProbability(
    content: string,
    knowledgeGraph: KnowledgeGraph,
    historicalData: TemporalData[],
    competitorScores: number[] = []
  ): CitationProbabilityResult {
    if (!this.isInitialized || !this.model) {
      throw new Error('Citation predictor not initialized. Call initialize() first.');
    }
    
    // Extract features
    const featureVector = extractFeatures(content, knowledgeGraph, historicalData, competitorScores);
    const normalizedFeatures = normalizeFeatures(featureVector);
    
    // Predict
    const score = predictGradientBoosting(this.model, normalizedFeatures);
    
    // Calculate confidence intervals
    const confidence = calculateConfidenceIntervals(this.model, normalizedFeatures, score);
    
    // Calculate feature contributions (SHAP-like)
    const factors = calculateFeatureContributions(this.model, normalizedFeatures, score);
    
    // Identify quick wins
    const quickWins = this.identifyQuickWins(factors, featureVector);
    
    return {
      score: Math.round(score * 100) / 100,
      confidence: {
        lower: Math.round(confidence.lower * 100) / 100,
        upper: Math.round(confidence.upper * 100) / 100,
      },
      factors: factors.slice(0, 10), // Top 10 factors
      quickWins,
    };
  }
  
  /**
   * Identify quick-win opportunities
   */
  private identifyQuickWins(
    _factors: Array<{ name: string; contribution: number; description: string }>,
    featureVector: FeatureVector
  ): Array<{ action: string; expectedLift: number; effort: 'low' | 'medium' | 'high' }> {
    const quickWins: Array<{ action: string; expectedLift: number; effort: 'low' | 'medium' | 'high' }> = [];
    
    // Check for low-hanging fruit
    if (featureVector.entityCount < 10) {
      quickWins.push({
        action: 'Add more entities to content (target: 10-20 entities)',
        expectedLift: 5,
        effort: 'low',
      });
    }
    
    if (featureVector.claimCount < 5) {
      quickWins.push({
        action: 'Add more factual claims with evidence',
        expectedLift: 4,
        effort: 'low',
      });
    }
    
    if (featureVector.semanticDensity < 50) {
      quickWins.push({
        action: 'Increase semantic density with technical terms and structured data',
        expectedLift: 6,
        effort: 'medium',
      });
    }
    
    if (featureVector.avgEntityAuthority < 50) {
      quickWins.push({
        action: 'Strengthen entity authority with citations and external validation',
        expectedLift: 7,
        effort: 'medium',
      });
    }
    
    if (featureVector.entityDiversity < 40) {
      quickWins.push({
        action: 'Diversify entity types (add organizations, products, concepts)',
        expectedLift: 3,
        effort: 'low',
      });
    }
    
    // Sort by expected lift
    quickWins.sort((a, b) => b.expectedLift - a.expectedLift);
    
    return quickWins.slice(0, 5); // Top 5 quick wins
  }
  
  /**
   * Get model information
   */
  getModelInfo(): {
    isInitialized: boolean;
    numTrees: number;
    learningRate: number;
    featureImportance: Record<string, number>;
  } | null {
    if (!this.model) return null;
    
    return {
      isInitialized: this.isInitialized,
      numTrees: this.model.numTrees,
      learningRate: this.model.learningRate,
      featureImportance: this.model.featureImportance,
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const citationPredictor = new CitationPredictor();

