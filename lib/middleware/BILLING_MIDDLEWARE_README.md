# Billing Middleware - CCC Economy Integration

Production-grade billing middleware for the CCC (Causal Contribution Credits) economy. Provides automatic credit deduction and balance validation for all billable API endpoints.

## Features

- ✅ **Pre-operation Balance Checks**: Validates sufficient funds before execution
- ✅ **Atomic Credit Deduction**: Ensures credits are deducted atomically with ledger recording
- ✅ **Detailed Error Messages**: Returns clear error messages with balance information
- ✅ **Operation Cost Tracking**: Automatically tracks costs from centralized configuration
- ✅ **Transaction Metadata**: Records operation details in the billing ledger
- ✅ **Flexible Configuration**: Supports custom costs, descriptions, and skip rules
- ✅ **Composable**: Works seamlessly with auth and rate limiting middleware

## Quick Start

### Basic Usage

```typescript
import { withGeoAuditBilling } from '@/lib/middleware/billingPresets';

async function handler(req: VercelRequest, res: VercelResponse) {
  // Your GEO audit logic here
  res.status(200).json({ score: 85 });
}

export default withGeoAuditBilling(handler);
```

### With Authentication and Rate Limiting

```typescript
import { compose } from '@/lib/middleware/billingMiddleware';
import { requireAuth } from '@/lib/auth/jwtMiddleware';
import { withRateLimit } from '@/lib/middleware/rateLimiter';
import { withApiWrapperBilling } from '@/lib/middleware/billingPresets';

async function handler(req: VercelRequest, res: VercelResponse) {
  // Your API wrapper logic here
  res.status(200).json({ content: '...' });
}

export default compose(
  requireAuth,
  withRateLimit,
  withApiWrapperBilling
)(handler);
```

## Available Presets

| Preset | Operation | Cost (CCC) | USD Equivalent |
|--------|-----------|------------|----------------|
| `withGeoAuditBilling` | GEO Audit | 50 | ~$10 |
| `withApiWrapperBilling` | API Wrapper | 0.5 | ~$0.10 |
| `withAgentConsensusBilling` | Agent Consensus | 5 | ~$1 |
| `withBasicApiBilling` | Basic API Call | 0.1 | ~$0.02 |
| `withCitationIntelligenceBilling` | Citation Intelligence | 2 | ~$0.40 |
| `withKnowledgeGraphBilling` | Knowledge Graph Sync | 10 | ~$2 |
| `withContentAnalysisBilling` | Content Analysis | 1 | ~$0.20 |
| `withCompetitiveIntelligenceBilling` | Competitive Intelligence | 25 | ~$5 |
| `withCausalTracerBilling` | Causal Tracer | 15 | ~$3 |
| `withA2ABilling` | A2A Operation | 0.2 | ~$0.04 |

## Custom Configuration

### Custom Cost

```typescript
import { withBilling } from '@/lib/middleware/billingMiddleware';

export default withBilling(handler, {
  operationType: 'API_CALL_ADVANCED',
  customCost: 2.5, // Override default cost
  description: 'Custom operation - Special processing',
});
```

### Custom Description and Metadata

```typescript
export default withBilling(handler, {
  operationType: 'GEO_AUDIT',
  description: 'GEO Audit - Premium analysis with AI',
  metadata: {
    feature: 'premium-audit',
    version: '2.0',
    aiEnabled: true,
  },
});
```

### Skip Billing for Certain Requests

```typescript
export default withBilling(handler, {
  operationType: 'API_CALL_BASIC',
  skip: (req) => {
    // Skip billing for health checks
    if (req.url === '/api/health') return true;
    
    // Skip billing for admin users
    const user = (req as any).user;
    if (user?.role === 'admin') return true;
    
    return false;
  },
});
```

### Custom Error Handling

```typescript
export default withBilling(handler, {
  operationType: 'GEO_AUDIT',
  onError: async (error, req, res) => {
    // Custom logging
    console.error('Billing error:', error);
    
    // Custom error response
    return res.status(402).json({
      error: 'Payment Required',
      message: 'Please add credits to continue',
      supportUrl: 'https://anoteroslogos.com/support',
    });
  },
});
```

## Response Headers

The billing middleware adds the following headers to successful responses:

```
X-CCC-Cost: 50
X-CCC-Balance: 450
X-CCC-Transaction-Id: 550e8400-e29b-41d4-a716-446655440000
```

## Error Responses

### 401 Unauthorized (No Authentication)

```json
{
  "error": "Authentication required",
  "message": "You must be authenticated to use this endpoint",
  "code": "ERR_BILLING_AUTH_REQUIRED"
}
```

### 402 Payment Required (Insufficient Funds)

```json
{
  "error": "Insufficient funds",
  "message": "Insufficient funds: GEO Audit requires 50 CCC, but only 25 CCC available",
  "code": "ERR_BILLING_INSUFFICIENT_FUNDS",
  "details": {
    "required": 50,
    "available": 25,
    "operation": "GEO Audit - Website analysis",
    "cost": 50
  }
}
```

### 500 Internal Server Error (Transaction Failed)

```json
{
  "error": "Billing transaction failed",
  "message": "Failed to process billing transaction. Please try again.",
  "code": "ERR_BILLING_TRANSACTION_FAILED"
}
```

## Accessing Billing Information

The billing middleware attaches billing information to the request object:

```typescript
import type { BillingRequest } from '@/lib/middleware/billingMiddleware';

async function handler(req: BillingRequest, res: VercelResponse) {
  // Access billing information
  if (req.billing) {
    console.log('Charged:', req.billing.cost);
    console.log('Balance before:', req.billing.balanceBefore);
    console.log('Balance after:', req.billing.balanceAfter);
    console.log('Transaction ID:', req.billing.transactionId);
  }
  
  // Include in response
  return res.status(200).json({
    success: true,
    billing: {
      charged: req.billing?.cost,
      remainingBalance: req.billing?.balanceAfter,
    },
  });
}
```

## Utility Functions

### Check Balance Without Charging

```typescript
import { checkBalance } from '@/lib/middleware/billingMiddleware';

const balanceCheck = await checkBalance(userId, 'GEO_AUDIT');

if (!balanceCheck.sufficient) {
  return res.status(402).json({
    error: 'Insufficient funds',
    required: balanceCheck.required,
    available: balanceCheck.available,
    shortfall: balanceCheck.shortfall,
  });
}
```

### Get User Balance

```typescript
import { getUserBalance } from '@/lib/middleware/billingMiddleware';

const balance = await getUserBalance(userId);
res.json({ balance });
```

## Middleware Composition

The correct order for middleware composition is:

**Auth → Rate Limit → Billing → Handler**

```typescript
import { compose } from '@/lib/middleware/billingMiddleware';
import { requireAuth } from '@/lib/auth/jwtMiddleware';
import { withRateLimit } from '@/lib/middleware/rateLimiter';
import { withGeoAuditBilling } from '@/lib/middleware/billingPresets';

export default compose(
  requireAuth,        // 1. Authenticate user
  withRateLimit,      // 2. Check rate limits
  withGeoAuditBilling // 3. Check balance and charge
)(handler);           // 4. Execute business logic
```

### Why This Order?

1. **Auth First**: No point checking rate limits or billing for unauthenticated users
2. **Rate Limit Second**: Prevent abuse before consuming credits
3. **Billing Third**: Only charge if request passes auth and rate limits
4. **Handler Last**: Execute business logic after all checks pass

## Integration Checklist

When adding billing to an endpoint:

- [ ] Identify the operation type (GEO_AUDIT, API_CALL_ADVANCED, etc.)
- [ ] Choose the appropriate preset or use `withBilling` directly
- [ ] Ensure authentication middleware runs BEFORE billing
- [ ] Consider rate limiting (should run before billing)
- [ ] Test insufficient funds scenario (402 response)
- [ ] Test successful billing (check ledger and balance)
- [ ] Verify transaction metadata is recorded correctly
- [ ] Check that balance headers are set
- [ ] Test error handling (transaction failures)
- [ ] Update API documentation with billing information

## Testing

### Test Scenarios

1. **Successful Operation**: User has sufficient balance
2. **Insufficient Funds**: User balance < operation cost (402 response)
3. **Unauthenticated**: No auth token provided (401 response)
4. **Rate Limited**: Too many requests (429 response)
5. **Transaction Failure**: Billing service error (500 response)
6. **Balance Updates**: Verify balance decreases correctly
7. **Ledger Records**: Verify transaction recorded with metadata
8. **Response Headers**: Verify X-CCC-* headers present

### Example Test

```typescript
import { describe, it, expect } from 'vitest';
import { withGeoAuditBilling } from '@/lib/middleware/billingPresets';

describe('GEO Audit Billing', () => {
  it('should charge user for GEO audit', async () => {
    const handler = withGeoAuditBilling(async (req, res) => {
      res.status(200).json({ success: true });
    });
    
    const req = {
      userId: 'user-123',
      method: 'POST',
      body: { url: 'https://example.com' },
    };
    
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      setHeader: vi.fn(),
    };
    
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.setHeader).toHaveBeenCalledWith('X-CCC-Cost', '50');
  });
  
  it('should return 402 for insufficient funds', async () => {
    // Mock user with low balance
    // ... test implementation
  });
});
```

## Production Considerations

### Database Transactions

The billing middleware uses atomic transactions to ensure:
- Balance checks and deductions happen atomically
- No race conditions with concurrent requests
- Automatic rollback on failures

### Error Logging

All billing errors are logged with context:

```typescript
console.error('Billing transaction failed:', {
  userId,
  operation,
  cost,
  error: error.message,
});
```

### Monitoring

Track these metrics:
- Insufficient funds error rate
- Billing transaction failure rate
- Average operation costs
- User balance distribution

### Alerting

Set up alerts for:
- High insufficient funds rate (> 10%)
- Billing transaction failures (> 1%)
- Negative balances (should never happen)

## Migration Guide

### From Legacy Subscription System

If migrating from the old subscription system:

1. Keep existing subscription checks temporarily
2. Add billing middleware to endpoints
3. Test with both systems running
4. Gradually migrate users to CCC economy
5. Remove subscription checks once migration complete

### Adding to Existing Endpoints

```typescript
// Before
export default async function handler(req, res) {
  // ... logic
}

// After
async function handler(req, res) {
  // ... logic
}

export default withGeoAuditBilling(handler);
```

## Troubleshooting

### Billing Not Working

1. Check Supabase configuration (URL and service role key)
2. Verify user authentication (req.userId should be set)
3. Check billing_ledger table exists
4. Verify user_balances table exists
5. Check database triggers are active

### Insufficient Funds Errors

1. Verify user balance: `SELECT * FROM user_balances WHERE user_id = '...'`
2. Check ledger history: `SELECT * FROM billing_ledger WHERE user_id = '...'`
3. Verify operation cost is correct
4. Check for negative balances (data integrity issue)

### Transaction Failures

1. Check Supabase logs for errors
2. Verify database connection
3. Check RLS policies allow service role inserts
4. Verify triggers are functioning

## API Reference

See [billing-integration-examples.ts](./examples/billing-integration-examples.ts) for complete examples.

## License

MIT

