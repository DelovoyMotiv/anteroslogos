/**
 * @file lib/tenancy/context.ts
 * @description Tenant Context Management with AsyncLocalStorage
 * 
 * Provides request-scoped tenant isolation for multi-tenancy.
 * Ensures tenant_id propagates through async call stacks without explicit passing.
 * 
 * @security CRITICAL - All data access MUST check tenant context
 * @standards AsyncLocalStorage (Node.js 16+), Zero-trust architecture
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Conditional import of AsyncLocalStorage (Node.js only)
type AsyncLocalStorageClass<T> = {
  new(): {
    getStore(): T | undefined;
    run<R>(store: T, callback: () => R): R;
  };
};

let AsyncLocalStorage: AsyncLocalStorageClass<TenantContext> | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  AsyncLocalStorage = require('node:async_hooks').AsyncLocalStorage;
} catch {
  // Browser environment - AsyncLocalStorage not available
  console.warn('[TenantContext] AsyncLocalStorage not available in browser environment');
}

// =====================================================
// TYPES
// =====================================================

export interface TenantContext {
  tenantId: string;
  userId?: string;
  role?: 'owner' | 'admin' | 'member' | 'viewer';
  permissions?: string[];
  federationMode?: 'private' | 'federated' | 'public';
  timestamp: number;
}

export interface TenantValidationResult {
  valid: boolean;
  tenantId?: string;
  error?: string;
}

// =====================================================
// ASYNC LOCAL STORAGE
// =====================================================

/**
 * AsyncLocalStorage for tenant context
 * Maintains tenant_id across async call stack without explicit passing
 * Falls back to null if not available (browser environment)
 */
const tenantContextStorage: {
  getStore(): TenantContext | undefined;
  run<R>(store: TenantContext, callback: () => R): R;
} | null = AsyncLocalStorage ? new AsyncLocalStorage() : null;

// =====================================================
// TENANT CONTEXT MANAGER
// =====================================================

export class TenantContextManager {
  private static instance: TenantContextManager;
  private supabase: SupabaseClient | null = null;

  private constructor() {}

  public static getInstance(): TenantContextManager {
    if (!TenantContextManager.instance) {
      TenantContextManager.instance = new TenantContextManager();
    }
    return TenantContextManager.instance;
  }

  /**
   * Initialize Supabase client (optional, for validation queries)
   */
  public initializeSupabase(supabaseUrl: string, supabaseKey: string): void {
    if (!this.supabase) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  /**
   * Get current tenant context from AsyncLocalStorage
   * @returns Current tenant context or null if not set
   */
  public getCurrentContext(): TenantContext | null {
    return tenantContextStorage ? tenantContextStorage.getStore() || null : null;
  }

  /**
   * Get current tenant ID
   * @throws Error if tenant context not set (indicates programming error)
   */
  public getTenantId(): string {
    const context = this.getCurrentContext();
    if (!context) {
      throw new Error(
        'Tenant context not set. Ensure tenantMiddleware or runInTenantContext is used.'
      );
    }
    return context.tenantId;
  }

  /**
   * Get tenant ID safely (returns null if not set)
   */
  public getTenantIdOrNull(): string | null {
    const context = this.getCurrentContext();
    return context?.tenantId || null;
  }

  /**
   * Run function within tenant context
   * Used for middleware and service layer
   */
  public async runInTenantContext<T>(
    context: TenantContext,
    fn: () => Promise<T>
  ): Promise<T> {
    if (!tenantContextStorage) {
      // Browser environment - just run the function without context isolation
      console.warn('[TenantContext] Running without AsyncLocalStorage isolation');
      return fn();
    }
    return tenantContextStorage.run(context, fn);
  }

  /**
   * Validate user has access to tenant
   * Checks tenant_members table via RLS
   */
  public async validateTenantAccess(
    userId: string,
    tenantId: string,
    requiredRole: 'owner' | 'admin' | 'member' | 'viewer' = 'viewer'
  ): Promise<TenantValidationResult> {
    if (!this.supabase) {
      return {
        valid: false,
        error: 'Supabase not initialized. Call initializeSupabase() first.',
      };
    }

    try {
      // Query tenant_members with RLS (user_has_tenant_access)
      const { data, error } = await this.supabase
        .from('tenant_members')
        .select('role, status, tenant_id')
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        return {
          valid: false,
          error: `User ${userId} not member of tenant ${tenantId}`,
        };
      }

      // Role hierarchy validation
      const roleHierarchy: Record<string, number> = {
        owner: 4,
        admin: 3,
        member: 2,
        viewer: 1,
      };

      const userRoleLevel = roleHierarchy[data.role] || 0;
      const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

      if (userRoleLevel < requiredRoleLevel) {
        return {
          valid: false,
          error: `Insufficient permissions. Required: ${requiredRole}, has: ${data.role}`,
        };
      }

      return {
        valid: true,
        tenantId: data.tenant_id,
      };
    } catch (error) {
      return {
        valid: false,
        error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get tenant's federation mode
   * Determines if tenant allows cross-tenant interactions
   */
  public async getTenantFederationMode(tenantId: string): Promise<TenantContext['federationMode']> {
    if (!this.supabase) {
      return 'private'; // Safe default
    }

    try {
      const { data, error } = await this.supabase
        .from('tenants')
        .select('settings')
        .eq('id', tenantId)
        .single();

      if (error || !data) {
        return 'private';
      }

      const settings = data.settings as Record<string, unknown> | null;
      const federationMode = settings?.federation_mode;
      if (federationMode === 'private' || federationMode === 'federated' || federationMode === 'public') {
        return federationMode;
      }
      return 'private';
    } catch {
      return 'private';
    }
  }

  /**
   * Set tenant_id in Supabase session context
   * This ensures RLS uses correct tenant_id via get_current_tenant_id()
   */
  public async setSupabaseTenantContext(
    client: SupabaseClient,
    tenantId: string
  ): Promise<void> {
    try {
      // Set PostgreSQL session variable
      await client.rpc('set_config', {
        setting_name: 'app.current_tenant_id',
        new_value: tenantId,
        is_local: true, // Session-scoped
      });
    } catch (error) {
      console.error('[TenantContext] Failed to set Supabase tenant context:', error);
      throw new Error('Failed to set tenant context in database session');
    }
  }

  /**
   * Clear tenant context (for cleanup)
   */
  public clearContext(): void {
    // AsyncLocalStorage automatically clears when execution context ends
    // This is primarily for explicit cleanup in tests
  }

  /**
   * Create tenant context from JWT payload
   * Extracts tenant_id from Supabase JWT metadata
   */
  public static fromJWT(jwtPayload: Record<string, unknown>): TenantContext | null {
    // Type guard for nested metadata
    const appMetadata = jwtPayload?.app_metadata as Record<string, unknown> | undefined;
    const userMetadata = jwtPayload?.user_metadata as Record<string, unknown> | undefined;
    
    const tenantId = 
      (typeof appMetadata?.tenant_id === 'string' ? appMetadata.tenant_id : undefined) ||
      (typeof userMetadata?.tenant_id === 'string' ? userMetadata.tenant_id : undefined);
    
    const userId = typeof jwtPayload?.sub === 'string' ? jwtPayload.sub : undefined;

    if (!tenantId) {
      return null;
    }

    return {
      tenantId,
      userId,
      timestamp: Date.now(),
    };
  }

  /**
   * Create tenant context from HTTP headers
   * Supports X-Tenant-ID header (API keys, service-to-service)
   */
  public static fromHeaders(headers: Record<string, string | undefined>): TenantContext | null {
    const tenantId = headers['x-tenant-id'] || headers['X-Tenant-ID'];

    if (!tenantId || typeof tenantId !== 'string') {
      return null;
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      return null;
    }

    return {
      tenantId,
      timestamp: Date.now(),
    };
  }
}

// =====================================================
// CONVENIENCE EXPORTS
// =====================================================

/**
 * Singleton instance
 */
export const tenantContext = TenantContextManager.getInstance();

/**
 * Get current tenant ID (throws if not set)
 */
export function getCurrentTenantId(): string {
  return tenantContext.getTenantId();
}

/**
 * Get current tenant ID or null
 */
export function getCurrentTenantIdOrNull(): string | null {
  return tenantContext.getTenantIdOrNull();
}

/**
 * Run function in tenant context
 */
export async function runInTenantContext<T>(
  context: TenantContext,
  fn: () => Promise<T>
): Promise<T> {
  return tenantContext.runInTenantContext(context, fn);
}

/**
 * Validate tenant access
 */
export async function validateTenantAccess(
  userId: string,
  tenantId: string,
  requiredRole?: 'owner' | 'admin' | 'member' | 'viewer'
): Promise<TenantValidationResult> {
  return tenantContext.validateTenantAccess(userId, tenantId, requiredRole);
}
