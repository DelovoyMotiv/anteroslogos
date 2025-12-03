# Structured Logging Module

Production-ready structured logging with correlation ID propagation and sensitive data masking.

## Features

- ✅ **Structured JSON Logging**: All logs in JSON format for easy parsing
- ✅ **Correlation ID Propagation**: Track requests across services
- ✅ **Sensitive Data Masking**: Automatic PII and secret redaction
- ✅ **Multiple Log Levels**: trace, debug, info, warn, error, fatal
- ✅ **Pretty Printing**: Human-readable logs in development
- ✅ **Production Ready**: Optimized for production environments

## Installation

```bash
npm install pino pino-pretty
```

## Basic Usage

```typescript
import { logger } from '@/lib/logging';

// Simple logging
logger.info('User logged in');
logger.error('Database connection failed');

// Structured logging with context
logger.info({
  msg: 'Payment processed',
  userId: 'user-123',
  amount: 99.99,
  currency: 'USD',
});

// Error logging
try {
  await processPayment();
} catch (error) {
  logger.error({
    msg: 'Payment processing failed',
    error,
    userId: 'user-123',
  });
}
```

## Correlation ID

Track requests across your application:

```typescript
import { withCorrelationIdAsync, generateCorrelationId, logger } from '@/lib/logging';

async function handleRequest() {
  const correlationId = generateCorrelationId();
  
  await withCorrelationIdAsync(correlationId, async () => {
    logger.info('Processing request'); // Includes correlationId
    await doWork();
    logger.info('Request completed'); // Same correlationId
  });
}
```

## Middleware (Vercel/Express)

Automatically add correlation IDs to all requests:

```typescript
import { correlationIdMiddleware } from '@/lib/logging';

// Wrap your API handler
export default correlationIdMiddleware(async (req, res) => {
  // All logs in this handler will have the same correlation ID
  logger.info('Handling request');
  
  // Your logic here
  res.json({ success: true });
});
```

## Sensitive Data Masking

Automatically masks sensitive data:

```typescript
logger.info({
  msg: 'User created',
  email: 'user@example.com',      // Masked
  password: 'secret123',           // Masked
  apiKey: 'sk_live_abc123',        // Masked
  token: 'eyJhbGc...',             // Masked
});

// Output:
// {
//   "msg": "User created",
//   "email": "***MASKED***",
//   "password": "***REDACTED***",
//   "apiKey": "***REDACTED***",
//   "token": "***MASKED***"
// }
```

### Masked Patterns

- API keys and tokens
- Passwords
- Email addresses
- Credit card numbers
- SSN
- Phone numbers
- IP addresses
- JWT tokens

### Masked Fields

- `password`, `passwd`, `pwd`
- `secret`, `apiKey`, `api_key`
- `token`, `accessToken`, `refreshToken`
- `authorization`, `cookie`
- `email`, `phone`, `ssn`
- `creditCard`, `cardNumber`, `cvv`
- `address`, `ipAddress`, `ip`

## Child Loggers

Create loggers with additional context:

```typescript
import { createChildLogger } from '@/lib/logging';

const userLogger = createChildLogger({
  userId: 'user-123',
  tenantId: 'tenant-456',
});

// All logs from this logger include userId and tenantId
userLogger.info('User action performed');
userLogger.error('User action failed');
```

## Log Levels

```typescript
import { logger, LogLevel } from '@/lib/logging';

logger.trace('Very detailed debugging');
logger.debug('Debugging information');
logger.info('General information');
logger.warn('Warning message');
logger.error('Error occurred');
logger.fatal('Fatal error, application crashing');
```

## Configuration

Set log level via environment variable:

```bash
# Development (default: debug)
LOG_LEVEL=debug

# Production (default: info)
LOG_LEVEL=info

# Only errors
LOG_LEVEL=error
```

## Production vs Development

**Development:**
- Pretty printed, colorized output
- Default level: `debug`
- Human-readable timestamps

**Production:**
- JSON format
- Default level: `info`
- ISO timestamps
- Optimized for log aggregation

## Integration with Monitoring

### Sentry

```typescript
import * as Sentry from '@sentry/node';
import { logger } from '@/lib/logging';

logger.error({
  msg: 'Critical error',
  error: new Error('Something went wrong'),
});

// Also send to Sentry
Sentry.captureException(error);
```

### Prometheus

```typescript
import { logger } from '@/lib/logging';
import { errorCounter } from '@/lib/metrics';

try {
  await riskyOperation();
} catch (error) {
  logger.error({ msg: 'Operation failed', error });
  errorCounter.inc({ operation: 'riskyOperation' });
}
```

## Best Practices

1. **Always use structured logging**
   ```typescript
   // ❌ Bad
   logger.info('User user-123 logged in');
   
   // ✅ Good
   logger.info({ msg: 'User logged in', userId: 'user-123' });
   ```

2. **Include context**
   ```typescript
   logger.info({
     msg: 'Payment processed',
     userId: 'user-123',
     amount: 99.99,
     currency: 'USD',
     paymentMethod: 'card',
   });
   ```

3. **Use appropriate log levels**
   - `trace`: Very detailed debugging (rarely used)
   - `debug`: Debugging information
   - `info`: General information about application flow
   - `warn`: Warning about potential issues
   - `error`: Error that was handled
   - `fatal`: Fatal error causing application crash

4. **Don't log sensitive data directly**
   ```typescript
   // ❌ Bad - might bypass masking
   logger.info(`Password: ${password}`);
   
   // ✅ Good - will be masked
   logger.info({ msg: 'User authenticated', password });
   ```

5. **Use correlation IDs for request tracking**
   ```typescript
   await withCorrelationIdAsync(correlationId, async () => {
     logger.info('Step 1');
     await step1();
     logger.info('Step 2');
     await step2();
   });
   ```

## Testing

```typescript
import { maskSensitiveData, maskSensitiveString } from '@/lib/logging';

describe('Sensitive data masking', () => {
  it('should mask passwords', () => {
    const masked = maskSensitiveData({
      username: 'john',
      password: 'secret123',
    });
    
    expect(masked.password).toBe('***MASKED***');
    expect(masked.username).toBe('john');
  });
  
  it('should mask API keys in strings', () => {
    const masked = maskSensitiveString('API key: sk_live_abc123def456');
    expect(masked).toContain('********');
  });
});
```

## Properties Validated

- **Property 39: Structured JSON Logging** - All logs in JSON format
- **Property 40: Correlation ID Propagation** - Correlation IDs tracked across requests
- **Property 41: No PII in Logs** - Sensitive data automatically masked

## Requirements

- **Requirement 8.1**: Structured logging with correlation IDs and sensitive data masking
