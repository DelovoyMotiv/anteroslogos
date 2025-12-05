/**
 * Temporal Analyzer
 * Analyzes historical trends, detects anomalies, and provides temporal insights
 * 
 * This module implements:
 * 1. Trend analysis using linear regression
 * 2. Seasonality detection using STL decomposition
 * 3. Change point detection using PELT algorithm
 * 4. Anomaly detection using Bayesian methods
 * 
 * @module lib/citationIntelligence/temporalAnalyzer
 */

import type {
  TrendAnalysis,
  Anomaly,
  TemporalData,
  TimeSeriesData,
} from '../../types/citation-intelligence.types';

// ============================================================================
// Time Series Decomposition (STL)
// ============================================================================

/**
 * Decompose time series into trend, seasonal, and residual components
 * Simplified STL (Seasonal and Trend decomposition using Loess)
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

// ============================================================================
// Linear Regression for Trend Detection
// ============================================================================

/**
 * Perform linear regression on time series data
 * Returns slope, intercept, and R² (goodness of fit)
 */
function linearRegression(
  values: number[]
): {
  slope: number;
  intercept: number;
  r2: number;
} {
  const n = values.length;
  
  if (n < 2) {
    return { slope: 0, intercept: values[0] || 0, r2: 0 };
  }
  
  // Calculate means
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((sum, v) => sum + v, 0) / n;
  
  // Calculate slope
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += (i - xMean) ** 2;
  }
  
  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;
  
  // Calculate R² (coefficient of determination)
  let ssTotal = 0;
  let ssResidual = 0;
  
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    ssTotal += (values[i] - yMean) ** 2;
    ssResidual += (values[i] - predicted) ** 2;
  }
  
  const r2 = ssTotal === 0 ? 0 : 1 - (ssResidual / ssTotal);
  
  return {
    slope: Number.isFinite(slope) ? slope : 0,
    intercept: Number.isFinite(intercept) ? intercept : 0,
    r2: Number.isFinite(r2) ? Math.max(0, Math.min(1, r2)) : 0,
  };
}

// ============================================================================
// Change Point Detection (PELT Algorithm)
// ============================================================================

/**
 * Detect change points using PELT (Pruned Exact Linear Time) algorithm
 * Simplified implementation for detecting significant shifts in mean
 */
function detectChangePoints(
  values: number[],
  timestamps: Date[],
  minSegmentLength: number = 5,
  penalty: number = 10
): {
  date: Date;
  magnitude: number;
  significance: number;
}[] {
  const n = values.length;
  
  if (n < minSegmentLength * 2) {
    return [];
  }
  
  // Calculate cumulative sum
  const cumSum = [0];
  for (let i = 0; i < n; i++) {
    cumSum.push(cumSum[i] + values[i]);
  }
  
  // Find potential change points
  const changePoints: { index: number; cost: number }[] = [];
  
  for (let i = minSegmentLength; i < n - minSegmentLength; i++) {
    // Calculate mean before and after potential change point
    const meanBefore = cumSum[i] / i;
    const meanAfter = (cumSum[n] - cumSum[i]) / (n - i);
    
    // Calculate cost (sum of squared errors)
    let costBefore = 0;
    let costAfter = 0;
    
    for (let j = 0; j < i; j++) {
      costBefore += (values[j] - meanBefore) ** 2;
    }
    
    for (let j = i; j < n; j++) {
      costAfter += (values[j] - meanAfter) ** 2;
    }
    
    const totalCost = costBefore + costAfter + penalty;
    
    // Calculate cost without change point
    const overallMean = cumSum[n] / n;
    let costNoChange = 0;
    for (let j = 0; j < n; j++) {
      costNoChange += (values[j] - overallMean) ** 2;
    }
    
    // If change point reduces cost significantly, add it
    if (totalCost < costNoChange * 0.9) {
      changePoints.push({ index: i, cost: costNoChange - totalCost });
    }
  }
  
  // Sort by cost (most significant first) and take top 3
  changePoints.sort((a, b) => b.cost - a.cost);
  const topChangePoints = changePoints.slice(0, 3);
  
  // Convert to result format
  return topChangePoints.map(cp => {
    const magnitude = Math.abs(
      values.slice(cp.index).reduce((sum, v) => sum + v, 0) / (n - cp.index) -
      values.slice(0, cp.index).reduce((sum, v) => sum + v, 0) / cp.index
    );
    
    // Significance based on cost reduction
    const maxCost = Math.max(...changePoints.map(c => c.cost));
    const significance = maxCost > 0 ? cp.cost / maxCost : 0;
    
    return {
      date: timestamps[cp.index],
      magnitude: Number.isFinite(magnitude) ? magnitude : 0,
      significance: Number.isFinite(significance) ? significance : 0,
    };
  });
}

// ============================================================================
// Seasonality Detection
// ============================================================================

/**
 * Detect seasonal patterns using STL decomposition
 */
function detectSeasonality(
  values: number[],
  period: number = 12
): {
  detected: boolean;
  period: number;
  amplitude: number;
} {
  if (values.length < period) {
    return { detected: false, period: 0, amplitude: 0 };
  }
  
  const { seasonal } = decomposeTimeSeries(values, period);
  
  // Calculate amplitude (max - min of seasonal component)
  const maxSeasonal = Math.max(...seasonal);
  const minSeasonal = Math.min(...seasonal);
  const amplitude = maxSeasonal - minSeasonal;
  
  // Detect if seasonality is significant (amplitude > 5% of mean)
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const detected = amplitude > mean * 0.05;
  
  return {
    detected,
    period: detected ? period : 0,
    amplitude: Number.isFinite(amplitude) ? amplitude : 0,
  };
}

// ============================================================================
// Anomaly Detection (Bayesian Structural Time Series)
// ============================================================================

/**
 * Calculate mean and standard deviation
 */
function calculateStats(values: number[]): { mean: number; stdDev: number } {
  const n = values.length;
  if (n === 0) return { mean: 0, stdDev: 0 };
  
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  
  return { mean, stdDev };
}

/**
 * Generate possible causes for anomalies based on context
 */
function generatePossibleCauses(
  anomaly: Omit<Anomaly, 'possibleCauses'>,
  data: TimeSeriesData,
  allData: TimeSeriesData[]
): string[] {
  const causes: string[] = [];
  
  // Check if it's a spike or drop
  if (anomaly.value > anomaly.expected) {
    causes.push('Unexpected increase in metric value');
    causes.push('Possible positive intervention or external event');
  } else {
    causes.push('Unexpected decrease in metric value');
    causes.push('Possible negative intervention or external event');
  }
  
  // Check if it's at the beginning or end of series
  const index = allData.findIndex(d => d.timestamp.getTime() === data.timestamp.getTime());
  if (index === 0) {
    causes.push('Initial data point - may reflect baseline establishment');
  } else if (index === allData.length - 1) {
    causes.push('Most recent data point - may reflect recent changes');
  }
  
  // Check magnitude
  if (Math.abs(anomaly.deviation) > 4) {
    causes.push('Extreme deviation suggests significant event or data quality issue');
  }
  
  return causes;
}

/**
 * Calculate median of an array
 */
function calculateMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    return sorted[mid];
  }
}

/**
 * Calculate Median Absolute Deviation (MAD)
 * More robust to outliers than standard deviation
 */
function calculateMAD(values: number[]): { median: number; mad: number } {
  const median = calculateMedian(values);
  const deviations = values.map(v => Math.abs(v - median));
  const mad = calculateMedian(deviations);
  
  return { median, mad };
}

/**
 * Detect single-point spikes using MAD-based method
 * This catches isolated anomalies before decomposition
 * Uses Median Absolute Deviation which is robust to outliers
 */
function detectSpikes(
  values: number[],
  timestamps: Date[],
  sensitivity: number
): Anomaly[] {
  const { median, mad } = calculateMAD(values);
  
  // MAD can be 0 if more than half the values are identical
  if (mad === 0) {
    // Fall back to simple threshold
    const spikes: Anomaly[] = [];
    for (let i = 0; i < values.length; i++) {
      if (Math.abs(values[i] - median) > 10) { // Arbitrary threshold
        const anomaly: Omit<Anomaly, 'possibleCauses'> = {
          date: timestamps[i],
          value: values[i],
          expected: median,
          deviation: Math.abs(values[i] - median) / 10,
          severity: 'warning',
        };
        
        const possibleCauses = generatePossibleCauses(
          anomaly,
          { timestamp: timestamps[i], value: values[i] },
          timestamps.map((t, idx) => ({ timestamp: t, value: values[idx] }))
        );
        
        spikes.push({ ...anomaly, possibleCauses });
      }
    }
    return spikes;
  }
  
  const spikes: Anomaly[] = [];
  
  // Modified z-score using MAD
  // Modified z-score = 0.6745 * (x - median) / MAD
  // Threshold: typically 3.5 for outliers
  const madConstant = 0.6745;
  
  for (let i = 0; i < values.length; i++) {
    const modifiedZScore = madConstant * Math.abs(values[i] - median) / mad;
    
    // Adjust threshold based on sensitivity parameter
    const threshold = sensitivity * 1.17; // Scale to match z-score sensitivity
    
    if (modifiedZScore >= threshold) {
      // Classify severity based on modified z-score
      // Convert back to equivalent standard deviations for classification
      const equivalentStdDevs = modifiedZScore / madConstant;
      
      let severity: 'critical' | 'warning' | 'info';
      if (equivalentStdDevs >= 4) {
        severity = 'critical';
      } else if (equivalentStdDevs >= 3) {
        severity = 'warning';
      } else {
        severity = 'info';
      }
      
      const anomaly: Omit<Anomaly, 'possibleCauses'> = {
        date: timestamps[i],
        value: values[i],
        expected: median,
        deviation: Math.round(equivalentStdDevs * 100) / 100,
        severity,
      };
      
      // Generate possible causes
      const possibleCauses = generatePossibleCauses(
        anomaly,
        { timestamp: timestamps[i], value: values[i] },
        timestamps.map((t, idx) => ({ timestamp: t, value: values[idx] }))
      );
      
      spikes.push({
        ...anomaly,
        possibleCauses,
      });
    }
  }
  
  return spikes;
}

/**
 * Detect anomalies using Bayesian structural time series approach
 * Simplified implementation using statistical methods
 * 
 * Uses a two-phase approach:
 * 1. Pre-decomposition spike detection (catches single-point anomalies)
 * 2. Post-decomposition residual analysis (catches sustained anomalies)
 * 
 * @param timeSeries - Time series data to analyze
 * @param sensitivity - Sensitivity threshold (default: 3 standard deviations)
 * @returns Array of detected anomalies
 */
export function detectAnomalies(
  timeSeries: TimeSeriesData[],
  sensitivity: number = 3
): Anomaly[] {
  if (timeSeries.length < 3) {
    return [];
  }
  
  // Sort by timestamp
  const sorted = [...timeSeries].sort((a, b) => 
    a.timestamp.getTime() - b.timestamp.getTime()
  );
  
  // Extract values and timestamps
  const values = sorted.map(d => d.value);
  const timestamps = sorted.map(d => d.timestamp);
  
  // Phase 1: Detect single-point spikes using z-score
  const spikes = detectSpikes(values, timestamps, sensitivity);
  
  // Phase 2: Decompose time series and detect anomalies in residuals
  const { trend, residual } = decomposeTimeSeries(values);
  
  // Calculate statistics on residuals (this represents the "noise")
  const { mean: residualMean, stdDev: residualStdDev } = calculateStats(residual);
  
  // Detect anomalies in residuals
  const residualAnomalies: Anomaly[] = [];
  
  for (let i = 0; i < sorted.length; i++) {
    const data = sorted[i];
    const value = values[i];
    const expected = trend[i];
    const residualValue = residual[i];
    
    // Calculate deviation in standard deviations
    const deviation = residualStdDev > 0 
      ? (residualValue - residualMean) / residualStdDev 
      : 0;
    
    // Check if deviation exceeds sensitivity threshold
    if (Math.abs(deviation) >= sensitivity) {
      // Classify severity
      let severity: 'critical' | 'warning' | 'info';
      if (Math.abs(deviation) >= 4) {
        severity = 'critical';
      } else if (Math.abs(deviation) >= 3) {
        severity = 'warning';
      } else {
        severity = 'info';
      }
      
      const anomaly: Omit<Anomaly, 'possibleCauses'> = {
        date: data.timestamp,
        value,
        expected,
        deviation: Math.round(deviation * 100) / 100,
        severity,
      };
      
      // Generate possible causes
      const possibleCauses = generatePossibleCauses(anomaly, data, sorted);
      
      residualAnomalies.push({
        ...anomaly,
        possibleCauses,
      });
    }
  }
  
  // Merge results, removing duplicates (prefer spike detection results)
  const anomalyMap = new Map<number, Anomaly>();
  
  // Add spikes first
  for (const spike of spikes) {
    anomalyMap.set(spike.date.getTime(), spike);
  }
  
  // Add residual anomalies if not already detected
  for (const anomaly of residualAnomalies) {
    if (!anomalyMap.has(anomaly.date.getTime())) {
      anomalyMap.set(anomaly.date.getTime(), anomaly);
    }
  }
  
  // Return sorted by date
  return Array.from(anomalyMap.values()).sort((a, b) => 
    a.date.getTime() - b.date.getTime()
  );
}

// ============================================================================
// Public API: Trend Analysis
// ============================================================================

/**
 * Analyze trend in historical audit data
 * 
 * @param history - Array of audit results
 * @param metric - Metric to analyze (e.g., 'overall', 'citationProbability')
 * @returns Trend analysis with direction, slope, R², seasonality, and change points
 */
export function analyzeTrend(
  history: TemporalData[],
  metric: string = 'overall'
): TrendAnalysis {
  // Filter and sort data
  const validData = history.filter(d => {
    const value = metric === 'overall' 
      ? d.scores.overall 
      : d.scores.citationProbability;
    return Number.isFinite(value) && value >= 0 && value <= 100;
  });
  
  if (validData.length < 2) {
    return {
      direction: 'stable',
      slope: 0,
      r2: 0,
      seasonality: { detected: false, period: 0, amplitude: 0 },
      changePoints: [],
    };
  }
  
  const sorted = [...validData].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  // Extract values and timestamps
  const values = sorted.map(d => 
    metric === 'overall' ? d.scores.overall : d.scores.citationProbability
  );
  const timestamps = sorted.map(d => new Date(d.timestamp));
  
  // Perform linear regression
  const { slope, r2 } = linearRegression(values);
  
  // Determine direction
  let direction: 'increasing' | 'decreasing' | 'stable';
  if (slope > 0.1) {
    direction = 'increasing';
  } else if (slope < -0.1) {
    direction = 'decreasing';
  } else {
    direction = 'stable';
  }
  
  // Detect seasonality
  const seasonality = detectSeasonality(values);
  
  // Detect change points
  const changePoints = detectChangePoints(values, timestamps);
  
  return {
    direction,
    slope: Math.round(slope * 1000) / 1000,
    r2: Math.round(r2 * 1000) / 1000,
    seasonality,
    changePoints,
  };
}

