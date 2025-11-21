/**
 * Unified Stripe Handler
 * Handles all /api/stripe endpoints: create-checkout, create-portal, webhook
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createCheckoutSession, createPortalSession, handleStripeWebhook } from '../lib/dashboard/billing';
import { supabase } from '../lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
  typescript: true,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

async function authenticateRequest(req: VercelRequest): Promise<{ user: any; error?: string }> {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return { user: null, error: 'Missing authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return { user: null, error: 'Unauthorized' };
  }

  return { user };
}

/**
 * Unified handler for /api/stripe/* endpoints
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const { method } = req;
    const path = req.url?.split('?')[0] || '';

    // POST /api/stripe/webhook - handle Stripe webhooks (NO AUTH)
    if (method === 'POST' && path === '/api/stripe/webhook') {
      const sig = req.headers['stripe-signature'];

      if (!sig) {
        return res.status(400).json({ error: 'Missing signature' });
      }

      let event: Stripe.Event;

      try {
        const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return res.status(400).json({ 
          error: `Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}` 
        });
      }

      console.log('Stripe webhook event:', event.type, event.id);

      const result = await handleStripeWebhook(event);

      if (!result.success) {
        console.error('Webhook processing failed:', result.error);
        return res.status(500).json({ error: result.error });
      }

      return res.status(200).json({ received: true, eventId: event.id });
    }

    // Auth required for other endpoints
    const { user, error: authError } = await authenticateRequest(req);
    if (authError || !user) {
      return res.status(401).json({ error: authError || 'Unauthorized' });
    }

    // POST /api/stripe/create-checkout - create Stripe checkout session
    if (method === 'POST' && path === '/api/stripe/create-checkout') {
      const { planId } = req.body as { planId?: string };

      if (!planId || (planId !== 'pro' && planId !== 'agency')) {
        return res.status(400).json({ error: 'Invalid plan ID. Must be "pro" or "agency"' });
      }

      const origin = req.headers.origin || req.headers.referer || 'https://anoteroslogos.com';
      const successUrl = `${origin}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${origin}/dashboard/billing?canceled=true`;

      const result = await createCheckoutSession(
        user.id,
        planId as 'pro' | 'agency',
        successUrl,
        cancelUrl
      );

      if ('error' in result) {
        return res.status(500).json({ error: result.error });
      }

      return res.status(200).json({
        sessionId: result.sessionId,
        url: result.url,
      });
    }

    // POST /api/stripe/create-portal - create customer portal session
    if (method === 'POST' && path === '/api/stripe/create-portal') {
      const origin = req.headers.origin || req.headers.referer || 'https://anoteroslogos.com';
      const returnUrl = `${origin}/dashboard/billing`;

      const result = await createPortalSession(user.id, returnUrl);

      if ('error' in result) {
        return res.status(500).json({ error: result.error });
      }

      return res.status(200).json({ url: result.url });
    }

    // Fallback
    return res.status(404).json({ error: 'Endpoint not found' });

  } catch (error) {
    console.error('Stripe handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Disable body parsing for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};
