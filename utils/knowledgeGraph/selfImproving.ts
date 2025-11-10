/**
 * Self-Improving Knowledge Graph System
 * CRITICAL INNOVATION: Bidirectional learning loop
 * 
 * Citations → Learning Engine → Knowledge Graph updates
 * Creates self-optimizing system that gets better with each citation
 */

import type { KnowledgeGraph, Entity } from './builder';
import type { Citation } from '../citationProof/tracker';

// =====================================================
// TYPES
// =====================================================

export interface KnowledgeGraphUpdate {
  update_type: 'entity_enhancement' | 'relationship_addition' | 'claim_validation' | 'confidence_adjustment' | 'new_entity' | 'structure_optimization';
  priority: 'critical' | 'high' | 'medium' | 'low';
  confidence: number; // 0-1, how confident we are this update is correct
  source: 'citation_learning' | 'user_feedback' | 'platform_behavior' | 'cross_client_validation';
  
  // Specific update details
  entity_update?: {
    entity_id: string;
    field: string;
    old_value: any;
    new_value: any;
    reason: string;
  };
  
  relationship_update?: {
    source_entity_id: string;
    target_entity_id: string;
    relationship_type: string;
    confidence: number;
    reason: string;
  };
  
  claim_update?: {
    claim_id: string;
    field: string;
    old_value: any;
    new_value: any;
    reason: string;
  };
  
  // Impact metrics
  expected_citation_lift: number; // 0-100%, predicted increase
  affected_platforms: string[];
  
  // Learning provenance
  learned_from_citations: string[]; // Citation IDs
  learning_confidence: number;
  sample_size: number; // How many citations informed this update
}

export interface LearningAnalysis {
  graph_domain: string;
  total_citations_analyzed: number;
  learning_insights: any[];
  
  // What we learned
  high_value_entities: Array<{
    entity_id: string;
    entity_name: string;
    citation_count: number;
    citation_rate: number; // citations per day
    platforms: string[];
    confidence_boost: number;
  }>;
  
  high_value_relationships: Array<{
    source_entity: string;
    target_entity: string;
    relationship_type: string;
    citation_count: number;
    platforms: string[];
  }>;
  
  validated_claims: Array<{
    claim_id: string;
    statement: string;
    validation_count: number;
    platforms: string[];
    new_confidence: number;
  }>;
  
  // What we should change
  suggested_updates: KnowledgeGraphUpdate[];
  
  // Performance prediction
  current_citation_score: number; // 0-100
  predicted_citation_score_after_updates: number; // 0-100
  expected_improvement: number; // %
}

// =====================================================
// SELF-IMPROVING ENGINE
// =====================================================

export class SelfImprovingKnowledgeGraph {
  /**
   * Analyze citations and generate KG updates
   * CRITICAL: This closes the learning loop
   */
  async analyzeCitationsAndGenerateUpdates(
    graph: KnowledgeGraph,
    citations: Citation[],
    learningMetrics?: any
  ): Promise<LearningAnalysis> {
    // Filter citations for this domain
    const domainCitations = citations.filter(c => c.url?.includes(graph.domain) || false);
    
    if (domainCitations.length === 0) {
      return this.generateEmptyAnalysis(graph);
    }
    
    // Analyze which entities get cited most
    const highValueEntities = this.identifyHighValueEntities(graph, domainCitations);
    
    // Analyze which relationships get cited most
    const highValueRelationships = this.identifyHighValueRelationships(graph, domainCitations);
    
    // Analyze which claims get validated by citations
    const validatedClaims = this.identifyValidatedClaims(graph, domainCitations);
    
    // Generate update suggestions
    const suggestedUpdates = this.generateUpdateSuggestions(
      graph,
      highValueEntities,
      highValueRelationships,
      validatedClaims,
      domainCitations,
      learningMetrics
    );
    
    // Calculate performance metrics
    const currentScore = this.calculateCurrentCitationScore(graph, domainCitations);
    const predictedScore = this.predictScoreAfterUpdates(currentScore, suggestedUpdates);
    
    return {
      graph_domain: graph.domain,
      total_citations_analyzed: domainCitations.length,
      learning_insights: learningMetrics?.learning_insights || [],
      high_value_entities: highValueEntities,
      high_value_relationships: highValueRelationships,
      validated_claims: validatedClaims,
      suggested_updates: suggestedUpdates,
      current_citation_score: currentScore,
      predicted_citation_score_after_updates: predictedScore,
      expected_improvement: ((predictedScore - currentScore) / currentScore) * 100,
    };
  }
  
  /**
   * Apply updates to Knowledge Graph
   * PRODUCTION: Actually modifies the graph
   */
  async applyUpdates(
    graph: KnowledgeGraph,
    updates: KnowledgeGraphUpdate[]
  ): Promise<KnowledgeGraph> {
    const updatedGraph = JSON.parse(JSON.stringify(graph)); // Deep clone
    
    for (const update of updates) {
      switch (update.update_type) {
        case 'entity_enhancement':
          if (update.entity_update) {
            this.applyEntityUpdate(updatedGraph, update.entity_update);
          }
          break;
          
        case 'relationship_addition':
          if (update.relationship_update) {
            this.applyRelationshipUpdate(updatedGraph, update.relationship_update);
          }
          break;
          
        case 'claim_validation':
          if (update.claim_update) {
            this.applyClaimUpdate(updatedGraph, update.claim_update);
          }
          break;
          
        case 'confidence_adjustment':
          // Apply confidence updates based on citation performance
          this.applyConfidenceAdjustments(updatedGraph, update);
          break;
          
        case 'new_entity':
          // Add new entities discovered through citation analysis
          if (update.entity_update) {
            this.addNewEntity(updatedGraph, update.entity_update);
          }
          break;
          
        case 'structure_optimization':
          // Restructure graph based on citation patterns
          this.optimizeGraphStructure(updatedGraph, update);
          break;
      }
    }
    
    // Update metadata
    updatedGraph.metadata = updatedGraph.metadata || {};
    updatedGraph.metadata.last_learning_update = new Date().toISOString();
    updatedGraph.metadata.total_learning_updates = (updatedGraph.metadata.total_learning_updates || 0) + updates.length;
    updatedGraph.metadata.learning_version = (updatedGraph.metadata.learning_version || 0) + 1;
    
    return updatedGraph;
  }
  
  // =====================================================
  // ANALYSIS METHODS
  // =====================================================
  
  private identifyHighValueEntities(
    graph: KnowledgeGraph,
    citations: Citation[]
  ): Array<{
    entity_id: string;
    entity_name: string;
    citation_count: number;
    citation_rate: number;
    platforms: string[];
    confidence_boost: number;
  }> {
    const entityCitations = new Map<string, {
      count: number;
      platforms: Set<string>;
      first_cited: Date;
      last_cited: Date;
    }>();
    
    // Count citations per entity
    for (const citation of citations) {
      for (const entity of graph.entities) {
        // Check if citation text mentions this entity
        if (citation.response.toLowerCase().includes(entity.name.toLowerCase())) {
          const existing = entityCitations.get(entity.id) || {
            count: 0,
            platforms: new Set(),
            first_cited: new Date(citation.timestamp),
            last_cited: new Date(citation.timestamp),
          };
          
          existing.count++;
          existing.platforms.add(citation.source);
          existing.last_cited = new Date(Math.max(
            existing.last_cited.getTime(),
            new Date(citation.timestamp).getTime()
          ));
          
          entityCitations.set(entity.id, existing);
        }
      }
    }
    
    // Convert to array and calculate rates
    const results = [];
    for (const [entityId, data] of entityCitations.entries()) {
      const entity = graph.entities.find(e => e.id === entityId);
      if (!entity) continue;
      
      const daysSinceFirst = (data.last_cited.getTime() - data.first_cited.getTime()) / (1000 * 60 * 60 * 24);
      const citationRate = data.count / Math.max(1, daysSinceFirst);
      
      // Calculate confidence boost based on citation frequency
      const confidenceBoost = Math.min(0.20, data.count * 0.02); // Max +0.20
      
      results.push({
        entity_id: entityId,
        entity_name: entity.name,
        citation_count: data.count,
        citation_rate: citationRate,
        platforms: Array.from(data.platforms),
        confidence_boost: confidenceBoost,
      });
    }
    
    // Sort by citation count
    return results.sort((a, b) => b.citation_count - a.citation_count);
  }
  
  private identifyHighValueRelationships(
    graph: KnowledgeGraph,
    citations: Citation[]
  ): Array<{
    source_entity: string;
    target_entity: string;
    relationship_type: string;
    citation_count: number;
    platforms: string[];
  }> {
    const relationshipCitations = new Map<string, {
      count: number;
      platforms: Set<string>;
    }>();
    
    // Check each citation for relationship mentions
    for (const citation of citations) {
      for (const rel of graph.relationships) {
        const sourceEntity = graph.entities.find(e => e.id === rel.source);
        const targetEntity = graph.entities.find(e => e.id === rel.target);
        
        if (!sourceEntity || !targetEntity) continue;
        
        // Simple heuristic: both entities mentioned in same citation
        const citedText = citation.response.toLowerCase();
        const sourceFound = citedText.includes(sourceEntity.name.toLowerCase());
        const targetFound = citedText.includes(targetEntity.name.toLowerCase());
        
        if (sourceFound && targetFound) {
          const relKey = `${rel.source}:${rel.type}:${rel.target}`;
          const existing = relationshipCitations.get(relKey) || {
            count: 0,
            platforms: new Set(),
          };
          
          existing.count++;
          existing.platforms.add(citation.source);
          relationshipCitations.set(relKey, existing);
        }
      }
    }
    
    // Convert to array
    const results = [];
    for (const [relKey, data] of relationshipCitations.entries()) {
      const [sourceId, relType, targetId] = relKey.split(':');
      const sourceEntity = graph.entities.find(e => e.id === sourceId);
      const targetEntity = graph.entities.find(e => e.id === targetId);
      
      if (sourceEntity && targetEntity) {
        results.push({
          source_entity: sourceEntity.name,
          target_entity: targetEntity.name,
          relationship_type: relType,
          citation_count: data.count,
          platforms: Array.from(data.platforms),
        });
      }
    }
    
    return results.sort((a, b) => b.citation_count - a.citation_count);
  }
  
  private identifyValidatedClaims(
    graph: KnowledgeGraph,
    citations: Citation[]
  ): Array<{
    claim_id: string;
    statement: string;
    validation_count: number;
    platforms: string[];
    new_confidence: number;
  }> {
    const claimValidations = new Map<string, {
      count: number;
      platforms: Set<string>;
    }>();
    
    // Check citations for claim validation
    for (const citation of citations) {
      for (const claim of graph.claims) {
        // Extract key terms from claim
        const claimTerms = this.extractKeyTerms(claim.statement);
        const citedText = citation.response.toLowerCase();
        
        // Count how many claim terms appear in citation
        const matchCount = claimTerms.filter(term => 
          citedText.includes(term.toLowerCase())
        ).length;
        
        // If >50% of terms match, consider it a validation
        if (matchCount > claimTerms.length * 0.5) {
          const existing = claimValidations.get(claim.id) || {
            count: 0,
            platforms: new Set(),
          };
          
          existing.count++;
          existing.platforms.add(citation.source);
          claimValidations.set(claim.id, existing);
        }
      }
    }
    
    // Convert to array
    const results = [];
    for (const [claimId, data] of claimValidations.entries()) {
      const claim = graph.claims.find(c => c.id === claimId);
      if (!claim) continue;
      
      // Boost confidence based on validation count
      const confidenceBoost = Math.min(0.25, data.count * 0.05); // Max +0.25
      const newConfidence = Math.min(1.0, claim.confidence + confidenceBoost);
      
      results.push({
        claim_id: claimId,
        statement: claim.statement,
        validation_count: data.count,
        platforms: Array.from(data.platforms),
        new_confidence: newConfidence,
      });
    }
    
    return results.sort((a, b) => b.validation_count - a.validation_count);
  }
  
  private extractKeyTerms(text: string): string[] {
    // Simple term extraction - in production, use NLP
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['that', 'this', 'with', 'from', 'have', 'been'].includes(word));
  }
  
  // =====================================================
  // UPDATE GENERATION
  // =====================================================
  
  private generateUpdateSuggestions(
    graph: KnowledgeGraph,
    highValueEntities: any[],
    highValueRelationships: any[],
    validatedClaims: any[],
    citations: Citation[],
    _learningMetrics?: any
  ): KnowledgeGraphUpdate[] {
    const updates: KnowledgeGraphUpdate[] = [];
    
    // 1. Boost confidence of high-value entities
    for (const hve of highValueEntities.slice(0, 10)) { // Top 10
      if (hve.confidence_boost > 0.05) { // Only if significant boost
        const entity = graph.entities.find(e => e.id === hve.entity_id);
        if (!entity) continue;
        
        updates.push({
          update_type: 'confidence_adjustment',
          priority: 'high',
          confidence: 0.90,
          source: 'citation_learning',
          entity_update: {
            entity_id: hve.entity_id,
            field: 'confidence',
            old_value: entity.confidence,
            new_value: Math.min(1.0, entity.confidence + hve.confidence_boost),
            reason: `Cited ${hve.citation_count} times across ${hve.platforms.length} platforms`,
          },
          expected_citation_lift: hve.confidence_boost * 100,
          affected_platforms: hve.platforms,
          learned_from_citations: this.findRelevantCitations(hve.entity_name, citations),
          learning_confidence: 0.90,
          sample_size: hve.citation_count,
        });
      }
    }
    
    // 2. Boost confidence of validated claims
    for (const vc of validatedClaims.slice(0, 10)) { // Top 10
      const claim = graph.claims.find(c => c.id === vc.claim_id);
      if (!claim) continue;
      
      if (vc.new_confidence > claim.confidence + 0.05) {
        updates.push({
          update_type: 'claim_validation',
          priority: 'high',
          confidence: 0.85,
          source: 'platform_behavior',
          claim_update: {
            claim_id: vc.claim_id,
            field: 'confidence',
            old_value: claim.confidence,
            new_value: vc.new_confidence,
            reason: `Validated by ${vc.validation_count} citations across ${vc.platforms.length} platforms`,
          },
          expected_citation_lift: (vc.new_confidence - claim.confidence) * 50,
          affected_platforms: vc.platforms,
          learned_from_citations: this.findRelevantCitations(vc.statement, citations),
          learning_confidence: 0.85,
          sample_size: vc.validation_count,
        });
      }
    }
    
    // 3. Strengthen high-value relationships
    for (const hvr of highValueRelationships.slice(0, 5)) { // Top 5
      const relationship = graph.relationships.find(r => {
        const source = graph.entities.find(e => e.id === r.source);
        const target = graph.entities.find(e => e.id === r.target);
        return source?.name === hvr.source_entity && 
               target?.name === hvr.target_entity && 
               r.type === hvr.relationship_type;
      });
      
      if (relationship && relationship.confidence < 0.95) {
        const newConfidence = Math.min(1.0, relationship.confidence + 0.15);
        
        updates.push({
          update_type: 'confidence_adjustment',
          priority: 'medium',
          confidence: 0.80,
          source: 'citation_learning',
          relationship_update: {
            source_entity_id: relationship.source,
            target_entity_id: relationship.target,
            relationship_type: relationship.type,
            confidence: newConfidence,
            reason: `Co-cited ${hvr.citation_count} times across ${hvr.platforms.length} platforms`,
          },
          expected_citation_lift: 10,
          affected_platforms: hvr.platforms,
          learned_from_citations: [],
          learning_confidence: 0.80,
          sample_size: hvr.citation_count,
        });
      }
    }
    
    // Sort by priority and expected lift
    return updates.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.expected_citation_lift - a.expected_citation_lift;
    });
  }
  
  private findRelevantCitations(searchTerm: string, citations: Citation[]): string[] {
    return citations
      .filter(c => c.response.toLowerCase().includes(searchTerm.toLowerCase()))
      .map(c => c.id)
      .slice(0, 10); // Max 10 citation IDs
  }
  
  // =====================================================
  // UPDATE APPLICATION
  // =====================================================
  
  private applyEntityUpdate(graph: KnowledgeGraph, update: any): void {
    const entity = graph.entities.find(e => e.id === update.entity_id);
    if (!entity) return;
    
    (entity as any)[update.field] = update.new_value;
  }
  
  private applyRelationshipUpdate(graph: KnowledgeGraph, update: any): void {
    // Check if relationship already exists
    const existingRel = graph.relationships.find(r =>
      r.source === update.source_entity_id &&
      r.target === update.target_entity_id &&
      r.type === update.relationship_type
    );
    
    if (existingRel) {
      existingRel.confidence = update.confidence;
    } else {
      // Add new relationship
      graph.relationships.push({
        id: `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        source: update.source_entity_id,
        target: update.target_entity_id,
        type: update.relationship_type,
        confidence: update.confidence,
        extractedAt: new Date().toISOString(),
      });
    }
  }
  
  private applyClaimUpdate(graph: KnowledgeGraph, update: any): void {
    const claim = graph.claims.find(c => c.id === update.claim_id);
    if (!claim) return;
    
    (claim as any)[update.field] = update.new_value;
  }
  
  private applyConfidenceAdjustments(graph: KnowledgeGraph, update: KnowledgeGraphUpdate): void {
    if (update.entity_update) {
      this.applyEntityUpdate(graph, update.entity_update);
    }
    if (update.relationship_update) {
      // Update confidence for existing relationship
      const rel = graph.relationships.find(r =>
        r.source === update.relationship_update!.source_entity_id &&
        r.target === update.relationship_update!.target_entity_id &&
        r.type === update.relationship_update!.relationship_type
      );
      if (rel) {
        rel.confidence = update.relationship_update.confidence;
      }
    }
  }
  
  private addNewEntity(graph: KnowledgeGraph, update: any): void {
    // In production, this would create a full entity object
    graph.entities.push({
      id: `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'Concept', // Default type
      name: update.new_value,
      confidence: 0.70, // Start with lower confidence
      sourceUrl: graph.metadata.sourceUrls[0] || '',
      extractedAt: new Date().toISOString(),
      properties: {
        learned_from_citations: true,
        created_at: new Date().toISOString(),
      },
    } as Entity);
  }
  
  private optimizeGraphStructure(_graph: KnowledgeGraph, _update: KnowledgeGraphUpdate): void {
    // Future: Implement graph structure optimization
    // - Remove low-confidence isolated entities
    // - Merge duplicate entities
    // - Add missing relationships based on co-citation patterns
  }
  
  // =====================================================
  // SCORING
  // =====================================================
  
  private calculateCurrentCitationScore(graph: KnowledgeGraph, citations: Citation[]): number {
    // Simple scoring: normalize by graph size and citation count
    const entityScore = Math.min(50, graph.entities.length * 2);
    const relationshipScore = Math.min(30, graph.relationships.length * 1.5);
    const citationScore = Math.min(20, citations.length * 2);
    
    return entityScore + relationshipScore + citationScore;
  }
  
  private predictScoreAfterUpdates(currentScore: number, updates: KnowledgeGraphUpdate[]): number {
    // Predict improvement based on update quality
    const totalLift = updates.reduce((sum, update) => sum + update.expected_citation_lift, 0);
    const improvementFactor = 1 + (totalLift / 1000); // Normalize
    
    return Math.min(100, currentScore * improvementFactor);
  }
  
  private generateEmptyAnalysis(graph: KnowledgeGraph): LearningAnalysis {
    return {
      graph_domain: graph.domain,
      total_citations_analyzed: 0,
      learning_insights: [],
      high_value_entities: [],
      high_value_relationships: [],
      validated_claims: [],
      suggested_updates: [],
      current_citation_score: 0,
      predicted_citation_score_after_updates: 0,
      expected_improvement: 0,
    };
  }
}
