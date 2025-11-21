/**
 * Unified API Keys Handler
 * Handles all /api/keys endpoints: create, list, revoke
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createAPIKey, listAPIKeys, revokeAPIKey } from '../lib/dashboard/api-keys';


/**
 * Unified handler for /api/keys/* endpoints
 * Routes based on URL path and method
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const { method } = req;
    const path = req.url?.split('?')[0] || '';

    // GET /api/keys - list all keys
    if (method === 'GET' && path === '/api/keys') {
      const keys = await listAPIKeys();
      if ('error' in keys) {
        return res.status(500).json({ error: keys.error });
      }
      return res.status(200).json({ keys });
    }

    // POST /api/keys/create - create new key
    if (method === 'POST' && path === '/api/keys/create') {
      const { name, scoped_tools, expires_in_days } = req.body as {
        name?: string;
        scoped_tools?: string[];
        expires_in_days?: number;
      };

      if (!name || name.length < 3) {
        return res.status(400).json({ error: 'Name must be at least 3 characters' });
      }

      const result = await createAPIKey({ name, scoped_tools, expires_in_days });

      if ('error' in result) {
        return res.status(400).json({ error: result.error });
      }

      return res.status(201).json(result);
    }

    // POST /api/keys/revoke - revoke key
    if (method === 'POST' && path === '/api/keys/revoke') {
      const { keyId, reason } = req.body as { keyId?: string; reason?: string };

      if (!keyId) {
        return res.status(400).json({ error: 'Missing keyId' });
      }

      const result = await revokeAPIKey(keyId, reason || undefined);

      if ('error' in result) {
        return res.status(400).json({ error: result.error });
      }

      return res.status(200).json({ success: true });
    }

    // Fallback
    return res.status(404).json({ error: 'Endpoint not found' });

  } catch (error) {
    console.error('API keys handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
