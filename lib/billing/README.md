# CCC Billing System

## Overview

The CCC (Causal Contribution Credits) Billing System is a comprehensive, usage-based payment infrastructure for the Anóteros Lógos platform. It replaces traditional subscription models with a flexible, pay-per-action credit system.

**Key Features:**
- ✅ Usage-based pricing (pay only for what you use)
- ✅ Multiple payment methods (Stripe, cryptocurrency)
- ✅ Immutable transaction ledger for auditability
- ✅ Atomic operations with race condition protection
- ✅ Real-time balance updates
- ✅ Comprehensive transaction history
- ✅ Automatic subscription migration

---

## Quick Start

### Installation

The billing system is integrated into the main application. No separate installation required.

### Basic Usage

```typescript
import { getBillingService } from '@/lib/billing/BillingService';
import { getOperationCost } from '@/lib/billing/costs';

// Get billing service instance
const billingService = getBillingService();

// Check user balance
const balance = await billingService.getBalance(userId);
console.log(`Balance: ${balance} CCC`);

// Get operation cost
const cost = getOperationCost('GEO_AUDIT'); // 50 CCC

// Charge user
try {
  const result = await billingService.chargeUser(
    userId,
    cost,
    'GEO Audit for example.com',
    { operation_type: 'GEO_AUDIT', url: 'example.com' }
  );
  
  console.log(`Charged ${cost} CCC. New balance: ${result.newBalance}`);
} catch (error) {
  if (error instanceof InsufficientFundsError) {
    console.error(`Insufficient funds: need ${error.required}, have ${error.available}`);
  }
}
```

---

## Documentation

### For Developers

- **[API Reference](./API_REFERENCE.md)** - Complete API documentation for all endpoints and methods
- **[Inline Code Documentation](./BillingService.ts)** - JSDoc comments in source code
- **[Cost Configuration](./costs.ts)** - Operation costs and pricing

### For Users

- **[User Guide](./USER_GUIDE.md)** - How to purchase and use credits
- **[FAQ](./USER_GUIDE.md#faq)** - Common questions and answers

### For Administrators

- **[Migration Guide](./MIGRATION_ADMIN_GUIDE.md)** - Subscription migration procedures
- **[Security Documentation](./SECURITY_README.md)** - Security policies and RLS
- **[Crypto Payments](./CRYPTO_PAYMENTS.md)** - Cryptocurrency integration

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Dashboard  │  │ Credit Store │  │  Transaction │      │
│  │   (Balance)  │  │  (Purchase)  │  │   History    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     API/Middleware Layer                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           BillingService (BillingService.ts)         │   │
│  │  • chargeUser()                                      │   │
│  │  • getBalance()                                      │   │
│  │  • getTransactionHistory()                           │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Cost Configuration (costs.ts)                │   │
│  │  • GEO_AUDIT: 50 CCC                                 │   │
│  │  • API_CALL: 0.1 CCC                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Payment Processors                      │
│  ┌──────────────┐              ┌──────────────┐            │
│  │    Stripe    │              │  Crypto/USDC │            │
│  │   (stripe.ts)│              │  (crypto.ts) │            │
│  └──────────────┘              └──────────────┘            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Database Layer                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         billing_ledger (Append-Only)                 │   │
│  │  • Immutable transaction log                         │   │
│  │  • RLS: Users see only their records                │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         user_balances (Cached)                       │   │
│  │  • Fast O(1) balance lookups                         │   │
│  │  • Auto-updated via triggers                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**Credit Purchase (Stripe):**
```
User → Frontend → Stripe Checkout → Stripe Webhook → 
  → Calculate CCC → Insert DEPOSIT_STRIPE → Update Balance → Notify User
```

**Credit Expenditure:**
```
User → API Request → Billing Service → Check Balance → 
  → (Sufficient) → Deduct Credits → Insert SPEND → Execute Operation
  → (Insufficient) → Return InsufficientFundsError
```

---

## Core Concepts

### CCC (Causal Contribution Credits)

The platform's native currency token. All operations cost CCC.

**Anchor Price:** 100 CCC ≈ $20 USD ($0.20 per CCC)

### Ledger

An append-only, immutable transaction log stored in the `billing_ledger` table. Every credit movement (deposit or charge) is recorded as a ledger entry.

**Properties:**
- Immutable (no updates or deletes)
- Chronologically ordered
- Includes full metadata
- Protected by RLS policies

### Balance

The user's current available credits, calculated as:

```
Balance = Sum of all deposits - Sum of all charges
```

Balances are cached in `user_balances` table for fast O(1) lookups and automatically updated via database triggers.

### Atomic Transactions

All billing operations are atomic - they either complete entirely or fail entirely. This prevents:
- Partial charges
- Race conditions
- Inconsistent state

---

## File Structure

```
lib/billing/
├── README.md                      # This file
├── API_REFERENCE.md               # Complete API documentation
├── USER_GUIDE.md                  # User-facing documentation
├── MIGRATION_ADMIN_GUIDE.md       # Admin migration guide
├── SECURITY_README.md             # Security policies
├── CRYPTO_PAYMENTS.md             # Crypto integration docs
│
├── BillingService.ts              # Core billing service
├── MigrationService.ts            # Subscription migration
├── stripe.ts                      # Stripe integration
├── crypto.ts                      # Cryptocurrency payments
├── costs.ts                       # Operation cost configuration
├── errors.ts                      # Error types
├── types.ts                       # TypeScript types
├── auditLogger.ts                 # Audit logging
├── authorizationMiddleware.ts     # Authorization checks
├── webhookRetry.ts                # Webhook retry logic
│
└── __tests__/                     # Test files
    ├── BillingService.property.test.ts
    ├── MigrationService.property.test.ts
    ├── stripe.property.test.ts
    ├── costs.property.test.ts
    └── ...
```

---

## Key Files

### BillingService.ts

Core service for all billing operations. Provides methods for:
- Balance queries
- Credit charges
- Credit deposits
- Transaction history

**Usage:**
```typescript
import { getBillingService } from '@/lib/billing/BillingService';
const billingService = getBillingService();
```

### costs.ts

Centralized configuration for all operation costs. Single source of truth for pricing.

**Usage:**
```typescript
import { getOperationCost } from '@/lib/billing/costs';
const cost = getOperationCost('GEO_AUDIT'); // 50 CCC
```

### stripe.ts

Stripe payment integration. Handles:
- Checkout session creation
- Webhook processing
- Payment verification

### crypto.ts

Cryptocurrency payment integration. Handles:
- USDC transaction verification
- On-chain payment processing
- Blockchain monitoring

### MigrationService.ts

Legacy subscription migration. Converts old subscriptions to CCC credits.

---

## Environment Variables

Required environment variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Stripe
STRIPE_SECRET_KEY=sk_xxx...
STRIPE_WEBHOOK_SECRET=whsec_xxx...

# Cryptocurrency (optional)
PLATFORM_WALLET_ADDRESS=0x...
ETHEREUM_RPC_URL=https://...
BASE_RPC_URL=https://...
BASE_SEPOLIA_RPC_URL=https://...
SEPOLIA_RPC_URL=https://...

# Site URL
VITE_SITE_URL=https://example.com
```

---

## Database Schema

### billing_ledger

Immutable transaction log.

```sql
CREATE TABLE billing_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount DECIMAL(12, 6) NOT NULL,  -- Negative for spend, positive for deposit
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**Event Types:**
- `DEPOSIT_STRIPE`: Credit purchase via Stripe
- `DEPOSIT_CRYPTO`: Cryptocurrency payment
- `MIGRATION_CREDIT`: Subscription migration
- `SPEND_AUDIT`: GEO audit charge
- `SPEND_API`: API call charge
- `SPEND_CONSENSUS`: Agent consensus charge

### user_balances

Cached balance for fast lookups.

```sql
CREATE TABLE user_balances (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  balance DECIMAL(12, 6) NOT NULL DEFAULT 0,
  last_transaction_id UUID REFERENCES billing_ledger(id),
  last_updated TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

Auto-updated via trigger on `billing_ledger` inserts.

---

## Security

### Row Level Security (RLS)

All billing tables use RLS policies:

- **billing_ledger**: Users can only SELECT their own records
- **user_balances**: Users can only SELECT their own balance
- **INSERT operations**: Only service role can insert

### Authorization

All API endpoints require valid JWT token. Authorization middleware checks:
- Token validity
- User identity
- Operation permissions

### Audit Logging

All billing operations are logged to audit system:
- Balance checks
- Credit charges
- Credit deposits
- Insufficient funds errors
- Transaction errors

---

## Error Handling

### Error Types

**InsufficientFundsError**
```typescript
class InsufficientFundsError extends Error {
  required: number;      // CCC required
  available: number;     // CCC available
  operation: string;     // Operation description
}
```

**BillingTransactionError**
```typescript
class BillingTransactionError extends Error {
  userId: string;
  operation: string;
  cause: Error;
}
```

**MigrationError**
```typescript
class MigrationError extends Error {
  userId: string;
  reason: string;
}
```

### Error Handling Best Practices

```typescript
try {
  await billingService.chargeUser(userId, cost, description);
} catch (error) {
  if (error instanceof InsufficientFundsError) {
    // Show user-friendly message
    showPurchasePrompt(error.required - error.available);
  } else if (error instanceof BillingTransactionError) {
    // Log and retry
    console.error('Transaction failed:', error.cause);
    scheduleRetry();
  } else {
    // Unknown error
    console.error('Unexpected error:', error);
    showGenericError();
  }
}
```

---

## Testing

### Property-Based Tests

All core functionality is tested with property-based tests using `fast-check`:

- **BillingService**: Balance calculations, atomic operations, concurrency
- **MigrationService**: Credit calculations, idempotency
- **Stripe**: Deposit calculations, session creation
- **Costs**: Configuration consistency, metadata completeness

**Run tests:**
```bash
npm test lib/billing
```

### Test Coverage

- Unit tests for individual functions
- Property tests for universal properties
- Integration tests for end-to-end flows
- Security tests for RLS policies

---

## Monitoring

### Metrics to Track

- Total CCC in circulation
- Daily deposit volume (USD and CCC)
- Daily spend volume by operation type
- Average balance per user
- Insufficient funds error rate
- Webhook processing latency
- Migration success rate

### Alerts

- Webhook failures (> 5 in 10 minutes)
- Negative balances (should never happen)
- Ledger insert failures
- Migration errors
- Unusual spending patterns

---

## Common Tasks

### Check User Balance

```typescript
const balance = await billingService.getBalance(userId);
console.log(`Balance: ${balance} CCC`);
```

### Charge User for Operation

```typescript
const cost = getOperationCost('GEO_AUDIT');

try {
  const result = await billingService.chargeUser(
    userId,
    cost,
    'GEO Audit',
    { operation_type: 'GEO_AUDIT' }
  );
  console.log(`New balance: ${result.newBalance}`);
} catch (error) {
  // Handle error
}
```

### Get Transaction History

```typescript
const transactions = await billingService.getTransactionHistory(
  userId,
  { limit: 50, offset: 0 }
);

for (const tx of transactions) {
  console.log(`${tx.created_at}: ${tx.amount} CCC - ${tx.description}`);
}
```

### Migrate Subscription

```typescript
import { getMigrationService } from '@/lib/billing/MigrationService';

const migrationService = getMigrationService();
const result = await migrationService.migrateSubscription(userId);

if (result.success) {
  console.log(`Granted ${result.creditsGranted} CCC`);
}
```

---

## Troubleshooting

### Balance Not Updating

**Symptom:** Balance doesn't change after transaction

**Solution:**
```sql
-- Manually recalculate balance
INSERT INTO user_balances (user_id, balance, last_updated)
SELECT user_id, SUM(amount), NOW()
FROM billing_ledger
WHERE user_id = '<user_id>'
GROUP BY user_id
ON CONFLICT (user_id) DO UPDATE
SET balance = EXCLUDED.balance,
    last_updated = EXCLUDED.last_updated;
```

### Insufficient Funds Error

**Symptom:** User claims they have enough credits but operation fails

**Solution:**
1. Check actual balance: `SELECT * FROM user_balances WHERE user_id = '<user_id>'`
2. Verify ledger: `SELECT SUM(amount) FROM billing_ledger WHERE user_id = '<user_id>'`
3. Compare values - if different, recalculate balance

### Webhook Not Processing

**Symptom:** Stripe payment succeeded but credits not added

**Solution:**
1. Check webhook logs in Stripe dashboard
2. Verify webhook secret is correct
3. Check application logs for errors
4. Manually process webhook event if needed

### Migration Failed

**Symptom:** Subscription not migrated to CCC

**Solution:**
1. Check if already migrated: `SELECT * FROM billing_ledger WHERE user_id = '<user_id>' AND event_type = 'MIGRATION_CREDIT'`
2. Verify subscription status: `SELECT * FROM user_subscriptions WHERE user_id = '<user_id>'`
3. Re-run migration if needed

---

## Support

### Documentation

- [API Reference](./API_REFERENCE.md)
- [User Guide](./USER_GUIDE.md)
- [Migration Guide](./MIGRATION_ADMIN_GUIDE.md)

### Contact

- **Email**: support@anoteros-logos.com
- **GitHub Issues**: [repository]/issues
- **Documentation**: `/docs/billing`

---

## Changelog

### Version 1.0.0 (December 2025)

- Initial release of CCC billing system
- Stripe integration
- Cryptocurrency payment support
- Subscription migration
- Complete documentation

---

## License

Copyright © 2025 Anóteros Lógos. All rights reserved.

---

**Last Updated:** December 2025  
**Version:** 1.0.0
