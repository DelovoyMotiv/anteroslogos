/**
 * POST /api/subscriptions/verify-payment
 * Verify USDC payment on Base L2 and activate subscription
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3**
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { activateSubscription } from '../../lib/subscriptions/manager';
import { withCors } from '../../lib/validation/middleware';

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    if (!supabase) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    // Get authorization token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Parse request body
    const { invoiceId, txHash } = req.body;

    if (!invoiceId || !txHash) {
      res.status(400).json({ error: 'Missing invoiceId or txHash' });
      return;
    }

    // Verify payment and activate subscription
    const result = await activateSubscription(invoiceId, txHash);

    res.status(200).json(result);
  } catch (error) {
    console.error('Verify payment endpoint error:', error);
    
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}

export default withCors(handler);
