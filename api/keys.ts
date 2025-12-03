/**
 * Unified Keys Management Endpoint
 * Handles both API keys and Agent keys to optimize Vercel function count
 * 
 * Routes:
 * - /api/keys?type=api - API key operations
 * - /api/keys?type=agent - Agent key operations
 * 
 * Methods: GET, POST, PUT, DELETE
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase';
import { 
  createAPIKey, 
  listAPIKeys, 
  deleteAPIKey 
} from '../lib/dashboard/api-keys';
import {
  generateAgentKey,
  listAgentKeys,
  deleteAgentKey,
} from '../lib/dashboard/agent-keys';

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
 * Main handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!supabase) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { type, id } = req.query;
  const keyType = typeof type === 'string' ? type : 'api';

  if (keyType !== 'api' && keyType !== 'agent') {
    return res.status(400).json({ error: 'Invalid key type. Must be "api" or "agent"' });
  }

  const tableName = keyType === 'api' ? 'api_keys' : 'agent_keys';

  try {
    switch (req.method) {
      case 'GET':
        if (id && typeof id === 'string') {
          // Get specific key
          const { data: key, error } = await supabase
            .from(tableName)
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

          if (error || !key) {
            return res.status(404).json({ error: `${keyType} key not found` });
          }

          return res.status(200).json(key);
        } else {
          // List keys with pagination
          const { limit, offset } = req.query;
          const limitNum = typeof limit === 'string' ? Math.min(parseInt(limit, 10), 100) : 50;
          const offsetNum = typeof offset === 'string' ? parseInt(offset, 10) : 0;

          const { data: keys, error, count } = await supabase
            .from(tableName)
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .range(offsetNum, offsetNum + limitNum - 1);

          if (error) {
            return res.status(500).json({ error: `Failed to fetch ${keyType} keys` });
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

      case 'POST':
        // Create new key
        if (keyType === 'api') {
          const result = await createAPIKey(req.body);
          if ('error' in result) {
            return res.status(400).json({ error: result.error });
          }
          return res.status(201).json(result);
        } else {
          const result = await generateAgentKey(req.body);
          if ('error' in result) {
            return res.status(400).json({ error: result.error });
          }
          return res.status(201).json(result);
        }

      case 'PUT':
        // Update key
        if (!id || typeof id !== 'string') {
          return res.status(400).json({ error: 'Missing key ID' });
        }

        // Verify ownership
        const { data: existing, error: fetchError } = await supabase
          .from(tableName)
          .select('id')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();

        if (fetchError || !existing) {
          return res.status(404).json({ error: `${keyType} key not found` });
        }

        // Update key
        const { data: updated, error: updateError } = await supabase
          .from(tableName)
          .update({
            ...req.body,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (updateError || !updated) {
          return res.status(500).json({ error: `Failed to update ${keyType} key` });
        }

        // Log audit event
        await supabase.from('audit_log').insert({
          user_id: user.id,
          action: `${keyType}_key.updated`,
          resource_type: `${keyType}_key`,
          resource_id: id,
          metadata: req.body,
        } as any);

        return res.status(200).json(updated);

      case 'DELETE':
        // Delete key
        if (!id || typeof id !== 'string') {
          return res.status(400).json({ error: 'Missing key ID' });
        }

        const deleteFunc = keyType === 'api' ? deleteAPIKey : deleteAgentKey;
        const result = await deleteFunc(id);

        if (!result.success) {
          return res.status(500).json({ error: result.error });
        }

        return res.status(204).end();

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error(`Error in keys endpoint:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
