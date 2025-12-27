/**
 * Recommendations List - Technical Brutalist Design
 * Compact list with priority and impact
 * Mobile-responsive
 */

import type { RecommendationsListProps } from '../../lib/auxAudit/types';

export default function RecommendationsList({ recommendations }: RecommendationsListProps) {
  const getPriorityColor = (priority: string) => {
    if (priority === 'high') return 'text-red-400 border-red-900';
    if (priority === 'medium') return 'text-yellow-400 border-yellow-900';
    return 'text-blue-400 border-blue-900';
  };

  const sorted = [...recommendations].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.impact - a.impact;
  });

  return (
    <div className="space-y-1">
      {sorted.map((rec, index) => (
        <div 
          key={index}
          className={`py-1.5 sm:py-2 px-2 bg-slate-900/50 border-l-2 ${getPriorityColor(rec.priority)}`}
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="font-mono text-[10px] sm:text-xs text-slate-300">
              {rec.title}
            </span>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <span className={`font-mono text-[9px] sm:text-[10px] uppercase ${getPriorityColor(rec.priority)}`}>
                {rec.priority}
              </span>
              <span className="font-mono text-[9px] sm:text-[10px] text-green-400">
                +{rec.impact}
              </span>
            </div>
          </div>
          <p className="text-[10px] sm:text-xs text-slate-500 font-mono leading-relaxed">
            {rec.description}
          </p>
        </div>
      ))}
    </div>
  );
}
