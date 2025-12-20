/**
 * AIP Registry CRUD Endpoint
 * Complete REST API for Anóteros Identity Protocol (AIP) registry management
 * 
 * GET /api/aip-registry - List registered AIPs
 * POST /api/aip-registry - Register new AIP
 * GET /api/aip-registry/[id] - Get specific AIP
 * PUT /api/aip-registry/[id] - Update AIP
 * DELETE /api/aip-registry/[id] - Revoke AIP
 * 
 * **Validates: Requirements 6.3**
 * **Property 25: Complete CRUD Operations**
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase';
import { AIPRegistry } from '../lib/tenancy/aipRegistry';
import { withCors, withRateLimit, withValidation, compose } from '../lib/validation/middleware';
import { z } from 'zod';

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const RegisterAIPSchema = z.object({
  agentName: z.string().min(1).max(100),
  aipUri: z.string().regex(/^aip:\/\/.+/),
  publicKeyEd25519: z.string().regex(/^[A-Za-z0-9+/]+=*$/), // Base64
  agentDescription: z.string().max(500).optional(),
  endpoint: z.string().url().optional(),
  capabilities: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const UpdateAIPSchema = z.object({
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
 * GET /api/aip-registry - List registered AIPs
 * GET /api/aip-registry?id=xxx - Get specific AIP
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
  // const registry = new AIPRegistry(supabase);
  const id = getIdFromQuery(req);

  // Get specific AIP
  if (id) {
    const { data: aip, error } = await supabase
      .from('aip_registry')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !aip) {
      return res.status(404).json({ error: 'AIP not found' });
    }

    return res.status(200).json(aip);
  }

  // Parse pagination parameters
  const { limit, offset } = req.query;
  const limitNum = typeof limit === 'string' ? Math.min(parseInt(limit, 10), 100) : 50;
  const offsetNum = typeof offset === 'string' ? parseInt(offset, 10) : 0;

  // List AIPs for tenant with pagination
  const query = supabase
    .from('aip_registry')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(offsetNum, offsetNum + limitNum - 1);

  const { data: aips, error, count } = await query;

  if (error) {
    return res.status(500).json({ error: 'Failed to fetch AIPs' });
  }

  return res.status(200).json({
    aips: aips || [],
    pagination: {
      total: count || 0,
      limit: limitNum,
      offset: offsetNum,
      has_more: (count || 0) > offsetNum + limitNum,
    },
  });
}

/**
 * POST /api/aip-registry - Register new AIP
 */
async function handlePost(
  req: VercelRequest,
  res: VercelResponse,
  validated: { body: z.infer<typeof RegisterAIPSchema> }
) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const tenantId = await getCurrentTenantId(user.id);
  if (!tenantId) {
    return res.status(400).json({ error: 'No tenant context found' });
  }

  const registry = new AIPRegistry(supabase);

  // Register AIP
  const result = await registry.registerAgent(validated.body);

  if ('error' in result) {
    return res.status(400).json({ error: result.error });
  }

  // Log audit event
  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: 'aip.registered',
    resource_type: 'aip_registry',
    resource_id: result.id,
    metadata: { aip_uri: validated.body.aipUri },
  });

  return res.status(201).json(result);
}

/**
 * PUT /api/aip-registry?id=xxx - Update AIP
 */
async function handlePut(
  req: VercelRequest,
  res: VercelResponse,
  validated: { body: z.infer<typeof UpdateAIPSchema> }
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
    return res.status(400).json({ error: 'Missing AIP ID' });
  }

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from('aip_registry')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !existing) {
    return res.status(404).json({ error: 'AIP not found' });
  }

  // Update AIP
  const { data: updated, error: updateError } = await supabase
    .from('aip_registry')
    .update({
      ...validated.body,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (updateError || !updated) {
    return res.status(500).json({ error: 'Failed to update AIP' });
  }

  // Log audit event
  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: 'aip.updated',
    resource_type: 'aip_registry',
    resource_id: id,
    metadata: validated.body,
  });

  return res.status(200).json(updated);
}

/**
 * DELETE /api/aip-registry?id=xxx - Revoke AIP
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
    return res.status(400).json({ error: 'Missing AIP ID' });
  }

  // Get AIP URI for revocation
  const { data: aip, error: fetchError } = await supabase
    .from('aip_registry')
    .select('aip_uri')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !aip) {
    return res.status(404).json({ error: 'AIP not found' });
  }

  const registry = new AIPRegistry(supabase);

  // Revoke AIP
  const result = await registry.revokeAgent(aip.aip_uri);

  if ('error' in result) {
    return res.status(500).json({ error: result.error });
  }

  // Log audit event
  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: 'aip.revoked',
    resource_type: 'aip_registry',
    resource_id: id,
    metadata: { aip_uri: aip.aip_uri },
  });

  return res.status(200).json({ success: true, message: 'AIP revoked successfully' });
}

// =====================================================
// MAIN HANDLER
// =====================================================

import type { AipRegistryValidated, OptionalValidatedApiHandler } from '../types/api.types';

async function mainHandler(
  req: VercelRequest,
  res: VercelResponse,
  validated?: AipRegistryValidated
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
      bodySchema: z.union([RegisterAIPSchema, UpdateAIPSchema]).optional(),
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
    handler as OptionalValidatedApiHandler<AipRegistryValidated>
  )
)(mainHandler);
