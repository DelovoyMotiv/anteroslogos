/**
 * Insights Panel Component
 * Displays AI-generated insights about the audit
 */

import { Lightbulb } from 'lucide-react';

interface InsightsPanelProps {
  insights: string[];
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  if (!insights || insights.length === 0) {
    return null;
  }

  return (
    <div className="bg-black/20 border border-blue-500/30 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-blue-400" />
        <h3 className="text-xs font-mono text-blue-300 uppercase tracking-wider">
          AI Insights
        </h3>
      </div>
      <div className="space-y-2">
        {insights.map((insight, idx) => (
          <div
            key={idx}
            className="bg-blue-500/10 border border-blue-500/20 p-3 rounded"
          >
            <p className="text-xs text-slate-300 leading-relaxed">
              {insight}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
