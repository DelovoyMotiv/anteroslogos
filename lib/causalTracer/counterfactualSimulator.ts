/**
 * CAUSAL CITATION TRACER - COUNTERFACTUAL SIMULATOR
 * 
 * Production-grade "what-if" analysis for graph modifications.
 * Simulates node/edge removal/addition and calculates precise
 * impact on citation probability through path recomputation.
 * 
 * Algorithm: Deep graph cloning + differential path analysis
 * 
 * @module lib/causalTracer/counterfactualSimulator
 * @version 1.0.0
 */

import type {
  CausalGraph,
  CausalNode,
  CausalEdge,
  CausalPath,
  CounterfactualResult,
  CounterfactualBatchResult,
  TracerConfig,
} from '../../types/causalTracer.types';

import { findAllPaths, scorePath } from './pathFinder';
import { PathCache } from './pathFinder';

// ============================================================================
// GRAPH CLONING & MODIFICATION
// ============================================================================

/**
 * Deep clone graph for counterfactual analysis
 */
function cloneGraph(graph: CausalGraph): CausalGraph {
  const clonedNodes = new Map<string, CausalNode>();
  const clonedEdges = new Map<string, CausalEdge>();

  // Clone nodes
  graph.nodes.forEach((node, id) => {
    clonedNodes.set(id, {
      ...node,
      entities: [...node.entities],
      claims: [...node.claims],
      timestamp: new Date(node.timestamp),
    });
  });

  // Clone edges
  graph.edges.forEach((edge, id) => {
    clonedEdges.set(id, {
      ...edge,
      createdAt: new Date(edge.createdAt),
      lastValidated: new Date(edge.lastValidated),
    });
  });

  return {
    nodes: clonedNodes,
    edges: clonedEdges,
    nodeCount: graph.nodeCount,
    edgeCount: graph.edgeCount,
    density: graph.density,
    avgPathLength: graph.avgPathLength,
    clusteringCoefficient: graph.clusteringCoefficient,
    domain: graph.domain,
    lastUpdated: new Date(graph.lastUpdated),
    version: graph.version + 1,
  };
}

/**
 * Remove node and all connected edges from graph
 */
function removeNodeFromGraph(graph: CausalGraph, nodeId: string): CausalGraph {
  const modified = cloneGraph(graph);
  
  // Remove node
  modified.nodes.delete(nodeId);
  modified.nodeCount--;

  // Remove all edges connected to this node
  const edgesToRemove: string[] = [];
  modified.edges.forEach((edge, id) => {
    if (edge.source === nodeId || edge.target === nodeId) {
      edgesToRemove.push(id);
    }
  });

  edgesToRemove.forEach(id => {
    modified.edges.delete(id);
    modified.edgeCount--;
  });

  // Recalculate density
  const maxEdges = modified.nodeCount * (modified.nodeCount - 1);
  modified.density = maxEdges > 0 ? modified.edgeCount / maxEdges : 0;

  return modified;
}

/**
 * Add node to graph
 */
function addNodeToGraph(graph: CausalGraph, node: CausalNode): CausalGraph {
  const modified = cloneGraph(graph);
  
  // Check for duplicate ID
  if (modified.nodes.has(node.id)) {
    throw new Error(`Node with ID ${node.id} already exists`);
  }

  modified.nodes.set(node.id, node);
  modified.nodeCount++;

  // Recalculate density
  const maxEdges = modified.nodeCount * (modified.nodeCount - 1);
  modified.density = maxEdges > 0 ? modified.edgeCount / maxEdges : 0;

  return modified;
}

/**
 * Remove edge from graph
 */
function removeEdgeFromGraph(graph: CausalGraph, edgeId: string): CausalGraph {
  const modified = cloneGraph(graph);
  
  if (!modified.edges.has(edgeId)) {
    throw new Error(`Edge with ID ${edgeId} not found`);
  }

  modified.edges.delete(edgeId);
  modified.edgeCount--;

  // Recalculate density
  const maxEdges = modified.nodeCount * (modified.nodeCount - 1);
  modified.density = maxEdges > 0 ? modified.edgeCount / maxEdges : 0;

  return modified;
}

/**
 * Add edge to graph
 */
function addEdgeToGraph(graph: CausalGraph, edge: CausalEdge): CausalGraph {
  const modified = cloneGraph(graph);
  
  // Validate nodes exist
  if (!modified.nodes.has(edge.source)) {
    throw new Error(`Source node ${edge.source} not found`);
  }
  if (!modified.nodes.has(edge.target)) {
    throw new Error(`Target node ${edge.target} not found`);
  }

  // Check for duplicate
  if (modified.edges.has(edge.id)) {
    throw new Error(`Edge with ID ${edge.id} already exists`);
  }

  modified.edges.set(edge.id, edge);
  modified.edgeCount++;

  // Recalculate density
  const maxEdges = modified.nodeCount * (modified.nodeCount - 1);
  modified.density = maxEdges > 0 ? modified.edgeCount / maxEdges : 0;

  return modified;
}

// ============================================================================
// PATH DIFFERENTIAL ANALYSIS
// ============================================================================

/**
 * Find which paths are affected by graph modification
 */
function analyzePathDifferences(
  originalPaths: CausalPath[],
  modifiedPaths: CausalPath[],
  modifiedElementId: string
): {
  affectedPaths: CausalPath[];
  brokenPaths: number;
  newPathsCreated: number;
} {
  const originalPathIds = new Set(originalPaths.map(p => 
    p.nodes.map(n => n.id).join('→')
  ));
  
  const modifiedPathIds = new Set(modifiedPaths.map(p =>
    p.nodes.map(n => n.id).join('→')
  ));

  // Paths that existed before but not after = broken
  const brokenPaths = originalPaths.filter(p => {
    const pathId = p.nodes.map(n => n.id).join('→');
    return !modifiedPathIds.has(pathId);
  }).length;

  // Paths that exist now but didn't before = new
  const newPathsCreated = modifiedPaths.filter(p => {
    const pathId = p.nodes.map(n => n.id).join('→');
    return !originalPathIds.has(pathId);
  }).length;

  // Affected = originally contained the modified element
  const affectedPaths = originalPaths.filter(p => {
    // Check if path contains modified node
    if (p.nodes.some(n => n.id === modifiedElementId)) return true;
    // Check if path contains modified edge
    if (p.edges.some(e => e.id === modifiedElementId)) return true;
    return false;
  });

  return { affectedPaths, brokenPaths, newPathsCreated };
}

/**
 * Calculate citation probability from paths
 */
function calculateCitationProbability(paths: CausalPath[]): number {
  if (paths.length === 0) return 0;

  // Use best path score as base
  const bestScore = Math.max(...paths.map(p => p.totalScore));
  
  // Bonus for multiple paths (redundancy)
  const pathCountBonus = Math.min(paths.length / 10, 0.2); // Max 20% bonus

  // Average uniqueness across top 5 paths
  const topPaths = paths.slice(0, 5);
  const avgUniqueness = topPaths.reduce((sum, p) => sum + p.uniqueness, 0) / topPaths.length;

  // Combined probability (sigmoid to keep 0-1 range)
  const rawScore = (bestScore / 100) + pathCountBonus + (avgUniqueness * 0.1);
  return 1 / (1 + Math.exp(-5 * (rawScore - 0.5))); // Sigmoid centered at 0.5
}

// ============================================================================
// COUNTERFACTUAL SIMULATION
// ============================================================================

/**
 * Simulate node removal and calculate impact
 */
export async function simulateNodeRemoval(
  graph: CausalGraph,
  nodeId: string,
  query: string,
  startNodeId: string,
  endNodeId: string,
  config: TracerConfig
): Promise<CounterfactualResult> {
  const cache = new PathCache();
  
  // Original paths and probability
  const originalPaths = findAllPaths(graph, startNodeId, endNodeId, config.maxPathLength, config, query, cache);
  const originalProbability = calculateCitationProbability(originalPaths);

  // Modified graph
  const modifiedGraph = removeNodeFromGraph(graph, nodeId);
  
  // New paths and probability
  const modifiedPaths = findAllPaths(modifiedGraph, startNodeId, endNodeId, config.maxPathLength, config, query, cache);
  const newProbability = calculateCitationProbability(modifiedPaths);

  // Impact analysis
  const deltaScore = newProbability - originalProbability;
  const { affectedPaths, brokenPaths, newPathsCreated } = analyzePathDifferences(
    originalPaths,
    modifiedPaths,
    nodeId
  );

  // Determine magnitude
  let impactMagnitude: 'critical' | 'high' | 'medium' | 'low' | 'negligible';
  const absDelta = Math.abs(deltaScore);
  if (absDelta > 0.30) impactMagnitude = 'critical';
  else if (absDelta > 0.15) impactMagnitude = 'high';
  else if (absDelta > 0.05) impactMagnitude = 'medium';
  else if (absDelta > 0.01) impactMagnitude = 'low';
  else impactMagnitude = 'negligible';

  // Generate explanation
  const node = graph.nodes.get(nodeId)!;
  const explanation = generateRemovalExplanation(node, deltaScore, brokenPaths, affectedPaths.length);
  const mechanism = generateMechanismExplanation('node_removal', node, affectedPaths);

  // Determine actionability
  const actionable = impactMagnitude === 'critical' || impactMagnitude === 'high';
  const difficulty = estimateDifficulty(node, 'maintain');
  const estimatedEffort = estimateEffort(node, 'maintain');
  const roi = absDelta / (estimatedEffort / 40); // 40 hours = 1 work week

  return {
    type: 'node_removal',
    modifiedElement: node,
    elementId: nodeId,
    originalProbability,
    newProbability,
    deltaScore,
    impactMagnitude,
    affectedPaths,
    brokenPaths,
    newPathsCreated,
    explanation,
    mechanism,
    actionable,
    difficulty,
    estimatedEffort,
    roi,
  };
}

/**
 * Simulate node addition and calculate impact
 */
export async function simulateNodeAddition(
  graph: CausalGraph,
  node: CausalNode,
  connectingEdges: CausalEdge[],
  query: string,
  startNodeId: string,
  endNodeId: string,
  config: TracerConfig
): Promise<CounterfactualResult> {
  const cache = new PathCache();
  
  // Original paths and probability
  const originalPaths = findAllPaths(graph, startNodeId, endNodeId, config.maxPathLength, config, query, cache);
  const originalProbability = calculateCitationProbability(originalPaths);

  // Modified graph - add node and edges
  let modifiedGraph = addNodeToGraph(graph, node);
  for (const edge of connectingEdges) {
    modifiedGraph = addEdgeToGraph(modifiedGraph, edge);
  }
  
  // New paths and probability
  const modifiedPaths = findAllPaths(modifiedGraph, startNodeId, endNodeId, config.maxPathLength, config, query, cache);
  const newProbability = calculateCitationProbability(modifiedPaths);

  // Impact analysis
  const deltaScore = newProbability - originalProbability;
  const { affectedPaths, brokenPaths, newPathsCreated } = analyzePathDifferences(
    originalPaths,
    modifiedPaths,
    node.id
  );

  // Determine magnitude
  let impactMagnitude: 'critical' | 'high' | 'medium' | 'low' | 'negligible';
  const absDelta = Math.abs(deltaScore);
  if (absDelta > 0.30) impactMagnitude = 'critical';
  else if (absDelta > 0.15) impactMagnitude = 'high';
  else if (absDelta > 0.05) impactMagnitude = 'medium';
  else if (absDelta > 0.01) impactMagnitude = 'low';
  else impactMagnitude = 'negligible';

  // Generate explanation
  const explanation = generateAdditionExplanation(node, deltaScore, newPathsCreated);
  const mechanism = generateMechanismExplanation('node_addition', node, modifiedPaths.slice(0, 5));

  // Actionability
  const actionable = deltaScore > 0.05; // Only actionable if positive gain
  const difficulty = estimateDifficulty(node, 'create');
  const estimatedEffort = estimateEffort(node, 'create');
  const roi = deltaScore > 0 ? deltaScore / (estimatedEffort / 40) : 0;

  return {
    type: 'node_addition',
    modifiedElement: node,
    elementId: node.id,
    originalProbability,
    newProbability,
    deltaScore,
    impactMagnitude,
    affectedPaths,
    brokenPaths,
    newPathsCreated,
    explanation,
    mechanism,
    actionable,
    difficulty,
    estimatedEffort,
    roi,
  };
}

/**
 * Simulate edge removal
 */
export async function simulateEdgeRemoval(
  graph: CausalGraph,
  edgeId: string,
  query: string,
  startNodeId: string,
  endNodeId: string,
  config: TracerConfig
): Promise<CounterfactualResult> {
  const cache = new PathCache();
  
  const originalPaths = findAllPaths(graph, startNodeId, endNodeId, config.maxPathLength, config, query, cache);
  const originalProbability = calculateCitationProbability(originalPaths);

  const modifiedGraph = removeEdgeFromGraph(graph, edgeId);
  const modifiedPaths = findAllPaths(modifiedGraph, startNodeId, endNodeId, config.maxPathLength, config, query, cache);
  const newProbability = calculateCitationProbability(modifiedPaths);

  const deltaScore = newProbability - originalProbability;
  const { affectedPaths, brokenPaths, newPathsCreated } = analyzePathDifferences(originalPaths, modifiedPaths, edgeId);

  let impactMagnitude: 'critical' | 'high' | 'medium' | 'low' | 'negligible';
  const absDelta = Math.abs(deltaScore);
  if (absDelta > 0.30) impactMagnitude = 'critical';
  else if (absDelta > 0.15) impactMagnitude = 'high';
  else if (absDelta > 0.05) impactMagnitude = 'medium';
  else if (absDelta > 0.01) impactMagnitude = 'low';
  else impactMagnitude = 'negligible';

  const edge = graph.edges.get(edgeId)!;
  const explanation = `Removing edge ${edge.type} (${edge.source}→${edge.target}) changes citation probability by ${(deltaScore * 100).toFixed(1)}%. Breaks ${brokenPaths} path(s).`;
  const mechanism = `Edge removal disrupts ${affectedPaths.length} existing paths by eliminating the ${edge.type} relationship.`;

  return {
    type: 'edge_removal',
    modifiedElement: edge,
    elementId: edgeId,
    originalProbability,
    newProbability,
    deltaScore,
    impactMagnitude,
    affectedPaths,
    brokenPaths,
    newPathsCreated,
    explanation,
    mechanism,
    actionable: impactMagnitude === 'critical' || impactMagnitude === 'high',
    difficulty: 'medium',
    estimatedEffort: 1,
    roi: absDelta / 0.025, // 1 hour = 0.025 weeks
  };
}

/**
 * Batch counterfactual analysis
 */
export async function batchSimulation(
  graph: CausalGraph,
  elements: Array<{ type: 'node' | 'edge'; id: string }>,
  query: string,
  startNodeId: string,
  endNodeId: string,
  config: TracerConfig
): Promise<CounterfactualBatchResult> {
  const simulations: CounterfactualResult[] = [];

  for (const element of elements) {
    try {
      let result: CounterfactualResult;
      
      if (element.type === 'node') {
        result = await simulateNodeRemoval(graph, element.id, query, startNodeId, endNodeId, config);
      } else {
        result = await simulateEdgeRemoval(graph, element.id, query, startNodeId, endNodeId, config);
      }

      simulations.push(result);
    } catch (error) {
      console.warn(`Simulation failed for ${element.type} ${element.id}:`, error);
    }
  }

  // Sort by absolute impact
  simulations.sort((a, b) => Math.abs(b.deltaScore) - Math.abs(a.deltaScore));

  // Categorize
  const topImpact = simulations.slice(0, 10);
  const quickWins = simulations.filter(s => s.actionable && s.difficulty === 'easy' && s.roi > 3);
  const strategicMoves = simulations.filter(s => s.actionable && (s.difficulty === 'hard' || s.difficulty === 'very_hard') && Math.abs(s.deltaScore) > 0.15);

  // Summary statistics
  const avgDeltaScore = simulations.reduce((sum, s) => sum + Math.abs(s.deltaScore), 0) / simulations.length;
  const maxDeltaScore = Math.max(...simulations.map(s => Math.abs(s.deltaScore)));
  const totalActionsRecommended = simulations.filter(s => s.actionable).length;

  return {
    simulations,
    topImpact,
    quickWins,
    strategicMoves,
    avgDeltaScore,
    maxDeltaScore,
    totalActionsRecommended,
  };
}

// ============================================================================
// EXPLANATION GENERATORS
// ============================================================================

function generateRemovalExplanation(node: CausalNode, deltaScore: number, brokenPaths: number, affectedCount: number): string {
  const impact = deltaScore < 0 ? 'drops' : 'increases';
  const pct = Math.abs(deltaScore * 100).toFixed(1);
  
  return `Removing node "${node.label}" (type: ${node.type}) ${impact} citation probability by ${pct}%. ` +
    `This breaks ${brokenPaths} critical path(s) and affects ${affectedCount} total paths. ` +
    `Node has authority score ${node.authorityScore.toFixed(0)}, E-E-A-T ${node.eeatScore.toFixed(1)}, ` +
    `and ${node.entities.length} entities + ${node.claims.length} claims.`;
}

function generateAdditionExplanation(node: CausalNode, deltaScore: number, newPaths: number): string {
  const pct = (deltaScore * 100).toFixed(1);
  
  return `Adding node "${node.label}" (type: ${node.type}) increases citation probability by ${pct}%. ` +
    `Creates ${newPaths} new path(s). Node contributes ${node.entities.length} entities, ` +
    `${node.claims.length} claims, with authority ${node.authorityScore.toFixed(0)} and E-E-A-T ${node.eeatScore.toFixed(1)}.`;
}

function generateMechanismExplanation(modificationType: string, element: CausalNode | CausalEdge, paths: CausalPath[]): string {
  if ('label' in element) {
    // Node
    return `Node ${modificationType} affects citation through ${paths.length} paths by changing graph connectivity and semantic density.`;
  } else {
    // Edge
    return `Edge ${modificationType} affects citation by altering relationship strength and path viability.`;
  }
}

function estimateDifficulty(node: CausalNode, action: 'create' | 'maintain'): 'easy' | 'medium' | 'hard' | 'very_hard' {
  if (action === 'maintain') {
    // Maintaining existing is easier
    if (node.type === 'entity' || node.type === 'claim') return 'easy';
    if (node.type === 'evidence') return 'medium';
    return 'hard';
  } else {
    // Creating new
    const complexity = node.entities.length + node.claims.length;
    if (complexity < 3) return 'easy';
    if (complexity < 7) return 'medium';
    if (complexity < 15) return 'hard';
    return 'very_hard';
  }
}

function estimateEffort(node: CausalNode, action: 'create' | 'maintain'): number {
  const baseEffort = action === 'create' ? 4 : 1; // hours
  const complexityMultiplier = 1 + (node.entities.length + node.claims.length) / 10;
  const authorityMultiplier = 1 + (100 - node.authorityScore) / 100; // Lower authority = more effort
  
  return baseEffort * complexityMultiplier * authorityMultiplier;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const CounterfactualSimulator = {
  simulateNodeRemoval,
  simulateNodeAddition,
  simulateEdgeRemoval,
  batchSimulation,
  cloneGraph,
  calculateCitationProbability,
};

export default CounterfactualSimulator;
