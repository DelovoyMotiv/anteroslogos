/**
 * Protocol Grid - Technical Brutalist Design
 * Compact table layout
 * Mobile-responsive
 */

import type { ProtocolGridProps } from '../../lib/auxAudit/types';

export default function ProtocolGrid({ protocols }: ProtocolGridProps) {
  const availableCount = protocols.filter(p => p.available).length;
  const totalCount = protocols.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] sm:text-xs mb-2">
        <span className="font-mono text-slate-600">STATUS</span>
        <span className="font-mono text-slate-400">{availableCount}/{totalCount} AVAILABLE</span>
      </div>

      <div className="space-y-1">
        {protocols.map((protocol) => (
          <div 
            key={protocol.name}
            className="flex items-center justify-between py-1.5 px-2 bg-slate-900/50 border-l-2 border-slate-800 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-mono text-[10px] sm:text-xs text-slate-300 truncate">
                {protocol.name}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {protocol.available ? (
                <span className="font-mono text-[9px] sm:text-[10px] text-green-400 uppercase">FOUND</span>
              ) : (
                <span className="font-mono text-[9px] sm:text-[10px] text-red-400 uppercase">NOT_FOUND</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
