/**
 * ROICalculator Component
 * 
 * Comprehensive ROI (Return on Investment) calculator for recommendations.
 * Calculates impact vs effort, shows potential score improvements, and estimates time investment.
 * 
 * Features:
 * - Impact vs Effort matrix visualization
 * - Detailed ROI scoring for each recommendation
 * - Potential score improvement calculations
 * - Time investment estimates
 * - Priority-based grouping
 * - Visual ROI indicators
 * 
 * ROI Calculation Methodology:
 * - Impact Score: Based on priority (critical=4, high=3, medium=2, low=1)
 * - Effort Score: Based on effort level (quick-win=1, strategic=2, long-term=3)
 * - ROI Score: (impact / effort) * 10 for granularity
 * - Higher ROI = Better return on investment
 * 
 * Score Improvement Estimation:
 * - Critical: +8-12 points
 * - High: +5-8 points
 * - Medium: +3-5 points
 * - Low: +1-3 points
 * 
 * Time Investment Estimation:
 * - Parsed from estimatedTime field
 * - Aggregated for total investment
 * - Converted to human-readable format
 * 
 * Requirements:
 * - ROI calculation and prioritization
 * - Impact vs effort visualization
 * - Potential score improvements
 * - Time investment estimates
 * - Display in Insights tab
 * 
 * Usage:
 * ```tsx
 * <ROICalculator recommendations={result.recommendations} currentScore={result.preciseScore} />
 * ```
 */

import { 
  Calculator, 
  TrendingUp, 
  Clock, 
  Target,
  Zap,
  AlertCircle,
  ArrowUpRight,
  BarChart3
} from 'lucide-react';
import type { EnhancedRecommendation } from '../../../../../utils/geoAuditEnhanced';

interface ROICalculatorProps {
  /** All recommendations from audit result */
  recommendations: EnhancedRecommendation[];
  /** Current overall score for improvement calculations */
  currentScore: number;
}

interface ROIItem extends EnhancedRecommendation {
  roiScore: number;
  impactScore: number;
  effortScore: number;
  potentialImprovement: {
    min: number;
    max: number;
    display: string;
  };
  timeInMinutes: number;
}

/**
 * Calculate impact score based on priority
 */
function calculateImpactScore(priority: string): number {
  const impactScores: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };
  return impactScores[priority] || 1;
}

/**
 * Calculate effort score based on effort level
 */
function calculateEffortScore(effort: string): number {
  const effortScores: Record<string, number> = {
    'quick-win': 1,
    strategic: 2,
    'long-term': 3,
  };
  return effortScores[effort] || 2;
}

/**
 * Calculate ROI score
 * ROI = (Impact / Effort) * 10
 */
function calculateROI(impactScore: number, effortScore: number): number {
  return (impactScore / effortScore) * 10;
}

/**
 * Estimate potential score improvement based on priority
 */
function estimateScoreImprovement(priority: string): { min: number; max: number; display: string } {
  switch (priority) {
    case 'critical':
      return { min: 8, max: 12, display: '+8-12 points' };
    case 'high':
      return { min: 5, max: 8, display: '+5-8 points' };
    case 'medium':
      return { min: 3, max: 5, display: '+3-5 points' };
    case 'low':
      return { min: 1, max: 3, display: '+1-3 points' };
    default:
      return { min: 2, max: 5, display: '+2-5 points' };
  }
}

/**
 * Parse time estimate to minutes
 */
function parseTimeToMinutes(timeStr: string): number {
  const time = timeStr.toLowerCase();
  
  // Parse different time formats
  if (time.includes('hour')) {
    const hours = parseFloat(time);
    if (!isNaN(hours)) {
      return hours * 60;
    }
  } else if (time.includes('min')) {
    const minutes = parseFloat(time);
    if (!isNaN(minutes)) {
      return minutes;
    }
  } else if (time.includes('day')) {
    const days = parseFloat(time);
    if (!isNaN(days)) {
      return days * 8 * 60; // Assume 8-hour workday
    }
  } else if (time.includes('week')) {
    const weeks = parseFloat(time);
    if (!isNaN(weeks)) {
      return weeks * 5 * 8 * 60; // Assume 5-day work week
    }
  }
  
  // Default estimate
  return 120; // 2 hours
}

/**
 * Format minutes to human-readable time
 */
function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  } else if (minutes < 480) { // Less than 8 hours
    const hours = Math.round(minutes / 60 * 10) / 10;
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  } else {
    const days = Math.round(minutes / 480 * 10) / 10;
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  }
}

/**
 * Process recommendations with ROI calculations
 */
function processRecommendations(recommendations: EnhancedRecommendation[]): ROIItem[] {
  return recommendations.map((rec) => {
    const impactScore = calculateImpactScore(rec.priority);
    const effortScore = calculateEffortScore(rec.effort);
    const roiScore = calculateROI(impactScore, effortScore);
    const potentialImprovement = estimateScoreImprovement(rec.priority);
    const timeInMinutes = parseTimeToMinutes(rec.estimatedTime);

    return {
      ...rec,
      roiScore,
      impactScore,
      effortScore,
      potentialImprovement,
      timeInMinutes,
    };
  });
}

/**
 * Calculate total potential improvement
 */
function calculateTotalImprovement(items: ROIItem[]): { min: number; max: number; display: string } {
  const min = items.reduce((sum, item) => sum + item.potentialImprovement.min, 0);
  const max = items.reduce((sum, item) => sum + item.potentialImprovement.max, 0);
  return {
    min,
    max,
    display: `+${min}-${max} points`,
  };
}

/**
 * Calculate total time investment
 */
function calculateTotalTime(items: ROIItem[]): { minutes: number; display: string } {
  const minutes = items.reduce((sum, item) => sum + item.timeInMinutes, 0);
  return {
    minutes,
    display: formatTime(minutes),
  };
}

/**
 * Group recommendations by ROI tier
 */
function groupByROITier(items: ROIItem[]): {
  excellent: ROIItem[];
  good: ROIItem[];
  fair: ROIItem[];
  poor: ROIItem[];
} {
  return {
    excellent: items.filter((item) => item.roiScore >= 30), // ROI >= 30
    good: items.filter((item) => item.roiScore >= 20 && item.roiScore < 30), // 20 <= ROI < 30
    fair: items.filter((item) => item.roiScore >= 10 && item.roiScore < 20), // 10 <= ROI < 20
    poor: items.filter((item) => item.roiScore < 10), // ROI < 10
  };
}

export function ROICalculator({ recommendations, currentScore }: ROICalculatorProps) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="bg-black/20 border border-slate-800/50 p-4 rounded">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="w-4 h-4 text-purple-400" />
          <h3 className="text-xs font-mono text-purple-300 uppercase tracking-wider">
            ROI Calculator
          </h3>
        </div>
        <p className="text-xs text-slate-500 text-center py-4">
          No recommendations available for ROI analysis
        </p>
      </div>
    );
  }

  const roiItems = processRecommendations(recommendations);
  const sortedByROI = [...roiItems].sort((a, b) => b.roiScore - a.roiScore);
  const grouped = groupByROITier(roiItems);
  const totalImprovement = calculateTotalImprovement(roiItems);
  const totalTime = calculateTotalTime(roiItems);
  const projectedScore = Math.min(100, currentScore + (totalImprovement.min + totalImprovement.max) / 2);

  return (
    <div className="bg-black/20 border border-purple-500/30 p-4 rounded">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-purple-400" />
          <h3 className="text-xs font-mono text-purple-300 uppercase tracking-wider">
            ROI Calculator
          </h3>
        </div>
        <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded">
          {recommendations.length} Recommendations
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-400 mb-4 leading-relaxed">
        Comprehensive Return on Investment analysis for all recommendations.
        ROI = Impact / Effort, helping you prioritize improvements for maximum score gains.
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {/* Total Potential Improvement */}
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">
              Total Impact
            </span>
          </div>
          <div className="text-xl font-mono font-bold text-emerald-300 mb-1">
            {totalImprovement.display}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Projected Score: {projectedScore.toFixed(1)}
          </div>
        </div>

        {/* Total Time Investment */}
        <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider">
              Time Investment
            </span>
          </div>
          <div className="text-xl font-mono font-bold text-blue-300 mb-1">
            {totalTime.display}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Total effort required
          </div>
        </div>

        {/* Average ROI */}
        <div className="bg-purple-500/10 border border-purple-500/30 p-3 rounded">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider">
              Average ROI
            </span>
          </div>
          <div className="text-xl font-mono font-bold text-purple-300 mb-1">
            {(roiItems.reduce((sum, item) => sum + item.roiScore, 0) / roiItems.length).toFixed(1)}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Impact per effort unit
          </div>
        </div>
      </div>

      {/* ROI Distribution */}
      <div className="mb-4 bg-black/30 border border-slate-800/50 p-3 rounded">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-slate-400" />
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            ROI Distribution
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <ROITierCard
            label="Excellent"
            count={grouped.excellent.length}
            color="emerald"
            description="ROI ≥ 30"
          />
          <ROITierCard
            label="Good"
            count={grouped.good.length}
            color="blue"
            description="ROI 20-29"
          />
          <ROITierCard
            label="Fair"
            count={grouped.fair.length}
            color="yellow"
            description="ROI 10-19"
          />
          <ROITierCard
            label="Poor"
            count={grouped.poor.length}
            color="slate"
            description="ROI < 10"
          />
        </div>
      </div>

      {/* Top 10 by ROI */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              Top 10 by ROI
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            Highest return on investment
          </span>
        </div>
        <div className="space-y-2">
          {sortedByROI.slice(0, 10).map((item, index) => (
            <ROIItemCard key={index} item={item} rank={index + 1} />
          ))}
        </div>
      </div>

      {/* Implementation Strategy */}
      <div className="bg-blue-500/5 border border-blue-500/20 p-3 rounded">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-blue-400" />
          <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider">
            Implementation Strategy
          </span>
        </div>
        <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
          <p>
            <strong className="text-blue-300">Phase 1:</strong> Focus on Excellent ROI items ({grouped.excellent.length} items) 
            for quick wins and immediate score improvements.
          </p>
          <p>
            <strong className="text-blue-300">Phase 2:</strong> Tackle Good ROI items ({grouped.good.length} items) 
            for sustained progress and strategic improvements.
          </p>
          <p>
            <strong className="text-blue-300">Phase 3:</strong> Address Fair and Poor ROI items ({grouped.fair.length + grouped.poor.length} items) 
            for comprehensive optimization and long-term gains.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * ROITierCard Component
 * 
 * Displays count and description for an ROI tier.
 */
interface ROITierCardProps {
  label: string;
  count: number;
  color: 'emerald' | 'blue' | 'yellow' | 'slate';
  description: string;
}

function ROITierCard({ label, count, color, description }: ROITierCardProps) {
  const colorClasses = {
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    slate: 'bg-slate-500/10 border-slate-500/30 text-slate-400',
  };

  return (
    <div className={`border p-2 rounded ${colorClasses[color]}`}>
      <div className="text-2xl font-mono font-bold mb-1">
        {count}
      </div>
      <div className="text-[10px] font-mono uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-[9px] opacity-70">
        {description}
      </div>
    </div>
  );
}

/**
 * ROIItemCard Component
 * 
 * Individual recommendation card with ROI details.
 */
interface ROIItemCardProps {
  item: ROIItem;
  rank: number;
}

function ROIItemCard({ item, rank }: ROIItemCardProps) {
  const getROIColor = (score: number) => {
    if (score >= 30) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (score >= 20) return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    if (score >= 10) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'high':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'low':
        return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  return (
    <div className="bg-black/30 border border-slate-800/30 p-3 rounded hover:border-purple-500/30 transition-all group">
      <div className="flex items-start gap-3">
        {/* Rank Badge */}
        <div className="flex-shrink-0 w-7 h-7 rounded bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
          <span className="text-xs font-mono font-bold text-purple-400">
            {rank}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4 className="text-sm text-slate-200 font-medium leading-snug mb-2 group-hover:text-purple-300 transition-colors">
            {item.title}
          </h4>

          {/* Badges */}
          <div className="flex items-center flex-wrap gap-2 mb-3">
            <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 border rounded ${getPriorityColor(item.priority)}`}>
              {item.priority}
            </span>
            <span className="text-xs font-mono text-slate-400">
              {item.category}
            </span>
            <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 border rounded font-bold ${getROIColor(item.roiScore)}`}>
              ROI: {item.roiScore.toFixed(1)}
            </span>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-2">
            {/* Impact */}
            <div className="bg-emerald-500/5 border border-emerald-500/20 p-2 rounded">
              <div className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider mb-1">
                Impact
              </div>
              <div className="text-xs text-emerald-300 font-mono font-semibold">
                {item.potentialImprovement.display}
              </div>
            </div>

            {/* Effort */}
            <div className="bg-blue-500/5 border border-blue-500/20 p-2 rounded">
              <div className="text-[9px] font-mono text-blue-400 uppercase tracking-wider mb-1">
                Effort
              </div>
              <div className="text-xs text-blue-300 font-mono font-semibold capitalize">
                {item.effort.replace('-', ' ')}
              </div>
            </div>

            {/* Time */}
            <div className="bg-purple-500/5 border border-purple-500/20 p-2 rounded">
              <div className="text-[9px] font-mono text-purple-400 uppercase tracking-wider mb-1">
                Time
              </div>
              <div className="text-xs text-purple-300 font-mono font-semibold">
                {item.estimatedTime}
              </div>
            </div>
          </div>
        </div>

        {/* ROI Arrow */}
        <div className="flex-shrink-0">
          <ArrowUpRight className={`w-5 h-5 ${
            item.roiScore >= 30 ? 'text-emerald-400' :
            item.roiScore >= 20 ? 'text-blue-400' :
            item.roiScore >= 10 ? 'text-yellow-400' :
            'text-slate-400'
          }`} />
        </div>
      </div>
    </div>
  );
}
