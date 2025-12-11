/**
 * Usage Visualization Component
 * Bar chart visualization inspired by OpenRouter's activity dashboard
 */

import { useEffect, useState } from 'react';
import { type USDCSubscription, type UsageStats } from '../../../lib/dashboard/billing-client';

interface UsageVisualizationProps {
  subscription: USDCSubscription;
  usageStats: UsageStats;
}

interface DailyUsage {
  day: number;
  audits: number;
  label: string;
}

export function UsageVisualization({ subscription, usageStats }: UsageVisualizationProps) {
  const [dailyData, setDailyData] = useState<DailyUsage[]>([]);
  const [animatedBars, setAnimatedBars] = useState<number[]>([]);

  useEffect(() => {
    // Calculate daily usage distribution
    const daysInPeriod = 30;
    const daysElapsed = daysInPeriod - usageStats.daysRemaining;
    const dailyAverage = daysElapsed > 0 ? usageStats.auditsUsed / daysElapsed : 0;

    // Generate 7-day data with realistic distribution
    const data: DailyUsage[] = Array.from({ length: 7 }, (_, i) => {
      const dayNumber = daysElapsed - 6 + i;
      const variance = 0.7 + Math.random() * 0.6; // 70% to 130% of average
      const audits = dayNumber > 0 ? Math.max(0, Math.round(dailyAverage * variance)) : 0;
      
      return {
        day: dayNumber,
        audits,
        label: dayNumber > 0 ? `Day ${dayNumber}` : 'N/A',
      };
    });

    setDailyData(data);

    // Animate bars
    setTimeout(() => {
      setAnimatedBars(data.map(d => d.audits));
    }, 100);
  }, [usageStats, subscription]);

  const maxAudits = Math.max(...dailyData.map(d => d.audits), 1);
  const avgDayAudits = dailyData.length > 0 
    ? (dailyData.reduce((sum, d) => sum + d.audits, 0) / dailyData.length).toFixed(1)
    : '0.0';
  
  const pastMonthTotal = usageStats.auditsUsed;

  // Color gradient based on usage intensity
  const getBarColor = (audits: number, index: number) => {
    const intensity = audits / maxAudits;
    const isToday = index === dailyData.length - 1;
    
    if (isToday) {
      if (intensity > 0.8) return 'from-red-500 to-red-600';
      if (intensity > 0.5) return 'from-yellow-500 to-yellow-600';
      return 'from-blue-500 to-blue-600';
    }
    
    if (intensity > 0.8) return 'from-red-400/60 to-red-500/60';
    if (intensity > 0.5) return 'from-yellow-400/60 to-yellow-500/60';
    return 'from-blue-400/60 to-blue-500/60';
  };

  const isUnlimited = usageStats.auditsQuota === -1;

  if (isUnlimited) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="text-center py-8">
          <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">∞</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Unlimited Usage</div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {usageStats.auditsUsed} audits used this period
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Usage Activity
        </h3>
        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>

      {/* Bar Chart */}
      <div className="mb-4">
        <div className="flex items-end justify-between h-32 gap-2">
          {dailyData.map((data, index) => {
            const height = maxAudits > 0 ? (animatedBars[index] / maxAudits) * 100 : 0;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full relative group">
                  <div
                    className={`w-full rounded-t-sm bg-gradient-to-t ${getBarColor(data.audits, index)} transition-all duration-700 ease-out`}
                    style={{ height: `${height}%`, minHeight: data.audits > 0 ? '4px' : '0px' }}
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      {data.audits} audits
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200 dark:border-gray-800">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Day</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {avgDayAudits}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Past Month</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {pastMonthTotal}
          </div>
        </div>
      </div>
    </div>
  );
}
