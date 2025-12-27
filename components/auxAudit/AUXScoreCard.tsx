/**
 * AUX Score Card - Technical Brutalist Design
 * Compact, data-dense display
 * Mobile-responsive
 */

import type { AUXScoreCardProps } from '../../lib/auxAudit/types';

export default function AUXScoreCard({ score, classification, summary }: AUXScoreCardProps) {
  const getScoreColor = () => {
    if (score >= 80) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getBarColor = () => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getClassificationColor = () => {
    if (classification === 'Agent-Ready') return 'text-green-400 border-green-900 bg-green-950/30';
    if (classification === 'Agent-Capable') return 'text-yellow-400 border-yellow-900 bg-yellow-950/30';
    return 'text-red-400 border-red-900 bg-red-950/30';
  };

  return (
    <div className="bg-slate-950 border border-slate-800 p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3">
        <div className="flex items-baseline gap-2 sm:gap-3">
          <span className={`text-3xl sm:text-4xl font-mono font-bold ${getScoreColor()}`}>
            {score}
          </span>
          <span className="text-slate-600 font-mono text-xs sm:text-sm">/100</span>
        </div>
        <div className={`px-2 sm:px-3 py-1 border font-mono text-[10px] sm:text-xs uppercase tracking-wider ${getClassificationColor()} self-start sm:self-auto`}>
          {classification}
        </div>
      </div>

      <div className="w-full bg-slate-900 h-1 mb-3">
        <div 
          className={`h-1 transition-all ${getBarColor()}`}
          style={{ width: `${score}%` }}
        />
      </div>

      <p className="text-[10px] sm:text-xs font-mono text-slate-400 leading-relaxed">
        {summary}
      </p>
    </div>
  );
}
