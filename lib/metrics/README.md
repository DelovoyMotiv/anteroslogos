# Prometheus Metrics Module

Comprehensive metrics collection and export for the Anóteros Lógos platform.

## Overview

This module provides Prometheus-compatible metrics for monitoring:
- API endpoint performance (latency, throughput, errors)
- Business metrics (audits, payments, users)
- Infrastructure metrics (database, cache, external services)
- Protocol metrics (A2A, knowledge graph, CCC)

**Property 42: Metrics Export**  
*For any* API endpoint, it should export latency and error rate metrics to Prometheus  
**Validates: Requirements 8.2**

## Installation

```bash
npm install prom-client
```

## Usage

### Automatic Metrics with Middleware

Wrap your API handlers with the metrics middleware:

```typescript
import { withMetrics } from '../lib/metrics/middleware';

export default withMetrics(async function handler(req, res) {
  // Your handler code
  return res.status(200).json({ success: true });
});
```

This automatically tracks:
- Request count
- Request duration
- Status codes
- Error types

### Manual Metrics Recording

For custom metrics or non-HTTP operations:

```typescript
import {
  recordAuditCompleted,
  recordPaymentTransaction,
  recordCacheAccess,
  recordDbQuery,
  recordExternalApiCall,
} from '../lib/metrics';

// Record audit completion
recordAuditCompleted('success', 45.2); // 45.2 seconds

// Record payment
recordPaymentTransaction('success', 'USDC', 100);

// Record cache access
recordCacheAccess('user-profiles', true, 0.005); // 5ms, hit

// Record database query
recordDbQuery('SELECT', 'users', 0.023); // 23ms

// Record external API call
recordExternalApiCall('stripe', '/v1/charges', 1.2); // 1.2s
```

### Business Metrics

Update business metrics as events occur:

```typescript
import {
  userSignupsTotal,
  activeUsers,
  apiQuotaUsage,
  knowledgeGraphNodes,
  cccCreditsDistributed,
} from '../lib/metrics';

// Increment user signups
userSignupsTotal.inc({ plan: 'pro' });

// Update active users count
activeUsers.set(1234);

// Update API quota usage
apiQuotaUsage.set({ user_id: 'user-123', plan: 'pro' }, 450);

// Update knowledge graph size
knowledgeGraphNodes.set({ type: 'entity' }, 5000);

// Record CCC credits distribution
cccCreditsDistributed.inc({ reason: 'knowledge_sync' }, 100);
```

### Circuit Breaker State

Track circuit breaker states:

```typescript
import { updateCircuitBreakerState } from '../lib/metrics';

// Update circuit breaker state
updateCircuitBreakerState('stripe-api', 'open');
updateCircuitBreakerState('stripe-api', 'half-open');
updateCircuitBreakerState('stripe-api', 'closed');
```

## Metrics Endpoint

The `/api/metrics` endpoint exposes all metrics in Prometheus format:

```bash
curl http://localhost:3000/api/metrics
```

Example output:
```
# HELP anoteros_http_requests_total Total number of HTTP requests
# TYPE anoteros_http_requests_total counter
anoteros_http_requests_total{method="GET",route="/api/health",status_code="200"} 1234

# HELP anoteros_http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE anoteros_http_request_duration_seconds histogram
anoteros_http_request_duration_seconds_bucket{method="GET",route="/api/health",status_code="200",le="0.01"} 1200
anoteros_http_request_duration_seconds_bucket{method="GET",route="/api/health",status_code="200",le="0.05"} 1230
...
```

## Prometheus Configuration

Add this to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'anoteros-logos'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/metrics'
```

## Grafana Dashboards

### Operations Dashboard

Key metrics to monitor:
- Request rate: `rate(anoteros_http_requests_total[5m])`
- Error rate: `rate(anoteros_http_errors_total[5m]) / rate(anoteros_http_requests_total[5m])`
- P95 latency: `histogram_quantile(0.95, rate(anoteros_http_request_duration_seconds_bucket[5m]))`
- Active users: `anoteros_active_users`

### Business Dashboard

Key metrics to monitor:
- Audits per hour: `rate(anoteros_audits_completed_total[1h]) * 3600`
- Payment success rate: `rate(anoteros_payment_transactions_total{status="success"}[1h]) / rate(anoteros_payment_transactions_total[1h])`
- User signups: `rate(anoteros_user_signups_total[1d]) * 86400`
- Knowledge graph growth: `anoteros_knowledge_graph_nodes`

### Infrastructure Dashboard

Key metrics to monitor:
- Database query latency: `histogram_quantile(0.95, rate(anoteros_db_query_duration_seconds_bucket[5m]))`
- Cache hit rate: `rate(anoteros_cache_hits_total[5m]) / (rate(anoteros_cache_hits_total[5m]) + rate(anoteros_cache_misses_total[5m]))`
- Circuit breaker states: `anoteros_circuit_breaker_state`
- External API latency: `histogram_quantile(0.95, rate(anoteros_external_api_duration_seconds_bucket[5m]))`

## Alert Rules

### Critical Alerts

```yaml
groups:
  - name: critical
    rules:
      - alert: HighErrorRate
        expr: rate(anoteros_http_errors_total[5m]) / rate(anoteros_http_requests_total[5m]) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"
      
      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(anoteros_http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High API latency detected"
          description: "P95 latency is {{ $value }}s"
      
      - alert: CircuitBreakerOpen
        expr: anoteros_circuit_breaker_state == 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Circuit breaker open for {{ $labels.service }}"
```

### Warning Alerts

```yaml
  - name: warning
    rules:
      - alert: LowCacheHitRate
        expr: rate(anoteros_cache_hits_total[10m]) / (rate(anoteros_cache_hits_total[10m]) + rate(anoteros_cache_misses_total[10m])) < 0.7
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Low cache hit rate"
          description: "Cache hit rate is {{ $value | humanizePercentage }}"
      
      - alert: SlowDatabaseQueries
        expr: histogram_quantile(0.95, rate(anoteros_db_query_duration_seconds_bucket[5m])) > 0.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Slow database queries detected"
          description: "P95 query latency is {{ $value }}s"
```

## Available Metrics

### HTTP Metrics
- `anoteros_http_requests_total` - Total HTTP requests
- `anoteros_http_request_duration_seconds` - HTTP request duration histogram
- `anoteros_http_errors_total` - Total HTTP errors

### Business Metrics
- `anoteros_audits_completed_total` - Total audits completed
- `anoteros_audit_duration_seconds` - Audit duration histogram
- `anoteros_payment_transactions_total` - Total payment transactions
- `anoteros_payment_amount_usdc` - Payment amounts histogram
- `anoteros_user_signups_total` - Total user signups
- `anoteros_active_users` - Current active users
- `anoteros_api_quota_usage` - API quota usage per user

### Database Metrics
- `anoteros_db_query_duration_seconds` - Database query duration histogram
- `anoteros_db_connection_pool_size` - Connection pool size
- `anoteros_db_errors_total` - Total database errors

### Cache Metrics
- `anoteros_cache_hits_total` - Total cache hits
- `anoteros_cache_misses_total` - Total cache misses
- `anoteros_cache_operation_duration_seconds` - Cache operation duration histogram

### External Service Metrics
- `anoteros_external_api_duration_seconds` - External API call duration histogram
- `anoteros_external_api_errors_total` - Total external API errors
- `anoteros_circuit_breaker_state` - Circuit breaker state (0=closed, 1=open, 2=half-open)

### Protocol Metrics
- `anoteros_a2a_messages_total` - Total A2A messages
- `anoteros_a2a_handshake_duration_seconds` - A2A handshake duration histogram
- `anoteros_knowledge_graph_nodes` - Knowledge graph node count
- `anoteros_knowledge_graph_edges` - Knowledge graph edge count
- `anoteros_ccc_credits_distributed_total` - Total CCC credits distributed

### Default Metrics
- `anoteros_process_cpu_user_seconds_total` - User CPU time
- `anoteros_process_cpu_system_seconds_total` - System CPU time
- `anoteros_process_resident_memory_bytes` - Resident memory
- `anoteros_nodejs_eventloop_lag_seconds` - Event loop lag
- `anoteros_nodejs_heap_size_total_bytes` - Total heap size
- `anoteros_nodejs_heap_size_used_bytes` - Used heap size

## Best Practices

1. **Use Labels Wisely**: Labels create new time series. Avoid high-cardinality labels (e.g., user IDs in HTTP metrics).

2. **Histogram Buckets**: Choose buckets that match your SLAs. Default buckets are optimized for typical API latencies.

3. **Counter vs Gauge**: Use counters for values that only increase (requests, errors). Use gauges for values that can go up or down (active users, queue depth).

4. **Metric Naming**: Follow Prometheus naming conventions:
   - Use `_total` suffix for counters
   - Use `_seconds` suffix for durations
   - Use `_bytes` suffix for sizes

5. **Performance**: Metrics collection has minimal overhead, but avoid creating metrics in hot loops.

## Testing

Run the metrics tests:

```bash
npm test lib/metrics
```

## Integration Examples

See `lib/metrics/examples/` for integration examples with:
- Express middleware
- Database query tracking
- Cache monitoring
- External API tracking

## Related Documentation

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Dashboards](https://grafana.com/docs/)
- [prom-client Library](https://github.com/siimon/prom-client)
