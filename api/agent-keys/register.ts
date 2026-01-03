/**
 * Agent Key Registration Endpoint
 * Generates Ed25519 keypair for agent authentication
 * 
 * POST /api/agent-keys/register
 * Body: { agentName: string, domain: string }
 * Returns: { agent_key: AgentKey, private_key_pem: string }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { generateKeyPairSync } from 'crypto';

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

/**
 * Generate Ed25519 keypair
 */
function generateEd25519Keypair(): { publicKey: string; privateKeyPem: string } {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  
  // Extract base64 public key from PEM
  const publicKeyBase64 = publicKey
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\n/g, '')
    .trim();
  
  return {
    publicKey: publicKeyBase64,
    privateKeyPem: privateKey,
  };
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

    const { agentName, domain } = req.body;

    if (!agentName || agentName.length < 3) {
      return res.status(400).json({ error: 'Agent name must be at least 3 characters' });
    }

    if (!domain || domain.length < 5) {
      return res.status(400).json({ error: 'Domain must be valid' });
    }

    // Validate agent name format (lowercase, alphanumeric, hyphens)
    if (!/^[a-z0-9-]+$/.test(agentName)) {
      return res.status(400).json({ error: 'Agent name must be lowercase alphanumeric with hyphens only' });
    }

    // Generate AIP URI
    const aipUri = `aip://${domain}/agent/${agentName}`;

    // Check if AIP URI already exists
    const { data: existing } = await supabase
      .from('agent_keys')
      .select('id')
      .eq('aip_uri', aipUri)
      .eq('revoked', false)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Agent with this AIP URI already exists' });
    }

    // Generate Ed25519 keypair
    const { publicKey, privateKeyPem } = generateEd25519Keypair();

    // Insert into database
    const { data: agentKey, error: insertError } = await supabase
      .from('agent_keys')
      .insert({
        user_id: user.id,
        name: agentName,
        aip_uri: aipUri,
        public_key: publicKey,
        key_algorithm: 'Ed25519',
        permissions: ['mcp:execute'],
        metadata: { domain },
      })
      .select()
      .single();

    if (insertError || !agentKey) {
      console.error('[Agent Keys] Insert error:', insertError);
      return res.status(500).json({ error: 'Failed to create agent key' });
    }

    // Log audit event
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'agent_key.created',
      resource_type: 'agent_key',
      resource_id: agentKey.id,
      metadata: { name: agentName, domain, aip_uri: aipUri },
    });

    return res.status(201).json({
      agent_key: agentKey,
      private_key_pem: privateKeyPem,
    });
  } catch (error) {
    console.error('[Agent Keys] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
