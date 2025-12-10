/**
 * Agent Middleware API Endpoint - WITH BILLING
 * 
 * This is an example integration showing how to add billing to the agent wrap endpoint.
 * To activate billing, replace the export in api/v1/agent/wrap.ts with this implementation.
 * 
 * POST /api/v1/agent/wrap - Extract and serialize web content (BILLABLE)
 * GET /api/v1/agent/wrap - Return OpenAPI documentation (FREE)
 * 
 * Cost: 0.5 CCC (~$0.10 USD) per API call
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3**
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { compose } from '../../../lib/middleware/billingMiddleware';
import { withApiWrapperBilling } from '../../../lib/middleware/billingPresets';
import { withRateLimit } from '../../../lib/middleware/rateLimiter';

// Import the original handler from wrap.ts
// In production, you would move the handler logic here or import it
import originalHandler from './wrap';

/**
 * Wrapped handler with billing middleware
 * 
 * Middleware stack:
 * 1. Rate limiting (60 req/min authenticated, 10 req/min anonymous)
 * 2. Billing (0.5 CCC per call)
 * 3. Original handler logic
 * 
 * Note: Authentication is handled within the original handler via AuthMiddleware
 */
const handlerWithBilling = compose(
  withRateLimit,
  (handler) => withApiWrapperBilling(handler, {
    // Skip billing for GET requests (documentation)
    skip: (req) => req.method === 'GET',
    
    // Custom description with URL
    description: 'API Wrapper - Content extraction',
    
    // Add request metadata
    metadata: {
      endpoint: '/api/v1/agent/wrap',
      version: '1.0.0',
    },
  })
)(originalHandler);

export default handlerWithBilling;

/**
 * INTEGRATION INSTRUCTIONS:
 * 
 * To activate billing for the agent wrap endpoint:
 * 
 * 1. Backup the original file:
 *    cp api/v1/agent/wrap.ts api/v1/agent/wrap-original.ts
 * 
 * 2. Update api/v1/agent/wrap.ts to use billing:
 *    - Import the billing middleware
 *    - Wrap the handler with withApiWrapperBilling
 *    - Skip billing for GET requests (documentation)
 * 
 * 3. Test the integration:
 *    - Test POST with sufficient balance (should succeed and charge 0.5 CCC)
 *    - Test POST with insufficient balance (should return 402)
 *    - Test GET (should not charge, documentation is free)
 *    - Verify ledger records are created
 *    - Verify balance updates correctly
 * 
 * 4. Update API documentation:
 *    - Add billing information to OpenAPI spec
 *    - Document the 402 error response
 *    - Add X-CCC-* headers to response documentation
 * 
 * Example curl command with billing:
 * 
 * ```bash
 * curl -X POST https://anoteroslogos.com/api/v1/agent/wrap \
 *   -H "Authorization: Bearer YOUR_API_KEY" \
 *   -H "Content-Type: application/json" \
 *   -d '{"url": "https://example.com"}'
 * ```
 * 
 * Response headers will include:
 * - X-CCC-Cost: 0.5
 * - X-CCC-Balance: 99.5
 * - X-CCC-Transaction-Id: <uuid>
 */
