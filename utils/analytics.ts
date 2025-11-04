/**
 * GEO Analytics & Reference Rate Tracking
 * Monitors AI citations, media mentions, and GEO-specific metrics
 */

export interface ReferenceRateMetric {
  date: string;
  aiCitations: number;
  mediaMentions: number;
  sourceVisibility: number;
  authorityScore: number;
}

export interface AISource {
  name: string;
  url: string;
  citedAt: string;
  context: string;
  prominence: 'primary' | 'secondary' | 'mention';
}

export interface MediaMention {
  source: string;
  url: string;
  publishedAt: string;
  type: 'article' | 'podcast' | 'video' | 'social';
  sentiment: 'positive' | 'neutral' | 'negative';
}

/**
 * Track AI citation event
 * Call this when your content is cited in an AI response
 */
export function trackAICitation(source: AISource) {
  if (typeof window === 'undefined') return;
  
  // In production, send to analytics backend
  console.log('[GEO Analytics] AI Citation:', source);
  
  // Send to Google Analytics custom event
  if (window.gtag) {
    window.gtag('event', 'ai_citation', {
      ai_source: source.name,
      prominence: source.prominence,
      url: source.url
    });
  }
  
  // Store locally for dashboard
  const citations = getStoredCitations();
  citations.push(source);
  localStorage.setItem('geo_citations', JSON.stringify(citations.slice(-100))); // Keep last 100
}

/**
 * Track media mention
 */
export function trackMediaMention(mention: MediaMention) {
  if (typeof window === 'undefined') return;
  
  console.log('[GEO Analytics] Media Mention:', mention);
  
  if (window.gtag) {
    window.gtag('event', 'media_mention', {
      source: mention.source,
      type: mention.type,
      sentiment: mention.sentiment
    });
  }
  
  const mentions = getStoredMentions();
  mentions.push(mention);
  localStorage.setItem('geo_mentions', JSON.stringify(mentions.slice(-100)));
}

/**
 * Calculate Reference Rate for a time period
 * Reference Rate = (AI Citations + Media Mentions) / Days
 */
export function calculateReferenceRate(days: number = 30): number {
  const citations = getStoredCitations();
  const mentions = getStoredMentions();
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const recentCitations = citations.filter(c => new Date(c.citedAt) >= cutoffDate);
  const recentMentions = mentions.filter(m => new Date(m.publishedAt) >= cutoffDate);
  
  return (recentCitations.length + recentMentions.length) / days;
}

/**
 * Get authority score based on citation quality
 */
export function calculateAuthorityScore(): number {
  const citations = getStoredCitations();
  
  if (citations.length === 0) return 0;
  
  const weights = {
    primary: 10,
    secondary: 5,
    mention: 1
  };
  
  const totalScore = citations.reduce((sum, citation) => {
    return sum + weights[citation.prominence];
  }, 0);
  
  return Math.min(100, totalScore / citations.length * 10);
}

/**
 * Get GEO metrics for dashboard
 */
export function getGEOMetrics(): {
  referenceRate: number;
  totalCitations: number;
  totalMentions: number;
  authorityScore: number;
  topSources: string[];
} {
  const citations = getStoredCitations();
  const mentions = getStoredMentions();
  
  const sourceCounts = citations.reduce((acc, c) => {
    acc[c.name] = (acc[c.name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topSources = Object.entries(sourceCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([source]) => source);
  
  return {
    referenceRate: calculateReferenceRate(30),
    totalCitations: citations.length,
    totalMentions: mentions.length,
    authorityScore: calculateAuthorityScore(),
    topSources
  };
}

/**
 * Get historical metrics for charting
 */
export function getHistoricalMetrics(days: number = 90): ReferenceRateMetric[] {
  const citations = getStoredCitations();
  const mentions = getStoredMentions();
  
  const metrics: ReferenceRateMetric[] = [];
  const endDate = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(endDate);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayCitations = citations.filter(c => 
      c.citedAt.startsWith(dateStr)
    ).length;
    
    const dayMentions = mentions.filter(m => 
      m.publishedAt.startsWith(dateStr)
    ).length;
    
    metrics.push({
      date: dateStr,
      aiCitations: dayCitations,
      mediaMentions: dayMentions,
      sourceVisibility: dayCitations + dayMentions,
      authorityScore: calculateAuthorityScore()
    });
  }
  
  return metrics;
}


// Helper functions
function getStoredCitations(): AISource[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('geo_citations');
  return stored ? JSON.parse(stored) : [];
}

function getStoredMentions(): MediaMention[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('geo_mentions');
  return stored ? JSON.parse(stored) : [];
}

// Type augmentation for gtag
declare global {
  interface Window {
    gtag?: (command: string, action: string, params: Record<string, any>) => void;
  }
}
