/**
 * HistoricalComparison Component
 * 
 * Compares current audit with previous audits for the same domain.
 * Shows trends (improving/declining) and calculates rate of change.
 * 
 * Features:
 * - Fetches historical audits from Supabase
 * - Calculates score trends and rate of change
 * - Visual indicators for improving/declining metrics
 * - Trend chart showing score history
 * - Category-level comparison
 * - Time-based analysis (7d, 30d, 90d)
 * 
 * Requirements:
 * - Historical data analysis
 * - Trend visualization
 * - Rate of change calculation
 * - Responsive design
 * 
 * Usage:
 * ```tsx
 * <HistoricalComparison result={currentAudit} />
 * ```
 */

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  History,
  Calendar,
  BarChart3,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import { useAuth } from '../../../../../lib/dashboard/auth-guard';
import type { AuditResult } from '../../../../../utils/geoAuditEnhanced';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface HistoricalComparisonProps {
  /** Current audit result to compare against */
  result: AuditResult;
}

interface HistoricalAudit {
  id: string;
  timestamp: string;
  overall_score: number;
  grade: string;
  score_schema_markup: number;
  score_meta_tags: number;
  score_ai_crawlers: number;
  score_eeat: number;
  score_structure: number;
  score_performance: number;
  score_content_quality: number;
  score_citation_potential: number;
  score_technical_seo: number;
  score_link_analysis: number;
}

type TimeRange = '7d' | '30d' | '90d' | 'all';

export function HistoricalComparison({ result }: HistoricalComparisonProps) {
  const { user } = useAuth();
  const [historicalAudits, setHistoricalAudits] = useState<HistoricalAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  useEffect(() => {
    if (user && result) {
      loadHistoricalData();
    }
  }, [user, result, timeRange]);

  const loadHistoricalData = async () => {
    if (!user || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Extract domain from current result
      const urlObj = new URL(result.url);
      const domain = urlObj.hostname;

      // Calculate date threshold based on time range
      const now = new Date();
      let dateThreshold: Date;
      
      switch (timeRange) {
        case '7d':
          dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          dateThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          dateThreshold = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'all':
        default:
          dateThreshold = new Date(0); // Beginning of time
          break;
      }

      // Fetch historical audits for this domain
      const { data, error: fetchError } = await supabase
        .from('audits')
        .select(`
          id,
          timestamp,
          overall_score,
          grade,
          score_schema_markup,
          score_meta_tags,
          score_ai_crawlers,
          score_eeat,
          score_structure,
          score_performance,
          score_content_quality,
          score_citation_potential,
          score_technical_seo,
          score_link_analysis
        `)
        .eq('user_id', user.id)
        .eq('domain', domain)
        .is('deleted_at', null)
        .gte('timestamp', dateThreshold.toISOString())
        .order('timestamp', { ascending: true })
        .limit(50);

      if (fetchError) throw fetchError;

      setHistoricalAudits(data || []);
    } catch (err) {
      console.error('Failed to load historical data:', err);
      setError('Failed to load historical comparison data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate comparison with previous audit
  const getPreviousAudit = (): HistoricalAudit | null => {
    if (historicalAudits.length < 2) return null;
    return historicalAudits[historicalAudits.length - 2];
  };

  const calculateChange = (current: number, previous: number): number => {
    return current - previous;
  };

  const calculateRateOfChange = (current: number, previous: number, daysBetween: number): number => {
    if (daysBetween === 0) return 0;
    const change = current - previous;
    return change / daysBetween;
  };

  const getTrendIcon = (change: number) => {
    if (change > 0.5) return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    if (change < -0.5) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-slate-500" />;
  };

  const getTrendColor = (change: number): string => {
    if (change > 0.5) return 'text-emerald-400';
    if (change < -0.5) return 'text-red-400';
    return 'text-slate-500';
  };

  const getTrendLabel = (change: number): string => {
    if (change > 0.5) return 'Improving';
    if (change < -0.5) return 'Declining';
    return 'Stable';
  };

  const previousAudit = getPreviousAudit();
  const hasPreviousData = previousAudit !== null;

  // Calculate days between audits
  const daysBetween = hasPreviousData 
    ? Math.round((new Date(result.timestamp).getTime() - new Date(previousAudit.timestamp).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Prepare chart data
  const chartData = historicalAudits.map(audit => ({
    date: new Date(audit.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: audit.overall_score,
    timestamp: audit.timestamp,
  }));

  // Add current result to chart if not already included
  const currentTimestamp = result.timestamp;
  const isCurrentIncluded = chartData.some(d => d.timestamp === currentTimestamp);
  if (!isCurrentIncluded) {
    chartData.push({
      date: new Date(currentTimestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: result.overallScore,
      timestamp: currentTimestamp,
    });
  }

  // Category comparisons
  const categoryComparisons = hasPreviousData ? [
    { name: 'Schema Markup', current: result.scores.schemaMarkup, previous: previousAudit.score_schema_markup },
    { name: 'Meta Tags', current: result.scores.metaTags, previous: previousAudit.score_meta_tags },
    { name: 'AI Crawlers', current: result.scores.aiCrawlers, previous: previousAudit.score_ai_crawlers },
    { name: 'E-E-A-T', current: result.scores.eeat, previous: previousAudit.score_eeat },
    { name: 'Structure', current: result.scores.structure, previous: previousAudit.score_structure },
    { name: 'Performance', current: result.scores.performance, previous: previousAudit.score_performance },
    { name: 'Content Quality', current: result.scores.contentQuality, previous: previousAudit.score_content_quality },
    { name: 'Citation Potential', current: result.scores.citationPotential, previous: previousAudit.score_citation_potential },
    { name: 'Technical SEO', current: result.scores.technicalSEO, previous: previousAudit.score_technical_seo },
    { name: 'Link Analysis', current: result.scores.linkAnalysis, previous: previousAudit.score_link_analysis },
  ] : [];

  if (loading) {
    return (
      <div className="bg-black/20 border border-slate-800/50 p-6 rounded-lg">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-slate-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-950/20 border border-red-500/30 p-4 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-sm text-red-400">{error}</span>
        </div>
      </div>
    );
  }

  if (!hasPreviousData) {
    return (
      <div className="bg-black/20 border border-slate-800/50 p-6 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-mono text-slate-300 uppercase tracking-wider">
            Historical Comparison
          </h3>
        </div>
        <div className="text-center py-8">
          <BarChart3 className="w-12 h-12 text-slate-700 mx-auto mb-3 opacity-50" />
          <p className="text-sm text-slate-500 font-mono">
            No previous audits found for this domain
          </p>
          <p className="text-xs text-slate-600 mt-2">
            Run more audits to see trends and comparisons
          </p>
        </div>
      </div>
    );
  }

  const overallChange = calculateChange(result.overallScore, previousAudit.overall_score);
  const rateOfChange = calculateRateOfChange(result.overallScore, previousAudit.overall_score, daysBetween);

  return (
    <div className="space-y-4">
      {/* Header with Time Range Selector */}
      <div className="bg-black/20 border border-slate-800/50 p-4 rounded-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-mono text-slate-300 uppercase tracking-wider">
              Historical Comparison
            </h3>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <div className="flex gap-1">
              {(['7d', '30d', '90d', 'all'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`
                    px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded
                    transition-all duration-200
                    ${timeRange === range
                      ? 'bg-blue-500/20 border border-blue-500/50 text-blue-400'
                      : 'bg-black/30 border border-slate-700/50 text-slate-500 hover:text-slate-400 hover:border-slate-600/50'
                    }
                  `}
                >
                  {range === 'all' ? 'All' : range.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Overall Score Comparison */}
      <div className="bg-black/20 border border-slate-800/50 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-slate-400" />
          <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Overall Score Trend
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Current Score */}
          <div className="bg-black/30 border border-slate-700/50 p-3 rounded">
            <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-2">
              Current Score
            </div>
            <div className="text-2xl font-bold font-mono text-slate-200">
              {result.overallScore.toFixed(1)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Grade: {result.grade}
            </div>
          </div>

          {/* Change */}
          <div className="bg-black/30 border border-slate-700/50 p-3 rounded">
            <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-2">
              Change
            </div>
            <div className={`text-2xl font-bold font-mono flex items-center gap-2 ${getTrendColor(overallChange)}`}>
              {getTrendIcon(overallChange)}
              {overallChange > 0 ? '+' : ''}{overallChange.toFixed(1)}
            </div>
            <div className={`text-xs mt-1 ${getTrendColor(overallChange)}`}>
              {getTrendLabel(overallChange)}
            </div>
          </div>

          {/* Rate of Change */}
          <div className="bg-black/30 border border-slate-700/50 p-3 rounded">
            <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-2">
              Rate of Change
            </div>
            <div className={`text-2xl font-bold font-mono ${getTrendColor(rateOfChange)}`}>
              {rateOfChange > 0 ? '+' : ''}{rateOfChange.toFixed(2)}/day
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Over {daysBetween} days
            </div>
          </div>
        </div>

        {/* Trend Chart */}
        {chartData.length > 1 && (
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b"
                  style={{ fontSize: '10px', fontFamily: 'monospace' }}
                />
                <YAxis 
                  stroke="#64748b"
                  style={{ fontSize: '10px', fontFamily: 'monospace' }}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                  }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Overall Score"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Category-Level Comparison */}
      <div className="bg-black/20 border border-slate-800/50 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-slate-400" />
          <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Category Changes
          </h4>
        </div>

        <div className="space-y-2">
          {categoryComparisons.map((category) => {
            const change = calculateChange(category.current, category.previous);
            const isImproving = change > 0.5;
            const isDeclining = change < -0.5;

            return (
              <div
                key={category.name}
                className="bg-black/30 border border-slate-700/50 p-3 rounded hover:border-slate-600/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center gap-2 min-w-[140px]">
                      {getTrendIcon(change)}
                      <span className="text-xs text-slate-400">{category.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-xs font-mono text-slate-500">
                        {category.previous.toFixed(1)} → {category.current.toFixed(1)}
                      </div>
                      
                      <div className={`text-xs font-mono font-bold ${getTrendColor(change)}`}>
                        {change > 0 ? '+' : ''}{change.toFixed(1)}
                      </div>
                    </div>
                  </div>

                  {/* Visual indicator */}
                  <div className="flex items-center gap-1">
                    {isImproving && (
                      <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                        IMPROVED
                      </span>
                    )}
                    {isDeclining && (
                      <span className="text-[9px] font-mono text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded">
                        DECLINED
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-black/20 border border-slate-800/50 p-4 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center">
            <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1">
              Total Audits
            </div>
            <div className="text-lg font-bold font-mono text-slate-300">
              {historicalAudits.length}
            </div>
          </div>

          <div className="text-center">
            <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1">
              Improving
            </div>
            <div className="text-lg font-bold font-mono text-emerald-400">
              {categoryComparisons.filter(c => calculateChange(c.current, c.previous) > 0.5).length}
            </div>
          </div>

          <div className="text-center">
            <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1">
              Declining
            </div>
            <div className="text-lg font-bold font-mono text-red-400">
              {categoryComparisons.filter(c => calculateChange(c.current, c.previous) < -0.5).length}
            </div>
          </div>

          <div className="text-center">
            <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1">
              Stable
            </div>
            <div className="text-lg font-bold font-mono text-slate-500">
              {categoryComparisons.filter(c => {
                const change = calculateChange(c.current, c.previous);
                return change >= -0.5 && change <= 0.5;
              }).length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
