/**
 * Billing Authorization Middleware
 * Enforces authorization checks for all billing operations
 * 
 * Ensures users can only access their own billing data and prevents
 * unauthorized access to ledger, balance, and transaction information.
 * 
 * **Validates: Requirements 8.1, 8.2, 8.3**
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getBillingAuditLogger } from './auditLogger';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Authorization context extracted from request
 */
export interface AuthorizationContext {
  userId: string;
  isServiceRole: boolean;
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * Authorization check result
 */
export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
  context?: AuthorizationContext;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract user ID from request
 * Checks multiple sources in order of preference
 */
function extractUserId(req: VercelRequest): string | undefined {
  // Check if set by auth middleware
  if ((req as any).userId) {
    return (req as any).userId;
  }

  // Check if user object exists (from JWT middleware)
  if ((req as any).user?.userId) {
    return (req as any).user.userId;
  }

  // Check if user object has id field
  if ((req as any).user?.id) {
    return (req as any).user.id;
  }

  return undefined;
}

/**
 * Check if request is using service role
 * Service role has elevated privileges for system operations
 */
function isServiceRole(req: VercelRequest): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader) return false;

  // Check if using service role key
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return false;

  // Extract token from Bearer header
  const token = authHeader.replace('Bearer ', '');
  
  // Service role key is used directly (not a JWT)
  return token === serviceRoleKey;
}

/**
 * Extract IP address from request
 */
function extractIpAddress(req: VercelRequest): string | null {
  // Check various headers in order of preference
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip', // Cloudflare
    'x-client-ip',
  ];

  for (const header of headers) {
    const value = req.headers[header];
    if (value) {
      // x-forwarded-for can be a comma-separated list
      const ip = Array.isArray(value) ? value[0] : value.split(',')[0];
      return ip.trim();
    }
  }

  return null;
}

/**
 * Extract user agent from request
 */
function extractUserAgent(req: VercelRequest): string | null {
  const userAgent = req.headers['user-agent'];
  if (!userAgent) return null;
  
  // Limit length to prevent abuse
  return Array.isArray(userAgent) ? userAgent[0].substring(0, 500) : userAgent.substring(0, 500);
}

/**
 * Build authorization context from request
 */
function buildAuthorizationContext(req: VercelRequest): AuthorizationContext | null {
  const userId = extractUserId(req);
  if (!userId) return null;

  return {
    userId,
    isServiceRole: isServiceRole(req),
    ipAddress: extractIpAddress(req),
    userAgent: extractUserAgent(req),
  };
}

// ============================================================================
// AUTHORIZATION CHECKS
// ============================================================================

/**
 * Check if user is authorized to access their own billing data
 * 
 * @param req - Request object
 * @returns Authorization result with context
 */
export function checkBillingAuthorization(req: VercelRequest): AuthorizationResult {
  const context = buildAuthorizationContext(req);

  if (!context) {
    return {
      authorized: false,
      reason: 'Authentication required - no user ID found in request',
    };
  }

  return {
    authorized: true,
    context,
  };
}

/**
 * Check if user is authorized to access specific user's billing data
 * Users can only access their own data unless they have service role
 * 
 * @param req - Request object
 * @param targetUserId - User ID being accessed
 * @returns Authorization result with context
 */
export function checkUserDataAuthorization(
  req: VercelRequest,
  targetUserId: string
): AuthorizationResult {
  const context = buildAuthorizationContext(req);

  if (!context) {
    return {
      authorized: false,
      reason: 'Authentication required - no user ID found in request',
    };
  }

  // Service role can access any user's data
  if (context.isServiceRole) {
    return {
      authorized: true,
      context,
    };
  }

  // Regular users can only access their own data
  if (context.userId !== targetUserId) {
    return {
      authorized: false,
      reason: `User ${context.userId} attempted to access data for user ${targetUserId}`,
      context,
    };
  }

  return {
    authorized: true,
    context,
  };
}

/**
 * Check if user is authorized to perform ledger operations
 * Only service role can insert into ledger
 * 
 * @param req - Request object
 * @param operation - Operation type ('insert', 'update', 'delete')
 * @returns Authorization result with context
 */
export function checkLedgerAuthorization(
  req: VercelRequest,
  operation: 'insert' | 'update' | 'delete'
): AuthorizationResult {
  const context = buildAuthorizationContext(req);

  if (!context) {
    return {
      authorized: false,
      reason: 'Authentication required - no user ID found in request',
    };
  }

  // Only service role can perform ledger operations
  if (!context.isServiceRole) {
    return {
      authorized: false,
      reason: `User ${context.userId} attempted unauthorized ledger ${operation} operation`,
      context,
    };
  }

  return {
    authorized: true,
    context,
  };
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Middleware to enforce billing authorization
 * Ensures user can only access their own billing data
 * 
 * @example
 * ```typescript
 * export default requireBillingAuth(handler);
 * ```
 */
export function requireBillingAuth(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const authResult = checkBillingAuthorization(req);

    if (!authResult.authorized) {
      // Log unauthorized attempt
      const auditLogger = getBillingAuditLogger();
      await auditLogger.logEvent(
        'balance_check_unauthorized',
        null,
        {
          reason: authResult.reason,
          endpoint: req.url,
          method: req.method,
        },
        extractIpAddress(req),
        extractUserAgent(req)
      );

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'You must be authenticated to access billing information',
        code: 'ERR_BILLING_AUTH_REQUIRED',
      });
    }

    // Attach authorization context to request
    (req as any).authContext = authResult.context;

    return handler(req, res);
  };
}

/**
 * Middleware to enforce user data authorization
 * Ensures user can only access their own data
 * 
 * @param getUserId - Function to extract target user ID from request
 * 
 * @example
 * ```typescript
 * export default requireUserDataAuth((req) => req.query.userId as string)(handler);
 * ```
 */
export function requireUserDataAuth(
  getUserId: (req: VercelRequest) => string | undefined
) {
  return (handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void) => {
    return async (req: VercelRequest, res: VercelResponse) => {
      const targetUserId = getUserId(req);

      if (!targetUserId) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'User ID is required',
          code: 'ERR_USER_ID_REQUIRED',
        });
      }

      const authResult = checkUserDataAuthorization(req, targetUserId);

      if (!authResult.authorized) {
        // Log unauthorized attempt
        const auditLogger = getBillingAuditLogger();
        await auditLogger.logUnauthorizedAccess(
          'transaction_history_unauthorized',
          targetUserId,
          authResult.context?.userId || null,
          'user_billing_data',
          {
            reason: authResult.reason,
            endpoint: req.url,
            method: req.method,
          },
          authResult.context?.ipAddress,
          authResult.context?.userAgent
        );

        return res.status(403).json({
          error: 'Forbidden',
          message: 'You are not authorized to access this user\'s billing data',
          code: 'ERR_BILLING_FORBIDDEN',
        });
      }

      // Attach authorization context to request
      (req as any).authContext = authResult.context;

      return handler(req, res);
    };
  };
}

/**
 * Middleware to enforce ledger operation authorization
 * Only service role can perform ledger operations
 * 
 * @param operation - Operation type ('insert', 'update', 'delete')
 * 
 * @example
 * ```typescript
 * export default requireLedgerAuth('insert')(handler);
 * ```
 */
export function requireLedgerAuth(operation: 'insert' | 'update' | 'delete') {
  return (handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void) => {
    return async (req: VercelRequest, res: VercelResponse) => {
      const authResult = checkLedgerAuthorization(req, operation);

      if (!authResult.authorized) {
        // Log unauthorized attempt
        const auditLogger = getBillingAuditLogger();
        await auditLogger.logUnauthorizedAccess(
          'ledger_insert_unauthorized',
          null,
          authResult.context?.userId || null,
          `ledger_${operation}`,
          {
            reason: authResult.reason,
            endpoint: req.url,
            method: req.method,
            operation,
          },
          authResult.context?.ipAddress,
          authResult.context?.userAgent
        );

        return res.status(403).json({
          error: 'Forbidden',
          message: 'Only service role can perform ledger operations',
          code: 'ERR_LEDGER_FORBIDDEN',
        });
      }

      // Attach authorization context to request
      (req as any).authContext = authResult.context;

      return handler(req, res);
    };
  };
}

/**
 * Compose authorization middleware with other middleware
 * 
 * @example
 * ```typescript
 * export default composeAuth(
 *   requireBillingAuth,
 *   requireUserDataAuth((req) => req.query.userId as string)
 * )(handler);
 * ```
 */
export function composeAuth(
  ...middlewares: Array<
    (handler: any) => (req: VercelRequest, res: VercelResponse) => Promise<void> | void
  >
) {
  return (handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}
