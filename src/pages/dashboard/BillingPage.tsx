// @ts-nocheck
/**
 * Billing Page - USDC Subscription System
 * Base L2 USDC payments, plan management, usage tracking
 * Enhanced with improved visual hierarchy, responsive design, and user notifications
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
import { Wallet, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PaymentModal } from '../../components/PaymentModal';
import { CurrentPlanCard } from '../../components/billing/CurrentPlanCard';
import { RenewalReminderBanner } from '../../components/billing/RenewalReminderBanner';
import { PlanComparisonGrid } from '../../components/billing/PlanComparisonGrid';

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
      const response = await fetch('/api/subscription-actions?action=subscribe', {
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
      const response = await fetch('/api/subscription-actions?action=cancel', {
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

  // Handler for scrolling to plans section
  const scrollToPlans = () => {
    const element = document.getElementById('plans-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 px-4 md:px-0">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
          Subscription & Billing
        </h1>
        <p className="mt-2 text-sm md:text-base text-gray-600 dark:text-gray-400">
          Manage your USDC subscription on Base L2
        </p>
      </div>

      {/* Renewal Reminder Banner */}
      {subscription && usageStats && (
        <RenewalReminderBanner 
          subscription={subscription} 
          onRenewNow={scrollToPlans}
        />
      )}

      {/* Current Plan */}
      {subscription && usageStats && (
        <CurrentPlanCard 
          subscription={subscription}
          usageStats={usageStats}
          onCancelSubscription={handleCancelSubscription}
        />
      )}

      {/* Pending Invoices */}
      {invoices.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base md:text-lg font-semibold text-yellow-900 dark:text-yellow-100">
              Pending Payments
            </h2>
            <Wallet className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="space-y-3">
            {invoices.map(invoice => (
              <div
                key={invoice.invoice_id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-gray-900 rounded-lg p-4"
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
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors min-h-[44px] touch-manipulation"
                >
                  Pay Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plan Comparison Grid - Responsive */}
      <PlanComparisonGrid 
        subscription={subscription}
        subscribing={subscribing}
        onSubscribe={handleSubscribeToPlan}
      />

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
