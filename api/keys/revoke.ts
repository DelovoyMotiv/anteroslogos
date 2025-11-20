import type { VercelRequest, VercelResponse } from '@vercel/node';
import { revokeAPIKey } from '../../lib/dashboard/api-keys';
import { supabase } from '../../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { keyId, reason } = req.body as { keyId?: string; reason?: string };

    if (!keyId) {
      return res.status(400).json({ error: 'Missing keyId' });
    }

    const result = await revokeAPIKey(keyId, reason);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Revoke API key error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
