/**
 * Billing Middleware - CCC Economy Integration
 * 
 * Provides pre-operation balance checks and automatic credit deduction
 * for all billable API endpoints. Integrates with the BillingService to
 * enforce pay-per-action semantics across the platform.
 * 
 * Features:
 * - Pre-operation balance validation
 * - Atomic credit deduction
 * - Detailed error messages with balance information
 * - Operation cost tracking
 * - Automatic ledger recording
 * 
 * Error Codes:
 * - ERR_BILLING_INSUFFICIENT_FUNDS: User has insufficient CCC balance
 * - ERR_BILLING_TRANSACTION_FAILED: Billing transaction failed
 * - ERR_BILLING_AUTH_REQUIRED: Authentication required for billing
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3**
 * 
 * @module lib/middleware/billingMiddleware
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getBillingService } from '../billing/BillingService';
import { InsufficientFundsError, BillingTransactionError } from '../billing/errors';
import { getOperationCost, type OperationType } from '../billing/costs';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Billing middleware options
 */
export interface BillingMiddlewareOptions {
  /**
   * Operation type for cost lookup
   */
  operationType: OperationType;

  /**
   * Custom cost override (optional)
   * If provided, uses this instead of looking up from costs.ts
   */
  customCost?: number;

  /**
   * Custom description for the transaction
   */
  description?: string;

  /**
   * Additional metadata to store with the transaction
   */
  metadata?: Record<string, any>;

  /**
   * Function to extract user ID from request
   * Default: looks for req.userId (set by auth middleware)
   */
  getUserId?: (req: VercelRequest) => string | undefined;

  /**
   * Skip billing for certain requests
   * Useful for health checks, admin endpoints, etc.
   */
  skip?: (req: VercelRequest) => boolean;

  /**
   * Custom error handler
   * Called when billing fails, allows custom error responses
   */
  onError?: (
    error: Error,
    req: VercelRequest,
    res: VercelResponse
  ) => void | Promise<void>;
}

/**
 * Extended request type with billing information
 */
export interface BillingRequest extends VercelRequest {
  userId?: string;
  billing?: {
    charged: boolean;
    cost: number;
    balanceBefore: number;
    balanceAfter: number;
    transactionId: string;
  };
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

  // Check Authorization header for user ID (fallback)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // This is a simplified extraction - in production, decode JWT properly
    // For now, we rely on auth middleware setting req.userId
    return undefined;
  }

  return undefined;
}

/**
 * Generate transaction description
 */
function generateDescription(
  operationType: OperationType,
  customDescription?: string
): string {
  if (customDescription) {
    return customDescription;
  }

  // Generate default description based on operation type
  const descriptions: Record<OperationType, string> = {
    GEO_AUDIT: 'GEO Audit - Website analysis',
    API_CALL_BASIC: 'API Call - Basic operation',
    API_CALL_ADVANCED: 'API Call - Advanced operation',
    AGENT_CONSENSUS: 'Agent Consensus - Byzantine fault-tolerant coordination',
    KNOWLEDGE_GRAPH_SYNC: 'Knowledge Graph Sync - Graph database update',
    CITATION_INTELLIGENCE: 'Citation Intelligence - Predictive analysis',
    REALTIME_CONTENT_ANALYSIS: 'Real-time Content Analysis - Live scoring',
    COMPETITIVE_INTELLIGENCE: 'Competitive Intelligence - Market analysis',
    CAUSAL_TRACER: 'Causal Tracer - Counterfactual simulation',
    A2A_OPERATION: 'Agent-to-Agent Protocol - Message processing',
  };

  return descriptions[operationType];
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Billing middleware for API endpoints
 * 
 * Performs pre-operation balance check and deducts credits atomically.
 * If the user has insufficient funds, returns 402 Payment Required.
 * If billing transaction fails, returns 500 Internal Server Error.
 * 
 * @example
 * ```typescript
 * // Basic usage
 * export default withBilling(handler, {
 *   operationType: 'GEO_AUDIT'
 * });
 * 
 * // With custom description
 * export default withBilling(handler, {
 *   operationType: 'API_CALL_ADVANCED',
 *   description: 'Citation prediction analysis'
 * });
 * 
 * // With custom cost
 * export default withBilling(handler, {
 *   operationType: 'API_CALL_BASIC',
 *   customCost: 0.5,
 *   description: 'Custom operation'
 * });
 * ```
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3**
 */
export function withBilling(
  handler: (req: BillingRequest, res: VercelResponse) => Promise<void> | void,
  options: BillingMiddlewareOptions
) {
  return async (req: BillingRequest, res: VercelResponse) => {
    // Skip billing if specified
    if (options.skip && options.skip(req)) {
      return handler(req, res);
    }

    // Extract user ID
    const getUserIdFn = options.getUserId || extractUserId;
    const userId = getUserIdFn(req);

    if (!userId) {
      // No user ID - authentication required
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be authenticated to use this endpoint',
        code: 'ERR_BILLING_AUTH_REQUIRED',
      });
    }

    // Get operation cost
    const cost = options.customCost ?? getOperationCost(options.operationType);

    // Generate description
    const description = generateDescription(
      options.operationType,
      options.description
    );

    // Prepare metadata
    const metadata = {
      operation_type: options.operationType,
      endpoint: req.url,
      method: req.method,
      ...options.metadata,
    };

    try {
      // Get billing service
      const billingService = getBillingService();

      // Get current balance (for error messages)
      const balanceBefore = await billingService.getBalance(userId);

      // Charge user (performs balance check and deduction atomically)
      const result = await billingService.chargeUser(
        userId,
        cost,
        description,
        metadata
      );

      // Attach billing info to request for handler access
      req.billing = {
        charged: true,
        cost,
        balanceBefore,
        balanceAfter: result.newBalance,
        transactionId: result.transactionId,
      };

      // Add billing headers to response
      res.setHeader('X-CCC-Cost', cost.toString());
      res.setHeader('X-CCC-Balance', result.newBalance.toString());
      res.setHeader('X-CCC-Transaction-Id', result.transactionId);

      // Continue to handler
      return handler(req, res);
    } catch (error) {
      // Handle custom error handler
      if (options.onError) {
        return options.onError(error as Error, req, res);
      }

      // Handle insufficient funds error
      if (error instanceof InsufficientFundsError) {
        return res.status(402).json({
          error: 'Insufficient funds',
          message: error.message,
          code: 'ERR_BILLING_INSUFFICIENT_FUNDS',
          details: {
            required: error.required,
            available: error.available,
            operation: error.operation,
            cost,
          },
        });
      }

      // Handle billing transaction error
      if (error instanceof BillingTransactionError) {
        console.error('Billing transaction failed:', error);
        return res.status(500).json({
          error: 'Billing transaction failed',
          message: 'Failed to process billing transaction. Please try again.',
          code: 'ERR_BILLING_TRANSACTION_FAILED',
        });
      }

      // Handle unexpected errors
      console.error('Unexpected billing error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred during billing',
        code: 'ERR_BILLING_UNKNOWN',
      });
    }
  };
}

/**
 * Compose multiple middleware functions
 * Useful for combining auth, rate limiting, and billing
 * 
 * @example
 * ```typescript
 * export default compose(
 *   requireAuth,
 *   withRateLimit,
 *   withBilling({ operationType: 'GEO_AUDIT' })
 * )(handler);
 * ```
 */
export function compose(
  ...middlewares: Array<
    (handler: any) => (req: VercelRequest, res: VercelResponse) => Promise<void> | void
  >
) {
  return (handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void) => {
    return middlewares.reduceRight(
      (acc, middleware) => middleware(acc),
      handler
    );
  };
}

/**
 * Check if user has sufficient balance without charging
 * Useful for pre-flight checks or UI display
 * 
 * @example
 * ```typescript
 * const canAfford = await checkBalance(userId, 'GEO_AUDIT');
 * if (!canAfford.sufficient) {
 *   return res.status(402).json({
 *     error: 'Insufficient funds',
 *     required: canAfford.required,
 *     available: canAfford.available
 *   });
 * }
 * ```
 */
export async function checkBalance(
  userId: string,
  operationType: OperationType,
  customCost?: number
): Promise<{
  sufficient: boolean;
  required: number;
  available: number;
  shortfall?: number;
}> {
  const billingService = getBillingService();
  const cost = customCost ?? getOperationCost(operationType);
  const balance = await billingService.getBalance(userId);

  const sufficient = balance >= cost;
  const shortfall = sufficient ? undefined : cost - balance;

  return {
    sufficient,
    required: cost,
    available: balance,
    shortfall,
  };
}

/**
 * Get user's current CCC balance
 * Convenience function for balance queries
 * 
 * @example
 * ```typescript
 * const balance = await getUserBalance(userId);
 * res.json({ balance });
 * ```
 */
export async function getUserBalance(userId: string): Promise<number> {
  const billingService = getBillingService();
  return billingService.getBalance(userId);
}
