# Grafana Dashboards for Anóteros Lógos

This directory contains Grafana dashboard configurations for comprehensive observability of the Anóteros Lógos platform.

## Overview

Three pre-configured dashboards provide complete visibility into:

1. **Operations Dashboard** - System health, performance, and infrastructure metrics
2. **Business Metrics Dashboard** - User activity, audits, payments, and knowledge graph growth
3. **Security Dashboard** - Security events, authentication failures, and threat detection

## Prerequisites

- Grafana 9.0+ installed
- Prometheus data source configured
- Access to the `/api/metrics` endpoint (Prometheus format)

## Quick Start

### 1. Set Up Prometheus Data Source

In Grafana, add a Prometheus data source:

1. Navigate to **Configuration** → **Data Sources**
2. Click **Add data source**
3. Select **Prometheus**
4. Configure:
   - **Name**: `Prometheus`
   - **URL**: Your Prometheus server URL (e.g., `http://localhost:9090`)
   - **Scrape interval**: `15s` (recommended)
5. Click **Save & Test**

### 2. Configure Prometheus to Scrape Metrics

Add this job to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'anoteros-api'
    scrape_interval: 15s
    static_configs:
      - targets: ['your-domain.com']
    metrics_path: '/api/metrics'
    scheme: 'https'
```

For local development:

```yaml
scrape_configs:
  - job_name: 'anoteros-api-local'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/metrics'
    scheme: 'http'
```

Reload Prometheus configuration:
```bash
curl -X POST http://localhost:9090/-/reload
```

### 3. Import Dashboards

Import each dashboard JSON file:

1. In Grafana, navigate to **Dashboards** → **Import**
2. Click **Upload JSON file**
3. Select a dashboard file from `grafana/dashboards/`
4. Select the Prometheus data source
5. Click **Import**

Repeat for all three dashboards:
- `operations-dashboard.json`
- `business-metrics-dashboard.json`
- `security-dashboard.json`

## Dashboard Details

### Operations Dashboard

**Purpose**: Monitor system health and performance in real-time

**Key Panels**:
- **Request Rate**: Requests per second by endpoint
- **Error Rate**: Percentage of failed requests (threshold: 1%)
- **API Latency Percentiles**: p50, p95, p99 latency by endpoint
- **CPU Utilization**: Process CPU usage
- **Memory Usage**: Process memory consumption
- **Database Connection Pool**: Active, idle, and waiting connections
- **Cache Hit Rate**: Percentage of cache hits (target: >80%)

**Alerts**:
- Error rate > 1% for 5 minutes → Critical
- p95 latency > 500ms for 5 minutes → Warning
- Cache hit rate < 70% → Warning

**Refresh**: 10 seconds

### Business Metrics Dashboard

**Purpose**: Track business KPIs and user engagement

**Key Panels**:
- **Active Users**: Current number of active users
- **Audits (24h)**: Total audits completed in last 24 hours
- **New Signups (24h)**: User registrations in last 24 hours
- **Payment Success Rate**: Percentage of successful payments
- **Audits Completed (Hourly)**: Audit completion rate by status
- **Audit Duration**: p50, p95, p99 audit processing time
- **User Signups by Plan**: Breakdown by free/pro/enterprise
- **Payment Transactions (Hourly)**: Payment volume by status
- **Knowledge Graph Nodes**: Node count by type
- **CCC Credits Distributed (Hourly)**: Credit distribution by reason
- **A2A Protocol Messages (Hourly)**: Inter-agent communication volume

**Refresh**: 30 seconds

### Security Dashboard

**Purpose**: Monitor security events and detect threats

**Key Panels**:
- **Security Errors (1h)**: Count of security-related errors
- **Failed Auth Attempts (1h)**: Failed authentication count
- **Rate Limit Violations (1h)**: Number of rate-limited requests
- **Validation Errors (1h)**: Input validation failures
- **4xx Errors by Status Code**: Client error breakdown
- **Errors by Type**: Error classification
- **Failed Authentication by Endpoint**: Auth failures per endpoint
- **Rate Limit Violations by Endpoint**: Rate limiting per endpoint
- **Database Errors by Type**: Database error classification
- **External API Errors by Service**: Third-party service failures
- **Circuit Breaker States**: Circuit breaker status per service

**Alerts**:
- Security errors > 10 in 1 hour → Warning
- Failed auth attempts > 100 in 1 hour → Warning
- Rate limit violations > 200 in 1 hour → Critical

**Refresh**: 10 seconds

## Metrics Reference

### HTTP Metrics

```
anoteros_http_requests_total{method, route, status_code}
anoteros_http_request_duration_seconds{method, route, status_code}
anoteros_http_errors_total{method, route, error_type}
```

### Business Metrics

```
anoteros_audits_completed_total{status}
anoteros_audit_duration_seconds
anoteros_payment_transactions_total{status, currency}
anoteros_payment_amount_usdc{status}
anoteros_user_signups_total{plan}
anoteros_active_users
anoteros_api_quota_usage{user_id, plan}
```

### Database Metrics

```
anoteros_db_query_duration_seconds{operation, table}
anoteros_db_connection_pool_size{state}
anoteros_db_errors_total{operation, error_type}
```

### Cache Metrics

```
anoteros_cache_hits_total{cache_name}
anoteros_cache_misses_total{cache_name}
anoteros_cache_operation_duration_seconds{operation, cache_name}
```

### External Service Metrics

```
anoteros_external_api_duration_seconds{service, endpoint}
anoteros_external_api_errors_total{service, error_type}
anoteros_circuit_breaker_state{service}
```

### A2A Protocol Metrics

```
anoteros_a2a_messages_total{method, status}
anoteros_a2a_handshake_duration_seconds
```

### Knowledge Graph Metrics

```
anoteros_knowledge_graph_nodes{type}
anoteros_knowledge_graph_edges
anoteros_ccc_credits_distributed_total{reason}
```

## Alert Configuration

### Recommended Alert Rules

Create alert rules in Grafana or Prometheus:

#### Critical Alerts (PagerDuty)

```yaml
groups:
  - name: anoteros_critical
    interval: 1m
    rules:
      - alert: HighErrorRate
        expr: sum(rate(anoteros_http_errors_total[5m])) / sum(rate(anoteros_http_requests_total[5m])) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: HighLatency
        expr: histogram_quantile(0.95, sum(rate(anoteros_http_request_duration_seconds_bucket[5m])) by (le, route)) > 1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High API latency on {{ $labels.route }}"
          description: "p95 latency is {{ $value }}s"

      - alert: DatabaseConnectionPoolExhausted
        expr: anoteros_db_connection_pool_size{state="waiting"} > 10
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool exhausted"
          description: "{{ $value }} connections waiting"

      - alert: PaymentFailureRate
        expr: sum(rate(anoteros_payment_transactions_total{status="failed"}[5m])) / sum(rate(anoteros_payment_transactions_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High payment failure rate"
          description: "Payment failure rate is {{ $value | humanizePercentage }}"
```

#### Warning Alerts (Slack)

```yaml
  - name: anoteros_warnings
    interval: 1m
    rules:
      - alert: ElevatedErrorRate
        expr: sum(rate(anoteros_http_errors_total[10m])) / sum(rate(anoteros_http_requests_total[10m])) > 0.005
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Elevated error rate"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: SlowAPIEndpoint
        expr: histogram_quantile(0.95, sum(rate(anoteros_http_request_duration_seconds_bucket[5m])) by (le, route)) > 0.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Slow API endpoint {{ $labels.route }}"
          description: "p95 latency is {{ $value }}s"

      - alert: LowCacheHitRate
        expr: sum(rate(anoteros_cache_hits_total[5m])) / (sum(rate(anoteros_cache_hits_total[5m])) + sum(rate(anoteros_cache_misses_total[5m]))) < 0.7
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Low cache hit rate"
          description: "Cache hit rate is {{ $value | humanizePercentage }}"

      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes > 1e9
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanize }}B"
```

## Customization

### Adding Custom Panels

1. Open a dashboard in Grafana
2. Click **Add panel** → **Add a new panel**
3. Configure the query using PromQL
4. Customize visualization settings
5. Click **Apply**
6. Save the dashboard
7. Export JSON: **Dashboard settings** → **JSON Model** → Copy

### Modifying Thresholds

Edit the JSON file and update threshold values:

```json
"thresholds": {
  "mode": "absolute",
  "steps": [
    { "color": "green", "value": null },
    { "color": "yellow", "value": 0.005 },
    { "color": "red", "value": 0.01 }
  ]
}
```

### Adding Variables

Add template variables for filtering:

```json
"templating": {
  "list": [
    {
      "name": "environment",
      "type": "custom",
      "options": [
        { "text": "Production", "value": "prod" },
        { "text": "Staging", "value": "staging" }
      ]
    }
  ]
}
```

## Troubleshooting

### No Data in Dashboards

1. **Check Prometheus is scraping**:
   ```bash
   curl http://localhost:9090/api/v1/targets
   ```
   Verify the `anoteros-api` target is `UP`

2. **Check metrics endpoint**:
   ```bash
   curl https://your-domain.com/api/metrics
   ```
   Should return Prometheus-format metrics

3. **Verify data source connection**:
   - Grafana → Configuration → Data Sources → Prometheus
   - Click **Test** button

### Metrics Not Updating

1. Check Prometheus scrape interval (default: 15s)
2. Verify dashboard refresh rate (top-right corner)
3. Check time range (top-right corner)

### High Cardinality Issues

If you see performance issues:

1. Reduce label cardinality (avoid user IDs in labels)
2. Increase scrape interval
3. Use recording rules for expensive queries

## Production Deployment

### Docker Compose Setup

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=30d'

  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=your-secure-password
      - GF_INSTALL_PLUGINS=grafana-piechart-panel

volumes:
  prometheus-data:
  grafana-data:
```

### Kubernetes Deployment

Use the Prometheus Operator and Grafana Helm charts:

```bash
# Install Prometheus Operator
helm install prometheus prometheus-community/kube-prometheus-stack

# Add ServiceMonitor for Anóteros Lógos
kubectl apply -f k8s/servicemonitor.yaml

# Import dashboards via ConfigMap
kubectl create configmap grafana-dashboards \
  --from-file=grafana/dashboards/ \
  -n monitoring
```

## Maintenance

### Regular Tasks

- **Weekly**: Review dashboard performance and optimize slow queries
- **Monthly**: Update alert thresholds based on baseline metrics
- **Quarterly**: Archive old metrics data (Prometheus retention)

### Backup

Export all dashboards regularly:

```bash
# Export all dashboards
for uid in anoteros-operations anoteros-business anoteros-security; do
  curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
    "http://localhost:3001/api/dashboards/uid/$uid" \
    > "backup-$uid-$(date +%Y%m%d).json"
done
```

## Support

For issues or questions:
- Check the [Grafana documentation](https://grafana.com/docs/)
- Review [Prometheus best practices](https://prometheus.io/docs/practices/)
- See `lib/metrics/README.md` for metrics implementation details

## Property Validation

**Property 42: Metrics Export**
- All API endpoints export latency and error rate metrics to Prometheus
- Validates: Requirements 8.2

These dashboards provide comprehensive visualization of all exported metrics.
