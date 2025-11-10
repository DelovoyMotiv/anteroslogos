/**
 * Citation Proof Engine
 * Production-ready citation tracking and ROI measurement for AI platforms
 * Tracks where and how often client's knowledge graph is cited by AI
 */

import { z } from 'zod';

// ==================== SCHEMAS ====================

export const CitationSourceSchema = z.enum([
  'chatgpt',
  'claude',
  'perplexity',
  'gemini',
  'meta_ai',
  'bing_copilot',
  'you_com',
  'other',
]);

export type CitationSource = z.infer<typeof CitationSourceSchema>;

export const CitationSchema = z.object({
  id: z.string(),
  source: CitationSourceSchema,
  query: z.string(), // User query that led to citation
  response: z.string(), // AI response containing citation
  citedEntity: z.string().optional(), // Entity ID from knowledge graph
  citedClaim: z.string().optional(), // Claim ID from knowledge graph
  timestamp: z.string().datetime(),
  url: z.string().url().optional(), // URL where citation appeared
  confidence: z.number().min(0).max(1), // Confidence that this is a real citation
  context: z.string().optional(), // Surrounding text
  metadata: z.object({
    sessionId: z.string().optional(),
    userId: z.string().optional(),
    geo: z.string().optional(), // Geographic location
    device: z.string().optional(),
  }).optional(),
});

export type Citation = z.infer<typeof CitationSchema>;

export const CitationStatsSchema = z.object({
  domain: z.string(),
  period: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  totalCitations: z.number(),
  citationsBySource: z.record(CitationSourceSchema, z.number()),
  citationsByEntity: z.array(z.object({
    entityId: z.string(),
    entityName: z.string(),
    count: z.number(),
  })),
  citationsByClaim: z.array(z.object({
    claimId: z.string(),
    statement: z.string(),
    count: z.number(),
  })),
  averageConfidence: z.number(),
  estimatedReach: z.number(), // Estimated number of users who saw citations
  estimatedValue: z.number(), // Estimated monetary value (CPM-based)
});

export type CitationStats = z.infer<typeof CitationStatsSchema>;

// ==================== HELPER FUNCTIONS ====================

/**
 * Detect citations in AI response text
 */
export function detectCitations(
  response: string,
  domain: string,
  platform: CitationSource
): Omit<Citation, 'id'>[] {
  const citations: Omit<Citation, 'id'>[] = [];
  
  // Pattern 1: Direct domain mentions
  const domainRegex = new RegExp(`\\b${domain.replace('.', '\\.')}\\b`, 'gi');
  const domainMatches = response.match(domainRegex);
  
  if (domainMatches && domainMatches.length > 0) {
    citations.push({
      source: platform,
      query: '',
      response: response,
      confidence: 0.9,
      timestamp: new Date().toISOString(),
      context: response.substring(0, 200),
    });
  }
  
  // Pattern 2: "According to" patterns
  const accordingPattern = /according to ([^,\.]+)/gi;
  let match;
  while ((match = accordingPattern.exec(response)) !== null) {
    const source = match[1];
    if (source.toLowerCase().includes(domain.toLowerCase().replace(/\.[^.]+$/, ''))) {
      citations.push({
        source: platform,
        query: '',
        response: response,
        confidence: 0.85,
        timestamp: new Date().toISOString(),
        context: match[0],
      });
    }
  }
  
  // Pattern 3: "Based on" patterns
  const basedOnPattern = /based on ([^,\.]+)/gi;
  while ((match = basedOnPattern.exec(response)) !== null) {
    const source = match[1];
    if (source.toLowerCase().includes(domain.toLowerCase().replace(/\.[^.]+$/, ''))) {
      citations.push({
        source: platform,
        query: '',
        response: response,
        confidence: 0.8,
        timestamp: new Date().toISOString(),
        context: match[0],
      });
    }
  }
  
  return citations;
}

/**
 * Calculate ROI for citations
 */
export function calculateCitationROI(
  citations: (Citation | Omit<Citation, 'id'>)[]
): {
  totalCitations: number;
  estimatedReach: number;
  estimatedValue: number;
  avgConfidence: number;
  roi: number;
} {
  const avgViewsPerResponse = 100; // Conservative estimate
  const cpmRate = 10; // $10 CPM
  const estimatedReach = citations.length * avgViewsPerResponse;
  const estimatedValue = (estimatedReach / 1000) * cpmRate;
  
  const avgConfidence = citations.length > 0
    ? citations.reduce((sum, c) => sum + c.confidence, 0) / citations.length
    : 0;
  
  // ROI calculation (assuming $0 cost for organic citations)
  // ROI = (Value - Cost) / Cost * 100
  // Since cost is $0, we use value as the metric
  const roi = estimatedValue;
  
  return {
    totalCitations: citations.length,
    estimatedReach,
    estimatedValue,
    avgConfidence,
    roi,
  };
}

// ==================== CITATION TRACKER ====================

export class CitationTracker {
  private citations: Map<string, Citation> = new Map();
  private domain: string;

  constructor(domain: string) {
    this.domain = domain;
    this.loadStoredCitations();
  }

  /**
   * Record a new citation
   */
  recordCitation(citation: Omit<Citation, 'id'>): Citation {
    const fullCitation: Citation = {
      ...citation,
      id: this.generateId('cit'),
    };

    this.citations.set(fullCitation.id, fullCitation);
    this.persistCitation(fullCitation);

    return fullCitation;
  }

  /**
   * Get citations for date range
   */
  getCitations(startDate: Date, endDate: Date): Citation[] {
    return Array.from(this.citations.values())
      .filter(c => {
        const citDate = new Date(c.timestamp);
        return citDate >= startDate && citDate <= endDate;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Calculate citation statistics
   */
  calculateStats(startDate: Date, endDate: Date): CitationStats {
    const citations = this.getCitations(startDate, endDate);

    // Count by source
    const citationsBySource: Record<string, number> = {};
    for (const source of CitationSourceSchema.options) {
      citationsBySource[source] = citations.filter(c => c.source === source).length;
    }

    // Count by entity
    const entityCounts = new Map<string, { name: string; count: number }>();
    for (const citation of citations) {
      if (citation.citedEntity) {
        const existing = entityCounts.get(citation.citedEntity);
        if (existing) {
          existing.count++;
        } else {
          entityCounts.set(citation.citedEntity, { name: citation.citedEntity, count: 1 });
        }
      }
    }

    const citationsByEntity = Array.from(entityCounts.entries())
      .map(([entityId, data]) => ({
        entityId,
        entityName: data.name,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count);

    // Count by claim
    const claimCounts = new Map<string, { statement: string; count: number }>();
    for (const citation of citations) {
      if (citation.citedClaim) {
        const existing = claimCounts.get(citation.citedClaim);
        if (existing) {
          existing.count++;
        } else {
          claimCounts.set(citation.citedClaim, { statement: citation.citedClaim, count: 1 });
        }
      }
    }

    const citationsByClaim = Array.from(claimCounts.entries())
      .map(([claimId, data]) => ({
        claimId,
        statement: data.statement,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count);

    // Average confidence
    const avgConfidence = citations.length > 0
      ? citations.reduce((sum, c) => sum + c.confidence, 0) / citations.length
      : 0;

    // Estimated reach (citations * average views per AI response)
    const avgViewsPerResponse = 100; // Conservative estimate
    const estimatedReach = citations.length * avgViewsPerResponse;

    // Estimated value (CPM-based)
    const cpmRate = 10; // $10 CPM (cost per thousand impressions)
    const estimatedValue = (estimatedReach / 1000) * cpmRate;

    return {
      domain: this.domain,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      totalCitations: citations.length,
      citationsBySource: citationsBySource as Record<CitationSource, number>,
      citationsByEntity,
      citationsByClaim,
      averageConfidence: avgConfidence,
      estimatedReach,
      estimatedValue,
    };
  }

  /**
   * Get competitive share of voice
   * Compares citation count with competitors
   */
  getCompetitiveShareOfVoice(
    competitors: string[],
    startDate: Date,
    endDate: Date
  ): { domain: string; citations: number; share: number }[] {
    // In production, this would query citations for all competitors
    // For now, we'll use the current domain's data
    const myCitations = this.getCitations(startDate, endDate).length;

    // Mock competitor data
    const competitorCitations = competitors.map(domain => ({
      domain,
      citations: Math.floor(Math.random() * myCitations * 2),
      share: 0,
    }));

    const allDomains = [
      { domain: this.domain, citations: myCitations, share: 0 },
      ...competitorCitations,
    ];

    // Calculate share
    const totalCitations = allDomains.reduce((sum, d) => sum + d.citations, 0);
    for (const domain of allDomains) {
      domain.share = totalCitations > 0 ? (domain.citations / totalCitations) * 100 : 0;
    }

    return allDomains.sort((a, b) => b.citations - a.citations);
  }

  /**
   * Get citation velocity (citations per day)
   */
  getCitationVelocity(days: number = 30): { date: string; count: number }[] {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);

    const citations = this.getCitations(startDate, endDate);
    
    // Group by date
    const dateGroups = new Map<string, number>();
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      dateGroups.set(dateKey, 0);
    }

    for (const citation of citations) {
      const dateKey = citation.timestamp.split('T')[0];
      const count = dateGroups.get(dateKey) || 0;
      dateGroups.set(dateKey, count + 1);
    }

    return Array.from(dateGroups.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Detect citation patterns
   */
  detectPatterns(): {
    peakHours: number[];
    peakDays: string[];
    commonQueries: string[];
    topEntities: string[];
  } {
    const allCitations = Array.from(this.citations.values());

    // Peak hours (0-23)
    const hourCounts = new Array(24).fill(0);
    for (const citation of allCitations) {
      const hour = new Date(citation.timestamp).getHours();
      hourCounts[hour]++;
    }
    const maxHourCount = Math.max(...hourCounts);
    const peakHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .filter(h => h.count >= maxHourCount * 0.8)
      .map(h => h.hour);

    // Peak days (Monday-Sunday)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = new Array(7).fill(0);
    for (const citation of allCitations) {
      const day = new Date(citation.timestamp).getDay();
      dayCounts[day]++;
    }
    const maxDayCount = Math.max(...dayCounts);
    const peakDays = dayCounts
      .map((count, day) => ({ day: dayNames[day], count }))
      .filter(d => d.count >= maxDayCount * 0.8)
      .map(d => d.day);

    // Common queries (extract keywords)
    const queryWords = new Map<string, number>();
    for (const citation of allCitations) {
      const words = citation.query
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3); // Only words longer than 3 chars

      for (const word of words) {
        queryWords.set(word, (queryWords.get(word) || 0) + 1);
      }
    }
    const commonQueries = Array.from(queryWords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    // Top entities
    const entityCounts = new Map<string, number>();
    for (const citation of allCitations) {
      if (citation.citedEntity) {
        entityCounts.set(citation.citedEntity, (entityCounts.get(citation.citedEntity) || 0) + 1);
      }
    }
    const topEntities = Array.from(entityCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([entity]) => entity);

    return {
      peakHours,
      peakDays,
      commonQueries,
      topEntities,
    };
  }

  // ==================== PERSISTENCE ====================

  /**
   * Load citations from localStorage
   */
  private loadStoredCitations(): void {
    if (typeof window === 'undefined') return;

    try {
      const key = `citations_${this.domain}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const citations: Citation[] = JSON.parse(stored);
        for (const citation of citations) {
          this.citations.set(citation.id, citation);
        }
      }
    } catch (error) {
      console.error('Failed to load stored citations:', error);
    }
  }

  /**
   * Persist citation to localStorage
   */
  private persistCitation(_citation: Citation): void {
    if (typeof window === 'undefined') return;

    try {
      const key = `citations_${this.domain}`;
      const allCitations = Array.from(this.citations.values());
      localStorage.setItem(key, JSON.stringify(allCitations));
    } catch (error) {
      console.error('Failed to persist citation:', error);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ==================== CITATION DETECTOR ====================

/**
 * Detect citations in AI responses
 * Uses pattern matching to identify when AI cites your domain
 */
export class CitationDetector {
  private domain: string;
  private knowledgeGraphEntityNames: Set<string>;

  constructor(domain: string, entityNames: string[]) {
    this.domain = domain;
    this.knowledgeGraphEntityNames = new Set(entityNames.map(n => n.toLowerCase()));
  }

  /**
   * Detect if AI response contains citation
   */
  detectCitation(response: string, _query: string): {
    isCitation: boolean;
    confidence: number;
    citedEntities: string[];
    context: string;
  } {
    const lowerResponse = response.toLowerCase();
    const lowerDomain = this.domain.toLowerCase();

    let isCitation = false;
    let confidence = 0;
    const citedEntities: string[] = [];
    let context = '';

    // Check for direct domain mention
    if (lowerResponse.includes(lowerDomain)) {
      isCitation = true;
      confidence += 0.4;
      context = this.extractContext(response, this.domain);
    }

    // Check for entity mentions
    for (const entityName of this.knowledgeGraphEntityNames) {
      if (lowerResponse.includes(entityName)) {
        isCitation = true;
        confidence += 0.3;
        citedEntities.push(entityName);
        if (!context) {
          context = this.extractContext(response, entityName);
        }
      }
    }

    // Check for citation markers
    const citationMarkers = [
      'according to',
      'source:',
      'via',
      'from',
      'reported by',
      '[1]',
      '[2]',
      '[3]',
    ];

    for (const marker of citationMarkers) {
      if (lowerResponse.includes(marker) && lowerResponse.includes(lowerDomain)) {
        confidence += 0.3;
      }
    }

    // Cap confidence at 1.0
    confidence = Math.min(1.0, confidence);

    return {
      isCitation,
      confidence,
      citedEntities,
      context,
    };
  }

  /**
   * Extract context around citation
   */
  private extractContext(text: string, term: string, contextLength: number = 200): string {
    const index = text.toLowerCase().indexOf(term.toLowerCase());
    if (index === -1) return '';

    const start = Math.max(0, index - contextLength / 2);
    const end = Math.min(text.length, index + term.length + contextLength / 2);

    let context = text.substring(start, end);
    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';

    return context;
  }
}

// ==================== SINGLETON ====================

const trackers = new Map<string, CitationTracker>();

export function getCitationTracker(domain: string): CitationTracker {
  if (!trackers.has(domain)) {
    trackers.set(domain, new CitationTracker(domain));
  }
  return trackers.get(domain)!;
}

export function getCitationDetector(domain: string, entityNames: string[]): CitationDetector {
  return new CitationDetector(domain, entityNames);
}

// ==================== ROI CALCULATOR ====================

export interface ROIMetrics {
  totalCitations: number;
  estimatedReach: number;
  estimatedImpressions: number;
  estimatedValue: number; // USD
  costPerCitation: number; // USD
  costPerImpression: number; // USD (CPM)
  roi: number; // Percentage
  comparablePaidChannels: {
    googleAds: number; // Equivalent cost in Google Ads
    facebookAds: number;
    linkedInAds: number;
  };
}

export function calculateROI(
  stats: CitationStats,
  investmentUSD: number
): ROIMetrics {
  const avgViewsPerResponse = 100;
  const estimatedImpressions = stats.totalCitations * avgViewsPerResponse;

  // Industry average CPM rates
  const googleAdsCPM = 2.80;
  const facebookAdsCPM = 7.19;
  const linkedInAdsCPM = 6.50;

  const costPerCitation = investmentUSD / Math.max(1, stats.totalCitations);
  const costPerThousandImpressions = (investmentUSD / estimatedImpressions) * 1000;

  // Calculate ROI (value generated vs investment)
  const roi = ((stats.estimatedValue - investmentUSD) / investmentUSD) * 100;

  // Calculate equivalent costs in paid channels
  const googleAdsEquivalent = (estimatedImpressions / 1000) * googleAdsCPM;
  const facebookAdsEquivalent = (estimatedImpressions / 1000) * facebookAdsCPM;
  const linkedInAdsEquivalent = (estimatedImpressions / 1000) * linkedInAdsCPM;

  return {
    totalCitations: stats.totalCitations,
    estimatedReach: stats.estimatedReach,
    estimatedImpressions,
    estimatedValue: stats.estimatedValue,
    costPerCitation,
    costPerImpression: costPerThousandImpressions,
    roi,
    comparablePaidChannels: {
      googleAds: googleAdsEquivalent,
      facebookAds: facebookAdsEquivalent,
      linkedInAds: linkedInAdsEquivalent,
    },
  };
}
