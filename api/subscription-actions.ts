/**
 * Subscription Management Endpoints
 * Consolidated endpoint to reduce serverless function count
 * 
 * POST /api/subscription-actions?action=subscribe - Create subscription
 * POST /api/subscription-actions?action=cancel - Cancel subscription
 * POST /api/subscription-actions?action=verify - Verify payment
 * GET /api/subscription-actions?action=status - Get status
 * 
 * **Validates: Requirements 1.1, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3**
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { 
  subscribeToPlan, 
  cancelSubscription, 
  activateSubscription,
  getSubscriptionStatus 
} from '../../lib/subscriptions/manager';
import { withCors } from '../../lib/validation/middleware';

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    if (!supabase) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    // Get action from query parameter
    const action = req.query.action as string;
    
    if (!action) {
      res.status(400).json({ error: 'Missing action parameter' });
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

    // Route to appropriate handler
    switch (action) {
      case 'subscribe':
        await handleSubscribe(req, res, user.id);
        break;
      
      case 'cancel':
        await handleCancel(req, res, user.id);
        break;
      
      case 'verify':
        await handleVerify(req, res, user.id);
        break;
      
      case 'status':
        await handleStatus(req, res, user.id);
        break;
      
      default:
        res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Subscription management error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}

async function handleSubscribe(req: VercelRequest, res: VercelResponse, userId: string): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { planTier } = req.body;

  if (!planTier || !['starter', 'pro', 'enterprise'].includes(planTier)) {
    res.status(400).json({ error: 'Invalid plan tier' });
    return;
  }

  const result = await subscribeToPlan(userId, planTier);
  res.status(200).json(result);
}

async function handleCancel(req: VercelRequest, res: VercelResponse, userId: string): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const result = await cancelSubscription(userId);
  res.status(200).json(result);
}

async function handleVerify(req: VercelRequest, res: VercelResponse, userId: string): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { invoiceId, txHash } = req.body;

  if (!invoiceId || !txHash) {
    res.status(400).json({ error: 'Missing invoiceId or txHash' });
    return;
  }

  const result = await activateSubscription(invoiceId, txHash);
  res.status(200).json(result);
}

async function handleStatus(req: VercelRequest, res: VercelResponse, userId: string): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const status = await getSubscriptionStatus(userId);
  res.status(200).json(status);
}

export default withCors(handler);
