import type { VercelRequest, VercelResponse } from '@vercel/node';
import { listAgentKeys } from '../../lib/dashboard/agent-keys';
import { supabase } from '../../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
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

    const result = await listAgentKeys();

    if ('error' in result) {
      return res.status(500).json({ error: result.error });
    }

    return res.status(200).json({ keys: result });
  } catch (error) {
    console.error('List agent keys error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
