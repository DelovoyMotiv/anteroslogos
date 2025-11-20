/**
 * Create API Key
 * Vercel Edge Function
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createAPIKey } from '../../lib/dashboard/api-keys';
import { supabase } from '../../lib/supabase';

/**
 * POST /api/keys/create
 * Body: { name: string, scoped_tools?: string[], expires_in_days?: number }
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Auth
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Parse body
    const { name, scoped_tools, expires_in_days } = req.body as {
      name?: string;
      scoped_tools?: string[];
      expires_in_days?: number;
    };

    if (!name || name.length < 3) {
      return res.status(400).json({ error: 'Name must be at least 3 characters' });
    }

    // Create key
    const result = await createAPIKey({
      name,
      scoped_tools,
      expires_in_days,
    });

    if ('error' in result) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(201).json(result);
  } catch (error) {
    console.error('Create API key error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
