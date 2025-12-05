// @ts-nocheck
/**
 * Usage Stats Card Component
 * Displays quota consumption with animated progress bar, color-coded thresholds, and usage trends
 */

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { type USDCSubscription, type UsageStats } from '../../../lib/dashboard/billing-client';

interface UsageStatsCardProps {
  subscription: USDCSubscription;
  usageStats: UsageStats;
}

export function UsageStatsCard({ subscription, usageStats }: UsageStatsCardProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  
  // Animate progress bar on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(usageStats.percentageUsed);
    }, 100);
    return () => clearTimeout(timer);
  }, [usageStats.percentageUsed]);

  // Color-coded thresholds
  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getProgressGradient = (percentage: number) => {
    if (percentage >= 90) return 'from-red-500 to-red-600';
    if (percentage >= 70) return 'from-yellow-500 to-yellow-600';
    return 'from-blue-500 to-blue-600';
  };

  const getTextColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 dark:text-red-400';
    if (percentage >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  // Mock usage trend data (last 7 days) - in production, this would come from API
  const usageTrend = [3, 5, 4, 7, 6, 8, usageStats.auditsUsed];
  const trendDirection = usageTrend[usageTrend.length - 1] > usageTrend[usageTrend.length - 2] ? 'up' : 
                         usageTrend[usageTrend.length - 1] < usageTrend[usageTrend.length - 2] ? 'down' : 'flat';

  // Calculate projected usage
  const daysInPeriod = 30;
  const daysElapsed = daysInPeriod - usageStats.daysRemaining;
  const dailyAverage = daysElapsed > 0 ? usageStats.auditsUsed / daysElapsed : 0;
  const projectedUsage = Math.round(dailyAverage * daysInPeriod);

  const isUnlimited = usageStats.auditsQuota === -1;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-start justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Usage This Period
        </h2>
        <Activity className="w-5 h-5 text-gray-400" />
      </div>

      {/* Usage Numbers */}
      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">GEO Audits</span>
          <div className="text-right">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {usageStats.auditsUsed}
            </span>
            <span className="text-xl text-gray-500 dark:text-gray-400 mx-1">/</span>
            <span className="text-2xl font-semibold text-gray-600 dark:text-gray-400">
              {isUnlimited ? '∞' : usageStats.auditsQuota}
            </span>
          </div>
        </div>

        {/* Animated Progress Bar */}
        {!isUnlimited && (
          <div className="relative">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
              <div
                className={`h-4 rounded-full bg-gradient-to-r ${getProgressGradient(usageStats.percentageUsed)} transition-all duration-1000 ease-out`}
                style={{ width: `${Math.min(animatedProgress, 100)}%` }}
              >
                {/* Shimmer effect */}
                <div className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </div>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">0%</span>
              <span className={`text-sm font-semibold ${getTextColor(usageStats.percentageUsed)}`}>
                {usageStats.percentageUsed}%
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">100%</span>
            </div>
          </div>
        )}
      </div>

      {/* Usage Trend Sparkline */}
      {!isUnlimited && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">7-Day Trend</span>
            <div className="flex items-center gap-1">
              {trendDirection === 'up' && <TrendingUp className="w-3 h-3 text-red-500" />}
              {trendDirection === 'down' && <TrendingDown className="w-3 h-3 text-green-500" />}
              {trendDirection === 'flat' && <Minus className="w-3 h-3 text-gray-500" />}
              <span className={`text-xs font-medium ${
                trendDirection === 'up' ? 'text-red-600 dark:text-red-400' :
                trendDirection === 'down' ? 'text-green-600 dark:text-green-400' :
                'text-gray-600 dark:text-gray-400'
              }`}>
                {trendDirection === 'up' ? 'Increasing' : trendDirection === 'down' ? 'Decreasing' : 'Stable'}
              </span>
            </div>
          </div>
          
          {/* Simple sparkline */}
          <div className="flex items-end justify-between h-12 gap-1">
            {usageTrend.map((value, index) => {
              const maxValue = Math.max(...usageTrend);
              const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
              return (
                <div
                  key={index}
                  className={`flex-1 rounded-t transition-all duration-300 ${
                    index === usageTrend.length - 1 
                      ? getProgressColor(usageStats.percentageUsed)
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  style={{ height: `${height}%` }}
                  title={`Day ${index + 1}: ${value} audits`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Projected Usage */}
      {!isUnlimited && daysElapsed > 0 && (
        <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-800">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Projected Usage</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              At current rate ({dailyAverage.toFixed(1)}/day)
            </p>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold ${
              projectedUsage > usageStats.auditsQuota 
                ? 'text-red-600 dark:text-red-400' 
                : 'text-gray-900 dark:text-white'
            }`}>
              {projectedUsage}
            </p>
            {projectedUsage > usageStats.auditsQuota && (
              <p className="text-xs text-red-600 dark:text-red-400">Over quota</p>
            )}
          </div>
        </div>
      )}

      {/* Unlimited badge */}
      {isUnlimited && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-900 dark:text-white text-center">
            Unlimited Audits
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 text-center mt-1">
            No usage limits
          </p>
        </div>
      )}
    </div>
  );
}
