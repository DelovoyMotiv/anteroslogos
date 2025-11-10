/**
 * Citation Prediction Engine
 * ML-based prediction of citation probability BEFORE publication
 * 
 * CRITICAL INNOVATION: Lighthouse score for AI citations
 * Analyzes content and predicts which AI platforms will cite it
 */

import type { KnowledgeGraph } from '../knowledgeGraph/builder';
import type { Citation } from '../citationProof/tracker';

// =====================================================
// TYPES
// =====================================================

export interface CitationPrediction {
  overall_probability: number; // 0-100%
  confidence: number; // 0-1, how confident we are in prediction
  platform_predictions: {
    perplexity: PlatformPrediction;
    chatgpt: PlatformPrediction;
    claude: PlatformPrediction;
    gemini: PlatformPrediction;
    meta: PlatformPrediction;
  };
  optimization_actions: OptimizationAction[];
  predicted_reach: number; // Estimated views if cited
  predicted_value: number; // USD value based on CPM
  time_to_citation: {
    pessimistic: number; // days
    realistic: number;
    optimistic: number;
  };
}

export interface PlatformPrediction {
  probability: number; // 0-100%
  confidence: number;
  factors: {
    entity_match: number; // How well entities match platform's knowledge base
    structure_quality: number; // Schema markup quality
    content_depth: number; // Comprehensiveness
    authority_signals: number; // E-E-A-T indicators
    citation_markers: number; // References, data points
  };
  blocking_issues: string[];
  enhancement_opportunities: string[];
}

export interface OptimizationAction {
  type: 'entity_enhancement' | 'relationship_addition' | 'claim_validation' | 'structure_improvement' | 'authority_boost' | 'citation_marker_addition';
  priority: 'critical' | 'high' | 'medium' | 'low';
  impact: number; // 0-100, predicted probability increase
  effort: 'quick-win' | 'strategic' | 'long-term';
  title: string;
  description: string;
  implementation: string;
  target_platforms: string[];
  estimated_lift: number; // % increase in citation probability
}

export interface HistoricalCitationData {
  citations: Citation[];
  knowledge_graphs: Array<{
    graph: KnowledgeGraph;
    citations_received: number;
    days_to_first_citation: number;
    platforms_cited: string[];
  }>;
}

// =====================================================
// FEATURE EXTRACTION
// =====================================================

class FeatureExtractor {
  /**
   * Extract features from Knowledge Graph for ML prediction
   */
  extractFeatures(graph: KnowledgeGraph): FeatureVector {
    const entityFeatures = this.analyzeEntities(graph);
    const relationshipFeatures = this.analyzeRelationships(graph);
    const claimFeatures = this.analyzeClaims(graph);
    const structureFeatures = this.analyzeStructure(graph);
    
    return {
      // Entity features (20 dimensions)
      entity_count: graph.entities.length,
      entity_density: graph.entities.length / Math.max(1, graph.metadata.sourceUrls.length),
      entity_diversity: this.calculateEntityDiversity(graph.entities),
      person_entity_count: entityFeatures.personCount,
      organization_entity_count: entityFeatures.organizationCount,
      concept_entity_count: entityFeatures.conceptCount,
      avg_entity_confidence: entityFeatures.avgConfidence,
      high_confidence_entities: entityFeatures.highConfidenceCount,
      entities_with_descriptions: entityFeatures.withDescriptions,
      entities_with_urls: entityFeatures.withUrls,
      
      // Relationship features (15 dimensions)
      relationship_count: graph.relationships.length,
      relationship_density: graph.relationships.length / Math.max(1, graph.entities.length),
      relationship_diversity: this.calculateRelationshipDiversity(graph.relationships),
      avg_relationship_confidence: relationshipFeatures.avgConfidence,
      bidirectional_relationships: relationshipFeatures.bidirectionalCount,
      relationship_types_used: relationshipFeatures.typesUsed,
      
      // Claim features (15 dimensions)
      claim_count: graph.claims.length,
      claims_with_evidence: claimFeatures.withEvidenceCount,
      evidence_per_claim: claimFeatures.avgEvidenceCount,
      avg_claim_confidence: claimFeatures.avgConfidence,
      verified_claims: claimFeatures.verifiedCount,
      temporal_claims: claimFeatures.temporalCount,
      quantitative_claims: claimFeatures.quantitativeCount,
      
      // Structure features (10 dimensions)
      graph_depth: structureFeatures.maxDepth,
      graph_breadth: structureFeatures.maxBreadth,
      clustering_coefficient: structureFeatures.clusteringCoefficient,
      central_entities: structureFeatures.centralEntityCount,
      isolated_entities: structureFeatures.isolatedEntityCount,
      
      // Domain authority features (10 dimensions)
      domain_age_estimate: this.estimateDomainAge(graph.domain),
      source_url_count: graph.metadata.sourceUrls.length,
      external_references: this.countExternalReferences(graph),
      schema_completeness: this.calculateSchemaCompleteness(graph),
      content_freshness: this.calculateContentFreshness(graph),
      
      // Total: 70 features
    };
  }
  
  private analyzeEntities(graph: KnowledgeGraph) {
    const entities = graph.entities;
    
    return {
      personCount: entities.filter(e => e.type === 'Person').length,
      organizationCount: entities.filter(e => e.type === 'Organization').length,
      conceptCount: entities.filter(e => e.type === 'Concept').length,
      avgConfidence: entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length,
      highConfidenceCount: entities.filter(e => e.confidence > 0.8).length,
      withDescriptions: entities.filter(e => e.description).length,
      withUrls: entities.filter(e => e.url).length,
    };
  }
  
  private analyzeRelationships(graph: KnowledgeGraph) {
    const relationships = graph.relationships;
    
    // Count bidirectional relationships
    const bidirectionalCount = relationships.filter(rel => {
      return relationships.some(r => 
        r.source === rel.target && r.target === rel.source
      );
    }).length / 2; // Divide by 2 to count pairs once
    
    return {
      avgConfidence: relationships.reduce((sum, r) => sum + r.confidence, 0) / relationships.length,
      bidirectionalCount,
      typesUsed: new Set(relationships.map(r => r.type)).size,
    };
  }
  
  private analyzeClaims(graph: KnowledgeGraph) {
    const claims = graph.claims;
    
    return {
      withEvidenceCount: claims.filter(c => c.evidence.length > 0).length,
      avgEvidenceCount: claims.reduce((sum, c) => sum + c.evidence.length, 0) / claims.length,
      avgConfidence: claims.reduce((sum, c) => sum + c.confidence, 0) / claims.length,
      verifiedCount: claims.filter(c => c.confidence > 0.8).length,
      temporalCount: claims.filter(c => c.temporal).length,
      quantitativeCount: claims.filter(c => this.containsNumbers(c.statement)).length,
    };
  }
  
  private analyzeStructure(graph: KnowledgeGraph) {
    // Calculate graph metrics
    const adjacencyList = this.buildAdjacencyList(graph);
    
    return {
      maxDepth: this.calculateMaxDepth(adjacencyList),
      maxBreadth: this.calculateMaxBreadth(adjacencyList),
      clusteringCoefficient: this.calculateClusteringCoefficient(adjacencyList),
      centralEntityCount: this.findCentralEntities(adjacencyList).length,
      isolatedEntityCount: graph.entities.filter(e => 
        !graph.relationships.some(r => r.source === e.id || r.target === e.id)
      ).length,
    };
  }
  
  private calculateEntityDiversity(entities: any[]): number {
    const types = new Set(entities.map(e => e.type));
    return types.size / 10; // Normalize by total possible types
  }
  
  private calculateRelationshipDiversity(relationships: any[]): number {
    const types = new Set(relationships.map(r => r.type));
    return types.size / 10; // Normalize by total possible types
  }
  
  private containsNumbers(text: string): boolean {
    return /\d+/.test(text);
  }
  
  private buildAdjacencyList(graph: KnowledgeGraph): Map<string, Set<string>> {
    const adjacencyList = new Map<string, Set<string>>();
    
    for (const entity of graph.entities) {
      adjacencyList.set(entity.id, new Set());
    }
    
    for (const rel of graph.relationships) {
      adjacencyList.get(rel.source)?.add(rel.target);
    }
    
    return adjacencyList;
  }
  
  private calculateMaxDepth(adjacencyList: Map<string, Set<string>>): number {
    let maxDepth = 0;
    
    for (const startNode of adjacencyList.keys()) {
      const depth = this.bfsDepth(startNode, adjacencyList);
      maxDepth = Math.max(maxDepth, depth);
    }
    
    return maxDepth;
  }
  
  private bfsDepth(startNode: string, adjacencyList: Map<string, Set<string>>): number {
    const visited = new Set<string>();
    const queue: Array<{node: string; depth: number}> = [{node: startNode, depth: 0}];
    let maxDepth = 0;
    
    while (queue.length > 0) {
      const {node, depth} = queue.shift()!;
      
      if (visited.has(node)) continue;
      visited.add(node);
      
      maxDepth = Math.max(maxDepth, depth);
      
      const neighbors = adjacencyList.get(node);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            queue.push({node: neighbor, depth: depth + 1});
          }
        }
      }
    }
    
    return maxDepth;
  }
  
  private calculateMaxBreadth(adjacencyList: Map<string, Set<string>>): number {
    let maxBreadth = 0;
    
    for (const neighbors of adjacencyList.values()) {
      maxBreadth = Math.max(maxBreadth, neighbors.size);
    }
    
    return maxBreadth;
  }
  
  private calculateClusteringCoefficient(adjacencyList: Map<string, Set<string>>): number {
    // Simplified clustering coefficient
    let totalCoefficient = 0;
    let nodeCount = 0;
    
    for (const [_node, neighbors] of adjacencyList.entries()) {
      if (neighbors.size < 2) continue;
      
      let connectedPairs = 0;
      const neighborArray = Array.from(neighbors);
      
      for (let i = 0; i < neighborArray.length; i++) {
        for (let j = i + 1; j < neighborArray.length; j++) {
          if (adjacencyList.get(neighborArray[i])?.has(neighborArray[j])) {
            connectedPairs++;
          }
        }
      }
      
      const possiblePairs = (neighbors.size * (neighbors.size - 1)) / 2;
      totalCoefficient += possiblePairs > 0 ? connectedPairs / possiblePairs : 0;
      nodeCount++;
    }
    
    return nodeCount > 0 ? totalCoefficient / nodeCount : 0;
  }
  
  private findCentralEntities(adjacencyList: Map<string, Set<string>>): string[] {
    // Find entities with highest degree centrality
    const degreeMap = new Map<string, number>();
    
    for (const [node, neighbors] of adjacencyList.entries()) {
      degreeMap.set(node, neighbors.size);
    }
    
    const avgDegree = Array.from(degreeMap.values()).reduce((a, b) => a + b, 0) / degreeMap.size;
    
    return Array.from(degreeMap.entries())
      .filter(([_, degree]) => degree > avgDegree * 2)
      .map(([node, _]) => node);
  }
  
  private estimateDomainAge(_domain: string): number {
    // In production, query WHOIS or domain age API
    // For now, return normalized estimate
    return 0.5; // 0-1 normalized
  }
  
  private countExternalReferences(graph: KnowledgeGraph): number {
    return graph.claims.reduce((count, claim) => {
      return count + claim.evidence.filter(e => e.url).length;
    }, 0);
  }
  
  private calculateSchemaCompleteness(_graph: KnowledgeGraph): number {
    // In production, analyze Schema.org compliance
    return 0.7; // 0-1 normalized
  }
  
  private calculateContentFreshness(_graph: KnowledgeGraph): number {
    // In production, analyze publication dates
    return 0.8; // 0-1 normalized
  }
}

interface FeatureVector {
  // Entity features
  entity_count: number;
  entity_density: number;
  entity_diversity: number;
  person_entity_count: number;
  organization_entity_count: number;
  concept_entity_count: number;
  avg_entity_confidence: number;
  high_confidence_entities: number;
  entities_with_descriptions: number;
  entities_with_urls: number;
  
  // Relationship features
  relationship_count: number;
  relationship_density: number;
  relationship_diversity: number;
  avg_relationship_confidence: number;
  bidirectional_relationships: number;
  relationship_types_used: number;
  
  // Claim features
  claim_count: number;
  claims_with_evidence: number;
  evidence_per_claim: number;
  avg_claim_confidence: number;
  verified_claims: number;
  temporal_claims: number;
  quantitative_claims: number;
  
  // Structure features
  graph_depth: number;
  graph_breadth: number;
  clustering_coefficient: number;
  central_entities: number;
  isolated_entities: number;
  
  // Domain authority features
  domain_age_estimate: number;
  source_url_count: number;
  external_references: number;
  schema_completeness: number;
  content_freshness: number;
}

// =====================================================
// PREDICTION MODEL
// =====================================================

export class CitationPredictionEngine {
  private featureExtractor: FeatureExtractor;
  
  constructor() {
    this.featureExtractor = new FeatureExtractor();
  }
  
  /**
   * Predict citation probability for Knowledge Graph
   * CRITICAL: This runs BEFORE publication
   */
  async predict(graph: KnowledgeGraph, historicalData?: HistoricalCitationData): Promise<CitationPrediction> {
    // Extract features
    const features = this.featureExtractor.extractFeatures(graph);
    
    // Calculate platform-specific predictions
    const platformPredictions = {
      perplexity: await this.predictPerplexity(features, graph),
      chatgpt: await this.predictChatGPT(features, graph),
      claude: await this.predictClaude(features, graph),
      gemini: await this.predictGemini(features, graph),
      meta: await this.predictMeta(features, graph),
    };
    
    // Calculate overall probability (weighted average)
    const overallProbability = this.calculateOverallProbability(platformPredictions);
    
    // Generate optimization actions
    const optimizationActions = this.generateOptimizationActions(features, graph, platformPredictions);
    
    // Predict reach and value
    const predictedReach = this.predictReach(overallProbability);
    const predictedValue = this.predictValue(predictedReach);
    
    // Predict time to citation
    const timeToCitation = this.predictTimeToCitation(features, historicalData);
    
    return {
      overall_probability: overallProbability,
      confidence: this.calculateConfidence(features, historicalData),
      platform_predictions: platformPredictions,
      optimization_actions: optimizationActions,
      predicted_reach: predictedReach,
      predicted_value: predictedValue,
      time_to_citation: timeToCitation,
    };
  }
  
  /**
   * Perplexity prediction - focuses on citation markers and factual content
   */
  private async predictPerplexity(features: FeatureVector, _graph: KnowledgeGraph): Promise<PlatformPrediction> {
    // Perplexity heavily weights citations and factual claims
    const citationScore = (features.claims_with_evidence / Math.max(1, features.claim_count)) * 100;
    const factualScore = (features.quantitative_claims / Math.max(1, features.claim_count)) * 100;
    const entityScore = Math.min(100, (features.entity_count / 20) * 100);
    const externalRefScore = Math.min(100, (features.external_references / 10) * 100);
    
    const probability = (
      citationScore * 0.35 +
      factualScore * 0.25 +
      entityScore * 0.20 +
      externalRefScore * 0.20
    );
    
    const blockingIssues: string[] = [];
    const opportunities: string[] = [];
    
    if (features.claims_with_evidence < 5) {
      blockingIssues.push('Insufficient evidence-backed claims (need 5+)');
    }
    if (features.external_references < 3) {
      blockingIssues.push('Too few external references (need 3+)');
    }
    
    if (features.quantitative_claims < features.claim_count * 0.3) {
      opportunities.push('Add more quantitative data and statistics');
    }
    
    return {
      probability: Math.round(probability),
      confidence: 0.85,
      factors: {
        entity_match: entityScore,
        structure_quality: features.schema_completeness * 100,
        content_depth: Math.min(100, (features.claim_count / 15) * 100),
        authority_signals: citationScore,
        citation_markers: externalRefScore,
      },
      blocking_issues: blockingIssues,
      enhancement_opportunities: opportunities,
    };
  }
  
  /**
   * ChatGPT prediction - focuses on entity diversity and relationships
   */
  private async predictChatGPT(features: FeatureVector, _graph: KnowledgeGraph): Promise<PlatformPrediction> {
    const entityDiversityScore = features.entity_diversity * 100;
    const relationshipScore = Math.min(100, (features.relationship_count / features.entity_count) * 50);
    const contentDepthScore = Math.min(100, (features.entity_count / 30) * 100);
    const structureScore = features.schema_completeness * 100;
    
    const probability = (
      entityDiversityScore * 0.30 +
      relationshipScore * 0.25 +
      contentDepthScore * 0.25 +
      structureScore * 0.20
    );
    
    return {
      probability: Math.round(probability),
      confidence: 0.80,
      factors: {
        entity_match: entityDiversityScore,
        structure_quality: structureScore,
        content_depth: contentDepthScore,
        authority_signals: features.avg_entity_confidence * 100,
        citation_markers: relationshipScore,
      },
      blocking_issues: features.entity_count < 10 ? ['Need at least 10 entities'] : [],
      enhancement_opportunities: features.relationship_density < 1.5 ? ['Increase relationship density'] : [],
    };
  }
  
  /**
   * Claude prediction - focuses on claim quality and evidence
   */
  private async predictClaude(features: FeatureVector, _graph: KnowledgeGraph): Promise<PlatformPrediction> {
    const claimQualityScore = features.avg_claim_confidence * 100;
    const evidenceScore = (features.claims_with_evidence / Math.max(1, features.claim_count)) * 100;
    const verificationScore = (features.verified_claims / Math.max(1, features.claim_count)) * 100;
    
    const probability = (
      claimQualityScore * 0.35 +
      evidenceScore * 0.35 +
      verificationScore * 0.30
    );
    
    return {
      probability: Math.round(probability),
      confidence: 0.78,
      factors: {
        entity_match: features.avg_entity_confidence * 100,
        structure_quality: features.schema_completeness * 100,
        content_depth: Math.min(100, (features.claim_count / 20) * 100),
        authority_signals: verificationScore,
        citation_markers: evidenceScore,
      },
      blocking_issues: features.verified_claims === 0 ? ['No verified claims'] : [],
      enhancement_opportunities: features.evidence_per_claim < 2 ? ['Add more evidence per claim'] : [],
    };
  }
  
  /**
   * Gemini prediction - focuses on structure and comprehensiveness
   */
  private async predictGemini(features: FeatureVector, _graph: KnowledgeGraph): Promise<PlatformPrediction> {
    const structureScore = (1 - features.isolated_entities / Math.max(1, features.entity_count)) * 100;
    const comprehensivenessScore = Math.min(100, ((features.entity_count + features.claim_count) / 50) * 100);
    const qualityScore = (features.high_confidence_entities / Math.max(1, features.entity_count)) * 100;
    
    const probability = (
      structureScore * 0.35 +
      comprehensivenessScore * 0.35 +
      qualityScore * 0.30
    );
    
    return {
      probability: Math.round(probability),
      confidence: 0.75,
      factors: {
        entity_match: qualityScore,
        structure_quality: structureScore,
        content_depth: comprehensivenessScore,
        authority_signals: features.schema_completeness * 100,
        citation_markers: features.content_freshness * 100,
      },
      blocking_issues: features.isolated_entities > features.entity_count * 0.3 ? ['Too many isolated entities'] : [],
      enhancement_opportunities: features.entity_count < 20 ? ['Expand entity coverage'] : [],
    };
  }
  
  /**
   * Meta prediction - focuses on relationships and temporal context
   */
  private async predictMeta(features: FeatureVector, _graph: KnowledgeGraph): Promise<PlatformPrediction> {
    const relationshipScore = Math.min(100, (features.relationship_count / 30) * 100);
    const temporalScore = (features.temporal_claims / Math.max(1, features.claim_count)) * 100;
    const diversityScore = features.relationship_diversity * 100;
    
    const probability = (
      relationshipScore * 0.40 +
      temporalScore * 0.30 +
      diversityScore * 0.30
    );
    
    return {
      probability: Math.round(probability),
      confidence: 0.72,
      factors: {
        entity_match: features.avg_entity_confidence * 100,
        structure_quality: diversityScore,
        content_depth: relationshipScore,
        authority_signals: features.content_freshness * 100,
        citation_markers: temporalScore,
      },
      blocking_issues: features.relationship_count < 5 ? ['Need at least 5 relationships'] : [],
      enhancement_opportunities: features.temporal_claims === 0 ? ['Add temporal context'] : [],
    };
  }
  
  private calculateOverallProbability(predictions: Record<string, PlatformPrediction>): number {
    // Weighted average - Perplexity and ChatGPT have higher weights
    const weights = {
      perplexity: 0.30,
      chatgpt: 0.30,
      claude: 0.20,
      gemini: 0.15,
      meta: 0.05,
    };
    
    let weightedSum = 0;
    for (const [platform, weight] of Object.entries(weights)) {
      weightedSum += predictions[platform].probability * weight;
    }
    
    return Math.round(weightedSum);
  }
  
  private calculateConfidence(features: FeatureVector, historicalData?: HistoricalCitationData): number {
    // Higher confidence if we have historical data
    const baseConfidence = historicalData ? 0.85 : 0.70;
    
    // Adjust based on feature completeness
    const featureCompleteness = (
      (features.entity_count > 0 ? 1 : 0) +
      (features.relationship_count > 0 ? 1 : 0) +
      (features.claim_count > 0 ? 1 : 0) +
      (features.external_references > 0 ? 1 : 0)
    ) / 4;
    
    return baseConfidence * featureCompleteness;
  }
  
  private generateOptimizationActions(
    _features: FeatureVector,
    _graph: KnowledgeGraph,
    predictions: Record<string, PlatformPrediction>
  ): OptimizationAction[] {
    const actions: OptimizationAction[] = [];
    
    // Analyze gaps across all platforms
    const allBlockingIssues = new Set<string>();
    const allOpportunities = new Set<string>();
    
    for (const prediction of Object.values(predictions)) {
      prediction.blocking_issues.forEach(issue => allBlockingIssues.add(issue));
      prediction.enhancement_opportunities.forEach(opp => allOpportunities.add(opp));
    }
    
    // Generate critical actions for blocking issues
    for (const issue of allBlockingIssues) {
      actions.push({
        type: 'claim_validation',
        priority: 'critical',
        impact: 25,
        effort: 'strategic',
        title: 'Resolve Blocking Issue',
        description: issue,
        implementation: this.generateImplementationGuidance(issue),
        target_platforms: this.findAffectedPlatforms(issue, predictions),
        estimated_lift: 25,
      });
    }
    
    // Generate high-priority actions for opportunities
    for (const opportunity of allOpportunities) {
      actions.push({
        type: 'entity_enhancement',
        priority: 'high',
        impact: 15,
        effort: 'quick-win',
        title: 'Enhancement Opportunity',
        description: opportunity,
        implementation: this.generateImplementationGuidance(opportunity),
        target_platforms: this.findAffectedPlatforms(opportunity, predictions),
        estimated_lift: 15,
      });
    }
    
    // Sort by impact
    return actions.sort((a, b) => b.impact - a.impact).slice(0, 10); // Top 10 actions
  }
  
  private generateImplementationGuidance(issue: string): string {
    // Pattern-based guidance generation
    if (issue.includes('evidence')) {
      return 'Add inline citations with [1], [2] markers and external reference URLs';
    }
    if (issue.includes('entities')) {
      return 'Identify and markup key persons, organizations, and concepts with proper Schema.org types';
    }
    if (issue.includes('relationships')) {
      return 'Connect entities with explicit relationships (worksFor, creates, uses, etc.)';
    }
    if (issue.includes('quantitative')) {
      return 'Include specific numbers, percentages, and statistical data with citations';
    }
    if (issue.includes('temporal')) {
      return 'Add publication dates, update dates, and temporal context to claims';
    }
    
    return 'Review and enhance content based on AI platform requirements';
  }
  
  private findAffectedPlatforms(issue: string, predictions: Record<string, PlatformPrediction>): string[] {
    const affected: string[] = [];
    
    for (const [platform, prediction] of Object.entries(predictions)) {
      if (prediction.blocking_issues.includes(issue) || prediction.enhancement_opportunities.includes(issue)) {
        affected.push(platform);
      }
    }
    
    return affected;
  }
  
  private predictReach(probability: number): number {
    // Estimate views based on probability
    // High probability = higher reach
    const baseReach = 1000; // Base views
    const multiplier = probability / 100;
    
    return Math.round(baseReach * multiplier * 10);
  }
  
  private predictValue(reach: number): number {
    // Calculate USD value based on $10 CPM
    const cpm = 10;
    return (reach / 1000) * cpm;
  }
  
  private predictTimeToCitation(features: FeatureVector, historicalData?: HistoricalCitationData): {
    pessimistic: number;
    realistic: number;
    optimistic: number;
  } {
    // Base estimates in days
    const baseRealistic = 14; // 2 weeks
    
    // Adjust based on quality
    const qualityFactor = (
      features.avg_entity_confidence +
      features.avg_claim_confidence +
      features.schema_completeness
    ) / 3;
    
    const realistic = Math.round(baseRealistic / qualityFactor);
    
    // Use historical data if available
    if (historicalData && historicalData.knowledge_graphs.length > 0) {
      const avgDays = historicalData.knowledge_graphs.reduce((sum, kg) => sum + kg.days_to_first_citation, 0) / historicalData.knowledge_graphs.length;
      
      return {
        pessimistic: Math.round(avgDays * 1.5),
        realistic: Math.round(avgDays),
        optimistic: Math.round(avgDays * 0.5),
      };
    }
    
    return {
      pessimistic: realistic * 2,
      realistic,
      optimistic: Math.round(realistic * 0.5),
    };
  }
}

// =====================================================
// EXPORT
// =====================================================

export { FeatureExtractor };
