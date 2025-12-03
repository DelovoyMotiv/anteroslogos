/**
 * CAUSAL CITATION TRACER - TYPE DEFINITIONS
 * 
 * Comprehensive type system for causal reasoning about LLM citation decisions.
 * Implements graph-theoretic, counterfactual, and decision-emulation types.
 * 
 * @module types/causalTracer.types
 * @version 1.0.0
 */

import type { JSONObject } from './common.types';

// ============================================================================
// CORE GRAPH STRUCTURES
// ============================================================================

/**
 * Node in the causal knowledge graph
 */
export interface CausalNode {
  id: string;
  type: CausalNodeType;
  label: string;
  
  // Content attributes
  content?: string;
  entities: string[];
  claims: string[];
  
  // Quality signals
  confidence: number;           // 0-1, source reliability
  freshness: number;            // days since last update
  eeatScore: number;            // 0-10, E-E-A-T aggregate
  authorityScore: number;       // 0-100, domain authority
  
  // Metadata
  url?: string;
  timestamp: Date;
  source: string;
  
  // Graph metrics (computed)
  centrality?: number;          // betweenness centrality
  pageRank?: number;            // importance score
  clusterCoefficient?: number;  // local density
}

export type CausalNodeType = 
  | 'entity'           // Named entity (Person, Organization, etc.)
  | 'claim'            // Factual statement
  | 'evidence'         // Supporting data/citation
  | 'concept'          // Abstract concept
  | 'query'            // User query
  | 'source'           // Original document/website
  | 'metric'           // Quantitative measure
  | 'temporal'         // Time-sensitive information
  | 'relationship'     // Connection descriptor
  | 'authority';       // Authoritative marker

/**
 * Edge connecting nodes in the causal graph
 */
export interface CausalEdge {
  id: string;
  source: string;           // node ID
  target: string;           // node ID
  type: CausalEdgeType;
  
  // Relationship strength
  weight: number;           // 0-1, strength of connection
  confidence: number;       // 0-1, reliability of edge
  
  // Causal properties
  causalStrength: number;   // 0-1, how much source causes target
  necessity: number;        // 0-1, is source necessary for target?
  sufficiency: number;      // 0-1, is source sufficient for target?
  
  // Evidence
  evidenceCount: number;
  coOccurrenceCount: number;
  
  // Metadata
  createdAt: Date;
  lastValidated: Date;
}

export type CausalEdgeType =
  | 'supports'         // Evidence supports claim
  | 'contradicts'      // Evidence contradicts claim
  | 'cites'            // Citation reference
  | 'defines'          // Definition relationship
  | 'exemplifies'      // Example of concept
  | 'causes'           // Causal relationship
  | 'correlates'       // Statistical correlation
  | 'precedes'         // Temporal precedence
  | 'contains'         // Containment/hierarchy
  | 'validates';       // Validation/verification

/**
 * Complete causal knowledge graph
 */
export interface CausalGraph {
  nodes: Map<string, CausalNode>;
  edges: Map<string, CausalEdge>;
  
  // Graph-level metrics
  nodeCount: number;
  edgeCount: number;
  density: number;              // edge count / max possible edges
  avgPathLength: number;        // average shortest path
  clusteringCoefficient: number;
  
  // Metadata
  domain: string;
  lastUpdated: Date;
  version: number;
}

// ============================================================================
// CAUSAL PATH STRUCTURES
// ============================================================================

/**
 * A path through the causal graph explaining citation decision
 */
export interface CausalPath {
  id: string;
  
  // Path structure
  nodes: CausalNode[];
  edges: CausalEdge[];
  length: number;
  
  // Scoring
  totalScore: number;           // 0-100, overall path quality
  causalStrength: number;       // 0-1, end-to-end causality
  uniqueness: number;           // 0-1, how rare this path is
  
  // Component scores (weighted)
  authorityScore: number;       // 0-100, 25% weight
  freshnessScore: number;       // 0-100, 15% weight
  relevanceScore: number;       // 0-100, 30% weight
  validationScore: number;      // 0-100, 20% weight
  uniquenessScore: number;      // 0-100, 10% weight
  
  // Bottlenecks and critical nodes
  criticalNodes: string[];      // nodes whose removal breaks path
  bottleneckEdges: string[];    // edges with high betweenness
  
  // Explanation
  humanReadableExplanation: string;
  technicalExplanation: string;
  keyFactors: string[];
  
  // Comparative analysis
  competitorPaths?: CausalPath[];
  competitiveAdvantages: string[];
  vulnerabilities: string[];
}

/**
 * Result of tracing citation paths for a query
 */
export interface CitationTraceResult {
  query: string;
  targetDomain: string;
  
  // Discovered paths
  paths: CausalPath[];
  topPath: CausalPath;
  
  // Overall metrics
  citationProbability: number;  // 0-1, likelihood of citation
  confidence: number;           // 0-1, prediction confidence
  
  // Platform-specific probabilities
  platformProbabilities: Map<LLMPlatform, number>;
  
  // Competitive analysis
  competitorComparison: CompetitorComparison[];
  marketPosition: 'leader' | 'challenger' | 'follower' | 'niche';
  
  // Recommendations
  suggestedImprovements: Improvement[];
  quickWins: Improvement[];
  strategicMoves: Improvement[];
  
  // Metadata
  computationTime: number;      // milliseconds
  graphSize: { nodes: number; edges: number };
  timestamp: Date;
}

// ============================================================================
// COUNTERFACTUAL ANALYSIS
// ============================================================================

/**
 * Result of counterfactual simulation
 */
export interface CounterfactualResult {
  type: 'node_removal' | 'node_addition' | 'edge_removal' | 'edge_addition';
  
  // What was changed
  modifiedElement: CausalNode | CausalEdge;
  elementId: string;
  
  // Impact assessment
  originalProbability: number;
  newProbability: number;
  deltaScore: number;           // change in citation probability
  impactMagnitude: 'critical' | 'high' | 'medium' | 'low' | 'negligible';
  
  // Affected paths
  affectedPaths: CausalPath[];
  brokenPaths: number;
  newPathsCreated: number;
  
  // Explanation
  explanation: string;
  mechanism: string;            // how the change propagates
  
  // Recommendations
  actionable: boolean;
  difficulty: 'easy' | 'medium' | 'hard' | 'very_hard';
  estimatedEffort: number;      // hours
  roi: number;                  // expected return / effort
}

/**
 * Batch counterfactual analysis result
 */
export interface CounterfactualBatchResult {
  simulations: CounterfactualResult[];
  
  // Prioritization
  topImpact: CounterfactualResult[];
  quickWins: CounterfactualResult[];
  strategicMoves: CounterfactualResult[];
  
  // Summary statistics
  avgDeltaScore: number;
  maxDeltaScore: number;
  totalActionsRecommended: number;
}

// ============================================================================
// LLM DECISION EMULATION
// ============================================================================

export type LLMPlatform = 
  | 'perplexity'
  | 'chatgpt'
  | 'claude'
  | 'gemini'
  | 'grok';

/**
 * Factors influencing LLM citation decision
 */
export interface LLMDecisionFactors {
  platform: LLMPlatform;
  
  // Core signals (platform-specific weights)
  relevanceScore: number;       // 0-100, semantic match
  authorityScore: number;       // 0-100, source trustworthiness
  freshnessScore: number;       // 0-100, recency
  comprehensivenessScore: number; // 0-100, coverage depth
  uniquenessScore: number;      // 0-100, novel information
  
  // Advanced signals
  attentionScore: number;       // 0-100, attention mechanism alignment
  embeddingDistance: number;    // cosine similarity to query
  structuralQuality: number;    // 0-100, content structure
  citationChainStrength: number; // 0-100, backlink quality
  
  // Platform-specific modifiers
  platformBias: number;         // -1 to 1, platform preference
  genreMatch: number;           // 0-1, content type alignment
  
  // Composite score
  overallScore: number;         // 0-100, weighted aggregate
  confidence: number;           // 0-1, prediction confidence
}

/**
 * Attention pattern analysis (from open-source models)
 */
export interface AttentionPattern {
  platform: LLMPlatform;
  
  // Token-level attention
  queryTokens: string[];
  sourceTokens: string[];
  attentionWeights: number[][];  // query x source matrix
  
  // Aggregate metrics
  maxAttention: number;
  avgAttention: number;
  attentionEntropy: number;      // distribution uniformity
  
  // Key phrases
  highAttentionPhrases: Array<{
    phrase: string;
    weight: number;
    startIdx: number;
    endIdx: number;
  }>;
}

/**
 * Emulated LLM decision
 */
export interface EmulatedDecision {
  platform: LLMPlatform;
  query: string;
  
  // Ranking
  rankedSources: Array<{
    domain: string;
    score: number;
    rank: number;
    factors: LLMDecisionFactors;
  }>;
  
  // Winner analysis
  selectedSource: string;
  selectionReason: string;
  confidence: number;
  
  // Attention analysis
  attentionPattern?: AttentionPattern;
  
  // Alternatives
  nearMisses: Array<{
    domain: string;
    score: number;
    deltaToWinner: number;
    whyLost: string;
  }>;
}

// ============================================================================
// IMPROVEMENT RECOMMENDATIONS
// ============================================================================

export interface Improvement {
  id: string;
  type: ImprovementType;
  
  // Description
  title: string;
  description: string;
  rationale: string;
  
  // Target element
  targetNode?: string;
  targetEdge?: string;
  
  // Impact
  expectedDeltaScore: number;   // probability increase
  impactLevel: 'critical' | 'high' | 'medium' | 'low';
  
  // Feasibility
  difficulty: 'easy' | 'medium' | 'hard' | 'very_hard';
  estimatedEffort: number;      // hours
  requiredResources: string[];
  
  // ROI
  roi: number;                  // impact / effort
  priority: number;             // 0-100, overall priority score
  
  // Implementation
  actionSteps: string[];
  successCriteria: string[];
  estimatedCompletion: number;  // days
  
  // Dependencies
  prerequisites: string[];      // other improvement IDs
  blockers: string[];
}

export type ImprovementType =
  | 'add_entity'
  | 'add_claim'
  | 'add_evidence'
  | 'strengthen_edge'
  | 'add_citation'
  | 'improve_freshness'
  | 'boost_authority'
  | 'enhance_eeat'
  | 'add_uniqueness'
  | 'fix_bottleneck';

// ============================================================================
// COMPETITIVE ANALYSIS
// ============================================================================

export interface CompetitorComparison {
  competitorDomain: string;
  
  // Head-to-head metrics
  ourScore: number;
  theirScore: number;
  delta: number;
  
  // Path comparison
  ourBestPath: CausalPath;
  theirBestPath: CausalPath;
  
  // Advantages
  ourAdvantages: Array<{
    factor: string;
    magnitude: number;
    description: string;
  }>;
  
  theirAdvantages: Array<{
    factor: string;
    magnitude: number;
    description: string;
  }>;
  
  // Gaps
  criticalGaps: Array<{
    element: string;
    impactIfAdded: number;
    difficulty: string;
  }>;
  
  // Win probability
  winProbability: number;       // 0-1, chance we get cited over them
  
  // Strategic recommendation
  strategy: 'dominate' | 'differentiate' | 'avoid' | 'monitor';
  reasoning: string;
}

// ============================================================================
// PREDICTIVE GAP ANALYSIS
// ============================================================================

export interface PredictiveGap {
  type: 'missing_node' | 'missing_edge' | 'weak_signal' | 'outdated_content';
  
  // Identification
  gapDescription: string;
  detectedBy: string;           // algorithm name
  
  // Competitor context
  competitorsWithThis: string[];
  competitorAdvantage: number;  // how much they benefit
  
  // Our opportunity
  potentialGain: number;        // citation probability increase
  competitiveImpact: number;    // how much we close the gap
  
  // Suggested element
  suggestedNode?: Partial<CausalNode>;
  suggestedEdge?: Partial<CausalEdge>;
  
  // Implementation
  implementation: Improvement;
  
  // Validation
  confidence: number;           // 0-1, prediction confidence
  evidenceStrength: number;     // 0-1, supporting evidence
}

export interface GapAnalysisResult {
  query: string;
  targetCompetitor: string;
  
  // Identified gaps
  gaps: PredictiveGap[];
  criticalGaps: PredictiveGap[];
  
  // Impact summary
  totalPotentialGain: number;
  quickWins: PredictiveGap[];
  strategicInvestments: PredictiveGap[];
  
  // Prioritization
  recommendedSequence: PredictiveGap[];
  
  // ROI
  totalEffort: number;          // hours
  totalExpectedReturn: number;  // probability points
  overallROI: number;
}

// ============================================================================
// VISUALIZATION & EXPORT
// ============================================================================

export interface VisualizationConfig {
  layout: 'force-directed' | 'hierarchical' | 'circular' | 'breadthfirst';
  highlightCriticalPath: boolean;
  showCounterfactuals: boolean;
  showCompetitors: boolean;
  nodeSize: 'uniform' | 'by-importance' | 'by-centrality';
  edgeWidth: 'uniform' | 'by-weight' | 'by-causality';
  colorScheme: 'default' | 'importance' | 'freshness' | 'platform';
}

export interface ExportOptions {
  format: 'png' | 'svg' | 'json' | 'pdf';
  includeMetadata: boolean;
  includeExplanations: boolean;
  resolution?: number;          // for raster formats
  width?: number;
  height?: number;
}

// ============================================================================
// PERFORMANCE & CACHING
// ============================================================================

export interface TracerPerformanceMetrics {
  graphBuildTime: number;       // ms
  pathFindingTime: number;      // ms
  counterfactualTime: number;   // ms
  emulationTime: number;        // ms
  totalTime: number;            // ms
  
  // Resource usage
  memoryUsed: number;           // MB
  cacheHitRate: number;         // 0-1
  
  // Graph statistics
  nodesProcessed: number;
  edgesTraversed: number;
  pathsEvaluated: number;
}

export interface CachedTrace {
  key: string;                  // query + domain hash
  result: CitationTraceResult;
  timestamp: Date;
  ttl: number;                  // seconds
  hitCount: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface TracerConfig {
  // Performance
  maxPathLength: number;        // default: 7
  maxPathsToExplore: number;    // default: 1000
  parallelism: number;          // worker threads
  
  // Scoring weights (sum to 1.0)
  weights: {
    authority: number;          // default: 0.25
    freshness: number;          // default: 0.15
    relevance: number;          // default: 0.30
    validation: number;         // default: 0.20
    uniqueness: number;         // default: 0.10
  };
  
  // Thresholds
  minConfidence: number;        // default: 0.6
  minCausalStrength: number;    // default: 0.4
  
  // Caching
  enableCache: boolean;
  cacheTTL: number;             // seconds
  maxCacheSize: number;         // entries
  
  // Platform-specific
  platformWeights: Map<LLMPlatform, Partial<TracerConfig['weights']>>;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export class CausalTracerError extends Error {
  constructor(
    message: string,
    public code: TracerErrorCode,
    public details?: JSONObject
  ) {
    super(message);
    this.name = 'CausalTracerError';
  }
}

export type TracerErrorCode =
  | 'GRAPH_TOO_LARGE'
  | 'NO_PATHS_FOUND'
  | 'INSUFFICIENT_DATA'
  | 'COMPUTATION_TIMEOUT'
  | 'INVALID_CONFIG'
  | 'CACHE_ERROR'
  | 'EMULATION_FAILED'
  | 'COUNTERFACTUAL_ERROR';
