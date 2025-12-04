/**
 * QuickSummary Component
 * 
 * Displays a compact summary of the top 3-5 AI insights from the audit.
 * Provides quick, actionable information at a glance.
 * 
 * Features:
 * - Extracts top 3-5 insights from AI insights
 * - Compact card format with visual indicators
 * - Color-coded icons for different insight types
 * - Responsive design
 * 
 * Requirements:
 * - Information density: Maximum insights in minimal space
 * - Visual clarity: Clear icons and color coding
 * 
 * Usage:
 * ```tsx
 * <QuickSummary insights={result.insights} />
 * ```
 */

import { 
  Lightbulb, 
  AlertCircle, 
  CheckCircle, 
  TrendingUp,
  Zap
} from 'lucide-react';

interface QuickSummaryProps {
  /** Array of AI-generated insights */
  insights: string[];
}

/**
 * Determines the icon and color for an insight based on its content
 */
function getInsightStyle(insight: string): {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
} {
  const lowerInsight = insight.toLowerCase();
  
  // Critical issues or warnings
  if (
    lowerInsight.includes('missing') ||
    lowerInsight.includes('critical') ||
    lowerInsight.includes('error') ||
    lowerInsight.includes('warning')
  ) {
    return {
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
    };
  }
  
  // Positive findings or strengths
  if (
    lowerInsight.includes('excellent') ||
    lowerInsight.includes('strong') ||
    lowerInsight.includes('good') ||
    lowerInsight.includes('well')
  ) {
    return {
      icon: <CheckCircle className="w-3.5 h-3.5" />,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
    };
  }
  
  // Opportunities or improvements
  if (
    lowerInsight.includes('improve') ||
    lowerInsight.includes('enhance') ||
    lowerInsight.includes('optimize') ||
    lowerInsight.includes('opportunity')
  ) {
    return {
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
    };
  }
  
  // Quick wins or actionable items
  if (
    lowerInsight.includes('quick') ||
    lowerInsight.includes('easy') ||
    lowerInsight.includes('simple')
  ) {
    return {
      icon: <Zap className="w-3.5 h-3.5" />,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
    };
  }
  
  // Default: general insight
  return {
    icon: <Lightbulb className="w-3.5 h-3.5" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  };
}

export function QuickSummary({ insights }: QuickSummaryProps) {
  // Don't render if no insights
  if (!insights || insights.length === 0) {
    return null;
  }

  // Extract top 3-5 insights (prefer 5 if available, minimum 3)
  const topInsights = insights.slice(0, Math.min(5, insights.length));

  return (
    <div className="bg-black/20 border border-slate-800/50 p-3 md:p-4 h-full flex flex-col rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3 md:mb-4 flex-shrink-0">
        <Lightbulb className="w-4 h-4 md:w-4.5 md:h-4.5 text-blue-400 animate-pulse" />
        <h3 className="text-[10px] md:text-xs font-mono text-slate-300 uppercase tracking-wider">
          Key Insights
        </h3>
        <span className="ml-auto text-[9px] md:text-[10px] font-mono text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-full">
          Top {topInsights.length}
        </span>
      </div>

      {/* Insights Grid - Compact with stagger animation */}
      <div className="space-y-2 md:space-y-2.5 flex-1 overflow-y-auto">
        {topInsights.map((insight, idx) => {
          const style = getInsightStyle(insight);
          
          return (
            <div
              key={idx}
              className={`
                ${style.bgColor} border ${style.borderColor} 
                p-2.5 md:p-3 rounded-lg
                transition-all duration-300 ease-out
                hover:scale-[1.02] hover:shadow-md
                hover:border-opacity-70
                animate-in fade-in slide-in-from-left-2
                group cursor-default
              `}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-start gap-2 md:gap-2.5">
                {/* Icon with subtle animation */}
                <div className={`${style.color} flex-shrink-0 mt-0.5 transition-transform duration-300 group-hover:scale-110`}>
                  {style.icon}
                </div>
                
                {/* Insight Text - More compact */}
                <p className="text-[10px] md:text-[11px] text-slate-300 leading-relaxed flex-1 group-hover:text-slate-200 transition-colors">
                  {insight}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer - Show if there are more insights */}
      {insights.length > 5 && (
        <div className="mt-3 md:mt-4 pt-3 border-t border-slate-700/50 flex-shrink-0">
          <p className="text-[9px] md:text-[10px] font-mono text-slate-500 text-center hover:text-slate-400 transition-colors">
            +{insights.length - 5} more insights in full report
          </p>
        </div>
      )}
    </div>
  );
}
