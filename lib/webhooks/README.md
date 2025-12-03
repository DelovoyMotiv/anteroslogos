# Webhook Signature Verification

Secure webhook receiver implementation with HMAC-SHA256 signature verification and replay attack prevention.

## Features

- ✅ **HMAC-SHA256 Signature Verification** - Cryptographically secure webhook authentication
- ✅ **Replay Attack Prevention** - Timestamp validation with configurable time windows
- ✅ **Constant-Time Comparison** - Timing attack resistant signature verification
- ✅ **Type-Safe** - Full TypeScript support with comprehensive types
- ✅ **Flexible Configuration** - Customizable maxAge, clock skew tolerance, and more
- ✅ **Production Ready** - Comprehensive test coverage with property-based tests

## Security Properties

**Property 28: Webhook Signature Verification**
> For any incoming webhook, it should verify HMAC signature before processing

This implementation validates Requirements 6.4 from the production audit specification.

## Quick Start

### 1. Set Environment Variable

```bash
WEBHOOK_SECRET=your-secret-key-here
```

### 2. Create Webhook Endpoint

```typescript
// api/my-webhook.ts
import { withWebhookVerification } from '@/lib/webhooks/receiver';

export default withWebhookVerification(
  async (req, res) => {
    // Webhook is verified, process payload
    const payload = JSON.parse(req.body);
    
    console.log('Received webhook:', payload.event);
    
    // Handle webhook event
    switch (payload.event) {
      case 'job.completed':
        // Handle job completion
        break;
      case 'job.failed':
        // Handle job failure
        break;
    }
    
    res.status(200).json({ received: true });
  },
  process.env.WEBHOOK_SECRET!
);
```

### 3. Send Webhook Request

```typescript
import { generateWebhookSignature } from '@/lib/webhooks/receiver';

const payload = JSON.stringify({
  event: 'job.completed',
  job: { id: '123', status: 'completed' }
});

const { signature, timestamp } = generateWebhookSignature(
  payload,
  process.env.WEBHOOK_SECRET!
);

await fetch('https://your-api.com/api/my-webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Webhook-Signature': signature,
    'X-Webhook-Timestamp': String(timestamp),
  },
  body: payload,
});
```

## API Reference

### `verifyWebhook(request, secret, options?)`

Verify webhook signature and timestamp.

**Parameters:**
- `request: WebhookRequest` - Webhook request with body and headers
- `secret: string` - HMAC secret for signature verification
- `options?: WebhookVerificationOptions` - Optional configuration

**Returns:** `WebhookVerificationResult`

**Example:**
```typescript
const result = verifyWebhook(
  {
    body: JSON.stringify(payload),
    headers: {
      'x-webhook-signature': 'sha256=abc123...',
      'x-webhook-timestamp': '1701234567'
    }
  },
  'my-secret-key',
  {
    maxAge: 300, // 5 minutes
    allowFutureTimestamps: false,
    clockSkewTolerance: 30 // 30 seconds
  }
);

if (!result.valid) {
  console.error('Verification failed:', result.error);
  return new Response('Unauthorized', { status: 401 });
}
```

### `verifySignature(payload, signature, secret)`

Verify HMAC-SHA256 signature using constant-time comparison.

**Parameters:**
- `payload: string` - Raw payload string
- `signature: string` - Signature in format "sha256=<hex>"
- `secret: string` - HMAC secret

**Returns:** `boolean`

**Example:**
```typescript
const valid = verifySignature(
  JSON.stringify(payload),
  'sha256=abc123...',
  'my-secret-key'
);
```

### `generateWebhookSignature(payload, secret, timestamp?)`

Generate webhook signature for testing or sending webhooks.

**Parameters:**
- `payload: string` - Payload to sign
- `secret: string` - HMAC secret
- `timestamp?: number` - Optional timestamp (defaults to now)

**Returns:** `{ signature: string; timestamp: number }`

**Example:**
```typescript
const { signature, timestamp } = generateWebhookSignature(
  JSON.stringify(payload),
  'my-secret-key'
);
```

### `withWebhookVerification(handler, secret, options?)`

Express/Vercel middleware for webhook verification.

**Parameters:**
- `handler: (req, res) => Promise<void>` - Request handler
- `secret: string` - HMAC secret
- `options?: WebhookVerificationOptions` - Optional configuration

**Returns:** Middleware function

## Configuration Options

### `WebhookVerificationOptions`

```typescript
interface WebhookVerificationOptions {
  /**
   * Maximum age of webhook in seconds (default: 300 = 5 minutes)
   */
  maxAge?: number;
  
  /**
   * Whether to allow future timestamps (default: false)
   */
  allowFutureTimestamps?: boolean;
  
  /**
   * Clock skew tolerance in seconds (default: 30)
   */
  clockSkewTolerance?: number;
}
```

## Security Best Practices

### 1. Keep Secrets Secure

```typescript
// ❌ DON'T hardcode secrets
const secret = 'my-secret-key';

// ✅ DO use environment variables
const secret = process.env.WEBHOOK_SECRET;
```

### 2. Use Short Time Windows

```typescript
// ✅ Reject old webhooks (default: 5 minutes)
verifyWebhook(request, secret, { maxAge: 300 });
```

### 3. Validate Timestamps

```typescript
// ✅ Prevent replay attacks
verifyWebhook(request, secret, {
  maxAge: 300,
  allowFutureTimestamps: false,
  clockSkewTolerance: 30
});
```

### 4. Return 401 for Invalid Signatures

```typescript
const result = verifyWebhook(request, secret);

if (!result.valid) {
  // ✅ Return 401 Unauthorized
  return res.status(401).json({
    error: 'Unauthorized',
    message: result.error,
    code: result.errorCode
  });
}
```

### 5. Log Verification Failures

```typescript
if (!result.valid) {
  console.warn('[Webhook] Verification failed:', {
    error: result.error,
    code: result.errorCode,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `MISSING_SIGNATURE` | X-Webhook-Signature header is missing |
| `MISSING_TIMESTAMP` | X-Webhook-Timestamp header is missing |
| `INVALID_TIMESTAMP` | Timestamp is not a valid number |
| `INVALID_SIGNATURE` | HMAC signature verification failed |
| `REPLAY_ATTACK` | Timestamp is too old or in the future |

## Testing

### Unit Tests

```bash
npm test lib/webhooks/__tests__/receiver.test.ts
```

### Property-Based Tests

```bash
npm test lib/webhooks/__tests__/receiver.property.test.ts
```

### Integration Tests

```bash
npm test lib/webhooks/__tests__/receiver.integration.test.ts
```

## Implementation Details

### Constant-Time Comparison

The implementation uses `crypto.timingSafeEqual()` to prevent timing attacks:

```typescript
import { timingSafeEqual } from 'crypto';

const providedBuffer = Buffer.from(providedHash, 'hex');
const expectedBuffer = Buffer.from(expectedHash, 'hex');

return timingSafeEqual(providedBuffer, expectedBuffer);
```

### Replay Attack Prevention

Webhooks are rejected if:
1. Timestamp is older than `maxAge` (default: 5 minutes)
2. Timestamp is in the future beyond `clockSkewTolerance` (default: 30 seconds)

```typescript
const now = Math.floor(Date.now() / 1000);
const age = now - timestamp;

if (age > maxAge) {
  return { valid: false, errorCode: 'REPLAY_ATTACK' };
}
```

### HMAC-SHA256 Signature

Signatures are generated using HMAC-SHA256:

```typescript
import { createHmac } from 'crypto';

const signature = createHmac('sha256', secret)
  .update(payload)
  .digest('hex');
```

## Related Documentation

- [Webhook Sender Implementation](../a2a/webhooks.ts)
- [Security Audit Report](../../.kiro/specs/production-audit-improvements/security-audit-report.md)
- [Production Audit Design](../../.kiro/specs/production-audit-improvements/design.md)

## License

MIT
