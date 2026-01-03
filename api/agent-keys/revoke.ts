/**
 * Agent Key Revocation Endpoint
 * Revokes an existing agent key
 * 
 * POST /api/agent-keys/revoke
 * Body: { keyId: string }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Create Supabase client (self-contained for Vercel)
 */
function getSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    },
  });
}

/**
 * Get authenticated user from request
 */
async function getAuthenticatedUser(req: VercelRequest, supabase: SupabaseClient) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) return null;
  return user;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(503).json({ error: 'Service unavailable' });
    }

    const user = await getAuthenticatedUser(req, supabase);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { keyId } = req.body;

    if (!keyId) {
      return res.status(400).json({ error: 'Missing keyId' });
    }

    // Verify ownership and revoke
    const { data: updated, error: updateError } = await supabase
      .from('agent_keys')
      .update({
        revoked: true,
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', keyId)
      .eq('user_id', user.id)
      .eq('revoked', false)
      .select()
      .single();

    if (updateError || !updated) {
      return res.status(404).json({ error: 'Agent key not found or already revoked' });
    }

    // Log audit event
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'agent_key.revoked',
      resource_type: 'agent_key',
      resource_id: keyId,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Agent Keys] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
