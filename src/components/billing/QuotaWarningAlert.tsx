// @ts-nocheck
/**
 * Quota Warning Alert Component
 * Displays warning when user has consumed > 80% of their monthly quota
 */

import { AlertTriangle, Clock } from 'lucide-react';
import { PLAN_CONFIG, type USDCSubscription, type UsageStats } from '../../../lib/dashboard/billing-client';

interface QuotaWarningAlertProps {
  subscription: USDCSubscription;
  usageStats: UsageStats;
  onUpgrade: () => void;
}

export function QuotaWarningAlert({ subscription, usageStats, onUpgrade }: QuotaWarningAlertProps) {
  // Don't show for unlimited plans
  if (usageStats.auditsQuota === -1) {
    return null;
  }

  // Check if usage is above 80% threshold
  const usagePercentage = (usageStats.auditsUsed / usageStats.auditsQuota) * 100;
  if (usagePercentage <= 80) {
    return null;
  }

  // Calculate estimated days until quota exhausted
  const daysInPeriod = 30;
  const daysElapsed = daysInPeriod - usageStats.daysRemaining;
  const dailyAverage = daysElapsed > 0 ? usageStats.auditsUsed / daysElapsed : 0;
  const auditsRemaining = usageStats.auditsQuota - usageStats.auditsUsed;
  const daysUntilExhausted = dailyAverage > 0 ? Math.ceil(auditsRemaining / dailyAverage) : usageStats.daysRemaining;

  // Determine severity level
  const isCritical = usagePercentage >= 95;
  const isWarning = usagePercentage >= 90;

  // Get next tier recommendation
  const currentTier = subscription.plan_tier;
  const nextTier = currentTier === 'free' ? 'starter' : 
                   currentTier === 'starter' ? 'pro' : 
                   currentTier === 'pro' ? 'enterprise' : null;

  const nextPlan = nextTier ? PLAN_CONFIG[nextTier as keyof typeof PLAN_CONFIG] : null;

  const severityStyles = {
    critical: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-900 dark:text-red-100',
      icon: 'text-red-600 dark:text-red-400',
      badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
      button: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-900 dark:text-yellow-100',
      icon: 'text-yellow-600 dark:text-yellow-400',
      badge: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    },
    info: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      border: 'border-orange-200 dark:border-orange-800',
      text: 'text-orange-900 dark:text-orange-100',
      icon: 'text-orange-600 dark:text-orange-400',
      badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
      button: 'bg-orange-600 hover:bg-orange-700 text-white',
    },
  };

  const styles = isCritical ? severityStyles.critical : 
                 isWarning ? severityStyles.warning : 
                 severityStyles.info;

  return (
    <div className={`${styles.bg} border ${styles.border} rounded-lg p-6`}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`p-3 rounded-full bg-white dark:bg-gray-900 ${styles.icon} flex-shrink-0`}>
          <AlertTriangle className="w-6 h-6" />
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className={`text-lg font-semibold ${styles.text} mb-1`}>
                {isCritical && 'Quota Almost Exhausted'}
                {isWarning && 'High Quota Usage'}
                {!isWarning && !isCritical && 'Quota Warning'}
              </h3>
              <p className={`text-sm ${styles.text}`}>
                You've used <span className="font-bold">{usageStats.auditsUsed}</span> of{' '}
                <span className="font-bold">{usageStats.auditsQuota}</span> audits this month
              </p>
            </div>
            <div className={`${styles.badge} px-3 py-1 rounded-full text-sm font-bold`}>
              {usagePercentage.toFixed(0)}%
            </div>
          </div>

          {/* Progress visualization */}
          <div className="mb-4">
            <div className="w-full bg-white dark:bg-gray-900 rounded-full h-3 overflow-hidden shadow-inner">
              <div
                className={`h-3 ${
                  isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-orange-500'
                } transition-all duration-500`}
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white dark:bg-gray-900 rounded p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className={`w-4 h-4 ${styles.icon}`} />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Estimated Depletion
                </span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {daysUntilExhausted <= 0 ? 'Immediate' : 
                 daysUntilExhausted === 1 ? '1 day' : 
                 `${daysUntilExhausted} days`}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded p-3">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">
                Daily Average
              </span>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {dailyAverage.toFixed(1)} audits
              </p>
            </div>
          </div>

          {/* Recommendation */}
          {nextPlan && (
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
              <p className={`text-sm font-medium ${styles.text} mb-2`}>
                Recommended: {nextPlan.name}
              </p>
              <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1 mb-3">
                <li>{nextPlan.auditsPerMonth === -1 ? 'Unlimited' : nextPlan.auditsPerMonth} audits per month</li>
                <li>${nextPlan.price} USDC per month</li>
                <li>{nextPlan.auditsPerMonth === -1 ? 'No usage limits' : `${Math.round((nextPlan.auditsPerMonth - usageStats.auditsQuota) / usageStats.auditsQuota * 100)}% additional capacity`}</li>
              </ul>
              <button
                onClick={onUpgrade}
                className={`w-full ${styles.button} px-4 py-2.5 rounded font-semibold transition-colors`}
              >
                Upgrade to {nextPlan.name}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
