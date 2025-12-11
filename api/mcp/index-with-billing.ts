/**
 * MCP API Endpoint - WITH BILLING
 * 
 * This is an example integration showing how to add billing to the MCP endpoint.
 * To activate billing, replace the export in api/mcp/index.ts with this implementation.
 * 
 * POST /api/mcp - Execute MCP tool calls (BILLABLE)
 * GET /api/mcp - Return MCP server information (FREE)
 * 
 * Cost: 0.5 CCC (~$0.10 USD) per advanced API call
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3**
 */

import { withApiWrapperBilling } from '../../lib/middleware/billingPresets';

// Import the original handler from index.ts
// In production, you would move the handler logic here or import it
import originalHandler from './index';

/**
 * Wrapped handler with billing middleware
 * 
 * Middleware stack:
 * 1. Rate limiting (100 req/min)
 * 2. Billing (0.5 CCC per call)
 * 3. Original handler logic (includes CORS and JSON-RPC validation)
 * 
 * Note: The original handler already has rate limiting at 100 req/min
 * We're adding billing on top of that
 */
const handlerWithBilling = withApiWrapperBilling(originalHandler, {
  // Skip billing for GET requests (server info)
  skip: (req) => req.method === 'GET',
  
  // Custom description based on MCP method
  description: 'MCP API - Tool execution',
  
  // Add request metadata
  metadata: {
    endpoint: '/api/mcp',
    protocol: 'mcp',
    version: '1.0.0',
  },
  
  // Extract user ID from request (MCP might use different auth)
  getUserId: (req) => {
    // Check for standard auth
    if ((req as any).userId) {
      return (req as any).userId;
    }
    
    // Check for API key in headers
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
      // In production, validate API key and get user ID
      // For now, return undefined to trigger auth error
      return undefined;
    }
    
    return undefined;
  },
});

export default handlerWithBilling;

/**
 * INTEGRATION INSTRUCTIONS:
 * 
 * To activate billing for the MCP endpoint:
 * 
 * 1. Backup the original file:
 *    cp api/mcp/index.ts api/mcp/index-original.ts
 * 
 * 2. Update api/mcp/index.ts to use billing:
 *    - Import the billing middleware
 *    - Wrap the handler with withApiWrapperBilling
 *    - Skip billing for GET requests (server info)
 *    - Handle authentication properly (MCP might use API keys)
 * 
 * 3. Test the integration:
 *    - Test POST with sufficient balance (should succeed and charge 0.5 CCC)
 *    - Test POST with insufficient balance (should return 402)
 *    - Test GET (should not charge, server info is free)
 *    - Test various MCP methods (tools/call, resources/read, etc.)
 *    - Verify ledger records are created with correct metadata
 *    - Verify balance updates correctly
 * 
 * 4. Update API documentation:
 *    - Add billing information to MCP documentation
 *    - Document the 402 error response
 *    - Add X-CCC-* headers to response documentation
 * 
 * Example MCP request with billing:
 * 
 * ```bash
 * curl -X POST https://anoteroslogos.com/api/mcp \
 *   -H "Authorization: Bearer YOUR_TOKEN" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "jsonrpc": "2.0",
 *     "id": 1,
 *     "method": "tools/call",
 *     "params": {
 *       "name": "auditSite",
 *       "arguments": {
 *         "url": "https://example.com"
 *       }
 *     }
 *   }'
 * ```
 * 
 * Response headers will include:
 * - X-CCC-Cost: 0.5
 * - X-CCC-Balance: 99.5
 * - X-CCC-Transaction-Id: <uuid>
 * 
 * SPECIAL CONSIDERATIONS:
 * 
 * 1. MCP Protocol: The MCP endpoint uses JSON-RPC protocol. Ensure billing
 *    errors are returned in JSON-RPC format when appropriate.
 * 
 * 2. Method-Based Pricing: Consider different costs for different MCP methods:
 *    - tools/call (expensive operations): 0.5 CCC
 *    - resources/read (simple reads): 0.1 CCC
 *    - prompts/get (template retrieval): 0.1 CCC
 * 
 * 3. Batch Requests: MCP supports batch requests. Consider charging per
 *    operation in the batch rather than per request.
 * 
 * Example with method-based pricing:
 * 
 * ```typescript
 * const handlerWithBilling = withBilling(originalHandler, {
 *   operationType: 'API_CALL_ADVANCED',
 *   customCost: (req) => {
 *     const method = req.body?.method;
 *     if (method === 'tools/call') return 0.5;
 *     if (method === 'resources/read') return 0.1;
 *     if (method === 'prompts/get') return 0.1;
 *     return 0.1; // default
 *   },
 * });
 * ```
 */
