/**
 * @file lib/tenancy/validator.ts
 * @description Cross-Tenant Access Validator
 * 
 * Validates and enforces cross-tenant access policies including:
 * - Federation mode checks (private/federated/public)
 * - Resource-level access control
 * - AID chain of trust verification
 * - Byzantine fault detection for tenant isolation violations
 * 
 * @security CRITICAL - Prevents unauthorized cross-tenant data access
 * @standards Zero-trust architecture, Least privilege principle
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getCurrentTenantIdOrNull } from './context';

// =====================================================
// TYPES
// =====================================================

export interface TenantAccessPolicy {
  tenantId: string;
  federationMode: 'private' | 'federated' | 'public';
  allowedPartners: string[]; // Tenant IDs allowed for federation
  blockedTenants: string[]; // Explicitly blocked tenant IDs
  resourcePolicies: {
    [resource: string]: {
      allowCrossTenantRead: boolean;
      allowCrossTenantWrite: boolean;
      requireVerification: boolean;
    };
  };
}

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
  requiresVerification?: boolean;
  metadata?: Record<string, unknown>;
}

export type ResourceType = 
  | 'knowledge_graph'
  | 'citation'
  | 'agent_key'
  | 'api_key'
  | 'audit'
  | 'invoice'
  | 'wallet'
  | 'mesh_node'
  | 'consensus_proposal';

// =====================================================
// CROSS-TENANT VALIDATOR CLASS
// =====================================================

export class CrossTenantValidator {
  private supabase: SupabaseClient;
  private policyCache: Map<string, { policy: TenantAccessPolicy; timestamp: number }> = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Validate cross-tenant access
   * Main entry point for all cross-tenant operations
   */
  public async validateCrossTenantAccess(
    sourceTenantId: string | null,
    targetTenantId: string,
    resourceType: ResourceType,
    operation: 'read' | 'write' | 'execute' = 'read'
  ): Promise<ValidationResult> {
    // Same tenant = always allowed
    if (sourceTenantId === targetTenantId) {
      return { allowed: true, reason: 'Same tenant access' };
    }

    // No source tenant = anonymous/public access
    if (!sourceTenantId) {
      return this.validatePublicAccess(targetTenantId, resourceType);
    }

    // Get target tenant policy
    const targetPolicy = await this.getTenantPolicy(targetTenantId);
    if (!targetPolicy) {
      return {
        allowed: false,
        reason: 'Target tenant not found or policy unavailable',
      };
    }

    // Check if source tenant is blocked
    if (targetPolicy.blockedTenants.includes(sourceTenantId)) {
      return {
        allowed: false,
        reason: 'Source tenant is blocked by target tenant',
      };
    }

    // Check federation mode
    if (targetPolicy.federationMode === 'private') {
      // Private mode: only allowed partners
      if (!targetPolicy.allowedPartners.includes(sourceTenantId)) {
        return {
          allowed: false,
          reason: 'Target tenant is in private mode and source is not an allowed partner',
        };
      }
    } else if (targetPolicy.federationMode === 'federated') {
      // Federated mode: allowed partners OR verified agents
      const isPartner = targetPolicy.allowedPartners.includes(sourceTenantId);
      const isVerified = await this.isVerifiedTenant(sourceTenantId);

      if (!isPartner && !isVerified) {
        return {
          allowed: false,
          reason: 'Target tenant requires verification for federated access',
          requiresVerification: true,
        };
      }
    }
    // Public mode: all verified tenants allowed (checked in resource policy)

    // Check resource-specific policies
    const resourcePolicy = targetPolicy.resourcePolicies[resourceType];
    if (!resourcePolicy) {
      // No specific policy = use defaults based on federation mode
      return this.getDefaultResourcePolicy(targetPolicy.federationMode, operation);
    }

    // Validate operation against resource policy
    if (operation === 'read' && !resourcePolicy.allowCrossTenantRead) {
      return {
        allowed: false,
        reason: `Cross-tenant read not allowed for ${resourceType}`,
      };
    }

    if (operation === 'write' && !resourcePolicy.allowCrossTenantWrite) {
      return {
        allowed: false,
        reason: `Cross-tenant write not allowed for ${resourceType}`,
      };
    }

    // Check verification requirement
    if (resourcePolicy.requireVerification) {
      const isVerified = await this.isVerifiedTenant(sourceTenantId);
      if (!isVerified) {
        return {
          allowed: false,
          reason: `${resourceType} requires source tenant verification`,
          requiresVerification: true,
        };
      }
    }

    return {
      allowed: true,
      reason: 'Cross-tenant access granted by federation policy',
    };
  }

  /**
   * Check federation policy between two tenants
   * Returns allowed partners for given tenant
   */
  public async checkFederationPolicy(tenantId: string): Promise<{
    mode: 'private' | 'federated' | 'public';
    allowedPartners: string[];
    blockedTenants: string[];
  }> {
    const policy = await this.getTenantPolicy(tenantId);

    if (!policy) {
      return {
        mode: 'private',
        allowedPartners: [],
        blockedTenants: [],
      };
    }

    return {
      mode: policy.federationMode,
      allowedPartners: policy.allowedPartners,
      blockedTenants: policy.blockedTenants,
    };
  }

  /**
   * Validate AID chain of trust
   * Ensures AID URI is owned by claimed tenant and verified
   */
  public async validateAIDChain(
    aidUri: string,
    claimedTenantId: string
  ): Promise<ValidationResult> {
    try {
      // Query aid_registry for ownership
      const { data, error } = await this.supabase
        .from('aid_registry')
        .select('tenant_id, verified, status')
        .eq('aid_uri', aidUri)
        .eq('status', 'active')
        .maybeSingle();

      if (error || !data) {
        return {
          allowed: false,
          reason: 'AID URI not found in registry',
        };
      }

      // Verify ownership
      if (data.tenant_id !== claimedTenantId) {
        return {
          allowed: false,
          reason: 'AID URI ownership mismatch - possible spoofing attempt',
          metadata: {
            actualOwner: data.tenant_id,
            claimedOwner: claimedTenantId,
            securityAlert: 'TENANT_AID_SPOOFING_DETECTED',
          },
        };
      }

      // Check verification status
      if (!data.verified) {
        return {
          allowed: false,
          reason: 'AID URI not verified',
          requiresVerification: true,
        };
      }

      return {
        allowed: true,
        reason: 'AID chain of trust validated',
      };
    } catch (error) {
      return {
        allowed: false,
        reason: `AID validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Validate mesh network routing permission
   * Checks if source tenant can route through target tenant's nodes
   */
  public async validateMeshRouting(
    sourceTenantId: string,
    targetTenantId: string
  ): Promise<ValidationResult> {
    // Same tenant = always allowed
    if (sourceTenantId === targetTenantId) {
      return { allowed: true };
    }

    // Check target tenant's mesh isolation mode
    const policy = await this.getTenantPolicy(targetTenantId);
    if (!policy) {
      return {
        allowed: false,
        reason: 'Target tenant policy unavailable',
      };
    }

    // Check mesh_node resource policy
    const meshPolicy = policy.resourcePolicies['mesh_node'];
    if (!meshPolicy?.allowCrossTenantRead) {
      return {
        allowed: false,
        reason: 'Target tenant does not allow cross-tenant mesh routing',
      };
    }

    // Check if source tenant is allowed partner or verified
    if (policy.federationMode === 'private') {
      if (!policy.allowedPartners.includes(sourceTenantId)) {
        return {
          allowed: false,
          reason: 'Source tenant not in allowed partners list',
        };
      }
    } else if (policy.federationMode === 'federated') {
      const isPartner = policy.allowedPartners.includes(sourceTenantId);
      const isVerified = await this.isVerifiedTenant(sourceTenantId);

      if (!isPartner && !isVerified) {
        return {
          allowed: false,
          reason: 'Source tenant not verified for mesh routing',
          requiresVerification: true,
        };
      }
    }

    return {
      allowed: true,
      reason: 'Mesh routing allowed by federation policy',
    };
  }

  /**
   * Detect and log potential tenant isolation violations
   * Called when suspicious cross-tenant activity detected
   */
  public async reportIsolationViolation(
    sourceTenantId: string,
    targetTenantId: string,
    violationType: 'unauthorized_access' | 'aid_spoofing' | 'routing_bypass' | 'rls_bypass',
    details: Record<string, unknown>
  ): Promise<void> {
    try {
      // Log to audits table
      await this.supabase.from('audits').insert({
        tenant_id: targetTenantId,
        action: 'SECURITY_VIOLATION',
        actor_id: sourceTenantId,
        resource_type: 'tenant_isolation',
        resource_id: targetTenantId,
        metadata: {
          violation_type: violationType,
          source_tenant: sourceTenantId,
          target_tenant: targetTenantId,
          timestamp: new Date().toISOString(),
          ...details,
        },
        severity: 'critical',
      });

      console.error('[TenantValidator] Isolation violation detected:', {
        violationType,
        sourceTenantId,
        targetTenantId,
        details,
      });
    } catch (error) {
      console.error('[TenantValidator] Failed to log isolation violation:', error);
    }
  }

  // =====================================================
  // PRIVATE HELPERS
  // =====================================================

  private async getTenantPolicy(tenantId: string): Promise<TenantAccessPolicy | null> {
    // Check cache
    const cached = this.policyCache.get(tenantId);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.policy;
    }

    try {
      const { data, error } = await this.supabase
        .from('tenants')
        .select('id, settings')
        .eq('id', tenantId)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        return null;
      }

      const settings = data.settings as any;
      const policy: TenantAccessPolicy = {
        tenantId: data.id,
        federationMode: settings?.federation_mode || 'private',
        allowedPartners: settings?.allowed_partners || [],
        blockedTenants: settings?.blocked_tenants || [],
        resourcePolicies: settings?.resource_policies || {},
      };

      // Cache policy
      this.policyCache.set(tenantId, { policy, timestamp: Date.now() });

      return policy;
    } catch {
      return null;
    }
  }

  private async isVerifiedTenant(tenantId: string): Promise<boolean> {
    try {
      // Check if tenant has at least one verified AID
      const { data, error } = await this.supabase
        .from('aid_registry')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('verified', true)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      return !error && data !== null;
    } catch {
      return false;
    }
  }

  private async validatePublicAccess(
    targetTenantId: string,
    resourceType: ResourceType
  ): Promise<ValidationResult> {
    const policy = await this.getTenantPolicy(targetTenantId);

    if (!policy || policy.federationMode !== 'public') {
      return {
        allowed: false,
        reason: 'Target tenant does not allow public access',
      };
    }

    // Check if resource allows public read
    const resourcePolicy = policy.resourcePolicies[resourceType];
    if (resourcePolicy && !resourcePolicy.allowCrossTenantRead) {
      return {
        allowed: false,
        reason: `Resource ${resourceType} not available for public access`,
      };
    }

    return {
      allowed: true,
      reason: 'Public access granted',
    };
  }

  private getDefaultResourcePolicy(
    federationMode: 'private' | 'federated' | 'public',
    operation: 'read' | 'write' | 'execute'
  ): ValidationResult {
    // Default policies based on federation mode
    if (federationMode === 'private') {
      return {
        allowed: false,
        reason: 'Private mode does not allow cross-tenant access by default',
      };
    }

    if (federationMode === 'federated') {
      if (operation === 'read') {
        return {
          allowed: true,
          reason: 'Federated mode allows cross-tenant read by default',
        };
      }
      return {
        allowed: false,
        reason: 'Federated mode does not allow cross-tenant write by default',
      };
    }

    // Public mode
    if (operation === 'read') {
      return {
        allowed: true,
        reason: 'Public mode allows read access',
      };
    }

    return {
      allowed: false,
      reason: 'Public mode does not allow write operations',
    };
  }

  /**
   * Clear policy cache (for testing or manual refresh)
   */
  public clearCache(): void {
    this.policyCache.clear();
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let validatorInstance: CrossTenantValidator | null = null;

export function getCrossTenantValidator(): CrossTenantValidator {
  if (!validatorInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and key required for CrossTenantValidator');
    }

    validatorInstance = new CrossTenantValidator(supabaseUrl, supabaseKey);
  }

  return validatorInstance;
}

// =====================================================
// CONVENIENCE EXPORTS
// =====================================================

export async function validateCrossTenantAccess(
  targetTenantId: string,
  resourceType: ResourceType,
  operation?: 'read' | 'write' | 'execute'
) {
  const sourceTenantId = getCurrentTenantIdOrNull();
  return getCrossTenantValidator().validateCrossTenantAccess(
    sourceTenantId,
    targetTenantId,
    resourceType,
    operation
  );
}

export async function validateAIDChain(aidUri: string, claimedTenantId: string) {
  return getCrossTenantValidator().validateAIDChain(aidUri, claimedTenantId);
}

export async function validateMeshRouting(sourceTenantId: string, targetTenantId: string) {
  return getCrossTenantValidator().validateMeshRouting(sourceTenantId, targetTenantId);
}

export async function reportIsolationViolation(
  sourceTenantId: string,
  targetTenantId: string,
  violationType: 'unauthorized_access' | 'aid_spoofing' | 'routing_bypass' | 'rls_bypass',
  details: Record<string, unknown>
) {
  return getCrossTenantValidator().reportIsolationViolation(
    sourceTenantId,
    targetTenantId,
    violationType,
    details
  );
}
