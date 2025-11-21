// @ts-nocheck
/**
 * Billing Management - SERVER-ONLY
 * Stripe integration for subscriptions and payments
 * IMPORTANT: This file MUST only be imported by serverless functions in /api
 */

import { supabase } from '../supabase';
import Stripe from 'stripe';

// Initialize Stripe (server-side only)
let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('Missing STRIPE_SECRET_KEY');
    }
    stripe = new Stripe(apiKey, {
      apiVersion: '2025-11-17.clover',
      typescript: true,
    });
  }
  return stripe;
}

// Plan configuration with Stripe Price IDs (server-only)
const PLAN_CONFIG = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: null,
    stripePriceId: null,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 4900, // cents
    interval: 'month' as const,
    stripePriceId: process.env.STRIPE_PRICE_PRO,
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    price: 29900, // cents
    interval: 'month' as const,
    stripePriceId: process.env.STRIPE_PRICE_AGENCY,
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
 * Get or create Stripe customer for user
 */
export async function getOrCreateStripeCustomer(
  userId: string
): Promise<{ customerId: string; error?: string }> {
  try {
    // Check if customer already exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email, full_name')
      .eq('id', userId)
      .single();

    if (!profile) {
      return { customerId: '', error: 'Profile not found' };
    }

    if (profile.stripe_customer_id) {
      return { customerId: profile.stripe_customer_id };
    }

    // Create new Stripe customer
    const stripeClient = getStripe();
    const customer = await stripeClient.customers.create({
      email: profile.email,
      name: profile.full_name || undefined,
      metadata: {
        user_id: userId,
      },
    });

    // Update profile with customer ID
    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customer.id })
      .eq('id', userId);

    return { customerId: customer.id };
  } catch (error) {
    console.error('getOrCreateStripeCustomer error:', error);
    return { customerId: '', error: 'Failed to create Stripe customer' };
  }
}

/**
 * Create Stripe Checkout Session for plan upgrade
 */
export async function createCheckoutSession(
  userId: string,
  planId: 'pro' | 'agency',
  successUrl: string,
  cancelUrl: string
): Promise<{ sessionId: string; url: string } | { error: string }> {
  try {
    const plan = PLAN_CONFIG[planId];
    if (!plan.stripePriceId) {
      return { error: 'Invalid plan configuration' };
    }

    // Get or create customer
    const { customerId, error: customerError } = await getOrCreateStripeCustomer(userId);
    if (customerError) {
      return { error: customerError };
    }

    // Create checkout session
    const stripeClient = getStripe();
    const session = await stripeClient.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: userId,
        plan_id: planId,
      },
      subscription_data: {
        metadata: {
          user_id: userId,
          plan_id: planId,
        },
      },
    });

    // Log audit event
    await supabase.from('audit_log').insert({
      user_id: userId,
      action: 'checkout.initiated',
      resource_type: 'subscription',
      metadata: { plan_id: planId, session_id: session.id },
    });

    return {
      sessionId: session.id,
      url: session.url!,
    };
  } catch (error) {
    console.error('createCheckoutSession error:', error);
    return { error: 'Failed to create checkout session' };
  }
}

/**
 * Create Stripe Customer Portal Session
 * For managing payment methods, invoices, subscriptions
 */
export async function createPortalSession(
  userId: string,
  returnUrl: string
): Promise<{ url: string } | { error: string }> {
  try {
    // Get customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!profile || !profile.stripe_customer_id) {
      return { error: 'No Stripe customer found' };
    }

    // Create portal session
    const stripeClient = getStripe();
    const session = await stripeClient.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl,
    });

    return { url: session.url };
  } catch (error) {
    console.error('createPortalSession error:', error);
    return { error: 'Failed to create portal session' };
  }
}


/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .single();

    if (!subscription || !subscription.stripe_subscription_id) {
      return { success: false, error: 'No active subscription' };
    }

    // Cancel in Stripe
    const stripeClient = getStripe();
    await stripeClient.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // Update database
    await supabase
      .from('subscriptions')
      .update({ cancel_at_period_end: true })
      .eq('user_id', userId);

    // Log audit event
    await supabase.from('audit_log').insert({
      user_id: userId,
      action: 'subscription.canceled',
      resource_type: 'subscription',
      metadata: { stripe_subscription_id: subscription.stripe_subscription_id },
    });

    return { success: true };
  } catch (error) {
    console.error('cancelSubscription error:', error);
    return { success: false, error: 'Failed to cancel subscription' };
  }
}

/**
 * Reactivate canceled subscription
 */
export async function reactivateSubscription(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .single();

    if (!subscription || !subscription.stripe_subscription_id) {
      return { success: false, error: 'No active subscription' };
    }

    // Reactivate in Stripe
    const stripeClient = getStripe();
    await stripeClient.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    // Update database
    await supabase
      .from('subscriptions')
      .update({ cancel_at_period_end: false })
      .eq('user_id', userId);

    // Log audit event
    await supabase.from('audit_log').insert({
      user_id: userId,
      action: 'subscription.reactivated',
      resource_type: 'subscription',
      metadata: { stripe_subscription_id: subscription.stripe_subscription_id },
    });

    return { success: true };
  } catch (error) {
    console.error('reactivateSubscription error:', error);
    return { success: false, error: 'Failed to reactivate subscription' };
  }
}

/**
 * Handle Stripe webhook events
 * Called from /api/stripe/webhook
 */
export async function handleStripeWebhook(
  event: Stripe.Event
): Promise<{ success: boolean; error?: string }> {
  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { success: true };
  } catch (error) {
    console.error('handleStripeWebhook error:', error);
    return { success: false, error: 'Webhook processing failed' };
  }
}

/**
 * Handle subscription created/updated
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.user_id;
  const planId = subscription.metadata.plan_id as 'pro' | 'agency';

  if (!userId) {
    console.error('No user_id in subscription metadata');
    return;
  }

  // Upsert subscription
  await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      plan_id: planId,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
      trial_start: subscription.trial_start
        ? new Date(subscription.trial_start * 1000).toISOString()
        : null,
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      metadata: subscription.metadata as Record<string, unknown>,
    });

  // Log audit event
  await supabase.from('audit_log').insert({
    user_id: userId,
    action: 'subscription.updated',
    resource_type: 'subscription',
    metadata: {
      stripe_subscription_id: subscription.id,
      plan_id: planId,
      status: subscription.status,
    },
  });
}

/**
 * Handle subscription deleted (downgrade to free)
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.user_id;

  if (!userId) {
    console.error('No user_id in subscription metadata');
    return;
  }

  // Update subscription status
  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  // Update profile to free plan
  await supabase
    .from('profiles')
    .update({
      current_plan: 'free',
      subscription_status: 'inactive',
    })
    .eq('id', userId);

  // Log audit event
  await supabase.from('audit_log').insert({
    user_id: userId,
    action: 'subscription.deleted',
    resource_type: 'subscription',
    metadata: { stripe_subscription_id: subscription.id },
  });
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const userId = invoice.subscription_details?.metadata?.user_id;

  if (!userId) return;

  // Log audit event
  await supabase.from('audit_log').insert({
    user_id: userId,
    action: 'payment.succeeded',
    resource_type: 'subscription',
    metadata: {
      invoice_id: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
    },
  });
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const userId = invoice.subscription_details?.metadata?.user_id;

  if (!userId) return;

  // Update subscription status
  await supabase
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', invoice.subscription as string);

  // Log audit event
  await supabase.from('audit_log').insert({
    user_id: userId,
    action: 'payment.failed',
    resource_type: 'subscription',
    metadata: {
      invoice_id: invoice.id,
      amount: invoice.amount_due,
      currency: invoice.currency,
    },
  });
}
