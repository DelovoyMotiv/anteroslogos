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
    <div className={`
      bg-gradient-to-r ${getScoreGradient(overallScore)} 
      border border-slate-800/50 
      p-6 md:p-8 
      rounded-xl 
      shadow-2xl 
      hover:shadow-3xl 
      transition-all duration-500 ease-out
      hover:scale-[1.01]
      group
    `}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2.5 mb-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider group-hover:text-slate-300 transition-colors">
              Overall GEO Score
            </span>
          </div>
          
          {/* Precise Score with 3 decimals */}
          <div className="flex items-baseline gap-3 mb-3">
            <div className={`
              text-5xl md:text-6xl font-bold ${getScoreColor(overallScore)} font-mono 
              transition-all duration-500 group-hover:scale-105
              drop-shadow-lg
            `}>
              {preciseScore.toFixed(3)}
            </div>
            <div className="text-slate-500 text-sm font-mono group-hover:text-slate-400 transition-colors">
              / 100.000
            </div>
          </div>

          {/* Grade with enhanced styling */}
          <div className="flex items-center gap-3 mb-4">
            <span className={`
              text-xl font-semibold ${getScoreColor(overallScore)}
              px-3 py-1 rounded-lg
              bg-black/20 border border-current/20
              transition-all duration-300
              group-hover:scale-105 group-hover:shadow-lg
            `}>
              {grade}
            </span>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Grade</span>
          </div>

          {/* Grade Description */}
          <p className="text-xs text-slate-400 mb-5 max-w-md leading-relaxed group-hover:text-slate-300 transition-colors">
            {getGradeDescription(grade)}
          </p>

          {/* Score Breakdown with enhanced cards */}
          {scoreBreakdown && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-5 pt-5 border-t border-slate-700/50">
              <div className="bg-black/20 border border-slate-700/30 rounded-lg p-3 hover:bg-black/30 hover:border-slate-600/50 transition-all duration-300 hover:scale-105 group/card">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5 group-hover/card:text-slate-400 transition-colors">
                  Core GEO
                </div>
                <div className={`text-xl md:text-2xl font-bold font-mono ${getScoreColor(scoreBreakdown.core)} transition-transform duration-300 group-hover/card:scale-110`}>
                  {scoreBreakdown.core.toFixed(1)}
                </div>
              </div>
              <div className="bg-black/20 border border-slate-700/30 rounded-lg p-3 hover:bg-black/30 hover:border-slate-600/50 transition-all duration-300 hover:scale-105 group/card">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5 group-hover/card:text-slate-400 transition-colors">
                  Technical
                </div>
                <div className={`text-xl md:text-2xl font-bold font-mono ${getScoreColor(scoreBreakdown.technical)} transition-transform duration-300 group-hover/card:scale-110`}>
                  {scoreBreakdown.technical.toFixed(1)}
                </div>
              </div>
              <div className="bg-black/20 border border-slate-700/30 rounded-lg p-3 hover:bg-black/30 hover:border-slate-600/50 transition-all duration-300 hover:scale-105 group/card">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5 group-hover/card:text-slate-400 transition-colors">
                  Content
                </div>
                <div className={`text-xl md:text-2xl font-bold font-mono ${getScoreColor(scoreBreakdown.content)} transition-transform duration-300 group-hover/card:scale-110`}>
                  {scoreBreakdown.content.toFixed(1)}
                </div>
              </div>
              <div className="bg-black/20 border border-slate-700/30 rounded-lg p-3 hover:bg-black/30 hover:border-slate-600/50 transition-all duration-300 hover:scale-105 group/card">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5 group-hover/card:text-slate-400 transition-colors">
                  Weighted
                </div>
                <div className={`text-xl md:text-2xl font-bold font-mono ${getScoreColor(scoreBreakdown.weighted)} transition-transform duration-300 group-hover/card:scale-110`}>
                  {scoreBreakdown.weighted.toFixed(3)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Trend Indicator with animation */}
        <div className="flex flex-col items-end">
          <TrendingUp className={`
            w-8 h-8 md:w-10 md:h-10 ${getScoreColor(overallScore)}
            transition-all duration-500
            group-hover:scale-110 group-hover:rotate-12
            drop-shadow-lg
          `} />
          <span className="text-xs text-slate-500 mt-2 uppercase tracking-wider group-hover:text-slate-400 transition-colors">
            Score
          </span>
        </div>
      </div>
    </div>
  );
}
