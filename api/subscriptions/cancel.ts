/**
 * POST /api/subscriptions/cancel
 * Cancel active subscription (maintains access until period end)
 * 
 * **Validates: Requirements 2.3**
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { cancelSubscription } from '../../lib/subscriptions/manager';
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

    // Cancel subscription
    const result = await cancelSubscription(user.id);

    res.status(200).json(result);
  } catch (error) {
    console.error('Cancel endpoint error:', error);
    
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}

export default withCors(handler);
