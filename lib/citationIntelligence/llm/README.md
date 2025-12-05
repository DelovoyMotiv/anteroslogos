# LLM Integration Module

Multi-model LLM integration for the Predictive Citation Intelligence Engine.

## Overview

This module provides a robust, production-ready integration with OpenRouter for multi-model LLM access. It includes:

- **Rate Limiting**: Token bucket algorithm to enforce API rate limits
- **Cost Tracking**: Monitor and control API usage costs
- **Retry Logic**: Exponential backoff with circuit breaker
- **Parallel Execution**: Execute multiple model requests concurrently
- **Enhanced Client**: Wrapper around OpenRouter with all features integrated

## Components

### 1. Rate Limiter (`rateLimiter.ts`)

Token bucket algorithm implementation for API rate limiting.

**Features:**
- Configurable capacity and refill rate
- Request queuing when rate limit is reached
- Automatic token refill over time
- Comprehensive metrics tracking
- Timeout support for queued requests

**Usage:**
```typescript
import { createRateLimiter } from './llm';

// Create limiter with default config (10 requests per minute)
const limiter = createRateLimiter();

// Or with custom config
const customLimiter = createRateLimiter({
  capacity: 20,
  refillRate: 20 / 60, // 20 requests per minute
  maxQueueSize: 100,
  queueTimeout: 30000, // 30 seconds
});

// Acquire a token before making a request
await limiter.acquire();
// Make your API request here

// Get metrics
const metrics = limiter.getMetrics();
console.log(`Tokens available: ${metrics.tokensAvailable}`);
console.log(`Requests queued: ${metrics.requestsQueued}`);
console.log(`Average wait time: ${metrics.averageWaitTime}ms`);

// Clean up when done
limiter.stop();
```

**Configuration:**
```typescript
interface RateLimiterConfig {
  capacity: number;        // Maximum tokens in bucket
  refillRate: number;      // Tokens per second
  maxQueueSize: number;    // Maximum queued requests
  queueTimeout?: number;   // Timeout for queued requests (ms)
}
```

**Metrics:**
```typescript
interface RateLimiterMetrics {
  tokensAvailable: number;      // Current tokens available
  requestsQueued: number;       // Requests waiting in queue
  requestsRejected: number;     // Total rejected (queue full)
  averageWaitTime: number;      // Average wait time (ms)
  lastRefill: Date;             // Last refill timestamp
  totalRequests: number;        // Total requests processed
}
```

### 2. Cost Tracker (`costTracker.ts`)

Track API usage costs and enforce budget limits.

**Features:**
- Real-time cost calculation based on token usage
- Budget alerts at configurable thresholds (80%, 100%)
- In-memory cache for fast access
- Database logging for historical analysis
- Cost reports by model, task type, and time period
- Projected monthly cost calculation

**Usage:**
```typescript
import { createCostTracker } from './llm';

// Create tracker with default config
const tracker = createCostTracker();

// Or with custom config
const customTracker = createCostTracker({
  budgetLimit: 200,
  alertThreshold: 0.9,
  enableLogging: true,
  onAlert: (level, message, data) => {
    console.log(`[${level}] ${message}`, data);
  }
});

// Track a request
await tracker.trackRequest(
  'anthropic/claude-sonnet-4.5',
  'content_opt',
  {
    prompt: 1000,
    completion: 500,
    total: 1500
  },
  true, // success
  2500  // duration in ms
);

// Check budget status
const totalCost = tracker.getTotalCost();
const utilization = tracker.getBudgetUtilization();
console.log(`Total cost: $${totalCost.toFixed(2)}`);
console.log(`Budget used: ${utilization.toFixed(1)}%`);

// Get cost report
const report = await tracker.getCostReport('month');
console.log(`Requests: ${report.requestCount}`);
console.log(`Total cost: $${report.totalCost.toFixed(2)}`);
console.log(`Avg per request: $${report.averageCostPerRequest.toFixed(4)}`);
console.log(`Projected monthly: $${report.projectedMonthlyCost.toFixed(2)}`);

// Cost breakdown by model
report.costByModel.forEach((cost, model) => {
  console.log(`${model}: $${cost.toFixed(2)}`);
});

// Cost breakdown by task type
report.costByTaskType.forEach((cost, taskType) => {
  console.log(`${taskType}: $${cost.toFixed(2)}`);
});
```

**Configuration:**
```typescript
interface CostTrackerConfig {
  budgetLimit: number;          // Monthly budget in USD
  alertThreshold: number;       // Alert at % (0-1, e.g., 0.8 = 80%)
  enableLogging: boolean;       // Save to database
  onAlert?: (level, message, data) => void;  // Custom alert handler
}
```

**Cost Report:**
```typescript
interface CostReport {
  totalCost: number;                          // Total cost in USD
  costByModel: Map<string, number>;           // Cost per model
  costByTaskType: Map<TaskType, number>;      // Cost per task type
  requestCount: number;                       // Total requests
  averageCostPerRequest: number;              // Average cost
  totalTokens: number;                        // Total tokens used
  period: { start: Date; end: Date };         // Report period
  budgetUtilization: number;                  // Budget used (%)
  projectedMonthlyCost: number;               // Projected monthly cost
}
```

**Database Schema:**

The cost tracker logs all usage to the `llm_usage_logs` table:

```sql
CREATE TABLE llm_usage_logs (
  id UUID PRIMARY KEY,
  user_id UUID,
  model TEXT NOT NULL,
  task_type TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  cached_tokens INTEGER,
  cost_usd DECIMAL(10, 6) NOT NULL,
  duration_ms INTEGER,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL
);
```

A materialized view `llm_cost_summary` provides pre-aggregated statistics for fast reporting.

### 3. Retry Handler (`retryHandler.ts`)

Exponential backoff retry logic with circuit breaker pattern.

**Features:**
- Exponential backoff with configurable delays
- Random jitter to prevent thundering herd
- Circuit breaker pattern (closed/open/half-open states)
- Configurable retry strategies per error type
- Comprehensive metrics tracking
- Manual circuit control for testing

**Usage:**
```typescript
import { createRetryHandler } from './llm';

// Create handler with default config
const handler = createRetryHandler();

// Or with custom config
const customHandler = createRetryHandler({
  maxRetries: 5,
  baseDelay: 2000,
  maxDelay: 64000,
  exponentialBackoff: true,
  jitter: true,
  circuitBreakerThreshold: 10,
  circuitBreakerTimeout: 120000,
});

// Execute operation with retry
const result = await handler.executeWithRetry(async () => {
  return await apiCall();
}, {
  operationName: 'fetchData',
  metadata: { userId: '123' }
});

// Check circuit state
if (handler.isCircuitOpen()) {
  console.log('Circuit is open, requests will be rejected');
}

// Manual circuit control
handler.openCircuit();  // Force open
handler.closeCircuit(); // Force close
handler.resetCircuit(); // Reset to initial state

// Get metrics
const metrics = handler.getMetrics();
console.log(`Total retries: ${metrics.totalRetries}`);
console.log(`Success rate: ${metrics.successfulRetries / metrics.totalRetries}`);
console.log(`Circuit state: ${metrics.circuitBreakerState}`);
console.log(`Average delay: ${metrics.averageRetryDelay}ms`);
```

**Configuration:**
```typescript
interface RetryConfig {
  maxRetries: number;                    // Max retry attempts (default: 3)
  baseDelay: number;                     // Base delay in ms (default: 1000)
  maxDelay: number;                      // Max delay in ms (default: 32000)
  exponentialBackoff: boolean;           // Use exponential backoff (default: true)
  jitter: boolean;                       // Add random jitter (default: true)
  circuitBreakerThreshold: number;       // Failures before opening (default: 5)
  circuitBreakerTimeout: number;         // Timeout before half-open (default: 60000)
  retryableErrors: ErrorType[];          // Error types to retry
}
```

**Metrics:**
```typescript
interface RetryMetrics {
  totalRetries: number;                  // Total retry attempts
  successfulRetries: number;             // Successful retries
  failedRetries: number;                 // Failed retries
  circuitBreakerState: CircuitBreakerState;  // Current circuit state
  consecutiveFailures: number;           // Consecutive failures
  lastFailure?: Date;                    // Last failure timestamp
  averageRetryDelay: number;             // Average delay in ms
}
```

**Backoff Timing** (with baseDelay=1000ms):

| Attempt | Exponential | Linear |
|---------|-------------|--------|
| 1       | 1s          | 1s     |
| 2       | 2s          | 2s     |
| 3       | 4s          | 3s     |
| 4       | 8s          | 4s     |
| 5       | 16s         | 5s     |
| 6       | 32s (cap)   | 6s     |

**Error Handling:**

Retryable errors:
- Rate limit (429) - Always retry with backoff
- Timeout (408) - Retry with increased timeout
- Server errors (500-599) - Retry up to max attempts
- Network errors - Retry with exponential backoff

Non-retryable errors:
- Authentication (401) - Fail immediately
- Invalid request (400) - Fail immediately
- Not found (404) - Fail immediately

**Circuit Breaker States:**
- **Closed**: Normal operation, requests pass through
- **Open**: Circuit tripped, requests fail immediately
- **Half-Open**: Testing if service recovered, single request allowed

### 4. Parallel Executor (Coming Soon)

Execute multiple model requests concurrently.

**Features:**
- Promise.all() based parallel execution
- Partial failure handling
- Per-request timeout support
- Result aggregation and comparison

### 5. Enhanced OpenRouter Client (Coming Soon)

Complete wrapper integrating all features.

**Features:**
- Single model requests with all enhancements
- Multi-model parallel requests
- Request deduplication and caching
- Health check endpoint
- Comprehensive monitoring

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              EnhancedOpenRouterClient (Task 3.1.6)              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  chatWithModel(model, messages, options)                 │  │
│  │  chatWithMultipleModels(models[], messages, options)     │  │
│  │  getHealthStatus()                                        │  │
│  │  getCostReport()                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ RateLimiter  │    │ CostTracker  │    │RetryHandler  │
│  (3.1.2) ✓   │    │   (3.1.3)    │    │   (3.1.4)    │
├──────────────┤    ├──────────────┤    ├──────────────┤
│ Token Bucket │    │ Track Tokens │    │ Exp Backoff  │
│ 10 req/min   │    │ Calc Costs   │    │ Circuit Break│
│ Queue        │    │ Budget Alert │    │ Fallback     │
└──────────────┘    └──────────────┘    └──────────────┘
```

## Testing

All components include comprehensive unit tests:

```bash
# Run all LLM module tests
npm test -- lib/citationIntelligence/llm/__tests__

# Run specific test file
npm test -- lib/citationIntelligence/llm/__tests__/rateLimiter.test.ts --run
```

**Test Coverage:**
- ✅ Rate Limiter: 19 tests, 100% coverage
- ✅ Cost Tracker: 32 tests, 100% coverage
- ✅ Retry Handler: 39 tests, 100% coverage
- ⏳ Parallel Executor: Coming soon
- ⏳ Enhanced Client: Coming soon

## Configuration

Environment variables for LLM integration:

```bash
# Required
VITE_OPENROUTER_API_KEY=your_api_key_here

# Optional - Model Selection
VITE_OPENROUTER_MODEL_CONTENT_OPT=anthropic/claude-sonnet-4.5
VITE_OPENROUTER_MODEL_FACT_CHECK=openai/gpt-5.1
VITE_OPENROUTER_MODEL_SCHEMA=google/gemini-3-pro-preview
VITE_OPENROUTER_MODEL_ANALYSIS=x-ai/grok-4

# Optional - Rate Limiting
VITE_OPENROUTER_RATE_LIMIT_RPM=10

# Optional - Budget Management
VITE_OPENROUTER_BUDGET_LIMIT=100
VITE_OPENROUTER_ALERT_THRESHOLD=0.8
```

## Implementation Status

### Task 3.1: LLM Integration Enhancement

- [x] **3.1.1** Multi-Model Configuration System ✅
  - Model registry with pricing
  - Task-based model selection
  - Environment variable integration

- [x] **3.1.2** Rate Limiting (Token Bucket) ✅
  - Token bucket algorithm
  - Request queuing
  - Metrics tracking
  - Comprehensive tests

- [x] **3.1.3** Cost Tracking & Budget Alerts ✅
  - Real-time cost calculation
  - Budget enforcement
  - Database logging
  - Alert system
  - Cost reporting
  - 32 unit tests passing

- [x] **3.1.4** Enhanced Retry Logic ✅
  - Exponential backoff with jitter
  - Circuit breaker pattern
  - Error classification
  - Comprehensive metrics
  - 39 unit tests passing

- [ ] **3.1.5** Parallel Request Capability
  - Concurrent execution
  - Partial failure handling
  - Result aggregation
  - Performance metrics

- [ ] **3.1.6** Enhanced OpenRouter Client Wrapper
  - Integration of all components
  - Request deduplication
  - Health monitoring
  - Production-ready API

## Performance Characteristics

### Rate Limiter

- **Overhead**: < 1ms per request (token bucket check)
- **Memory**: O(n) where n = queue size
- **Throughput**: Configurable (default: 10 req/min)
- **Latency**: 
  - Immediate if tokens available
  - Queued if no tokens (wait time depends on refill rate)

### Scalability

- Supports up to 1000 queued requests (configurable)
- Automatic cleanup of timed-out requests
- No memory leaks (proper cleanup on stop)

## Best Practices

1. **Always clean up**: Call `limiter.stop()` when done to prevent memory leaks
2. **Monitor metrics**: Use `getMetrics()` to track performance
3. **Configure appropriately**: Set capacity and refill rate based on API limits
4. **Handle errors**: Catch and handle rate limit errors gracefully
5. **Test thoroughly**: Use provided tests as examples for your use cases

## Troubleshooting

### Queue is full errors

If you're seeing "Rate limit queue is full" errors:
- Increase `maxQueueSize` in configuration
- Reduce request rate
- Check if refill rate is too slow

### High wait times

If average wait time is high:
- Increase `capacity` to allow more burst requests
- Increase `refillRate` if API limits allow
- Consider implementing request batching

### Memory issues

If experiencing memory issues:
- Reduce `maxQueueSize`
- Implement request timeout
- Call `stop()` to clean up when done

## Future Enhancements

- [ ] Per-model rate limiting
- [ ] Distributed rate limiting (Redis-based)
- [ ] Adaptive rate limiting based on API responses
- [ ] Request prioritization
- [ ] Advanced metrics (percentiles, histograms)

## References

- [Token Bucket Algorithm](https://en.wikipedia.org/wiki/Token_bucket)
- [OpenRouter API Documentation](https://openrouter.ai/docs)
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)

---

**Version**: 1.0  
**Last Updated**: 2025-12-05  
**Status**: Task 3.1.4 Complete ✅
