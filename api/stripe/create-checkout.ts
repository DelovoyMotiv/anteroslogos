/**
 * Create Stripe Checkout Session
 * Vercel Edge Function
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createCheckoutSession } from '../../lib/dashboard/billing';
import { supabase } from '../../lib/supabase';

/**
 * POST /api/stripe/create-checkout
 * Body: { planId: 'pro' | 'agency' }
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Parse request body
    const { planId } = req.body as { planId?: string };

    if (!planId || (planId !== 'pro' && planId !== 'agency')) {
      return res.status(400).json({ error: 'Invalid plan ID. Must be "pro" or "agency"' });
    }

    // Get base URL for success/cancel redirects
    const origin = req.headers.origin || req.headers.referer || 'https://anoteroslogos.com';
    const successUrl = `${origin}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/dashboard/billing?canceled=true`;

    // Create checkout session
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
  } catch (error) {
    console.error('Create checkout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
