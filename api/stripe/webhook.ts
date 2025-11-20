/**
 * Stripe Webhook Handler
 * Vercel Edge Function for processing Stripe events
 * CRITICAL: Must use raw body for signature verification
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { handleStripeWebhook } from '../../lib/dashboard/billing';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * Webhook endpoint
 * POST /api/stripe/webhook
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get raw body for signature verification
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    console.error('Missing stripe-signature header');
    return res.status(400).json({ error: 'Missing signature' });
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    // Note: req.body should be raw string/buffer, not parsed JSON
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({ 
      error: `Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}` 
    });
  }

  // Log event for debugging
  console.log('Stripe webhook event:', event.type, event.id);

  try {
    // Process event
    const result = await handleStripeWebhook(event);

    if (!result.success) {
      console.error('Webhook processing failed:', result.error);
      return res.status(500).json({ error: result.error });
    }

    // Return 200 to acknowledge receipt
    return res.status(200).json({ received: true, eventId: event.id });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return res.status(500).json({ 
      error: 'Webhook processing error',
      eventId: event.id 
    });
  }
}

// IMPORTANT: Disable body parsing for Stripe webhooks
export const config = {
  api: {
    bodyParser: false,
  },
};
