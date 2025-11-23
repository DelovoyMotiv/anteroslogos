/**
 * USDC Subscription Billing - Client-Safe Types and Constants
 * Used by browser code (React components)
 */

import type { PlanTier, SubscriptionStatus } from '../subscriptions/types';

// USDC Plan Configuration (Base L2)
export const PLAN_CONFIG = {
  free: {
    id: 'free' as PlanTier,
    name: 'Free',
    price: 0, // USDC
    interval: 'month' as const,
    auditsPerMonth: 1,
    features: [
      '1 GEO audit/month',
      'Basic verification',
      'Community support',
      'Public dashboard',
    ],
  },
  starter: {
    id: 'starter' as PlanTier,
    name: 'Starter',
    price: 19, // USDC
    interval: 'month' as const,
    auditsPerMonth: 10,
    features: [
      '10 GEO audits/month',
      'Full verification suite',
      'Email support',
      'Audit history (30 days)',
      'API access',
    ],
  },
  pro: {
    id: 'pro' as PlanTier,
    name: 'Pro',
    price: 49, // USDC
    interval: 'month' as const,
    auditsPerMonth: 100,
    features: [
      '100 GEO audits/month',
      'Priority verification',
      'Priority support',
      'Audit history (90 days)',
      'Advanced analytics',
      'Webhook notifications',
      'Custom integrations',
    ],
  },
  enterprise: {
    id: 'enterprise' as PlanTier,
    name: 'Enterprise',
    price: 499, // USDC
    interval: 'month' as const,
    auditsPerMonth: -1, // Unlimited
    features: [
      'Unlimited GEO audits',
      'Dedicated infrastructure',
      'White-label options',
      'SLA guarantee (99.9%)',
      'Dedicated support',
      'Custom contract terms',
      'Bulk API discounts',
      'Team management',
    ],
  },
} as const;

export interface USDCSubscription {
  subscription_id: string;
  user_id: string;
  plan_tier: PlanTier;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  audits_used_this_period: number;
  audits_quota: number; // -1 = unlimited
  created_at: string;
  updated_at: string;
}

export interface SubscriptionInvoice {
  invoice_id: string;
  subscription_id: string;
  amount_usdc: string;
  status: 'pending_payment' | 'paid' | 'failed' | 'cancelled';
  payment_due_date: string;
  paid_at: string | null;
  created_at: string;
}

export interface UsageStats {
  auditsUsed: number;
  auditsQuota: number;
  percentageUsed: number;
  daysRemaining: number;
}

/**
 * Get user USDC subscription from user_subscriptions table
 */
export async function getSubscription(
  userId: string
): Promise<USDCSubscription | { error: string }> {
  try {
    const { supabase } = await import('../supabase');
    
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error) {
      console.error('getSubscription error:', error);
      return { error: 'No active subscription found' };
    }

    return data as USDCSubscription;
  } catch (error) {
    console.error('getSubscription error:', error);
    return { error: 'Internal error' };
  }
}

/**
 * Get pending invoices for user
 */
export async function getPendingInvoices(
  userId: string
): Promise<SubscriptionInvoice[] | { error: string }> {
  try {
    const { supabase } = await import('../supabase');
    
    // Get all subscription IDs for user
    const { data: subscriptions, error: subError } = await supabase
      .from('user_subscriptions')
      .select('subscription_id')
      .eq('user_id', userId);

    if (subError || !subscriptions) {
      return { error: 'Failed to fetch subscriptions' };
    }

    const subscriptionIds = subscriptions.map((s: any) => s.subscription_id);

    if (subscriptionIds.length === 0) {
      return [];
    }

    // Get pending invoices
    const { data, error } = await supabase
      .from('subscription_invoices')
      .select('*')
      .in('subscription_id', subscriptionIds)
      .eq('status', 'pending_payment')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('getPendingInvoices error:', error);
      return { error: 'Failed to fetch invoices' };
    }

    return data as SubscriptionInvoice[];
  } catch (error) {
    console.error('getPendingInvoices error:', error);
    return { error: 'Internal error' };
  }
}

/**
 * Get usage statistics for current period
 */
export async function getUsageStats(
  subscription: USDCSubscription
): Promise<UsageStats> {
  const auditsUsed = subscription.audits_used_this_period;
  const auditsQuota = subscription.audits_quota;
  
  const percentageUsed = auditsQuota === -1 
    ? 0 
    : Math.round((auditsUsed / auditsQuota) * 100);

  const periodEnd = new Date(subscription.current_period_end);
  const now = new Date();
  const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return {
    auditsUsed,
    auditsQuota,
    percentageUsed,
    daysRemaining,
  };
}

/**
 * Get platform wallet address for payments
 */
export async function getPlatformWalletAddress(): Promise<string> {
  try {
    const { supabase } = await import('../supabase');
    
    const { data, error } = await supabase.rpc('get_platform_wallet_address');

    if (error || !data) {
      console.error('getPlatformWalletAddress error:', error);
      // Fallback to hardcoded address
      return '0x8dc66e84c31fe4dd455e1b32fe42d42d026abb93';
    }

    return data as string;
  } catch (error) {
    console.error('getPlatformWalletAddress error:', error);
    return '0x8dc66e84c31fe4dd455e1b32fe42d42d026abb93';
  }
}
