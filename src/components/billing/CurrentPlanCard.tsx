// @ts-nocheck
/**
 * Current Plan Card Component
 * Compact, information-dense display of subscription status
 */

import { useState } from 'react';
import { Calendar, ChevronDown, XCircle, CheckCircle, Clock } from 'lucide-react';
import { PLAN_CONFIG, type USDCSubscription, type UsageStats } from '../../../lib/dashboard/billing-client';

interface CurrentPlanCardProps {
  subscription: USDCSubscription;
  usageStats: UsageStats;
  onCancelSubscription: () => void;
}

export function CurrentPlanCard({ subscription, usageStats, onCancelSubscription }: CurrentPlanCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const currentPlan = subscription?.plan_tier || 'free';
  const planConfig = PLAN_CONFIG[currentPlan as keyof typeof PLAN_CONFIG];

  const periodEnd = new Date(subscription.current_period_end);
  const now = new Date();
  const daysUntilRenewal = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const statusConfig = {
    active: { icon: CheckCircle, color: 'text-green-600 dark:text-green-400', dot: 'bg-green-500', label: 'Active' },
    pending_payment: { icon: Clock, color: 'text-yellow-600 dark:text-yellow-400', dot: 'bg-yellow-500', label: 'Pending' },
    expired: { icon: XCircle, color: 'text-red-600 dark:text-red-400', dot: 'bg-red-500', label: 'Expired' },
    cancelled: { icon: XCircle, color: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-500', label: 'Cancelled' },
  };

  const status = statusConfig[subscription.status as keyof typeof statusConfig] || statusConfig.active;
  const StatusIcon = status.icon;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Current Plan
        </h2>
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
        </div>
      </div>

      {/* Plan Info Grid */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-0.5">
            {planConfig.name}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {planConfig.auditsPerMonth === -1 ? 'Unlimited' : `${planConfig.auditsPerMonth} audits/mo`}
          </div>
        </div>
        
        {subscription.status === 'active' && (
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-0.5">
              {daysUntilRenewal}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {daysUntilRenewal === 1 ? 'day left' : 'days left'}
            </div>
          </div>
        )}
      </div>

      {/* Renewal & Billing Info */}
      {subscription.status === 'active' && (
        <div className="space-y-2 py-3 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">Renewal Date</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          {currentPlan !== 'free' && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">Next Charge</span>
              <span className="font-medium text-gray-900 dark:text-white">
                ${planConfig.price} USDC
              </span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {currentPlan !== 'free' && subscription.status === 'active' && (
        <div className="relative mt-3">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          >
            Manage
            <ChevronDown className={`w-3 h-3 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
          </button>

          {showMenu && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded shadow-lg overflow-hidden z-10">
              <button
                onClick={() => {
                  setShowMenu(false);
                  onCancelSubscription();
                }}
                className="w-full px-3 py-2 text-left text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
              >
                <XCircle className="w-3 h-3" />
                Cancel Subscription
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
