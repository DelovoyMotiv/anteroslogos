// @ts-nocheck
/**
 * Usage Analytics Page - OpenRouter Style
 * Compact, efficient data visualization with inline charts
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../../../lib/dashboard/auth-guard';
import { getDailyUsage, getTopTools, getUCPTRate } from '../../../lib/dashboard/usage-analytics';
import { Activity, TrendingUp, Zap, ChevronDown } from 'lucide-react';

const CHART_COLORS = [
  'rgb(59, 130, 246)',   // blue-500
  'rgb(16, 185, 129)',   // emerald-500
  'rgb(245, 158, 11)',   // amber-500
  'rgb(239, 68, 68)',    // red-500
  'rgb(139, 92, 246)',   // violet-500
  'rgb(236, 72, 153)',   // pink-500
];

export function UsagePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [toolStats, setToolStats] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState('7');

  useEffect(() => {
    fetchUsageData();
  }, [dateRange]);

  const fetchUsageData = async () => {
    setLoading(true);
    try {
      const days = parseInt(dateRange);
      const [daily, tools] = await Promise.all([
        getDailyUsage(user.id, days),
        getTopTools(user.id, days),
      ]);

      setDailyStats(Array.isArray(daily) ? daily : []);
      setToolStats(Array.isArray(tools) ? tools.slice(0, 10) : []);
    } catch (error) {
      console.error('Failed to fetch usage statistics', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  const totalCalls = dailyStats.reduce((acc, day) => acc + (day.total_calls || 0), 0);
  const totalTokens = dailyStats.reduce((acc, day) => acc + (day.total_tokens || 0), 0);
  const avgSuccessRate = dailyStats.length > 0
    ? (dailyStats.reduce((acc, day) => acc + (day.success_rate || 0), 0) / dailyStats.length)
    : 0;

  // Calculate max for chart scaling
  const maxCalls = Math.max(...dailyStats.map(d => d.total_calls || 0), 1);
  const maxTokens = Math.max(...dailyStats.map(d => d.total_tokens || 0), 1);

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between border-b border-slate-800/50 pb-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-100 tracking-tight">Usage Analytics</h1>
          <p className="text-[10px] font-mono text-slate-500 mt-0.5">
            Monitor API usage, token consumption, and UCPT metrics
          </p>
        </div>
        <div className="relative">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="appearance-none px-3 py-1.5 pr-8 text-xs font-mono bg-black/20 border border-slate-800/50 text-slate-300 backdrop-blur-md focus:outline-none focus:border-slate-700 cursor-pointer"
          >
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
        </div>
      </div>

      {/* Compact KPI Grid with Inline Charts - OpenRouter Style */}
      <div className="grid grid-cols-3 gap-3">
        {/* API Calls */}
        <div className="border border-slate-800/50 bg-black/20 backdrop-blur-md p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">API Calls</span>
            <Activity className="w-3 h-3 text-slate-600" />
          </div>
          <div className="font-mono font-bold text-xl text-slate-100 mb-2">{totalCalls.toLocaleString()}</div>
          <div className="flex items-end gap-0.5 h-12">
            {dailyStats.slice(-14).map((day, i) => {
              const height = (day.total_calls / maxCalls) * 100;
              return (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-blue-500/30 to-blue-400/50 transition-all hover:from-blue-500/50 hover:to-blue-400/70"
                  style={{ height: `${Math.max(height, 2)}%` }}
                  title={`${day.date}: ${day.total_calls} calls`}
                />
              );
            })}
          </div>
          <div className="text-[9px] font-mono text-slate-600 mt-1">Past 14 days</div>
        </div>

        {/* Tokens */}
        <div className="border border-slate-800/50 bg-black/20 backdrop-blur-md p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Tokens</span>
            <Zap className="w-3 h-3 text-slate-600" />
          </div>
          <div className="font-mono font-bold text-xl text-slate-100 mb-2">
            {(totalTokens / 1000).toFixed(1)}K
          </div>
          <div className="flex items-end gap-0.5 h-12">
            {dailyStats.slice(-14).map((day, i) => {
              const height = (day.total_tokens / maxTokens) * 100;
              return (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-emerald-500/30 to-emerald-400/50 transition-all hover:from-emerald-500/50 hover:to-emerald-400/70"
                  style={{ height: `${Math.max(height, 2)}%` }}
                  title={`${day.date}: ${day.total_tokens} tokens`}
                />
              );
            })}
          </div>
          <div className="text-[9px] font-mono text-slate-600 mt-1">Past 14 days</div>
        </div>

        {/* Success Rate */}
        <div className="border border-slate-800/50 bg-black/20 backdrop-blur-md p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Success Rate</span>
            <TrendingUp className="w-3 h-3 text-slate-600" />
          </div>
          <div className="font-mono font-bold text-xl text-slate-100 mb-2">{avgSuccessRate.toFixed(1)}%</div>
          <div className="flex items-end gap-0.5 h-12">
            {dailyStats.slice(-14).map((day, i) => {
              const height = day.success_rate || 0;
              return (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-amber-500/30 to-amber-400/50 transition-all hover:from-amber-500/50 hover:to-amber-400/70"
                  style={{ height: `${Math.max(height, 2)}%` }}
                  title={`${day.date}: ${day.success_rate}%`}
                />
              );
            })}
          </div>
          <div className="text-[9px] font-mono text-slate-600 mt-1">Past 14 days</div>
        </div>
      </div>

      {/* Tool Usage Table - Compact */}
      {toolStats.length > 0 && (
        <div className="border border-slate-800/50 bg-black/20 backdrop-blur-md">
          <div className="px-3 py-2 border-b border-slate-800/50">
            <h3 className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
              Tool Usage Distribution
            </h3>
          </div>
          <div className="divide-y divide-slate-800/30">
            {toolStats.map((tool, index) => {
              const percentage = totalCalls > 0 ? (tool.call_count / totalCalls) * 100 : 0;
              return (
                <div key={index} className="px-3 py-2 flex items-center gap-3 hover:bg-black/30 transition-colors">
                  <div
                    className="w-1 h-6"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-slate-300 truncate">{tool.tool_name}</div>
                    <div className="text-[9px] font-mono text-slate-600">
                      {tool.call_count.toLocaleString()} calls · {tool.avg_duration_ms?.toFixed(0) || 0}ms avg
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-mono font-bold text-slate-400">
                      {percentage.toFixed(1)}%
                    </div>
                    <div className="w-16 h-1.5 bg-slate-900/50 overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: CHART_COLORS[index % CHART_COLORS.length]
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily Breakdown Table - Compact */}
      {dailyStats.length > 0 && (
        <div className="border border-slate-800/50 bg-black/20 backdrop-blur-md">
          <div className="px-3 py-2 border-b border-slate-800/50">
            <h3 className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
              Daily Breakdown
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-slate-800/50">
                <tr className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-right font-medium">Calls</th>
                  <th className="px-3 py-2 text-right font-medium">Success</th>
                  <th className="px-3 py-2 text-right font-medium">Tokens</th>
                  <th className="px-3 py-2 text-right font-medium">Avg Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30 font-mono">
                {dailyStats.slice().reverse().map((day, index) => (
                  <tr key={index} className="hover:bg-black/30 transition-colors">
                    <td className="px-3 py-2 text-slate-300">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-400">{day.total_calls.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`${day.success_rate >= 95 ? 'text-emerald-400' : day.success_rate >= 80 ? 'text-amber-400' : 'text-red-400'}`}>
                        {day.success_rate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-slate-400">
                      {(day.total_tokens / 1000).toFixed(1)}K
                    </td>
                    <td className="px-3 py-2 text-right text-slate-400">
                      {day.avg_duration_ms?.toFixed(0) || 0}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between border-b border-slate-800/50 pb-3">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-slate-800/50" />
          <div className="h-3 w-48 bg-slate-800/30" />
        </div>
        <div className="h-7 w-24 bg-slate-800/50" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-slate-800/50 bg-black/20 p-3 h-32" />
        ))}
      </div>
      <div className="border border-slate-800/50 bg-black/20 h-64" />
    </div>
  );
}

export default UsagePage;
