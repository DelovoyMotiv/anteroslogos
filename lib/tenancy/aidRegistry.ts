/**
 * @file lib/tenancy/aidRegistry.ts
 * @description Tenant-Scoped AID (Agent Identity & Discovery) Registry
 * 
 * Production registry for agent identity management with:
 * - Cryptographic ownership verification (Ed25519)
 * - Tenant isolation via RLS
 * - Cross-tenant federation controls
 * - DNS/HTTPS verification hooks
 * 
 * @security CRITICAL - Prevents AID URI spoofing
 * @standards Ed25519 signatures, DNS-over-HTTPS, HTTPS well-known
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ed25519 } from '@noble/curves/ed25519.js';
import { hexToBytes } from '@noble/hashes/utils.js';
import { getCurrentTenantId, getCurrentTenantIdOrNull } from './context';
import type { JSONObject } from '../../types/common.types';

// =====================================================
// TYPES
// =====================================================

export interface AIDRegistration {
  id: string;
  tenantId: string;
  aidUri: string;
  publicKeyEd25519: string; // Base64
  keyAlgorithm: 'Ed25519' | 'ECDSA-secp256k1';
  agentName: string;
  agentDescription?: string;
  endpoint?: string;
  protocols: string[];
  metadata: Record<string, unknown>;
  verified: boolean;
  verificationMethod?: 'dns-txt' | 'https-wellknown' | 'manual';
  verificationData?: Record<string, unknown>;
  status: 'active' | 'suspended' | 'revoked';
  revokedAt?: string;
  revokedReason?: string;
  expiresAt?: string;
  permissions: string[];
  capabilities?: string[];
  lastUsedAt?: string;
  usageCount: number;
  registeredAt: string;
  updatedAt: string;
}

export interface RegisterAgentParams {
  agentName: string;
  aidUri: string;
  publicKeyEd25519: string; // Base64
  agentDescription?: string;
  endpoint?: string;
  protocols?: string[];
  capabilities?: string[];
  permissions?: string[];
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface LookupResult {
  found: boolean;
  registration?: AIDRegistration;
  allowedByFederation: boolean;
  error?: string;
}

export interface VerificationProof {
  signature: string; // Hex-encoded Ed25519 signature
  message: string; // Message that was signed
  timestamp: number;
}

// =====================================================
// AID REGISTRY CLASS
// =====================================================

export class AIDRegistry {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Register new agent in tenant-scoped registry
   * Requires valid tenant context
   */
  public async registerAgent(params: RegisterAgentParams): Promise<AIDRegistration | { error: string }> {
    try {
      // Get tenant ID from context
      const tenantId = getCurrentTenantId();

      // Validate AID URI format
      if (!this.validateAIDUri(params.aidUri)) {
        return { error: 'Invalid AID URI format. Must match: aid://domain/agent/name' };
      }

      // Validate public key is valid Ed25519 (32 bytes when decoded)
      try {
        const pubKeyBytes = Buffer.from(params.publicKeyEd25519, 'base64');
        if (pubKeyBytes.length !== 32) {
          return { error: 'Invalid Ed25519 public key. Must be 32 bytes.' };
        }
      } catch {
        return { error: 'Public key is not valid Base64' };
      }

      // Check if AID URI already registered (globally unique)
      const { data: existing } = await this.supabase
        .from('aid_registry')
        .select('id, tenant_id')
        .eq('aid_uri', params.aidUri)
        .maybeSingle();

      if (existing) {
        if (existing.tenant_id === tenantId) {
          return { error: 'AID URI already registered in your tenant' };
        } else {
          return { error: 'AID URI already claimed by another tenant' };
        }
      }

      // Insert registration
      const { data, error } = await this.supabase
        .from('aid_registry')
        .insert({
          tenant_id: tenantId,
          aid_uri: params.aidUri,
          public_key_ed25519: params.publicKeyEd25519,
          key_algorithm: 'Ed25519',
          agent_name: params.agentName,
          agent_description: params.agentDescription,
          endpoint: params.endpoint,
          protocols: params.protocols || ['a2a', 'http'],
          capabilities: params.capabilities || [],
          permissions: params.permissions || ['mcp:execute'],
          expires_at: params.expiresAt?.toISOString(),
          metadata: params.metadata || {},
          verified: false, // Requires verification
          status: 'active',
          usage_count: 0,
        })
        .select()
        .single();

      if (error) {
        return { error: `Registration failed: ${error.message}` };
      }

      return this.mapRowToRegistration(data);
    } catch (error) {
      return { error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown'}` };
    }
  }

  /**
   * Lookup agent by AID URI
   * Respects tenant isolation + federation rules
   */
  public async lookupAgent(aidUri: string): Promise<LookupResult> {
    try {
      const currentTenantId = getCurrentTenantIdOrNull();

      const { data, error } = await this.supabase
        .from('aid_registry')
        .select('*')
        .eq('aid_uri', aidUri)
        .eq('status', 'active')
        .maybeSingle();

      if (error || !data) {
        return {
          found: false,
          allowedByFederation: false,
          error: error?.message || 'Agent not found',
        };
      }

      const registration = this.mapRowToRegistration(data);

      // Check if current tenant can access this agent
      const allowedByFederation = await this.checkFederationAccess(
        currentTenantId,
        registration.tenantId,
        registration.verified
      );

      if (!allowedByFederation && currentTenantId !== registration.tenantId) {
        return {
          found: false,
          allowedByFederation: false,
          error: 'Agent found but access denied by federation policy',
        };
      }

      return {
        found: true,
        registration,
        allowedByFederation,
      };
    } catch (error) {
      return {
        found: false,
        allowedByFederation: false,
        error: `Lookup failed: ${error instanceof Error ? error.message : 'Unknown'}`,
      };
    }
  }

  /**
   * Revoke agent registration
   * Only owner tenant can revoke
   */
  public async revokeAgent(aidUri: string, reason: string): Promise<{ success: boolean; error?: string }> {
    try {
      const tenantId = getCurrentTenantId();

      // Verify ownership
      const { data: existing } = await this.supabase
        .from('aid_registry')
        .select('tenant_id')
        .eq('aid_uri', aidUri)
        .single();

      if (!existing) {
        return { success: false, error: 'Agent not found' };
      }

      if (existing.tenant_id !== tenantId) {
        return { success: false, error: 'Cannot revoke agent owned by another tenant' };
      }

      // Update status
      const { error } = await this.supabase
        .from('aid_registry')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          revoked_reason: reason,
        })
        .eq('aid_uri', aidUri)
        .eq('tenant_id', tenantId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Revocation failed: ${error instanceof Error ? error.message : 'Unknown'}`,
      };
    }
  }

  /**
   * Verify agent ownership with Ed25519 signature
   * Message = `aid-verify:${aidUri}:${timestamp}`
   */
  public verifyOwnershipSignature(
    aidUri: string,
    publicKeyBase64: string,
    proof: VerificationProof
  ): { valid: boolean; error?: string } {
    try {
      // Validate timestamp (must be within 5 minutes)
      const now = Date.now();
      if (Math.abs(now - proof.timestamp) > 5 * 60 * 1000) {
        return { valid: false, error: 'Proof timestamp expired (5 min window)' };
      }

      // Reconstruct expected message
      const expectedMessage = `aid-verify:${aidUri}:${proof.timestamp}`;
      if (proof.message !== expectedMessage) {
        return { valid: false, error: 'Message mismatch' };
      }

      // Decode public key and signature
      const publicKey = Buffer.from(publicKeyBase64, 'base64');
      const signature = hexToBytes(proof.signature);
      const message = Buffer.from(proof.message, 'utf8');

      // Verify Ed25519 signature
      const valid = ed25519.verify(signature, message, publicKey);

      if (!valid) {
        return { valid: false, error: 'Invalid signature' };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Verification failed: ${error instanceof Error ? error.message : 'Unknown'}`,
      };
    }
  }

  /**
   * Mark agent as verified (manual verification)
   * Only admins can verify
   */
  public async markAsVerified(aidUri: string, notes: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase.rpc('verify_aid_manual', {
        p_aid_uri: aidUri,
        p_verification_notes: notes,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data || !data.success) {
        return { success: false, error: data?.error || 'Verification failed' };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Verification failed: ${error instanceof Error ? error.message : 'Unknown'}`,
      };
    }
  }

  /**
   * List agents in current tenant
   */
  public async listTenantAgents(status?: 'active' | 'suspended' | 'revoked'): Promise<AIDRegistration[]> {
    try {
      const tenantId = getCurrentTenantId();

      let query = this.supabase
        .from('aid_registry')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('registered_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error || !data) {
        return [];
      }

      return data.map((row) => this.mapRowToRegistration(row));
    } catch {
      return [];
    }
  }

  /**
   * Discover federated agents
   * Uses public aid_discovery view (only verified, federated agents)
   */
  public async discoverFederatedAgents(
    filters?: { protocols?: string[]; capabilities?: string[] }
  ): Promise<AIDRegistration[]> {
    try {
      let query = this.supabase.from('aid_discovery').select('*');

      // NOTE: aid_discovery is a VIEW, not the full aid_registry table
      // It only shows verified, federated agents
      
      const { data, error } = await query;

      if (error || !data) {
        return [];
      }

      // Apply client-side filters (since VIEW doesn't have all columns)
      let results = data as JSONObject[];

      if (filters?.protocols) {
        results = results.filter((agent) =>
          filters.protocols!.some((p) => (agent.protocols as any)?.includes(p))
        );
      }

      if (filters?.capabilities) {
        results = results.filter((agent) =>
          filters.capabilities!.some((c) => (agent.capabilities as any)?.includes(c))
        );
      }

      return results.map((row) => ({
        // aid_discovery view has limited columns
        id: (row.id as any) || '',
        tenantId: '', // Not exposed in view
        aidUri: row.aid_uri,
        publicKeyEd25519: '', // Not exposed
        keyAlgorithm: 'Ed25519' as const,
        agentName: row.agent_name,
        agentDescription: row.agent_description,
        endpoint: row.endpoint,
        protocols: row.protocols || [],
        metadata: row.metadata || {},
        verified: true, // View only shows verified
        status: 'active' as const,
        permissions: [],
        capabilities: row.capabilities || [],
        lastUsedAt: row.last_used_at,
        usageCount: 0,
        registeredAt: row.registered_at,
        updatedAt: '',
      })) as AIDRegistration[];
    } catch {
      return [];
    }
  }

  // =====================================================
  // PRIVATE HELPERS
  // =====================================================

  private validateAIDUri(uri: string): boolean {
    return /^aid:\/\/[a-z0-9.-]+\/agent\/[a-z0-9-]+$/.test(uri);
  }

  private async checkFederationAccess(
    sourceTenantId: string | null,
    targetTenantId: string,
    verified: boolean
  ): Promise<boolean> {
    // Same tenant = always allowed
    if (sourceTenantId === targetTenantId) {
      return true;
    }

    // Cross-tenant requires verification + federation mode
    if (!verified) {
      return false;
    }

    // Check target tenant federation mode
    const { data } = await this.supabase
      .from('tenants')
      .select('settings')
      .eq('id', targetTenantId)
      .single();

    if (!data) {
      return false;
    }

    const settings = data.settings as JSONObject;
    const federationMode = settings?.federation_mode || 'private';

    return federationMode === 'federated' || federationMode === 'public';
  }

  private mapRowToRegistration(row: JSONObject): AIDRegistration {
    return {
      id: String(row.id || ''),
      tenantId: String(row.tenant_id || ''),
      aidUri: String(row.aid_uri || ''),
      publicKeyEd25519: String(row.public_key_ed25519 || ''),
      keyAlgorithm: (row.key_algorithm as 'Ed25519' | 'ECDSA-secp256k1') || 'Ed25519',
      agentName: String(row.agent_name || ''),
      agentDescription: row.agent_description ? String(row.agent_description) : undefined,
      endpoint: row.endpoint ? String(row.endpoint) : undefined,
      protocols: Array.isArray(row.protocols) ? row.protocols.map(String) : [],
      metadata: (typeof row.metadata === 'object' && row.metadata !== null && !Array.isArray(row.metadata)) 
        ? row.metadata as Record<string, unknown> 
        : {},
      verified: Boolean(row.verified),
      verificationMethod: row.verification_method as 'dns-txt' | 'https-wellknown' | 'manual' | undefined,
      verificationData: (typeof row.verification_data === 'object' && row.verification_data !== null && !Array.isArray(row.verification_data))
        ? row.verification_data as Record<string, unknown>
        : undefined,
      status: (row.status as 'active' | 'suspended' | 'revoked') || 'active',
      revokedAt: row.revoked_at ? String(row.revoked_at) : undefined,
      revokedReason: row.revoked_reason ? String(row.revoked_reason) : undefined,
      expiresAt: row.expires_at ? String(row.expires_at) : undefined,
      permissions: Array.isArray(row.permissions) ? row.permissions.map(String) : [],
      capabilities: Array.isArray(row.capabilities) ? row.capabilities.map(String) : [],
      lastUsedAt: row.last_used_at ? String(row.last_used_at) : undefined,
      usageCount: typeof row.usage_count === 'number' ? row.usage_count : 0,
      registeredAt: String(row.registered_at || ''),
      updatedAt: String(row.updated_at || ''),
    };
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let aidRegistryInstance: AIDRegistry | null = null;

export function getAIDRegistry(): AIDRegistry {
  if (!aidRegistryInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and key required for AID Registry');
    }

    aidRegistryInstance = new AIDRegistry(supabaseUrl, supabaseKey);
  }

  return aidRegistryInstance;
}

// =====================================================
// CONVENIENCE EXPORTS
// =====================================================

export async function registerAgent(params: RegisterAgentParams) {
  return getAIDRegistry().registerAgent(params);
}

export async function lookupAgent(aidUri: string) {
  return getAIDRegistry().lookupAgent(aidUri);
}

export async function revokeAgent(aidUri: string, reason: string) {
  return getAIDRegistry().revokeAgent(aidUri, reason);
}

export async function discoverFederatedAgents(filters?: { protocols?: string[]; capabilities?: string[] }) {
  return getAIDRegistry().discoverFederatedAgents(filters);
}
