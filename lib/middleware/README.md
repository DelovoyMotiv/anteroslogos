# Rate Limiting Middleware

Production-grade rate limiting using the **Token Bucket Algorithm** for Vercel serverless functions.

## Features

- ✅ **Token Bucket Algorithm**: Smooth rate limiting with burst support
- ✅ **Tiered Limits**: 60 req/min for authenticated, 10 req/min for anonymous
- ✅ **Standard Headers**: X-RateLimit-*, Retry-After
- ✅ **Automatic Refill**: Tokens refill continuously over time
- ✅ **Memory Efficient**: Automatic cleanup of expired buckets
- ✅ **Flexible Configuration**: Custom limits, identifiers, and skip rules

## Quick Start

### Basic Usage

```typescript
import { withRateLimit } from '@/lib/middleware/rateLimiter';

async function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ message: 'Success' });
}

export default withRateLimit(handler);
```

### With Custom Configuration

```typescript
export default withRateLimit(handler, {
  authenticatedConfig: {
    requestsPerMinute: 100,
    burstSize: 120,
  },
  anonymousConfig: {
    requestsPerMinute: 20,
    burstSize: 25,
  },
});
```

### Skip Rate Limiting for Certain Requests

```typescript
export default withRateLimit(handler, {
  skip: (req) => req.url === '/api/health',
});
```

### Custom Identifier (e.g., API Key)

```typescript
export default withRateLimit(handler, {
  getIdentifier: (req) => req.headers['x-api-key'] as string,
});
```

## Default Configuration

| Tier | Requests/Min | Burst Size |
|------|--------------|------------|
| Authenticated | 60 | 80 |
| Anonymous | 10 | 15 |

**Authentication Detection**: Checks for `Authorization: Bearer <token>` header.

## HTTP Headers

### Response Headers (All Requests)

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1701234567
```

### 429 Response Headers

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1701234567
Retry-After: 15
```

### 429 Response Body

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again in 15 seconds.",
  "retryAfter": 15,
  "limit": 60,
  "resetAt": "2024-11-29T12:34:56.789Z"
}
```

## Token Bucket Algorithm

The token bucket algorithm provides smooth rate limiting with burst support:

1. **Bucket Capacity**: Maximum tokens (burst size)
2. **Refill Rate**: Tokens added per second (requestsPerMinute / 60)
3. **Token Consumption**: Each request consumes 1 token
4. **Continuous Refill**: Tokens refill automatically over time

### Example

For anonymous users (10 req/min, burst 15):
- Bucket starts with 15 tokens
- Refill rate: 10/60 = 0.167 tokens/second
- After 15 requests, bucket is empty
- After 6 seconds, 1 token is refilled
- After 60 seconds, bucket is full again (15 tokens)

## API Reference

### `withRateLimit(handler, options?)`

Main middleware function.

**Parameters:**
- `handler`: Vercel request handler
- `options`: Optional configuration

**Options:**
```typescript
interface RateLimitOptions {
  authenticatedConfig?: {
    requestsPerMinute?: number;
    burstSize?: number;
  };
  anonymousConfig?: {
    requestsPerMinute?: number;
    burstSize?: number;
  };
  getIdentifier?: (req: VercelRequest) => string;
  getTier?: (req: VercelRequest) => 'authenticated' | 'anonymous';
  skip?: (req: VercelRequest) => boolean;
}
```

### `checkRateLimit(identifier, tier)`

Check rate limit without consuming tokens.

```typescript
const result = checkRateLimit('192.168.1.1', 'anonymous');
console.log(result.remaining); // tokens remaining
```

### `resetRateLimit(identifier)`

Reset rate limit for an identifier.

```typescript
resetRateLimit('192.168.1.1');
```

### `getRateLimitStats(identifier, tier)`

Get current bucket statistics.

```typescript
const stats = getRateLimitStats('192.168.1.1', 'anonymous');
console.log(stats.tokens); // current tokens
console.log(stats.capacity); // max tokens
console.log(stats.refillRate); // tokens per second
```

## IP Address Extraction

The middleware extracts client IP from headers in this order:

1. `x-forwarded-for` (first IP in list)
2. `x-real-ip`
3. `cf-connecting-ip` (Cloudflare)
4. `'unknown'` (fallback)

## Production Considerations

### Redis for Distributed Systems

For production with multiple instances, replace the in-memory store with Redis:

```typescript
// lib/middleware/rateLimiter.redis.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

class RedisTokenBucketStore {
  async tryConsume(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    // Implement using Redis INCR, EXPIRE, and Lua scripts
  }
}
```

### Monitoring

Track rate limit metrics:

```typescript
// Log rate limit hits
if (!result.allowed) {
  console.log('Rate limit exceeded', {
    identifier,
    tier,
    retryAfter: result.retryAfter,
  });
}
```

### Alerting

Set up alerts for high rate limit hit rates:

```typescript
const hitRate = blockedRequests / totalRequests;
if (hitRate > 0.1) {
  // Alert: >10% of requests are being rate limited
}
```

## Testing

### Unit Tests

```bash
npm test -- lib/middleware/__tests__/rateLimiter.test.ts --run
```

### Integration Tests

```bash
npm test -- lib/middleware/__tests__/rateLimiter.integration.test.ts --run
```

## Migration from Old Rate Limiter

The old rate limiter in `lib/validation/middleware.ts` is deprecated. Migrate to the new one:

**Before:**
```typescript
import { withRateLimit } from '@/lib/validation/middleware';

export default withRateLimit(handler, {
  maxRequests: 60,
  windowMs: 60000,
});
```

**After:**
```typescript
import { withRateLimit } from '@/lib/middleware/rateLimiter';

export default withRateLimit(handler, {
  anonymousConfig: { requestsPerMinute: 60 },
});
```

## Troubleshooting

### Rate Limits Not Working

1. Check IP extraction: `console.log(req.headers['x-forwarded-for'])`
2. Verify authentication: `console.log(req.headers.authorization)`
3. Check bucket state: `getRateLimitStats(identifier, tier)`

### Too Strict / Too Lenient

Adjust configuration:

```typescript
withRateLimit(handler, {
  anonymousConfig: {
    requestsPerMinute: 20, // Increase limit
    burstSize: 30, // Allow larger bursts
  },
});
```

### Memory Usage

The in-memory store automatically cleans up expired buckets every 5 minutes. For high-traffic applications, consider Redis.

## References

- [Token Bucket Algorithm](https://en.wikipedia.org/wiki/Token_bucket)
- [HTTP Rate Limiting Headers](https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-ratelimit-headers)
- [IETF RFC 6585 - 429 Too Many Requests](https://datatracker.ietf.org/doc/html/rfc6585#section-4)

## License

MIT
