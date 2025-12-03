/**
 * Global Insights Aggregator - Cross-tenant Analytics
 * Provides industry benchmarks, percentile rankings, and trend analysis
 * Uses service role for cross-tenant data access
 */

import { SupabaseClient } from '@supabase/supabase-js';
// AggregationJob type is used in comments and type annotations
// @ts-expect-error - Type imported for documentation purposes
import type { AggregationJob } from '../../types/lib.types';

// =====================================================
// TYPES
// =====================================================

export interface GlobalInsights {
  totalAudits: number;
  avgScore: number;
  medianScore: number;
  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
  scoreDistribution: {
    '0-20': number;
    '21-40': number;
    '41-60': number;
    '61-80': number;
    '81-100': number;
  };
  lastUpdated: string;
  timeRange: string;
}

export interface IndustryBenchmark {
  industry: string;
  avgScore: number;
  medianScore: number;
  sampleSize: number;
  percentiles: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  topPerformers: {
    tenantId: string;
    score: number;
  }[];
}

export interface PercentileRanking {
  tenantId: string;
  score: number;
  percentile: number; // 0-100, where 99 = top 1%
  rank: number; // Absolute rank (1 = best)
  totalSites: number;
  performance: 'top_1%' | 'top_5%' | 'top_10%' | 'top_25%' | 'above_average' | 'below_average';
  scoreGap: {
    toTop10: number;
    toAverage: number;
  };
}

export interface TrendAnalysis {
  direction: 'improving' | 'declining' | 'stable';
  averageChange: number; // Points per day
  volatility: number; // Standard deviation
  forecast7d: number;
  forecast30d: number;
}

export interface CategoryBenchmark {
  category: string;
  globalAvg: number;
  tenantScore: number;
  percentile: number;
  gap: number; // Difference from average
}

// =====================================================
// MAIN AGGREGATION FUNCTIONS
// =====================================================

/**
 * Aggregate global insights from all completed audits
 * Uses materialized view for performance (refreshed hourly)
 */
export async function aggregateGlobalInsights(
  supabase: SupabaseClient,
  timeRange: 'all' | '7d' | '30d' | '90d' = '30d'
): Promise<GlobalInsights | null> {
  try {
    // Try materialized view first (fastest)
    const { data: viewData, error: viewError } = await supabase
      .from('global_audit_insights')
      .select('*')
      .single();

    if (!viewError && viewData) {
      return {
        totalAudits: viewData.total_audits,
        avgScore: Number(viewData.avg_score?.toFixed(1) || 0),
        medianScore: Number(viewData.median_score?.toFixed(1) || 0),
        percentiles: {
          p10: Number(viewData.p10_score?.toFixed(1) || 0),
          p25: Number(viewData.p25_score?.toFixed(1) || 0),
          p50: Number(viewData.median_score?.toFixed(1) || 0),
          p75: Number(viewData.p75_score?.toFixed(1) || 0),
          p90: Number(viewData.p90_score?.toFixed(1) || 0),
          p95: Number(viewData.p95_score?.toFixed(1) || 0),
          p99: Number(viewData.p99_score?.toFixed(1) || 0),
        },
        scoreDistribution: viewData.score_distribution || {
          '0-20': 0,
          '21-40': 0,
          '41-60': 0,
          '61-80': 0,
          '81-100': 0,
        },
        lastUpdated: viewData.last_updated || new Date().toISOString(),
        timeRange: '30d',
      };
    }

    // Fallback: compute on-demand (slower but fresh)
    const timeFilter = getTimeFilter(timeRange);
    const { data: jobs, error } = await supabase
      .from('audit_jobs')
      .select('result, completed_at')
      .eq('status', 'completed')
      .not('result', 'is', null)
      .gte('completed_at', timeFilter)
      .order('completed_at', { ascending: false });

    if (error || !jobs || jobs.length === 0) {
      return null;
    }

    const scores = jobs
      .map(job => job.result?.overallScore)
      .filter((score): score is number => typeof score === 'number');

    if (scores.length === 0) return null;

    const percentiles = calculatePercentiles(scores);
    const distribution = calculateScoreDistribution(scores);

    return {
      totalAudits: scores.length,
      avgScore: Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)),
      medianScore: percentiles.p50,
      percentiles,
      scoreDistribution: distribution,
      lastUpdated: new Date().toISOString(),
      timeRange,
    };
  } catch (error) {
    console.error('Failed to aggregate global insights:', error);
    return null;
  }
}

/**
 * Calculate industry-specific benchmarks
 * Groups audits by tenant metadata (industry, company size, etc.)
 */
export async function calculateIndustryBenchmarks(
  supabase: SupabaseClient,
  timeRange: '30d' | '90d' = '30d'
): Promise<IndustryBenchmark[]> {
  try {
    const timeFilter = getTimeFilter(timeRange);

    // Join audit_jobs with tenants to get industry metadata
    const { data: jobs, error } = await supabase
      .from('audit_jobs')
      .select(
        `
        result,
        tenant_id,
        tenants!inner (
          id,
          name,
          metadata
        )
      `
      )
      .eq('status', 'completed')
      .not('result', 'is', null)
      .gte('completed_at', timeFilter);

    if (error || !jobs || jobs.length === 0) {
      return [];
    }

    // Group by industry
    const industryMap = new Map<string, { scores: number[]; tenants: Set<string> }>();

    jobs.forEach((job: any) => {
      const industry = job.tenants?.metadata?.industry || 'Unknown';
      const score = job.result?.overallScore;

      if (typeof score !== 'number') return;

      if (!industryMap.has(industry)) {
        industryMap.set(industry, { scores: [], tenants: new Set() });
      }

      const group = industryMap.get(industry)!;
      group.scores.push(score);
      group.tenants.add(String(job.tenant_id));
    });

    // Calculate benchmarks for each industry
    const benchmarks: IndustryBenchmark[] = [];

    industryMap.forEach((group, industry) => {
      if (group.scores.length < 5) return; // Skip industries with < 5 audits

      const sorted = [...group.scores].sort((a, b) => a - b);
      const percentiles = calculatePercentiles(sorted);

      // Get top performers
      const tenantScores = new Map<string, number[]>();
      jobs.forEach((job: any) => {
        const jobIndustry = job.tenants?.metadata?.industry || 'Unknown';
        if (jobIndustry !== industry) return;

        const tenantId = String(job.tenant_id);
        const score = job.result?.overallScore;
        if (typeof score !== 'number') return;

        if (!tenantScores.has(tenantId)) {
          tenantScores.set(tenantId, []);
        }
        tenantScores.get(tenantId)!.push(score);
      });

      const topPerformers = Array.from(tenantScores.entries())
        .map(([tenantId, scores]) => ({
          tenantId,
          score: scores.reduce((a, b) => a + b, 0) / scores.length,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      benchmarks.push({
        industry,
        avgScore: Number((sorted.reduce((a, b) => a + b, 0) / sorted.length).toFixed(1)),
        medianScore: percentiles.p50,
        sampleSize: group.scores.length,
        percentiles: {
          p25: percentiles.p25,
          p50: percentiles.p50,
          p75: percentiles.p75,
          p90: percentiles.p90,
        },
        topPerformers,
      });
    });

    return benchmarks.sort((a, b) => b.sampleSize - a.sampleSize);
  } catch (error) {
    console.error('Failed to calculate industry benchmarks:', error);
    return [];
  }
}

/**
 * Calculate percentile ranking for a specific tenant/score
 */
export async function calculatePercentileRanking(
  supabase: SupabaseClient,
  tenantId: string,
  score?: number
): Promise<PercentileRanking | null> {
  try {
    // Get tenant's latest score if not provided
    let targetScore = score;
    if (!targetScore) {
      const { data: latestJob } = await supabase
        .from('audit_jobs')
        .select('result')
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .not('result', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      targetScore = latestJob?.result?.overallScore;
      if (!targetScore) return null;
    }

    // Get all scores from last 30 days
    const { data: jobs, error } = await supabase
      .from('audit_jobs')
      .select('result, tenant_id')
      .eq('status', 'completed')
      .not('result', 'is', null)
      .gte('completed_at', getTimeFilter('30d'));

    if (error || !jobs || jobs.length === 0) return null;

    const scores = jobs
      .map(job => job.result?.overallScore)
      .filter((s): s is number => typeof s === 'number')
      .sort((a, b) => a - b);

    const totalSites = scores.length;
    const rank = scores.filter(s => s > targetScore).length + 1;
    const percentile = Math.round(((totalSites - rank) / totalSites) * 100);

    // Calculate global average
    const globalAvg = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Calculate top 10% threshold
    const top10Index = Math.floor(scores.length * 0.9);
    const top10Threshold = scores[top10Index] || 90;

    // Determine performance tier
    let performance: PercentileRanking['performance'];
    if (percentile >= 99) performance = 'top_1%';
    else if (percentile >= 95) performance = 'top_5%';
    else if (percentile >= 90) performance = 'top_10%';
    else if (percentile >= 75) performance = 'top_25%';
    else if (targetScore >= globalAvg) performance = 'above_average';
    else performance = 'below_average';

    return {
      tenantId,
      score: targetScore,
      percentile,
      rank,
      totalSites,
      performance,
      scoreGap: {
        toTop10: Math.max(0, top10Threshold - targetScore),
        toAverage: targetScore - globalAvg,
      },
    };
  } catch (error) {
    console.error('Failed to calculate percentile ranking:', error);
    return null;
  }
}

/**
 * Calculate category-specific benchmarks for a tenant
 */
export async function calculateCategoryBenchmarks(
  supabase: SupabaseClient,
  tenantId: string
): Promise<CategoryBenchmark[]> {
  try {
    // Get tenant's latest audit
    const { data: tenantJob } = await supabase
      .from('audit_jobs')
      .select('result')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .not('result', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    if (!tenantJob?.result?.scores) return [];

    // Get all recent audits for global averages
    const { data: allJobs } = await supabase
      .from('audit_jobs')
      .select('result')
      .eq('status', 'completed')
      .not('result', 'is', null)
      .gte('completed_at', getTimeFilter('30d'));

    if (!allJobs || allJobs.length === 0) return [];

    const tenantScores = tenantJob.result.scores;
    const categories = Object.keys(tenantScores);

    // Calculate global averages per category
    const globalAverages = new Map<string, number[]>();

    allJobs.forEach(job => {
      const scores = job.result?.scores;
      if (!scores) return;

      Object.entries(scores).forEach(([category, score]) => {
        if (typeof score !== 'number') return;
        if (!globalAverages.has(category)) {
          globalAverages.set(category, []);
        }
        globalAverages.get(category)!.push(score);
      });
    });

    // Build benchmarks
    const benchmarks: CategoryBenchmark[] = [];

    categories.forEach(category => {
      const tenantScore = tenantScores[category];
      const globalScores = globalAverages.get(category) || [];

      if (globalScores.length === 0 || typeof tenantScore !== 'number') return;

      const globalAvg = globalScores.reduce((a, b) => a + b, 0) / globalScores.length;
      const sorted = [...globalScores].sort((a, b) => a - b);
      const rank = sorted.filter(s => s > tenantScore).length + 1;
      const percentile = Math.round(((sorted.length - rank) / sorted.length) * 100);

      benchmarks.push({
        category,
        globalAvg: Number(globalAvg.toFixed(1)),
        tenantScore: Number(tenantScore.toFixed(1)),
        percentile,
        gap: Number((tenantScore - globalAvg).toFixed(1)),
      });
    });

    return benchmarks.sort((a, b) => b.percentile - a.percentile);
  } catch (error) {
    console.error('Failed to calculate category benchmarks:', error);
    return [];
  }
}

/**
 * Calculate trend analysis for tenant's score history
 */
export async function calculateTrendAnalysis(
  supabase: SupabaseClient,
  tenantId: string
): Promise<TrendAnalysis | null> {
  try {
    const { data: jobs, error } = await supabase
      .from('audit_jobs')
      .select('result, completed_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .not('result', 'is', null)
      .order('completed_at', { ascending: true })
      .limit(100);

    if (error || !jobs || jobs.length < 2) return null;

    const scores = jobs
      .map(job => ({
        score: job.result?.overallScore,
        date: new Date(job.completed_at).getTime(),
      }))
      .filter((item): item is { score: number; date: number } => typeof item.score === 'number');

    if (scores.length < 2) return null;

    // Linear regression
    const n = scores.length;
    const sumX = scores.reduce((sum, _, i) => sum + i, 0);
    const sumY = scores.reduce((sum, item) => sum + item.score, 0);
    const sumXY = scores.reduce((sum, item, i) => sum + i * item.score, 0);
    const sumX2 = scores.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // Convert slope to points per day
    const firstDate = scores[0].date;
    const lastDate = scores[scores.length - 1].date;
    const daysDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
    const pointsPerDay = (slope * scores.length) / Math.max(daysDiff, 1);

    // Calculate volatility
    const changes: number[] = [];
    for (let i = 1; i < scores.length; i++) {
      changes.push(scores[i].score - scores[i - 1].score);
    }
    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    const volatility = Math.sqrt(
      changes.reduce((sum, change) => sum + Math.pow(change - avgChange, 2), 0) / changes.length
    );

    // Determine direction
    let direction: 'improving' | 'declining' | 'stable';
    if (Math.abs(slope) < 0.1) direction = 'stable';
    else if (slope > 0) direction = 'improving';
    else direction = 'declining';

    // Forecast
    const intercept = (sumY - slope * sumX) / n;
    const daysPerAudit = daysDiff / scores.length;
    const auditsIn7d = Math.max(1, Math.round(7 / daysPerAudit));
    const auditsIn30d = Math.max(1, Math.round(30 / daysPerAudit));

    const forecast7d = Math.max(0, Math.min(100, slope * (n + auditsIn7d) + intercept));
    const forecast30d = Math.max(0, Math.min(100, slope * (n + auditsIn30d) + intercept));

    return {
      direction,
      averageChange: Number(pointsPerDay.toFixed(2)),
      volatility: Number(volatility.toFixed(2)),
      forecast7d: Math.round(forecast7d),
      forecast30d: Math.round(forecast30d),
    };
  } catch (error) {
    console.error('Failed to calculate trend analysis:', error);
    return null;
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Calculate percentiles from sorted scores
 */
function calculatePercentiles(
  scores: number[]
): GlobalInsights['percentiles'] {
  const sorted = [...scores].sort((a, b) => a - b);
  const n = sorted.length;

  const getPercentile = (p: number): number => {
    const index = Math.ceil((p / 100) * n) - 1;
    return Number(sorted[Math.max(0, Math.min(index, n - 1))].toFixed(1));
  };

  return {
    p10: getPercentile(10),
    p25: getPercentile(25),
    p50: getPercentile(50),
    p75: getPercentile(75),
    p90: getPercentile(90),
    p95: getPercentile(95),
    p99: getPercentile(99),
  };
}

/**
 * Calculate score distribution buckets
 */
function calculateScoreDistribution(
  scores: number[]
): GlobalInsights['scoreDistribution'] {
  const distribution = {
    '0-20': 0,
    '21-40': 0,
    '41-60': 0,
    '61-80': 0,
    '81-100': 0,
  };

  scores.forEach(score => {
    if (score >= 0 && score <= 20) distribution['0-20']++;
    else if (score >= 21 && score <= 40) distribution['21-40']++;
    else if (score >= 41 && score <= 60) distribution['41-60']++;
    else if (score >= 61 && score <= 80) distribution['61-80']++;
    else if (score >= 81 && score <= 100) distribution['81-100']++;
  });

  return distribution;
}

/**
 * Get time filter for SQL queries
 */
function getTimeFilter(timeRange: 'all' | '7d' | '30d' | '90d'): string {
  const now = new Date();
  switch (timeRange) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    case 'all':
    default:
      return new Date(0).toISOString();
  }
}
