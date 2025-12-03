/**
 * @file lib/tenancy/middleware.ts
 * @description Express/API Middleware for Tenant Context Injection
 * 
 * Automatically extracts tenant context from:
 * 1. JWT claims (auth.user.app_metadata.tenant_id)
 * 2. X-Tenant-ID header (API keys, service-to-service)
 * 3. AID URI resolution (X-Agent-ID header)
 * 
 * Security:
 * - JWT signature verification via Supabase Auth
 * - AID cryptographic verification via aidRegistry
 * - RLS enforcement at database layer (defense in depth)
 * 
 * @standards AsyncLocalStorage (Node.js 16+), Zero-trust architecture
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TenantContextManager, type TenantContext } from './context';

// =====================================================
// TYPES
// =====================================================

/**
 * Request with tenant context
 * Compatible with Express.Request and Next.js API handlers
 */
export interface TenantRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: {
    id?: string;
    sub?: string;
    email?: string;
    app_metadata?: {
      tenant_id?: string;
    };
    user_metadata?: {
      tenant_id?: string;
    };
  };
  supabase?: SupabaseClient;
  tenantContext?: TenantContext;
}

import type { JSONValue } from '../../types/common.types';

export interface TenantResponse {
  status: (code: number) => TenantResponse;
  json: (data: JSONValue) => void;
}

export type TenantNextFunction = () => void;

export interface MiddlewareOptions {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey?: string;
  requireAuth?: boolean; // Default true
  allowAnonymous?: boolean; // Default false
  validateRole?: 'owner' | 'admin' | 'member' | 'viewer';
}

// =====================================================
// MIDDLEWARE
// =====================================================

/**
 * Tenant context middleware for API routes
 * Extracts tenant_id and injects AsyncLocalStorage context
 */
export function createTenantMiddleware(options: MiddlewareOptions) {
  const ctx = TenantContextManager.getInstance();
  ctx.initializeSupabase(options.supabaseUrl, options.supabaseAnonKey);

  return async function tenantMiddleware(
    req: TenantRequest,
    res: TenantResponse,
    next: TenantNextFunction
  ): Promise<void> {
    try {
      // 1. Extract tenant context
      const tenantContext = await extractTenantContext(req, options);

      if (!tenantContext) {
        if (options.allowAnonymous) {
          // Allow anonymous requests (e.g. public endpoints)
          return next();
        }
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Missing tenant context. Provide JWT, X-Tenant-ID, or X-Agent-ID header.',
        });
      }

      // 2. Validate tenant access if user authenticated
      if (tenantContext.userId) {
        const validation = await ctx.validateTenantAccess(
          tenantContext.userId,
          tenantContext.tenantId,
          options.validateRole
        );

        if (!validation.valid) {
          return res.status(403).json({
            error: 'Forbidden',
            message: validation.error || 'Access to tenant denied',
          });
        }
      }

      // 3. Create Supabase client with tenant context
      const supabase = createClient(
        options.supabaseUrl,
        options.supabaseServiceKey || options.supabaseAnonKey
      );

      // Set PostgreSQL session variable for RLS
      await ctx.setSupabaseTenantContext(supabase, tenantContext.tenantId);

      // Attach to request object
      req.supabase = supabase;
      req.tenantContext = tenantContext;

      // 4. Run handler in AsyncLocalStorage context
      await ctx.runInTenantContext(tenantContext, async () => {
        next();
      });
    } catch (error) {
      console.error('[TenantMiddleware] Error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Extract tenant context from request
 * Priority: JWT → X-Tenant-ID → X-Agent-ID (AID)
 */
async function extractTenantContext(
  req: TenantRequest,
  options: MiddlewareOptions
): Promise<TenantContext | null> {
  // 1. JWT claims (Supabase Auth)
  if (req.user && typeof req.user === 'object') {
    const jwtContext = TenantContextManager.fromJWT(req.user as Record<string, unknown>);
    if (jwtContext) {
      return jwtContext;
    }
  }

  // 2. X-Tenant-ID header (API keys, service-to-service)
  const headers = normalizeHeaders(req.headers);
  const headerContext = TenantContextManager.fromHeaders(headers);
  if (headerContext) {
    return headerContext;
  }

  // 3. AID URI resolution (X-Agent-ID header)
  const aidHeader = headers['x-agent-id'];
  if (aidHeader) {
    const aidContext = await extractFromAID(aidHeader, options);
    if (aidContext) {
      return aidContext;
    }
  }

  return null;
}

/**
 * Extract tenant from AID URI
 * Validates AID ownership via cryptographic signature
 */
async function extractFromAID(
  aidUri: string,
  options: MiddlewareOptions
): Promise<TenantContext | null> {
  try {
    // Lookup AID in registry
    const { AIDRegistry } = await import('./aidRegistry');
    const registry = new AIDRegistry(options.supabaseUrl, options.supabaseServiceKey || options.supabaseAnonKey);
    const result = await registry.lookupAgent(aidUri);

    if (!result.found || !result.registration || !result.registration.verified) {
      console.warn(`[TenantMiddleware] AID ${aidUri} not found or not verified`);
      return null;
    }

    return {
      tenantId: result.registration.tenantId,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('[TenantMiddleware] Failed to resolve AID:', error);
    return null;
  }
}

/**
 * Normalize headers to lowercase keys
 */
function normalizeHeaders(
  headers: Record<string, string | string[] | undefined>
): Record<string, string | undefined> {
  const normalized: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') {
      normalized[key.toLowerCase()] = value;
    } else if (Array.isArray(value)) {
      normalized[key.toLowerCase()] = value[0];
    }
  }
  return normalized;
}

// =====================================================
// NEXT.JS API ROUTE WRAPPER
// =====================================================

/**
 * Wrap Next.js API route with tenant middleware
 * 
 * @example
 * export default withTenantContext({
 *   supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
 *   supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
 * }, async (req, res) => {
 *   const tenantId = req.tenantContext?.tenantId;
 *   res.json({ tenantId });
 * });
 */
export function withTenantContext(
  options: MiddlewareOptions,
  handler: (req: TenantRequest, res: TenantResponse) => Promise<void>
) {
  const middleware = createTenantMiddleware(options);

  return async (req: TenantRequest, res: TenantResponse) => {
    return new Promise<void>((resolve, reject) => {
      const mockRes: TenantResponse = {
        status: (code: number) => {
          res.status(code);
          return mockRes;
        },
        json: (data: JSONValue) => {
          res.json(data);
          resolve();
        },
      };

      middleware(req, mockRes, async () => {
        try {
          await handler(req, res);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  };
}

// =====================================================
// CONVENIENCE EXPORTS
// =====================================================

/**
 * Create middleware with environment variables
 */
export function createDefaultTenantMiddleware(overrides?: Partial<MiddlewareOptions>) {
  return createTenantMiddleware({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    requireAuth: true,
    allowAnonymous: false,
    ...overrides,
  });
}

/**
 * Extract tenant ID from request without full middleware
 * Useful for lightweight endpoints
 */
export async function getTenantIdFromRequest(
  req: TenantRequest,
  options: Pick<MiddlewareOptions, 'supabaseUrl' | 'supabaseAnonKey' | 'supabaseServiceKey'>
): Promise<string | null> {
  const context = await extractTenantContext(req, {
    ...options,
    requireAuth: false,
    allowAnonymous: false,
  });
  return context?.tenantId || null;
}
