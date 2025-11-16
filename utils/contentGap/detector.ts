/**
 * Content Gap Detector
 * CRITICAL INNOVATION: Identifies content competitors have that we're missing
 * 
 * Business Impact:
 * - Discovers high-value content opportunities automatically
 * - Prioritizes content creation based on actual citation data
 * - Prevents losing citations to competitors
 * - Guides content strategy with AI platform preferences
 */

import type { KnowledgeGraph } from '../knowledgeGraph/builder';
import type { Citation } from '../citationProof/tracker';
import type { CompetitorProfile } from '../competitiveIntelligence/realTimeMonitor';
import type { QueryIntent } from '../queryIntent/analyzer';

// =====================================================
// TYPES
// =====================================================

export interface ContentGap {
  id: string;
  detected_at: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  
  gap_type:
    | 'missing_entity' // Competitor has entity, we don't
    | 'missing_claim' // Competitor has validated claim, we don't
    | 'missing_relationship' // Competitor has relationship, we don't
    | 'missing_topic' // Competitor covers topic, we don't
    | 'outdated_content' // We have content but it's old
    | 'insufficient_depth'; // We have basic coverage, competitor has deep
  
  // What's missing
  details: {
    entity_name?: string;
    entity_type?: string;
    topic?: string;
    claim_statement?: string;
    relationship_type?: string;
    source_entity?: string;
    target_entity?: string;
  };
  
  // Why it matters
  impact: {
    competitor_citations_count: number;
    estimated_queries_per_month: number;
    estimated_lost_citations: number;
    estimated_lost_value_usd: number;
    platforms_affected: string[];
    query_intents_affected: QueryIntent[];
  };
  
  // Evidence
  evidence: Array<{
    competitor: string;
    citation_count: number;
    sample_queries: string[];
    platforms: string[];
  }>;
  
  // How to fix
  recommended_content: {
    content_type: 'entity' | 'claim' | 'relationship' | 'comprehensive_article';
    title: string;
    description: string;
    minimum_requirements: string[];
    success_criteria: string[];
    estimated_effort_hours: number;
    expected_citations_per_month: number;
  };
  
  // Status
  status: 'detected' | 'analyzing' | 'content_planned' | 'in_progress' | 'completed' | 'ignored';
  assigned_to?: string;
  completed_at?: string;
  actual_citations_received?: number;
}

export interface ContentStrategy {
  period: {
    start: string;
    end: string;
  };
  
  // Gap summary
  total_gaps_detected: number;
  critical_gaps: number;
  high_priority_gaps: number;
  
  gaps_by_type: Record<ContentGap['gap_type'], number>;
  gaps_by_platform: Record<string, number>;
  
  // Recommended priorities
  top_opportunities: ContentGap[];
  quick_wins: ContentGap[]; // Low effort, high impact
  strategic_investments: ContentGap[]; // High effort, high impact
  
  // ROI projections
  total_potential_citations_per_month: number;
  total_potential_value_usd_per_month: number;
  
  // Progress tracking
  gaps_completed_this_period: number;
  actual_roi: number; // Actual citations / estimated citations
}

// =====================================================
// CONTENT GAP DETECTOR
// =====================================================

export class ContentGapDetector {
  private gaps: Map<string, ContentGap> = new Map();
  // @ts-ignore - ourDomain may be used in future for domain-specific logic
  constructor(private ourDomain: string) {}
  
  /**
   * Analyze competitor citations to find gaps
   * CRITICAL: This identifies exactly what content we need
   */
  async detectGaps(
    ourGraph: KnowledgeGraph,
    competitorCitations: Array<{
      competitor: CompetitorProfile;
      citations: Citation[];
    }>
  ): Promise<ContentGap[]> {
    const detectedGaps: ContentGap[] = [];
    
    // Analyze each competitor's citations
    for (const { competitor, citations } of competitorCitations) {
      // Find entity gaps
      const entityGaps = this.detectEntityGaps(ourGraph, competitor, citations);
      detectedGaps.push(...entityGaps);
      
      // Find claim gaps
      const claimGaps = this.detectClaimGaps(ourGraph, competitor, citations);
      detectedGaps.push(...claimGaps);
      
      // Find topic gaps
      const topicGaps = this.detectTopicGaps(ourGraph, competitor, citations);
      detectedGaps.push(...topicGaps);
      
      // Find relationship gaps
      const relationshipGaps = this.detectRelationshipGaps(ourGraph, competitor, citations);
      detectedGaps.push(...relationshipGaps);
    }
    
    // Deduplicate and prioritize
    const uniqueGaps = this.deduplicateGaps(detectedGaps);
    const prioritizedGaps = this.prioritizeGaps(uniqueGaps);
    
    // Store gaps
    prioritizedGaps.forEach(gap => {
      this.gaps.set(gap.id, gap);
    });
    
    return prioritizedGaps;
  }
  
  /**
   * Detect missing entities
   */
  private detectEntityGaps(
    ourGraph: KnowledgeGraph,
    competitor: CompetitorProfile,
    citations: Citation[]
  ): ContentGap[] {
    const gaps: ContentGap[] = [];
    
    // Extract entities from competitor citations
    const competitorEntities = this.extractEntitiesFromCitations(citations);
    
    // Find entities they have that we don't
    const ourEntityNames = new Set(ourGraph.entities.map(e => e.name.toLowerCase()));
    
    for (const [entityName, entityData] of competitorEntities) {
      if (!ourEntityNames.has(entityName.toLowerCase())) {
        const gap: ContentGap = {
          id: this.generateId('gap_entity'),
          detected_at: new Date().toISOString(),
          priority: this.calculateGapPriority(entityData.citationCount, entityData.queriesPerMonth),
          gap_type: 'missing_entity',
          details: {
            entity_name: entityName,
            entity_type: entityData.type,
          },
          impact: {
            competitor_citations_count: entityData.citationCount,
            estimated_queries_per_month: entityData.queriesPerMonth,
            estimated_lost_citations: entityData.citationCount,
            estimated_lost_value_usd: entityData.citationCount * 1.0, // $1 per citation
            platforms_affected: entityData.platforms,
            query_intents_affected: entityData.intents,
          },
          evidence: [{
            competitor: competitor.name,
            citation_count: entityData.citationCount,
            sample_queries: entityData.sampleQueries.slice(0, 3),
            platforms: entityData.platforms,
          }],
          recommended_content: {
            content_type: 'entity',
            title: `Add ${entityName} entity to knowledge graph`,
            description: `Create comprehensive entity profile for ${entityName} with relationships and supporting claims`,
            minimum_requirements: [
              'Entity name and type',
              'Description (min 100 characters)',
              'At least 3 relationships to existing entities',
              'At least 2 validated claims',
              'Source URLs for verification',
            ],
            success_criteria: [
              'Entity indexed by all AI platforms',
              'Appears in 50% of relevant queries within 30 days',
              `Receives ${Math.ceil(entityData.citationCount * 0.5)} citations per month`,
            ],
            estimated_effort_hours: 4,
            expected_citations_per_month: Math.ceil(entityData.citationCount * 0.5),
          },
          status: 'detected',
        };
        
        gaps.push(gap);
      }
    }
    
    return gaps;
  }
  
  /**
   * Detect missing claims
   */
  private detectClaimGaps(
    ourGraph: KnowledgeGraph,
    competitor: CompetitorProfile,
    citations: Citation[]
  ): ContentGap[] {
    const gaps: ContentGap[] = [];
    
    // Extract claim patterns from citations
    const competitorClaims = this.extractClaimsFromCitations(citations);
    
    // Check if we have similar claims
    const ourClaimStatements = new Set(
      ourGraph.claims.map(c => c.statement.toLowerCase())
    );
    
    for (const [claimKey, claimData] of competitorClaims) {
      // Check for similar claim (simple text matching)
      const hasSimilarClaim = Array.from(ourClaimStatements).some(ourClaim =>
        this.calculateTextSimilarity(ourClaim, claimKey.toLowerCase()) > 0.7
      );
      
      if (!hasSimilarClaim) {
        const gap: ContentGap = {
          id: this.generateId('gap_claim'),
          detected_at: new Date().toISOString(),
          priority: this.calculateGapPriority(claimData.citationCount, claimData.queriesPerMonth),
          gap_type: 'missing_claim',
          details: {
            claim_statement: claimKey,
          },
          impact: {
            competitor_citations_count: claimData.citationCount,
            estimated_queries_per_month: claimData.queriesPerMonth,
            estimated_lost_citations: claimData.citationCount,
            estimated_lost_value_usd: claimData.citationCount * 1.0,
            platforms_affected: claimData.platforms,
            query_intents_affected: claimData.intents,
          },
          evidence: [{
            competitor: competitor.name,
            citation_count: claimData.citationCount,
            sample_queries: claimData.sampleQueries.slice(0, 3),
            platforms: claimData.platforms,
          }],
          recommended_content: {
            content_type: 'claim',
            title: `Add validated claim: "${claimKey.substring(0, 50)}..."`,
            description: `Create and validate claim with supporting evidence`,
            minimum_requirements: [
              'Clear, factual statement',
              'At least 3 evidence sources',
              'Confidence score > 0.8',
              'Temporal context if relevant',
              'Link to related entities',
            ],
            success_criteria: [
              'Claim indexed by all AI platforms',
              'Cited in relevant queries',
              `Receives ${Math.ceil(claimData.citationCount * 0.4)} citations per month`,
            ],
            estimated_effort_hours: 6,
            expected_citations_per_month: Math.ceil(claimData.citationCount * 0.4),
          },
          status: 'detected',
        };
        
        gaps.push(gap);
      }
    }
    
    return gaps;
  }
  
  /**
   * Detect missing topics
   */
  private detectTopicGaps(
    ourGraph: KnowledgeGraph,
    competitor: CompetitorProfile,
    citations: Citation[]
  ): ContentGap[] {
    const gaps: ContentGap[] = [];
    
    // Extract topics from citations
    const competitorTopics = this.extractTopicsFromCitations(citations);
    const ourTopics = this.extractTopicsFromGraph(ourGraph);
    
    for (const [topic, topicData] of competitorTopics) {
      if (!ourTopics.has(topic.toLowerCase())) {
        const gap: ContentGap = {
          id: this.generateId('gap_topic'),
          detected_at: new Date().toISOString(),
          priority: this.calculateGapPriority(topicData.citationCount, topicData.queriesPerMonth),
          gap_type: 'missing_topic',
          details: {
            topic,
          },
          impact: {
            competitor_citations_count: topicData.citationCount,
            estimated_queries_per_month: topicData.queriesPerMonth,
            estimated_lost_citations: topicData.citationCount,
            estimated_lost_value_usd: topicData.citationCount * 1.0,
            platforms_affected: topicData.platforms,
            query_intents_affected: topicData.intents,
          },
          evidence: [{
            competitor: competitor.name,
            citation_count: topicData.citationCount,
            sample_queries: topicData.sampleQueries.slice(0, 3),
            platforms: topicData.platforms,
          }],
          recommended_content: {
            content_type: 'comprehensive_article',
            title: `Create comprehensive content on ${topic}`,
            description: `Develop full knowledge graph coverage for ${topic} including entities, claims, and relationships`,
            minimum_requirements: [
              'At least 10 entities related to topic',
              'At least 15 validated claims',
              'Dense relationship network',
              'Multiple evidence sources',
              'Up-to-date information',
            ],
            success_criteria: [
              'Topic authority established',
              'Top 3 result for topic queries',
              `Receives ${Math.ceil(topicData.citationCount * 0.6)} citations per month`,
            ],
            estimated_effort_hours: 16,
            expected_citations_per_month: Math.ceil(topicData.citationCount * 0.6),
          },
          status: 'detected',
        };
        
        gaps.push(gap);
      }
    }
    
    return gaps;
  }
  
  /**
   * Detect missing relationships
   */
  private detectRelationshipGaps(
    ourGraph: KnowledgeGraph,
    competitor: CompetitorProfile,
    citations: Citation[]
  ): ContentGap[] {
    const gaps: ContentGap[] = [];
    
    // Simplified: Look for co-occurring entities that should be related
    const entityPairs = this.extractEntityPairsFromCitations(citations);
    
    for (const [pairKey, pairData] of entityPairs) {
      const [entity1, entity2] = pairKey.split('|');
      
      // Check if we have both entities
      const hasEntity1 = ourGraph.entities.some(e => 
        e.name.toLowerCase() === entity1.toLowerCase()
      );
      const hasEntity2 = ourGraph.entities.some(e => 
        e.name.toLowerCase() === entity2.toLowerCase()
      );
      
      if (hasEntity1 && hasEntity2) {
        // Check if we have relationship
        const hasRelationship = ourGraph.relationships.some(r =>
          (r.source.toLowerCase() === entity1.toLowerCase() && r.target.toLowerCase() === entity2.toLowerCase()) ||
          (r.source.toLowerCase() === entity2.toLowerCase() && r.target.toLowerCase() === entity1.toLowerCase())
        );
        
        if (!hasRelationship && pairData.citationCount >= 3) {
          const gap: ContentGap = {
            id: this.generateId('gap_rel'),
            detected_at: new Date().toISOString(),
            priority: this.calculateGapPriority(pairData.citationCount, pairData.queriesPerMonth),
            gap_type: 'missing_relationship',
            details: {
              source_entity: entity1,
              target_entity: entity2,
              relationship_type: pairData.suggestedType,
            },
            impact: {
              competitor_citations_count: pairData.citationCount,
              estimated_queries_per_month: pairData.queriesPerMonth,
              estimated_lost_citations: Math.ceil(pairData.citationCount * 0.3),
              estimated_lost_value_usd: Math.ceil(pairData.citationCount * 0.3),
              platforms_affected: pairData.platforms,
              query_intents_affected: ['comparison', 'factual_lookup'],
            },
            evidence: [{
              competitor: competitor.name,
              citation_count: pairData.citationCount,
              sample_queries: pairData.sampleQueries.slice(0, 3),
              platforms: pairData.platforms,
            }],
            recommended_content: {
              content_type: 'relationship',
              title: `Add relationship between ${entity1} and ${entity2}`,
              description: `Create validated relationship with supporting evidence`,
              minimum_requirements: [
                'Relationship type defined',
                'Direction specified',
                'Confidence score > 0.7',
                'At least 1 supporting claim',
              ],
            success_criteria: [
              'Relationship indexed',
              `Appears in relevant queries`,
              `Contributes to ${Math.ceil(pairData.citationCount * 0.3)} citations per month`,
            ],
            estimated_effort_hours: 2,
            expected_citations_per_month: Math.ceil(pairData.citationCount * 0.3),
          },
          status: 'detected',
        };
        
        gaps.push(gap);
      }
    }
  }
  
  return gaps;
}

/**
 * Generate content strategy
 */
async generateStrategy(
  startDate: Date,
  endDate: Date
): Promise<ContentStrategy> {
  const allGaps = Array.from(this.gaps.values());
  const periodGaps = allGaps.filter(g => {
    const gapDate = new Date(g.detected_at);
    return gapDate >= startDate && gapDate <= endDate;
  });
  
  // Count by type
  const gapsByType = periodGaps.reduce((acc, gap) => {
    acc[gap.gap_type] = (acc[gap.gap_type] || 0) + 1;
    return acc;
  }, {} as Record<ContentGap['gap_type'], number>);
  
  // Count by platform
  const gapsByPlatform = periodGaps.reduce((acc, gap) => {
    gap.impact.platforms_affected.forEach(platform => {
      acc[platform] = (acc[platform] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);
  
  // Identify top opportunities
  const sortedGaps = [...periodGaps].sort((a, b) =>
    b.impact.estimated_lost_citations - a.impact.estimated_lost_citations
  );
  
  const topOpportunities = sortedGaps.slice(0, 10);
  
  // Quick wins: high impact, low effort
  const quickWins = periodGaps
    .filter(g => 
      g.recommended_content.estimated_effort_hours <= 4 &&
      g.recommended_content.expected_citations_per_month >= 10
    )
    .slice(0, 5);
  
  // Strategic investments: high impact, high effort
  const strategicInvestments = periodGaps
    .filter(g =>
      g.recommended_content.estimated_effort_hours > 8 &&
      g.recommended_content.expected_citations_per_month >= 20
    )
    .slice(0, 5);
  
  // Calculate total potential
  const totalPotentialCitations = periodGaps.reduce((sum, gap) =>
    sum + gap.recommended_content.expected_citations_per_month, 0
  );
  
  const totalPotentialValue = periodGaps.reduce((sum, gap) =>
    sum + gap.impact.estimated_lost_value_usd, 0
  );
  
  return {
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    total_gaps_detected: periodGaps.length,
    critical_gaps: periodGaps.filter(g => g.priority === 'critical').length,
    high_priority_gaps: periodGaps.filter(g => g.priority === 'high').length,
    gaps_by_type: gapsByType,
    gaps_by_platform: gapsByPlatform,
    top_opportunities: topOpportunities,
    quick_wins: quickWins,
    strategic_investments: strategicInvestments,
    total_potential_citations_per_month: totalPotentialCitations,
    total_potential_value_usd_per_month: totalPotentialValue,
    gaps_completed_this_period: periodGaps.filter(g => g.status === 'completed').length,
    actual_roi: this.calculateActualROI(periodGaps),
  };
}

// =====================================================
// HELPER METHODS
// =====================================================

private generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

private extractEntitiesFromCitations(citations: Citation[]): Map<string, any> {
  const entities = new Map();
  
  citations.forEach(c => {
    // Simple entity extraction from query and response
    const words = `${c.query} ${c.response}`.split(/\s+/);
    words.forEach(word => {
      if (/^[A-Z][a-z]+/.test(word)) {
        if (!entities.has(word)) {
          entities.set(word, {
            type: 'Unknown',
            citationCount: 0,
            queriesPerMonth: 30,
            platforms: [],
            intents: ['factual_lookup'],
            sampleQueries: [],
          });
        }
        const data = entities.get(word);
        data.citationCount++;
        if (!data.platforms.includes(c.source)) {
          data.platforms.push(c.source);
        }
        if (data.sampleQueries.length < 5) {
          data.sampleQueries.push(c.query);
        }
      }
    });
  });
  
  return entities;
}

private extractClaimsFromCitations(citations: Citation[]): Map<string, any> {
  const claims = new Map();
  
  citations.forEach(c => {
    // Extract claim-like sentences from responses
    const sentences = c.response.split(/\. /);
    sentences.forEach(sentence => {
      if (sentence.length > 20 && sentence.length < 200) {
        if (!claims.has(sentence)) {
          claims.set(sentence, {
            citationCount: 0,
            queriesPerMonth: 20,
            platforms: [],
            intents: ['factual_lookup'],
            sampleQueries: [],
          });
        }
        const data = claims.get(sentence);
        data.citationCount++;
        if (!data.platforms.includes(c.source)) {
          data.platforms.push(c.source);
        }
        if (data.sampleQueries.length < 3) {
          data.sampleQueries.push(c.query);
        }
      }
    });
  });
  
  return claims;
}

private extractTopicsFromCitations(citations: Citation[]): Map<string, any> {
  const topics = new Map();
  
  citations.forEach(c => {
    // Simple topic extraction - capitalize phrases
    const phrases = c.query.match(/[A-Z][a-z]+(?: [A-Z][a-z]+)*/g) || [];
    phrases.forEach(phrase => {
      if (!topics.has(phrase)) {
        topics.set(phrase, {
          citationCount: 0,
          queriesPerMonth: 25,
          platforms: [],
          intents: ['factual_lookup'],
          sampleQueries: [],
        });
      }
      const data = topics.get(phrase);
      data.citationCount++;
      if (!data.platforms.includes(c.source)) {
        data.platforms.push(c.source);
      }
      if (data.sampleQueries.length < 3) {
        data.sampleQueries.push(c.query);
      }
    });
  });
  
  return topics;
}

private extractTopicsFromGraph(graph: KnowledgeGraph): Set<string> {
  const topics = new Set<string>();
  
  // Extract from entities
  graph.entities.forEach(e => {
    topics.add(e.name.toLowerCase());
    if (e.description) {
      const words = e.description.split(/\s+/);
      words.forEach(w => {
        if (w.length > 5) topics.add(w.toLowerCase());
      });
    }
  });
  
  return topics;
}

private extractEntityPairsFromCitations(citations: Citation[]): Map<string, any> {
  const pairs = new Map();
  
  citations.forEach(c => {
    const entities = (c.query + ' ' + c.response).match(/[A-Z][a-z]+(?:\s[A-Z][a-z]+)*/g) || [];
    
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const key = [entities[i], entities[j]].sort().join('|');
        
        if (!pairs.has(key)) {
          pairs.set(key, {
            citationCount: 0,
            queriesPerMonth: 15,
            platforms: [],
            sampleQueries: [],
            suggestedType: 'related_to',
          });
        }
        
        const data = pairs.get(key);
        data.citationCount++;
        if (!data.platforms.includes(c.source)) {
          data.platforms.push(c.source);
        }
        if (data.sampleQueries.length < 3) {
          data.sampleQueries.push(c.query);
        }
      }
    }
  });
  
  return pairs;
}

private calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.split(/\s+/));
  const words2 = new Set(text2.split(/\s+/));
  
  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;
  
  return intersection / union;
}

private calculateGapPriority(
  citationCount: number,
  queriesPerMonth: number
): ContentGap['priority'] {
  const score = citationCount + (queriesPerMonth / 10);
  
  if (score > 50) return 'critical';
  if (score > 30) return 'high';
  if (score > 15) return 'medium';
  return 'low';
}

private deduplicateGaps(gaps: ContentGap[]): ContentGap[] {
  const seen = new Set<string>();
  return gaps.filter(gap => {
    const key = `${gap.gap_type}_${JSON.stringify(gap.details)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

private prioritizeGaps(gaps: ContentGap[]): ContentGap[] {
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return gaps.sort((a, b) => {
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return b.impact.estimated_lost_citations - a.impact.estimated_lost_citations;
  });
}

private calculateActualROI(gaps: ContentGap[]): number {
  const completed = gaps.filter(g => g.status === 'completed' && g.actual_citations_received);
  if (completed.length === 0) return 0;
  
  const totalActual = completed.reduce((sum, g) => sum + (g.actual_citations_received || 0), 0);
  const totalEstimated = completed.reduce((sum, g) => sum + g.recommended_content.expected_citations_per_month, 0);
  
  return totalEstimated > 0 ? (totalActual / totalEstimated) * 100 : 0;
}
}
