/**
 * Precise Score Display Component
 * Shows overall score with 3 decimal places and grade
 */

import { CheckCircle, TrendingUp } from 'lucide-react';

interface PreciseScoreDisplayProps {
  overallScore: number;
  preciseScore: number;
  grade: string;
  scoreBreakdown?: {
    core: number;
    technical: number;
    content: number;
    weighted: number;
  };
}

export function PreciseScoreDisplay({ 
  overallScore, 
  preciseScore, 
  grade, 
  scoreBreakdown 
}: PreciseScoreDisplayProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-emerald-500/20 to-emerald-600/10';
    if (score >= 60) return 'from-yellow-500/20 to-orange-500/10';
    if (score >= 40) return 'from-orange-500/20 to-red-500/10';
    return 'from-red-500/20 to-red-700/10';
  };

  const getGradeDescription = (grade: string) => {
    switch (grade) {
      case 'Authority':
        return 'Exceptional GEO optimization - industry-leading implementation';
      case 'Expert':
        return 'Advanced GEO implementation - strong AI visibility';
      case 'Advanced':
        return 'Solid GEO foundation - good AI discoverability';
      case 'Intermediate':
        return 'Basic GEO implementation - room for improvement';
      case 'Beginner':
        return 'Limited GEO optimization - significant improvements needed';
      default:
        return '';
    }
  };

  return (
    <div className={`bg-gradient-to-r ${getScoreGradient(overallScore)} border border-slate-800/50 p-6`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Overall GEO Score
            </span>
          </div>
          
          {/* Precise Score with 3 decimals */}
          <div className="flex items-baseline gap-3 mb-2">
            <div className={`text-5xl font-bold ${getScoreColor(overallScore)} font-mono`}>
              {preciseScore.toFixed(3)}
            </div>
            <div className="text-slate-500 text-sm font-mono">/ 100.000</div>
          </div>

          {/* Grade */}
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-lg font-semibold ${getScoreColor(overallScore)}`}>
              {grade}
            </span>
            <span className="text-xs text-slate-500">Grade</span>
          </div>

          {/* Grade Description */}
          <p className="text-xs text-slate-400 mb-4 max-w-md">
            {getGradeDescription(grade)}
          </p>

          {/* Score Breakdown */}
          {scoreBreakdown && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-700/50">
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">
                  Core GEO
                </div>
                <div className={`text-xl font-bold font-mono ${getScoreColor(scoreBreakdown.core)}`}>
                  {scoreBreakdown.core.toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">
                  Technical
                </div>
                <div className={`text-xl font-bold font-mono ${getScoreColor(scoreBreakdown.technical)}`}>
                  {scoreBreakdown.technical.toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">
                  Content
                </div>
                <div className={`text-xl font-bold font-mono ${getScoreColor(scoreBreakdown.content)}`}>
                  {scoreBreakdown.content.toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">
                  Weighted
                </div>
                <div className={`text-xl font-bold font-mono ${getScoreColor(scoreBreakdown.weighted)}`}>
                  {scoreBreakdown.weighted.toFixed(3)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Trend Indicator */}
        <div className="flex flex-col items-end">
          <TrendingUp className={`w-8 h-8 ${getScoreColor(overallScore)}`} />
          <span className="text-xs text-slate-500 mt-1">Score</span>
        </div>
      </div>
    </div>
  );
}
