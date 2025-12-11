/**
 * Tenants CRUD Endpoint
 * Complete REST API for tenant management
 * 
 * GET /api/tenants - List user's tenants
 * POST /api/tenants - Create new tenant
 * GET /api/tenants/[id] - Get specific tenant
 * PUT /api/tenants/[id] - Update tenant
 * DELETE /api/tenants/[id] - Delete tenant
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

const CreateTenantSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  settings: z.record(z.unknown()).optional(),
});

const UpdateTenantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  settings: z.record(z.unknown()).optional(),
  status: z.enum(['active', 'suspended', 'deleted']).optional(),
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get authenticated user from request
 */
async function getAuthenticatedUser(req: VercelRequest) {
  if (!supabase) {
    return null;
  }

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
 * Check if user has access to tenant
 */
async function checkTenantAccess(userId: string, tenantId: string): Promise<boolean> {
  if (!supabase) return false;

  const { data, error } = await supabase
    .from('tenant_members')
    .select('role')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .maybeSingle();

  return !error && !!data;
}

/**
 * Check if user is tenant owner
 */
async function isTenantOwner(userId: string, tenantId: string): Promise<boolean> {
  if (!supabase) return false;

  const { data, error } = await supabase
    .from('tenants')
    .select('owner_id')
    .eq('id', tenantId)
    .single();

  return !error && data?.owner_id === userId;
}

// =====================================================
// CRUD HANDLERS
// =====================================================

/**
 * GET /api/tenants - List user's tenants
 * GET /api/tenants?id=xxx - Get specific tenant
 */
async function handleGet(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  if (!supabase) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const id = getIdFromQuery(req);

  // Get specific tenant
  if (id) {
    // Check access
    const hasAccess = await checkTenantAccess(user.id, id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select(`
        *,
        tenant_members!inner (
          user_id,
          role,
          status
        )
      `)
      .eq('id', id)
      .single();

    if (error || !tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    return res.status(200).json(tenant);
  }

  // Parse pagination parameters
  const { limit, offset } = req.query;
  const limitNum = typeof limit === 'string' ? Math.min(parseInt(limit, 10), 100) : 50;
  const offsetNum = typeof offset === 'string' ? parseInt(offset, 10) : 0;

  // List all tenants user has access to with pagination
  const query = supabase
    .from('tenant_members')
    .select(`
      tenant_id,
      role,
      status,
      tenants (
        id,
        name,
        slug,
        description,
        owner_id,
        settings,
        status,
        created_at,
        updated_at
      )
    `, { count: 'exact' })
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range(offsetNum, offsetNum + limitNum - 1);

  const { data: memberships, error: memberError, count } = await query;

  if (memberError) {
    return res.status(500).json({ error: 'Failed to fetch tenants' });
  }

  const tenants = memberships?.map((m: any) => ({
    ...(m.tenants || {}),
    user_role: m.role,
  })) || [];

  return res.status(200).json({
    tenants,
    pagination: {
      total: count || 0,
      limit: limitNum,
      offset: offsetNum,
      has_more: (count || 0) > offsetNum + limitNum,
    },
  });
}

/**
 * POST /api/tenants - Create new tenant
 */
async function handlePost(
  req: VercelRequest,
  res: VercelResponse,
  validated?: TenantValidated
): Promise<VercelResponse> {
  if (!supabase) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const body = validated?.body as TenantCreateRequest | undefined;
  if (!body) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check if slug is already taken
  const { data: existing } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', (body as any).slug)
    .maybeSingle();

  if (existing) {
    return res.status(400).json({ error: 'Tenant slug already taken' });
  }

  // Create tenant
  const { data: tenant, error: createError } = await supabase
    .from('tenants')
    .insert({
      owner_id: user.id,
      name: (body as any).name,
      slug: (body as any).slug,
      description: (body as any).description || null,
      settings: (body as any).settings || {},
      status: 'active',
    } as any)
    .select()
    .single();

  if (createError || !tenant) {
    return res.status(500).json({ error: 'Failed to create tenant' });
  }

  // Add owner as member with owner role
  const { error: memberError } = await supabase
    .from('tenant_members')
    .insert({
      tenant_id: tenant.id,
      user_id: user.id,
      role: 'owner',
      status: 'active',
    } as any);

  if (memberError) {
    // Rollback tenant creation
    await supabase.from('tenants').delete().eq('id', tenant.id);
    return res.status(500).json({ error: 'Failed to create tenant membership' });
  }

  // Log audit event
  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: 'tenant.created',
    resource_type: 'tenant',
    resource_id: tenant.id,
    metadata: { name: (body as any).name, slug: (body as any).slug },
  } as any);

  return res.status(201).json(tenant);
}

/**
 * PUT /api/tenants?id=xxx - Update tenant
 */
async function handlePut(
  req: VercelRequest,
  res: VercelResponse,
  validated?: TenantValidated
): Promise<VercelResponse> {
  if (!supabase) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const body = validated?.body as TenantUpdateRequest | undefined;
  if (!body) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const id = getIdFromQuery(req);
  if (!id) {
    return res.status(400).json({ error: 'Missing tenant ID' });
  }

  // Check if user is owner (only owners can update tenants)
  const isOwner = await isTenantOwner(user.id, id);
  if (!isOwner) {
    return res.status(403).json({ error: 'Only tenant owners can update tenant settings' });
  }

  // Update tenant
  const { data: updated, error: updateError } = await supabase
    .from('tenants')
    .update({
      ...body,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', id)
    .select()
    .single();

  if (updateError || !updated) {
    return res.status(500).json({ error: 'Failed to update tenant' });
  }

  // Log audit event
  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: 'tenant.updated',
    resource_type: 'tenant',
    resource_id: id,
    metadata: body,
  } as any);

  return res.status(200).json(updated);
}

/**
 * DELETE /api/tenants?id=xxx - Delete tenant
 */
async function handleDelete(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  if (!supabase) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const id = getIdFromQuery(req);
  if (!id) {
    return res.status(400).json({ error: 'Missing tenant ID' });
  }

  // Check if user is owner (only owners can delete tenants)
  const isOwner = await isTenantOwner(user.id, id);
  if (!isOwner) {
    return res.status(403).json({ error: 'Only tenant owners can delete tenants' });
  }

  // Soft delete - set status to deleted
  const { data: deleted, error: deleteError } = await supabase
    .from('tenants')
    .update({
      status: 'deleted',
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', id)
    .select()
    .single();

  if (deleteError || !deleted) {
    return res.status(500).json({ error: 'Failed to delete tenant' });
  }

  // Log audit event
  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: 'tenant.deleted',
    resource_type: 'tenant',
    resource_id: id,
  } as any);

  return res.status(200).json(deleted);
}

// =====================================================
// MAIN HANDLER
// =====================================================

import type { 
  TenantValidated, 
  TenantCreateRequest,
  TenantUpdateRequest 
} from '../types/api.types';

async function mainHandler(
  req: VercelRequest,
  res: VercelResponse,
  validated?: TenantValidated
): Promise<VercelResponse> {
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
  (handler) => withRateLimit(handler, { limit: 60, window: 60000 }),
  (handler) => withValidation(
    {
      bodySchema: z.union([CreateTenantSchema, UpdateTenantSchema]).optional(),
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
    handler as any
  )
)(mainHandler as any);
