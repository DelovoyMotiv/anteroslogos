/**
 * OverviewTab Component
 * 
 * Overview tab content for GEO Audit results.
 * Displays high-level summary, key metrics, charts, and category scores.
 * 
 * Features:
 * - Precise score display with grade
 * - Export buttons for all formats
 * - Quick Summary with top 3-5 insights (color-coded with icons)
 * - Score breakdown chart
 * - Category scores chart
 * - All 11 category score cards in grid
 * 
 * Requirements:
 * - Code organization: Extract from AuditPage
 * - No functionality loss: All components preserved
 * - Consistent styling: Matches existing design system
 * - Information density: Maximum insights in minimal space
 * - Visual clarity: Clear icons and color coding
 * 
 * Usage:
 * ```tsx
 * <TabContent isActive={activeTab === 'overview'}>
 *   <OverviewTab result={result} />
 * </TabContent>
 * ```
 */

import { PreciseScoreDisplay } from '../PreciseScoreDisplay';
import { ScoreBreakdownChart } from '../ScoreBreakdownChart';
import { CategoryScoresChart } from '../CategoryScoresChart';
import { ExportButtons } from '../ExportButtons';
import { QuickSummary } from './QuickSummary';
import { HistoricalComparison } from './HistoricalComparison';
import type { AuditResult } from '../../../../../utils/geoAuditEnhanced';

interface OverviewTabProps {
  /** Complete audit result data */
  result: AuditResult;
}

export function OverviewTab({ result }: OverviewTabProps) {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* TOP SECTION: Score + Export + Quick Summary - Stacked on Mobile, Side by Side on Large Screens */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-4 md:gap-6">
        {/* Left: Precise Score Display with Export Buttons */}
        <div className="flex flex-col gap-2 md:gap-3">
          <PreciseScoreDisplay
            overallScore={result.overallScore}
            preciseScore={result.preciseScore}
            grade={result.grade}
            scoreBreakdown={result.scoreBreakdown}
          />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-black/20 border border-slate-800/50 p-2 md:p-3 gap-2">
            <span className="text-[10px] md:text-xs font-mono text-slate-400 uppercase tracking-wider">
              Export Report
            </span>
            <ExportButtons result={result} />
          </div>
        </div>

        {/* Right: Quick Summary - Top 3-5 Insights */}
        <div className="lg:h-full">
          <QuickSummary insights={result.insights} />
        </div>
      </div>

      {/* MIDDLE SECTION: Category Scores Grid - Responsive Grid */}
      <div>
        <h3 className="text-[10px] md:text-xs font-mono text-slate-400 uppercase tracking-wider mb-2 md:mb-3 px-1">
          Category Scores Overview
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3">
          <ScoreCard label="Schema" score={result.scores.schemaMarkup} />
          <ScoreCard label="Meta Tags" score={result.scores.metaTags} />
          <ScoreCard label="AI Crawlers" score={result.scores.aiCrawlers} />
          <ScoreCard label="E-E-A-T" score={result.scores.eeat} />
          <ScoreCard label="Structure" score={result.scores.structure} />
          <ScoreCard label="Performance" score={result.scores.performance} />
          <ScoreCard label="Content" score={result.scores.contentQuality} />
          <ScoreCard label="Citation" score={result.scores.citationPotential} />
          <ScoreCard label="Technical SEO" score={result.scores.technicalSEO} />
          <ScoreCard label="Link Analysis" score={result.scores.linkAnalysis} />
          <ScoreCard label="AID Agent" score={result.scores.aidAgent} />
        </div>
      </div>

      {/* HISTORICAL COMPARISON SECTION */}
      <HistoricalComparison result={result} />

      {/* BOTTOM SECTION: Charts - Stacked on Mobile, Side-by-Side on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {result.scoreBreakdown && (
          <ScoreBreakdownChart breakdown={result.scoreBreakdown} />
        )}
        <CategoryScoresChart scores={result.scores} />
      </div>
    </div>
  );
}

/**
 * Score Card Component - Ultra-Compact Professional Design
 * 
 * Displays individual category score with color coding.
 * Optimized for maximum information density with minimal space.
 * 
 * Improvements:
 * - Reduced padding: 10-14px → 8px (-43%)
 * - Reduced font size: 20-24px → 18px (-25%)
 * - Reduced progress bar: 4-6px → 2px (-67%)
 * - Added /100 indicator for context
 * - Added tooltip on hover
 * - Improved visual hierarchy
 * 
 * Color scheme:
 * - Emerald (≥80): Excellent
 * - Yellow (≥60): Good
 * - Orange (≥40): Needs improvement
 * - Red (<40): Critical
 */
function ScoreCard({ label, score }: { label: string; score: number }) {
  const getColor = (s: number) => {
    if (s >= 80) return 'text-emerald-400';
    if (s >= 60) return 'text-yellow-400';
    if (s >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getBgGradient = (s: number) => {
    if (s >= 80) return 'from-emerald-500/10 to-emerald-600/5';
    if (s >= 60) return 'from-yellow-500/10 to-yellow-600/5';
    if (s >= 40) return 'from-orange-500/10 to-orange-600/5';
    return 'from-red-500/10 to-red-600/5';
  };

  const getBorderColor = (s: number) => {
    if (s >= 80) return 'border-emerald-500/30';
    if (s >= 60) return 'border-yellow-500/30';
    if (s >= 40) return 'border-orange-500/30';
    return 'border-red-500/30';
  };

  const getShadowColor = (s: number) => {
    if (s >= 80) return 'hover:shadow-emerald-500/20';
    if (s >= 60) return 'hover:shadow-yellow-500/20';
    if (s >= 40) return 'hover:shadow-orange-500/20';
    return 'hover:shadow-red-500/20';
  };

  return (
    <div 
      className={`
        relative
        bg-gradient-to-br ${getBgGradient(score)} 
        border ${getBorderColor(score)} 
        p-2 rounded-md
        transition-all duration-300 ease-out
        hover:scale-[1.02] hover:shadow-lg ${getShadowColor(score)}
        hover:border-opacity-60
        cursor-default
        group
      `}
    >
      {/* Label - Compact */}
      <div className="text-[8px] md:text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1 truncate group-hover:text-slate-400 transition-colors" title={label}>
        {label}
      </div>
      
      {/* Score with /100 indicator - Compact */}
      <div className="flex items-baseline gap-0.5 md:gap-1 mb-1.5">
        <span className={`text-lg md:text-xl font-bold font-mono ${getColor(score)} leading-none group-hover:scale-105 transition-transform duration-300`}>
          {score.toFixed(1)}
        </span>
        <span className="text-[7px] md:text-[8px] text-slate-600 font-medium">/100</span>
      </div>
      
      {/* Visual indicator bar - Ultra-thin */}
      <div className="h-0.5 bg-slate-800/50 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor(score).replace('text-', 'bg-')} transition-all duration-700 ease-out rounded-full`}
          style={{ width: `${score}%` }}
        />
      </div>
      
      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black/90 text-white text-[9px] md:text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
        {label}: {score.toFixed(1)}/100
      </div>
    </div>
  );
}
