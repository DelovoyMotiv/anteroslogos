/**
 * Competitive Intelligence Engine - Real-Time Monitor
 * CRITICAL INNOVATION: Detects when competitors get citations instead of us
 * 
 * Business Impact:
 * - Identifies competitive threats in real-time
 * - Generates counter-strategies automatically
 * - Tracks market share of voice across AI platforms
 * - Predicts when we're losing to competitors and why
 */

import type { Citation } from '../citationProof/tracker';
import type { KnowledgeGraph } from '../knowledgeGraph/builder';

// =====================================================
// TYPES
// =====================================================

export interface CompetitorProfile {
  id: string;
  domain: string;
  name: string;
  industry: string;
  added_at: string;
  tracking_enabled: boolean;
  
  // Competitive metrics
  metrics: {
    total_citations: number;
    citations_last_7d: number;
    citations_last_30d: number;
    citation_velocity: number; // citations per day
    market_share: number; // % of total citations in category
    growth_rate: number; // % change week over week
  };
  
  // Platform distribution
  platform_distribution: {
    chatgpt: number;
    claude: number;
    perplexity: number;
    gemini: number;
    meta: number;
  };
  
  // Content strategy insights
  content_strategy: {
    primary_topics: string[];
    entity_types_used: string[];
    avg_entities_per_graph: number;
    avg_claims_per_graph: number;
    relationship_density: number;
    update_frequency: string; // daily, weekly, monthly
  };
  
  // Competitive advantages
  competitive_advantages: string[];
  our_disadvantages: string[];
}

export interface CompetitiveThreat {
  id: string;
  detected_at: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  
  threat_type: 
    | 'citation_loss' // Competitor got cited for query we should have won
    | 'market_share_decline' // Losing overall market share
    | 'platform_dominance' // Competitor dominates specific platform
    | 'content_gap' // Competitor has content we don't
    | 'velocity_surge' // Competitor's citation rate spiking
    | 'quality_advantage'; // Competitor has higher quality signals
  
  competitor: CompetitorProfile;
  
  // Threat details
  details: {
    query?: string; // The query where we lost
    platform?: string;
    our_rank?: number;
    competitor_rank?: number;
    estimated_lost_reach?: number;
    estimated_lost_value?: number; // USD
  };
  
  // Why we lost
  root_causes: Array<{
    cause: string;
    confidence: number;
    evidence: string[];
  }>;
  
  // How to respond
  recommended_actions: Array<{
    action_type: 'content_creation' | 'entity_enhancement' | 'relationship_addition' | 'claim_validation' | 'platform_optimization';
    priority: 'critical' | 'high' | 'medium' | 'low';
    effort: 'quick-win' | 'strategic' | 'long-term';
    description: string;
    expected_impact: number; // 0-100%
    implementation_steps: string[];
  }>;
  
  // Status tracking
  status: 'detected' | 'analyzing' | 'action_planned' | 'implementing' | 'resolved' | 'ignored';
  assigned_to?: string;
  resolved_at?: string;
}

export interface MarketIntelligence {
  period: {
    start: string;
    end: string;
  };
  
  // Overall market metrics
  total_citations_in_category: number;
  our_citations: number;
  competitor_citations: number;
  our_market_share: number; // %
  market_share_trend: 'increasing' | 'stable' | 'decreasing';
  
  // Competitive positioning
  our_rank: number;
  total_competitors: number;
  rank_change_7d: number;
  rank_change_30d: number;
  
  // Platform analysis
  strongest_platforms: Array<{
    platform: string;
    our_share: number;
    rank: number;
  }>;
  
  weakest_platforms: Array<{
    platform: string;
    our_share: number;
    rank: number;
    opportunity_score: number;
  }>;
  
  // Threat summary
  active_threats: CompetitiveThreat[];
  threats_resolved_this_period: number;
  avg_threat_resolution_time_hours: number;
  
  // Opportunities
  opportunities: Array<{
    type: 'content_gap' | 'platform_expansion' | 'entity_type' | 'topic_expansion';
    description: string;
    potential_citations_per_month: number;
    effort_estimate: string;
    priority_score: number; // 0-100
  }>;
}

// =====================================================
// COMPETITIVE MONITOR
// =====================================================

export class CompetitiveIntelligenceMonitor {
  private competitors: Map<string, CompetitorProfile> = new Map();
  private threats: Map<string, CompetitiveThreat> = new Map();
  // @ts-ignore - ourDomain may be used in future for domain-specific logic
  constructor(private ourDomain: string) {}
  
  /**
   * Add competitor to monitoring
   */
  async addCompetitor(domain: string, name: string, industry: string): Promise<CompetitorProfile> {
    const competitor: CompetitorProfile = {
      id: this.generateId('comp'),
      domain,
      name,
      industry,
      added_at: new Date().toISOString(),
      tracking_enabled: true,
      metrics: {
        total_citations: 0,
        citations_last_7d: 0,
        citations_last_30d: 0,
        citation_velocity: 0,
        market_share: 0,
        growth_rate: 0,
      },
      platform_distribution: {
        chatgpt: 0,
        claude: 0,
        perplexity: 0,
        gemini: 0,
        meta: 0,
      },
      content_strategy: {
        primary_topics: [],
        entity_types_used: [],
        avg_entities_per_graph: 0,
        avg_claims_per_graph: 0,
        relationship_density: 0,
        update_frequency: 'unknown',
      },
      competitive_advantages: [],
      our_disadvantages: [],
    };
    
    this.competitors.set(competitor.id, competitor);
    
    // Trigger initial analysis
    await this.analyzeCompetitor(competitor.id);
    
    return competitor;
  }
  
  /**
   * Analyze competitor's strategy
   * CRITICAL: Reverse engineer their approach
   */
  private async analyzeCompetitor(competitorId: string): Promise<void> {
    const competitor = this.competitors.get(competitorId);
    if (!competitor) return;
    
    // Simulate fetching competitor's KG (in production, use web scraping + AI analysis)
    const competitorKG = await this.fetchCompetitorKnowledgeGraph(competitor.domain);
    
    if (competitorKG) {
      // Analyze content strategy
      competitor.content_strategy = {
        primary_topics: this.extractPrimaryTopics(competitorKG),
        entity_types_used: this.getEntityTypes(competitorKG),
        avg_entities_per_graph: competitorKG.entities.length,
        avg_claims_per_graph: competitorKG.claims.length,
        relationship_density: competitorKG.relationships.length / Math.max(1, competitorKG.entities.length),
        update_frequency: this.estimateUpdateFrequency(competitorKG),
      };
      
      // Identify their competitive advantages
      competitor.competitive_advantages = this.identifyAdvantages(competitorKG);
    }
  }
  
  /**
   * Detect when competitor gets citation we should have won
   * CRITICAL: Real-time threat detection
   */
  async detectCompetitiveThreat(
    query: string,
    aiResponse: string,
    platform: string,
    ourGraph: KnowledgeGraph
  ): Promise<CompetitiveThreat | null> {
    // Check if any competitor is cited in response
    const citedCompetitor = this.findCitedCompetitor(aiResponse);
    
    if (!citedCompetitor) {
      return null; // No competitor cited
    }
    
    // Check if we could have won this citation
    const shouldHaveWon = this.shouldWeHaveWon(query, ourGraph, citedCompetitor);
    
    if (!shouldHaveWon.yes) {
      return null; // We didn't have relevant content
    }
    
    // Create threat
    const threat: CompetitiveThreat = {
      id: this.generateId('threat'),
      detected_at: new Date().toISOString(),
      severity: this.calculateThreatSeverity(query, platform, citedCompetitor),
      threat_type: 'citation_loss',
      competitor: citedCompetitor,
      details: {
        query,
        platform,
        our_rank: shouldHaveWon.ourRank,
        competitor_rank: 1,
        estimated_lost_reach: 100, // Conservative estimate
        estimated_lost_value: 1.0, // $1 CPM
      },
      root_causes: this.analyzeRootCauses(query, ourGraph, citedCompetitor, aiResponse, platform),
      recommended_actions: this.generateCounterStrategy(query, ourGraph, citedCompetitor),
      status: 'detected',
    };
    
    this.threats.set(threat.id, threat);
    
    return threat;
  }
  
  /**
   * Analyze why competitor won and we didn't
   */
  private analyzeRootCauses(
    query: string,
    ourGraph: KnowledgeGraph,
    competitor: CompetitorProfile,
    aiResponse: string,
    platform?: string
  ): Array<{ cause: string; confidence: number; evidence: string[] }> {
    const causes: Array<{ cause: string; confidence: number; evidence: string[] }> = [];
    
    // Cause 1: Entity match quality
    const queryEntities = this.extractEntitiesFromQuery(query);
    const ourEntityMatch = this.calculateEntityMatch(queryEntities, ourGraph.entities);
    const competitorEntityMatch = competitor.content_strategy.avg_entities_per_graph > ourGraph.entities.length ? 0.8 : 0.6;
    
    if (competitorEntityMatch > ourEntityMatch) {
      causes.push({
        cause: 'Entity coverage gap',
        confidence: 0.85,
        evidence: [
          `Competitor has ${competitor.content_strategy.avg_entities_per_graph} entities on average`,
          `Our graph has ${ourGraph.entities.length} entities`,
          `Query requires entities: ${queryEntities.join(', ')}`,
        ],
      });
    }
    
    // Cause 2: Claim validation
    const citationMarkers = (aiResponse.match(/\[|\(citation|according to|based on/gi) || []).length;
    if (citationMarkers > 3) {
      causes.push({
        cause: 'Insufficient validated claims',
        confidence: 0.75,
        evidence: [
          `AI response contains ${citationMarkers} citation markers`,
          `Competitor likely has more validated claims`,
          `Our graph has ${ourGraph.claims.length} claims`,
        ],
      });
    }
    
    // Cause 3: Content freshness
    const queryDate = this.extractDateFromQuery(query);
    if (queryDate) {
      causes.push({
        cause: 'Content recency advantage',
        confidence: 0.7,
        evidence: [
          `Query asks about recent information: ${queryDate}`,
          `Competitor update frequency: ${competitor.content_strategy.update_frequency}`,
          `Our last update: ${ourGraph.metadata.createdAt}`,
        ],
      });
    }
    
    // Cause 4: Platform optimization
    if (platform) {
      const platformKey = platform as keyof typeof competitor.platform_distribution;
      const platformOptimized = this.isCompetitorPlatformOptimized(competitor, platformKey);
      if (platformOptimized) {
        causes.push({
          cause: 'Platform-specific optimization',
          confidence: 0.8,
          evidence: [
            `Competitor has strong presence on ${platformKey}`,
            `${competitor.platform_distribution[platformKey]} citations on this platform`,
          ],
        });
      }
    }
    
    return causes;
  }
  
  /**
   * Generate counter-strategy to win back citations
   */
  private generateCounterStrategy(
    query: string,
    ourGraph: KnowledgeGraph,
    competitor: CompetitorProfile
  ): Array<{
    action_type: 'content_creation' | 'entity_enhancement' | 'relationship_addition' | 'claim_validation' | 'platform_optimization';
    priority: 'critical' | 'high' | 'medium' | 'low';
    effort: 'quick-win' | 'strategic' | 'long-term';
    description: string;
    expected_impact: number;
    implementation_steps: string[];
  }> {
    const actions = [];
    
    // Action 1: Add missing entities
    const missingEntities = this.identifyMissingEntities(query, ourGraph, competitor);
    if (missingEntities.length > 0) {
      actions.push({
        action_type: 'entity_enhancement' as const,
        priority: 'critical' as const,
        effort: 'quick-win' as const,
        description: `Add ${missingEntities.length} high-value entities to knowledge graph`,
        expected_impact: 25,
        implementation_steps: [
          `Research and add entities: ${missingEntities.slice(0, 3).join(', ')}`,
          'Extract relationships between new and existing entities',
          'Add supporting claims with evidence',
          'Sync to all AI platforms within 60 seconds',
        ],
      });
    }
    
    // Action 2: Enhance existing content
    actions.push({
      action_type: 'claim_validation' as const,
      priority: 'high' as const,
      effort: 'strategic' as const,
      description: 'Strengthen claims with additional evidence and citations',
      expected_impact: 20,
      implementation_steps: [
        'Identify top 10 most-cited claims in category',
        'Add 3-5 evidence sources per claim',
        'Include quantitative data points',
        'Add temporal context for recency',
      ],
    });
    
    // Action 3: Platform-specific optimization
    actions.push({
      action_type: 'platform_optimization' as const,
      priority: 'high' as const,
      effort: 'quick-win' as const,
      description: 'Optimize knowledge graph for specific platform preferences',
      expected_impact: 15,
      implementation_steps: [
        'Analyze platform citation patterns',
        'Format entities according to platform preferences',
        'Add platform-specific metadata',
        'Test citation probability on platform',
      ],
    });
    
    return actions;
  }
  
  /**
   * Generate market intelligence report
   */
  async generateMarketIntelligence(
    startDate: Date,
    endDate: Date,
    ourCitations: Citation[]
  ): Promise<MarketIntelligence> {
    const periodCitations = ourCitations.filter(c => {
      const citDate = new Date(c.timestamp);
      return citDate >= startDate && citDate <= endDate;
    });
    
    // Calculate competitor citations (simulated - in production, track via API)
    const totalCitationsInCategory = this.estimateTotalMarketCitations(periodCitations.length);
    const competitorCitations = totalCitationsInCategory - periodCitations.length;
    
    const ourMarketShare = (periodCitations.length / totalCitationsInCategory) * 100;
    
    // Get active threats
    const activeThreats = Array.from(this.threats.values())
      .filter(t => t.status !== 'resolved' && t.status !== 'ignored');
    
    // Calculate platform strengths
    const platformCounts: Record<string, number> = {};
    periodCitations.forEach(c => {
      platformCounts[c.source] = (platformCounts[c.source] || 0) + 1;
    });
    
    const strongestPlatforms = Object.entries(platformCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([platform, count], index) => ({
        platform,
        our_share: (count / periodCitations.length) * 100,
        rank: index + 1,
      }));
    
    return {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      total_citations_in_category: totalCitationsInCategory,
      our_citations: periodCitations.length,
      competitor_citations: competitorCitations,
      our_market_share: ourMarketShare,
      market_share_trend: this.calculateMarketShareTrend(ourMarketShare),
      our_rank: this.calculateOurRank(ourMarketShare),
      total_competitors: this.competitors.size,
      rank_change_7d: 0, // Calculate from historical data
      rank_change_30d: 0,
      strongest_platforms: strongestPlatforms,
      weakest_platforms: this.identifyWeakPlatforms(platformCounts, periodCitations.length),
      active_threats: activeThreats,
      threats_resolved_this_period: 0,
      avg_threat_resolution_time_hours: 24,
      opportunities: this.identifyOpportunities(periodCitations, Array.from(this.competitors.values())),
    };
  }
  
  // =====================================================
  // HELPER METHODS
  // =====================================================
  
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
  
  private async fetchCompetitorKnowledgeGraph(_domain: string): Promise<KnowledgeGraph | null> {
    // Production: Web scraping + AI analysis of competitor content
    // For now, return mock structure
    return null;
  }
  
  private extractPrimaryTopics(_kg: KnowledgeGraph): string[] {
    // Extract from entities and claims
    return [];
  }
  
  private getEntityTypes(kg: KnowledgeGraph): string[] {
    return [...new Set(kg.entities.map(e => e.type))];
  }
  
  private estimateUpdateFrequency(_kg: KnowledgeGraph): string {
    // Analyze metadata timestamps
    return 'weekly';
  }
  
  private identifyAdvantages(kg: KnowledgeGraph): string[] {
    const advantages: string[] = [];
    
    if (kg.entities.length > 100) {
      advantages.push('Extensive entity coverage');
    }
    
    if (kg.claims.length > 50) {
      advantages.push('Rich claim validation');
    }
    
    if (kg.relationships.length / kg.entities.length > 2) {
      advantages.push('High relationship density');
    }
    
    return advantages;
  }
  
  private findCitedCompetitor(aiResponse: string): CompetitorProfile | null {
    for (const competitor of this.competitors.values()) {
      if (aiResponse.toLowerCase().includes(competitor.domain.toLowerCase()) ||
          aiResponse.toLowerCase().includes(competitor.name.toLowerCase())) {
        return competitor;
      }
    }
    return null;
  }
  
  private shouldWeHaveWon(
    query: string,
    ourGraph: KnowledgeGraph,
    _competitor: CompetitorProfile
  ): { yes: boolean; ourRank: number } {
    // Check if we have relevant entities
    const queryEntities = this.extractEntitiesFromQuery(query);
    const matchScore = this.calculateEntityMatch(queryEntities, ourGraph.entities);
    
    return {
      yes: matchScore > 0.3,
      ourRank: matchScore > 0.5 ? 2 : 3,
    };
  }
  
  private extractEntitiesFromQuery(query: string): string[] {
    // Simple extraction - capitalize words that look like entities
    const words = query.split(' ');
    return words.filter(w => /^[A-Z]/.test(w));
  }
  
  private calculateEntityMatch(queryEntities: string[], graphEntities: any[]): number {
    if (queryEntities.length === 0) return 0;
    
    let matchCount = 0;
    for (const qe of queryEntities) {
      if (graphEntities.some(ge => ge.name.includes(qe) || qe.includes(ge.name))) {
        matchCount++;
      }
    }
    
    return matchCount / queryEntities.length;
  }
  
  private calculateThreatSeverity(
    query: string,
    _platform: string,
    competitor: CompetitorProfile
  ): 'critical' | 'high' | 'medium' | 'low' {
    // High-value query + strong competitor = critical
    if (query.length > 50 && competitor.metrics.market_share > 20) {
      return 'critical';
    }
    
    if (competitor.metrics.citation_velocity > 10) {
      return 'high';
    }
    
    return 'medium';
  }
  
  private extractDateFromQuery(query: string): string | null {
    const datePatterns = /\b(202[0-9]|recent|latest|new|current)\b/i;
    return query.match(datePatterns)?.[0] || null;
  }
  
  private isCompetitorPlatformOptimized(competitor: CompetitorProfile, platform: string): boolean {
    const platformKey = platform as keyof typeof competitor.platform_distribution;
    return competitor.platform_distribution[platformKey] > 10;
  }
  
  private identifyMissingEntities(
    _query: string,
    ourGraph: KnowledgeGraph,
    competitor: CompetitorProfile
  ): string[] {
    // Compare competitor's entity types to ours
    const ourTypes = new Set(ourGraph.entities.map(e => e.type));
    const missingTypes = competitor.content_strategy.entity_types_used
      .filter(t => !ourTypes.has(t as any));
    
    return missingTypes.slice(0, 5);
  }
  
  private estimateTotalMarketCitations(ourCount: number): number {
    // Estimate based on typical market share
    // Assume we have 15% market share
    return Math.round(ourCount / 0.15);
  }
  
  private calculateMarketShareTrend(_currentShare: number): 'increasing' | 'stable' | 'decreasing' {
    // Compare to historical - for now return stable
    return 'stable';
  }
  
  private calculateOurRank(marketShare: number): number {
    if (marketShare > 30) return 1;
    if (marketShare > 20) return 2;
    if (marketShare > 10) return 3;
    return 4;
  }
  
  private identifyWeakPlatforms(
    platformCounts: Record<string, number>,
    totalCitations: number
  ): Array<{ platform: string; our_share: number; rank: number; opportunity_score: number }> {
    const platforms = ['chatgpt', 'claude', 'perplexity', 'gemini', 'meta'];
    
    return platforms
      .filter(p => !platformCounts[p] || platformCounts[p] < totalCitations * 0.1)
      .map(p => ({
        platform: p,
        our_share: platformCounts[p] ? (platformCounts[p] / totalCitations) * 100 : 0,
        rank: 5,
        opportunity_score: 75,
      }));
  }
  
  private identifyOpportunities(
    citations: Citation[],
    _competitors: CompetitorProfile[]
  ): Array<{
    type: 'content_gap' | 'platform_expansion' | 'entity_type' | 'topic_expansion';
    description: string;
    potential_citations_per_month: number;
    effort_estimate: string;
    priority_score: number;
  }> {
    const opportunities = [];
    
    // Opportunity 1: Platform expansion
    const platformCounts: Record<string, number> = {};
    citations.forEach(c => {
      platformCounts[c.source] = (platformCounts[c.source] || 0) + 1;
    });
    
    if (!platformCounts['gemini'] || platformCounts['gemini'] < 5) {
      opportunities.push({
        type: 'platform_expansion' as const,
        description: 'Expand to Google Gemini platform - currently underserved',
        potential_citations_per_month: 50,
        effort_estimate: '2 weeks',
        priority_score: 85,
      });
    }
    
    return opportunities;
  }
}
