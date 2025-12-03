/**
 * Audit Trail CRUD Endpoint
 * Complete REST API for audit trail management (read-only for users)
 * 
 * GET /api/audit-trail - List audit events
 * GET /api/audit-trail/[id] - Get specific audit event
 * 
 * Note: Audit trail is append-only (WORM), so POST/PUT/DELETE are not allowed
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

const QueryAuditTrailSchema = z.object({
  action: z.string().optional(),
  resource_type: z.string().optional(),
  resource_id: z.string().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  limit: z.number().int().positive().max(100).default(50).optional(),
  offset: z.number().int().nonnegative().default(0).optional(),
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

/**
 * Get current tenant ID from context
 */
async function getCurrentTenantId(userId: string): Promise<string | null> {
  // Get user's primary tenant
  const { data, error } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.tenant_id;
}

// =====================================================
// READ HANDLERS
// =====================================================

/**
 * GET /api/audit-trail - List audit events
 * GET /api/audit-trail?id=xxx - Get specific audit event
 */
async function handleGet(req: VercelRequest, res: VercelResponse) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const tenantId = await getCurrentTenantId(user.id);
  if (!tenantId) {
    return res.status(400).json({ error: 'No tenant context found' });
  }

  const id = getIdFromQuery(req);

  // Get specific audit event
  if (id) {
    const { data: event, error } = await supabase
      .from('audit_trail')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !event) {
      return res.status(404).json({ error: 'Audit event not found' });
    }

    return res.status(200).json(event);
  }

  // Parse query parameters
  const {
    action,
    resource_type,
    resource_id,
    start_date,
    end_date,
    limit = 50,
    offset = 0,
  } = req.query;

  // Build query
  let query = supabase
    .from('audit_trail')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId);

  // Apply filters
  if (action && typeof action === 'string') {
    query = query.eq('action', action);
  }

  if (resource_type && typeof resource_type === 'string') {
    query = query.eq('resource_type', resource_type);
  }

  if (resource_id && typeof resource_id === 'string') {
    query = query.eq('resource_id', resource_id);
  }

  if (start_date && typeof start_date === 'string') {
    query = query.gte('timestamp', start_date);
  }

  if (end_date && typeof end_date === 'string') {
    query = query.lte('timestamp', end_date);
  }

  // Apply pagination
  const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : 50;
  const offsetNum = typeof offset === 'string' ? parseInt(offset, 10) : 0;

  query = query
    .order('timestamp', { ascending: false })
    .range(offsetNum, offsetNum + limitNum - 1);

  const { data: events, error, count } = await query;

  if (error) {
    return res.status(500).json({ error: 'Failed to fetch audit events' });
  }

  return res.status(200).json({
    events: events || [],
    pagination: {
      total: count || 0,
      limit: limitNum,
      offset: offsetNum,
      has_more: (count || 0) > offsetNum + limitNum,
    },
  });
}

/**
 * POST /api/audit-trail - Not allowed (append-only via application logic)
 */
async function handlePost(req: VercelRequest, res: VercelResponse) {
  return res.status(405).json({
    error: 'Method not allowed',
    message: 'Audit trail is append-only. Events are created automatically by the system.',
  });
}

/**
 * PUT /api/audit-trail - Not allowed (immutable)
 */
async function handlePut(req: VercelRequest, res: VercelResponse) {
  return res.status(405).json({
    error: 'Method not allowed',
    message: 'Audit trail is immutable. Events cannot be modified.',
  });
}

/**
 * DELETE /api/audit-trail - Not allowed (WORM)
 */
async function handleDelete(req: VercelRequest, res: VercelResponse) {
  return res.status(405).json({
    error: 'Method not allowed',
    message: 'Audit trail is write-once-read-many (WORM). Events cannot be deleted.',
  });
}

// =====================================================
// MAIN HANDLER
// =====================================================

import type { AuditTrailValidated, OptionalValidatedApiHandler } from '../types/api.types';

async function mainHandler(
  req: VercelRequest,
  res: VercelResponse,
  validated?: AuditTrailValidated
): Promise<void> {
  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    case 'POST':
      return handlePost(req, res);
    case 'PUT':
      return handlePut(req, res);
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
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'], // All methods handled, but most return 405
    },
    handler as OptionalValidatedApiHandler<AuditTrailValidated>
  )
)(mainHandler);
