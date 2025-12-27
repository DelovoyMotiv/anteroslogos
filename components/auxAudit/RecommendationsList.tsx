/**
 * Recommendations List Component
 * 
 * Displays prioritized recommendations for improving agent experience.
 * Shows code examples and documentation links when available.
 * Implements expandable/collapsible sections for detailed information.
 * 
 * Requirements: 9.4, 11.5
 */

import { useState } from 'react';
import { Lightbulb, ChevronDown, ChevronUp, Code, ExternalLink, TrendingUp, AlertCircle, Info } from 'lucide-react';
import type { RecommendationsListProps, Priority } from '../../lib/auxAudit/types';

/**
 * Get color classes based on priority
 * - Red: high priority
 * - Yellow: medium priority
 * - Blue: low priority
 */
function getPriorityColors(priority: Priority): {
  textColor: string;
  bgColor: string;
  borderColor: string;
  icon: typeof AlertCircle;
} {
  switch (priority) {
    case 'high':
      return {
        textColor: 'text-red-400',
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/30',
        icon: AlertCircle,
      };
    case 'medium':
      return {
        textColor: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        borderColor: 'border-yellow-500/30',
        icon: TrendingUp,
      };
    case 'low':
      return {
        textColor: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-500/30',
        icon: Info,
      };
  }
}

export default function RecommendationsList({ recommendations }: RecommendationsListProps) {
  // Group recommendations by priority
  const highPriority = recommendations.filter(r => r.priority === 'high');
  const mediumPriority = recommendations.filter(r => r.priority === 'medium');
  const lowPriority = recommendations.filter(r => r.priority === 'low');

  const totalCount = recommendations.length;
  const highCount = highPriority.length;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-bold flex items-center gap-2 text-slate-100">
          <Lightbulb className="w-5 h-5 text-yellow-400" />
          Recommendations
        </h3>
        <span className="text-sm text-slate-400">
          {totalCount} {totalCount === 1 ? 'suggestion' : 'suggestions'}
        </span>
      </div>

      {totalCount === 0 ? (
        // No recommendations - show success message
        <div className="p-6 bg-gradient-to-br from-green-900/20 to-green-900/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Lightbulb className="w-6 h-6 text-green-400" />
            </div>
            <h4 className="text-lg font-semibold text-green-400">
              No Recommendations
            </h4>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            Great job! Your site is well-optimized for autonomous agents. 
            No immediate improvements are needed at this time.
          </p>
        </div>
      ) : (
        <>
          {/* Summary banner */}
          <div className={`p-4 mb-4 rounded-lg border ${
            highCount > 0 
              ? 'bg-red-500/10 border-red-500/30' 
              : mediumPriority.length > 0
              ? 'bg-yellow-500/10 border-yellow-500/30'
              : 'bg-blue-500/10 border-blue-500/30'
          }`}>
            <p className="text-sm text-slate-300">
              {highCount > 0 ? (
                <>
                  <span className="text-red-400 font-semibold">{highCount} high-priority {highCount === 1 ? 'recommendation' : 'recommendations'}</span> available. 
                  Implementing these will significantly improve your AUX Score.
                </>
              ) : mediumPriority.length > 0 ? (
                <>
                  <span className="text-yellow-400 font-semibold">{mediumPriority.length} medium-priority {mediumPriority.length === 1 ? 'recommendation' : 'recommendations'}</span> available. 
                  These improvements will enhance agent experience.
                </>
              ) : (
                <>
                  <span className="text-blue-400 font-semibold">{lowPriority.length} low-priority {lowPriority.length === 1 ? 'recommendation' : 'recommendations'}</span> available. 
                  Consider these for further optimization.
                </>
              )}
            </p>
          </div>

          {/* Recommendations list */}
          <div className="space-y-3">
            {/* High priority first */}
            {highPriority.map((recommendation, index) => (
              <RecommendationCard key={`high-${index}`} recommendation={recommendation} />
            ))}
            
            {/* Medium priority */}
            {mediumPriority.map((recommendation, index) => (
              <RecommendationCard key={`medium-${index}`} recommendation={recommendation} />
            ))}
            
            {/* Low priority */}
            {lowPriority.map((recommendation, index) => (
              <RecommendationCard key={`low-${index}`} recommendation={recommendation} />
            ))}
          </div>

          {/* Info footer */}
          <div className="mt-4 p-3 bg-slate-900/40 border border-slate-700 rounded-lg">
            <p className="text-xs text-slate-500 leading-snug">
              Recommendations are prioritized by their potential impact on your AUX Score. 
              Focus on high-priority items first for the greatest improvement.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Individual recommendation card with expandable details
 */
function RecommendationCard({ recommendation }: { recommendation: RecommendationsListProps['recommendations'][0] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const priorityColors = getPriorityColors(recommendation.priority);
  const PriorityIcon = priorityColors.icon;
  
  const hasDetails = recommendation.codeExample || recommendation.docLink;

  return (
    <div className={`bg-gradient-to-br from-slate-900/80 to-slate-900/40 border ${priorityColors.borderColor} rounded-lg overflow-hidden`}>
      {/* Main content - always visible */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`p-2 ${priorityColors.bgColor} rounded-lg flex-shrink-0`}>
            <Lightbulb className={`w-5 h-5 ${priorityColors.textColor}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header with priority and impact */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h4 className="font-semibold text-slate-200">
                {recommendation.title}
              </h4>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${priorityColors.bgColor} ${priorityColors.textColor}`}>
                <PriorityIcon className="w-3 h-3" />
                {recommendation.priority.charAt(0).toUpperCase() + recommendation.priority.slice(1)} Priority
              </span>
              {recommendation.impact > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                  <TrendingUp className="w-3 h-3" />
                  +{recommendation.impact} AUX Score
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-sm text-slate-300 leading-relaxed">
              {recommendation.description}
            </p>

            {/* Expand/Collapse button (only if there are details) */}
            {hasDetails && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Show Details
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expandable details section */}
      {hasDetails && isExpanded && (
        <div className="border-t border-slate-700 bg-slate-900/60">
          {/* Code example */}
          {recommendation.codeExample && (
            <div className="p-4 border-b border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Code className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Code Example
                </span>
              </div>
              <div className="bg-slate-950 rounded-lg p-3 overflow-x-auto">
                <pre className="text-xs text-slate-300 font-mono leading-relaxed">
                  <code>{recommendation.codeExample}</code>
                </pre>
              </div>
            </div>
          )}

          {/* Documentation link */}
          {recommendation.docLink && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <ExternalLink className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Documentation
                </span>
              </div>
              <a
                href={recommendation.docLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors group"
              >
                <span className="underline">{recommendation.docLink}</span>
                <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
