// @ts-nocheck
/**
 * Billing Page
 * Stripe integration, plan selector, usage overview
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../../../lib/dashboard/auth-guard';
import { getSubscription, PLAN_CONFIG } from '../../../lib/dashboard/billing-client';
import { supabase } from '../../../lib/supabase';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function BillingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    getSubscription(user.id).then((result) => {
      if ('error' in result) {
        toast.error('Failed to load subscription');
        setLoading(false);
        return;
      }
      setSubscription(result);
      setLoading(false);
    });
  }, [user]);

  const handleUpgrade = async (planId: 'pro' | 'agency') => {
    setCheckoutLoading(planId);

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start checkout');
      setCheckoutLoading(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      const response = await fetch('/api/stripe/create-portal', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open portal');
      }

      window.location.href = data.url;
    } catch (error) {
      console.error('Portal error:', error);
      toast.error('Failed to open billing portal');
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  const currentPlan = subscription?.plan_id || 'free';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Billing</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Manage your subscription and billing details
        </p>
      </div>

      {/* Current Plan */}
      {subscription && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Current Plan
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {PLAN_CONFIG[currentPlan as keyof typeof PLAN_CONFIG].name}
              </p>
              {subscription.current_period_end && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {subscription.status === 'active'
                    ? `Renews ${new Date(subscription.current_period_end).toLocaleDateString()}`
                    : `Expires ${new Date(subscription.current_period_end).toLocaleDateString()}`}
                </p>
              )}
            </div>
            {currentPlan !== 'free' && (
              <button
                onClick={handleManageBilling}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Manage Billing
              </button>
            )}
          </div>
        </div>
      )}

      {/* Plan Selector */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Choose Your Plan
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(PLAN_CONFIG).map(([key, plan]) => {
            const isCurrentPlan = key === currentPlan;
            const isPaidPlan = key !== 'free';

            return (
              <div
                key={key}
                className={`
                  relative rounded-lg border-2 p-6
                  ${
                    isCurrentPlan
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
                      : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'
                  }
                `}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Current Plan
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {plan.name}
                  </h3>
                  <div className="mt-2">
                    {plan.price > 0 ? (
                      <>
                        <span className="text-4xl font-bold text-gray-900 dark:text-white">
                          ${(plan.price / 100).toFixed(0)}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">/month</span>
                      </>
                    ) : (
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">
                        Free
                      </span>
                    )}
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {isPaidPlan && !isCurrentPlan && (
                  <button
                    onClick={() => handleUpgrade(key as 'pro' | 'agency')}
                    disabled={checkoutLoading === key}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {checkoutLoading === key ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Upgrade'
                    )}
                  </button>
                )}

                {isCurrentPlan && currentPlan !== 'free' && (
                  <button
                    onClick={handleManageBilling}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    Manage
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Enterprise Contact */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg p-6 text-white">
        <h3 className="text-xl font-semibold mb-2">Need Enterprise?</h3>
        <p className="text-white/90 mb-4">
          Custom plans with dedicated support, SLA, and white-label options
        </p>
        <a
          href="mailto:enterprise@anoteroslogos.com"
          className="inline-flex px-4 py-2 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
        >
          Contact Sales
        </a>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-64" />
      <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-96 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// Import supabase for auth token
import { supabase } from '../../../lib/supabase';

export default BillingPage;
