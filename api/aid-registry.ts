/**
 * AID Registry CRUD Endpoint
 * Complete REST API for Agent Identity (AID) registry management
 * 
 * GET /api/aid-registry - List registered AIDs
 * POST /api/aid-registry - Register new AID
 * GET /api/aid-registry/[id] - Get specific AID
 * PUT /api/aid-registry/[id] - Update AID
 * DELETE /api/aid-registry/[id] - Revoke AID
 * 
 * **Validates: Requirements 6.3**
 * **Property 25: Complete CRUD Operations**
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase';
import { AIDRegistry } from '../lib/tenancy/aidRegistry';
import { withCors, withRateLimit, withValidation, compose } from '../lib/validation/middleware';
import { z } from 'zod';

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const RegisterAIDSchema = z.object({
  agentName: z.string().min(1).max(100),
  aidUri: z.string().regex(/^aid:\/\/.+/),
  publicKeyEd25519: z.string().regex(/^[A-Za-z0-9+/]+=*$/), // Base64
  agentDescription: z.string().max(500).optional(),
  endpoint: z.string().url().optional(),
  capabilities: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const UpdateAIDSchema = z.object({
  agentName: z.string().min(1).max(100).optional(),
  agentDescription: z.string().max(500).optional(),
  endpoint: z.string().url().optional(),
  capabilities: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
  verified: z.boolean().optional(),
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
// CRUD HANDLERS
// =====================================================

/**
 * GET /api/aid-registry - List registered AIDs
 * GET /api/aid-registry?id=xxx - Get specific AID
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

  // Registry instance available for future use
  // const registry = new AIDRegistry(supabase);
  const id = getIdFromQuery(req);

  // Get specific AID
  if (id) {
    const { data: aid, error } = await supabase
      .from('aid_registry')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !aid) {
      return res.status(404).json({ error: 'AID not found' });
    }

    return res.status(200).json(aid);
  }

  // Parse pagination parameters
  const { limit, offset } = req.query;
  const limitNum = typeof limit === 'string' ? Math.min(parseInt(limit, 10), 100) : 50;
  const offsetNum = typeof offset === 'string' ? parseInt(offset, 10) : 0;

  // List AIDs for tenant with pagination
  const query = supabase
    .from('aid_registry')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(offsetNum, offsetNum + limitNum - 1);

  const { data: aids, error, count } = await query;

  if (error) {
    return res.status(500).json({ error: 'Failed to fetch AIDs' });
  }

  return res.status(200).json({
    aids: aids || [],
    pagination: {
      total: count || 0,
      limit: limitNum,
      offset: offsetNum,
      has_more: (count || 0) > offsetNum + limitNum,
    },
  });
}

/**
 * POST /api/aid-registry - Register new AID
 */
async function handlePost(
  req: VercelRequest,
  res: VercelResponse,
  validated: { body: z.infer<typeof RegisterAIDSchema> }
) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const tenantId = await getCurrentTenantId(user.id);
  if (!tenantId) {
    return res.status(400).json({ error: 'No tenant context found' });
  }

  const registry = new AIDRegistry(supabase);

  // Register AID
  const result = await registry.registerAgent(validated.body);

  if ('error' in result) {
    return res.status(400).json({ error: result.error });
  }

  // Log audit event
  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: 'aid.registered',
    resource_type: 'aid_registry',
    resource_id: result.id,
    metadata: { aid_uri: validated.body.aidUri },
  });

  return res.status(201).json(result);
}

/**
 * PUT /api/aid-registry?id=xxx - Update AID
 */
async function handlePut(
  req: VercelRequest,
  res: VercelResponse,
  validated: { body: z.infer<typeof UpdateAIDSchema> }
) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const tenantId = await getCurrentTenantId(user.id);
  if (!tenantId) {
    return res.status(400).json({ error: 'No tenant context found' });
  }

  const id = getIdFromQuery(req);
  if (!id) {
    return res.status(400).json({ error: 'Missing AID ID' });
  }

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from('aid_registry')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !existing) {
    return res.status(404).json({ error: 'AID not found' });
  }

  // Update AID
  const { data: updated, error: updateError } = await supabase
    .from('aid_registry')
    .update({
      ...validated.body,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (updateError || !updated) {
    return res.status(500).json({ error: 'Failed to update AID' });
  }

  // Log audit event
  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: 'aid.updated',
    resource_type: 'aid_registry',
    resource_id: id,
    metadata: validated.body,
  });

  return res.status(200).json(updated);
}

/**
 * DELETE /api/aid-registry?id=xxx - Revoke AID
 */
async function handleDelete(req: VercelRequest, res: VercelResponse) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const tenantId = await getCurrentTenantId(user.id);
  if (!tenantId) {
    return res.status(400).json({ error: 'No tenant context found' });
  }

  const id = getIdFromQuery(req);
  if (!id) {
    return res.status(400).json({ error: 'Missing AID ID' });
  }

  // Get AID URI for revocation
  const { data: aid, error: fetchError } = await supabase
    .from('aid_registry')
    .select('aid_uri')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !aid) {
    return res.status(404).json({ error: 'AID not found' });
  }

  const registry = new AIDRegistry(supabase);

  // Revoke AID
  const result = await registry.revokeAgent(aid.aid_uri);

  if ('error' in result) {
    return res.status(500).json({ error: result.error });
  }

  // Log audit event
  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: 'aid.revoked',
    resource_type: 'aid_registry',
    resource_id: id,
    metadata: { aid_uri: aid.aid_uri },
  });

  return res.status(200).json({ success: true, message: 'AID revoked successfully' });
}

// =====================================================
// MAIN HANDLER
// =====================================================

import type { AidRegistryValidated, OptionalValidatedApiHandler } from '../types/api.types';

async function mainHandler(
  req: VercelRequest,
  res: VercelResponse,
  validated?: AidRegistryValidated
): Promise<void> {
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
      bodySchema: z.union([RegisterAIDSchema, UpdateAIDSchema]).optional(),
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
    handler as OptionalValidatedApiHandler<AidRegistryValidated>
  )
)(mainHandler);
