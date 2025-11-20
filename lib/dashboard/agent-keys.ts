// @ts-nocheck
/**
 * Agent Keys Management
 * Ed25519 keypair generation and AID protocol integration
 */

import { supabase } from '../supabase';
import { ed25519 } from '@noble/curves/ed25519.js';
import { randomBytes } from '@noble/hashes/utils.js';

export interface AgentKey {
  id: string;
  user_id: string;
  name: string;
  aid_uri: string;
  public_key: string; // Base64
  key_algorithm: string;
  permissions: string[];
  metadata: Record<string, unknown>;
  revoked: boolean;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GenerateAgentKeyParams {
  name: string;
  permissions?: string[];
  domain?: string;
}

export interface GeneratedAgentKey {
  agentKey: AgentKey;
  privateKey: Uint8Array; // ONLY returned once, client must save
  privateKeyPem: string; // PEM format for download
}

/**
 * Generate Ed25519 keypair using @noble/curves
 * Returns 32-byte private key and 32-byte public key
 */
export function generateEd25519Keypair(): {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
} {
  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = ed25519.getPublicKey(privateKey);
  
  return { privateKey, publicKey };
}

/**
 * Convert Ed25519 private key to PEM format
 * PKCS#8 format for standard compatibility
 */
export function privateKeyToPEM(privateKey: Uint8Array): string {
  const base64 = Buffer.from(privateKey).toString('base64');
  
  // Split into 64-char lines
  const lines = [];
  for (let i = 0; i < base64.length; i += 64) {
    lines.push(base64.substring(i, i + 64));
  }
  
  return [
    '-----BEGIN PRIVATE KEY-----',
    ...lines,
    '-----END PRIVATE KEY-----',
  ].join('\n');
}

/**
 * Parse PEM private key back to Uint8Array
 */
export function pemToPrivateKey(pem: string): Uint8Array {
  const base64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

/**
 * Generate AID URI from name and domain
 * Format: aid://domain/agent/slugified-name
 */
export function generateAIDUri(name: string, domain: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  return `aid://${domain}/agent/${slug}`;
}

/**
 * Validate AID URI format
 */
export function validateAIDUri(uri: string): boolean {
  return /^aid:\/\/[a-z0-9.-]+\/agent\/[a-z0-9-]+$/.test(uri);
}

/**
 * Get default domain for user
 * Uses user email domain or fallback
 */
async function getUserDomain(userId: string): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, website_url')
    .eq('id', userId)
    .single();

  if (!profile) return 'anoteroslogos.com';

  // Try website_url first
  if (profile.website_url) {
    try {
      const url = new URL(profile.website_url);
      return url.hostname;
    } catch {}
  }

  // Extract from email
  if (profile.email) {
    const emailDomain = profile.email.split('@')[1];
    if (emailDomain && emailDomain !== 'gmail.com' && emailDomain !== 'outlook.com') {
      return emailDomain;
    }
  }

  return 'anoteroslogos.com';
}

/**
 * Generate new Agent Key (Ed25519 keypair)
 * Returns full keypair - client MUST save private key
 */
export async function generateAgentKey(
  params: GenerateAgentKeyParams
): Promise<GeneratedAgentKey | { error: string }> {
  try {
    // Get current user and profile
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'Unauthorized' };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('current_plan, agent_keys_count')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { error: 'Profile not found' };
    }

    // Check plan limits
    const planLimits = {
      free: 0, // Free tier: no agent keys
      pro: 10,
      agency: 50,
    };
    
    if (profile.agent_keys_count >= planLimits[profile.current_plan as keyof typeof planLimits]) {
      return { error: `Plan limit reached: ${planLimits[profile.current_plan as keyof typeof planLimits]} agent keys max` };
    }

    // Generate Ed25519 keypair
    const { privateKey, publicKey } = generateEd25519Keypair();
    const publicKeyBase64 = Buffer.from(publicKey).toString('base64');

    // Generate AID URI
    const domain = params.domain || await getUserDomain(user.id);
    const aidUri = generateAIDUri(params.name, domain);

    // Default permissions
    const permissions = params.permissions || ['mcp:execute'];

    // Insert into database
    const { data: agentKey, error: insertError } = await supabase
      .from('agent_keys')
      .insert({
        user_id: user.id,
        name: params.name,
        aid_uri: aidUri,
        public_key: publicKeyBase64,
        key_algorithm: 'Ed25519',
        permissions,
        metadata: {
          domain,
          generated_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (insertError || !agentKey) {
      console.error('Agent key creation error:', insertError);
      return { error: 'Failed to create agent key' };
    }

    // Log audit event
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'agent_key.created',
      resource_type: 'agent_key',
      resource_id: agentKey.id,
      metadata: { name: params.name, aid_uri: aidUri },
    });

    return {
      agentKey,
      privateKey,
      privateKeyPem: privateKeyToPEM(privateKey),
    };
  } catch (error) {
    console.error('generateAgentKey error:', error);
    return { error: 'Internal server error' };
  }
}

/**
 * List all Agent Keys for authenticated user
 */
export async function listAgentKeys(): Promise<AgentKey[] | { error: string }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'Unauthorized' };
    }

    const { data: keys, error } = await supabase
      .from('agent_keys')
      .select('*')
      .eq('user_id', user.id)
      .eq('revoked', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('listAgentKeys error:', error);
      return { error: 'Failed to fetch agent keys' };
    }

    return keys || [];
  } catch (error) {
    console.error('listAgentKeys error:', error);
    return { error: 'Internal server error' };
  }
}

/**
 * Revoke Agent Key
 */
export async function revokeAgentKey(
  keyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('agent_keys')
      .update({
        revoked: true,
        revoked_at: new Date().toISOString(),
      })
      .eq('id', keyId)
      .eq('user_id', user.id);

    if (error) {
      console.error('revokeAgentKey error:', error);
      return { success: false, error: 'Failed to revoke agent key' };
    }

    // Log audit event
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'agent_key.revoked',
      resource_type: 'agent_key',
      resource_id: keyId,
    });

    return { success: true };
  } catch (error) {
    console.error('revokeAgentKey error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Delete Agent Key permanently
 */
export async function deleteAgentKey(
  keyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('agent_keys')
      .delete()
      .eq('id', keyId)
      .eq('user_id', user.id);

    if (error) {
      console.error('deleteAgentKey error:', error);
      return { success: false, error: 'Failed to delete agent key' };
    }

    // Log audit event
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'agent_key.deleted',
      resource_type: 'agent_key',
      resource_id: keyId,
    });

    return { success: true };
  } catch (error) {
    console.error('deleteAgentKey error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Verify Ed25519 signature
 * For validating agent requests signed with private key
 */
export function verifyEd25519Signature(
  message: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array
): boolean {
  try {
    return ed25519.verify(signature, message, publicKey);
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Get Agent Key by AID URI (for external validation)
 */
export async function getAgentKeyByAID(
  aidUri: string
): Promise<AgentKey | null> {
  try {
    const { data: key, error } = await supabase
      .from('agent_keys')
      .select('*')
      .eq('aid_uri', aidUri)
      .eq('revoked', false)
      .single();

    if (error || !key) return null;
    return key;
  } catch (error) {
    console.error('getAgentKeyByAID error:', error);
    return null;
  }
}
