/**
 * Knowledge Graph Builder
 * Production-grade entity extraction and knowledge graph construction
 * Converts website content into structured, AI-ready knowledge graphs
 */

import { z } from 'zod';

// ==================== SCHEMAS ====================

export const EntityTypeSchema = z.enum([
  'Person',
  'Organization',
  'Product',
  'Service',
  'Concept',
  'Technology',
  'Location',
  'Event',
  'Claim',
  'Metric',
]);

export type EntityType = z.infer<typeof EntityTypeSchema>;

export const EntitySchema = z.object({
  id: z.string(), // UUID
  type: EntityTypeSchema,
  name: z.string(),
  description: z.string().optional(),
  url: z.string().url().optional(),
  properties: z.record(z.string(), z.any()).optional(),
  confidence: z.number().min(0).max(1), // 0-1 extraction confidence
  sourceUrl: z.string().url(),
  sourceContext: z.string().optional(), // Surrounding text
  extractedAt: z.string().datetime(),
});

export type Entity = z.infer<typeof EntitySchema>;

export const RelationshipTypeSchema = z.enum([
  'worksFor',
  'owns',
  'creates',
  'specializes',
  'relatedTo',
  'proves',
  'contradicts',
  'cites',
  'supports',
  'measures',
]);

export type RelationshipType = z.infer<typeof RelationshipTypeSchema>;

export const RelationshipSchema = z.object({
  id: z.string(),
  type: RelationshipTypeSchema,
  source: z.string(), // Entity ID
  target: z.string(), // Entity ID
  confidence: z.number().min(0).max(1),
  context: z.string().optional(),
  extractedAt: z.string().datetime(),
});

export type Relationship = z.infer<typeof RelationshipSchema>;

export const ClaimSchema = z.object({
  id: z.string(),
  statement: z.string(),
  entities: z.array(z.string()), // Entity IDs mentioned in claim
  evidence: z.array(z.object({
    type: z.enum(['citation', 'data', 'expert_opinion', 'case_study']),
    source: z.string(),
    url: z.string().url().optional(),
  })),
  confidence: z.number().min(0).max(1),
  temporal: z.object({
    validFrom: z.string().datetime().optional(),
    validUntil: z.string().datetime().optional(),
  }).optional(),
});

export type Claim = z.infer<typeof ClaimSchema>;

export const KnowledgeGraphSchema = z.object({
  id: z.string(),
  domain: z.string(), // Domain being analyzed
  entities: z.array(EntitySchema),
  relationships: z.array(RelationshipSchema),
  claims: z.array(ClaimSchema),
  metadata: z.object({
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    version: z.string(),
    sourceUrls: z.array(z.string().url()),
    entityCount: z.number(),
    relationshipCount: z.number(),
    claimCount: z.number(),
  }),
});

export type KnowledgeGraph = z.infer<typeof KnowledgeGraphSchema>;

// ==================== EXTRACTION PATTERNS ====================

/**
 * Regex patterns for entity extraction
 * Production-ready patterns based on NLP research
 */
const PATTERNS = {
  // Person names (capitalized words, 2-4 words)
  person: /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g,
  
  // Organizations (includes Inc, LLC, Corp, Ltd)
  organization: /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Inc|LLC|Corp|Corporation|Ltd|Limited|Group|AG|GmbH))?)\b/g,
  
  // Products (capitalized, often with numbers/version)
  product: /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+\d+(?:\.\d+)?)?)\b/g,
  
  // Metrics (number + unit + metric name)
  metric: /\b(\d+(?:,\d{3})*(?:\.\d+)?)\s*(%|percent|million|billion|dollars|users|customers|increase|decrease|growth)\b/gi,
  
  // Years (4-digit years)
  year: /\b(19\d{2}|20\d{2})\b/g,
  
  // URLs
  url: /https?:\/\/[^\s<>"{}|\\^`[\]]+/g,
  
  // Emails
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
};

/**
 * Stop words and false positive filters
 */
const STOP_WORDS = new Set([
  'The', 'This', 'That', 'These', 'Those', 'When', 'Where', 'What', 'Why', 'How',
  'First', 'Second', 'Third', 'Last', 'Next', 'Previous', 'Some', 'Many', 'Most',
  'All', 'Both', 'Each', 'Every', 'Other', 'Another', 'Such', 'More', 'Less',
]);

/**
 * Common organization keywords for URL extraction
 */
const ORG_DOMAIN_KEYWORDS = new Map([
  ['google', 'google.com'],
  ['facebook', 'facebook.com'],
  ['meta', 'meta.com'],
  ['microsoft', 'microsoft.com'],
  ['apple', 'apple.com'],
  ['amazon', 'amazon.com'],
  ['netflix', 'netflix.com'],
  ['tesla', 'tesla.com'],
  ['twitter', 'twitter.com'],
  ['linkedin', 'linkedin.com'],
]);

/**
 * Claim patterns (factual statements)
 */
const CLAIM_INDICATORS = [
  /according to/i,
  /research shows/i,
  /studies indicate/i,
  /proven to/i,
  /demonstrated that/i,
  /evidence suggests/i,
  /\d+%?\s+(?:increase|decrease|growth|improvement)/i,
];

/**
 * Evidence indicators
 */
const EVIDENCE_PATTERNS = {
  citation: /\[(\d+)\]|\(([^)]+,\s*\d{4})\)/g,
  data: /\d+(?:,\d{3})*(?:\.\d+)?/g,
  expertOpinion: /(?:Dr\.|Professor|CEO|Expert)\s+[A-Z][a-z]+/g,
};

// ==================== BUILDER CLASS ====================

export class KnowledgeGraphBuilder {
  private entities: Map<string, Entity> = new Map();
  private relationships: Map<string, Relationship> = new Map();
  private claims: Map<string, Claim> = new Map();
  private domain: string;

  constructor(domain: string) {
    this.domain = domain;
  }

  /**
   * Build knowledge graph from HTML content
   */
  async buildFromHTML(html: string, sourceUrl: string): Promise<KnowledgeGraph> {
    const text = this.extractTextFromHTML(html);
    const timestamp = new Date().toISOString();

    // Extract entities
    await this.extractEntities(text, sourceUrl, timestamp);

    // Extract relationships
    await this.extractRelationships(text, timestamp);

    // Extract claims
    await this.extractClaims(text, sourceUrl, timestamp);

    return this.toKnowledgeGraph();
  }

  /**
   * Extract plain text from HTML
   */
  private extractTextFromHTML(html: string): string {
    // Remove script and style tags
    let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, ' ');
    
    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    
    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  }

  /**
   * Extract entities from text
   */
  private async extractEntities(text: string, sourceUrl: string, timestamp: string): Promise<void> {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);

    for (const sentence of sentences) {
      // Extract organizations
      const orgMatches = Array.from(sentence.matchAll(PATTERNS.organization));
      for (const match of orgMatches) {
        const name = match[1].trim();
        if (this.isValidOrganization(name)) {
          const entity = this.createEntity(
            'Organization',
            name,
            sourceUrl,
            sentence,
            timestamp,
            0.7
          );
          this.entities.set(entity.id, entity);
        }
      }

      // Extract persons
      const personMatches = Array.from(sentence.matchAll(PATTERNS.person));
      for (const match of personMatches) {
        const name = match[1].trim();
        if (this.isValidPerson(name)) {
          const entity = this.createEntity(
            'Person',
            name,
            sourceUrl,
            sentence,
            timestamp,
            0.6
          );
          this.entities.set(entity.id, entity);
        }
      }

      // Extract metrics
      const metricMatches = Array.from(sentence.matchAll(PATTERNS.metric));
      for (const match of metricMatches) {
        const value = match[1];
        const unit = match[2];
        const entity = this.createEntity(
          'Metric',
          `${value} ${unit}`,
          sourceUrl,
          sentence,
          timestamp,
          0.9,
          { value, unit }
        );
        this.entities.set(entity.id, entity);
      }

      // Extract concepts (technical terms in quotes or capitalized phrases)
      const conceptMatches = sentence.match(/"([^"]+)"|`([^`]+)`/g);
      if (conceptMatches) {
        for (const match of conceptMatches) {
          const concept = match.replace(/["`]/g, '').trim();
          if (concept.length > 3) {
            const entity = this.createEntity(
              'Concept',
              concept,
              sourceUrl,
              sentence,
              timestamp,
              0.5
            );
            this.entities.set(entity.id, entity);
          }
        }
      }
    }
  }

  /**
   * Extract relationships between entities
   * Optimized with entity index for O(n) performance
   */
  private async extractRelationships(text: string, timestamp: string): Promise<void> {
    const entitiesList = Array.from(this.entities.values());
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    // Build entity index for faster lookup: Map<sentence_index, Entity[]>
    const sentenceEntityMap = new Map<number, Entity[]>();
    
    sentences.forEach((sentence, idx) => {
      const entitiesInSentence = entitiesList.filter(e => sentence.includes(e.name));
      if (entitiesInSentence.length >= 2) {
        sentenceEntityMap.set(idx, entitiesInSentence);
      }
    });

    // Process only sentences with 2+ entities (optimization)
    for (const [idx, entitiesInSentence] of sentenceEntityMap.entries()) {
      const sentence = sentences[idx];
      
      // Limit relationship pairs to prevent explosion (max 10 relationships per sentence)
      const maxPairs = Math.min(10, entitiesInSentence.length * (entitiesInSentence.length - 1) / 2);
      let pairCount = 0;
      
      for (let i = 0; i < entitiesInSentence.length && pairCount < maxPairs; i++) {
        for (let j = i + 1; j < entitiesInSentence.length && pairCount < maxPairs; j++) {
          const source = entitiesInSentence[i];
          const target = entitiesInSentence[j];
          
          // Determine relationship type based on entity types and context
          const relType = this.inferRelationshipType(source, target, sentence);
          
          if (relType) {
            const relationship: Relationship = {
              id: this.generateId('rel'),
              type: relType,
              source: source.id,
              target: target.id,
              confidence: this.calculateRelationshipConfidence(relType, sentence),
              context: sentence.substring(0, 200),
              extractedAt: timestamp,
            };
            
            this.relationships.set(relationship.id, relationship);
            pairCount++;
          }
        }
      }
    }
  }
  
  /**
   * Calculate relationship confidence based on type and context quality
   */
  private calculateRelationshipConfidence(type: RelationshipType, context: string): number {
    let confidence = 0.5; // Base confidence
    
    // Higher confidence for specific relationship types
    if (type === 'worksFor' || type === 'owns' || type === 'creates') {
      confidence = 0.75;
    } else if (type === 'measures' || type === 'proves') {
      confidence = 0.8;
    } else if (type === 'relatedTo') {
      confidence = 0.5;
    }
    
    // Boost confidence if context has strong indicators
    if (/\b(?:according to|confirmed|verified|official)\b/i.test(context)) {
      confidence = Math.min(0.95, confidence + 0.15);
    }
    
    return confidence;
  }

  /**
   * Extract claims (factual statements with evidence)
   */
  private async extractClaims(text: string, sourceUrl: string, _timestamp: string): Promise<void> {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);

    for (const sentence of sentences) {
      // Check if sentence contains claim indicators
      const hasClaimIndicator = CLAIM_INDICATORS.some(pattern => pattern.test(sentence));
      
      if (hasClaimIndicator || this.containsMetric(sentence)) {
        const entitiesInClaim = Array.from(this.entities.values())
          .filter(e => sentence.includes(e.name))
          .map(e => e.id);

        const evidence = this.extractEvidence(sentence, sourceUrl);

        if (entitiesInClaim.length > 0 || evidence.length > 0) {
          const claim: Claim = {
            id: this.generateId('claim'),
            statement: sentence.trim(),
            entities: entitiesInClaim,
            evidence,
            confidence: evidence.length > 0 ? 0.8 : 0.5,
          };

          this.claims.set(claim.id, claim);
        }
      }
    }
  }

  /**
   * Extract evidence from sentence
   */
  private extractEvidence(sentence: string, sourceUrl: string): Claim['evidence'] {
    const evidence: Claim['evidence'] = [];

    // Check for citations
    const citationMatches = sentence.match(EVIDENCE_PATTERNS.citation);
    if (citationMatches) {
      evidence.push({
        type: 'citation',
        source: citationMatches[0],
      });
    }

    // Check for data points
    const hasData = EVIDENCE_PATTERNS.data.test(sentence);
    if (hasData) {
      evidence.push({
        type: 'data',
        source: sentence,
        url: sourceUrl,
      });
    }

    // Check for expert opinions
    const expertMatches = sentence.match(EVIDENCE_PATTERNS.expertOpinion);
    if (expertMatches) {
      evidence.push({
        type: 'expert_opinion',
        source: expertMatches[0],
      });
    }

    return evidence;
  }

  /**
   * Infer relationship type based on entity types and context
   * Uses semantic keyword patterns for relationship detection
   */
  private inferRelationshipType(
    source: Entity,
    target: Entity,
    context: string
  ): RelationshipType | null {
    const lowerContext = context.toLowerCase();
    
    // Person -> Organization
    if (source.type === 'Person' && target.type === 'Organization') {
      if (/\b(?:CEO|founder|co-founder|president|director|chairman|executive)\b/i.test(context)) {
        return 'worksFor';
      }
      if (/\b(?:works at|works for|employed by|employee of|joined|hired by)\b/i.test(context)) {
        return 'worksFor';
      }
      if (/\b(?:owns|founded|established|started)\b/i.test(context)) {
        return 'owns';
      }
    }

    // Organization -> Organization
    if (source.type === 'Organization' && target.type === 'Organization') {
      if (/\b(?:acquired|bought|purchased|merger|acquisition)\b/i.test(context)) {
        return 'owns';
      }
      if (/\b(?:partnership|partners with|collaboration|works with)\b/i.test(context)) {
        return 'relatedTo';
      }
    }

    // Organization -> Product
    if (source.type === 'Organization' && target.type === 'Product') {
      if (/\b(?:creates|develops|builds|launches|releases|produces|manufactures)\b/i.test(context)) {
        return 'creates';
      }
      if (/\b(?:owns|proprietary|trademark)\b/i.test(context)) {
        return 'owns';
      }
    }

    // Metric -> Entity (proves/measures)
    if (source.type === 'Metric' || target.type === 'Metric') {
      if (/\b(?:shows|demonstrates|proves|indicates|measures)\b/i.test(context)) {
        return 'measures';
      }
    }

    // Concept -> Concept
    if (source.type === 'Concept' && target.type === 'Concept') {
      if (/\b(?:contradicts|opposes|conflicts with|challenges)\b/i.test(context)) {
        return 'contradicts';
      }
      if (/\b(?:supports|validates|confirms|proves)\b/i.test(context)) {
        return 'supports';
      }
      if (/\b(?:cites|references|mentions|quotes)\b/i.test(context)) {
        return 'cites';
      }
      return 'relatedTo';
    }

    // Default: related (but only if entities are actually related in context)
    if (lowerContext.includes('and') || lowerContext.includes('with') || lowerContext.includes('related')) {
      return 'relatedTo';
    }
    
    return null;
  }

  /**
   * Validate organization name
   */
  private isValidOrganization(name: string): boolean {
    // Filter out stop words
    if (STOP_WORDS.has(name)) return false;
    
    // Filter out common article + noun patterns
    if (/^(The|A|An)\s+[A-Z][a-z]+$/.test(name)) return false;
    
    // Must be 2+ words or have company suffix
    return name.split(/\s+/).length >= 2 || /Inc|LLC|Corp|Ltd|Group|AG|GmbH/i.test(name);
  }

  /**
   * Validate person name
   */
  private isValidPerson(name: string): boolean {
    const parts = name.split(/\s+/);
    // Must be 2-4 words, not too long
    return parts.length >= 2 && parts.length <= 4 && name.length < 40;
  }

  /**
   * Check if sentence contains metric
   */
  private containsMetric(sentence: string): boolean {
    return PATTERNS.metric.test(sentence);
  }

  /**
   * Create entity object
   */
  private createEntity(
    type: EntityType,
    name: string,
    sourceUrl: string,
    context: string,
    timestamp: string,
    confidence: number,
    properties?: Record<string, any>
  ): Entity {
    return {
      id: this.generateId('entity'),
      type,
      name,
      url: type === 'Organization' ? this.guessUrl(name) : undefined,
      properties,
      confidence,
      sourceUrl,
      sourceContext: context.substring(0, 200),
      extractedAt: timestamp,
    };
  }

  /**
   * Extract URL from organization name using known patterns
   * Returns undefined if no reliable URL can be determined
   */
  private guessUrl(name: string): string | undefined {
    const normalized = name.toLowerCase()
      .replace(/\s+inc\.?$/i, '')
      .replace(/\s+llc\.?$/i, '')
      .replace(/\s+corp(oration)?\.?$/i, '')
      .replace(/\s+ltd\.?$/i, '')
      .replace(/\s+limited$/i, '')
      .replace(/\s+group$/i, '')
      .replace(/\s+ag$/i, '')
      .replace(/\s+gmbh$/i, '')
      .replace(/\s+/g, '');
    
    // Check against known organizations
    if (ORG_DOMAIN_KEYWORDS.has(normalized)) {
      return `https://${ORG_DOMAIN_KEYWORDS.get(normalized)}`;
    }
    
    // Only return URL for single-word organizations with known TLDs
    // This prevents generating fictional URLs for multi-word organizations
    if (!normalized.includes(' ') && normalized.length > 2) {
      // Only for well-known pattern: CompanyName -> companyname.com
      // But return undefined to avoid false URLs - let syndication handle it
      return undefined;
    }
    
    return undefined;
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Convert to final knowledge graph format
   */
  private toKnowledgeGraph(): KnowledgeGraph {
    const entities = Array.from(this.entities.values());
    const relationships = Array.from(this.relationships.values());
    const claims = Array.from(this.claims.values());
    const timestamp = new Date().toISOString();

    return {
      id: this.generateId('kg'),
      domain: this.domain,
      entities,
      relationships,
      claims,
      metadata: {
        createdAt: timestamp,
        updatedAt: timestamp,
        version: '1.0.0',
        sourceUrls: [this.domain],
        entityCount: entities.length,
        relationshipCount: relationships.length,
        claimCount: claims.length,
      },
    };
  }

  /**
   * Export to JSON-LD format for AI consumption
   */
  static toJSONLD(graph: KnowledgeGraph): Record<string, any> {
    return {
      '@context': 'https://schema.org',
      '@type': 'KnowledgeGraph',
      '@id': graph.id,
      name: `Knowledge Graph for ${graph.domain}`,
      description: `Extracted knowledge from ${graph.domain}`,
      publisher: {
        '@type': 'Organization',
        name: 'Anóteros Lógos',
        url: 'https://anoteroslogos.com',
      },
      dateCreated: graph.metadata.createdAt,
      dateModified: graph.metadata.updatedAt,
      version: graph.metadata.version,
      entities: graph.entities.map(e => ({
        '@type': e.type,
        '@id': e.id,
        name: e.name,
        url: e.url,
        description: e.description,
        sourceUrl: e.sourceUrl,
        confidence: e.confidence,
      })),
      relationships: graph.relationships.map(r => ({
        '@type': 'Relationship',
        relationshipType: r.type,
        source: r.source,
        target: r.target,
        confidence: r.confidence,
      })),
      claims: graph.claims.map(c => ({
        '@type': 'Claim',
        statement: c.statement,
        evidence: c.evidence,
        confidence: c.confidence,
      })),
    };
  }
}

// ==================== UTILITIES ====================

/**
 * Merge multiple knowledge graphs
 */
export function mergeKnowledgeGraphs(graphs: KnowledgeGraph[]): KnowledgeGraph {
  if (graphs.length === 0) {
    throw new Error('Cannot merge empty graph list');
  }

  const merged: KnowledgeGraph = {
    id: `kg_merged_${Date.now()}`,
    domain: graphs[0].domain,
    entities: [],
    relationships: [],
    claims: [],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0',
      sourceUrls: [],
      entityCount: 0,
      relationshipCount: 0,
      claimCount: 0,
    },
  };

  // Deduplicate entities by name
  const entityMap = new Map<string, Entity>();
  for (const graph of graphs) {
    for (const entity of graph.entities) {
      if (!entityMap.has(entity.name)) {
        entityMap.set(entity.name, entity);
      }
    }
    merged.metadata.sourceUrls.push(...graph.metadata.sourceUrls);
  }

  merged.entities = Array.from(entityMap.values());

  // Merge relationships (deduplicate by source-target-type)
  const relMap = new Map<string, Relationship>();
  for (const graph of graphs) {
    for (const rel of graph.relationships) {
      const key = `${rel.source}-${rel.type}-${rel.target}`;
      if (!relMap.has(key)) {
        relMap.set(key, rel);
      }
    }
  }

  merged.relationships = Array.from(relMap.values());

  // Merge claims (deduplicate by statement)
  const claimMap = new Map<string, Claim>();
  for (const graph of graphs) {
    for (const claim of graph.claims) {
      if (!claimMap.has(claim.statement)) {
        claimMap.set(claim.statement, claim);
      }
    }
  }

  merged.claims = Array.from(claimMap.values());

  // Update counts
  merged.metadata.entityCount = merged.entities.length;
  merged.metadata.relationshipCount = merged.relationships.length;
  merged.metadata.claimCount = merged.claims.length;

  return merged;
}

/**
 * Calculate graph quality score (0-100)
 */
export function calculateGraphQuality(graph: KnowledgeGraph): number {
  let score = 0;

  // Entity quality (40 points)
  const avgEntityConfidence = graph.entities.reduce((sum, e) => sum + e.confidence, 0) / graph.entities.length;
  score += avgEntityConfidence * 40;

  // Relationship density (30 points)
  const expectedRelationships = (graph.entities.length * (graph.entities.length - 1)) / 2;
  const relationshipDensity = Math.min(1, graph.relationships.length / expectedRelationships);
  score += relationshipDensity * 30;

  // Claim richness (30 points)
  const claimsPerEntity = graph.claims.length / graph.entities.length;
  const claimScore = Math.min(1, claimsPerEntity / 2); // Target: 2 claims per entity
  score += claimScore * 30;

  return Math.round(score);
}

/**
 * Get expertise areas from knowledge graph
 */
export function getExpertiseAreas(graph: KnowledgeGraph): Array<{ topic: string; score: number }> {
  const topicCounts = new Map<string, number>();

  // Count concept entities
  for (const entity of graph.entities) {
    if (entity.type === 'Concept') {
      const count = topicCounts.get(entity.name) || 0;
      topicCounts.set(entity.name, count + 1);
    }
  }

  // Convert to array and sort
  return Array.from(topicCounts.entries())
    .map(([topic, count]) => ({
      topic,
      score: Math.min(100, (count / graph.entities.length) * 1000),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}
