/**
 * GDPR Art. 15 - Data Subject Access Request (DSAR) Endpoint
 * Exports all user data + audit trail with Ed25519 signature
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, format = 'json' } = req.query;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email parameter required' });
  }

  try {
    // Fetch user by email
    const { data: user } = await supabase.auth.admin.listUsers();
    const targetUser = user?.users.find(u => u.email === email);

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch all user data
    const [profile, apiKeys, agentKeys, audits, knowledgeGraphs, auditTrail] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', targetUser.id).single(),
      supabase.from('api_keys').select('*').eq('user_id', targetUser.id),
      supabase.from('agent_keys').select('*').eq('user_id', targetUser.id),
      supabase.from('audits').select('*').eq('user_id', targetUser.id),
      supabase.from('knowledge_graphs').select('*').eq('user_id', targetUser.id),
      supabase.from('audit_trail').select('*').eq('actor_id', targetUser.id).order('timestamp', { ascending: false })
    ]);

    const dsarData = {
      subject: email,
      user_id: targetUser.id,
      data: {
        profile: profile.data,
        api_keys: apiKeys.data?.map(k => ({ ...k, key_hash: '[REDACTED]' })),
        agent_keys: agentKeys.data,
        audits: audits.data,
        knowledge_graphs: knowledgeGraphs.data,
        audit_trail: auditTrail.data
      },
      generated_at: new Date().toISOString(),
      // TODO: Sign with Ed25519
      signature: null
    };

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="dsar_${email}_${Date.now()}.json"`);
      return res.status(200).json(dsarData);
    } else {
      // CSV format
      return res.status(501).json({ error: 'CSV format not yet implemented' });
    }
  } catch (error: any) {
    console.error('DSAR error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
