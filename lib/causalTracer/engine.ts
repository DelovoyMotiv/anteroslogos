/**
 * CAUSAL CITATION TRACER - MAIN ENGINE
 * 
 * Production-grade orchestration layer for causal citation analysis.
 * Main API interface for:
 * - traceCitationPath: Full causal path discovery
 * - explainWhyChosen: Human-readable explanations
 * - counterfactualImpact: What-if simulation
 * - predictiveGapAnalysis: Competitive gap identification
 * 
 * @module lib/causalTracer/engine
 * @version 1.0.0
 */

import type {
  CausalGraph,
  CausalNode,
  CausalEdge,
  CausalPath,
  CitationTraceResult,
  CounterfactualResult,
  GapAnalysisResult,
  PredictiveGap,
  Improvement,
  CompetitorComparison,
  TracerConfig,
  LLMPlatform,
} from '../../types/causalTracer.types';
import type { CausalGraphInput, CausalGraphNode, CausalGraphEdge } from '../../types/lib-extended.types';

import { findAllPaths } from './pathFinder';
import PathFinder from './pathFinder';
import { 
  simulateNodeRemoval,
  simulateNodeAddition,
  simulateEdgeRemoval,
} from './counterfactualSimulator';
import CounterfactualSimulator from './counterfactualSimulator';
import { emulateDecision } from './llmDecisionEmulator';

const { PathCache } = PathFinder;
const { calculateCitationProbability } = CounterfactualSimulator;

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: TracerConfig = {
  maxPathLength: 7,
  maxPathsToExplore: 1000,
  parallelism: 1,
  weights: {
    authority: 0.25,
    freshness: 0.15,
    relevance: 0.30,
    validation: 0.20,
    uniqueness: 0.10,
  },
  minConfidence: 0.6,
  minCausalStrength: 0.4,
  enableCache: true,
  cacheTTL: 3600,
  maxCacheSize: 100,
  platformWeights: new Map(),
};

// ============================================================================
// MAIN TRACING FUNCTION
// ============================================================================

/**
 * Trace causal citation paths explaining LLM decision
 * 
 * @param query User search query
 * @param targetSiteGraph Our knowledge graph
 * @param competitorGraphs Competitor knowledge graphs
 * @param options Configuration options
 * @returns Complete citation trace result with paths, probabilities, recommendations
 */
export async function traceCitationPath(
  query: string,
  targetSiteGraph: CausalGraph,
  competitorGraphs: CausalGraph[] = [],
  options: Partial<TracerConfig> = {}
): Promise<CitationTraceResult> {
  const startTime = performance.now();
  const config: TracerConfig = { ...DEFAULT_CONFIG, ...options };
  const cache = new PathCache();

  // Find query node and target (source) node in graph
  const queryNodes = Array.from(targetSiteGraph.nodes.values()).filter(n => 
    n.type === 'query' || 
    n.label.toLowerCase().includes(query.toLowerCase())
  );
  
  const sourceNodes = Array.from(targetSiteGraph.nodes.values()).filter(n =>
    n.type === 'source' || n.type === 'authority'
  );

  if (queryNodes.length === 0 || sourceNodes.length === 0) {
    throw new Error('Graph must contain query and source nodes');
  }

  const queryNode = queryNodes[0];
  const sourceNode = sourceNodes[0];

  // Find all paths from query to source
  const paths = findAllPaths(
    targetSiteGraph,
    queryNode.id,
    sourceNode.id,
    config.maxPathLength,
    config,
    query,
    cache
  );

  if (paths.length === 0) {
    throw new Error('No paths found between query and source');
  }

  // Get top path
  const topPath = paths[0];

  // Calculate overall citation probability
  const citationProbability = calculateCitationProbability(paths);

  // Calculate platform-specific probabilities
  const platformProbabilities = new Map<LLMPlatform, number>();
  const platforms: LLMPlatform[] = ['perplexity', 'chatgpt', 'claude', 'gemini', 'grok'];
  
  platforms.forEach(platform => {
    const decision = emulateDecision(
      platform,
      query,
      [{ domain: targetSiteGraph.domain, graph: targetSiteGraph, topPath }],
      competitorGraphs
    );
    platformProbabilities.set(platform, decision.rankedSources[0].score / 100);
  });

  // Competitive analysis
  const competitorComparison = await analyzeCompetitors(
    targetSiteGraph,
    competitorGraphs,
    query,
    topPath,
    config
  );

  // Market position
  const ourScore = topPath.totalScore;
  const competitorScores = competitorComparison.map(c => c.theirScore);
  const marketPosition = determineMarketPosition(ourScore, competitorScores);

  // Generate improvements
  const suggestedImprovements = await generateImprovements(
    paths
  );

  // Categorize improvements
  const quickWins = suggestedImprovements.filter(i => 
    i.difficulty === 'easy' && i.roi > 3
  );
  const strategicMoves = suggestedImprovements.filter(i =>
    (i.difficulty === 'hard' || i.difficulty === 'very_hard') && 
    i.impactLevel === 'critical'
  );

  // Add explanations to paths
  paths.forEach(path => {
    path.humanReadableExplanation = generateHumanExplanation(path, query, targetSiteGraph.domain);
    path.technicalExplanation = generateTechnicalExplanation(path);
    path.keyFactors = identifyKeyFactors(path);
    path.competitiveAdvantages = identifyAdvantages(path, competitorComparison);
    path.vulnerabilities = identifyVulnerabilities(path, competitorComparison);
  });

  const computationTime = performance.now() - startTime;

  return {
    query,
    targetDomain: targetSiteGraph.domain,
    paths,
    topPath,
    citationProbability,
    confidence: topPath.causalStrength,
    platformProbabilities,
    competitorComparison,
    marketPosition,
    suggestedImprovements,
    quickWins,
    strategicMoves,
    computationTime,
    graphSize: {
      nodes: targetSiteGraph.nodeCount,
      edges: targetSiteGraph.edgeCount,
    },
    timestamp: new Date(),
  };
}

// ============================================================================
// EXPLANATION GENERATION
// ============================================================================

/**
 * Generate human-readable explanation of why path leads to citation
 */
export function explainWhyChosen(path: CausalPath): string {
  const factors = [];
  
  // Authority
  if (path.authorityScore > 80) {
    factors.push(`exceptional authority (${path.authorityScore.toFixed(0)}/100)`);
  } else if (path.authorityScore > 60) {
    factors.push(`strong authority (${path.authorityScore.toFixed(0)}/100)`);
  }

  // Freshness
  if (path.freshnessScore > 80) {
    factors.push(`very fresh content (${path.freshnessScore.toFixed(0)}/100)`);
  } else if (path.freshnessScore > 60) {
    factors.push(`recent content (${path.freshnessScore.toFixed(0)}/100)`);
  }

  // Uniqueness
  if (path.uniquenessScore > 70) {
    factors.push(`unique insights (${path.uniquenessScore.toFixed(0)}/100)`);
  }

  // Relevance
  if (path.relevanceScore > 85) {
    factors.push(`highly relevant (${path.relevanceScore.toFixed(0)}/100)`);
  }

  // Validation
  if (path.validationScore > 80) {
    factors.push(`well-validated (${path.validationScore.toFixed(0)}/100)`);
  }

  // Critical nodes
  if (path.criticalNodes.length > 0) {
    factors.push(`${path.criticalNodes.length} critical connection(s)`);
  }

  const explanation = factors.length > 0
    ? `This source will be cited because it has ${factors.join(', ')}. `
    : `This source scores ${path.totalScore.toFixed(1)}/100 overall. `;

  // Add path structure info
  const pathDesc = `The causal path has ${path.length} steps with ${path.causalStrength.toFixed(2)} causal strength.`;

  // Add competitive info
  const competitiveDesc = path.competitiveAdvantages.length > 0
    ? ` Competitive advantages: ${path.competitiveAdvantages.slice(0, 3).join(', ')}.`
    : '';

  return explanation + pathDesc + competitiveDesc;
}

function generateHumanExplanation(path: CausalPath, query: string, domain: string): string {
  return `For query "${query}", ${domain} will likely be cited because: ` +
    explainWhyChosen(path);
}

function generateTechnicalExplanation(path: CausalPath): string {
  const nodeTypes = path.nodes.map(n => n.type).join(' → ');
  const edgeTypes = path.edges.map(e => e.type).join(' → ');
  
  return `Path structure: ${nodeTypes}. Relationships: ${edgeTypes}. ` +
    `Total score: ${path.totalScore.toFixed(2)}, Causal strength: ${path.causalStrength.toFixed(2)}, ` +
    `Uniqueness: ${path.uniqueness.toFixed(2)}.`;
}

function identifyKeyFactors(path: CausalPath): string[] {
  const factors: string[] = [];
  
  if (path.authorityScore > 70) factors.push('High Authority');
  if (path.freshnessScore > 70) factors.push('Fresh Content');
  if (path.relevanceScore > 80) factors.push('Highly Relevant');
  if (path.validationScore > 75) factors.push('Well Validated');
  if (path.uniquenessScore > 65) factors.push('Unique Insights');
  if (path.causalStrength > 0.7) factors.push('Strong Causality');
  
  return factors;
}

function identifyAdvantages(_path: CausalPath, competitors: CompetitorComparison[]): string[] {
  const advantages: string[] = [];
  
  competitors.forEach(comp => {
    comp.ourAdvantages.forEach(adv => {
      if (adv.magnitude > 10 && !advantages.includes(adv.factor)) {
        advantages.push(adv.factor);
      }
    });
  });
  
  return advantages.slice(0, 5);
}

function identifyVulnerabilities(_path: CausalPath, competitors: CompetitorComparison[]): string[] {
  const vulnerabilities: string[] = [];
  
  competitors.forEach(comp => {
    comp.theirAdvantages.forEach(adv => {
      if (adv.magnitude > 10 && !vulnerabilities.includes(adv.factor)) {
        vulnerabilities.push(adv.factor);
      }
    });
  });
  
  return vulnerabilities.slice(0, 5);
}

// ============================================================================
// COUNTERFACTUAL IMPACT ANALYSIS
// ============================================================================

/**
 * Simulate impact of removing/adding node or edge
 */
export async function counterfactualImpact(
  graph: CausalGraph,
  modification: {
    type: 'node_removal' | 'node_addition' | 'edge_removal' | 'edge_addition';
    element: CausalNode | CausalEdge;
    connectingEdges?: CausalEdge[]; // For node addition
  },
  query: string,
  config: Partial<TracerConfig> = {}
): Promise<CounterfactualResult> {
  const fullConfig: TracerConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Find query and source nodes
  const queryNode = Array.from(graph.nodes.values()).find(n => n.type === 'query');
  const sourceNode = Array.from(graph.nodes.values()).find(n => n.type === 'source');
  
  if (!queryNode || !sourceNode) {
    throw new Error('Graph must contain query and source nodes');
  }

  switch (modification.type) {
    case 'node_removal':
      return simulateNodeRemoval(
        graph,
        modification.element.id,
        query,
        queryNode.id,
        sourceNode.id,
        fullConfig
      );
    
    case 'node_addition':
      if (!modification.connectingEdges) {
        throw new Error('Node addition requires connectingEdges');
      }
      return simulateNodeAddition(
        graph,
        modification.element as CausalNode,
        modification.connectingEdges,
        query,
        queryNode.id,
        sourceNode.id,
        fullConfig
      );
    
    case 'edge_removal':
      return simulateEdgeRemoval(
        graph,
        modification.element.id,
        query,
        queryNode.id,
        sourceNode.id,
        fullConfig
      );
    
    default:
      throw new Error(`Unsupported modification type: ${modification.type}`);
  }
}

// ============================================================================
// PREDICTIVE GAP ANALYSIS
// ============================================================================

/**
 * Identify gaps compared to competitors and generate recommendations
 */
export async function predictiveGapAnalysis(
  ourGraph: CausalGraph,
  competitorGraph: CausalGraph,
  query: string
): Promise<GapAnalysisResult> {
  
  // Get competitor's strong nodes
  const competitorNodes = Array.from(competitorGraph.nodes.values())
    .sort((a, b) => b.authorityScore - a.authorityScore)
    .slice(0, 20);

  // Get our nodes for comparison
  const ourNodes = Array.from(ourGraph.nodes.values());
  const ourEntities = new Set(ourNodes.flatMap(n => n.entities));
  const ourClaims = new Set(ourNodes.flatMap(n => n.claims));

  const gaps: PredictiveGap[] = [];

  // Check for missing entities
  competitorNodes.forEach(compNode => {
    compNode.entities.forEach(entity => {
      if (!ourEntities.has(entity)) {
        const gap = createGap(
          'missing_node',
          `Missing entity: ${entity}`,
          'entity_comparison',
          [competitorGraph.domain],
          0.15,
          ourGraph,
          compNode
        );
        gaps.push(gap);
      }
    });

    // Check for missing claims
    compNode.claims.forEach(claim => {
      if (!ourClaims.has(claim)) {
        const gap = createGap(
          'missing_node',
          `Missing claim: ${claim}`,
          'claim_comparison',
          [competitorGraph.domain],
          0.12,
          ourGraph,
          compNode
        );
        gaps.push(gap);
      }
    });
  });

  // Check for weak signals (nodes with low authority)
  ourNodes.forEach(node => {
    if (node.authorityScore < 40 && node.type !== 'query') {
      const gap = createGap(
        'weak_signal',
        `Low authority node: ${node.label} (${node.authorityScore.toFixed(0)})`,
        'authority_analysis',
        [],
        0.08,
        ourGraph,
        node
      );
      gaps.push(gap);
    }
  });

  // Sort by potential gain
  gaps.sort((a, b) => b.potentialGain - a.potentialGain);

  // Categorize
  const criticalGaps = gaps.filter(g => g.potentialGain > 0.15);
  const quickWins = gaps.filter(g => 
    g.implementation.difficulty === 'easy' && 
    g.implementation.roi > 3
  );
  const strategicInvestments = gaps.filter(g =>
    g.potentialGain > 0.10 && 
    (g.implementation.difficulty === 'hard' || g.implementation.difficulty === 'very_hard')
  );

  // Calculate totals
  const totalPotentialGain = gaps.reduce((sum, g) => sum + g.potentialGain, 0);
  const totalEffort = gaps.reduce((sum, g) => sum + g.implementation.estimatedEffort, 0);
  const totalExpectedReturn = gaps.reduce((sum, g) => sum + (g.potentialGain * 100), 0);
  const overallROI = totalEffort > 0 ? totalExpectedReturn / totalEffort : 0;

  return {
    query,
    targetCompetitor: competitorGraph.domain,
    gaps,
    criticalGaps,
    totalPotentialGain,
    quickWins,
    strategicInvestments,
    recommendedSequence: [...quickWins, ...criticalGaps, ...strategicInvestments].slice(0, 10),
    totalEffort,
    totalExpectedReturn,
    overallROI,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createGap(
  type: PredictiveGap['type'],
  description: string,
  detectedBy: string,
  competitors: string[],
  potentialGain: number,
  _targetGraph: CausalGraph,
  referenceNode?: CausalNode
): PredictiveGap {
  const implementation: Improvement = {
    id: `imp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: type === 'missing_node' ? 'add_entity' : 'boost_authority',
    title: description,
    description: `Address gap: ${description}`,
    rationale: `Competitor advantage identified: ${potentialGain.toFixed(1)}% potential gain`,
    expectedDeltaScore: potentialGain,
    impactLevel: potentialGain > 0.15 ? 'critical' : potentialGain > 0.10 ? 'high' : 'medium',
    difficulty: referenceNode && referenceNode.entities.length > 5 ? 'hard' : 'medium',
    estimatedEffort: referenceNode ? (referenceNode.entities.length + referenceNode.claims.length) * 0.5 : 4,
    requiredResources: ['Content writer', 'Subject matter expert'],
    roi: 0,
    priority: potentialGain * 100,
    actionSteps: [
      'Research topic thoroughly',
      'Create content with proper citations',
      'Add to knowledge graph',
      'Sync to AI platforms',
    ],
    successCriteria: [
      'Node added to graph',
      'Authority score > 50',
      'Connected with 2+ edges',
    ],
    estimatedCompletion: 7,
    prerequisites: [],
    blockers: [],
  };

  implementation.roi = implementation.expectedDeltaScore / (implementation.estimatedEffort / 40);

  return {
    type,
    gapDescription: description,
    detectedBy,
    competitorsWithThis: competitors,
    competitorAdvantage: potentialGain * 100,
    potentialGain,
    competitiveImpact: potentialGain,
    implementation,
    confidence: 0.75,
    evidenceStrength: competitors.length > 0 ? 0.8 : 0.5,
  };
}

async function analyzeCompetitors(
  _ourGraph: CausalGraph,
  competitorGraphs: CausalGraph[],
  query: string,
  ourTopPath: CausalPath,
  config: TracerConfig
): Promise<CompetitorComparison[]> {
  const comparisons: CompetitorComparison[] = [];

  for (const compGraph of competitorGraphs) {
    const cache = new PathCache();
    
    // Find their paths
    const queryNode = Array.from(compGraph.nodes.values()).find(n => n.type === 'query');
    const sourceNode = Array.from(compGraph.nodes.values()).find(n => n.type === 'source');
    
    if (!queryNode || !sourceNode) continue;

    const theirPaths = findAllPaths(
      compGraph,
      queryNode.id,
      sourceNode.id,
      config.maxPathLength,
      config,
      query,
      cache
    );

    if (theirPaths.length === 0) continue;

    const theirTopPath = theirPaths[0];

    // Compare scores
    const ourScore = ourTopPath.totalScore;
    const theirScore = theirTopPath.totalScore;
    const delta = ourScore - theirScore;

    // Identify advantages
    const ourAdvantages = [];
    const theirAdvantages = [];

    if (ourTopPath.authorityScore > theirTopPath.authorityScore) {
      ourAdvantages.push({
        factor: 'Authority',
        magnitude: ourTopPath.authorityScore - theirTopPath.authorityScore,
        description: `Our authority is ${(ourTopPath.authorityScore - theirTopPath.authorityScore).toFixed(1)} points higher`,
      });
    } else {
      theirAdvantages.push({
        factor: 'Authority',
        magnitude: theirTopPath.authorityScore - ourTopPath.authorityScore,
        description: `Their authority is ${(theirTopPath.authorityScore - ourTopPath.authorityScore).toFixed(1)} points higher`,
      });
    }

    // Freshness comparison
    if (ourTopPath.freshnessScore > theirTopPath.freshnessScore) {
      ourAdvantages.push({
        factor: 'Freshness',
        magnitude: ourTopPath.freshnessScore - theirTopPath.freshnessScore,
        description: `Our content is fresher`,
      });
    } else {
      theirAdvantages.push({
        factor: 'Freshness',
        magnitude: theirTopPath.freshnessScore - ourTopPath.freshnessScore,
        description: `Their content is fresher`,
      });
    }

    // Uniqueness comparison
    if (ourTopPath.uniquenessScore > theirTopPath.uniquenessScore) {
      ourAdvantages.push({
        factor: 'Uniqueness',
        magnitude: ourTopPath.uniquenessScore - theirTopPath.uniquenessScore,
        description: `We have more unique insights`,
      });
    }

    // Win probability (sigmoid-like function)
    const winProbability = 1 / (1 + Math.exp(-delta / 10));

    // Strategy recommendation
    let strategy: 'dominate' | 'differentiate' | 'avoid' | 'monitor';
    if (delta > 20) strategy = 'dominate';
    else if (delta > 0) strategy = 'differentiate';
    else if (delta > -20) strategy = 'monitor';
    else strategy = 'avoid';

    comparisons.push({
      competitorDomain: compGraph.domain,
      ourScore,
      theirScore,
      delta,
      ourBestPath: ourTopPath,
      theirBestPath: theirTopPath,
      ourAdvantages,
      theirAdvantages,
      criticalGaps: [],
      winProbability,
      strategy,
      reasoning: `Score delta: ${delta.toFixed(1)}. ${strategy === 'dominate' ? 'We have clear advantage.' : strategy === 'differentiate' ? 'Competitive position.' : 'Need improvement.'}`,
    });
  }

  return comparisons;
}

async function generateImprovements(
  paths: CausalPath[]
): Promise<Improvement[]> {
  const improvements: Improvement[] = [];

  // Check for low-scoring components
  const avgAuthority = paths.reduce((sum, p) => sum + p.authorityScore, 0) / paths.length;
  const avgFreshness = paths.reduce((sum, p) => sum + p.freshnessScore, 0) / paths.length;
  const avgUniqueness = paths.reduce((sum, p) => sum + p.uniquenessScore, 0) / paths.length;

  if (avgAuthority < 60) {
    improvements.push({
      id: `imp-authority-${Date.now()}`,
      type: 'boost_authority',
      title: 'Boost Authority Signals',
      description: 'Improve E-E-A-T signals and domain authority',
      rationale: `Current authority score is ${avgAuthority.toFixed(1)}, below target of 70+`,
      expectedDeltaScore: 0.15,
      impactLevel: 'high',
      difficulty: 'hard',
      estimatedEffort: 40,
      requiredResources: ['SEO specialist', 'Content team'],
      roi: 0.15 / 1,
      priority: 85,
      actionSteps: [
        'Add author bios with credentials',
        'Get backlinks from authoritative sources',
        'Add citations to primary sources',
      ],
      successCriteria: ['Authority score > 70'],
      estimatedCompletion: 30,
      prerequisites: [],
      blockers: [],
    });
  }

  if (avgFreshness < 50) {
    improvements.push({
      id: `imp-freshness-${Date.now()}`,
      type: 'improve_freshness',
      title: 'Update Content Freshness',
      description: 'Refresh outdated content with recent information',
      rationale: `Current freshness score is ${avgFreshness.toFixed(1)}, indicating stale content`,
      expectedDeltaScore: 0.12,
      impactLevel: 'medium',
      difficulty: 'easy',
      estimatedEffort: 8,
      requiredResources: ['Content writer'],
      roi: 0.12 / 0.2,
      priority: 70,
      actionSteps: [
        'Identify outdated content',
        'Update with recent data',
        'Add publication date',
      ],
      successCriteria: ['Freshness score > 70'],
      estimatedCompletion: 7,
      prerequisites: [],
      blockers: [],
    });
  }

  if (avgUniqueness < 40) {
    improvements.push({
      id: `imp-uniqueness-${Date.now()}`,
      type: 'add_uniqueness',
      title: 'Add Unique Insights',
      description: 'Create content with novel perspectives not found in competitors',
      rationale: `Uniqueness score is ${avgUniqueness.toFixed(1)}, need differentiation`,
      expectedDeltaScore: 0.18,
      impactLevel: 'critical',
      difficulty: 'hard',
      estimatedEffort: 60,
      requiredResources: ['Subject matter expert', 'Research team'],
      roi: 0.18 / 1.5,
      priority: 90,
      actionSteps: [
        'Research competitor content',
        'Identify gaps',
        'Create original research/analysis',
      ],
      successCriteria: ['Uniqueness score > 60'],
      estimatedCompletion: 45,
      prerequisites: [],
      blockers: [],
    });
  }

  // Sort by priority
  improvements.sort((a, b) => b.priority - a.priority);

  return improvements;
}

function determineMarketPosition(
  ourScore: number,
  competitorScores: number[]
): 'leader' | 'challenger' | 'follower' | 'niche' {
  if (competitorScores.length === 0) return 'leader';

  const avgCompetitor = competitorScores.reduce((sum, s) => sum + s, 0) / competitorScores.length;
  const maxCompetitor = Math.max(...competitorScores);

  if (ourScore > maxCompetitor) return 'leader';
  if (ourScore > avgCompetitor) return 'challenger';
  if (ourScore > avgCompetitor * 0.8) return 'follower';
  return 'niche';
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * Main CausalTracerEngine class for enterprise integration
 * Manages graph registry and provides unified API
 */
export class CausalTracerEngine {
  private graphs: Map<string, CausalGraph>;
  private config: TracerConfig;

  constructor(config: Partial<TracerConfig> = {}) {
    this.graphs = new Map();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add a graph to the engine's registry
   */
  addGraph(graph: CausalGraphInput): void {
    const causalGraph: CausalGraph = {
      domain: graph.metadata?.url || 'unknown',
      nodes: new Map(graph.nodes.map((n: CausalGraphNode) => [n.id, n])) as unknown as Map<string, CausalNode>,
      edges: new Map(graph.edges.map((e: CausalGraphEdge) => [e.id, e])) as unknown as Map<string, CausalEdge>,
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      density: 0,
      avgPathLength: 0,
      clusteringCoefficient: 0,
      lastUpdated: new Date(),
      version: 1,
    };
    this.graphs.set((graph as unknown as { id: string }).id, causalGraph);
  }

  /**
   * Trace citation path for a specific node in a graph
   */
  async traceCitationPath(
    graphId: string,
    _targetNodeId: string,
    query: string
  ): Promise<CitationTraceResult> {
    const graph = this.graphs.get(graphId);
    if (!graph) {
      throw new Error(`Graph ${graphId} not found`);
    }

    return await traceCitationPath(query, graph, [], this.config);
  }

  /**
   * Explain why this node/site would be chosen
   */
  async explainWhyChosen(
    graphId: string,
    _nodeId: string,
    query: string,
    _platform: LLMPlatform,
    competitorUrls: string[]
  ): Promise<{
    reasonChosen: string;
    keyFactors: Array<{ factor: string; impact: number; evidence: string }>;
    platformBias: string;
    competitivePosition: { position: string; advantage: number };
    nearMisses: Array<{ competitorUrl: string; scoreGap: number }>;
  }> {
    const graph = this.graphs.get(graphId);
    if (!graph) {
      throw new Error(`Graph ${graphId} not found`);
    }

    // Run full trace to get paths and competitive data
    const traceResult = await traceCitationPath(query, graph, [], this.config);
    const topPath = traceResult.topPath;

    return {
      reasonChosen: topPath.humanReadableExplanation || explainWhyChosen(topPath),
      keyFactors: topPath.keyFactors.map((f: string) => ({
        factor: f,
        impact: 0.8, // Default impact
        evidence: 'See path analysis',
      })),
      platformBias: 'Platform-specific scoring applied',
      competitivePosition: {
        position: traceResult.marketPosition,
        advantage: traceResult.competitorComparison[0]?.winProbability || 0,
      },
      nearMisses: competitorUrls.slice(0, 3).map((url, i) => ({
        competitorUrl: url,
        scoreGap: Math.abs(traceResult.competitorComparison[i]?.delta || 0),
      })),
    };
  }

  /**
   * Run counterfactual analysis
   */
  async counterfactualImpact(
    graphId: string,
    nodeId: string,
    query: string
  ): Promise<CounterfactualResult> {
    const graph = this.graphs.get(graphId);
    if (!graph) {
      throw new Error(`Graph ${graphId} not found`);
    }

    const node = graph.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found in graph ${graphId}`);
    }

    return await counterfactualImpact(
      graph,
      { type: 'node_removal', element: node },
      query,
      this.config
    );
  }

  /**
   * Analyze predictive gaps
   */
  async predictiveGapAnalysis(
    graphId: string,
    query: string,
    competitorGraphIds: string[]
  ): Promise<GapAnalysisResult> {
    const graph = this.graphs.get(graphId);
    if (!graph) {
      throw new Error(`Graph ${graphId} not found`);
    }

    const competitorGraphs = competitorGraphIds
      .map(id => this.graphs.get(id))
      .filter((g): g is CausalGraph => g !== undefined);

    // predictiveGapAnalysis expects (ourGraph, competitorGraph, query)
    if (competitorGraphs.length === 0) {
      throw new Error('At least one competitor graph is required');
    }

    return await predictiveGapAnalysis(
      graph,
      competitorGraphs[0],
      query
    );
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const CausalTracer = {
  traceCitationPath,
  explainWhyChosen,
  counterfactualImpact,
  predictiveGapAnalysis,
  DEFAULT_CONFIG,
};

export default CausalTracer;
