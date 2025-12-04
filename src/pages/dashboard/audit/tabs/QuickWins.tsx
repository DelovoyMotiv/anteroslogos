/**
 * QuickWins Component
 * 
 * Displays top 5 quick-win recommendations based on ROI calculation.
 * ROI = Impact / Effort, prioritizing high-impact, low-effort tasks.
 * 
 * Features:
 * - ROI-based prioritization
 * - Potential score improvement display
 * - Estimated time for each recommendation
 * - Visual indicators for impact and effort
 * - Compact, actionable format
 * 
 * ROI Calculation:
 * - Impact: Based on priority (critical=4, high=3, medium=2, low=1)
 * - Effort: Based on effort level (quick-win=1, strategic=2, long-term=3)
 * - ROI Score: impact / effort (higher is better)
 * 
 * Score Improvement Estimation:
 * - Critical priority: +8-12 points
 * - High priority: +5-8 points
 * - Medium priority: +3-5 points
 * - Low priority: +1-3 points
 * 
 * Requirements:
 * - ROI calculation and prioritization
 * - Display top 5 quick wins
 * - Show potential score improvement
 * - Display estimated time
 * 
 * Usage:
 * ```tsx
 * <QuickWins recommendations={result.recommendations} />
 * ```
 */

import { Zap, TrendingUp, Clock, Target } from 'lucide-react';
import type { EnhancedRecommendation } from '../../../../../utils/geoAuditEnhanced';

interface QuickWinsProps {
  /** All recommendations from audit result */
  recommendations: EnhancedRecommendation[];
}

interface QuickWinItem extends EnhancedRecommendation {
  roiScore: number;
  potentialImprovement: string;
}

/**
 * Calculate ROI score for a recommendation
 * ROI = Impact / Effort (higher is better)
 */
function calculateROI(recommendation: EnhancedRecommendation): number {
  // Impact scoring based on priority
  const impactScores: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  // Effort scoring (lower is better, so we invert)
  const effortScores: Record<string, number> = {
    'quick-win': 1,
    strategic: 2,
    'long-term': 3,
  };

  const impact = impactScores[recommendation.priority] || 1;
  const effort = effortScores[recommendation.effort] || 2;

  // ROI = Impact / Effort
  // Multiply by 10 for better granularity
  return (impact / effort) * 10;
}

/**
 * Estimate potential score improvement based on priority
 */
function estimateScoreImprovement(priority: string): string {
  switch (priority) {
    case 'critical':
      return '+8-12 points';
    case 'high':
      return '+5-8 points';
    case 'medium':
      return '+3-5 points';
    case 'low':
      return '+1-3 points';
    default:
      return '+2-5 points';
  }
}

/**
 * Get top 5 quick wins based on ROI
 */
function getTopQuickWins(recommendations: EnhancedRecommendation[]): QuickWinItem[] {
  // Calculate ROI for each recommendation
  const withROI = recommendations.map((rec) => ({
    ...rec,
    roiScore: calculateROI(rec),
    potentialImprovement: estimateScoreImprovement(rec.priority),
  }));

  // Sort by ROI score (descending) and take top 5
  return withROI
    .sort((a, b) => b.roiScore - a.roiScore)
    .slice(0, 5);
}

export function QuickWins({ recommendations }: QuickWinsProps) {
  const quickWins = getTopQuickWins(recommendations);

  if (quickWins.length === 0) {
    return (
      <div className="bg-black/20 border border-slate-800/50 p-4 rounded">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-mono text-emerald-300 uppercase tracking-wider">
            Quick Wins
          </h3>
        </div>
        <p className="text-xs text-slate-500 text-center py-4">
          No quick wins available
        </p>
      </div>
    );
  }

  return (
    <div className="bg-black/20 border border-emerald-500/30 p-4 rounded">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-mono text-emerald-300 uppercase tracking-wider">
            Quick Wins
          </h3>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
          Top {quickWins.length} ROI
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-400 mb-4 leading-relaxed">
        High-impact, low-effort improvements ranked by ROI (Return on Investment).
        Start here for maximum score improvement with minimal time investment.
      </p>

      {/* Quick Wins List */}
      <div className="space-y-3">
        {quickWins.map((win, index) => (
          <QuickWinCard key={index} win={win} rank={index + 1} />
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-emerald-500/20">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Total Potential Impact:</span>
          </div>
          <span className="text-emerald-400 font-mono font-semibold">
            +{calculateTotalImpact(quickWins)} points
          </span>
        </div>
        <div className="flex items-center justify-between text-xs mt-2">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Total Time Investment:</span>
          </div>
          <span className="text-emerald-400 font-mono font-semibold">
            {calculateTotalTime(quickWins)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * QuickWinCard Component
 * 
 * Individual quick win recommendation card.
 */
interface QuickWinCardProps {
  win: QuickWinItem;
  rank: number;
}

function QuickWinCard({ win, rank }: QuickWinCardProps) {
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

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'quick-win':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'strategic':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'long-term':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  return (
    <div className="bg-black/30 border border-slate-800/30 p-3 rounded hover:border-emerald-500/30 transition-all group">
      {/* Header with Rank */}
      <div className="flex items-start gap-3 mb-2">
        {/* Rank Badge */}
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
          <span className="text-xs font-mono font-bold text-emerald-400">
            {rank}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4 className="text-sm text-slate-200 font-medium leading-snug mb-1.5 group-hover:text-emerald-300 transition-colors">
            {win.title}
          </h4>

          {/* Badges */}
          <div className="flex items-center flex-wrap gap-2 mb-2">
            <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 border rounded ${getPriorityColor(win.priority)}`}>
              {win.priority}
            </span>
            <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 border rounded ${getEffortColor(win.effort)}`}>
              {win.effort}
            </span>
            <span className="text-xs font-mono text-slate-400">
              {win.category}
            </span>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            {/* Potential Improvement */}
            <div className="bg-emerald-500/5 border border-emerald-500/20 p-2 rounded">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider">
                  Impact
                </span>
              </div>
              <span className="text-xs text-emerald-300 font-mono font-semibold">
                {win.potentialImprovement}
              </span>
            </div>

            {/* Estimated Time */}
            <div className="bg-blue-500/5 border border-blue-500/20 p-2 rounded">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="w-3 h-3 text-blue-400" />
                <span className="text-[9px] font-mono text-blue-400 uppercase tracking-wider">
                  Time
                </span>
              </div>
              <span className="text-xs text-blue-300 font-mono font-semibold">
                {win.estimatedTime}
              </span>
            </div>
          </div>

          {/* ROI Score (hidden, for debugging) */}
          {/* <div className="mt-2 text-[10px] text-slate-600 font-mono">
            ROI Score: {win.roiScore.toFixed(1)}
          </div> */}
        </div>
      </div>
    </div>
  );
}

/**
 * Calculate total potential impact from quick wins
 */
function calculateTotalImpact(wins: QuickWinItem[]): string {
  // Extract min and max from each improvement range
  let minTotal = 0;
  let maxTotal = 0;

  wins.forEach((win) => {
    const match = win.potentialImprovement.match(/\+(\d+)-(\d+)/);
    if (match) {
      minTotal += parseInt(match[1], 10);
      maxTotal += parseInt(match[2], 10);
    }
  });

  return `${minTotal}-${maxTotal}`;
}

/**
 * Calculate total time investment from quick wins
 */
function calculateTotalTime(wins: QuickWinItem[]): string {
  // Parse time estimates and sum them
  let totalMinutes = 0;
  let hasVariableTime = false;

  wins.forEach((win) => {
    const time = win.estimatedTime.toLowerCase();
    
    // Parse different time formats
    if (time.includes('hour')) {
      const hours = parseFloat(time);
      if (!isNaN(hours)) {
        totalMinutes += hours * 60;
      }
    } else if (time.includes('min')) {
      const minutes = parseFloat(time);
      if (!isNaN(minutes)) {
        totalMinutes += minutes;
      }
    } else if (time.includes('day')) {
      const days = parseFloat(time);
      if (!isNaN(days)) {
        totalMinutes += days * 8 * 60; // Assume 8-hour workday
      }
    } else {
      hasVariableTime = true;
    }
  });

  // Convert back to human-readable format
  if (totalMinutes === 0 || hasVariableTime) {
    return '2-4 hours'; // Default estimate
  }

  const hours = Math.round(totalMinutes / 60 * 10) / 10; // Round to 1 decimal
  
  if (hours < 1) {
    return `${Math.round(totalMinutes)} minutes`;
  } else if (hours < 8) {
    return `${hours} hours`;
  } else {
    const days = Math.round(hours / 8 * 10) / 10;
    return `${days} days`;
  }
}
