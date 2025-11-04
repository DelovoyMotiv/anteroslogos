/**
 * Advanced Analytics Module - Hi-End AAA Level
 * Trend analysis, regression, anomaly detection, forecasting
 */

import { HistoryItem, getUrlHistory } from './auditHistory';

export interface TrendAnalysis {
  direction: 'improving' | 'declining' | 'stable';
  slope: number; // Linear regression slope
  confidence: number; // R-squared value (0-1)
  averageChange: number; // Average change per audit
  volatility: number; // Standard deviation of changes
  forecast: {
    next7Days: number;
    next30Days: number;
    confidence: number;
  };
}

export interface AnomalyDetection {
  hasAnomalies: boolean;
  anomalies: Array<{
    timestamp: string;
    score: number;
    deviation: number; // Standard deviations from mean
    severity: 'minor' | 'moderate' | 'severe';
    category?: string;
  }>;
  threshold: number; // Z-score threshold used
}

export interface PerformanceInsights {
  bestScore: { score: number; date: string };
  worstScore: { score: number; date: string };
  averageScore: number;
  medianScore: number;
  improvement: number; // % change from first to last
  consistency: number; // 0-100, higher = more consistent
  categoriesImproving: string[];
  categoriesDeclining: string[];
  timeToReachTarget?: number; // Days to reach 90+ score at current rate
}

/**
 * Analyze score trend with linear regression
 */
export function analyzeTrend(history: HistoryItem[]): TrendAnalysis | null {
  if (history.length < 2) return null;

  // Sort by timestamp (oldest first)
  const sorted = [...history].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const n = sorted.length;
  const scores = sorted.map(item => item.overallScore);
  const indices = sorted.map((_, i) => i);

  // Linear regression: y = mx + b
  const sumX = indices.reduce((a, b) => a + b, 0);
  const sumY = scores.reduce((a, b) => a + b, 0);
  const sumXY = indices.reduce((sum, x, i) => sum + x * scores[i], 0);
  const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared (confidence)
  const meanY = sumY / n;
  const ssTotal = scores.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
  const ssResidual = scores.reduce(
    (sum, y, i) => sum + Math.pow(y - (slope * i + intercept), 2),
    0
  );
  const rSquared = 1 - ssResidual / ssTotal;

  // Calculate average change and volatility
  const changes: number[] = [];
  for (let i = 1; i < scores.length; i++) {
    changes.push(scores[i] - scores[i - 1]);
  }
  const averageChange = changes.reduce((a, b) => a + b, 0) / changes.length;
  const volatility =
    Math.sqrt(
      changes.reduce((sum, change) => sum + Math.pow(change - averageChange, 2), 0) /
        changes.length
    ) || 0;

  // Determine direction
  let direction: 'improving' | 'declining' | 'stable';
  if (Math.abs(slope) < 0.1) {
    direction = 'stable';
  } else if (slope > 0) {
    direction = 'improving';
  } else {
    direction = 'declining';
  }

  // Forecast future scores
  const daysPerAudit = calculateAverageDaysBetweenAudits(sorted);
  const auditsIn7Days = Math.max(1, Math.round(7 / daysPerAudit));
  const auditsIn30Days = Math.max(1, Math.round(30 / daysPerAudit));

  const next7Days = Math.round(slope * (n + auditsIn7Days) + intercept);
  const next30Days = Math.round(slope * (n + auditsIn30Days) + intercept);

  return {
    direction,
    slope: Number(slope.toFixed(3)),
    confidence: Number(rSquared.toFixed(3)),
    averageChange: Number(averageChange.toFixed(2)),
    volatility: Number(volatility.toFixed(2)),
    forecast: {
      next7Days: Math.max(0, Math.min(100, next7Days)),
      next30Days: Math.max(0, Math.min(100, next30Days)),
      confidence: Number(rSquared.toFixed(2)),
    },
  };
}

/**
 * Detect anomalies using Z-score method
 */
export function detectAnomalies(
  history: HistoryItem[],
  threshold: number = 2.5
): AnomalyDetection {
  if (history.length < 5) {
    return { hasAnomalies: false, anomalies: [], threshold };
  }

  const scores = history.map(item => item.overallScore);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const stdDev = Math.sqrt(
    scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length
  );

  const anomalies = history
    .map(item => {
      const zScore = Math.abs((item.overallScore - mean) / stdDev);
      if (zScore > threshold) {
        let severity: 'minor' | 'moderate' | 'severe';
        if (zScore > 4) severity = 'severe';
        else if (zScore > 3) severity = 'moderate';
        else severity = 'minor';

        return {
          timestamp: item.timestamp,
          score: item.overallScore,
          deviation: Number(zScore.toFixed(2)),
          severity,
        };
      }
      return null;
    })
    .filter((anomaly): anomaly is NonNullable<typeof anomaly> => anomaly !== null);

  // Detect category-specific anomalies
  const categoryKeys = Object.keys(history[0].scores) as Array<keyof HistoryItem['scores']>;
  categoryKeys.forEach(category => {
    const categoryScores = history.map(item => item.scores[category]);
    const catMean = categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length;
    const catStdDev = Math.sqrt(
      categoryScores.reduce((sum, score) => sum + Math.pow(score - catMean, 2), 0) /
        categoryScores.length
    );

    history.forEach(item => {
      const zScore = Math.abs((item.scores[category] - catMean) / catStdDev);
      if (zScore > threshold + 0.5) {
        // Higher threshold for categories
        const existing = anomalies.find(a => a.timestamp === item.timestamp);
        if (existing) {
          (existing as any).category = category;
        }
      }
    });
  });

  return {
    hasAnomalies: anomalies.length > 0,
    anomalies,
    threshold,
  };
}

/**
 * Generate comprehensive performance insights
 */
export function generatePerformanceInsights(history: HistoryItem[]): PerformanceInsights | null {
  if (history.length === 0) return null;

  const scores = history.map(item => item.overallScore);
  const sorted = [...scores].sort((a, b) => a - b);

  // Best and worst
  const bestIndex = scores.indexOf(Math.max(...scores));
  const worstIndex = scores.indexOf(Math.min(...scores));

  // Average and median
  const averageScore = Number(
    (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
  );
  const medianScore = sorted[Math.floor(sorted.length / 2)];

  // Improvement calculation
  const chronological = [...history].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const firstScore = chronological[0].overallScore;
  const lastScore = chronological[chronological.length - 1].overallScore;
  const improvement = Number((((lastScore - firstScore) / firstScore) * 100).toFixed(1));

  // Consistency (inverse of coefficient of variation)
  const stdDev = Math.sqrt(
    scores.reduce((sum, score) => sum + Math.pow(score - averageScore, 2), 0) / scores.length
  );
  const cv = stdDev / averageScore;
  const consistency = Math.max(0, Math.min(100, Math.round((1 - cv) * 100)));

  // Category trends
  const categoriesImproving: string[] = [];
  const categoriesDeclining: string[] = [];

  if (chronological.length >= 2) {
    const first = chronological[0];
    const last = chronological[chronological.length - 1];

    Object.keys(first.scores).forEach(category => {
      const cat = category as keyof typeof first.scores;
      const change = last.scores[cat] - first.scores[cat];
      if (change > 5) {
        categoriesImproving.push(category);
      } else if (change < -5) {
        categoriesDeclining.push(category);
      }
    });
  }

  // Time to reach target
  let timeToReachTarget: number | undefined;
  if (lastScore < 90 && chronological.length >= 3) {
    const trend = analyzeTrend(chronological);
    if (trend && trend.slope > 0) {
      const pointsNeeded = 90 - lastScore;
      const daysPerAudit = calculateAverageDaysBetweenAudits(chronological);
      const auditsNeeded = pointsNeeded / trend.slope;
      timeToReachTarget = Math.round(auditsNeeded * daysPerAudit);
    }
  }

  return {
    bestScore: {
      score: history[bestIndex].overallScore,
      date: history[bestIndex].timestamp,
    },
    worstScore: {
      score: history[worstIndex].overallScore,
      date: history[worstIndex].timestamp,
    },
    averageScore,
    medianScore,
    improvement,
    consistency,
    categoriesImproving,
    categoriesDeclining,
    timeToReachTarget,
  };
}

/**
 * Calculate average days between audits
 */
function calculateAverageDaysBetweenAudits(history: HistoryItem[]): number {
  if (history.length < 2) return 7; // Default to weekly

  const timestamps = history
    .map(item => new Date(item.timestamp).getTime())
    .sort((a, b) => a - b);

  const intervals: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    intervals.push(timestamps[i] - timestamps[i - 1]);
  }

  const averageMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  return Math.max(1, Math.round(averageMs / (1000 * 60 * 60 * 24))); // Convert to days
}

/**
 * Export trend data for charting
 */
export interface TrendData {
  date: string;
  score: number;
  predicted?: number;
  upperBound?: number;
  lowerBound?: number;
}

export function getTrendDataForChart(history: HistoryItem[]): TrendData[] {
  if (history.length === 0) return [];

  const sorted = [...history].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const trend = analyzeTrend(sorted);
  if (!trend) {
    return sorted.map(item => ({
      date: new Date(item.timestamp).toLocaleDateString(),
      score: item.overallScore,
    }));
  }

  // Add predicted values and confidence intervals
  return sorted.map((item, i) => {
    const predicted = trend.slope * i + (sorted[0].overallScore - trend.slope * 0);
    const margin = trend.volatility * 1.96; // 95% confidence interval

    return {
      date: new Date(item.timestamp).toLocaleDateString(),
      score: item.overallScore,
      predicted: Math.round(predicted),
      upperBound: Math.round(predicted + margin),
      lowerBound: Math.round(Math.max(0, predicted - margin)),
    };
  });
}

/**
 * Get category-specific trends
 */
export function getCategoryTrends(history: HistoryItem[]): Record<string, TrendAnalysis | null> {
  if (history.length < 2) return {};

  const sorted = [...history].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const categoryKeys = Object.keys(sorted[0].scores) as Array<keyof HistoryItem['scores']>;
  const trends: Record<string, TrendAnalysis | null> = {};

  categoryKeys.forEach(category => {
    // Create pseudo history items for each category
    const categoryHistory = sorted.map(item => ({
      ...item,
      overallScore: item.scores[category],
    }));

    trends[category] = analyzeTrend(categoryHistory);
  });

  return trends;
}

/**
 * Generate executive summary of analytics
 */
export function getAnalyticsSummary(url: string): string[] {
  const history = getUrlHistory(url);
  if (history.length < 2) return ['Not enough data for analysis. Run at least 2 audits.'];

  const summary: string[] = [];
  const trend = analyzeTrend(history);
  const insights = generatePerformanceInsights(history);
  const anomalies = detectAnomalies(history);

  if (trend) {
    if (trend.direction === 'improving') {
      summary.push(
        `📈 Trending upward with ${trend.averageChange > 0 ? '+' : ''}${trend.averageChange} points per audit (${Math.round(trend.confidence * 100)}% confidence)`
      );
    } else if (trend.direction === 'declining') {
      summary.push(
        `📉 Trending downward with ${trend.averageChange.toFixed(1)} points per audit - immediate attention needed`
      );
    } else {
      summary.push(`➡️ Stable performance around ${insights?.averageScore || 0} points`);
    }

    if (trend.forecast.next30Days !== insights?.averageScore) {
      summary.push(
        `🔮 Forecast: ${trend.forecast.next30Days} points in 30 days (${Math.round(trend.forecast.confidence * 100)}% confidence)`
      );
    }
  }

  if (insights) {
    if (insights.improvement > 10) {
      summary.push(`✨ ${insights.improvement.toFixed(0)}% improvement since first audit`);
    } else if (insights.improvement < -10) {
      summary.push(`⚠️ ${Math.abs(insights.improvement).toFixed(0)}% decline since first audit`);
    }

    if (insights.consistency > 80) {
      summary.push(`🎯 Highly consistent performance (${insights.consistency}% stability)`);
    } else if (insights.consistency < 50) {
      summary.push(`⚡ High volatility detected - scores vary significantly between audits`);
    }

    if (insights.timeToReachTarget && insights.timeToReachTarget < 90) {
      summary.push(
        `🎊 At current rate, you'll reach 90+ score in ~${insights.timeToReachTarget} days`
      );
    }
  }

  if (anomalies.hasAnomalies) {
    const severe = anomalies.anomalies.filter(a => a.severity === 'severe').length;
    if (severe > 0) {
      summary.push(`🚨 ${severe} severe anomal${severe > 1 ? 'ies' : 'y'} detected in score history`);
    }
  }

  return summary;
}
