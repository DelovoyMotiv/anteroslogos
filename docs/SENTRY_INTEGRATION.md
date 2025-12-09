# Sentry Integration Guide for Agent Middleware

## Overview

Sentry provides error tracking and performance monitoring for the Agent Middleware system. This guide covers setup, configuration, and best practices.

## Features

The Agent Middleware Sentry integration provides:

1. **Error Tracking**
   - Automatic exception capture
   - Stack traces with source maps
   - Error context (URL, API key, request data)
   - Error grouping and deduplication

2. **Performance Monitoring**
   - Request latency tracking
   - Cache hit/miss rates
   - Extraction performance
   - Database query performance

3. **Alerting**
   - Real-time error notifications
   - Performance degradation alerts
   - Quota exhaustion warnings
   - Custom metric alerts

## Setup

### 1. Create Sentry Account

1. Go to [sentry.io](https://sentry.io)
2. Sign up for free account
3. Create a new organization

### 2. Create Project

1. Click "Create Project"
2. Select platform: **Node.js**
3. Set alert frequency: **On every new issue**
4. Name your project: `agent-middleware`
5. Click "Create Project"

### 3. Get DSN

1. Go to Project Settings → Client Keys (DSN)
2. Copy the DSN (format: `https://key@sentry.io/project-id`)
3. Add to environment variables:

```bash
SENTRY_DSN=https://your-key@o123456.ingest.sentry.io/7654321
SENTRY_ENVIRONMENT=production
SENTRY_SAMPLE_RATE=1.0
SENTRY_TRACES_SAMPLE_RATE=0.1
```

### 4. Install Dependencies

Already installed in the project:

```json
{
  "dependencies": {
    "@sentry/node": "^10.27.0",
    "@sentry/react": "^10.27.0"
  }
}
```

### 5. Initialize Sentry

Sentry is initialized in the API route handler:

```typescript
// api/v1/agent/wrap.ts
import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || 'production',
    sampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE || '1.0'),
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
    ],
  });
}
```

## Configuration

### Environment Variables

```bash
# Required: Sentry DSN
SENTRY_DSN=https://your-key@sentry.io/project-id

# Environment name (development, staging, production)
SENTRY_ENVIRONMENT=production

# Error sampling rate (0.0 to 1.0)
# 1.0 = capture all errors
# 0.1 = capture 10% of errors
SENTRY_SAMPLE_RATE=1.0

# Performance monitoring sampling rate (0.0 to 1.0)
# 0.1 = monitor 10% of transactions
# Higher values increase costs
SENTRY_TRACES_SAMPLE_RATE=0.1

# Enable debug mode (verbose logging)
SENTRY_DEBUG=false

# Release version (for tracking deployments)
SENTRY_RELEASE=agent-middleware@1.0.0
```

### Sampling Strategies

#### Production

```bash
SENTRY_SAMPLE_RATE=1.0          # Capture all errors
SENTRY_TRACES_SAMPLE_RATE=0.1   # Monitor 10% of requests
```

#### Staging

```bash
SENTRY_SAMPLE_RATE=1.0          # Capture all errors
SENTRY_TRACES_SAMPLE_RATE=0.5   # Monitor 50% of requests
```

#### Development

```bash
SENTRY_SAMPLE_RATE=1.0          # Capture all errors
SENTRY_TRACES_SAMPLE_RATE=1.0   # Monitor all requests
```

## Error Tracking

### Automatic Error Capture

Errors are automatically captured:

```typescript
// Unhandled exceptions
throw new Error('Something went wrong');

// Async errors
async function fetchData() {
  throw new Error('Fetch failed');
}

// Promise rejections
Promise.reject(new Error('Promise failed'));
```

### Manual Error Capture

Capture errors with context:

```typescript
import * as Sentry from '@sentry/node';

try {
  await extractUrl(url);
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      component: 'extraction-engine',
      mode: 'deep',
    },
    extra: {
      url,
      apiKeyId,
      timestamp: new Date().toISOString(),
    },
  });
  throw error;
}
```

### Error Context

Add context to all errors:

```typescript
// Set user context
Sentry.setUser({
  id: apiKey.tenant_id,
  username: apiKey.id,
});

// Set tags
Sentry.setTag('api_version', '1.0.0');
Sentry.setTag('extraction_mode', 'fast');

// Set extra data
Sentry.setExtra('request_url', url);
Sentry.setExtra('cache_hit', false);
```

### Error Filtering

Filter out expected errors:

```typescript
Sentry.init({
  beforeSend(event, hint) {
    const error = hint.originalException;
    
    // Don't send validation errors
    if (error?.message?.includes('ERR_INVALID_URL')) {
      return null;
    }
    
    // Don't send rate limit errors
    if (error?.message?.includes('ERR_RATE_LIMIT')) {
      return null;
    }
    
    return event;
  },
});
```

## Performance Monitoring

### Transaction Tracking

Track request performance:

```typescript
import * as Sentry from '@sentry/node';

export async function POST(request: Request) {
  const transaction = Sentry.startTransaction({
    op: 'http.server',
    name: 'POST /api/v1/agent/wrap',
  });

  try {
    // Your code here
    const result = await processRequest(request);
    
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    throw error;
  } finally {
    transaction.finish();
  }
}
```

### Span Tracking

Track individual operations:

```typescript
const transaction = Sentry.getCurrentHub().getScope()?.getTransaction();

// Cache lookup
const cacheSpan = transaction?.startChild({
  op: 'cache.get',
  description: 'Redis cache lookup',
});
const cached = await cache.get(key);
cacheSpan?.finish();

// Extraction
const extractSpan = transaction?.startChild({
  op: 'extraction',
  description: 'URL extraction',
});
const result = await extractor.extract(url);
extractSpan?.finish();

// Serialization
const serializeSpan = transaction?.startChild({
  op: 'serialization',
  description: 'Format conversion',
});
const serialized = await serializer.toCompactJson(result);
serializeSpan?.finish();
```

### Custom Metrics

Track custom metrics:

```typescript
// Cache hit rate
Sentry.metrics.increment('cache.hit', 1, {
  tags: { mode: 'fast' },
});

// Token savings
Sentry.metrics.distribution('tokens.saved', tokensSaved, {
  unit: 'none',
  tags: { format: 'compact' },
});

// Extraction latency
Sentry.metrics.distribution('extraction.latency', latencyMs, {
  unit: 'millisecond',
  tags: { mode: 'deep' },
});
```

## Alerting

### Alert Rules

Set up alerts in Sentry Dashboard:

1. **High Error Rate**
   - Condition: Error count > 10 in 5 minutes
   - Action: Email + Slack notification

2. **Performance Degradation**
   - Condition: P95 latency > 10 seconds
   - Action: Email notification

3. **Cache Failures**
   - Condition: Cache error count > 5 in 1 minute
   - Action: PagerDuty alert

4. **Quota Exhaustion**
   - Condition: Quota exceeded errors > 10 in 1 hour
   - Action: Email notification

### Alert Configuration

```typescript
// In Sentry Dashboard
{
  "name": "High Error Rate",
  "conditions": [
    {
      "id": "sentry.rules.conditions.event_frequency.EventFrequencyCondition",
      "interval": "5m",
      "value": 10
    }
  ],
  "actions": [
    {
      "id": "sentry.mail.actions.NotifyEmailAction",
      "targetType": "Team",
      "targetIdentifier": "engineering"
    }
  ]
}
```

## Monitoring Dashboard

### Key Metrics

Monitor these metrics in Sentry:

1. **Error Rate**
   - Total errors per hour
   - Error rate by endpoint
   - Error rate by API key

2. **Performance**
   - P50, P95, P99 latency
   - Cache hit rate
   - Extraction time

3. **Usage**
   - Requests per hour
   - Quota usage
   - API key distribution

4. **Availability**
   - Uptime percentage
   - Error-free sessions
   - Success rate

### Custom Dashboard

Create custom dashboard in Sentry:

```json
{
  "title": "Agent Middleware Dashboard",
  "widgets": [
    {
      "title": "Error Rate",
      "displayType": "line",
      "queries": [
        {
          "name": "Errors",
          "fields": ["count()"],
          "conditions": "event.type:error",
          "orderby": "-count()"
        }
      ]
    },
    {
      "title": "P95 Latency",
      "displayType": "line",
      "queries": [
        {
          "name": "Latency",
          "fields": ["p95(transaction.duration)"],
          "conditions": "event.type:transaction",
          "orderby": "-p95(transaction.duration)"
        }
      ]
    },
    {
      "title": "Cache Hit Rate",
      "displayType": "line",
      "queries": [
        {
          "name": "Cache Hits",
          "fields": ["count()"],
          "conditions": "cache_hit:true"
        }
      ]
    }
  ]
}
```

## Best Practices

### 1. Error Context

Always include relevant context:

```typescript
Sentry.captureException(error, {
  tags: {
    component: 'extraction-engine',
    mode: request.mode,
    format: request.format,
  },
  extra: {
    url: request.url,
    apiKeyId: apiKey.id,
    tenantId: apiKey.tenant_id,
    cacheHit: false,
    latencyMs: Date.now() - startTime,
  },
  user: {
    id: apiKey.tenant_id,
  },
});
```

### 2. Breadcrumbs

Add breadcrumbs for debugging:

```typescript
Sentry.addBreadcrumb({
  category: 'cache',
  message: 'Cache lookup',
  level: 'info',
  data: { key, hit: false },
});

Sentry.addBreadcrumb({
  category: 'extraction',
  message: 'Starting extraction',
  level: 'info',
  data: { url, mode: 'fast' },
});
```

### 3. Release Tracking

Track releases for better debugging:

```bash
# Set release version
SENTRY_RELEASE=agent-middleware@1.0.0

# Create release in Sentry
sentry-cli releases new agent-middleware@1.0.0
sentry-cli releases set-commits agent-middleware@1.0.0 --auto
sentry-cli releases finalize agent-middleware@1.0.0
```

### 4. Source Maps

Upload source maps for better stack traces:

```bash
# Build with source maps
npm run build

# Upload to Sentry
sentry-cli sourcemaps upload --release agent-middleware@1.0.0 ./dist
```

### 5. Performance Budget

Set performance budgets:

```typescript
// Alert if P95 > 10 seconds
if (latencyP95 > 10000) {
  Sentry.captureMessage('Performance budget exceeded', {
    level: 'warning',
    extra: { latencyP95 },
  });
}
```

## Troubleshooting

### Issue: Events Not Appearing

**Solutions**:
1. Verify `SENTRY_DSN` is set correctly
2. Check sample rate is not 0
3. Verify network connectivity
4. Check Sentry status page

```bash
# Test Sentry connection
curl -X POST https://sentry.io/api/0/projects/your-org/your-project/store/ \
  -H "X-Sentry-Auth: Sentry sentry_key=your-key" \
  -d '{"message":"test"}'
```

### Issue: Too Many Events

**Solutions**:
1. Reduce sample rate
2. Add error filtering
3. Implement rate limiting
4. Use `beforeSend` hook

```typescript
Sentry.init({
  sampleRate: 0.1, // Capture 10% of errors
  beforeSend(event) {
    // Filter out noisy errors
    if (event.message?.includes('ERR_RATE_LIMIT')) {
      return null;
    }
    return event;
  },
});
```

### Issue: High Costs

**Solutions**:
1. Reduce traces sample rate
2. Filter out expected errors
3. Implement error grouping
4. Use quota management

```bash
# Reduce performance monitoring
SENTRY_TRACES_SAMPLE_RATE=0.01  # Monitor 1% of requests
```

## Cost Optimization

### Pricing Tiers

- **Developer**: Free (5K errors/month)
- **Team**: $26/month (50K errors/month)
- **Business**: $80/month (250K errors/month)

### Optimization Strategies

1. **Sampling**
   ```bash
   SENTRY_SAMPLE_RATE=0.1          # 10% of errors
   SENTRY_TRACES_SAMPLE_RATE=0.01  # 1% of traces
   ```

2. **Filtering**
   ```typescript
   beforeSend(event) {
     // Filter validation errors
     if (event.tags?.error_code?.startsWith('ERR_INVALID')) {
       return null;
     }
     return event;
   }
   ```

3. **Grouping**
   ```typescript
   beforeSend(event) {
     // Group similar errors
     if (event.exception?.values?.[0]) {
       event.fingerprint = ['{{ default }}', event.tags?.error_code];
     }
     return event;
   }
   ```

## Additional Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [Sentry Node.js SDK](https://docs.sentry.io/platforms/node/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Alert Rules](https://docs.sentry.io/product/alerts/)
- [Pricing](https://sentry.io/pricing/)
