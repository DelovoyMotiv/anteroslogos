# Billing Security Implementation

This document describes the security features implemented for the CCC-Native Economy billing system.

## Overview

The billing system implements multiple layers of security to protect user financial data and prevent unauthorized access:

1. **Row Level Security (RLS)** - Database-level access control
2. **Authorization Middleware** - Application-level access control
3. **Audit Logging** - Comprehensive security event tracking
4. **Service Role Restrictions** - Privileged operation controls

## Row Level Security (RLS)

### Billing Ledger

The `billing_ledger` table has the following RLS policies:

```sql
-- Users can only read their own records
CREATE POLICY billing_ledger_select_own 
  ON public.billing_ledger FOR SELECT 
  USING (auth.uid() = user_id);

-- Only service role can insert (enforced at application level)
CREATE POLICY billing_ledger_insert_service 
  ON public.billing_ledger FOR INSERT 
  WITH CHECK (false);

-- No UPDATE or DELETE policies = immutable ledger
```

**Key Features:**
- Users can only query their own transaction records
- Regular users cannot insert, update, or delete ledger entries
- Only the service role (application backend) can insert transactions
- Ledger is append-only and immutable

### User Balances

The `user_balances` table has similar RLS policies:

```sql
-- Users can only read their own balance
CREATE POLICY user_balances_select_own 
  ON public.user_balances FOR SELECT 
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies for users (managed by trigger)
```

**Key Features:**
- Users can only view their own balance
- Balance updates are managed by database triggers
- No direct user manipulation of balance data

## Authorization Middleware

### Billing Authorization

The `requireBillingAuth` middleware ensures users are authenticated before accessing billing endpoints:

```typescript
import { requireBillingAuth } from '@/lib/billing';

export default requireBillingAuth(async (req, res) => {
  // Handler code - user is guaranteed to be authenticated
  const userId = req.authContext.userId;
  // ...
});
```

**Features:**
- Extracts and validates user ID from request
- Logs unauthorized access attempts
- Returns 401 Unauthorized if authentication fails

### User Data Authorization

The `requireUserDataAuth` middleware ensures users can only access their own data:

```typescript
import { requireUserDataAuth } from '@/lib/billing';

export default requireUserDataAuth((req) => req.query.userId as string)(
  async (req, res) => {
    // Handler code - user is authorized to access this data
    // ...
  }
);
```

**Features:**
- Validates user can only access their own billing data
- Service role can access any user's data (for admin operations)
- Logs unauthorized cross-user access attempts
- Returns 403 Forbidden if authorization fails

### Ledger Operation Authorization

The `requireLedgerAuth` middleware restricts ledger operations to service role only:

```typescript
import { requireLedgerAuth } from '@/lib/billing';

export default requireLedgerAuth('insert')(async (req, res) => {
  // Handler code - only service role can reach here
  // ...
});
```

**Features:**
- Only service role can perform ledger operations
- Prevents regular users from manipulating financial records
- Logs all unauthorized ledger access attempts
- Returns 403 Forbidden for non-service-role requests

## Audit Logging

### Billing Audit Logger

The `BillingAuditLogger` class provides comprehensive security event tracking:

```typescript
import { getBillingAuditLogger } from '@/lib/billing';

const auditLogger = getBillingAuditLogger();

// Log a billing event
await auditLogger.logEvent(
  'credit_charge_success',
  userId,
  { amount: 50, operation: 'GEO_AUDIT' }
);

// Log unauthorized access attempt
await auditLogger.logUnauthorizedAccess(
  'transaction_history_unauthorized',
  attemptedUserId,
  actualUserId,
  'transaction_history'
);
```

**Logged Events:**
- Balance checks
- Credit charges (attempts, successes, failures)
- Credit deposits
- Transaction history access
- Unauthorized access attempts
- Ledger operation attempts
- Insufficient funds events
- Billing transaction errors
- Migration credits
- Package purchases
- Webhook events

**Audit Log Fields:**
- `user_id` - User performing the action
- `action` - Action type (e.g., 'billing.credit.charge.success')
- `resource_type` - Resource being accessed ('billing', 'ledger', 'balance', 'transaction', 'webhook')
- `resource_id` - Specific resource ID (e.g., transaction ID)
- `ip_address` - Client IP address
- `user_agent` - Client user agent
- `metadata` - Additional context (sanitized to remove sensitive data)
- `timestamp` - Event timestamp

### Suspicious Activity Detection

The audit logger includes suspicious activity detection:

```typescript
const activity = await auditLogger.checkSuspiciousActivity(userId);

if (activity.suspicious) {
  console.warn(`Suspicious activity detected for user ${userId}:
    - Failed transactions: ${activity.failedTransactions}
    - Unauthorized attempts: ${activity.unauthorizedAttempts}
    - Insufficient funds: ${activity.insufficientFundsCount}
  `);
}
```

**Triggers:**
- 5+ failed transactions in 15 minutes
- Any unauthorized access attempts
- 10+ insufficient funds errors in 15 minutes

## Service Role Restrictions

### What is Service Role?

The service role is a privileged database connection that bypasses RLS policies. It should only be used by trusted backend code.

**Service Role Key Storage:**
- Stored in `SUPABASE_SERVICE_ROLE_KEY` environment variable
- Never exposed to client-side code
- Never logged or included in error messages

**Service Role Usage:**
- Inserting ledger transactions
- Depositing credits from webhooks
- Migration operations
- Admin operations

### Detecting Service Role

The authorization middleware can detect service role requests:

```typescript
import { checkLedgerAuthorization } from '@/lib/billing';

const authResult = checkLedgerAuthorization(req, 'insert');

if (authResult.context?.isServiceRole) {
  // This is a service role request
  // Allow privileged operations
}
```

## Security Best Practices

### 1. Always Use Authorization Middleware

```typescript
// ✅ GOOD - Protected endpoint
export default requireBillingAuth(
  requireUserDataAuth((req) => req.query.userId as string)(handler)
);

// ❌ BAD - Unprotected endpoint
export default handler;
```

### 2. Never Trust Client Input

```typescript
// ✅ GOOD - Validate user can access this data
const authResult = checkUserDataAuthorization(req, targetUserId);
if (!authResult.authorized) {
  return res.status(403).json({ error: 'Forbidden' });
}

// ❌ BAD - Trust client-provided user ID
const userId = req.body.userId; // Could be any user!
```

### 3. Log Security Events

```typescript
// ✅ GOOD - Log unauthorized attempts
if (!authorized) {
  await auditLogger.logUnauthorizedAccess(
    'balance_check_unauthorized',
    targetUserId,
    actualUserId,
    'balance'
  );
  return res.status(403).json({ error: 'Forbidden' });
}

// ❌ BAD - Silent failure
if (!authorized) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

### 4. Use Service Role Sparingly

```typescript
// ✅ GOOD - Service role for system operations
const billingService = new BillingService(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ❌ BAD - Service role for user operations
// This bypasses RLS and could leak data!
```

### 5. Sanitize Audit Logs

The audit logger automatically sanitizes sensitive data:

```typescript
// Sensitive fields are automatically redacted
await auditLogger.logEvent('webhook_received', userId, {
  stripe_secret: 'sk_live_xxx', // Will be '[REDACTED]'
  api_key: 'key_xxx', // Will be '[REDACTED]'
  amount: 100, // Will be logged
});
```

## Testing Security

### Property-Based Testing

The security implementation includes property-based tests that verify:

**Property 22: User Data Isolation**
- Users can only access their own transaction history
- Users' balances are computed only from their own transactions
- Database queries properly filter by user_id

Run tests with:
```bash
npm test -- lib/billing/__tests__/authorization.property.test.ts --run
```

**Note:** Tests require Supabase configuration. Set these environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` or `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Manual Security Testing

1. **Test RLS Policies:**
   ```sql
   -- As a regular user, try to access another user's data
   SELECT * FROM billing_ledger WHERE user_id = '<other_user_id>';
   -- Should return 0 rows
   ```

2. **Test Authorization Middleware:**
   ```bash
   # Try to access another user's balance
   curl -H "Authorization: Bearer <user_a_token>" \
     https://api.example.com/billing/balance?userId=<user_b_id>
   # Should return 403 Forbidden
   ```

3. **Test Audit Logging:**
   ```sql
   -- Check audit logs for unauthorized attempts
   SELECT * FROM audit_log 
   WHERE action LIKE '%unauthorized%' 
   ORDER BY timestamp DESC 
   LIMIT 10;
   ```

## Monitoring and Alerts

### Key Metrics to Monitor

1. **Unauthorized Access Attempts**
   - Query: `SELECT COUNT(*) FROM audit_log WHERE action LIKE '%unauthorized%'`
   - Alert threshold: > 10 per hour

2. **Failed Transactions**
   - Query: `SELECT COUNT(*) FROM audit_log WHERE action = 'billing.transaction.error'`
   - Alert threshold: > 50 per hour

3. **Suspicious Activity**
   - Use `checkSuspiciousActivity()` to detect patterns
   - Alert on any suspicious activity detected

### Grafana Dashboard

Create a security dashboard with:
- Unauthorized access attempts (time series)
- Failed transactions by user (table)
- Suspicious activity alerts (stat panel)
- Audit log volume (gauge)

## Compliance

This security implementation supports compliance with:

- **SOC 2** - Comprehensive audit logging and access controls
- **GDPR** - User data isolation and access restrictions
- **PCI DSS** - Financial transaction security and audit trails

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

## Validates Requirements

- **Requirement 8.1**: RLS policies on billing_ledger table ✅
- **Requirement 8.2**: Users can only query their own records ✅
- **Requirement 8.3**: INSERT operations restricted to service role ✅
- **Requirement 8.4**: UPDATE and DELETE operations prevented ✅
- **Requirement 8.5**: Unauthorized access attempts logged ✅
