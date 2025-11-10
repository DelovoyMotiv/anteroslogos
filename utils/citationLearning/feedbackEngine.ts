/**
 * AI Citation Learning Engine
 * Revolutionary feedback loop system that learns from AI citation patterns
 * to automatically optimize knowledge graphs for maximum citation probability
 * 
 * Core Innovation: Bidirectional AI Intelligence
 * - Analyzes HOW AI platforms use syndicated knowledge
 * - Extracts confidence signals from citation contexts
 * - Identifies query patterns that trigger citations
 * - Auto-optimizes knowledge graph based on real-world performance
 * 
 * Philosophy Alignment: "Become the source" + continuous improvement
 */

import { z } from 'zod';
import type { KnowledgeGraph, Entity } from '../knowledgeGraph/builder';
import type { Citation } from '../citationProof/tracker';

// ==================== SCHEMAS ====================

export const QueryPatternSchema = z.object({
  id: z.string(),
  pattern: z.string(),
  frequency: z.number(),
  aiPlatforms: z.array(z.string()),
  triggeredCitations: z.number(),
  averageConfidence: z.number(),
  topEntities: z.array(z.string()),
  topClaims: z.array(z.string()),
  detectedAt: z.string().datetime(),
});

export type QueryPattern = z.infer<typeof QueryPatternSchema>;

export const ConfidenceSignalSchema = z.object({
  citationId: z.string(),
  signalType: z.enum(['positive', 'neutral', 'critical', 'disputed']),
  confidence: z.number().min(0).max(1),
  indicators: z.array(z.string()),
  context: z.string(),
  extractedAt: z.string().datetime(),
});

export type ConfidenceSignal = z.infer<typeof ConfidenceSignalSchema>;

export const EntityPerformanceSchema = z.object({
  entityId: z.string(),
  entityName: z.string(),
  totalCitations: z.number(),
  averageConfidence: z.number(),
  queryPatterns: z.array(z.string()),
  competitorMentions: z.number(),
  trendVelocity: z.number(), // citations per day trend
  optimizationScore: z.number().min(0).max(100),
  recommendations: z.array(z.string()),
});

export type EntityPerformance = z.infer<typeof EntityPerformanceSchema>;

export const CitationPredictionSchema = z.object({
  entityId: z.string(),
  claimId: z.string().optional(),
  predictedCitationProbability: z.number().min(0).max(1),
  confidenceInterval: z.tuple([z.number(), z.number()]),
  factors: z.object({
    historicalPerformance: z.number(),
    queryPatternAlignment: z.number(),
    competitiveDensity: z.number(),
    semanticClarity: z.number(),
    evidenceStrength: z.number(),
  }),
  recommendations: z.array(z.string()),
});

export type CitationPrediction = z.infer<typeof CitationPredictionSchema>;

export const OptimizationActionSchema = z.object({
  id: z.string(),
  actionType: z.enum([
    'strengthen_entity',
    'enhance_relationship',
    'refine_claim',
    'add_evidence',
    'disambiguate_entity',
    'expand_context',
    'merge_duplicates',
    'deprecate_weak_entity'
  ]),
  targetId: z.string(),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  expectedImpact: z.number(),
  description: z.string(),
  implementation: z.string(),
  status: z.enum(['pending', 'applied', 'validated', 'reverted']),
});

export type OptimizationAction = z.infer<typeof OptimizationActionSchema>;

// ==================== FEEDBACK ENGINE ====================

export class CitationFeedbackEngine {
  private queryPatterns: Map<string, QueryPattern> = new Map();
  private confidenceSignals: Map<string, ConfidenceSignal[]> = new Map();
  private entityPerformance: Map<string, EntityPerformance> = new Map();
  private optimizationActions: OptimizationAction[] = [];

  constructor(
    private knowledgeGraph: KnowledgeGraph,
    private historicalCitations: Citation[]
  ) {
    this.initialize();
  }

  /**
   * Initialize feedback engine with historical data
   */
  private initialize(): void {
    this.analyzeQueryPatterns();
    this.extractConfidenceSignals();
    this.calculateEntityPerformance();
  }

  /**
   * Analyze query patterns from citation contexts
   * Identifies what questions trigger citations
   */
  private analyzeQueryPatterns(): void {
    const patternMap = new Map<string, {
      count: number;
      citations: Citation[];
      platforms: Set<string>;
    }>();

    // Extract patterns from citation contexts
    for (const citation of this.historicalCitations) {
      if (!citation.context) continue;
      const patterns = this.extractQueryPatterns(citation.context);
      
      for (const pattern of patterns) {
        if (!patternMap.has(pattern)) {
          patternMap.set(pattern, {
            count: 0,
            citations: [],
            platforms: new Set(),
          });
        }
        
        const data = patternMap.get(pattern)!;
        data.count++;
        data.citations.push(citation);
        data.platforms.add(citation.source);
      }
    }

    // Convert to QueryPattern objects
    patternMap.forEach((data, pattern) => {
      const entitiesInPattern = new Set<string>();
      const claimsInPattern = new Set<string>();
      let totalConfidence = 0;

      data.citations.forEach(citation => {
        totalConfidence += citation.confidence;
        
        // Extract entity IDs from citation
        if (citation.context) {
          const entityIds = this.matchEntitiesToContext(citation.context);
          entityIds.forEach(id => entitiesInPattern.add(id));
          
          // Extract claim IDs from citation
          const claimIds = this.matchClaimsToContext(citation.context);
          claimIds.forEach(id => claimsInPattern.add(id));
        }
      });

      const queryPattern: QueryPattern = {
        id: this.generateId('qp'),
        pattern,
        frequency: data.count,
        aiPlatforms: Array.from(data.platforms),
        triggeredCitations: data.citations.length,
        averageConfidence: totalConfidence / data.citations.length,
        topEntities: Array.from(entitiesInPattern).slice(0, 5),
        topClaims: Array.from(claimsInPattern).slice(0, 5),
        detectedAt: new Date().toISOString(),
      };

      this.queryPatterns.set(queryPattern.id, queryPattern);
    });
  }

  /**
   * Extract confidence signals from citation contexts
   * Determines if citation is positive, neutral, critical, or disputed
   */
  private extractConfidenceSignals(): void {
    for (const citation of this.historicalCitations) {
      const signals = this.analyzeContextSentiment(citation);
      
      if (!this.confidenceSignals.has(citation.id)) {
        this.confidenceSignals.set(citation.id, []);
      }
      
      this.confidenceSignals.get(citation.id)!.push(...signals);
    }
  }

  /**
   * Calculate performance metrics for each entity
   */
  private calculateEntityPerformance(): void {
    for (const entity of this.knowledgeGraph.entities) {
      const entityCitations = this.historicalCitations.filter(c => 
        c.citedEntity === entity.id || 
        (c.context && c.context.toLowerCase().includes(entity.name.toLowerCase()))
      );

      if (entityCitations.length === 0) continue;

      const totalConfidence = entityCitations.reduce((sum, c) => sum + c.confidence, 0);
      const avgConfidence = totalConfidence / entityCitations.length;

      // Find query patterns that mention this entity
      const relevantPatterns = Array.from(this.queryPatterns.values())
        .filter(p => p.topEntities.includes(entity.id))
        .map(p => p.id);

      // Calculate trend velocity
      const recentCitations = entityCitations.filter(c => {
        const citationDate = new Date(c.timestamp);
        const daysSince = (Date.now() - citationDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince <= 30;
      });
      const trendVelocity = recentCitations.length / 30;

      // Count competitor mentions in same contexts
      const competitorMentions = this.countCompetitorMentions(entityCitations);

      // Calculate optimization score
      const optimizationScore = this.calculateOptimizationScore({
        citationCount: entityCitations.length,
        avgConfidence,
        trendVelocity,
        competitorDensity: competitorMentions / entityCitations.length,
      });

      // Generate recommendations
      const recommendations = this.generateEntityRecommendations(entity, {
        citationCount: entityCitations.length,
        avgConfidence,
        trendVelocity,
        competitorDensity: competitorMentions / entityCitations.length,
      });

      const performance: EntityPerformance = {
        entityId: entity.id,
        entityName: entity.name,
        totalCitations: entityCitations.length,
        averageConfidence: avgConfidence,
        queryPatterns: relevantPatterns,
        competitorMentions,
        trendVelocity,
        optimizationScore,
        recommendations,
      };

      this.entityPerformance.set(entity.id, performance);
    }
  }

  /**
   * Predict citation probability for new content
   * BEFORE syndication - allows pre-validation
   */
  predictCitationProbability(
    entityId: string,
    claimId?: string
  ): CitationPrediction {
    const entity = this.knowledgeGraph.entities.find(e => e.id === entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found in knowledge graph`);
    }

    const performance = this.entityPerformance.get(entityId);
    
    // Factor 1: Historical performance
    const historicalPerformance = performance 
      ? Math.min(performance.totalCitations / 100, 1) // normalize to 0-1
      : 0;

    // Factor 2: Query pattern alignment
    const queryPatternAlignment = performance
      ? performance.queryPatterns.length / Math.max(this.queryPatterns.size, 1)
      : 0;

    // Factor 3: Competitive density (lower is better)
    const competitiveDensity = performance
      ? 1 - Math.min(performance.competitorMentions / Math.max(performance.totalCitations, 1), 1)
      : 0.5;

    // Factor 4: Semantic clarity (from entity properties)
    const semanticClarity = entity.properties && entity.properties.length > 3
      ? Math.min(entity.properties.length / 10, 1)
      : 0.3;

    // Factor 5: Evidence strength (if claim provided)
    let evidenceStrength = 0.5;
    if (claimId) {
      const claim = this.knowledgeGraph.claims.find(c => c.id === claimId);
      if (claim) {
        evidenceStrength = claim.evidence && claim.evidence.length > 0
          ? Math.min(claim.evidence.length / 3, 1)
          : 0.2;
      }
    }

    // Weighted combination (can be ML model in future)
    const weights = {
      historicalPerformance: 0.3,
      queryPatternAlignment: 0.25,
      competitiveDensity: 0.2,
      semanticClarity: 0.15,
      evidenceStrength: 0.1,
    };

    const predictedProbability = 
      weights.historicalPerformance * historicalPerformance +
      weights.queryPatternAlignment * queryPatternAlignment +
      weights.competitiveDensity * competitiveDensity +
      weights.semanticClarity * semanticClarity +
      weights.evidenceStrength * evidenceStrength;

    // Calculate confidence interval (simplified)
    const variance = 0.15; // can be data-driven
    const confidenceInterval: [number, number] = [
      Math.max(0, predictedProbability - variance),
      Math.min(1, predictedProbability + variance),
    ];

    // Generate recommendations
    const recommendations: string[] = [];
    if (historicalPerformance < 0.3) {
      recommendations.push('Entity has limited citation history. Consider strengthening with more relationships.');
    }
    if (queryPatternAlignment < 0.2) {
      recommendations.push('Entity not aligned with detected query patterns. Review content relevance.');
    }
    if (competitiveDensity < 0.4) {
      recommendations.push('High competitor presence. Differentiate with unique claims or evidence.');
    }
    if (semanticClarity < 0.5) {
      recommendations.push('Add more properties to entity for better semantic clarity.');
    }
    if (evidenceStrength < 0.4) {
      recommendations.push('Strengthen claim with additional evidence sources.');
    }

    return {
      entityId,
      claimId,
      predictedCitationProbability: predictedProbability,
      confidenceInterval,
      factors: {
        historicalPerformance,
        queryPatternAlignment,
        competitiveDensity,
        semanticClarity,
        evidenceStrength,
      },
      recommendations,
    };
  }

  /**
   * Generate optimization actions for knowledge graph
   * Auto-suggests improvements based on performance data
   */
  generateOptimizationActions(): OptimizationAction[] {
    const actions: OptimizationAction[] = [];

    // Action 1: Strengthen high-performing entities
    const topPerformers = Array.from(this.entityPerformance.values())
      .filter(p => p.optimizationScore >= 70 && p.trendVelocity > 0)
      .sort((a, b) => b.optimizationScore - a.optimizationScore)
      .slice(0, 5);

    for (const performer of topPerformers) {
      actions.push({
        id: this.generateId('opt'),
        actionType: 'strengthen_entity',
        targetId: performer.entityId,
        priority: 'high',
        expectedImpact: 0.25,
        description: `Entity "${performer.entityName}" shows strong citation performance (${performer.totalCitations} citations, ${(performer.optimizationScore).toFixed(1)}% score). Strengthen with more relationships and claims.`,
        implementation: `Add 3-5 new relationships connecting "${performer.entityName}" to related concepts. Create 2-3 additional claims with strong evidence.`,
        status: 'pending',
      });
    }

    // Action 2: Fix weak entities
    const weakPerformers = Array.from(this.entityPerformance.values())
      .filter(p => p.optimizationScore < 30 && p.totalCitations > 0)
      .sort((a, b) => a.optimizationScore - b.optimizationScore)
      .slice(0, 3);

    for (const performer of weakPerformers) {
      if (performer.averageConfidence < 0.4) {
        actions.push({
          id: this.generateId('opt'),
          actionType: 'disambiguate_entity',
          targetId: performer.entityId,
          priority: 'critical',
          expectedImpact: 0.4,
          description: `Entity "${performer.entityName}" has low confidence citations (avg ${(performer.averageConfidence * 100).toFixed(1)}%). Likely disambiguation issue.`,
          implementation: `Review entity definition. Add more specific properties, aliases, or context to disambiguate from similar entities.`,
          status: 'pending',
        });
      } else {
        actions.push({
          id: this.generateId('opt'),
          actionType: 'enhance_relationship',
          targetId: performer.entityId,
          priority: 'medium',
          expectedImpact: 0.2,
          description: `Entity "${performer.entityName}" underperforming (${(performer.optimizationScore).toFixed(1)}% score). Needs stronger connections.`,
          implementation: `Add relationships to high-performing entities: ${topPerformers.map(p => p.entityName).join(', ')}`,
          status: 'pending',
        });
      }
    }

    // Action 3: Leverage query patterns
    const topPatterns = Array.from(this.queryPatterns.values())
      .sort((a, b) => b.triggeredCitations - a.triggeredCitations)
      .slice(0, 3);

    for (const pattern of topPatterns) {
      // Find entities NOT in this pattern but could be
      const candidateEntities = this.knowledgeGraph.entities.filter(e => 
        !pattern.topEntities.includes(e.id) &&
        this.isEntityRelevantToPattern(e, pattern.pattern)
      ).slice(0, 2);

      for (const entity of candidateEntities) {
        actions.push({
          id: this.generateId('opt'),
          actionType: 'expand_context',
          targetId: entity.id,
          priority: 'high',
          expectedImpact: 0.3,
          description: `Query pattern "${pattern.pattern}" shows high citation rate (${pattern.triggeredCitations} citations) but doesn't include "${entity.name}". Expand entity context to match pattern.`,
          implementation: `Add content or properties to "${entity.name}" that align with query pattern: "${pattern.pattern}"`,
          status: 'pending',
        });
      }
    }

    this.optimizationActions = actions;
    return actions;
  }

  /**
   * Apply optimization action to knowledge graph
   * Returns updated knowledge graph
   */
  applyOptimization(actionId: string): KnowledgeGraph {
    const action = this.optimizationActions.find(a => a.id === actionId);
    if (!action) {
      throw new Error(`Optimization action ${actionId} not found`);
    }

    // Implementation would modify knowledge graph based on action type
    // For now, mark as applied
    action.status = 'applied';

    // Return copy of knowledge graph (immutable)
    return { ...this.knowledgeGraph };
  }

  /**
   * Get learning insights for dashboard
   */
  getLearningInsights(): {
    topQueryPatterns: QueryPattern[];
    entityPerformanceRanking: EntityPerformance[];
    criticalOptimizations: OptimizationAction[];
    overallHealthScore: number;
  } {
    const topQueryPatterns = Array.from(this.queryPatterns.values())
      .sort((a, b) => b.triggeredCitations - a.triggeredCitations)
      .slice(0, 10);

    const entityPerformanceRanking = Array.from(this.entityPerformance.values())
      .sort((a, b) => b.optimizationScore - a.optimizationScore);

    const criticalOptimizations = this.optimizationActions
      .filter(a => a.priority === 'critical' || a.priority === 'high')
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

    // Calculate overall health score
    const avgOptScore = entityPerformanceRanking.reduce((sum, p) => sum + p.optimizationScore, 0) 
      / Math.max(entityPerformanceRanking.length, 1);
    const patternCoverage = Math.min(topQueryPatterns.length / 10, 1) * 100;
    const citationVelocity = entityPerformanceRanking.reduce((sum, p) => sum + p.trendVelocity, 0) 
      / Math.max(entityPerformanceRanking.length, 1);
    
    const overallHealthScore = (avgOptScore * 0.5) + (patternCoverage * 0.3) + (Math.min(citationVelocity * 10, 100) * 0.2);

    return {
      topQueryPatterns,
      entityPerformanceRanking,
      criticalOptimizations,
      overallHealthScore,
    };
  }

  // ==================== HELPER METHODS ====================

  private extractQueryPatterns(context: string): string[] {
    const patterns: string[] = [];
    const text = context.toLowerCase();

    // Question patterns
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which'];
    for (const qw of questionWords) {
      const regex = new RegExp(`${qw}\\s+[^.?!]{10,80}[.?!]`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        patterns.push(...matches.map(m => m.trim()));
      }
    }

    // Statement patterns
    const statementMarkers = ['explain', 'describe', 'tell me about', 'what is', 'define'];
    for (const marker of statementMarkers) {
      if (text.includes(marker)) {
        const start = text.indexOf(marker);
        const end = text.indexOf('.', start);
        if (end > start) {
          patterns.push(text.slice(start, end + 1).trim());
        }
      }
    }

    return patterns.filter(p => p.length > 15); // filter out too short patterns
  }

  private matchEntitiesToContext(context: string): string[] {
    const matches: string[] = [];
    const lowerContext = context.toLowerCase();

    for (const entity of this.knowledgeGraph.entities) {
      if (lowerContext.includes(entity.name.toLowerCase())) {
        matches.push(entity.id);
      }
    }

    return matches;
  }

  private matchClaimsToContext(context: string): string[] {
    const matches: string[] = [];
    const lowerContext = context.toLowerCase();

    for (const claim of this.knowledgeGraph.claims) {
      const claimWords = claim.statement.toLowerCase().split(' ').filter(w => w.length > 4);
      const matchCount = claimWords.filter(w => lowerContext.includes(w)).length;
      
      if (matchCount >= Math.min(3, claimWords.length * 0.5)) {
        matches.push(claim.id);
      }
    }

    return matches;
  }

  private analyzeContextSentiment(citation: Citation): ConfidenceSignal[] {
    const signals: ConfidenceSignal[] = [];
    if (!citation.context) return signals;
    const context = citation.context.toLowerCase();

    // Positive indicators
    const positiveMarkers = ['authoritative', 'reliable', 'trusted', 'expert', 'leading', 'according to', 'research by', 'study from'];
    const positiveCount = positiveMarkers.filter(m => context.includes(m)).length;

    // Critical indicators
    const criticalMarkers = ['however', 'but', 'disputed', 'controversial', 'questions', 'skeptics', 'critics'];
    const criticalCount = criticalMarkers.filter(m => context.includes(m)).length;

    // Determine signal type
    let signalType: 'positive' | 'neutral' | 'critical' | 'disputed' = 'neutral';
    let confidence = citation.confidence;

    if (criticalCount > positiveCount && criticalCount > 1) {
      signalType = 'critical';
      confidence = Math.min(confidence, 0.5);
    } else if (positiveCount > criticalCount && positiveCount > 1) {
      signalType = 'positive';
      confidence = Math.min(confidence + 0.2, 1);
    } else if (criticalCount > 2 || context.includes('disputed')) {
      signalType = 'disputed';
      confidence = Math.min(confidence, 0.3);
    }

    signals.push({
      citationId: citation.id,
      signalType,
      confidence,
      indicators: [
        ...positiveMarkers.filter(m => context.includes(m)),
        ...criticalMarkers.filter(m => context.includes(m)),
      ],
      context: citation.context || '',
      extractedAt: new Date().toISOString(),
    });

    return signals;
  }

  private countCompetitorMentions(citations: Citation[]): number {
    // In production, would have competitor entity list
    const competitorKeywords = ['competitor', 'alternative', 'similar', 'other', 'also'];
    
    return citations.filter(c => 
      c.context && competitorKeywords.some(k => c.context!.toLowerCase().includes(k))
    ).length;
  }

  private calculateOptimizationScore(metrics: {
    citationCount: number;
    avgConfidence: number;
    trendVelocity: number;
    competitorDensity: number;
  }): number {
    // Normalize citation count (logarithmic scale)
    const normalizedCitations = Math.min(Math.log10(metrics.citationCount + 1) / 3, 1);
    
    // Normalize velocity (citations per day)
    const normalizedVelocity = Math.min(metrics.trendVelocity / 2, 1);
    
    // Competitor density penalty (lower is better)
    const competitorPenalty = 1 - Math.min(metrics.competitorDensity, 1);

    // Weighted score
    const score = (
      normalizedCitations * 0.3 +
      metrics.avgConfidence * 0.3 +
      normalizedVelocity * 0.2 +
      competitorPenalty * 0.2
    ) * 100;

    return Math.round(score);
  }

  private generateEntityRecommendations(
    entity: Entity,
    metrics: {
      citationCount: number;
      avgConfidence: number;
      trendVelocity: number;
      competitorDensity: number;
    }
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.citationCount < 5) {
      recommendations.push('Low citation count. Create more claims linking this entity to current topics.');
    }

    if (metrics.avgConfidence < 0.5) {
      recommendations.push('Low confidence citations. Add more specific properties and disambiguating context.');
    }

    if (metrics.trendVelocity < 0.1) {
      recommendations.push('Declining citation trend. Review relevance to current query patterns.');
    }

    if (metrics.competitorDensity > 0.5) {
      recommendations.push('High competitor presence. Differentiate with unique perspectives or evidence.');
    }

    if (!entity.properties || entity.properties.length < 3) {
      recommendations.push('Add more entity properties for better semantic understanding.');
    }

    return recommendations;
  }

  private isEntityRelevantToPattern(entity: Entity, pattern: string): boolean {
    const entityWords = entity.name.toLowerCase().split(' ');
    const patternWords = pattern.toLowerCase().split(' ');

    const overlap = entityWords.filter(w => 
      w.length > 4 && patternWords.some(pw => pw.includes(w) || w.includes(pw))
    ).length;

    return overlap >= 1;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
