/**
 * Citation Forecaster
 * Generates temporal forecasts for citation probability using time series analysis
 * 
 * This module implements:
 * 1. Time series forecasting for 30/60/90 day horizons
 * 2. Citation velocity calculation
 * 3. Seasonal pattern detection using STL decomposition
 * 4. Confidence interval generation
 * 
 * @module lib/citationIntelligence/forecaster
 */

import type {
  ForecastResult,
  TemporalData,
} from '../../types/citation-intelligence.types';

// ============================================================================
// Time Series Decomposition (STL - Seasonal and Trend decomposition using Loess)
// ============================================================================

/**
 * Decompose time series into trend, seasonal, and residual components
 * Simplified STL implementation
 */
function decomposeTimeSeries(
  values: number[],
  period: number = 12
): {
  trend: number[];
  seasonal: number[];
  residual: number[];
} {
  const n = values.length;
  
  // Calculate trend using moving average
  const trend: number[] = [];
  const windowSize = Math.min(period, Math.floor(n / 2));
  
  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(n, i + Math.ceil(windowSize / 2));
    const window = values.slice(start, end);
    const avg = window.reduce((sum, v) => sum + v, 0) / window.length;
    trend.push(avg);
  }
  
  // Calculate seasonal component
  const detrended = values.map((v, i) => v - trend[i]);
  const seasonal: number[] = new Array(n).fill(0);
  
  if (n >= period) {
    // Average values for each season
    const seasonalAverages = new Array(period).fill(0);
    const seasonalCounts = new Array(period).fill(0);
    
    for (let i = 0; i < n; i++) {
      const seasonIndex = i % period;
      seasonalAverages[seasonIndex] += detrended[i];
      seasonalCounts[seasonIndex]++;
    }
    
    for (let i = 0; i < period; i++) {
      if (seasonalCounts[i] > 0) {
        seasonalAverages[i] /= seasonalCounts[i];
      }
    }
    
    // Assign seasonal values
    for (let i = 0; i < n; i++) {
      seasonal[i] = seasonalAverages[i % period];
    }
  }
  
  // Calculate residual
  const residual = values.map((v, i) => v - trend[i] - seasonal[i]);
  
  return { trend, seasonal, residual };
}

/**
 * Detect seasonal patterns in time series
 */
function detectSeasonality(
  temporalData: TemporalData[]
): {
  detected: boolean;
  period: number;
  amplitude: number;
  factors: { month: number; multiplier: number }[];
} {
  if (temporalData.length < 12) {
    return {
      detected: false,
      period: 0,
      amplitude: 0,
      factors: [],
    };
  }
  
  // Filter valid data
  const validData = temporalData.filter(d => 
    Number.isFinite(d.scores.overall) && d.scores.overall >= 0 && d.scores.overall <= 100
  );
  
  if (validData.length < 12) {
    return {
      detected: false,
      period: 0,
      amplitude: 0,
      factors: [],
    };
  }
  
  // Extract scores
  const scores = validData.map(d => d.scores.overall);
  
  // Decompose time series
  const { seasonal } = decomposeTimeSeries(scores, 12);
  
  // Calculate amplitude (max - min of seasonal component)
  const maxSeasonal = Math.max(...seasonal);
  const minSeasonal = Math.min(...seasonal);
  const amplitude = maxSeasonal - minSeasonal;
  
  // Detect if seasonality is significant (amplitude > 5% of mean)
  const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const detected = amplitude > mean * 0.05;
  
  // Calculate seasonal factors by month
  const monthlyScores = new Map<number, number[]>();
  
  for (const data of validData) {
    const month = new Date(data.timestamp).getMonth();
    if (!monthlyScores.has(month)) {
      monthlyScores.set(month, []);
    }
    monthlyScores.get(month)!.push(data.scores.overall);
  }
  
  const factors: { month: number; multiplier: number }[] = [];
  
  for (let month = 0; month < 12; month++) {
    const monthScores = monthlyScores.get(month) || [];
    if (monthScores.length > 0) {
      const monthAvg = monthScores.reduce((sum, s) => sum + s, 0) / monthScores.length;
      const multiplier = mean > 0 ? monthAvg / mean : 1;
      factors.push({ month, multiplier });
    } else {
      factors.push({ month, multiplier: 1 });
    }
  }
  
  return {
    detected,
    period: 12,
    amplitude,
    factors,
  };
}

// ============================================================================
// Citation Velocity
// ============================================================================

/**
 * Calculate citation velocity (rate of change in citations per day)
 */
function calculateCitationVelocity(temporalData: TemporalData[]): number {
  // Filter valid data
  const validData = temporalData.filter(d => 
    Number.isFinite(d.scores.citationProbability) && 
    d.scores.citationProbability >= 0 && 
    d.scores.citationProbability <= 100
  );
  
  if (validData.length < 2) return 0;
  
  // Sort by timestamp
  const sorted = [...validData].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  // Calculate total change
  const firstScore = sorted[0].scores.citationProbability;
  const lastScore = sorted[sorted.length - 1].scores.citationProbability;
  const totalChange = lastScore - firstScore;
  
  // Calculate time span in days
  const firstDate = new Date(sorted[0].timestamp);
  const lastDate = new Date(sorted[sorted.length - 1].timestamp);
  const daysDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysDiff === 0) return 0;
  
  // Velocity = change per day
  const velocity = totalChange / daysDiff;
  
  return Number.isFinite(velocity) ? velocity : 0;
}

// ============================================================================
// Forecasting
// ============================================================================

/**
 * Generate forecast using linear extrapolation with seasonal adjustment
 * Simplified Prophet-like approach
 */
function generateForecast(
  temporalData: TemporalData[],
  horizon: 30 | 60 | 90
): {
  predicted: number;
  confidence: { lower: number; upper: number };
  drivers: string[];
} {
  // Filter valid data
  const validData = temporalData.filter(d => 
    Number.isFinite(d.scores.overall) && d.scores.overall >= 0 && d.scores.overall <= 100
  );
  
  if (validData.length === 0) {
    return {
      predicted: 50,
      confidence: { lower: 40, upper: 60 },
      drivers: ['Insufficient historical data'],
    };
  }
  
  // Sort by timestamp
  const sorted = [...validData].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  // Extract scores
  const scores = sorted.map(d => d.scores.overall);
  
  // Calculate trend
  const n = scores.length;
  if (n < 2) {
    const currentScore = scores[0];
    return {
      predicted: currentScore,
      confidence: { lower: Math.max(0, currentScore - 10), upper: Math.min(100, currentScore + 10) },
      drivers: ['Single data point - no trend available'],
    };
  }
  
  // Linear regression for trend
  const xMean = (n - 1) / 2;
  const yMean = scores.reduce((sum, s) => sum + s, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (scores[i] - yMean);
    denominator += (i - xMean) ** 2;
  }
  
  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;
  
  // Project forward
  const futureIndex = n + (horizon / 30); // Approximate future index
  let predicted = slope * futureIndex + intercept;
  
  // Detect and apply seasonality
  const seasonality = detectSeasonality(sorted);
  if (seasonality.detected) {
    const futureMonth = new Date(Date.now() + horizon * 24 * 60 * 60 * 1000).getMonth();
    const seasonalFactor = seasonality.factors.find(f => f.month === futureMonth);
    if (seasonalFactor) {
      predicted *= seasonalFactor.multiplier;
    }
  }
  
  // Clamp to 0-100
  predicted = Math.max(0, Math.min(100, predicted));
  
  // Calculate confidence interval
  // Wider intervals for longer horizons
  const baseMargin = 5;
  const horizonMultiplier = horizon / 30;
  const margin = baseMargin * horizonMultiplier;
  
  // Add uncertainty from residuals
  const residuals = scores.map((s, i) => s - (slope * i + intercept));
  const residualStdDev = Math.sqrt(
    residuals.reduce((sum, r) => sum + r * r, 0) / residuals.length
  );
  
  const totalMargin = margin + residualStdDev * horizonMultiplier;
  
  const confidence = {
    lower: Math.max(0, predicted - totalMargin),
    upper: Math.min(100, predicted + totalMargin),
  };
  
  // Identify drivers
  const drivers: string[] = [];
  
  if (slope > 0.1) {
    drivers.push('Positive historical trend');
  } else if (slope < -0.1) {
    drivers.push('Negative historical trend');
  } else {
    drivers.push('Stable historical performance');
  }
  
  if (seasonality.detected) {
    drivers.push(`Seasonal pattern detected (${seasonality.amplitude.toFixed(1)} point amplitude)`);
  }
  
  const recentVelocity = calculateCitationVelocity(sorted.slice(-5));
  if (Math.abs(recentVelocity) > 0.1) {
    drivers.push(`Recent velocity: ${recentVelocity > 0 ? 'accelerating' : 'decelerating'}`);
  }
  
  return {
    predicted: Math.round(predicted * 100) / 100,
    confidence: {
      lower: Math.round(confidence.lower * 100) / 100,
      upper: Math.round(confidence.upper * 100) / 100,
    },
    drivers,
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Generate forecasts for multiple horizons
 */
export function generateForecasts(
  _currentScore: number,
  historicalTrend: TemporalData[]
): ForecastResult {
  // Generate forecasts for each horizon
  const horizons: ForecastResult['horizons'] = [
    { days: 30, ...generateForecast(historicalTrend, 30) },
    { days: 60, ...generateForecast(historicalTrend, 60) },
    { days: 90, ...generateForecast(historicalTrend, 90) },
  ];
  
  // Calculate citation velocity
  const citationVelocity = calculateCitationVelocity(historicalTrend);
  
  // Detect seasonal factors
  const seasonality = detectSeasonality(historicalTrend);
  
  return {
    horizons,
    citationVelocity: Math.round(citationVelocity * 1000) / 1000,
    seasonalFactors: seasonality.factors,
  };
}

/**
 * Explain forecast
 * Provides human-readable explanation of forecast drivers
 */
export function explainForecast(
  forecast: ForecastResult,
  currentScore: number
): {
  summary: string;
  keyInsights: string[];
  recommendations: string[];
} {
  const { horizons, citationVelocity, seasonalFactors } = forecast;
  
  // Generate summary
  const day30Forecast = horizons.find(h => h.days === 30);
  const day90Forecast = horizons.find(h => h.days === 90);
  
  let trend = 'stable';
  if (day30Forecast && day30Forecast.predicted > currentScore + 5) {
    trend = 'improving';
  } else if (day30Forecast && day30Forecast.predicted < currentScore - 5) {
    trend = 'declining';
  }
  
  const summary = `Your citation probability is ${trend}. ` +
    `Expected to ${day30Forecast ? (day30Forecast.predicted > currentScore ? 'increase' : 'decrease') : 'remain stable'} ` +
    `to ${day30Forecast?.predicted.toFixed(1) || currentScore.toFixed(1)} in 30 days.`;
  
  // Key insights
  const keyInsights: string[] = [];
  
  if (Math.abs(citationVelocity) > 0.1) {
    keyInsights.push(
      `Citation velocity is ${citationVelocity > 0 ? 'positive' : 'negative'} ` +
      `at ${Math.abs(citationVelocity).toFixed(3)} points per day`
    );
  }
  
  if (seasonalFactors.length > 0) {
    const maxSeasonal = seasonalFactors.reduce((max, f) => f.multiplier > max.multiplier ? f : max);
    const minSeasonal = seasonalFactors.reduce((min, f) => f.multiplier < min.multiplier ? f : min);
    
    if (maxSeasonal.multiplier - minSeasonal.multiplier > 0.1) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      keyInsights.push(
        `Seasonal patterns detected: peak in ${monthNames[maxSeasonal.month]}, ` +
        `low in ${monthNames[minSeasonal.month]}`
      );
    }
  }
  
  if (day90Forecast) {
    const confidenceWidth = day90Forecast.confidence.upper - day90Forecast.confidence.lower;
    if (confidenceWidth > 20) {
      keyInsights.push('High uncertainty in long-term forecast - more data needed');
    }
  }
  
  // Recommendations
  const recommendations: string[] = [];
  
  if (trend === 'declining') {
    recommendations.push('Implement quick-win optimizations to reverse the trend');
    recommendations.push('Review recent changes that may have negatively impacted performance');
  } else if (trend === 'stable') {
    recommendations.push('Focus on entity authority building to accelerate growth');
    recommendations.push('Add more factual claims with evidence');
  } else {
    recommendations.push('Maintain current optimization strategy');
    recommendations.push('Monitor for sustained improvement over next 30 days');
  }
  
  return {
    summary,
    keyInsights,
    recommendations,
  };
}

