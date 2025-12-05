/**
 * POST /api/subscriptions/subscribe
 * Create USDC subscription with invoice generation
 * 
 * **Validates: Requirements 2.1, 2.2**
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { subscribeToPlan } from '../../lib/subscriptions/manager';
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
    const { planTier } = req.body;

    if (!planTier || !['starter', 'pro', 'enterprise'].includes(planTier)) {
      res.status(400).json({ error: 'Invalid plan tier' });
      return;
    }

    // Create subscription using manager
    const result = await subscribeToPlan(user.id, planTier);

    res.status(200).json(result);
  } catch (error) {
    console.error('Subscribe endpoint error:', error);
    
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}

export default withCors(handler);
