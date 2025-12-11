# CCC Billing System - API Reference

## Overview

The CCC (Causal Contribution Credits) Billing System provides a comprehensive API for managing credit-based payments, transaction tracking, and usage-based billing. This document describes all available endpoints, methods, and integration patterns.

**Base Concepts:**
- **CCC (Causal Contribution Credits)**: Platform currency token
- **Anchor Price**: 100 CCC ≈ $20 USD ($0.20 per CCC)
- **Ledger**: Immutable transaction log
- **Balance**: Computed from ledger entries

---

## Table of Contents

1. [Authentication](#authentication)
2. [REST API Endpoints](#rest-api-endpoints)
3. [BillingService Class](#billingservice-class)
4. [Stripe Integration](#stripe-integration)
5. [Cryptocurrency Payments](#cryptocurrency-payments)
6. [Migration Service](#migration-service)
7. [Error Handling](#error-handling)
8. [Rate Limits](#rate-limits)

---

## Authentication

All API endpoints require authentication via JWT token in the Authorization header:

```http
Authorization: Bearer <jwt_token>
```

The JWT token is obtained through Supabase authentication. The token must be valid and not expired.

**Example:**
```typescript
const response = await fetch('/api/billing/balance', {
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  }
});
```

---

## REST API Endpoints

### 1. Create Checkout Session

Create a Stripe checkout session for credit purchase.

**Endpoint:** `POST /api/create-checkout-session`

**Request Body:**
```typescript
{
  userId: string;          // User ID from authentication
  packageId: string;       // Package identifier (e.g., "starter_pack")
  packageName: string;     // Display name (e.g., "Starter Pack")
  cccAmount: number;       // Number of CCC credits
  usdCost: number;         // Cost in USD
  successUrl?: string;     // Redirect URL on success (optional)
  cancelUrl?: string;      // Redirect URL on cancel (optional)
}
```

**Response:**
```typescript
{
  sessionId: string;       // Stripe session ID
  url: string;             // Checkout URL to redirect user
}
```

**Example:**
```typescript
const response = await fetch('/api/create-checkout-session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId: 'user-123',
    packageId: 'starter_pack',
    packageName: 'Starter Pack',
    cccAmount: 100,
    usdCost: 20.00,
    successUrl: 'https://example.com/success',
    cancelUrl: 'https://example.com/cancel'
  })
});

const { url } = await response.json();
window.location.href = url; // Redirect to Stripe checkout
```

**Status Codes:**
- `200`: Success
- `400`: Invalid request (missing fields, invalid amounts)
- `405`: Method not allowed (non-POST request)
- `500`: Server error

---

### 2. Stripe Webhook Handler

Processes Stripe webhook events (internal endpoint, called by Stripe).

**Endpoint:** `POST /api/stripe-webhook`

**Headers:**
```http
stripe-signature: <signature>
```

**Supported Events:**
- `checkout.session.completed`: Credit purchase completed
- `payment_intent.succeeded`: Payment verification

**Response:**
```typescript
{
  received: boolean;
  eventType: string;
  queued_for_retry?: boolean;  // If processing failed
  retry_job_id?: string;        // Retry job identifier
}
```

**Configuration:**
This endpoint must be configured in your Stripe dashboard as a webhook endpoint. The webhook secret must be set in `STRIPE_WEBHOOK_SECRET` environment variable.

**Retry Behavior:**
- Failed webhooks are automatically queued for retry
- Exponential backoff: 1s, 2s, 4s, 8s, 16s
- Maximum 5 retry attempts
- Alerts triggered after 3 consecutive failures

---

### 3. Crypto Payment Verification

Submit a USDC transaction for verification and account crediting.

**Endpoint:** `POST /api/crypto-payment`

**Authentication:** Required (JWT token)

**Request Body:**
```typescript
{
  txHash: string;          // Transaction hash (0x...)
  chainId: number;         // Chain ID (1=Ethereum, 8453=Base, etc.)
}
```

**Response:**
```typescript
{
  success: boolean;
  transaction: {
    txHash: string;
    usdcAmount: number;    // USDC amount transferred
    cccAmount: number;     // CCC credits granted
    confirmations: number; // Number of confirmations
    blockNumber: number;   // Block number
  };
  newBalance: number;      // Updated CCC balance
}
```

**Example:**
```typescript
const response = await fetch('/api/crypto-payment', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    txHash: '0x1234567890abcdef...',
    chainId: 8453  // Base mainnet
  })
});

const result = await response.json();
console.log(`Credited ${result.transaction.cccAmount} CCC`);
```

**Status Codes:**
- `200`: Success
- `400`: Invalid transaction or parameters
- `401`: Unauthorized (invalid/missing token)
- `405`: Method not allowed
- `409`: Transaction already processed
- `500`: Server error

**Supported Chains:**
- Ethereum Mainnet (chainId: 1)
- Base Mainnet (chainId: 8453)
- Base Sepolia Testnet (chainId: 84532)
- Sepolia Testnet (chainId: 11155111)

**Requirements:**
- Transaction must have minimum 3 confirmations
- Transaction must be a USDC transfer to platform wallet
- Transaction must not have been previously processed

---

## BillingService Class

The `BillingService` class provides programmatic access to billing operations.

### Constructor

```typescript
import { BillingService } from '@/lib/billing/BillingService';

const billingService = new BillingService(
  supabaseUrl?: string,      // Optional, defaults to env var
  supabaseServiceKey?: string // Optional, defaults to env var
);

// Or use singleton
import { getBillingService } from '@/lib/billing/BillingService';
const billingService = getBillingService();
```

### Methods

#### getBalance()

Get current CCC balance for a user.

```typescript
async getBalance(userId: string): Promise<number>
```

**Parameters:**
- `userId`: User identifier

**Returns:** Current balance in CCC

**Example:**
```typescript
const balance = await billingService.getBalance('user-123');
console.log(`Balance: ${balance} CCC`);
```

**Performance:** Uses cached balance from `user_balances` table for O(1) lookups. Falls back to computing from ledger if cache is missing.

---

#### chargeUser()

Charge user for an operation. Performs atomic balance check and deduction.

```typescript
async chargeUser(
  userId: string,
  cost: number,
  description: string,
  metadata?: Record<string, any>
): Promise<ChargeResult>
```

**Parameters:**
- `userId`: User identifier
- `cost`: Cost in CCC (must be positive)
- `description`: Human-readable description
- `metadata`: Optional metadata (operation_type, etc.)

**Returns:**
```typescript
{
  success: true;
  newBalance: number;
  transactionId: string;
}
```

**Throws:**
- `InsufficientFundsError`: Balance < cost
- `BillingTransactionError`: Transaction failed

**Example:**
```typescript
try {
  const result = await billingService.chargeUser(
    'user-123',
    50,
    'GEO Audit',
    { operation_type: 'GEO_AUDIT', url: 'example.com' }
  );
  
  console.log(`Charged 50 CCC. New balance: ${result.newBalance}`);
} catch (error) {
  if (error instanceof InsufficientFundsError) {
    console.error(`Need ${error.required} CCC, have ${error.available}`);
  }
}
```

**Atomicity:** Balance check and deduction occur in a single transaction. If ledger insert fails, no charge occurs.

---

#### depositCredits()

Deposit credits to user account (internal use only).

```typescript
async depositCredits(
  userId: string,
  amount: number,
  eventType: 'DEPOSIT_STRIPE' | 'DEPOSIT_CRYPTO' | 'MIGRATION_CREDIT',
  metadata: Record<string, any>
): Promise<DepositResult>
```

**Parameters:**
- `userId`: User identifier
- `amount`: CCC amount (must be positive)
- `eventType`: Type of deposit
- `metadata`: Event-specific metadata

**Returns:**
```typescript
{
  success: true;
  newBalance: number;
  transactionId: string;
}
```

**Note:** This method should only be called by webhook handlers and migration service. Direct calls from user code are not recommended.

---

#### getTransactionHistory()

Get transaction history with pagination and filtering.

```typescript
async getTransactionHistory(
  userId: string,
  options?: TransactionHistoryOptions
): Promise<Transaction[]>
```

**Parameters:**
- `userId`: User identifier
- `options`: Optional filtering and pagination

**Options:**
```typescript
{
  limit?: number;          // Max records (default: 100)
  offset?: number;         // Pagination offset (default: 0)
  startDate?: Date;        // Filter by start date
  endDate?: Date;          // Filter by end date
  eventType?: EventType;   // Filter by event type
}
```

**Returns:** Array of transactions
```typescript
{
  id: string;
  user_id: string;
  amount: number;          // Negative for spend, positive for deposit
  event_type: EventType;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
}
```

**Example:**
```typescript
// Get last 50 transactions
const transactions = await billingService.getTransactionHistory(
  'user-123',
  { limit: 50, offset: 0 }
);

// Get transactions from last 7 days
const recentTxs = await billingService.getTransactionHistory(
  'user-123',
  {
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: new Date()
  }
);

// Get only deposits
const deposits = await billingService.getTransactionHistory(
  'user-123',
  { eventType: 'DEPOSIT_STRIPE' }
);
```

---

#### isTransactionProcessed()

Check if a crypto transaction has already been processed.

```typescript
async isTransactionProcessed(txHash: string): Promise<boolean>
```

**Parameters:**
- `txHash`: Blockchain transaction hash

**Returns:** `true` if already processed, `false` otherwise

**Example:**
```typescript
const processed = await billingService.isTransactionProcessed(
  '0x1234567890abcdef...'
);

if (processed) {
  console.log('Transaction already credited');
}
```

---

## Stripe Integration

### Functions

#### createCheckoutSession()

Create a Stripe checkout session.

```typescript
import { createCheckoutSession } from '@/lib/billing/stripe';

const session = await createCheckoutSession(
  userId: string,
  packageId: string,
  packageName: string,
  cccAmount: number,
  usdCost: number,
  successUrl: string,
  cancelUrl: string
): Promise<{ sessionId: string; url: string }>
```

**Example:**
```typescript
const session = await createCheckoutSession(
  'user-123',
  'pro_pack',
  'Pro Pack',
  500,
  90.00,
  'https://example.com/success',
  'https://example.com/cancel'
);

// Redirect user to checkout
window.location.href = session.url;
```

---

#### calculateCCCFromUSD()

Calculate CCC amount from USD payment.

```typescript
import { calculateCCCFromUSD } from '@/lib/billing/stripe';

const ccc = calculateCCCFromUSD(20.00); // Returns 100
```

**Formula:** `CCC = USD / 0.20`

---

#### calculateUSDFromCCC()

Calculate USD cost from CCC amount.

```typescript
import { calculateUSDFromCCC } from '@/lib/billing/stripe';

const usd = calculateUSDFromCCC(100); // Returns 20.00
```

**Formula:** `USD = CCC * 0.20`

---

## Cryptocurrency Payments

### Functions

#### verifyUSDCTransaction()

Verify a USDC transaction on-chain.

```typescript
import { verifyUSDCTransaction } from '@/lib/billing/crypto';

const verified = await verifyUSDCTransaction(
  txHash: string,
  chainId: number
): Promise<VerifiedTransaction>
```

**Returns:**
```typescript
{
  txHash: string;
  from: string;            // Sender address
  to: string;              // Platform wallet address
  amount: number;          // USDC amount
  cccAmount: number;       // Calculated CCC
  blockNumber: number;
  confirmations: number;
  timestamp: number;
  chainId: number;
}
```

**Validation:**
- Transaction exists and is confirmed (min 3 confirmations)
- Transaction is a USDC transfer to platform wallet
- Transaction was successful (status = 1)
- Amount is valid and positive

---

#### processCryptoPayment()

Process verified transaction and credit account.

```typescript
import { processCryptoPayment } from '@/lib/billing/crypto';

await processCryptoPayment(
  userId: string,
  verifiedTx: VerifiedTransaction,
  billingService: BillingService
): Promise<void>
```

**Throws:** Error if transaction already processed

---

### CryptoPaymentMonitor Class

Monitor blockchain for incoming USDC payments.

```typescript
import { CryptoPaymentMonitor } from '@/lib/billing/crypto';

const monitor = new CryptoPaymentMonitor(chainId, billingService);

await monitor.startMonitoring(async (tx) => {
  console.log(`Payment detected: ${tx.cccAmount} CCC`);
  // Process payment
});

// Later...
monitor.stopMonitoring();
```

**Note:** For production, use a dedicated indexer service or blockchain API provider webhooks instead of direct monitoring.

---

## Migration Service

Convert legacy subscriptions to CCC credits.

### MigrationService Class

```typescript
import { MigrationService } from '@/lib/billing/MigrationService';

const migrationService = new MigrationService();

// Or use singleton
import { getMigrationService } from '@/lib/billing/MigrationService';
const migrationService = getMigrationService();
```

### Methods

#### migrateSubscription()

Migrate a user's subscription to CCC.

```typescript
async migrateSubscription(userId: string): Promise<MigrationResult>
```

**Returns:**
```typescript
{
  success: boolean;
  creditsGranted: number;
  error?: string;
}
```

**Example:**
```typescript
const result = await migrationService.migrateSubscription('user-123');

if (result.success) {
  console.log(`Granted ${result.creditsGranted} CCC`);
} else {
  console.error(`Migration failed: ${result.error}`);
}
```

**Behavior:**
- Checks if already migrated (idempotent)
- Calculates pro-rated credits based on remaining subscription time
- Inserts MIGRATION_CREDIT into ledger
- Marks subscription as expired
- Sends email notification

---

#### calculateSubscriptionValue()

Calculate CCC equivalent for a subscription.

```typescript
calculateSubscriptionValue(
  tier: 'free' | 'starter' | 'pro' | 'enterprise',
  periodStart: string | null,
  periodEnd: string | null
): number
```

**Tier Values:**
- Free: $0/month → 0 CCC
- Starter: $19/month → 95 CCC
- Pro: $49/month → 245 CCC
- Enterprise: $199/month → 995 CCC

**Pro-rating:** Credits are pro-rated based on remaining days in billing period.

**Example:**
```typescript
// User has 15 days remaining on Pro plan
const credits = migrationService.calculateSubscriptionValue(
  'pro',
  '2025-01-01',
  '2025-01-31'
);
// Returns ~122 CCC (half of 245)
```

---

## Error Handling

### Error Types

#### InsufficientFundsError

Thrown when user doesn't have enough credits.

```typescript
class InsufficientFundsError extends Error {
  required: number;      // CCC required
  available: number;     // CCC available
  operation: string;     // Operation description
}
```

**Example:**
```typescript
try {
  await billingService.chargeUser(userId, 100, 'Operation');
} catch (error) {
  if (error instanceof InsufficientFundsError) {
    console.error(
      `Need ${error.required} CCC, have ${error.available} CCC`
    );
    // Prompt user to purchase credits
  }
}
```

---

#### BillingTransactionError

Thrown when a billing transaction fails.

```typescript
class BillingTransactionError extends Error {
  userId: string;
  operation: string;
  cause: Error;
}
```

**Example:**
```typescript
try {
  await billingService.depositCredits(...);
} catch (error) {
  if (error instanceof BillingTransactionError) {
    console.error(`Transaction failed: ${error.cause.message}`);
    // Log for debugging, retry if transient
  }
}
```

---

#### MigrationError

Thrown when subscription migration fails.

```typescript
class MigrationError extends Error {
  userId: string;
  reason: string;
}
```

---

### Error Response Format

API endpoints return errors in this format:

```typescript
{
  error: string;  // Error message
}
```

**Status Codes:**
- `400`: Bad request (invalid parameters)
- `401`: Unauthorized (missing/invalid auth)
- `405`: Method not allowed
- `409`: Conflict (duplicate transaction)
- `500`: Server error

---

## Rate Limits

### API Endpoints

- **Credit Purchase**: 5 requests per hour per user
- **Balance Check**: 100 requests per minute per user
- **Transaction History**: 20 requests per minute per user
- **Crypto Payment**: 10 requests per hour per user

### Webhook Endpoints

- **Stripe Webhook**: No rate limit (Stripe controls retry)

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

---

## Best Practices

### 1. Error Handling

Always handle `InsufficientFundsError` gracefully:

```typescript
try {
  await billingService.chargeUser(userId, cost, description);
} catch (error) {
  if (error instanceof InsufficientFundsError) {
    // Show user-friendly message
    showPurchasePrompt(error.required - error.available);
  } else {
    // Log and show generic error
    console.error('Billing error:', error);
    showErrorMessage('Payment processing failed');
  }
}
```

### 2. Balance Checks

Check balance before expensive operations:

```typescript
const balance = await billingService.getBalance(userId);
const cost = getOperationCost('GEO_AUDIT');

if (balance < cost) {
  showInsufficientFundsMessage(cost, balance);
  return;
}

// Proceed with operation
await performAudit();
```

### 3. Transaction Metadata

Include useful metadata for analytics:

```typescript
await billingService.chargeUser(
  userId,
  cost,
  'GEO Audit',
  {
    operation_type: 'GEO_AUDIT',
    url: 'example.com',
    user_agent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  }
);
```

### 4. Idempotency

For crypto payments, always check if processed:

```typescript
const processed = await billingService.isTransactionProcessed(txHash);
if (processed) {
  return { error: 'Transaction already processed' };
}

await processCryptoPayment(userId, verifiedTx, billingService);
```

### 5. Webhook Security

Always verify webhook signatures:

```typescript
try {
  const event = verifyWebhookSignature(rawBody, signature);
  // Process event
} catch (error) {
  // Invalid signature - reject request
  return res.status(400).json({ error: 'Invalid signature' });
}
```

---

## Support

For questions or issues:
- Documentation: `/docs/billing`
- Email: support@anoteros-logos.com
- GitHub Issues: [repository]/issues

---

**Last Updated:** December 2025  
**API Version:** 1.0.0
