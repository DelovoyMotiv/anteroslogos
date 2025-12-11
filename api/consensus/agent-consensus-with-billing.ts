/**
 * Agent Consensus API Endpoint - WITH BILLING
 * 
 * This is an example implementation showing how to add billing to agent consensus endpoints.
 * Create this endpoint to enable Byzantine fault-tolerant consensus operations.
 * 
 * POST /api/consensus/agent - Execute consensus operation (BILLABLE)
 * GET /api/consensus/agent - Return consensus API documentation (FREE)
 * 
 * Cost: 5 CCC (~$1 USD) per consensus operation
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3**
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { compose } from '../../lib/middleware/billingMiddleware';
import { withAgentConsensusBilling } from '../../lib/middleware/billingPresets';
import { requireAuth } from '../../lib/auth/jwtMiddleware';
import { withRateLimit } from '../../lib/middleware/rateLimiter';

// ============================================================================
// TYPES
// ============================================================================

interface ConsensusRequest {
  operation: 'validate' | 'vote' | 'commit';
  data: {
    proposalId: string;
    value: any;
    signature?: string;
  };
  options?: {
    timeout?: number;
    quorum?: number;
  };
}

interface ConsensusResponse {
  success: boolean;
  consensusReached: boolean;
  votes: {
    agree: number;
    disagree: number;
    abstain: number;
  };
  result?: any;
  timestamp: string;
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Agent consensus handler
 * 
 * Implements Byzantine fault-tolerant consensus for multi-agent coordination.
 * Charges 5 CCC per consensus operation.
 */
async function agentConsensusHandler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Handle GET request (documentation)
  if (req.method === 'GET') {
    return res.status(200).json({
      name: 'Agent Consensus API',
      version: '1.0.0',
      description: 'Byzantine fault-tolerant consensus for multi-agent coordination',
      cost: {
        ccc: 5,
        usd: 1.0,
      },
      endpoints: {
        POST: {
          description: 'Execute consensus operation',
          authentication: 'Required (Bearer token)',
          rateLimit: '60 requests per minute',
          billing: '5 CCC per operation',
        },
        GET: {
          description: 'API documentation',
          authentication: 'Not required',
          billing: 'Free',
        },
      },
      operations: [
        {
          name: 'validate',
          description: 'Validate a proposal without voting',
          cost: 5,
        },
        {
          name: 'vote',
          description: 'Cast a vote on a proposal',
          cost: 5,
        },
        {
          name: 'commit',
          description: 'Commit a consensus result',
          cost: 5,
        },
      ],
    });
  }

  // Handle POST request (consensus operation)
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      allowed: ['GET', 'POST'],
    });
  }

  // Validate request body
  const { operation, data }: ConsensusRequest = req.body;

  if (!operation || !data) {
    return res.status(400).json({
      error: 'Bad request',
      message: 'Missing required fields: operation, data',
    });
  }

  if (!['validate', 'vote', 'commit'].includes(operation)) {
    return res.status(400).json({
      error: 'Bad request',
      message: 'Invalid operation. Must be one of: validate, vote, commit',
    });
  }

  try {
    // Execute consensus operation
    // In production, this would call the actual consensus implementation
    // from lib/consensus/hotstuff.ts or lib/bft/pbftConsensus.ts
    
    const result: ConsensusResponse = {
      success: true,
      consensusReached: true,
      votes: {
        agree: 3,
        disagree: 0,
        abstain: 0,
      },
      result: {
        proposalId: data.proposalId,
        value: data.value,
        status: 'committed',
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(result);
  } catch (error) {
    console.error('Consensus operation failed:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Consensus operation failed',
    });
  }
}

// ============================================================================
// EXPORT WITH BILLING
// ============================================================================

/**
 * Export handler with full middleware stack
 * 
 * Middleware order:
 * 1. Authentication (requireAuth)
 * 2. Rate limiting (60 req/min)
 * 3. Billing (5 CCC per operation)
 * 4. Handler logic
 */
export default compose(
  requireAuth,
  withRateLimit,
  (handler) => withAgentConsensusBilling(handler, {
    // Skip billing for GET requests (documentation)
    skip: (req) => req.method === 'GET',
    
    // Custom description with operation type
    description: 'Agent Consensus - Byzantine fault-tolerant coordination',
    
    // Add request metadata
    metadata: {
      endpoint: '/api/consensus/agent',
      protocol: 'consensus',
      version: '1.0.0',
    },
  })
)(agentConsensusHandler);

/**
 * INTEGRATION INSTRUCTIONS:
 * 
 * To create and deploy this consensus endpoint:
 * 
 * 1. Create the endpoint file:
 *    mkdir -p api/consensus
 *    cp api/consensus/agent-consensus-with-billing.ts api/consensus/agent.ts
 * 
 * 2. Implement actual consensus logic:
 *    - Import consensus implementation from lib/consensus/hotstuff.ts
 *    - Or use PBFT from lib/bft/pbftConsensus.ts
 *    - Connect to consensus network
 *    - Handle proposal validation, voting, and commitment
 * 
 * 3. Test the integration:
 *    - Test POST with sufficient balance (should succeed and charge 5 CCC)
 *    - Test POST with insufficient balance (should return 402)
 *    - Test GET (should not charge, documentation is free)
 *    - Test all operations (validate, vote, commit)
 *    - Verify ledger records are created
 *    - Verify balance updates correctly
 * 
 * 4. Update API documentation:
 *    - Add consensus endpoint to API docs
 *    - Document the 402 error response
 *    - Add X-CCC-* headers to response documentation
 *    - Document consensus protocol details
 * 
 * Example consensus request with billing:
 * 
 * ```bash
 * curl -X POST https://anoteroslogos.com/api/consensus/agent \
 *   -H "Authorization: Bearer YOUR_TOKEN" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "operation": "vote",
 *     "data": {
 *       "proposalId": "prop-123",
 *       "value": {
 *         "action": "approve",
 *         "reason": "Meets quality standards"
 *       }
 *     },
 *     "options": {
 *       "timeout": 30000,
 *       "quorum": 3
 *     }
 *   }'
 * ```
 * 
 * Response headers will include:
 * - X-CCC-Cost: 5
 * - X-CCC-Balance: 95
 * - X-CCC-Transaction-Id: <uuid>
 * 
 * SPECIAL CONSIDERATIONS:
 * 
 * 1. Consensus Timeout: Consensus operations may take time. Consider:
 *    - Charging upfront before starting consensus
 *    - Implementing timeout handling
 *    - Refunding if consensus fails due to timeout
 * 
 * 2. Partial Consensus: If consensus fails to reach quorum:
 *    - Still charge for the attempt (resources were used)
 *    - Return clear error message
 *    - Log for monitoring
 * 
 * 3. Multi-Agent Coordination: When multiple agents participate:
 *    - Each agent pays for their own operations
 *    - Track which agent initiated the consensus
 *    - Record all participants in metadata
 * 
 * 4. Consensus Types: Different consensus operations might have different costs:
 *    - validate: 2 CCC (lightweight check)
 *    - vote: 5 CCC (full consensus round)
 *    - commit: 5 CCC (finalization)
 * 
 * Example with operation-based pricing:
 * 
 * ```typescript
 * const handlerWithBilling = withBilling(agentConsensusHandler, {
 *   operationType: 'AGENT_CONSENSUS',
 *   customCost: (req) => {
 *     const operation = req.body?.operation;
 *     if (operation === 'validate') return 2;
 *     if (operation === 'vote') return 5;
 *     if (operation === 'commit') return 5;
 *     return 5; // default
 *   },
 * });
 * ```
 * 
 * MONITORING:
 * 
 * Track these metrics for consensus operations:
 * - Consensus success rate
 * - Average consensus time
 * - Quorum achievement rate
 * - Cost per consensus operation
 * - Failed consensus attempts (still charged)
 */
