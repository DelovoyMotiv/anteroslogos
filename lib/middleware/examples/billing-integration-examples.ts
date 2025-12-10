/**
 * Billing Middleware Integration Examples
 * 
 * This file demonstrates how to integrate billing middleware into existing API endpoints.
 * These are examples showing the pattern - actual integration should be done in the
 * respective endpoint files.
 * 
 * @module lib/middleware/examples/billing-integration-examples
 */

// @ts-nocheck - This is an example file with demonstration code

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withBilling, compose } from '../billingMiddleware';
import {
  withGeoAuditBilling,
  withApiWrapperBilling,
  withAgentConsensusBilling,
} from '../billingPresets';
import { requireAuth } from '../../auth/jwtMiddleware';
import { withRateLimit } from '../rateLimiter';

// ============================================================================
// EXAMPLE 1: GEO AUDIT ENDPOINT
// ============================================================================

/**
 * Example: Adding billing to a GEO audit endpoint
 * 
 * Before:
 * ```typescript
 * export default async function handler(req: VercelRequest, res: VercelResponse) {
 *   // ... audit logic
 * }
 * ```
 * 
 * After:
 * ```typescript
 * async function handler(req: VercelRequest, res: VercelResponse) {
 *   // ... audit logic
 * }
 * 
 * export default withGeoAuditBilling(handler);
 * ```
 */
async function geoAuditHandler(req: VercelRequest, res: VercelResponse) {
  // Your existing GEO audit logic here
  const { url } = req.body;
  
  // Perform audit...
  const result = { score: 85, recommendations: [] };
  
  return res.status(200).json(result);
}

// Export with billing middleware
export const geoAuditWithBilling = withGeoAuditBilling(geoAuditHandler);

// ============================================================================
// EXAMPLE 2: API WRAPPER ENDPOINT (Agent Middleware)
// ============================================================================

/**
 * Example: Adding billing to the agent wrapper endpoint
 * 
 * The agent wrapper endpoint already has auth and rate limiting.
 * We need to add billing as an additional layer.
 * 
 * Pattern: Auth -> Rate Limit -> Billing -> Handler
 */
async function agentWrapHandler(req: VercelRequest, res: VercelResponse) {
  // Your existing agent wrap logic here
  const { url, options } = req.body;
  
  // Extract and process content...
  const result = { content: '...', entities: [] };
  
  return res.status(200).json(result);
}

// Compose multiple middleware layers
export const agentWrapWithBilling = compose(
  requireAuth,
  withRateLimit,
  withApiWrapperBilling
)(agentWrapHandler);

// ============================================================================
// EXAMPLE 3: AGENT CONSENSUS ENDPOINT
// ============================================================================

/**
 * Example: Adding billing to agent consensus endpoint
 * 
 * For consensus operations, we want to:
 * 1. Authenticate the user
 * 2. Check rate limits
 * 3. Verify sufficient CCC balance
 * 4. Charge for the operation
 * 5. Execute consensus
 */
async function agentConsensusHandler(req: VercelRequest, res: VercelResponse) {
  // Your existing consensus logic here
  const { operation, data } = req.body;
  
  // Perform consensus...
  const result = { consensus: true, votes: [] };
  
  return res.status(200).json(result);
}

// Export with full middleware stack
export const agentConsensusWithBilling = compose(
  requireAuth,
  withRateLimit,
  withAgentConsensusBilling
)(agentConsensusHandler);

// ============================================================================
// EXAMPLE 4: CUSTOM BILLING CONFIGURATION
// ============================================================================

/**
 * Example: Custom billing configuration for special cases
 * 
 * Sometimes you need custom costs or descriptions.
 * Use the base withBilling function with custom options.
 */
async function customOperationHandler(req: VercelRequest, res: VercelResponse) {
  const { operationType } = req.body;
  
  // Custom logic...
  return res.status(200).json({ success: true });
}

export const customOperationWithBilling = withBilling(customOperationHandler, {
  operationType: 'API_CALL_ADVANCED',
  customCost: 2.5, // Custom cost override
  description: 'Custom operation - Special processing',
  metadata: {
    feature: 'custom-operation',
    version: '1.0',
  },
});

// ============================================================================
// EXAMPLE 5: CONDITIONAL BILLING
// ============================================================================

/**
 * Example: Skip billing for certain requests
 * 
 * Useful for health checks, admin endpoints, or free tier operations.
 */
async function conditionalHandler(req: VercelRequest, res: VercelResponse) {
  // Your logic here
  return res.status(200).json({ success: true });
}

export const conditionalBilling = withBilling(conditionalHandler, {
  operationType: 'API_CALL_BASIC',
  skip: (req) => {
    // Skip billing for health checks
    if (req.url === '/api/health') {
      return true;
    }
    
    // Skip billing for admin users
    const user = (req as any).user;
    if (user?.role === 'admin') {
      return true;
    }
    
    return false;
  },
});

// ============================================================================
// EXAMPLE 6: CUSTOM ERROR HANDLING
// ============================================================================

/**
 * Example: Custom error handling for billing failures
 * 
 * Useful when you want to provide custom error responses or logging.
 */
async function customErrorHandler(req: VercelRequest, res: VercelResponse) {
  // Your logic here
  return res.status(200).json({ success: true });
}

export const customErrorBilling = withBilling(customErrorHandler, {
  operationType: 'GEO_AUDIT',
  onError: async (error, req, res) => {
    // Log to custom monitoring service
    console.error('Billing error:', {
      error: error.message,
      userId: (req as any).userId,
      endpoint: req.url,
    });
    
    // Return custom error response
    return res.status(402).json({
      error: 'Payment Required',
      message: 'Please add credits to your account to continue',
      supportUrl: 'https://anoteroslogos.com/billing/support',
    });
  },
});

// ============================================================================
// EXAMPLE 7: ACCESSING BILLING INFO IN HANDLER
// ============================================================================

/**
 * Example: Accessing billing information in your handler
 * 
 * The billing middleware attaches billing info to the request object.
 * You can access this in your handler for logging or response data.
 */
import type { BillingRequest } from '../billingMiddleware';

async function billingInfoHandler(req: BillingRequest, res: VercelResponse) {
  // Access billing information
  const billingInfo = req.billing;
  
  if (billingInfo) {
    console.log('Operation charged:', {
      cost: billingInfo.cost,
      balanceBefore: billingInfo.balanceBefore,
      balanceAfter: billingInfo.balanceAfter,
      transactionId: billingInfo.transactionId,
    });
  }
  
  // Include billing info in response
  return res.status(200).json({
    success: true,
    billing: {
      charged: billingInfo?.cost,
      remainingBalance: billingInfo?.balanceAfter,
    },
  });
}

export const billingInfoExample = withBilling(billingInfoHandler, {
  operationType: 'API_CALL_BASIC',
});

// ============================================================================
// EXAMPLE 8: PRE-FLIGHT BALANCE CHECK
// ============================================================================

/**
 * Example: Check balance before expensive operations
 * 
 * For operations that might take a long time, you can check the balance
 * before starting the work.
 */
import { checkBalance } from '../billingMiddleware';

async function expensiveOperationHandler(req: VercelRequest, res: VercelResponse) {
  const userId = (req as any).userId;
  
  // Check balance before starting expensive work
  const balanceCheck = await checkBalance(userId, 'GEO_AUDIT');
  
  if (!balanceCheck.sufficient) {
    return res.status(402).json({
      error: 'Insufficient funds',
      required: balanceCheck.required,
      available: balanceCheck.available,
      shortfall: balanceCheck.shortfall,
    });
  }
  
  // Start expensive operation...
  // The billing middleware will charge when the request completes
  
  return res.status(200).json({ success: true });
}

export const expensiveOperationWithCheck = withBilling(expensiveOperationHandler, {
  operationType: 'GEO_AUDIT',
});

// ============================================================================
// INTEGRATION CHECKLIST
// ============================================================================

/**
 * INTEGRATION CHECKLIST
 * 
 * When adding billing to an endpoint:
 * 
 * 1. ✅ Identify the operation type (GEO_AUDIT, API_CALL_ADVANCED, etc.)
 * 2. ✅ Choose the appropriate preset or use withBilling directly
 * 3. ✅ Ensure authentication middleware runs BEFORE billing
 * 4. ✅ Consider rate limiting (should run before billing)
 * 5. ✅ Test insufficient funds scenario (402 response)
 * 6. ✅ Test successful billing (check ledger and balance)
 * 7. ✅ Verify transaction metadata is recorded correctly
 * 8. ✅ Check that balance headers are set (X-CCC-Balance, X-CCC-Cost)
 * 9. ✅ Test error handling (transaction failures)
 * 10. ✅ Update API documentation with billing information
 * 
 * MIDDLEWARE ORDER:
 * 
 * Correct order: Auth -> Rate Limit -> Billing -> Handler
 * 
 * Why this order?
 * - Auth first: No point checking rate limits or billing for unauthenticated users
 * - Rate limit second: Prevent abuse before consuming credits
 * - Billing third: Only charge if request passes auth and rate limits
 * - Handler last: Execute business logic after all checks pass
 * 
 * TESTING:
 * 
 * Test scenarios:
 * 1. Successful operation with sufficient balance
 * 2. Insufficient funds (402 response)
 * 3. Unauthenticated request (401 response)
 * 4. Rate limit exceeded (429 response)
 * 5. Billing transaction failure (500 response)
 * 6. Balance updates correctly in database
 * 7. Ledger records created with correct metadata
 * 8. Response headers include billing information
 */
