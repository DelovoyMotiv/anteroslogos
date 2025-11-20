import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateAgentKey } from '../../lib/dashboard/agent-keys';
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
  } catch (error) {
    console.error('Generate agent key error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
