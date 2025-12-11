/**
 * CAUSAL CITATION TRACER - PATH FINDER
 * 
 * Advanced graph traversal algorithm for discovering causal paths
 * that explain LLM citation decisions. Optimized for graphs with
 * 50k+ nodes and 300k+ edges, target < 4s execution time.
 * 
 * Algorithm: Hybrid BFS/DFS with A* heuristic, memoization, and
 * incremental scoring for real-time performance.
 * 
 * @module lib/causalTracer/pathFinder
 * @version 1.0.0
 */

import type {
  CausalGraph,
  CausalNode,
  CausalEdge,
  CausalEdgeType,
  CausalPath,
  TracerConfig,
} from '../../types/causalTracer.types';

// ============================================================================
// PATH SEARCH ALGORITHMS
// ============================================================================

/**
 * Priority queue for A* search optimization
 */
class PriorityQueue<T> {
  private items: Array<{ element: T; priority: number }> = [];

  enqueue(element: T, priority: number): void {
    const item = { element, priority };
    let added = false;

    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].priority < priority) {
        this.items.splice(i, 0, item);
        added = true;
        break;
      }
    }

    if (!added) {
      this.items.push(item);
    }
  }

  dequeue(): T | undefined {
    return this.items.shift()?.element;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }
}

/**
 * Memoization cache for path searches
 */
class PathCache {
  private cache = new Map<string, CausalPath[]>();
  private hitCount = 0;
  private missCount = 0;

  get(from: string, to: string, maxLength: number): CausalPath[] | undefined {
    const key = `${from}:${to}:${maxLength}`;
    const result = this.cache.get(key);
    
    if (result) {
      this.hitCount++;
      return result;
    }
    
    this.missCount++;
    return undefined;
  }

  set(from: string, to: string, maxLength: number, paths: CausalPath[]): void {
    const key = `${from}:${to}:${maxLength}`;
    this.cache.set(key, paths);
  }

  getStats() {
    const total = this.hitCount + this.missCount;
    return {
      hitRate: total > 0 ? this.hitCount / total : 0,
      hits: this.hitCount,
      misses: this.missCount,
      size: this.cache.size,
    };
  }

  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }
}

// ============================================================================
// PATH SCORING
// ============================================================================

/**
 * Calculate comprehensive path score based on weighted factors
 */
export function scorePath(
  _path: Partial<CausalPath>,
  nodes: CausalNode[],
  edges: CausalEdge[],
  config: TracerConfig,
  query: string
) {
  const weights = config.weights;

  // Authority score: Average authority of nodes
  const authorityScore = nodes.reduce((sum, n) => sum + n.authorityScore, 0) / nodes.length;

  // Freshness score: Inverse of average days since update
  const avgFreshness = nodes.reduce((sum, n) => sum + n.freshness, 0) / nodes.length;
  const freshnessScore = Math.max(0, 100 - avgFreshness * 0.5); // 0-100 scale

  // Relevance score: Entity/claim match with query
  const queryLower = query.toLowerCase();
  const queryTokens = queryLower.split(/\s+/);
  
  let relevanceMatches = 0;
  let totalElements = 0;
  
  nodes.forEach(node => {
    totalElements += node.entities.length + node.claims.length;
    
    node.entities.forEach(entity => {
      if (queryTokens.some(token => entity.toLowerCase().includes(token))) {
        relevanceMatches++;
      }
    });
    
    node.claims.forEach(claim => {
      if (queryTokens.some(token => claim.toLowerCase().includes(token))) {
        relevanceMatches += 2; // Claims weighted higher
      }
    });
  });
  
  const relevanceScore = totalElements > 0 ? (relevanceMatches / totalElements) * 100 : 0;

  // Validation score: Average edge confidence and evidence
  const avgConfidence = edges.reduce((sum, e) => sum + e.confidence, 0) / edges.length;
  const avgEvidence = edges.reduce((sum, e) => sum + e.evidenceCount, 0) / edges.length;
  const validationScore = (avgConfidence * 60 + Math.min(avgEvidence / 5, 1) * 40);

  // Uniqueness score: Based on edge rarity
  const uniqueEdgeTypes = new Set(edges.map(e => e.type)).size;
  const uniquenessScore = Math.min((uniqueEdgeTypes / edges.length) * 100, 100);

  // Causal strength: Average across edges
  const causalStrength = edges.reduce((sum, e) => sum + e.causalStrength, 0) / edges.length;

  // Weighted total
  const totalScore = 
    authorityScore * weights.authority +
    freshnessScore * weights.freshness +
    relevanceScore * weights.relevance +
    validationScore * weights.validation +
    uniquenessScore * weights.uniqueness;

  return {
    totalScore,
    authorityScore,
    freshnessScore,
    relevanceScore,
    validationScore,
    uniquenessScore,
    causalStrength,
  };
}

/**
 * Heuristic function for A* search
 * Estimates remaining cost to reach goal
 */
function heuristic(
  currentNode: CausalNode,
  goalNode: CausalNode
): number {
  // Semantic distance based on entity overlap
  const currentEntities = new Set(currentNode.entities);
  const goalEntities = new Set(goalNode.entities);
  const overlap = [...currentEntities].filter(e => goalEntities.has(e)).length;
  const union = new Set([...currentEntities, ...goalEntities]).size;
  
  const semanticDistance = union > 0 ? 1 - (overlap / union) : 1;

  // Temporal distance (freshness difference)
  const temporalDistance = Math.abs(currentNode.freshness - goalNode.freshness) / 365;

  // Authority gap
  const authorityGap = Math.abs(currentNode.authorityScore - goalNode.authorityScore) / 100;

  // Combined heuristic (lower is better)
  return semanticDistance * 0.5 + temporalDistance * 0.3 + authorityGap * 0.2;
}

// ============================================================================
// MAIN PATH FINDING FUNCTIONS
// ============================================================================

/**
 * Find all paths between two nodes up to max length using optimized BFS
 */
export function findAllPaths(
  graph: CausalGraph,
  startNodeId: string,
  endNodeId: string,
  maxLength: number,
  config: TracerConfig,
  query: string,
  cache: PathCache
): CausalPath[] {
  // Check cache first
  const cached = cache.get(startNodeId, endNodeId, maxLength);
  if (cached) return cached;

  const startNode = graph.nodes.get(startNodeId);
  const endNode = graph.nodes.get(endNodeId);

  if (!startNode || !endNode) return [];

  const paths: CausalPath[] = [];
  
  interface PathState {
    currentNodeId: string;
    pathNodes: string[];
    pathEdges: string[];
    length: number;
  }

  const queue: PathState[] = [{
    currentNodeId: startNodeId,
    pathNodes: [startNodeId],
    pathEdges: [],
    length: 0,
  }];

  let explored = 0;
  const maxExplorations = config.maxPathsToExplore;

  while (queue.length > 0 && explored < maxExplorations) {
    const state = queue.shift()!;
    explored++;

    // Reached destination
    if (state.currentNodeId === endNodeId) {
      const pathNodes = state.pathNodes.map(id => graph.nodes.get(id)!);
      const pathEdges = state.pathEdges.map(id => graph.edges.get(id)!);

      const scores = scorePath(
        {} as CausalPath,
        pathNodes,
        pathEdges,
        config,
        query
      );

      const path: CausalPath = {
        id: `path-${paths.length}`,
        nodes: pathNodes,
        edges: pathEdges,
        length: state.length,
        ...scores,
        uniqueness: scores.uniquenessScore / 100, // 0-1 scale
        criticalNodes: identifyCriticalNodes(pathNodes, pathEdges),
        bottleneckEdges: identifyBottlenecks(pathEdges),
        humanReadableExplanation: '',
        technicalExplanation: '',
        keyFactors: [],
        competitiveAdvantages: [],
        vulnerabilities: [],
      };

      paths.push(path);
      continue;
    }

    // Don't exceed max length
    if (state.length >= maxLength) continue;

    // Explore neighbors
    const outgoingEdges = Array.from(graph.edges.values()).filter(
      e => e.source === state.currentNodeId
    );

    for (const edge of outgoingEdges) {
      const nextNodeId = edge.target;

      // Avoid cycles
      if (state.pathNodes.includes(nextNodeId)) continue;

      // Only high-quality edges
      if (edge.confidence < config.minConfidence) continue;
      if (edge.causalStrength < config.minCausalStrength) continue;

      queue.push({
        currentNodeId: nextNodeId,
        pathNodes: [...state.pathNodes, nextNodeId],
        pathEdges: [...state.pathEdges, edge.id],
        length: state.length + 1,
      });
    }
  }

  // Sort by total score
  paths.sort((a, b) => b.totalScore - a.totalScore);

  // Cache result
  cache.set(startNodeId, endNodeId, maxLength, paths);

  return paths;
}

/**
 * Find single best path using A* algorithm for speed
 */
export function findBestPath(
  graph: CausalGraph,
  startNodeId: string,
  endNodeId: string,
  maxLength: number,
  config: TracerConfig,
  query: string
): CausalPath | null {
  const startNode = graph.nodes.get(startNodeId);
  const endNode = graph.nodes.get(endNodeId);

  if (!startNode || !endNode) return null;

  interface AStarNode {
    nodeId: string;
    pathNodes: string[];
    pathEdges: string[];
    gScore: number;  // cost from start
    fScore: number;  // gScore + heuristic
  }

  const openSet = new PriorityQueue<AStarNode>();
  const closedSet = new Set<string>();

  openSet.enqueue({
    nodeId: startNodeId,
    pathNodes: [startNodeId],
    pathEdges: [],
    gScore: 0,
    fScore: heuristic(startNode, endNode),
  }, heuristic(startNode, endNode));

  let iterations = 0;
  const maxIterations = config.maxPathsToExplore;

  while (!openSet.isEmpty() && iterations < maxIterations) {
    const current = openSet.dequeue()!;
    iterations++;

    // Reached goal
    if (current.nodeId === endNodeId) {
      const pathNodes = current.pathNodes.map(id => graph.nodes.get(id)!);
      const pathEdges = current.pathEdges.map(id => graph.edges.get(id)!);

      const scores = scorePath(
        {} as CausalPath,
        pathNodes,
        pathEdges,
        config,
        query
      );

      return {
        id: 'best-path',
        nodes: pathNodes,
        edges: pathEdges,
        length: current.pathNodes.length - 1,
        ...scores,
        uniqueness: scores.uniquenessScore / 100, // 0-1 scale
        criticalNodes: identifyCriticalNodes(pathNodes, pathEdges),
        bottleneckEdges: identifyBottlenecks(pathEdges),
        humanReadableExplanation: '',
        technicalExplanation: '',
        keyFactors: [],
        competitiveAdvantages: [],
        vulnerabilities: [],
      };
    }

    closedSet.add(current.nodeId);

    // Explore neighbors
    const outgoingEdges = Array.from(graph.edges.values()).filter(
      e => e.source === current.nodeId
    );

    for (const edge of outgoingEdges) {
      const nextNodeId = edge.target;

      // Skip visited
      if (closedSet.has(nextNodeId)) continue;

      // Skip cycles
      if (current.pathNodes.includes(nextNodeId)) continue;

      // Quality filters
      if (edge.confidence < config.minConfidence) continue;
      if (edge.causalStrength < config.minCausalStrength) continue;

      // Path too long
      if (current.pathNodes.length >= maxLength) continue;

      const nextNode = graph.nodes.get(nextNodeId)!;
      const tentativeGScore = current.gScore + (1 - edge.causalStrength);

      const neighbor: AStarNode = {
        nodeId: nextNodeId,
        pathNodes: [...current.pathNodes, nextNodeId],
        pathEdges: [...current.pathEdges, edge.id],
        gScore: tentativeGScore,
        fScore: tentativeGScore + heuristic(nextNode, endNode),
      };

      openSet.enqueue(neighbor, neighbor.fScore);
    }
  }

  return null;
}

// ============================================================================
// CRITICAL NODES & BOTTLENECKS
// ============================================================================

/**
 * Identify critical nodes whose removal would break the path
 */
function identifyCriticalNodes(nodes: CausalNode[], edges: CausalEdge[]): string[] {
  const critical: string[] = [];

  // First and last are always critical
  if (nodes.length > 0) {
    critical.push(nodes[0].id);
    if (nodes.length > 1) {
      critical.push(nodes[nodes.length - 1].id);
    }
  }

  // Nodes with unique edge types are critical
  const edgeTypesByNode = new Map<string, Set<CausalEdgeType>>();
  
  edges.forEach(edge => {
    if (!edgeTypesByNode.has(edge.source)) {
      edgeTypesByNode.set(edge.source, new Set());
    }
    edgeTypesByNode.get(edge.source)!.add(edge.type);
  });

  nodes.forEach(node => {
    const edgeTypes = edgeTypesByNode.get(node.id);
    if (edgeTypes && edgeTypes.size === 1) {
      // Only one edge type through this node - critical
      if (!critical.includes(node.id)) {
        critical.push(node.id);
      }
    }
  });

  return critical;
}

/**
 * Identify bottleneck edges with high betweenness centrality
 */
function identifyBottlenecks(edges: CausalEdge[]): string[] {
  // Edges with highest causal strength are potential bottlenecks
  const sorted = [...edges].sort((a, b) => b.causalStrength - a.causalStrength);
  
  // Top 20% are bottlenecks
  const cutoff = Math.ceil(edges.length * 0.2);
  return sorted.slice(0, cutoff).map(e => e.id);
}

// ============================================================================
// EXPORTS
// ============================================================================

export const PathFinder = {
  findAllPaths,
  findBestPath,
  scorePath,
  PathCache,
};

export default PathFinder;
