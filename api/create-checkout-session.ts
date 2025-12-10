/**
 * Create Stripe Checkout Session
 * API endpoint for initiating credit purchases
 * 
 * This is a Vercel serverless function
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createCheckoutSession } from '../lib/billing/stripe';

interface CreateCheckoutRequest {
  userId: string;
  packageId: string;
  packageName: string;
  cccAmount: number;
  usdCost: number;
  successUrl?: string;
  cancelUrl?: string;
}

/**
 * Create checkout session endpoint
 * POST /api/create-checkout-session
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Only accept POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  try {
    const body = req.body as CreateCheckoutRequest;
    
    // Validate required fields
    if (!body.userId || !body.packageId || !body.packageName || !body.cccAmount || !body.usdCost) {
      res.status(400).json({ 
        error: 'Missing required fields: userId, packageId, packageName, cccAmount, usdCost' 
      });
      return;
    }
    
    // Validate amounts
    if (body.cccAmount <= 0 || body.usdCost <= 0) {
      res.status(400).json({ error: 'Amounts must be positive' });
      return;
    }
    
    // Get base URL for redirect URLs
    const baseUrl = process.env.VITE_SITE_URL || 
                    process.env.NEXT_PUBLIC_SITE_URL || 
                    'http://localhost:5173';
    
    const successUrl = body.successUrl || `${baseUrl}/dashboard?purchase=success`;
    const cancelUrl = body.cancelUrl || `${baseUrl}/dashboard?purchase=cancelled`;
    
    // Create checkout session
    const session = await createCheckoutSession(
      body.userId,
      body.packageId,
      body.packageName,
      body.cccAmount,
      body.usdCost,
      successUrl,
      cancelUrl
    );
    
    // Return session details
    res.status(200).json({
      sessionId: session.sessionId,
      url: session.url,
    });
  } catch (error) {
    console.error('Create checkout session error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: errorMessage });
  }
}
