/**
 * Intent Triggers List - Technical Brutalist Design
 * Compact list grouped by intent
 */

import type { IntentTriggersListProps } from '../../lib/auxAudit/types';

export default function IntentTriggersList({ intentTriggers }: IntentTriggersListProps) {
  const getConfidenceColor = (confidence: string) => {
    if (confidence === 'high') return 'text-green-400 border-green-900';
    if (confidence === 'medium') return 'text-yellow-400 border-yellow-900';
    return 'text-slate-400 border-slate-800';
  };

  // Group by intent
  const grouped = intentTriggers.reduce((acc, trigger) => {
    if (!acc[trigger.intent]) acc[trigger.intent] = [];
    acc[trigger.intent].push(trigger);
    return {};
  }, {} as Record<string, typeof intentTriggers>);

  const highConfidenceCount = intentTriggers.filter(t => t.confidence === 'high').length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="font-mono text-slate-600">ACTIONS</span>
        <span className="font-mono text-green-400">{highConfidenceCount} HIGH_CONF</span>
      </div>

      <div className="space-y-1">
        {intentTriggers.map((trigger, index) => (
          <div 
            key={index}
            className={`py-2 px-2 bg-slate-900/50 border-l-2 ${getConfidenceColor(trigger.confidence)}`}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="font-mono text-xs text-slate-300 uppercase">
                {trigger.intent}
              </span>
              <span className={`font-mono text-[10px] uppercase ${getConfidenceColor(trigger.confidence)}`}>
                {trigger.confidence}
              </span>
            </div>
            
            {trigger.element.text && (
              <p className="text-xs text-slate-500 font-mono mb-1">
                "{trigger.element.text}"
              </p>
            )}
            
            <div className="text-[10px] text-slate-600 font-mono">
              {trigger.selector}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
