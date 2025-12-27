/**
 * Friction Points List - Technical Brutalist Design
 * Compact list with severity indicators
 */

import type { FrictionPointsListProps } from '../../lib/auxAudit/types';

export default function FrictionPointsList({ frictionPoints }: FrictionPointsListProps) {
  const getSeverityColor = (severity: string) => {
    if (severity === 'high') return 'text-red-400 border-red-900';
    if (severity === 'medium') return 'text-yellow-400 border-yellow-900';
    return 'text-slate-400 border-slate-800';
  };

  return (
    <div className="space-y-1">
      {frictionPoints.map((point, index) => (
        <div 
          key={index}
          className={`py-2 px-2 bg-slate-900/50 border-l-2 ${getSeverityColor(point.severity)}`}
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="font-mono text-xs text-slate-300 uppercase">
              {point.type}
            </span>
            <span className={`font-mono text-[10px] uppercase ${getSeverityColor(point.severity)}`}>
              {point.severity}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-mono">
            {point.description}
          </p>
          {point.location && (
            <p className="text-[10px] text-slate-600 font-mono mt-1">
              LOC: {point.location}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
