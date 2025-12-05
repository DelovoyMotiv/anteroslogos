// @ts-nocheck
/**
 * Current Plan Card Component
 * Displays active subscription with status badge, renewal date, and management options
 */

import { useState } from 'react';
import { Calendar, ChevronDown, CreditCard, XCircle, CheckCircle, Clock } from 'lucide-react';
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

  // Calculate countdown
  const periodEnd = new Date(subscription.current_period_end);
  const now = new Date();
  const daysUntilRenewal = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const hoursUntilRenewal = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60)));

  // Status badge configuration
  const statusConfig = {
    active: {
      icon: CheckCircle,
      color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      dotColor: 'bg-green-500',
      label: 'Active',
    },
    pending_payment: {
      icon: Clock,
      color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
      dotColor: 'bg-yellow-500',
      label: 'Pending Payment',
    },
    expired: {
      icon: XCircle,
      color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
      dotColor: 'bg-red-500',
      label: 'Expired',
    },
    cancelled: {
      icon: XCircle,
      color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
      dotColor: 'bg-gray-500',
      label: 'Cancelled',
    },
  };

  const status = statusConfig[subscription.status as keyof typeof statusConfig] || statusConfig.active;
  const StatusIcon = status.icon;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Current Plan
        </h2>
        
        {/* Status Badge - Larger with Icon */}
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${status.color} font-medium text-sm`}>
          <StatusIcon className="w-4 h-4" />
          {status.label}
        </div>
      </div>

      {/* Plan Name */}
      <div className="mb-6">
        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {planConfig.name}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {planConfig.auditsPerMonth === -1 ? 'Unlimited' : planConfig.auditsPerMonth} GEO audits per month
        </p>
      </div>

      {/* Renewal Date with Countdown */}
      {subscription.status === 'active' && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-gray-700 dark:text-gray-300">
              <Calendar className="w-5 h-5 mr-3 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm font-medium">Next Renewal</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  {periodEnd.toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {daysUntilRenewal}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {daysUntilRenewal === 1 ? 'day' : 'days'} left
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Next Billing Amount */}
      {subscription.status === 'active' && currentPlan !== 'free' && (
        <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-800 mb-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">Next billing amount</span>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            ${planConfig.price} USDC
          </span>
        </div>
      )}

      {/* Manage Subscription Dropdown */}
      {currentPlan !== 'free' && subscription.status === 'active' && (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-medium text-gray-900 dark:text-white transition-colors"
          >
            <span className="flex items-center">
              <CreditCard className="w-4 h-4 mr-2" />
              Manage Subscription
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg overflow-hidden z-10">
              <button
                onClick={() => {
                  setShowMenu(false);
                  onCancelSubscription();
                }}
                className="w-full px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel Subscription
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
