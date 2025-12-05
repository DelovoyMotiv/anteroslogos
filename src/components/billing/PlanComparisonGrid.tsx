// @ts-nocheck
/**
 * Plan Comparison Grid Component
 * Displays all subscription tiers with enhanced hover states, badges, and tooltips
 */

import { useState } from 'react';
import { Check, TrendingUp, Loader2, Info, Star, Zap } from 'lucide-react';
import { PLAN_CONFIG, type USDCSubscription } from '../../../lib/dashboard/billing-client';

interface PlanComparisonGridProps {
  subscription: USDCSubscription | null;
  subscribing: string | null;
  onSubscribe: (planTier: 'starter' | 'pro' | 'enterprise') => void;
}

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

function Tooltip({ text, children }: TooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {show && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg shadow-lg z-10 whitespace-nowrap">
          {text}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
          </div>
        </div>
      )}
    </div>
  );
}

export function PlanComparisonGrid({ subscription, subscribing, onSubscribe }: PlanComparisonGridProps) {
  const currentPlan = subscription?.plan_tier || 'free';

  // Scroll to plans section
  const scrollToPlans = () => {
    const element = document.getElementById('plans-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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
          const isEnterprise = key === 'enterprise';

          return (
            <div
              key={key}
              className={`
                relative rounded-2xl border-2 p-6 transition-all duration-300 transform
                ${
                  isCurrentPlan
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10 shadow-xl scale-105'
                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-2xl hover:scale-105 hover:-translate-y-1'
                }
                ${isMostPopular && !isCurrentPlan ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-950' : ''}
              `}
            >
              {/* Badges */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 flex gap-2">
                {isCurrentPlan && (
                  <span className="bg-blue-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Current Plan
                  </span>
                )}
                {isMostPopular && !isCurrentPlan && (
                  <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
                    <Star className="w-3 h-3" />
                    Most Popular
                  </span>
                )}
                {isEnterprise && !isCurrentPlan && (
                  <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Best Value
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
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">
                  {plan.auditsPerMonth === -1 ? (
                    <span className="text-purple-600 dark:text-purple-400 font-bold">
                      ✨ Unlimited audits
                    </span>
                  ) : (
                    <>
                      {plan.auditsPerMonth} audit{plan.auditsPerMonth !== 1 ? 's' : ''} per month
                    </>
                  )}
                </p>
              </div>

              {/* Features List */}
              <ul className="space-y-3 mb-8 min-h-[280px]">
                {plan.features.map((feature, idx) => {
                  // Identify features that need tooltips
                  const needsTooltip = feature.includes('API') || 
                                       feature.includes('SLA') || 
                                       feature.includes('White-label') ||
                                       feature.includes('Webhook');
                  
                  const tooltipText = 
                    feature.includes('API access') ? 'Programmatic access to all GEO audit features' :
                    feature.includes('SLA') ? 'Guaranteed 99.9% uptime with compensation for downtime' :
                    feature.includes('White-label') ? 'Remove Anóteros Lógos branding and use your own' :
                    feature.includes('Webhook') ? 'Real-time notifications for audit completion and events' :
                    '';

                  return (
                    <li key={idx} className="flex items-start group">
                      <div className={`
                        w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mr-3 mt-0.5
                        ${isCurrentPlan || isMostPopular 
                          ? 'bg-green-500 text-white' 
                          : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        }
                        group-hover:scale-110 transition-transform
                      `}>
                        <Check className="w-3 h-3" />
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                        {feature}
                        {needsTooltip && (
                          <Tooltip text={tooltipText}>
                            <Info className="w-3 h-3 inline-block ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
                          </Tooltip>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {/* Action Button */}
              <div className="mt-auto">
                {canSubscribe ? (
                  <button
                    onClick={() => onSubscribe(key as 'starter' | 'pro' | 'enterprise')}
                    disabled={subscribing === key}
                    className={`
                      w-full px-6 py-3.5 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl
                      ${isMostPopular 
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white' 
                        : isEnterprise
                        ? 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transform hover:scale-105
                    `}
                  >
                    {subscribing === key ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-5 h-5" />
                        Upgrade Now
                      </>
                    )}
                  </button>
                ) : isCurrentPlan ? (
                  <button
                    disabled
                    className="w-full px-6 py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-xl font-bold cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    Current Plan
                  </button>
                ) : key === 'free' ? (
                  <div className="text-center py-3.5 text-sm text-gray-500 dark:text-gray-400 font-medium">
                    Default plan for all users
                  </div>
                ) : null}
              </div>

              {/* Value Indicator for Paid Plans */}
              {isPaidPlan && !isCurrentPlan && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                  <p className="text-xs text-center text-gray-600 dark:text-gray-400">
                    {key === 'starter' && '💰 Best for individuals'}
                    {key === 'pro' && '🚀 Best for growing teams'}
                    {key === 'enterprise' && '⭐ Best for organizations'}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Comparison Note */}
      <div className="mt-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <p className="font-semibold mb-2">Need help choosing?</p>
            <ul className="space-y-1 text-xs">
              <li>• <strong>Free:</strong> Perfect for trying out GEO audits</li>
              <li>• <strong>Starter:</strong> Ideal for freelancers and small projects</li>
              <li>• <strong>Pro:</strong> Best for agencies and growing businesses</li>
              <li>• <strong>Enterprise:</strong> Unlimited power for large organizations</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
