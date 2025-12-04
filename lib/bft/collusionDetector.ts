/**
 * Collusion Detector
 * 
 * Implements correlation coefficient computation, graph edit distance,
 * Jaccard similarity, and cluster detection for Byzantine resistance.
 * 
 * Based on:
 * - Pearson correlation coefficient for temporal pattern detection
 * - Graph edit distance for structural similarity
 * - Jaccard similarity for entity overlap detection
 * - Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 * 
 * @module lib/bft/collusionDetector
 * @version 1.0.0
 */

import type {
  CollusionCluster,
  CollusionEvidence,
  CausalGraph,
  ReputationPenalty,
} from '../../types/byzantine.types';
import { BYZANTINE_PARAMS } from '../../types/byzantine.types';

/**
 * Sparse correlation matrix for efficient storage
 * 
 * Stores only non-zero correlations to save memory.
 * Uses nested Maps for O(1) access.
 */
export class CorrelationMatrix {
  private matrix: Map<string, Map<string, number>>;
  
  constructor() {
    this.matrix = new Map();
  }
  
  /**
   * Set correlation between two agents
   * 
   * @param agent1 - First agent ID
   * @param agent2 - Second agent ID
   * @param correlation - Correlation coefficient (-1 to 1)
   */
  set(agent1: string, agent2: string, correlation: number): void {
    // Ensure symmetric storage
    if (!this.matrix.has(agent1)) {
      this.matrix.set(agent1, new Map());
    }
    if (!this.matrix.has(agent2)) {
      this.matrix.set(agent2, new Map());
    }
    
    this.matrix.get(agent1)!.set(agent2, correlation);
    this.matrix.get(agent2)!.set(agent1, correlation);
  }
  
  /**
   * Get correlation between two agents
   * 
   * @param agent1 - First agent ID
   * @param agent2 - Second agent ID
   * @returns Correlation coefficient or null if not computed
   */
  get(agent1: string, agent2: string): number | null {
    const row = this.matrix.get(agent1);
    if (!row) return null;
    
    const value = row.get(agent2);
    return value !== undefined ? value : null;
  }
  
  /**
   * Get all correlations for an agent
   * 
   * @param agentId - Agent ID
   * @returns Map of agent IDs to correlation coefficients
   */
  getRow(agentId: string): Map<string, number> {
    return this.matrix.get(agentId) || new Map();
  }
  
  /**
   * Get clusters of agents with correlation above threshold
   * 
   * Uses simple connected components algorithm to find clusters.
   * 
   * @param threshold - Minimum correlation for clustering
   * @returns Array of agent ID clusters
   */
  getClusters(threshold: number): string[][] {
    const visited = new Set<string>();
    const clusters: string[][] = [];
    
    // Get all agent IDs
    const allAgents = Array.from(this.matrix.keys());
    
    // DFS to find connected components
    for (const agent of allAgents) {
      if (visited.has(agent)) continue;
      
      const cluster: string[] = [];
      const stack = [agent];
      
      while (stack.length > 0) {
        const current = stack.pop()!;
        if (visited.has(current)) continue;
        
        visited.add(current);
        cluster.push(current);
        
        // Add neighbors with correlation >= threshold
        const row = this.matrix.get(current);
        if (row) {
          for (const [neighbor, correlation] of row.entries()) {
            if (!visited.has(neighbor) && correlation >= threshold) {
              stack.push(neighbor);
            }
          }
        }
      }
      
      // Only include clusters with 2+ agents
      if (cluster.length >= 2) {
        clusters.push(cluster);
      }
    }
    
    return clusters;
  }
  
  /**
   * Clear all correlations
   */
  clear(): void {
    this.matrix.clear();
  }
  
  /**
   * Get size of matrix (number of agents)
   */
  size(): number {
    return this.matrix.size;
  }
}

/**
 * Agent contribution data for correlation computation
 */
interface AgentContribution {
  timestamp: number;
  entityCount: number;
  relationshipCount: number;
  entities: Set<string>; // Entity IDs
}

/**
 * Collusion Detector for identifying coordinated attacks
 * 
 * Implements:
 * - Pearson correlation: r = Σ((x - x̄)(y - ȳ)) / √(Σ(x - x̄)² Σ(y - ȳ)²)
 * - Graph edit distance: minimum operations to transform graph1 → graph2
 * - Jaccard similarity: J(A,B) = |A ∩ B| / |A ∪ B|
 * - Cluster detection using correlation threshold
 */
export class CollusionDetector {
  private correlationMatrix: CorrelationMatrix;
  private contributionHistory: Map<string, AgentContribution[]>;
  
  constructor() {
    this.correlationMatrix = new CorrelationMatrix();
    this.contributionHistory = new Map();
  }
  
  /**
   * Record agent contribution for correlation tracking
   * 
   * @param agentId - Agent identifier
   * @param entities - Set of entity IDs contributed
   * @param relationshipCount - Number of relationships contributed
   * @param timestamp - Optional timestamp (defaults to Date.now())
   */
  recordContribution(
    agentId: string,
    entities: Set<string>,
    relationshipCount: number,
    timestamp?: number
  ): void {
    if (!this.contributionHistory.has(agentId)) {
      this.contributionHistory.set(agentId, []);
    }
    
    const history = this.contributionHistory.get(agentId)!;
    history.push({
      timestamp: timestamp ?? Date.now(),
      entityCount: entities.size,
      relationshipCount,
      entities,
    });
    
    // Keep only last 100 contributions per agent
    if (history.length > 100) {
      history.shift();
    }
  }
  
  /**
   * Compute Pearson correlation coefficient between two agents
   * 
   * Uses incremental online algorithm for efficiency.
   * Analyzes temporal patterns in contribution timing and volume.
   * 
   * Formula: r = Σ((x - x̄)(y - ȳ)) / √(Σ(x - x̄)² Σ(y - ȳ)²)
   * 
   * Where:
   * - x, y are contribution volumes at each time point
   * - x̄, ȳ are mean volumes
   * - r ranges from -1 (perfect negative correlation) to 1 (perfect positive correlation)
   * 
   * Edge cases:
   * - No data for either agent: returns 0
   * - Insufficient data (< 2 points): returns 0
   * - Zero variance: returns 0 (no correlation possible)
   * 
   * @param agent1Id - First agent identifier
   * @param agent2Id - Second agent identifier
   * @param timeWindow - Time window in milliseconds (default: 1 hour)
   * @returns Pearson correlation coefficient (-1 to 1)
   * 
   * @example
   * // Two agents submitting at similar times with similar volumes
   * detector.recordContribution('agent1', new Set(['e1', 'e2']), 5);
   * detector.recordContribution('agent2', new Set(['e3', 'e4']), 6);
   * const correlation = await detector.computeCorrelation('agent1', 'agent2', 3600000);
   * // Returns value close to 1.0 if patterns are similar
   */
  async computeCorrelation(
    agent1Id: string,
    agent2Id: string,
    timeWindow: number = 3600000 // 1 hour default
  ): Promise<number> {
    const history1 = this.contributionHistory.get(agent1Id);
    const history2 = this.contributionHistory.get(agent2Id);
    
    // Edge case: no data for either agent
    if (!history1 || !history2 || history1.length === 0 || history2.length === 0) {
      return 0;
    }
    
    // Filter contributions within time window
    const now = Date.now();
    const cutoff = now - timeWindow;
    
    const recent1 = history1.filter(c => c.timestamp >= cutoff);
    const recent2 = history2.filter(c => c.timestamp >= cutoff);
    
    // Edge case: insufficient data
    if (recent1.length < 2 || recent2.length < 2) {
      return 0;
    }
    
    // Align contributions by time buckets (1-minute buckets)
    const bucketSize = 60000; // 1 minute
    const buckets = new Map<number, { v1: number; v2: number }>();
    
    // Fill buckets for agent1
    for (const contrib of recent1) {
      const bucket = Math.floor(contrib.timestamp / bucketSize);
      if (!buckets.has(bucket)) {
        buckets.set(bucket, { v1: 0, v2: 0 });
      }
      buckets.get(bucket)!.v1 += contrib.entityCount;
    }
    
    // Fill buckets for agent2
    for (const contrib of recent2) {
      const bucket = Math.floor(contrib.timestamp / bucketSize);
      if (!buckets.has(bucket)) {
        buckets.set(bucket, { v1: 0, v2: 0 });
      }
      buckets.get(bucket)!.v2 += contrib.entityCount;
    }
    
    // Extract aligned time series
    const values1: number[] = [];
    const values2: number[] = [];
    
    for (const { v1, v2 } of buckets.values()) {
      values1.push(v1);
      values2.push(v2);
    }
    
    // Edge case: insufficient aligned data
    if (values1.length < 2) {
      return 0;
    }
    
    // Compute means
    const mean1 = values1.reduce((sum, v) => sum + v, 0) / values1.length;
    const mean2 = values2.reduce((sum, v) => sum + v, 0) / values2.length;
    
    // Compute correlation using Pearson formula
    let numerator = 0;
    let sumSq1 = 0;
    let sumSq2 = 0;
    
    for (let i = 0; i < values1.length; i++) {
      const diff1 = values1[i] - mean1;
      const diff2 = values2[i] - mean2;
      
      numerator += diff1 * diff2;
      sumSq1 += diff1 * diff1;
      sumSq2 += diff2 * diff2;
    }
    
    // Edge case: zero variance
    if (sumSq1 === 0 || sumSq2 === 0) {
      return 0;
    }
    
    const denominator = Math.sqrt(sumSq1 * sumSq2);
    const correlation = numerator / denominator;
    
    // Store in matrix for later use
    this.correlationMatrix.set(agent1Id, agent2Id, correlation);
    
    // Clamp to [-1, 1] to handle floating point errors
    return Math.max(-1, Math.min(1, correlation));
  }

  /**
   * Compute graph edit distance between two graphs
   * 
   * Uses dynamic programming algorithm optimized for sparse graphs.
   * Measures structural similarity by counting minimum operations needed
   * to transform one graph into another.
   * 
   * Operations:
   * - Add node (cost: 1)
   * - Delete node (cost: 1)
   * - Add edge (cost: 1)
   * - Delete edge (cost: 1)
   * 
   * For sparse graphs, we use a simplified algorithm that:
   * 1. Computes node set differences
   * 2. Computes edge set differences
   * 3. Returns sum of differences
   * 
   * This is an approximation but runs in O(V + E) time instead of O(V³).
   * 
   * @param graph1 - First causal graph
   * @param graph2 - Second causal graph
   * @returns Edit distance (number of operations)
   * 
   * @example
   * const graph1 = { nodes: new Map([['a', {...}], ['b', {...}]]), ... };
   * const graph2 = { nodes: new Map([['a', {...}], ['c', {...}]]), ... };
   * const distance = detector.computeGraphEditDistance(graph1, graph2);
   * // Returns 2 (delete 'b', add 'c')
   */
  async computeGraphEditDistance(graph1: CausalGraph, graph2: CausalGraph): Promise<number> {
    // Get node IDs
    const nodes1 = new Set(graph1.nodes.keys());
    const nodes2 = new Set(graph2.nodes.keys());
    
    // Compute node differences
    const onlyIn1 = new Set([...nodes1].filter(n => !nodes2.has(n)));
    const onlyIn2 = new Set([...nodes2].filter(n => !nodes1.has(n)));
    const nodeDistance = onlyIn1.size + onlyIn2.size;
    
    // Get edge sets (as strings for comparison)
    const edges1 = new Set<string>();
    for (const [source, edgeList] of graph1.edges.entries()) {
      for (const edge of edgeList) {
        edges1.add(`${source}->${edge.target}`);
      }
    }
    
    const edges2 = new Set<string>();
    for (const [source, edgeList] of graph2.edges.entries()) {
      for (const edge of edgeList) {
        edges2.add(`${source}->${edge.target}`);
      }
    }
    
    // Compute edge differences
    const onlyEdges1 = new Set([...edges1].filter(e => !edges2.has(e)));
    const onlyEdges2 = new Set([...edges2].filter(e => !edges1.has(e)));
    const edgeDistance = onlyEdges1.size + onlyEdges2.size;
    
    return nodeDistance + edgeDistance;
  }
  
  /**
   * Compute Jaccard similarity between two entity sets
   * 
   * Measures overlap between entity sets contributed by two agents.
   * High similarity indicates potential collusion (copying entities).
   * 
   * Formula: J(A,B) = |A ∩ B| / |A ∪ B|
   * 
   * Where:
   * - A, B are sets of entity IDs
   * - |A ∩ B| is size of intersection
   * - |A ∪ B| is size of union
   * - J ranges from 0 (no overlap) to 1 (identical sets)
   * 
   * Optimized for large entity sets using Set operations.
   * 
   * Edge cases:
   * - Both sets empty: returns 0
   * - One set empty: returns 0
   * - Identical sets: returns 1
   * 
   * @param entities1 - First set of entity IDs
   * @param entities2 - Second set of entity IDs
   * @returns Jaccard similarity coefficient (0 to 1)
   * 
   * @example
   * const set1 = new Set(['e1', 'e2', 'e3']);
   * const set2 = new Set(['e2', 'e3', 'e4']);
   * const similarity = await detector.computeJaccardSimilarity(set1, set2);
   * // Returns 0.5 (2 common / 4 total)
   */
  async computeJaccardSimilarity(
    entities1: Set<string>,
    entities2: Set<string>
  ): Promise<number> {
    // Edge case: empty sets
    if (entities1.size === 0 && entities2.size === 0) {
      return 0;
    }
    if (entities1.size === 0 || entities2.size === 0) {
      return 0;
    }
    
    // Compute intersection
    const intersection = new Set(
      [...entities1].filter(e => entities2.has(e))
    );
    
    // Compute union
    const union = new Set([...entities1, ...entities2]);
    
    // J(A,B) = |A ∩ B| / |A ∪ B|
    return intersection.size / union.size;
  }
  
  /**
   * Detect collusion clusters among agents
   * 
   * Uses correlation threshold (0.7) for clustering and applies
   * Jaccard similarity threshold (0.8) for entity overlap detection.
   * 
   * Algorithm:
   * 1. Compute pairwise correlations for all agents
   * 2. Find clusters with correlation >= threshold
   * 3. For each cluster, compute graph similarity and entity overlap
   * 4. Generate evidence and confidence scores
   * 
   * @param agentIds - Array of agent IDs to analyze
   * @param correlationThreshold - Minimum correlation for clustering (default: 0.7)
   * @returns Array of detected collusion clusters
   * 
   * @example
   * const clusters = await detector.detectCollusionClusters(
   *   ['agent1', 'agent2', 'agent3'],
   *   0.7
   * );
   * for (const cluster of clusters) {
   *   console.log(`Cluster: ${cluster.agentIds.join(', ')}`);
   *   console.log(`Confidence: ${cluster.confidence}`);
   * }
   */
  async detectCollusionClusters(
    agentIds: string[],
    correlationThreshold: number = BYZANTINE_PARAMS.CORRELATION_THRESHOLD
  ): Promise<CollusionCluster[]> {
    // Compute pairwise correlations
    for (let i = 0; i < agentIds.length; i++) {
      for (let j = i + 1; j < agentIds.length; j++) {
        const agent1 = agentIds[i];
        const agent2 = agentIds[j];
        
        // Skip if already computed
        if (this.correlationMatrix.get(agent1, agent2) === null) {
          await this.computeCorrelation(agent1, agent2);
        }
      }
    }
    
    // Find clusters using correlation threshold
    const clusterGroups = this.correlationMatrix.getClusters(correlationThreshold);
    
    // Build CollusionCluster objects with evidence
    const clusters: CollusionCluster[] = [];
    
    for (const agentGroup of clusterGroups) {
      // Compute average correlation within cluster
      let totalCorrelation = 0;
      let pairCount = 0;
      
      for (let i = 0; i < agentGroup.length; i++) {
        for (let j = i + 1; j < agentGroup.length; j++) {
          const correlation = this.correlationMatrix.get(
            agentGroup[i],
            agentGroup[j]
          );
          if (correlation !== null) {
            totalCorrelation += correlation;
            pairCount++;
          }
        }
      }
      
      const avgCorrelation = pairCount > 0 ? totalCorrelation / pairCount : 0;
      
      // Compute entity overlap (Jaccard similarity)
      let totalJaccard = 0;
      let jaccardCount = 0;
      
      for (let i = 0; i < agentGroup.length; i++) {
        for (let j = i + 1; j < agentGroup.length; j++) {
          const history1 = this.contributionHistory.get(agentGroup[i]);
          const history2 = this.contributionHistory.get(agentGroup[j]);
          
          if (history1 && history2 && history1.length > 0 && history2.length > 0) {
            // Combine all entities from recent contributions
            const entities1 = new Set<string>();
            const entities2 = new Set<string>();
            
            for (const contrib of history1.slice(-10)) {
              for (const entity of contrib.entities) {
                entities1.add(entity);
              }
            }
            
            for (const contrib of history2.slice(-10)) {
              for (const entity of contrib.entities) {
                entities2.add(entity);
              }
            }
            
            const jaccard = await this.computeJaccardSimilarity(entities1, entities2);
            totalJaccard += jaccard;
            jaccardCount++;
          }
        }
      }
      
      const avgJaccard = jaccardCount > 0 ? totalJaccard / jaccardCount : 0;
      
      // For graph similarity, we would need actual graph structures
      // For now, use a placeholder based on entity overlap
      const graphSimilarity = avgJaccard;
      
      // Build evidence array
      const evidence: CollusionEvidence[] = [];
      
      if (avgCorrelation >= correlationThreshold) {
        evidence.push({
          type: 'TEMPORAL_CORRELATION',
          score: avgCorrelation,
        });
      }
      
      if (graphSimilarity >= 0.5) {
        evidence.push({
          type: 'STRUCTURAL_SIMILARITY',
          score: graphSimilarity,
        });
      }
      
      if (avgJaccard >= BYZANTINE_PARAMS.JACCARD_SIMILARITY_THRESHOLD) {
        evidence.push({
          type: 'ENTITY_OVERLAP',
          score: avgJaccard,
        });
      }
      
      // Calculate confidence based on evidence strength
      const confidence = evidence.length > 0
        ? evidence.reduce((sum, e) => sum + e.score, 0) / evidence.length
        : 0;
      
      // Only include clusters with sufficient evidence
      // Require at least 2 evidence types and confidence >= 0.5
      // (lowered from 0.6 to be more sensitive to collusion patterns)
      if (evidence.length >= 2 && confidence >= 0.5) {
        clusters.push({
          agentIds: agentGroup,
          avgCorrelation,
          graphSimilarity,
          entityOverlap: avgJaccard,
          confidence,
          evidence,
        });
      }
    }
    
    return clusters;
  }
  
  /**
   * Get correlation matrix (for testing/debugging)
   * 
   * @returns Correlation matrix
   */
  getCorrelationMatrix(): CorrelationMatrix {
    return this.correlationMatrix;
  }
  
  /**
   * Get contribution history for an agent (for testing/debugging)
   * 
   * @param agentId - Agent identifier
   * @returns Array of contributions or undefined
   */
  getContributionHistory(agentId: string): AgentContribution[] | undefined {
    return this.contributionHistory.get(agentId);
  }
  
  /**
   * Apply reputation penalty to agents in a collusion cluster
   * 
   * Penalties are proportional to correlation strength:
   * - Correlation 0.7-0.8: 10% penalty
   * - Correlation 0.8-0.9: 20% penalty
   * - Correlation 0.9-1.0: 30% penalty
   * 
   * The penalty is applied as a multiplier to the agent's reputation score.
   * Multiple penalties compound multiplicatively.
   * 
   * Algorithm:
   * 1. Calculate penalty percentage based on correlation strength
   * 2. Apply penalty multiplier to reputation score
   * 3. Log penalty application with evidence
   * 4. Return updated reputation scores
   * 
   * @param cluster - Collusion cluster with agent IDs and correlation data
   * @returns Map of agent IDs to penalty information
   * 
   * @example
   * const cluster = {
   *   agentIds: ['agent1', 'agent2'],
   *   avgCorrelation: 0.85,
   *   confidence: 0.9,
   *   evidence: [...]
   * };
   * const penalties = detector.applyReputationPenalty(cluster);
   * // Returns: Map { 'agent1' => { penalty: 0.2, ... }, 'agent2' => { ... } }
   */
  applyReputationPenalty(cluster: CollusionCluster): Map<string, ReputationPenalty> {
    const penalties = new Map<string, ReputationPenalty>();
    
    // Calculate penalty percentage based on correlation strength
    const penaltyPercentage = this.calculatePenaltyPercentage(cluster.avgCorrelation);
    
    // Apply penalty to each agent in cluster
    for (const agentId of cluster.agentIds) {
      const penalty: ReputationPenalty = {
        agentId,
        penaltyPercentage,
        correlationStrength: cluster.avgCorrelation,
        confidence: cluster.confidence,
        appliedAt: new Date().toISOString(),
        reason: 'COLLUSION_DETECTED',
        evidence: {
          avgCorrelation: cluster.avgCorrelation,
          graphSimilarity: cluster.graphSimilarity,
          entityOverlap: cluster.entityOverlap,
          clusterSize: cluster.agentIds.length,
          evidenceTypes: cluster.evidence.map(e => e.type),
        },
      };
      
      penalties.set(agentId, penalty);
      
      // Log penalty application
      this.logPenaltyApplication(penalty);
    }
    
    return penalties;
  }
  
  /**
   * Calculate penalty percentage based on correlation strength
   * 
   * Uses tiered penalty structure:
   * - 0.7 <= correlation < 0.8: 10% penalty
   * - 0.8 <= correlation < 0.9: 20% penalty
   * - 0.9 <= correlation <= 1.0: 30% penalty
   * 
   * @param correlation - Correlation coefficient (0.7 to 1.0)
   * @returns Penalty percentage (0.1 to 0.3)
   */
  private calculatePenaltyPercentage(correlation: number): number {
    if (correlation >= 0.9) {
      return 0.30; // 30% penalty for very high correlation
    } else if (correlation >= 0.8) {
      return 0.20; // 20% penalty for high correlation
    } else if (correlation >= 0.7) {
      return 0.10; // 10% penalty for moderate correlation
    } else {
      return 0.0; // No penalty below threshold
    }
  }
  
  /**
   * Log penalty application for audit trail
   * 
   * Logs include:
   * - Agent ID
   * - Penalty percentage
   * - Correlation strength
   * - Confidence score
   * - Evidence details
   * - Timestamp
   * 
   * @param penalty - Reputation penalty details
   */
  private logPenaltyApplication(penalty: ReputationPenalty): void {
    console.log('[CollusionDetector] Reputation penalty applied:', {
      agentId: penalty.agentId,
      penaltyPercentage: `${(penalty.penaltyPercentage * 100).toFixed(1)}%`,
      correlationStrength: penalty.correlationStrength.toFixed(3),
      confidence: penalty.confidence.toFixed(3),
      reason: penalty.reason,
      appliedAt: penalty.appliedAt,
      evidence: penalty.evidence,
    });
  }
  
  /**
   * Get penalty history for an agent (for auditing)
   * 
   * NOTE: This is a placeholder for future implementation.
   * In production, penalties should be persisted to database
   * for audit trail and historical analysis.
   * 
   * @param _agentId - Agent identifier
   * @returns Array of penalties (empty for now)
   */
  getPenaltyHistory(_agentId: string): ReputationPenalty[] {
    // TODO: Implement penalty persistence to database
    // For now, return empty array
    return [];
  }
  
  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    this.correlationMatrix.clear();
    this.contributionHistory.clear();
  }
}
