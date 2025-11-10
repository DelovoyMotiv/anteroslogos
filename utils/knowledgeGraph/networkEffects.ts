/**
 * Cross-Client Network Effects Engine
 * CRITICAL INNOVATION: Collective intelligence across knowledge graphs
 * 
 * When multiple clients mention the same entity, create authority amplification
 * The network becomes more valuable as more clients join
 */

import type { KnowledgeGraph, Entity, Relationship } from './builder';
import type { Citation } from '../citationProof/tracker';

// =====================================================
// TYPES
// =====================================================

export interface GlobalEntity {
  global_entity_id: string;
  canonical_name: string;
  entity_type: string;
  
  // Participating knowledge graphs
  referenced_by_domains: string[];
  total_references: number;
  
  // Aggregated properties
  merged_description: string;
  confidence_score: number; // 0-1, boosted by cross-client validation
  authority_score: number; // 0-100, based on reference count and quality
  
  // Cross-client data
  variants: Array<{
    domain: string;
    local_entity_id: string;
    name_variant: string;
    description?: string;
    url?: string;
  }>;
  
  // Network metrics
  total_citations: number;
  citation_platforms: string[];
  first_seen: string;
  last_updated: string;
  
  // Relationship network
  connected_global_entities: string[];
  relationship_count: number;
}

export interface GlobalRelationship {
  source_global_entity_id: string;
  target_global_entity_id: string;
  relationship_type: string;
  
  // Evidence from multiple domains
  supporting_domains: string[];
  confidence_score: number;
  citation_count: number;
}

export interface NetworkEffect {
  effect_type: 'entity_amplification' | 'relationship_validation' | 'claim_validation' | 'authority_boost';
  affected_entities: string[]; // local entity IDs
  affected_domains: string[];
  
  // Impact metrics
  confidence_boost: number; // 0-1, added to entity confidence
  authority_boost: number; // 0-100, added to authority score
  citation_probability_lift: number; // 0-100%, predicted increase
  
  // Provenance
  evidence_count: number;
  contributing_domains: string[];
  created_at: string;
}

export interface NetworkEffectsAnalysis {
  total_global_entities: number;
  total_cross_client_entities: number; // Entities referenced by 2+ clients
  network_density: number; // 0-1, how connected the network is
  
  // Value metrics
  total_authority_generated: number; // Sum of all authority boosts
  avg_confidence_boost: number;
  total_citation_lift: number; // % increase in citation probability
  
  // Top performers
  top_global_entities: GlobalEntity[];
  most_validated_relationships: GlobalRelationship[];
  strongest_network_effects: NetworkEffect[];
  
  // Network health
  orphaned_entities: number; // Entities with no cross-client validation
  validated_entities: number; // Entities with 2+ client references
  validation_rate: number; // % of entities validated
}

// =====================================================
// NETWORK EFFECTS ENGINE
// =====================================================

export class CrossClientNetworkEffectsEngine {
  private globalEntityIndex: Map<string, GlobalEntity> = new Map();
  private globalRelationshipIndex: Map<string, GlobalRelationship> = new Map();
  private entityNameIndex: Map<string, string[]> = new Map(); // normalized name -> global IDs
  
  /**
   * Index a knowledge graph into global network
   * CRITICAL: This builds the cross-client entity graph
   */
  async indexKnowledgeGraph(graph: KnowledgeGraph, citations: Citation[]): Promise<NetworkEffect[]> {
    const networkEffects: NetworkEffect[] = [];
    
    // Index entities
    for (const entity of graph.entities) {
      const effect = await this.indexEntity(entity, graph.domain, citations);
      if (effect) {
        networkEffects.push(effect);
      }
    }
    
    // Index relationships
    for (const relationship of graph.relationships) {
      const effect = await this.indexRelationship(relationship, graph);
      if (effect) {
        networkEffects.push(effect);
      }
    }
    
    return networkEffects;
  }
  
  /**
   * Index single entity and detect cross-client matches
   */
  private async indexEntity(entity: Entity, domain: string, citations: Citation[]): Promise<NetworkEffect | null> {
    const normalizedName = this.normalizeEntityName(entity.name);
    
    // Check if this entity already exists globally
    const existingGlobalIds = this.entityNameIndex.get(normalizedName) || [];
    
    let globalEntity: GlobalEntity;
    let isNewGlobalEntity = existingGlobalIds.length === 0;
    let networkEffect: NetworkEffect | null = null;
    
    if (isNewGlobalEntity) {
      // Create new global entity
      const globalEntityId = `global_entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      globalEntity = {
        global_entity_id: globalEntityId,
        canonical_name: entity.name,
        entity_type: entity.type,
        referenced_by_domains: [domain],
        total_references: 1,
        merged_description: entity.description || '',
        confidence_score: entity.confidence,
        authority_score: this.calculateInitialAuthority(entity, citations),
        variants: [{
          domain,
          local_entity_id: entity.id,
          name_variant: entity.name,
          description: entity.description,
          url: entity.url,
        }],
        total_citations: this.countEntityCitations(entity, citations),
        citation_platforms: this.extractCitationPlatforms(entity, citations),
        first_seen: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        connected_global_entities: [],
        relationship_count: 0,
      };
      
      this.globalEntityIndex.set(globalEntityId, globalEntity);
      this.entityNameIndex.set(normalizedName, [globalEntityId]);
    } else {
      // Entity exists - create network effect!
      const globalEntityId = existingGlobalIds[0]; // Use first match
      globalEntity = this.globalEntityIndex.get(globalEntityId)!;
      
      // Check if this domain already references this entity
      if (!globalEntity.referenced_by_domains.includes(domain)) {
        // NEW CROSS-CLIENT REFERENCE - Create network effect
        
        const domainCountBefore = globalEntity.referenced_by_domains.length;
        const confidenceBoost = this.calculateConfidenceBoost(domainCountBefore);
        const authorityBoost = this.calculateAuthorityBoost(domainCountBefore);
        const citationLift = this.calculateCitationLift(domainCountBefore);
        
        networkEffect = {
          effect_type: 'entity_amplification',
          affected_entities: [entity.id],
          affected_domains: [domain, ...globalEntity.referenced_by_domains],
          confidence_boost: confidenceBoost,
          authority_boost: authorityBoost,
          citation_probability_lift: citationLift,
          evidence_count: globalEntity.total_references + 1,
          contributing_domains: [domain, ...globalEntity.referenced_by_domains],
          created_at: new Date().toISOString(),
        };
        
        // Update global entity
        globalEntity.referenced_by_domains.push(domain);
        globalEntity.total_references++;
        globalEntity.confidence_score = Math.min(1.0, globalEntity.confidence_score + confidenceBoost);
        globalEntity.authority_score = Math.min(100, globalEntity.authority_score + authorityBoost);
        globalEntity.last_updated = new Date().toISOString();
        
        // Add variant
        globalEntity.variants.push({
          domain,
          local_entity_id: entity.id,
          name_variant: entity.name,
          description: entity.description,
          url: entity.url,
        });
        
        // Merge descriptions
        if (entity.description && !globalEntity.merged_description.includes(entity.description)) {
          globalEntity.merged_description += `\n\n[${domain}]: ${entity.description}`;
        }
        
        // Update citation counts
        globalEntity.total_citations += this.countEntityCitations(entity, citations);
        const newPlatforms = this.extractCitationPlatforms(entity, citations);
        for (const platform of newPlatforms) {
          if (!globalEntity.citation_platforms.includes(platform)) {
            globalEntity.citation_platforms.push(platform);
          }
        }
      }
    }
    
    return networkEffect;
  }
  
  /**
   * Index relationship and detect cross-client validation
   */
  private async indexRelationship(relationship: Relationship, graph: KnowledgeGraph): Promise<NetworkEffect | null> {
    // Find global entities for source and target
    const sourceEntity = graph.entities.find(e => e.id === relationship.source);
    const targetEntity = graph.entities.find(e => e.id === relationship.target);
    
    if (!sourceEntity || !targetEntity) return null;
    
    const sourceGlobalId = this.findGlobalEntityId(sourceEntity.name);
    const targetGlobalId = this.findGlobalEntityId(targetEntity.name);
    
    if (!sourceGlobalId || !targetGlobalId) return null;
    
    // Create relationship key
    const relKey = `${sourceGlobalId}:${relationship.type}:${targetGlobalId}`;
    
    let globalRel = this.globalRelationshipIndex.get(relKey);
    let networkEffect: NetworkEffect | null = null;
    
    if (!globalRel) {
      // New global relationship
      globalRel = {
        source_global_entity_id: sourceGlobalId,
        target_global_entity_id: targetGlobalId,
        relationship_type: relationship.type,
        supporting_domains: [graph.domain],
        confidence_score: relationship.confidence,
        citation_count: 0,
      };
      
      this.globalRelationshipIndex.set(relKey, globalRel);
    } else {
      // Relationship validated by another domain!
      if (!globalRel.supporting_domains.includes(graph.domain)) {
        const domainCountBefore = globalRel.supporting_domains.length;
        const confidenceBoost = this.calculateConfidenceBoost(domainCountBefore) * 0.5; // Smaller boost for relationships
        
        networkEffect = {
          effect_type: 'relationship_validation',
          affected_entities: [relationship.source, relationship.target],
          affected_domains: [graph.domain, ...globalRel.supporting_domains],
          confidence_boost: confidenceBoost,
          authority_boost: 15, // Fixed boost for relationship validation
          citation_probability_lift: 10,
          evidence_count: domainCountBefore + 1,
          contributing_domains: [graph.domain, ...globalRel.supporting_domains],
          created_at: new Date().toISOString(),
        };
        
        globalRel.supporting_domains.push(graph.domain);
        globalRel.confidence_score = Math.min(1.0, globalRel.confidence_score + confidenceBoost);
      }
    }
    
    return networkEffect;
  }
  
  /**
   * Apply network effects to local knowledge graph
   * CRITICAL: This boosts entity confidence based on cross-client validation
   */
  async applyNetworkEffects(graph: KnowledgeGraph, effects: NetworkEffect[]): Promise<KnowledgeGraph> {
    const updatedGraph = JSON.parse(JSON.stringify(graph)); // Deep clone
    
    for (const effect of effects) {
      for (const entityId of effect.affected_entities) {
        const entity = updatedGraph.entities.find((e: Entity) => e.id === entityId);
        if (entity) {
          // Apply confidence boost
          entity.confidence = Math.min(1.0, entity.confidence + effect.confidence_boost);
          
          // Add network effect metadata
          entity.properties = entity.properties || {};
          entity.properties.network_validated = true;
          entity.properties.cross_client_references = effect.contributing_domains.length;
          entity.properties.authority_boost = effect.authority_boost;
        }
      }
    }
    
    return updatedGraph;
  }
  
  /**
   * Generate network effects analysis
   */
  async analyzeNetworkEffects(): Promise<NetworkEffectsAnalysis> {
    const globalEntities = Array.from(this.globalEntityIndex.values());
    const globalRelationships = Array.from(this.globalRelationshipIndex.values());
    
    // Calculate cross-client entities
    const crossClientEntities = globalEntities.filter(e => e.referenced_by_domains.length > 1);
    
    // Calculate network density
    const totalPossibleConnections = (globalEntities.length * (globalEntities.length - 1)) / 2;
    const actualConnections = globalRelationships.length;
    const networkDensity = totalPossibleConnections > 0 ? actualConnections / totalPossibleConnections : 0;
    
    // Calculate value metrics
    const totalAuthority = globalEntities.reduce((sum, e) => sum + e.authority_score, 0);
    const avgConfidenceBoost = crossClientEntities.reduce((sum, e) => 
      sum + (e.confidence_score - 0.7), 0
    ) / Math.max(1, crossClientEntities.length);
    
    // Sort top performers
    const topGlobalEntities = globalEntities
      .sort((a, b) => b.authority_score - a.authority_score)
      .slice(0, 20);
    
    const mostValidatedRelationships = globalRelationships
      .sort((a, b) => b.supporting_domains.length - a.supporting_domains.length)
      .slice(0, 10);
    
    return {
      total_global_entities: globalEntities.length,
      total_cross_client_entities: crossClientEntities.length,
      network_density: networkDensity,
      total_authority_generated: totalAuthority,
      avg_confidence_boost: avgConfidenceBoost,
      total_citation_lift: crossClientEntities.length * 15, // Estimated lift
      top_global_entities: topGlobalEntities,
      most_validated_relationships: mostValidatedRelationships,
      strongest_network_effects: [], // Would calculate from historical data
      orphaned_entities: globalEntities.length - crossClientEntities.length,
      validated_entities: crossClientEntities.length,
      validation_rate: (crossClientEntities.length / globalEntities.length) * 100,
    };
  }
  
  /**
   * Get global entity by local entity
   */
  getGlobalEntity(localEntityName: string): GlobalEntity | undefined {
    const normalizedName = this.normalizeEntityName(localEntityName);
    const globalIds = this.entityNameIndex.get(normalizedName);
    
    if (!globalIds || globalIds.length === 0) return undefined;
    
    return this.globalEntityIndex.get(globalIds[0]);
  }
  
  /**
   * Get all domains referencing an entity
   */
  getReferencingDomains(localEntityName: string): string[] {
    const globalEntity = this.getGlobalEntity(localEntityName);
    return globalEntity?.referenced_by_domains || [];
  }
  
  // =====================================================
  // UTILITIES
  // =====================================================
  
  private normalizeEntityName(name: string): string {
    // Normalize for matching: lowercase, remove special chars, trim
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  private findGlobalEntityId(localEntityName: string): string | null {
    const normalizedName = this.normalizeEntityName(localEntityName);
    const globalIds = this.entityNameIndex.get(normalizedName);
    return globalIds && globalIds.length > 0 ? globalIds[0] : null;
  }
  
  private calculateInitialAuthority(entity: Entity, citations: Citation[]): number {
    // Base authority on confidence and citation count
    const citationCount = this.countEntityCitations(entity, citations);
    const baseScore = entity.confidence * 50; // 0-50
    const citationScore = Math.min(50, citationCount * 5); // 0-50
    
    return baseScore + citationScore;
  }
  
  private countEntityCitations(entity: Entity, citations: Citation[]): number {
    return citations.filter(c => 
      c.response.toLowerCase().includes(entity.name.toLowerCase())
    ).length;
  }
  
  private extractCitationPlatforms(entity: Entity, citations: Citation[]): string[] {
    const platforms = new Set<string>();
    
    for (const citation of citations) {
      if (citation.response.toLowerCase().includes(entity.name.toLowerCase())) {
        platforms.add(citation.source);
      }
    }
    
    return Array.from(platforms);
  }
  
  private calculateConfidenceBoost(existingDomainCount: number): number {
    // Diminishing returns: first cross-client reference gives biggest boost
    if (existingDomainCount === 1) return 0.20; // +0.20 for second domain
    if (existingDomainCount === 2) return 0.10; // +0.10 for third domain
    if (existingDomainCount === 3) return 0.05; // +0.05 for fourth domain
    return 0.02; // +0.02 for additional domains
  }
  
  private calculateAuthorityBoost(existingDomainCount: number): number {
    // Authority boost follows similar pattern
    if (existingDomainCount === 1) return 30; // +30 authority
    if (existingDomainCount === 2) return 20; // +20 authority
    if (existingDomainCount === 3) return 10; // +10 authority
    return 5; // +5 authority
  }
  
  private calculateCitationLift(existingDomainCount: number): number {
    // Citation probability lift from network effects
    if (existingDomainCount === 1) return 25; // +25% citation probability
    if (existingDomainCount === 2) return 15; // +15%
    if (existingDomainCount === 3) return 10; // +10%
    return 5; // +5%
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const networkEffectsEngine = new CrossClientNetworkEffectsEngine();
