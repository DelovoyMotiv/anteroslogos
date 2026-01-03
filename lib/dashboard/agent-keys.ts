/**
 * Agent Keys Management
 * Ed25519 keypair generation and AID protocol integration with tenant isolation
 */

import { supabase } from '../supabase';
import { ed25519 } from '@noble/curves/ed25519.js';
import { registerAgent } from '../tenancy/aidRegistry';
import { getCurrentTenantIdOrNull } from '../tenancy/context';
import { AgentKeyFromDbSchema, AgentKeySchema, type AgentKey } from './schemas';
import { selectQuery, selectSingle, insertSingle, insertQuery, updateQuery, deleteQuery } from '../database/queryHelpers';

export interface GenerateAgentKeyParams {
  name: string;
  agentDescription?: string;
  endpoint?: string;
  capabilities?: string[];
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
  // Generate random 32-byte private key
  const privateKey = crypto.getRandomValues(new Uint8Array(32));
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
    } catch {
      // Invalid URL, continue to email extraction
    }
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

    // Get tenant ID from context
    const tenantId = getCurrentTenantIdOrNull();
    if (!tenantId) {
      return { error: 'Tenant context required for agent key creation' };
    }

    // Generate Ed25519 keypair
    const { privateKey, publicKey } = generateEd25519Keypair();
    const publicKeyBase64 = Buffer.from(publicKey).toString('base64');

    // Generate AID URI
    const domain = params.domain || await getUserDomain(user.id);
    const aidUri = generateAIDUri(params.name, domain);

    // Validate AID URI format
    if (!validateAIDUri(aidUri)) {
      return { error: 'Invalid AID URI format generated' };
    }

    // Default permissions
    const permissions = params.permissions || ['mcp:execute'];

    // Register agent in AID registry (tenant-scoped)
    const registryResult = await registerAgent({
      agentName: params.name,
      aidUri,
      publicKeyEd25519: publicKeyBase64,
      agentDescription: params.agentDescription,
      endpoint: params.endpoint,
      capabilities: params.capabilities,
      permissions,
      metadata: {
        domain,
        generated_at: new Date().toISOString(),
        user_id: user.id,
      },
    });

    if ('error' in registryResult) {
      return { error: `AID registration failed: ${registryResult.error}` };
    }

    // Insert into agent_keys table with aid_registry_id link
    const { data: agentKey, error: insertError } = await insertSingle(
      supabase,
      'agent_keys',
      {
        user_id: user.id,
        tenant_id: tenantId,
        name: params.name,
        aip_uri: aidUri, // Database column is aip_uri
        public_key: publicKeyBase64,
        key_algorithm: 'Ed25519',
        permissions,
        revoked: false,
        metadata: {
          domain,
          generated_at: new Date().toISOString(),
          aid_registry_id: registryResult.id,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      AgentKeyFromDbSchema
    );

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
 * List all Agent Keys for authenticated user in current tenant
 * Tenant isolation via RLS policies
 */
export async function listAgentKeys(): Promise<AgentKey[] | { error: string }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'Unauthorized' };
    }

    const tenantId = getCurrentTenantIdOrNull();
    if (!tenantId) {
      return { error: 'Tenant context required' };
    }

    // RLS policies will automatically filter by tenant_id
    const { data: keys, error } = await selectQuery(
      supabase,
      'agent_keys',
      AgentKeyFromDbSchema,
      {
        user_id: user.id,
        tenant_id: tenantId,
        revoked: false,
      }
    );

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

    const { data, error } = await updateQuery(
      supabase,
      'agent_keys',
      {
        revoked: true,
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: keyId,
        user_id: user.id,
      },
      AgentKeyFromDbSchema
    );

    if (error || !data || data.length === 0) {
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

    const { data, error } = await deleteQuery(
      supabase,
      'agent_keys',
      {
        id: keyId,
        user_id: user.id,
      }
    );

    if (error || !data) {
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
 * Respects tenant isolation - only returns keys from:
 * 1. Current tenant
 * 2. Verified federated tenants (via AID registry)
 */
export async function getAgentKeyByAID(
  aidUri: string
): Promise<AgentKey | null> {
  try {
    // Validate AID URI format first
    if (!validateAIDUri(aidUri)) {
      return null;
    }

    // Query with RLS - will respect tenant isolation
    // Note: database column is aip_uri, not aid_uri
    const { data: keys, error } = await selectQuery(
      supabase,
      'agent_keys',
      AgentKeyFromDbSchema,
      {
        aip_uri: aidUri, // Database column name
        revoked: false,
      }
    );

    if (error || !keys || keys.length === 0) {
      return null;
    }

    const key = keys[0];

    // Additional validation: check AID registry for verification status
    const currentTenantId = getCurrentTenantIdOrNull();
    if (currentTenantId && key.tenant_id !== currentTenantId) {
      // Cross-tenant access - must verify via AID registry
      const { data: registry } = await supabase
        .from('aid_registry')
        .select('verified, status')
        .eq('aid_uri', aidUri)
        .eq('status', 'active')
        .maybeSingle();

      if (!registry || !registry.verified) {
        // Not verified - deny access
        return null;
      }
    }

    return key;
  } catch (error) {
    console.error('getAgentKeyByAID error:', error);
    return null;
  }
}
