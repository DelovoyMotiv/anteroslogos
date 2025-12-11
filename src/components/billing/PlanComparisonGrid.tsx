/**
 * Plan Comparison Grid Component
 * Displays all subscription tiers with enhanced hover states, badges, and tooltips
 */

import { Loader2 } from 'lucide-react';
import { PLAN_CONFIG, type USDCSubscription } from '../../../lib/dashboard/billing-client';

interface PlanComparisonGridProps {
  subscription: USDCSubscription | null;
  subscribing: string | null;
  onSubscribe: (planTier: 'starter' | 'pro' | 'enterprise') => void;
}

export function PlanComparisonGrid({ subscription, subscribing, onSubscribe }: PlanComparisonGridProps) {
  const currentPlan = subscription?.plan_tier || 'free';

  return (
    <div id="plans-section" className="scroll-mt-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Choose Your Plan
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          All plans include USDC payments on Base L2
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(PLAN_CONFIG).map(([key, plan]) => {
          const isCurrentPlan = key === currentPlan;
          const isPaidPlan = key !== 'free';
          const canSubscribe = isPaidPlan && !isCurrentPlan && subscription?.status === 'active';
          const isMostPopular = key === 'pro';

          return (
            <div
              key={key}
              className={`
                relative rounded-lg border p-6 transition-colors
                ${
                  isCurrentPlan
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/10'
                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700'
                }
                ${isMostPopular && !isCurrentPlan ? 'border-gray-900 dark:border-white' : ''}
              `}
            >
              {/* Badges */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 flex gap-2">
                {isCurrentPlan && (
                  <span className="bg-blue-600 text-white text-xs font-semibold px-4 py-1 rounded">
                    Current Plan
                  </span>
                )}
                {isMostPopular && !isCurrentPlan && (
                  <span className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold px-4 py-1 rounded">
                    Recommended
                  </span>
                )}
              </div>

              {/* Plan Header */}
              <div className="mb-6 mt-2">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    ${plan.price}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 text-sm">/month</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {plan.auditsPerMonth === -1 
                    ? 'Unlimited audits per month'
                    : `${plan.auditsPerMonth} audit${plan.auditsPerMonth !== 1 ? 's' : ''} per month`
                  }
                </p>
              </div>

              {/* Features List */}
              <ul className="space-y-2.5 mb-8 min-h-[280px]">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-green-600 dark:text-green-400 mr-2 mt-0.5">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Action Button */}
              <div className="mt-auto">
                {canSubscribe ? (
                  <button
                    onClick={() => onSubscribe(key as 'starter' | 'pro' | 'enterprise')}
                    disabled={subscribing === key}
                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {subscribing === key && <Loader2 className="w-4 h-4 animate-spin" />}
                    {subscribing === key ? 'Processing' : 'Subscribe'}
                  </button>
                ) : isCurrentPlan ? (
                  <button
                    disabled
                    className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded font-semibold cursor-not-allowed"
                  >
                    Active
                  </button>
                ) : key === 'free' ? (
                  <div className="text-center py-3 text-sm text-gray-500 dark:text-gray-400">
                    Default tier
                  </div>
                ) : null}
              </div>


            </div>
          );
        })}
      </div>


    </div>
  );
}
