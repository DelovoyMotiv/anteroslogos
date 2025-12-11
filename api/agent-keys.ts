/**
 * Agent Keys CRUD Endpoint
 * Complete REST API for agent key management
 * 
 * GET /api/agent-keys - List all agent keys
 * POST /api/agent-keys - Generate new agent key
 * GET /api/agent-keys/[id] - Get specific agent key
 * PUT /api/agent-keys/[id] - Update agent key
 * DELETE /api/agent-keys/[id] - Delete agent key
 * 
 * **Validates: Requirements 6.3**
 * **Property 25: Complete CRUD Operations**
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  generateAgentKey,
  deleteAgentKey,
} from '../lib/dashboard/agent-keys';
import { supabase } from '../lib/supabase';
import { withCors, withRateLimit, withValidation, compose } from '../lib/validation/middleware';
import { z } from 'zod';

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const GenerateAgentKeySchema = z.object({
  name: z.string().min(1).max(100),
  agentDescription: z.string().max(500).optional(),
  endpoint: z.string().url().optional(),
  capabilities: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  domain: z.string().optional(),
});

const UpdateAgentKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  permissions: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
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
 * GET /api/agent-keys - List all agent keys
 * GET /api/agent-keys?id=xxx - Get specific agent key
 */
async function handleGet(req: VercelRequest, res: VercelResponse) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const id = getIdFromQuery(req);

  // Get specific agent key
  if (id) {
    const { data: key, error } = await supabase
      .from('agent_keys')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !key) {
      return res.status(404).json({ error: 'Agent key not found' });
    }

    return res.status(200).json(key);
  }

  // Parse pagination parameters
  const { limit, offset } = req.query;
  const limitNum = typeof limit === 'string' ? Math.min(parseInt(limit, 10), 100) : 50;
  const offsetNum = typeof offset === 'string' ? parseInt(offset, 10) : 0;

  // List all agent keys with pagination
  const { data: keys, error, count } = await supabase
    .from('agent_keys')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offsetNum, offsetNum + limitNum - 1);

  if (error) {
    return res.status(500).json({ error: 'Failed to fetch agent keys' });
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
 * POST /api/agent-keys - Generate new agent key
 */
async function handlePost(
  req: VercelRequest,
  res: VercelResponse,
  validated: { body: z.infer<typeof GenerateAgentKeySchema> }
) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const result = await generateAgentKey(validated.body);

  if ('error' in result) {
    return res.status(400).json({ error: result.error });
  }

  return res.status(201).json(result);
}

/**
 * PUT /api/agent-keys?id=xxx - Update agent key
 */
async function handlePut(
  req: VercelRequest,
  res: VercelResponse,
  validated: { body: z.infer<typeof UpdateAgentKeySchema> }
) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const id = getIdFromQuery(req);
  if (!id) {
    return res.status(400).json({ error: 'Missing agent key ID' });
  }

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from('agent_keys')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !existing) {
    return res.status(404).json({ error: 'Agent key not found' });
  }

  // Update agent key
  const { data: updated, error: updateError } = await supabase
    .from('agent_keys')
    .update({
      ...validated.body,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (updateError || !updated) {
    return res.status(500).json({ error: 'Failed to update agent key' });
  }

  // Log audit event
  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: 'agent_key.updated',
    resource_type: 'agent_key',
    resource_id: id,
    metadata: validated.body,
  });

  return res.status(200).json(updated);
}

/**
 * DELETE /api/agent-keys?id=xxx - Delete agent key
 */
async function handleDelete(req: VercelRequest, res: VercelResponse) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const id = getIdFromQuery(req);
  if (!id) {
    return res.status(400).json({ error: 'Missing agent key ID' });
  }

  const result = await deleteAgentKey(id);

  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }

  return res.status(204).send('');
}

// =====================================================
// MAIN HANDLER
// =====================================================

import type { AgentKeyValidated, OptionalValidatedApiHandler } from '../types/api.types';

async function mainHandler(
  req: VercelRequest,
  res: VercelResponse,
  validated?: AgentKeyValidated
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
      bodySchema: z.union([GenerateAgentKeySchema, UpdateAgentKeySchema]).optional(),
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
    handler as OptionalValidatedApiHandler<AgentKeyValidated>
  )
)(mainHandler);
