/**
 * Subscriptions CRUD Endpoint
 * Complete REST API for subscription management
 * 
 * GET /api/subscriptions - List user subscriptions
 * POST /api/subscriptions - Create new subscription
 * GET /api/subscriptions/[id] - Get specific subscription
 * PUT /api/subscriptions/[id] - Update subscription
 * DELETE /api/subscriptions/[id] - Cancel subscription
 * 
 * **Validates: Requirements 6.3**
 * **Property 25: Complete CRUD Operations**
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase';
import { withCors, withRateLimit, withValidation, compose } from '../lib/validation/middleware';
import { z } from 'zod';

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const CreateSubscriptionSchema = z.object({
  plan_id: z.string().uuid(),
  payment_method: z.enum(['stripe', 'crypto', 'invoice']),
  billing_cycle: z.enum(['monthly', 'yearly']),
  auto_renew: z.boolean().default(true),
});

const UpdateSubscriptionSchema = z.object({
  plan_id: z.string().uuid().optional(),
  auto_renew: z.boolean().optional(),
  status: z.enum(['active', 'paused', 'cancelled']).optional(),
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get authenticated user from request
 */
async function getAuthenticatedUser(req: VercelRequest) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Extract ID from query parameters
 */
function getIdFromQuery(req: VercelRequest): string | null {
  const { id } = req.query;
  return typeof id === 'string' ? id : null;
}

// =====================================================
// CRUD HANDLERS
// =====================================================

/**
 * GET /api/subscriptions - List user subscriptions
 * GET /api/subscriptions?id=xxx - Get specific subscription
 */
async function handleGet(req: VercelRequest, res: VercelResponse) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const id = getIdFromQuery(req);

  // Get specific subscription
  if (id) {
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plans (
          plan_name,
          display_name,
          price_monthly,
          price_yearly,
          features
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    return res.status(200).json(subscription);
  }

  // Parse pagination parameters
  const { limit, offset } = req.query;
  const limitNum = typeof limit === 'string' ? Math.min(parseInt(limit, 10), 100) : 50;
  const offsetNum = typeof offset === 'string' ? parseInt(offset, 10) : 0;

  // List all subscriptions with pagination
  const { data: subscriptions, error, count } = await supabase
    .from('user_subscriptions')
    .select(`
      *,
      subscription_plans (
        plan_name,
        display_name,
        price_monthly,
        price_yearly,
        features
      )
    `, { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offsetNum, offsetNum + limitNum - 1);

  if (error) {
    return res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }

  return res.status(200).json({
    subscriptions: subscriptions || [],
    pagination: {
      total: count || 0,
      limit: limitNum,
      offset: offsetNum,
      has_more: (count || 0) > offsetNum + limitNum,
    },
  });
}

/**
 * POST /api/subscriptions - Create new subscription
 */
async function handlePost(
  req: VercelRequest,
  res: VercelResponse,
  validated?: { body: z.infer<typeof CreateSubscriptionSchema> }
) {
  if (!validated) {
    return res.status(400).json({ error: 'Invalid request body' });
  }
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Verify plan exists
  const { data: plan, error: planError } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', validated.body.plan_id)
    .eq('is_active', true)
    .single();

  if (planError || !plan) {
    return res.status(404).json({ error: 'Subscription plan not found' });
  }

  // Check if user already has an active subscription
  const { data: existing } = await supabase
    .from('user_subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])
    .maybeSingle();

  if (existing) {
    return res.status(400).json({ 
      error: 'User already has an active subscription. Cancel or upgrade existing subscription first.' 
    });
  }

  // Calculate dates
  const now = new Date();
  const currentPeriodEnd = new Date(now);
  if (validated.body.billing_cycle === 'monthly') {
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
  } else {
    currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
  }

  // Create subscription
  const { data: subscription, error: createError } = await supabase
    .from('user_subscriptions')
    .insert({
      user_id: user.id,
      plan_id: validated.body.plan_id,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: currentPeriodEnd.toISOString(),
      auto_renew: validated.body.auto_renew,
      payment_method: validated.body.payment_method,
      billing_cycle: validated.body.billing_cycle,
    })
    .select()
    .single();

  if (createError || !subscription) {
    return res.status(500).json({ error: 'Failed to create subscription' });
  }

  // Log audit event
  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: 'subscription.created',
    resource_type: 'subscription',
    resource_id: subscription.id,
    metadata: { plan_id: validated.body.plan_id, billing_cycle: validated.body.billing_cycle },
  });

  return res.status(201).json(subscription);
}

/**
 * PUT /api/subscriptions?id=xxx - Update subscription
 */
async function handlePut(
  req: VercelRequest,
  res: VercelResponse,
  validated?: { body: z.infer<typeof UpdateSubscriptionSchema> }
) {
  if (!validated) {
    return res.status(400).json({ error: 'Invalid request body' });
  }
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const id = getIdFromQuery(req);
  if (!id) {
    return res.status(400).json({ error: 'Missing subscription ID' });
  }

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !existing) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  // If changing plan, verify new plan exists
  if (validated.body.plan_id) {
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('id', validated.body.plan_id)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      return res.status(404).json({ error: 'New subscription plan not found' });
    }
  }

  // Update subscription
  const { data: updated, error: updateError } = await supabase
    .from('user_subscriptions')
    .update({
      ...validated.body,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (updateError || !updated) {
    return res.status(500).json({ error: 'Failed to update subscription' });
  }

  // Log audit event
  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: 'subscription.updated',
    resource_type: 'subscription',
    resource_id: id,
    metadata: validated.body,
  });

  return res.status(200).json(updated);
}

/**
 * DELETE /api/subscriptions?id=xxx - Cancel subscription
 */
async function handleDelete(req: VercelRequest, res: VercelResponse) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const id = getIdFromQuery(req);
  if (!id) {
    return res.status(400).json({ error: 'Missing subscription ID' });
  }

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from('user_subscriptions')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !existing) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  // Cancel subscription (soft delete - set status to cancelled)
  const { data: cancelled, error: cancelError } = await supabase
    .from('user_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      auto_renew: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (cancelError || !cancelled) {
    return res.status(500).json({ error: 'Failed to cancel subscription' });
  }

  // Log audit event
  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: 'subscription.cancelled',
    resource_type: 'subscription',
    resource_id: id,
  });

  return res.status(200).json(cancelled);
}

// =====================================================
// MAIN HANDLER
// =====================================================

import type { SubscriptionValidated, OptionalValidatedApiHandler } from '../types/api.types';

async function mainHandler(
  req: VercelRequest,
  res: VercelResponse,
  validated?: SubscriptionValidated
): Promise<void | VercelResponse> {
  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    case 'POST':
      return handlePost(req, res, validated);
    case 'PUT':
      return handlePut(req, res, validated);
    case 'DELETE':
      return handleDelete(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Apply middleware: CORS -> Rate Limiting -> Validation
export default compose(
  withCors,
  (handler) => withRateLimit(handler, { maxRequests: 60, windowMs: 60000 }),
  (handler) => withValidation(
    {
      bodySchema: z.union([CreateSubscriptionSchema, UpdateSubscriptionSchema]).optional(),
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
    handler as OptionalValidatedApiHandler<SubscriptionValidated>
  )
)(mainHandler);
