// @ts-nocheck
/**
 * Billing Page - USDC Subscription System
 * Base L2 USDC payments, plan management, usage tracking
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../../../lib/dashboard/auth-guard';
import { 
  getSubscription, 
  getPendingInvoices, 
  getUsageStats,
  getPlatformWalletAddress,
  PLAN_CONFIG,
  type USDCSubscription,
  type SubscriptionInvoice,
  type UsageStats
} from '../../../lib/dashboard/billing-client';
import { supabase } from '../../../lib/supabase';
import { Check, Loader2, TrendingUp, Calendar, Wallet, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PaymentModal } from '../../components/PaymentModal';

export function BillingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<USDCSubscription | null>(null);
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [walletAddress, setWalletAddress] = useState<string>('');
  
  // Payment modal state
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    planName: string;
    amount: number;
    invoiceId: string;
  }>({ isOpen: false, planName: '', amount: 0, invoiceId: '' });
  
  const [subscribing, setSubscribing] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    
    const [subResult, invoicesResult, walletAddr] = await Promise.all([
      getSubscription(user.id),
      getPendingInvoices(user.id),
      getPlatformWalletAddress(),
    ]);

    if ('error' in subResult) {
      toast.error('Failed to load subscription');
      setLoading(false);
      return;
    }

    setSubscription(subResult);
    setWalletAddress(walletAddr);
    
    if (!('error' in invoicesResult)) {
      setInvoices(invoicesResult);
    }

    // Calculate usage stats
    const stats = await getUsageStats(subResult);
    setUsageStats(stats);
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleSubscribeToPlan = async (planTier: 'starter' | 'pro' | 'enterprise') => {
    setSubscribing(planTier);

    try {
      const response = await fetch('/api/subscriptions/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ planTier }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create subscription');
      }

      // Open payment modal with invoice details
      setPaymentModal({
        isOpen: true,
        planName: PLAN_CONFIG[planTier].name,
        amount: PLAN_CONFIG[planTier].price,
        invoiceId: data.invoice.invoice_id,
      });
      
      toast.success('Subscription created! Please complete payment.');
    } catch (error) {
      console.error('Subscribe error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to subscribe');
    } finally {
      setSubscribing(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;
    
    if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.')) {
      return;
    }

    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      toast.success('Subscription cancelled. Access will continue until period end.');
      await loadData();
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error('Failed to cancel subscription');
    }
  };

  const handlePaymentVerified = async () => {
    toast.success('Payment verified! Reloading subscription data...');
    await loadData();
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  const currentPlan = subscription?.plan_tier || 'free';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Subscription & Billing</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Manage your USDC subscription on Base L2
        </p>
      </div>

      {/* Current Plan & Usage */}
      {subscription && usageStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Plan */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Current Plan
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {PLAN_CONFIG[currentPlan as keyof typeof PLAN_CONFIG].name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {subscription.status === 'active' ? (
                    <span className="inline-flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                      Active
                    </span>
                  ) : subscription.status === 'pending_payment' ? (
                    <span className="inline-flex items-center">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2" />
                      Pending Payment
                    </span>
                  ) : (
                    <span className="inline-flex items-center">
                      <span className="w-2 h-2 bg-gray-500 rounded-full mr-2" />
                      {subscription.status}
                    </span>
                  )}
                </p>
              </div>
              
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4 mr-2" />
                <span>
                  Renews {new Date(subscription.current_period_end).toLocaleDateString()}
                  <span className="ml-2 text-gray-500">({usageStats.daysRemaining} days remaining)</span>
                </span>
              </div>

              {currentPlan !== 'free' && subscription.status === 'active' && (
                <button
                  onClick={handleCancelSubscription}
                  className="mt-4 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  Cancel Subscription
                </button>
              )}
            </div>
          </div>

          {/* Usage Stats */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Usage This Period
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">GEO Audits</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {usageStats.auditsUsed} / {usageStats.auditsQuota === -1 ? '∞' : usageStats.auditsQuota}
                  </span>
                </div>
                
                {usageStats.auditsQuota !== -1 && (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        usageStats.percentageUsed >= 90
                          ? 'bg-red-500'
                          : usageStats.percentageUsed >= 70
                          ? 'bg-yellow-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(usageStats.percentageUsed, 100)}%` }}
                    />
                  </div>
                )}
              </div>

              {usageStats.auditsQuota !== -1 && usageStats.percentageUsed >= 80 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <div className="flex items-start">
                    <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-yellow-900 dark:text-yellow-100">
                      You've used {usageStats.percentageUsed}% of your monthly quota. Consider upgrading for more audits.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pending Invoices */}
      {invoices.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">
              Pending Payments
            </h2>
            <Wallet className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="space-y-3">
            {invoices.map(invoice => (
              <div
                key={invoice.invoice_id}
                className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg p-4"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {invoice.amount_usdc} USDC
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Due: {new Date(invoice.payment_due_date).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const planTier = subscription?.plan_tier || 'starter';
                    setPaymentModal({
                      isOpen: true,
                      planName: PLAN_CONFIG[planTier as keyof typeof PLAN_CONFIG].name,
                      amount: parseFloat(invoice.amount_usdc),
                      invoiceId: invoice.invoice_id,
                    });
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Pay Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plan Selector */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Available Plans
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(PLAN_CONFIG).map(([key, plan]) => {
            const isCurrentPlan = key === currentPlan;
            const isPaidPlan = key !== 'free';
            const canSubscribe = isPaidPlan && !isCurrentPlan && subscription?.status === 'active';

            return (
              <div
                key={key}
                className={`
                  relative rounded-xl border-2 p-6 transition-all
                  ${
                    isCurrentPlan
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10 shadow-lg'
                      : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-blue-300 dark:hover:border-blue-700'
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
                  <div className="mt-3">
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">
                        ${plan.price}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 ml-1">/mo</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {plan.auditsPerMonth === -1 ? 'Unlimited' : plan.auditsPerMonth} audit{plan.auditsPerMonth !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <ul className="space-y-2 mb-6 min-h-[180px]">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-gray-700 dark:text-gray-300">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {canSubscribe ? (
                  <button
                    onClick={() => handleSubscribeToPlan(key as 'starter' | 'pro' | 'enterprise')}
                    disabled={subscribing === key}
                    className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {subscribing === key ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Upgrade
                      </>
                    )}
                  </button>
                ) : isCurrentPlan ? (
                  <button
                    disabled
                    className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg font-semibold cursor-not-allowed"
                  >
                    Current Plan
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={paymentModal.isOpen}
        onClose={() => setPaymentModal({ ...paymentModal, isOpen: false })}
        planName={paymentModal.planName}
        amountUSDC={paymentModal.amount}
        invoiceId={paymentModal.invoiceId}
        walletAddress={walletAddress}
        onPaymentVerified={handlePaymentVerified}
      />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-64" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="h-48 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-96 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default BillingPage;
