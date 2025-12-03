# Reliability Module

Production-ready fault tolerance utilities for the Anóteros Lógos platform.

## Overview

This module provides comprehensive reliability patterns and utilities to ensure the system operates reliably in production:

- **Custom Error Classes**: Typed error hierarchy with correlation IDs
- **Retry Logic**: Exponential backoff with jitter and idempotency
- **Circuit Breaker**: Prevent cascading failures
- **Health Checks**: Liveness and readiness probes
- **Graceful Shutdown**: Clean resource cleanup
- **Concurrency Control**: Locks, mutexes, and atomic operations

## Features

### 1. Custom Error Classes

Typed error hierarchy for better error handling and debugging.

```typescript
import { 
  ApplicationError, 
  DatabaseError, 
  ExternalServiceError,
  isRetryableError 
} from 'lib/reliability';

// Throw typed errors
throw new DatabaseError('Connection failed', correlationId, originalError);

// Check if error is retryable
if (isRetryableError(error)) {
  // Retry the operation
}
```

**Available Error Classes:**
- `ApplicationError` - Base error class
- `SecurityError` - Security violations (403)
- `AuthenticationError` - Auth failures (401)
- `AuthorizationError` - Permission denied (403)
- `ValidationError` - Input validation (400)
- `DatabaseError` - Database operations (500)
- `ExternalServiceError` - External API calls (502)
- `NetworkError` - Network issues (503)
- `RateLimitError` - Rate limiting (429)
- `NotFoundError` - Resource not found (404)
- `ConflictError` - Resource conflicts (409)
- `CircuitBreakerError` - Circuit breaker open (503)
- `TimeoutError` - Operation timeout (504)

### 2. Retry Logic

Automatic retry with exponential backoff and jitter.

```typescript
import { withRetry, API_RETRY_CONFIG } from 'lib/reliability';

const result = await withRetry(
  async () => {
    return await fetch('https://api.example.com/data');
  },
  {
    ...API_RETRY_CONFIG,
    onRetry: (error, attempt, delay) => {
      console.log(`Retry attempt ${attempt} after ${delay}ms`);
    }
  }
);
```

**Features:**
- Exponential backoff (default: 1s, 2s, 4s)
- Jitter to prevent thundering herd
- Max retry count (default: 3)
- Custom retry predicates
- Idempotency key support

**Predefined Configurations:**
- `DATABASE_RETRY_CONFIG` - For database operations
- `API_RETRY_CONFIG` - For external API calls
- `NETWORK_RETRY_CONFIG` - For network operations

### 3. Circuit Breaker

Prevent cascading failures by stopping requests to failing services.

```typescript
import { CircuitBreaker, globalCircuitBreakerRegistry } from 'lib/reliability';

// Create a circuit breaker
const breaker = new CircuitBreaker({
  failureThreshold: 5,
  timeout: 60000,
  successThreshold: 2,
  name: 'external-api',
});

// Execute operation through circuit breaker
try {
  const result = await breaker.execute(async () => {
    return await fetch('https://api.example.com/data');
  });
} catch (error) {
  if (error instanceof CircuitBreakerError) {
    console.log('Circuit breaker is open, service unavailable');
  }
}

// Or use the global registry
const breaker = globalCircuitBreakerRegistry.getOrCreate('stripe-api', {
  failureThreshold: 5,
});
```

**States:**
- `CLOSED` - Normal operation, requests pass through
- `OPEN` - Too many failures, requests blocked
- `HALF_OPEN` - Testing recovery, limited requests allowed

**Configuration:**
- `failureThreshold` - Failures before opening (default: 5)
- `timeout` - Time before attempting half-open (default: 60s)
- `successThreshold` - Successes to close from half-open (default: 2)

### 4. Health Checks

Liveness and readiness probes for Kubernetes/container orchestration.

```typescript
import { 
  globalHealthCheckManager,
  createDatabaseHealthCheck,
  createHttpHealthCheck,
  createRedisHealthCheck
} from 'lib/reliability';

// Register health checks
globalHealthCheckManager.register(
  'database',
  createDatabaseHealthCheck(supabase)
);

globalHealthCheckManager.register(
  'stripe',
  createHttpHealthCheck('https://api.stripe.com/health')
);

// Check health
const result = await globalHealthCheckManager.checkHealth();
console.log(result.status); // 'healthy', 'degraded', or 'unhealthy'
```

**API Endpoints:**
- `GET /api/health` - Liveness probe (always returns 200 if running)
- `GET /api/ready` - Readiness probe (checks all dependencies)

**Health Status:**
- `HEALTHY` - All systems operational
- `DEGRADED` - Some issues but still functional
- `UNHEALTHY` - Critical issues, not ready for traffic

### 5. Graceful Shutdown

Clean shutdown with resource cleanup.

```typescript
import { 
  globalShutdownManager,
  createDatabaseCleanup,
  createRedisCleanup,
  createServerCleanup
} from 'lib/reliability';

// Register cleanup hooks
globalShutdownManager.registerCleanup(
  'database',
  createDatabaseCleanup(db)
);

globalShutdownManager.registerCleanup(
  'redis',
  createRedisCleanup(redis)
);

globalShutdownManager.registerCleanup(
  'server',
  createServerCleanup(server)
);

// Start listening for shutdown signals
globalShutdownManager.listen();
```

**Features:**
- SIGTERM/SIGINT signal handling
- Configurable timeout (default: 30s)
- Parallel cleanup execution
- Graceful error handling

### 6. Concurrency Control

Prevent race conditions with locks and mutexes.

```typescript
import { 
  withOptimisticLock,
  Mutex,
  globalMutexRegistry
} from 'lib/reliability';

// Optimistic locking with version column
const result = await withOptimisticLock(
  supabase,
  'accounts',
  'user-123',
  async (record) => {
    return { balance: record.balance - 100 };
  }
);

if (!result.success) {
  console.error('Concurrent modification detected');
}

// In-memory mutex
const mutex = new Mutex();
await mutex.runExclusive(async () => {
  // Critical section - only one execution at a time
});

// Or use the global registry
await globalMutexRegistry.runExclusive('user-123', async () => {
  // Critical section for this user
});
```

**Features:**
- Optimistic locking with version column
- Pessimistic locking (SELECT FOR UPDATE)
- In-memory mutexes
- Redis distributed locks
- Atomic operations

## Usage Examples

### Complete Application Setup

```typescript
import {
  globalHealthCheckManager,
  globalShutdownManager,
  globalCircuitBreakerRegistry,
  createDatabaseHealthCheck,
  createDatabaseCleanup,
} from 'lib/reliability';

// Setup health checks
globalHealthCheckManager.register(
  'database',
  createDatabaseHealthCheck(supabase)
);

// Setup circuit breakers
const stripeBreaker = globalCircuitBreakerRegistry.getOrCreate('stripe', {
  failureThreshold: 5,
  timeout: 60000,
});

// Setup graceful shutdown
globalShutdownManager.registerCleanup(
  'database',
  createDatabaseCleanup(supabase)
);

globalShutdownManager.listen();
```

### Resilient API Call

```typescript
import { withRetry, CircuitBreaker, API_RETRY_CONFIG } from 'lib/reliability';

const breaker = new CircuitBreaker({ name: 'stripe-api' });

async function chargeCustomer(amount: number) {
  return await breaker.execute(async () => {
    return await withRetry(
      async () => {
        const response = await fetch('https://api.stripe.com/charges', {
          method: 'POST',
          body: JSON.stringify({ amount }),
        });
        
        if (!response.ok) {
          throw new ExternalServiceError('Stripe API failed', undefined, 'stripe');
        }
        
        return response.json();
      },
      API_RETRY_CONFIG
    );
  });
}
```

### Safe Concurrent Updates

```typescript
import { withOptimisticLock } from 'lib/reliability';

async function deductBalance(userId: string, amount: number) {
  const result = await withOptimisticLock(
    supabase,
    'accounts',
    userId,
    async (account) => {
      if (account.balance < amount) {
        throw new ValidationError('Insufficient balance');
      }
      
      return {
        balance: account.balance - amount,
      };
    },
    3 // Max retries
  );
  
  if (!result.success) {
    throw new ConflictError('Concurrent modification detected');
  }
  
  return result.data;
}
```

## Testing

Run tests:

```bash
npm test -- lib/reliability/__tests__/ --run
```

All tests include:
- Unit tests for each module
- Integration tests for database operations
- Property-based tests for retry logic
- Circuit breaker state machine tests

## Correctness Properties

This module implements the following correctness properties from the design document:

- **Property 17**: Serializable Concurrent Updates (Requirements 5.1)
- **Property 19**: Automatic Retry on Transient Failures (Requirements 5.3)
- **Property 20**: Circuit Breaker Activation (Requirements 5.3)
- **Property 21**: Typed Error Handling (Requirements 5.4)
- **Property 22**: Health Check Accuracy (Requirements 5.5)

## Architecture

```
lib/reliability/
├── errors.ts              # Custom error classes
├── retry.ts               # Retry logic with backoff
├── circuitBreaker.ts      # Circuit breaker pattern
├── health.ts              # Health check system
├── shutdown.ts            # Graceful shutdown
├── concurrency.ts         # Locks and mutexes
├── index.ts               # Module exports
├── README.md              # This file
└── __tests__/
    ├── errors.test.ts
    ├── retry.test.ts
    ├── circuitBreaker.test.ts
    └── health.test.ts
```

## Best Practices

1. **Always use typed errors** - Throw specific error classes instead of generic Error
2. **Add correlation IDs** - Include correlation IDs in all errors for tracing
3. **Use circuit breakers for external services** - Prevent cascading failures
4. **Implement health checks** - Enable proper orchestration and monitoring
5. **Register cleanup hooks** - Ensure graceful shutdown
6. **Use optimistic locking** - Prevent race conditions in concurrent updates
7. **Retry transient failures** - Use exponential backoff with jitter
8. **Monitor circuit breaker states** - Alert when circuits open

## Performance Considerations

- Circuit breakers add minimal overhead (~1ms per request)
- Retry logic adds latency only on failures
- Health checks run in parallel
- Mutexes are in-memory and very fast
- Optimistic locking requires version column in database

## Production Deployment

1. Configure health check endpoints in Kubernetes:
   ```yaml
   livenessProbe:
     httpGet:
       path: /api/health
       port: 3000
     initialDelaySeconds: 30
     periodSeconds: 10
   
   readinessProbe:
     httpGet:
       path: /api/ready
       port: 3000
     initialDelaySeconds: 5
     periodSeconds: 5
   ```

2. Monitor circuit breaker states in Grafana
3. Set up alerts for health check failures
4. Test graceful shutdown in staging
5. Configure appropriate timeouts for your workload

## License

MIT
