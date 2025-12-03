/**
 * API Keys CRUD Endpoint
 * Complete REST API for API key management
 * 
 * GET /api/api-keys - List all API keys
 * POST /api/api-keys - Create new API key
 * GET /api/api-keys/[id] - Get specific API key
 * PUT /api/api-keys/[id] - Update API key
 * DELETE /api/api-keys/[id] - Delete API key
 * 
 * **Validates: Requirements 6.3**
 * **Property 25: Complete CRUD Operations**
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  createAPIKey, 
  listAPIKeys, 
  revokeAPIKey, 
  deleteAPIKey 
} from '../lib/dashboard/api-keys';
import { supabase } from '../lib/supabase';
import { withCors, withRateLimit, withValidation, compose } from '../lib/validation/middleware';
import { z } from 'zod';

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const CreateAPIKeySchema = z.object({
  name: z.string().min(1).max(100),
  scoped_tools: z.array(z.string()).optional().nullable(),
  expires_in_days: z.number().int().positive().max(365).optional().nullable(),
});

const UpdateAPIKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  scoped_tools: z.array(z.string()).optional().nullable(),
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
 * GET /api/api-keys - List all API keys
 * GET /api/api-keys?id=xxx - Get specific API key
 */
async function handleGet(req: VercelRequest, res: VercelResponse) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const id = getIdFromQuery(req);

  // Get specific API key
  if (id) {
    const { data: key, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !key) {
      return res.status(404).json({ error: 'API key not found' });
    }

    return res.status(200).json(key);
  }

  // Parse pagination parameters
  const { limit, offset } = req.query;
  const limitNum = typeof limit === 'string' ? Math.min(parseInt(limit, 10), 100) : 50;
  const offsetNum = typeof offset === 'string' ? parseInt(offset, 10) : 0;

  // List all API keys with pagination
  const { data: keys, error, count } = await supabase
    .from('api_keys')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offsetNum, offsetNum + limitNum - 1);

  if (error) {
    return res.status(500).json({ error: 'Failed to fetch API keys' });
  }

  return res.status(200).json({
    keys: keys || [],
    pagination: {
      total: count || 0,
      limit: limitNum,
      offset: offsetNum,
      has_more: (count || 0) > offsetNum + limitNum,
    },
  });
}

/**
 * POST /api/api-keys - Create new API key
 */
async function handlePost(
  req: VercelRequest,
  res: VercelResponse,
  validated: { body: z.infer<typeof CreateAPIKeySchema> }
) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const result = await createAPIKey(validated.body);

  if ('error' in result) {
    return res.status(400).json({ error: result.error });
  }

  return res.status(201).json(result);
}

/**
 * PUT /api/api-keys?id=xxx - Update API key
 */
async function handlePut(
  req: VercelRequest,
  res: VercelResponse,
  validated: { body: z.infer<typeof UpdateAPIKeySchema> }
) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const id = getIdFromQuery(req);
  if (!id) {
    return res.status(400).json({ error: 'Missing API key ID' });
  }

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from('api_keys')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !existing) {
    return res.status(404).json({ error: 'API key not found' });
  }

  // Update API key
  const { data: updated, error: updateError } = await supabase
    .from('api_keys')
    .update({
      ...validated.body,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (updateError || !updated) {
    return res.status(500).json({ error: 'Failed to update API key' });
  }

  // Log audit event
  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: 'api_key.updated',
    resource_type: 'api_key',
    resource_id: id,
    metadata: validated.body,
  });

  return res.status(200).json(updated);
}

/**
 * DELETE /api/api-keys?id=xxx - Delete API key
 */
async function handleDelete(req: VercelRequest, res: VercelResponse) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const id = getIdFromQuery(req);
  if (!id) {
    return res.status(400).json({ error: 'Missing API key ID' });
  }

  const result = await deleteAPIKey(id);

  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }

  return res.status(204).send('');
}

// =====================================================
// MAIN HANDLER
// =====================================================

import type { ApiKeyValidated, OptionalValidatedApiHandler } from '../types/api.types';

async function mainHandler(
  req: VercelRequest,
  res: VercelResponse,
  validated?: ApiKeyValidated
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
      bodySchema: z.union([CreateAPIKeySchema, UpdateAPIKeySchema]).optional(),
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
    handler as OptionalValidatedApiHandler<ApiKeyValidated>
  )
)(mainHandler);
