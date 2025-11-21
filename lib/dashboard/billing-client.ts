/**
 * Billing Client-Safe Types and Constants
 * Used by browser code (React components)
 */

// Plan configuration (client-safe, no Stripe SDK)
export const PLAN_CONFIG = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: null,
    features: [
      '100 calls/day',
      'Basic tools only',
      '1 API key',
      'Community support',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 4900, // cents
    interval: 'month' as const,
    features: [
      'Unlimited calls',
      'All tools + UCPT',
      'Causal tracer',
      '5 API keys',
      '10 agent keys',
      'Priority support',
    ],
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    price: 29900, // cents
    interval: 'month' as const,
    features: [
      'Unlimited calls',
      'All tools + white-label',
      '20 API keys',
      '50 agent keys',
      '5 team seats',
      'API billing webhooks',
      'Dedicated support',
      'SLA guarantee',
    ],
  },
} as const;

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string;
  plan_id: 'free' | 'pro' | 'agency';
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  trial_start: string | null;
  trial_end: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Get user subscription (client-safe, uses Supabase)
 */
export async function getSubscription(
  userId: string
): Promise<Subscription | { error: string }> {
  try {
    const { supabase } = await import('../supabase');
    
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // No subscription = free tier (default)
      return {
        id: '',
        user_id: userId,
        stripe_subscription_id: null,
        stripe_customer_id: '',
        plan_id: 'free',
        status: 'active',
        current_period_start: null,
        current_period_end: null,
        cancel_at_period_end: false,
        canceled_at: null,
        trial_start: null,
        trial_end: null,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    return data as Subscription;
  } catch (error) {
    console.error('getSubscription error:', error);
    return { error: 'Internal error' };
  }
}
