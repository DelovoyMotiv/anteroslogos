/**
 * Unified Agent Keys Handler
 * Handles all /api/agent-keys endpoints: register, list, revoke
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateAgentKey, listAgentKeys, revokeAgentKey } from '../lib/dashboard/agent-keys';


/**
 * Unified handler for /api/agent-keys/* endpoints
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const { method } = req;
    const path = req.url?.split('?')[0] || '';

    // GET /api/agent-keys - list all agent keys
    if (method === 'GET' && path === '/api/agent-keys') {
      const keys = await listAgentKeys();
      if ('error' in keys) {
        return res.status(500).json({ error: keys.error });
      }
      return res.status(200).json({ keys });
    }

    // POST /api/agent-keys/register - generate new agent key
    if (method === 'POST' && path === '/api/agent-keys/register') {
      const { name, permissions, domain } = req.body as {
        name?: string;
        permissions?: string[];
        domain?: string;
      };

      if (!name || name.length < 3) {
        return res.status(400).json({ error: 'Name must be at least 3 characters' });
      }

      const result = await generateAgentKey({ name, permissions, domain });

      if ('error' in result) {
        return res.status(400).json({ error: result.error });
      }

      return res.status(201).json(result);
    }

    // POST /api/agent-keys/revoke - revoke agent key
    if (method === 'POST' && path === '/api/agent-keys/revoke') {
      const { keyId } = req.body as { keyId?: string };

      if (!keyId) {
        return res.status(400).json({ error: 'Missing keyId' });
      }

      const result = await revokeAgentKey(keyId);

      if ('error' in result) {
        return res.status(400).json({ error: result.error });
      }

      return res.status(200).json({ success: true });
    }

    // Fallback
    return res.status(404).json({ error: 'Endpoint not found' });

  } catch (error) {
    console.error('Agent keys handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
