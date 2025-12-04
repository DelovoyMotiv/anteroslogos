/**
 * Circular Dependency Detector
 * 
 * Detects and prevents circular dependencies in graph structure using Tarjan's
 * Strongly Connected Components (SCC) algorithm.
 * 
 * @module lib/bft/circularDependencyDetector
 * @version 1.0.0
 */

import { logger } from '../a2a/logger';
import type {
  CausalGraph,
  StronglyConnectedComponent,
  ValidationResult,
  GraphViolation,
  SCCDetectionState,
} from '../../types/byzantine.types';
import { BYZANTINE_PARAMS } from '../../types/byzantine.types';

/**
 * Circular Dependency Detector
 * 
 * Implements Tarjan's SCC algorithm for detecting circular dependencies
 * and validates graph structural invariants.
 */
export class CircularDependencyDetector {
  // Node ID for logging and error reporting (currently unused but reserved for future logging)
  // @ts-expect-error - nodeId is reserved for future logging functionality
  private nodeId: string;
  
  constructor(nodeId: string = 'default-node') {
    this.nodeId = nodeId;
  }
  
  /**
   * Detect strongly connected components using Tarjan's algorithm
   * 
   * Time Complexity: O(V + E)
   * Space Complexity: O(V)
   * 
   * Requirements: 3.1, 9.1
   */
  detectSCC(graph: CausalGraph): StronglyConnectedComponent[] {
    const state: SCCDetectionState = {
      index: 0,
      stack: [],
      indices: new Map(),
      lowlinks: new Map(),
      onStack: new Set(),
      components: [],
    };
    
    // Run Tarjan's algorithm on each unvisited node
    for (const [nodeId] of graph.nodes) {
      if (!state.indices.has(nodeId)) {
        this.tarjanStrongConnect(nodeId, graph, state);
      }
    }
    
    // Calculate percentages
    const totalNodes = graph.metadata.nodeCount;
    for (const component of state.components) {
      component.percentageOfGraph = component.size / totalNodes;
    }
    
    logger.debug('SCC detection completed', {
      componentCount: state.components.length,
      totalNodes,
      largestComponent: Math.max(...state.components.map(c => c.size), 0),
    });
    
    return state.components;
  }
  
  /**
   * Validate graph structure against invariants
   * 
   * Requirements: 3.2, 3.3, 3.4
   */
  validateGraphStructure(graph: CausalGraph): ValidationResult {
    const violations: GraphViolation[] = [];
    
    // Detect SCCs
    const sccs = this.detectSCC(graph);
    
    // Check SCC size constraint (Requirement 3.2)
    const largestSCC = sccs.reduce(
      (max, scc) => (scc.size > max.size ? scc : max),
      { size: 0, nodes: [], percentageOfGraph: 0 }
    );
    
    if (largestSCC.percentageOfGraph > BYZANTINE_PARAMS.MAX_SCC_PERCENTAGE) {
      violations.push({
        type: 'SCC_TOO_LARGE',
        severity: 'CRITICAL',
        description: `Largest SCC contains ${(largestSCC.percentageOfGraph * 100).toFixed(1)}% of nodes (max: ${BYZANTINE_PARAMS.MAX_SCC_PERCENTAGE * 100}%)`,
        affectedNodes: largestSCC.nodes,
      });
    }
    
    // Check graph density constraint (Requirement 3.3)
    if (graph.metadata.density > BYZANTINE_PARAMS.MAX_GRAPH_DENSITY) {
      violations.push({
        type: 'DENSITY_TOO_HIGH',
        severity: 'HIGH',
        description: `Graph density ${graph.metadata.density.toFixed(3)} exceeds maximum ${BYZANTINE_PARAMS.MAX_GRAPH_DENSITY}`,
        affectedNodes: [],
      });
    }
    
    // Check node degree constraint (Requirement 3.4)
    const excessiveDegreeNodes: string[] = [];
    for (const [nodeId, edges] of graph.edges) {
      if (edges.length > BYZANTINE_PARAMS.MAX_NODE_OUT_DEGREE) {
        excessiveDegreeNodes.push(nodeId);
      }
    }
    
    if (excessiveDegreeNodes.length > 0) {
      violations.push({
        type: 'NODE_DEGREE_EXCESSIVE',
        severity: 'MEDIUM',
        description: `${excessiveDegreeNodes.length} nodes exceed maximum out-degree of ${BYZANTINE_PARAMS.MAX_NODE_OUT_DEGREE}`,
        affectedNodes: excessiveDegreeNodes,
      });
    }
    
    const result: ValidationResult = {
      isValid: violations.length === 0,
      violations,
      sccAnalysis: {
        componentCount: sccs.length,
        largestComponentSize: largestSCC.size,
        largestComponentPercentage: largestSCC.percentageOfGraph,
      },
    };
    
    if (!result.isValid) {
      logger.warn('Graph validation failed', {
        violationCount: violations.length,
        violations: violations.map(v => v.type),
      });
    }
    
    return result;
  }
  
  /**
   * Check if adding an edge would create circular dependency
   * 
   * Requirements: 1.1, 1.3
   */
  wouldCreateCircularDependency(
    graph: CausalGraph,
    sourceNode: string,
    targetNode: string
  ): boolean {
    // If source or target doesn't exist, no circular dependency
    if (!graph.nodes.has(sourceNode) || !graph.nodes.has(targetNode)) {
      return false;
    }
    
    // Check if there's already a path from target to source
    // If yes, adding source->target would create a cycle
    const hasPath = this.hasPath(graph, targetNode, sourceNode);
    
    if (hasPath) {
      logger.debug('Adding edge would create circular dependency', {
        source: sourceNode,
        target: targetNode,
      });
    }
    
    return hasPath;
  }
  
  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================
  
  /**
   * Tarjan's strongly connected components algorithm (recursive)
   * 
   * This is the core of the SCC detection algorithm.
   */
  private tarjanStrongConnect(
    nodeId: string,
    graph: CausalGraph,
    state: SCCDetectionState
  ): void {
    // Set the depth index for this node
    state.indices.set(nodeId, state.index);
    state.lowlinks.set(nodeId, state.index);
    state.index++;
    
    // Push node onto stack
    state.stack.push(nodeId);
    state.onStack.add(nodeId);
    
    // Consider successors of node
    const edges = graph.edges.get(nodeId) || [];
    for (const edge of edges) {
      const successor = edge.target;
      
      if (!state.indices.has(successor)) {
        // Successor has not yet been visited; recurse on it
        this.tarjanStrongConnect(successor, graph, state);
        
        // Update lowlink
        const currentLowlink = state.lowlinks.get(nodeId)!;
        const successorLowlink = state.lowlinks.get(successor)!;
        state.lowlinks.set(nodeId, Math.min(currentLowlink, successorLowlink));
      } else if (state.onStack.has(successor)) {
        // Successor is on stack and hence in the current SCC
        const currentLowlink = state.lowlinks.get(nodeId)!;
        const successorIndex = state.indices.get(successor)!;
        state.lowlinks.set(nodeId, Math.min(currentLowlink, successorIndex));
      }
    }
    
    // If node is a root node, pop the stack and create an SCC
    if (state.lowlinks.get(nodeId) === state.indices.get(nodeId)) {
      const component: string[] = [];
      let w: string;
      
      do {
        w = state.stack.pop()!;
        state.onStack.delete(w);
        component.push(w);
      } while (w !== nodeId);
      
      // Only add components with size > 1 (actual cycles)
      // or single-node components with self-loops
      if (component.length > 1 || this.hasSelfLoop(nodeId, graph)) {
        state.components.push({
          nodes: component,
          size: component.length,
          percentageOfGraph: 0, // Will be calculated later
        });
      }
    }
  }
  
  /**
   * Check if a node has a self-loop
   */
  private hasSelfLoop(nodeId: string, graph: CausalGraph): boolean {
    const edges = graph.edges.get(nodeId) || [];
    return edges.some(edge => edge.target === nodeId);
  }
  
  /**
   * Check if there's a path from source to target using BFS
   */
  private hasPath(
    graph: CausalGraph,
    source: string,
    target: string
  ): boolean {
    if (source === target) {
      return true;
    }
    
    const visited = new Set<string>();
    const queue: string[] = [source];
    visited.add(source);
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      const edges = graph.edges.get(current) || [];
      for (const edge of edges) {
        const neighbor = edge.target;
        
        if (neighbor === target) {
          return true;
        }
        
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    
    return false;
  }
  
}
