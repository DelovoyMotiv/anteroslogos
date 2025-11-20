/**
 * Create Stripe Customer Portal Session
 * Vercel Edge Function
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createPortalSession } from '../../lib/dashboard/billing';
import { supabase } from '../../lib/supabase';

/**
 * POST /api/stripe/create-portal
 * Opens Stripe Customer Portal for managing subscriptions/payments
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

    // Get return URL
    const origin = req.headers.origin || req.headers.referer || 'https://anoteroslogos.com';
    const returnUrl = `${origin}/dashboard/billing`;

    // Create portal session
    const result = await createPortalSession(user.id, returnUrl);

    if ('error' in result) {
      return res.status(500).json({ error: result.error });
    }

    return res.status(200).json({ url: result.url });
  } catch (error) {
    console.error('Create portal error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
