# OpenTelemetry Distributed Tracing

Comprehensive distributed tracing implementation using OpenTelemetry for the Anóteros Lógos platform.

## Features

- ✅ Automatic HTTP request tracing
- ✅ Database query tracing
- ✅ External API call tracing
- ✅ A2A protocol message tracing
- ✅ Cache operation tracing
- ✅ Background job tracing
- ✅ Trace context propagation
- ✅ OTLP HTTP exporter
- ✅ Automatic instrumentation

## Installation

The required packages are already installed:

```bash
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http @opentelemetry/resources \
  @opentelemetry/semantic-conventions
```

## Quick Start

### 1. Initialize Tracing

Initialize tracing at application startup:

```typescript
import { initializeTracing } from './lib/tracing';
import { getTracingConfig } from './lib/tracing/config';

// Initialize with environment-based config
const config = getTracingConfig();
initializeTracing(config);

// Or use custom config
initializeTracing({
  serviceName: 'anoteros-logos',
  serviceVersion: '1.0.0',
  environment: 'production',
  otlpEndpoint: 'https://api.honeycomb.io',
  enabled: true,
  sampleRate: 0.1,
});
```

### 2. Add Middleware

Add tracing middleware to your Express app:

```typescript
import express from 'express';
import { tracingMiddleware } from './lib/tracing';

const app = express();

// Add tracing middleware early in the chain
app.use(tracingMiddleware);

// Your routes...
app.get('/api/audit', async (req, res) => {
  // Automatically traced!
  res.json({ status: 'ok' });
});
```

### 3. Trace Database Queries

```typescript
import { traceDbQuery } from './lib/tracing';
import { supabase } from './lib/supabase';

async function getUser(userId: string) {
  return traceDbQuery('select', 'profiles', async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  });
}
```

### 4. Trace External API Calls

```typescript
import { traceExternalApiCall, propagateTraceContext } from './lib/tracing';

async function fetchExternalData(url: string) {
  return traceExternalApiCall('external-api', url, 'GET', async () => {
    // Propagate trace context to external service
    const headers = propagateTraceContext({
      'Content-Type': 'application/json',
    });
    
    const response = await fetch(url, { headers });
    return response.json();
  });
}
```

### 5. Trace A2A Messages

```typescript
import { traceA2AMessage } from './lib/tracing';

async function handleA2ARequest(method: string, agentId: string, params: A2AMessageParams) {
  return traceA2AMessage(method, agentId, async () => {
    // Process A2A message
    return processMessage(method, params);
  });
}
```

### 6. Manual Span Creation

```typescript
import { createSpan, getCurrentSpan } from './lib/tracing';

async function complexOperation() {
  const { span, end } = createSpan('complex-operation', {
    'operation.type': 'batch-processing',
    'operation.items': 100,
  });
  
  try {
    // Do work...
    span.addEvent('processing-started');
    
    await processItems();
    
    span.addEvent('processing-completed');
    end(); // Success
  } catch (error) {
    end(error); // Error
    throw error;
  }
}
```

## Environment Variables

Configure tracing via environment variables:

```bash
# Enable/disable tracing
OTEL_TRACING_ENABLED=true

# Service identification
OTEL_SERVICE_NAME=anoteros-logos
NODE_ENV=production

# OTLP exporter endpoint
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces

# Sampling rate (0.0 to 1.0)
OTEL_SAMPLE_RATE=1.0
```

## Integration with Observability Stack

### Jaeger (Local Development)

```bash
# Run Jaeger all-in-one
docker run -d --name jaeger \
  -e COLLECTOR_OTLP_ENABLED=true \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest

# View traces at http://localhost:16686
```

### Honeycomb (Production)

```bash
# Set environment variables
export OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io
export OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team=YOUR_API_KEY"
```

### Grafana Tempo

```bash
# Configure endpoint
export OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318/v1/traces
```

## Best Practices

### 1. Trace Context Propagation

Always propagate trace context when making external calls:

```typescript
const headers = propagateTraceContext({
  'Authorization': `Bearer ${token}`,
});

await fetch(url, { headers });
```

### 2. Add Meaningful Attributes

```typescript
const { span, end } = createSpan('payment-processing', {
  'payment.amount': amount,
  'payment.currency': 'USDC',
  'payment.user_id': userId,
  'payment.method': 'blockchain',
});
```

### 3. Record Important Events

```typescript
span.addEvent('payment-initiated', {
  'transaction.hash': txHash,
});

span.addEvent('payment-confirmed', {
  'block.number': blockNumber,
});
```

### 4. Handle Errors Properly

```typescript
try {
  await riskyOperation();
} catch (error) {
  const span = getCurrentSpan();
  if (span) {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
  }
  throw error;
}
```

## Trace Visualization

Traces include:

- **Span Name**: Operation being performed
- **Duration**: Time taken for operation
- **Attributes**: Contextual information
- **Events**: Important milestones
- **Status**: Success or error
- **Parent-Child Relationships**: Call hierarchy

Example trace:

```
POST /api/a2a [200ms]
├── db.select profiles [5ms]
├── external.openai [150ms]
│   └── http.post /v1/chat/completions [145ms]
├── cache.set audit-result [2ms]
└── db.insert audit_results [8ms]
```

## Performance Considerations

### Sampling

In production, use sampling to reduce overhead:

```typescript
initializeTracing({
  // ... other config
  sampleRate: 0.1, // Sample 10% of traces
});
```

### Async Operations

Tracing is designed to work with async operations:

```typescript
// Trace context is automatically propagated
await Promise.all([
  traceDbQuery('select', 'users', () => getUsers()),
  traceDbQuery('select', 'audits', () => getAudits()),
]);
```

## Testing

Tracing can be disabled in tests:

```typescript
// In test setup
process.env.OTEL_TRACING_ENABLED = 'false';
```

## Troubleshooting

### No traces appearing

1. Check if tracing is enabled: `OTEL_TRACING_ENABLED=true`
2. Verify OTLP endpoint is accessible
3. Check for initialization errors in logs
4. Ensure SDK is initialized before app starts

### Missing spans

1. Verify middleware is added to Express
2. Check if operations are wrapped with tracing helpers
3. Ensure trace context is propagated for external calls

### High overhead

1. Reduce sample rate in production
2. Disable file system instrumentation
3. Use batch span processor

## Property Validation

**Property 45: Distributed Tracing**

*For any* external service call, it should create span with trace context propagation

This property is validated by:
- Automatic span creation for HTTP requests
- Manual span creation helpers
- Trace context propagation utilities
- OTLP exporter integration

## References

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [OpenTelemetry Node.js](https://opentelemetry.io/docs/instrumentation/js/)
- [OTLP Specification](https://opentelemetry.io/docs/reference/specification/protocol/otlp/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
