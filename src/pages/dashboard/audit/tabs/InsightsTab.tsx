/**
 * InsightsTab Component
 * 
 * AI-powered insights and actionable recommendations.
 * Displays AI-generated insights and filterable recommendations.
 * 
 * Features:
 * - AI Insights Panel (migrated from AuditPage)
 * - Recommendations section with filtering
 * - Priority-based grouping (Critical/High/Medium/Low)
 * - Category filtering (11 categories)
 * - Effort filtering (Quick-win/Strategic/Long-term)
 * - Collapsible sections
 * - Code examples with copy functionality
 * 
 * Layout:
 * - Top: AI Insights Panel (blue theme)
 * - Middle: Filter controls
 * - Bottom: Grouped recommendations
 * 
 * Requirements:
 * - Content migration: Move AI Insights and Recommendations from AuditPage
 * - Filter setup: Priority, Category, Effort filters
 * - Visual organization: Grouped by priority with count badges
 * - Usability: Expand/collapse, copy code examples
 * 
 * Usage:
 * ```tsx
 * <TabContent isActive={activeTab === 'insights'}>
 *   <InsightsTab result={result} />
 * </TabContent>
 * ```
 */

import { useState } from 'react';
import { 
  Lightbulb, 
  TrendingUp,
  Filter,
  ChevronDown,
  ChevronUp,
  Copy,
  Check
} from 'lucide-react';
import type { AuditResult, EnhancedRecommendation } from '../../../../../utils/geoAuditEnhanced';
import { RecommendationsFilter } from './RecommendationsFilter';
import { QuickWins } from './QuickWins';
import { CorrelationAnalysis } from './CorrelationAnalysis';
import { ROICalculator } from './ROICalculator';

interface InsightsTabProps {
  /** Complete audit result data */
  result: AuditResult;
}

interface FilterState {
  priorities: string[];
  categories: string[];
  efforts: string[];
}

export function InsightsTab({ result }: InsightsTabProps) {
  const [filters, setFilters] = useState<FilterState>({
    priorities: [],
    categories: [],
    efforts: [],
  });
  const [expandedSections, setExpandedSections] = useState<string[]>(
    ['critical', 'high'] // Expand critical and high by default
  );

  // Filter recommendations
  const filteredRecommendations = result.recommendations.filter((rec) => {
    if (filters.priorities.length > 0 && !filters.priorities.includes(rec.priority)) {
      return false;
    }
    if (filters.categories.length > 0 && !filters.categories.includes(rec.category)) {
      return false;
    }
    if (filters.efforts.length > 0 && !filters.efforts.includes(rec.effort)) {
      return false;
    }
    return true;
  });

  // Group by priority
  const groupedRecommendations = {
    critical: filteredRecommendations.filter((r) => r.priority === 'critical'),
    high: filteredRecommendations.filter((r) => r.priority === 'high'),
    medium: filteredRecommendations.filter((r) => r.priority === 'medium'),
    low: filteredRecommendations.filter((r) => r.priority === 'low'),
  };

  const clearFilters = () => {
    setFilters({
      priorities: [],
      categories: [],
      efforts: [],
    });
  };

  const toggleSection = (section: string) => {
    if (expandedSections.includes(section)) {
      setExpandedSections(expandedSections.filter((s: string) => s !== section));
    } else {
      setExpandedSections([...expandedSections, section]);
    }
  };

  const expandAll = () => {
    setExpandedSections(['critical', 'high', 'medium', 'low']);
  };

  const collapseAll = () => {
    setExpandedSections([]);
  };

  return (
    <div className="space-y-3 md:space-y-4">
      {/* AI Insights Panel */}
      {result.insights && result.insights.length > 0 && (
        <div className="bg-black/20 border border-blue-500/30 p-3 md:p-4">
          <div className="flex items-center gap-2 mb-2 md:mb-3">
            <Lightbulb className="w-4 h-4 text-blue-400" />
            <h3 className="text-[10px] md:text-xs font-mono text-blue-300 uppercase tracking-wider">
              AI Insights
            </h3>
          </div>
          <div className="space-y-2">
            {result.insights.map((insight, idx) => (
              <div
                key={idx}
                className="bg-blue-500/10 border border-blue-500/20 p-2 md:p-3 rounded"
              >
                <p className="text-[11px] md:text-xs text-slate-300 leading-relaxed">
                  {insight}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Wins Section */}
      {result.recommendations && result.recommendations.length > 0 && (
        <QuickWins recommendations={result.recommendations} />
      )}

      {/* Correlation Analysis Section */}
      <CorrelationAnalysis result={result} />

      {/* ROI Calculator Section */}
      {result.recommendations && result.recommendations.length > 0 && (
        <ROICalculator 
          recommendations={result.recommendations} 
          currentScore={result.preciseScore} 
        />
      )}

      {/* Recommendations Section */}
      {result.recommendations && result.recommendations.length > 0 && (
        <div className="bg-black/20 border border-slate-800/50 p-3 md:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 md:mb-4 gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <h3 className="text-[10px] md:text-xs font-mono text-slate-300 uppercase tracking-wider">
                Action Plan & Recommendations
              </h3>
              <span className="text-[10px] md:text-xs text-slate-500 font-mono">
                ({filteredRecommendations.length} of {result.recommendations.length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={expandAll}
                className="text-[10px] md:text-xs text-slate-500 hover:text-slate-300 font-mono uppercase tracking-wider transition-colors"
              >
                Expand All
              </button>
              <span className="text-slate-700">|</span>
              <button
                onClick={collapseAll}
                className="text-[10px] md:text-xs text-slate-500 hover:text-slate-300 font-mono uppercase tracking-wider transition-colors"
              >
                Collapse All
              </button>
            </div>
          </div>

          {/* Filter UI */}
          <div className="mb-4">
            <RecommendationsFilter
              filters={filters}
              onFilterChange={setFilters}
              onClearFilters={clearFilters}
            />
          </div>

          {/* Grouped Recommendations */}
          <div className="space-y-3">
            {/* Critical Priority */}
            {groupedRecommendations.critical.length > 0 && (
              <RecommendationGroup
                priority="critical"
                label="Critical"
                count={groupedRecommendations.critical.length}
                recommendations={groupedRecommendations.critical}
                isExpanded={expandedSections.includes('critical')}
                onToggle={() => toggleSection('critical')}
              />
            )}

            {/* High Priority */}
            {groupedRecommendations.high.length > 0 && (
              <RecommendationGroup
                priority="high"
                label="High"
                count={groupedRecommendations.high.length}
                recommendations={groupedRecommendations.high}
                isExpanded={expandedSections.includes('high')}
                onToggle={() => toggleSection('high')}
              />
            )}

            {/* Medium Priority */}
            {groupedRecommendations.medium.length > 0 && (
              <RecommendationGroup
                priority="medium"
                label="Medium"
                count={groupedRecommendations.medium.length}
                recommendations={groupedRecommendations.medium}
                isExpanded={expandedSections.includes('medium')}
                onToggle={() => toggleSection('medium')}
              />
            )}

            {/* Low Priority */}
            {groupedRecommendations.low.length > 0 && (
              <RecommendationGroup
                priority="low"
                label="Low"
                count={groupedRecommendations.low.length}
                recommendations={groupedRecommendations.low}
                isExpanded={expandedSections.includes('low')}
                onToggle={() => toggleSection('low')}
              />
            )}
          </div>

          {/* No results message */}
          {filteredRecommendations.length === 0 && (
            <div className="text-center py-8">
              <Filter className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-600 font-mono">
                No recommendations match the current filters
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * RecommendationGroup Component
 * 
 * Collapsible group of recommendations by priority level.
 * Displays count badge and allows expand/collapse.
 */
interface RecommendationGroupProps {
  priority: 'critical' | 'high' | 'medium' | 'low';
  label: string;
  count: number;
  recommendations: EnhancedRecommendation[];
  isExpanded: boolean;
  onToggle: () => void;
}

function RecommendationGroup({
  priority,
  label,
  count,
  recommendations,
  isExpanded,
  onToggle,
}: RecommendationGroupProps) {
  const getColorClasses = (p: string) => {
    switch (p) {
      case 'critical':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          text: 'text-red-400',
          badge: 'bg-red-500/20 text-red-400 border-red-500/30',
        };
      case 'high':
        return {
          bg: 'bg-orange-500/10',
          border: 'border-orange-500/30',
          text: 'text-orange-400',
          badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        };
      case 'medium':
        return {
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/30',
          text: 'text-yellow-400',
          badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        };
      case 'low':
        return {
          bg: 'bg-slate-500/10',
          border: 'border-slate-500/30',
          text: 'text-slate-400',
          badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
        };
      default:
        return {
          bg: 'bg-slate-500/10',
          border: 'border-slate-500/30',
          text: 'text-slate-400',
          badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
        };
    }
  };

  const colors = getColorClasses(priority);

  return (
    <div className={`${colors.bg} border ${colors.border} rounded overflow-hidden transition-all`}>
      {/* Header - Clickable to expand/collapse */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/20 transition-all group"
      >
        <div className="flex items-center gap-3">
          <span className={`text-xs font-mono uppercase tracking-wider ${colors.text} group-hover:opacity-80 transition-opacity`}>
            {label}
          </span>
          <span className={`text-[10px] font-mono px-2 py-0.5 border rounded ${colors.badge}`}>
            {count}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className={`w-4 h-4 ${colors.text} transition-transform`} />
        ) : (
          <ChevronDown className={`w-4 h-4 ${colors.text} transition-transform`} />
        )}
      </button>

      {/* Content - Recommendations */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {recommendations.map((rec, idx) => (
            <RecommendationCard key={idx} recommendation={rec} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * RecommendationCard Component
 * 
 * Individual recommendation card with details and code example.
 */
interface RecommendationCardProps {
  recommendation: EnhancedRecommendation;
}

function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const [codeCopied, setCodeCopied] = useState(false);

  const copyCode = () => {
    if (recommendation.codeExample) {
      navigator.clipboard.writeText(recommendation.codeExample);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  return (
    <div className="bg-black/30 border border-slate-800/30 p-2 md:p-3 rounded hover:border-slate-700/50 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1">
          <div className="flex items-center flex-wrap gap-1.5 md:gap-2 mb-1.5">
            <span className={`text-[8px] md:text-[9px] font-mono uppercase px-1.5 py-0.5 border rounded ${
              recommendation.priority === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
              recommendation.priority === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
              recommendation.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
              'bg-slate-500/20 text-slate-400 border-slate-500/30'
            }`}>
              {recommendation.priority}
            </span>
            <span className="text-[10px] md:text-xs font-mono text-slate-400">
              {recommendation.category}
            </span>
            <span className={`text-[8px] md:text-[9px] font-mono uppercase px-1.5 py-0.5 border rounded ${
              recommendation.effort === 'quick-win' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
              recommendation.effort === 'strategic' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
              'bg-purple-500/20 text-purple-400 border-purple-500/30'
            }`}>
              {recommendation.effort}
            </span>
          </div>
          <h4 className="text-xs md:text-sm text-slate-200 font-medium leading-snug">
            {recommendation.title}
          </h4>
        </div>
      </div>

      {/* Description */}
      <p className="text-[11px] md:text-xs text-slate-400 mb-2 md:mb-3 leading-relaxed">
        {recommendation.description}
      </p>

      {/* Impact */}
      {recommendation.impact && (
        <div className="mb-2 bg-blue-500/5 border border-blue-500/20 p-2 rounded">
          <span className="text-[9px] md:text-[10px] font-mono text-blue-400 uppercase tracking-wider">
            Impact:
          </span>
          <span className="text-[10px] md:text-xs text-blue-300 ml-2">
            {recommendation.impact}
          </span>
        </div>
      )}

      {/* Implementation */}
      {recommendation.implementation && (
        <div className="mb-2 bg-emerald-500/5 border border-emerald-500/20 p-2 rounded">
          <span className="text-[9px] md:text-[10px] font-mono text-emerald-400 uppercase tracking-wider block mb-1">
            Implementation:
          </span>
          <p className="text-[10px] md:text-xs text-slate-300 leading-relaxed">
            {recommendation.implementation}
          </p>
        </div>
      )}

      {/* Estimated Time */}
      {recommendation.estimatedTime && (
        <div className="mb-2 flex items-center gap-2 flex-wrap">
          <span className="text-[9px] md:text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            Estimated Time:
          </span>
          <span className="text-[10px] md:text-xs text-slate-300 font-mono bg-slate-500/10 border border-slate-500/30 px-2 py-0.5 rounded">
            {recommendation.estimatedTime}
          </span>
        </div>
      )}

      {/* Code Example */}
      {recommendation.codeExample && (
        <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-slate-800/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] md:text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              Code Example
            </span>
            <button
              onClick={copyCode}
              className={`text-[10px] md:text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-1 px-2 py-1 rounded border min-h-[32px] ${
                codeCopied
                  ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                  : 'text-slate-500 hover:text-slate-300 border-slate-700/50 hover:border-slate-600/50 hover:bg-black/30'
              }`}
            >
              {codeCopied ? (
                <>
                  <Check className="w-3 h-3" />
                  <span className="hidden sm:inline">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span className="hidden sm:inline">Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="bg-black/50 border border-slate-800/50 p-2 md:p-3 rounded overflow-x-auto max-h-48 md:max-h-64 hover:border-slate-700/50 transition-colors">
            <code className="text-[10px] md:text-xs text-slate-300 font-mono leading-relaxed">
              {recommendation.codeExample}
            </code>
          </pre>
        </div>
      )}
    </div>
  );
}
