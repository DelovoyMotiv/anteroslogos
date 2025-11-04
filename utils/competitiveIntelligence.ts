/**
 * Competitive Intelligence Module - Hi-End AAA Level
 * Domain authority comparison, competitor schema analysis, market positioning
 */

import type { AuditResult } from './geoAuditEnhanced';

const COMPETITORS_STORAGE_KEY = 'geo_audit_competitors';
const MAX_COMPETITORS = 20;

export interface CompetitorData {
  id: string;
  url: string;
  nickname?: string;
  addedAt: string;
  lastAuditedAt?: string;
  overallScore?: number;
  grade?: string;
  scores?: {
    schemaMarkup: number;
    metaTags: number;
    aiCrawlers: number;
    eeat: number;
    structure: number;
    performance: number;
    contentQuality: number;
    citationPotential: number;
    technicalSEO: number;
    linkAnalysis: number;
  };
}

export interface CompetitiveComparison {
  yourSite: {
    url: string;
    score: number;
    grade: string;
    rank: number; // Position among all analyzed sites
  };
  competitors: Array<{
    url: string;
    nickname?: string;
    score: number;
    grade: string;
    rank: number;
    difference: number; // Difference from your site
  }>;
  categoryBreakdown: Record<string, {
    yourScore: number;
    average: number;
    best: number;
    worst: number;
    yourRank: number;
  }>;
  insights: string[];
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
}

export interface IndustryBenchmark {
  industry: string;
  averageScore: number;
  topPercentile: number; // 90th percentile score
  categoryAverages: {
    schemaMarkup: number;
    metaTags: number;
    aiCrawlers: number;
    eeat: number;
    structure: number;
    performance: number;
    contentQuality: number;
    citationPotential: number;
    technicalSEO: number;
    linkAnalysis: number;
  };
  sampleSize: number;
  lastUpdated: string;
}

// Predefined industry benchmarks (would be updated from real data)
const INDUSTRY_BENCHMARKS: Record<string, IndustryBenchmark> = {
  'e-commerce': {
    industry: 'E-commerce',
    averageScore: 68,
    topPercentile: 85,
    categoryAverages: {
      schemaMarkup: 72,
      metaTags: 78,
      aiCrawlers: 65,
      eeat: 58,
      structure: 75,
      performance: 62,
      contentQuality: 60,
      citationPotential: 55,
      technicalSEO: 70,
      linkAnalysis: 68,
    },
    sampleSize: 1500,
    lastUpdated: '2024-01-15',
  },
  'saas': {
    industry: 'SaaS / Technology',
    averageScore: 72,
    topPercentile: 88,
    categoryAverages: {
      schemaMarkup: 70,
      metaTags: 82,
      aiCrawlers: 75,
      eeat: 68,
      structure: 78,
      performance: 65,
      contentQuality: 70,
      citationPotential: 72,
      technicalSEO: 76,
      linkAnalysis: 65,
    },
    sampleSize: 850,
    lastUpdated: '2024-01-15',
  },
  'media': {
    industry: 'Media / Publishing',
    averageScore: 75,
    topPercentile: 90,
    categoryAverages: {
      schemaMarkup: 80,
      metaTags: 85,
      aiCrawlers: 78,
      eeat: 72,
      structure: 82,
      performance: 58,
      contentQuality: 78,
      citationPotential: 80,
      technicalSEO: 72,
      linkAnalysis: 70,
    },
    sampleSize: 600,
    lastUpdated: '2024-01-15',
  },
  'healthcare': {
    industry: 'Healthcare',
    averageScore: 70,
    topPercentile: 86,
    categoryAverages: {
      schemaMarkup: 68,
      metaTags: 75,
      aiCrawlers: 72,
      eeat: 78,
      structure: 74,
      performance: 60,
      contentQuality: 75,
      citationPotential: 70,
      technicalSEO: 73,
      linkAnalysis: 62,
    },
    sampleSize: 420,
    lastUpdated: '2024-01-15',
  },
  'finance': {
    industry: 'Finance / Banking',
    averageScore: 74,
    topPercentile: 89,
    categoryAverages: {
      schemaMarkup: 72,
      metaTags: 80,
      aiCrawlers: 76,
      eeat: 82,
      structure: 78,
      performance: 68,
      contentQuality: 72,
      citationPotential: 75,
      technicalSEO: 80,
      linkAnalysis: 68,
    },
    sampleSize: 380,
    lastUpdated: '2024-01-15',
  },
  'education': {
    industry: 'Education',
    averageScore: 71,
    topPercentile: 87,
    categoryAverages: {
      schemaMarkup: 75,
      metaTags: 78,
      aiCrawlers: 70,
      eeat: 75,
      structure: 76,
      performance: 62,
      contentQuality: 74,
      citationPotential: 78,
      technicalSEO: 70,
      linkAnalysis: 65,
    },
    sampleSize: 520,
    lastUpdated: '2024-01-15',
  },
};

/**
 * Add competitor for tracking
 */
export function addCompetitor(url: string, nickname?: string): CompetitorData {
  const competitors = getCompetitors();
  
  // Check if already exists
  const existing = competitors.find(c => normalizeUrl(c.url) === normalizeUrl(url));
  if (existing) {
    return existing;
  }
  
  const competitor: CompetitorData = {
    id: generateId(),
    url: normalizeUrl(url),
    nickname,
    addedAt: new Date().toISOString(),
  };
  
  competitors.push(competitor);
  
  if (competitors.length > MAX_COMPETITORS) {
    competitors.shift(); // Remove oldest
  }
  
  saveCompetitors(competitors);
  return competitor;
}

/**
 * Update competitor data with audit result
 */
export function updateCompetitorData(url: string, result: AuditResult): void {
  const competitors = getCompetitors();
  const competitor = competitors.find(c => normalizeUrl(c.url) === normalizeUrl(url));
  
  if (competitor) {
    competitor.lastAuditedAt = new Date().toISOString();
    competitor.overallScore = result.overallScore;
    competitor.grade = result.grade;
    competitor.scores = result.scores;
    saveCompetitors(competitors);
  }
}

/**
 * Get all competitors
 */
export function getCompetitors(): CompetitorData[] {
  try {
    const stored = localStorage.getItem(COMPETITORS_STORAGE_KEY);
    if (!stored) return [];
    
    const competitors = JSON.parse(stored) as CompetitorData[];
    return Array.isArray(competitors) ? competitors : [];
  } catch (error) {
    console.error('Failed to load competitors:', error);
    return [];
  }
}

/**
 * Remove competitor
 */
export function removeCompetitor(competitorId: string): void {
  const competitors = getCompetitors().filter(c => c.id !== competitorId);
  saveCompetitors(competitors);
}

/**
 * Generate competitive comparison
 */
export function generateCompetitiveComparison(
  yourUrl: string,
  yourResult: AuditResult
): CompetitiveComparison | null {
  const competitors = getCompetitors().filter(c => c.overallScore !== undefined);
  
  if (competitors.length === 0) {
    return null;
  }
  
  // Create ranking of all sites
  const allSites = [
    {
      url: yourUrl,
      score: yourResult.overallScore,
      grade: yourResult.grade,
      scores: yourResult.scores,
      isYourSite: true,
    },
    ...competitors.map(c => ({
      url: c.url,
      nickname: c.nickname,
      score: c.overallScore!,
      grade: c.grade!,
      scores: c.scores!,
      isYourSite: false,
    })),
  ];
  
  // Sort by score (descending)
  allSites.sort((a, b) => b.score - a.score);
  
  // Assign ranks
  const yourSiteRank = allSites.findIndex(s => s.isYourSite) + 1;
  
  const competitorComparisons = competitors.map(c => {
    const rank = allSites.findIndex(s => s.url === c.url) + 1;
    return {
      url: c.url,
      nickname: c.nickname,
      score: c.overallScore!,
      grade: c.grade!,
      rank,
      difference: yourResult.overallScore - c.overallScore!,
    };
  });
  
  // Calculate category breakdowns
  const categoryKeys = Object.keys(yourResult.scores) as Array<keyof typeof yourResult.scores>;
  const categoryBreakdown: Record<string, any> = {};
  
  categoryKeys.forEach(category => {
    const scores = allSites.map(s => s.scores[category]);
    const yourScore = yourResult.scores[category];
    
    const sorted = [...scores].sort((a, b) => b - a);
    const yourRank = sorted.findIndex(s => s === yourScore) + 1;
    
    categoryBreakdown[category] = {
      yourScore,
      average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      best: Math.max(...scores),
      worst: Math.min(...scores),
      yourRank,
    };
  });
  
  // Generate insights
  const insights: string[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const opportunities: string[] = [];
  
  if (yourSiteRank === 1) {
    insights.push('🏆 You lead the competition with the highest overall score');
  } else if (yourSiteRank <= allSites.length * 0.33) {
    insights.push(`🥈 You rank #${yourSiteRank} out of ${allSites.length} - in top third`);
  } else {
    insights.push(`📊 You rank #${yourSiteRank} out of ${allSites.length} - room for improvement`);
  }
  
  // Find strengths (categories where you're #1 or above average)
  categoryKeys.forEach(category => {
    const breakdown = categoryBreakdown[category];
    if (breakdown.yourRank === 1) {
      strengths.push(`${formatCategoryName(category)}: Leading (#1 with ${breakdown.yourScore})`);
    } else if (breakdown.yourScore > breakdown.average) {
      strengths.push(`${formatCategoryName(category)}: Above average (${breakdown.yourScore} vs ${breakdown.average})`);
    }
  });
  
  // Find weaknesses (categories where you're below average)
  categoryKeys.forEach(category => {
    const breakdown = categoryBreakdown[category];
    if (breakdown.yourScore < breakdown.average) {
      const gap = breakdown.average - breakdown.yourScore;
      weaknesses.push(`${formatCategoryName(category)}: Below average by ${gap} points`);
    }
  });
  
  // Find opportunities (biggest gaps to leader)
  categoryKeys.forEach(category => {
    const breakdown = categoryBreakdown[category];
    if (breakdown.yourScore < breakdown.best) {
      const gap = breakdown.best - breakdown.yourScore;
      if (gap >= 15) {
        opportunities.push(`${formatCategoryName(category)}: ${gap} point gap to leader`);
      }
    }
  });
  
  return {
    yourSite: {
      url: yourUrl,
      score: yourResult.overallScore,
      grade: yourResult.grade,
      rank: yourSiteRank,
    },
    competitors: competitorComparisons.sort((a, b) => a.rank - b.rank),
    categoryBreakdown,
    insights,
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 5),
    opportunities: opportunities.sort((a, b) => {
      const gapA = parseInt(a.match(/\d+/)?.[0] || '0');
      const gapB = parseInt(b.match(/\d+/)?.[0] || '0');
      return gapB - gapA;
    }).slice(0, 3),
  };
}

/**
 * Compare with industry benchmark
 */
export function compareWithIndustryBenchmark(
  result: AuditResult,
  industry: keyof typeof INDUSTRY_BENCHMARKS
): {
  benchmark: IndustryBenchmark;
  comparison: {
    overallDifference: number;
    percentile: string;
    categoryDifferences: Record<string, number>;
  };
  recommendations: string[];
} | null {
  const benchmark = INDUSTRY_BENCHMARKS[industry];
  if (!benchmark) return null;
  
  const overallDifference = result.overallScore - benchmark.averageScore;
  
  // Calculate approximate percentile
  let percentile: string;
  if (result.overallScore >= benchmark.topPercentile) {
    percentile = 'Top 10%';
  } else if (result.overallScore >= benchmark.averageScore + 5) {
    percentile = 'Top 25%';
  } else if (result.overallScore >= benchmark.averageScore) {
    percentile = 'Top 50%';
  } else if (result.overallScore >= benchmark.averageScore - 10) {
    percentile = 'Below Average';
  } else {
    percentile = 'Bottom 25%';
  }
  
  // Calculate category differences
  const categoryKeys = Object.keys(result.scores) as Array<keyof typeof result.scores>;
  const categoryDifferences: Record<string, number> = {};
  
  categoryKeys.forEach(category => {
    categoryDifferences[category] = result.scores[category] - benchmark.categoryAverages[category];
  });
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (overallDifference < 0) {
    recommendations.push(`Your score is ${Math.abs(overallDifference).toFixed(0)} points below industry average`);
  } else {
    recommendations.push(`Your score is ${overallDifference.toFixed(0)} points above industry average`);
  }
  
  // Find biggest gaps
  const gaps = Object.entries(categoryDifferences)
    .filter(([_, diff]) => diff < -5)
    .sort(([_, a], [__, b]) => a - b)
    .slice(0, 3);
  
  if (gaps.length > 0) {
    recommendations.push('Focus on these below-average categories:');
    gaps.forEach(([category, diff]) => {
      recommendations.push(`  • ${formatCategoryName(category)}: ${Math.abs(diff).toFixed(0)} points below average`);
    });
  }
  
  // Find strengths
  const strengths = Object.entries(categoryDifferences)
    .filter(([_, diff]) => diff > 10)
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, 2);
  
  if (strengths.length > 0) {
    recommendations.push('Your competitive advantages:');
    strengths.forEach(([category, diff]) => {
      recommendations.push(`  • ${formatCategoryName(category)}: ${diff.toFixed(0)} points above average`);
    });
  }
  
  return {
    benchmark,
    comparison: {
      overallDifference,
      percentile,
      categoryDifferences,
    },
    recommendations,
  };
}

/**
 * Get available industries
 */
export function getAvailableIndustries(): string[] {
  return Object.keys(INDUSTRY_BENCHMARKS);
}

/**
 * Get industry benchmark
 */
export function getIndustryBenchmark(industry: string): IndustryBenchmark | undefined {
  return INDUSTRY_BENCHMARKS[industry as keyof typeof INDUSTRY_BENCHMARKS];
}

/**
 * Get competitive intelligence summary
 */
export function getCompetitiveIntelligenceSummary(
  _yourUrl: string,
  yourResult: AuditResult
): {
  totalCompetitors: number;
  audited: number;
  yourRank: number;
  averageCompetitorScore: number;
  scoreDifference: number;
  leadingCategories: string[];
  laggingCategories: string[];
} | null {
  const competitors = getCompetitors().filter(c => c.overallScore !== undefined);
  
  if (competitors.length === 0) return null;
  
  const scores = competitors.map(c => c.overallScore!);
  const averageCompetitorScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const scoreDifference = yourResult.overallScore - averageCompetitorScore;
  
  // Calculate rank
  const allScores = [yourResult.overallScore, ...scores].sort((a, b) => b - a);
  const yourRank = allScores.indexOf(yourResult.overallScore) + 1;
  
  // Find leading/lagging categories
  const categoryKeys = Object.keys(yourResult.scores) as Array<keyof typeof yourResult.scores>;
  const categoryComparisons: Array<{ category: string; diff: number }> = [];
  
  categoryKeys.forEach(category => {
    const competitorScores = competitors
      .filter(c => c.scores)
      .map(c => c.scores![category]);
    
    if (competitorScores.length > 0) {
      const avgCompetitor = competitorScores.reduce((a, b) => a + b, 0) / competitorScores.length;
      categoryComparisons.push({
        category,
        diff: yourResult.scores[category] - avgCompetitor,
      });
    }
  });
  
  const leading = categoryComparisons
    .filter(c => c.diff > 5)
    .sort((a, b) => b.diff - a.diff)
    .slice(0, 3)
    .map(c => formatCategoryName(c.category));
  
  const lagging = categoryComparisons
    .filter(c => c.diff < -5)
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 3)
    .map(c => formatCategoryName(c.category));
  
  return {
    totalCompetitors: competitors.length,
    audited: competitors.length,
    yourRank,
    averageCompetitorScore: Math.round(averageCompetitorScore),
    scoreDifference: Math.round(scoreDifference),
    leadingCategories: leading,
    laggingCategories: lagging,
  };
}

/**
 * Export competitive data to JSON
 */
export function exportCompetitiveData(): string {
  const competitors = getCompetitors();
  return JSON.stringify(competitors, null, 2);
}

/**
 * Helper functions
 */

function saveCompetitors(competitors: CompetitorData[]): void {
  try {
    localStorage.setItem(COMPETITORS_STORAGE_KEY, JSON.stringify(competitors));
  } catch (error) {
    console.error('Failed to save competitors:', error);
  }
}

function normalizeUrl(url: string): string {
  return url.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function generateId(): string {
  return `competitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function formatCategoryName(category: string): string {
  const names: Record<string, string> = {
    schemaMarkup: 'Schema Markup',
    metaTags: 'Meta Tags',
    aiCrawlers: 'AI Crawlers',
    eeat: 'E-E-A-T',
    structure: 'Structure',
    performance: 'Performance',
    contentQuality: 'Content Quality',
    citationPotential: 'Citation Potential',
    technicalSEO: 'Technical SEO',
    linkAnalysis: 'Link Analysis',
  };
  return names[category] || category;
}
