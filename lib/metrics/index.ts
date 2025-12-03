/**
 * Prometheus Metrics Module
 * 
 * Provides comprehensive metrics collection for:
 * - API endpoint latency and error rates
 * - Business metrics (audits, payments, users)
 * - Infrastructure metrics (database, cache, external services)
 * 
 * Property 42: Metrics Export
 * Validates: Requirements 8.2
 */

import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// Create a custom registry
export const register = new Registry();

// Collect default metrics (CPU, memory, event loop, etc.)
collectDefaultMetrics({ register, prefix: 'anoteros_' });

// ============================================================================
// API Metrics
// ============================================================================

/**
 * HTTP request duration histogram
 * Tracks latency for all API endpoints
 */
export const httpRequestDuration = new Histogram({
  name: 'anoteros_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5], // 10ms to 5s
  registers: [register],
});

/**
 * HTTP request counter
 * Tracks total number of requests
 */
export const httpRequestTotal = new Counter({
  name: 'anoteros_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

/**
 * HTTP error counter
 * Tracks errors by type
 */
export const httpErrorsTotal = new Counter({
  name: 'anoteros_http_errors_total',
  help: 'Total number of HTTP errors',
  labelNames: ['method', 'route', 'error_type'],
  registers: [register],
});

// ============================================================================
// Business Metrics
// ============================================================================

/**
 * GEO audits completed counter
 */
export const auditsCompletedTotal = new Counter({
  name: 'anoteros_audits_completed_total',
  help: 'Total number of GEO audits completed',
  labelNames: ['status'], // success, failed
  registers: [register],
});

/**
 * GEO audit duration histogram
 */
export const auditDuration = new Histogram({
  name: 'anoteros_audit_duration_seconds',
  help: 'Duration of GEO audits in seconds',
  buckets: [1, 5, 10, 30, 60, 120, 300], // 1s to 5min
  registers: [register],
});

/**
 * Payment transactions counter
 */
export const paymentTransactionsTotal = new Counter({
  name: 'anoteros_payment_transactions_total',
  help: 'Total number of payment transactions',
  labelNames: ['status', 'currency'], // success, failed, pending
  registers: [register],
});

/**
 * Payment amount gauge
 */
export const paymentAmount = new Histogram({
  name: 'anoteros_payment_amount_usdc',
  help: 'Payment amounts in USDC',
  labelNames: ['status'],
  buckets: [1, 10, 50, 100, 500, 1000, 5000], // USDC amounts
  registers: [register],
});

/**
 * User signups counter
 */
export const userSignupsTotal = new Counter({
  name: 'anoteros_user_signups_total',
  help: 'Total number of user signups',
  labelNames: ['plan'], // free, pro, enterprise
  registers: [register],
});

/**
 * Active users gauge
 */
export const activeUsers = new Gauge({
  name: 'anoteros_active_users',
  help: 'Number of currently active users',
  registers: [register],
});

/**
 * API quota usage gauge
 */
export const apiQuotaUsage = new Gauge({
  name: 'anoteros_api_quota_usage',
  help: 'Current API quota usage by user',
  labelNames: ['user_id', 'plan'],
  registers: [register],
});

// ============================================================================
// Database Metrics
// ============================================================================

/**
 * Database query duration histogram
 */
export const dbQueryDuration = new Histogram({
  name: 'anoteros_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1], // 1ms to 1s
  registers: [register],
});

/**
 * Database connection pool gauge
 */
export const dbConnectionPoolSize = new Gauge({
  name: 'anoteros_db_connection_pool_size',
  help: 'Current database connection pool size',
  labelNames: ['state'], // idle, active, waiting
  registers: [register],
});

/**
 * Database errors counter
 */
export const dbErrorsTotal = new Counter({
  name: 'anoteros_db_errors_total',
  help: 'Total number of database errors',
  labelNames: ['operation', 'error_type'],
  registers: [register],
});

// ============================================================================
// Cache Metrics
// ============================================================================

/**
 * Cache hit counter
 */
export const cacheHitsTotal = new Counter({
  name: 'anoteros_cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_name'],
  registers: [register],
});

/**
 * Cache miss counter
 */
export const cacheMissesTotal = new Counter({
  name: 'anoteros_cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_name'],
  registers: [register],
});

/**
 * Cache operation duration histogram
 */
export const cacheOperationDuration = new Histogram({
  name: 'anoteros_cache_operation_duration_seconds',
  help: 'Duration of cache operations in seconds',
  labelNames: ['operation', 'cache_name'], // get, set, delete
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1], // 1ms to 100ms
  registers: [register],
});

// ============================================================================
// External Service Metrics
// ============================================================================

/**
 * External API call duration histogram
 */
export const externalApiDuration = new Histogram({
  name: 'anoteros_external_api_duration_seconds',
  help: 'Duration of external API calls in seconds',
  labelNames: ['service', 'endpoint'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30], // 100ms to 30s
  registers: [register],
});

/**
 * External API errors counter
 */
export const externalApiErrorsTotal = new Counter({
  name: 'anoteros_external_api_errors_total',
  help: 'Total number of external API errors',
  labelNames: ['service', 'error_type'],
  registers: [register],
});

/**
 * Circuit breaker state gauge
 */
export const circuitBreakerState = new Gauge({
  name: 'anoteros_circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
  labelNames: ['service'],
  registers: [register],
});

// ============================================================================
// A2A Protocol Metrics
// ============================================================================

/**
 * A2A messages counter
 */
export const a2aMessagesTotal = new Counter({
  name: 'anoteros_a2a_messages_total',
  help: 'Total number of A2A protocol messages',
  labelNames: ['method', 'status'], // request, response, error
  registers: [register],
});

/**
 * A2A handshake duration histogram
 */
export const a2aHandshakeDuration = new Histogram({
  name: 'anoteros_a2a_handshake_duration_seconds',
  help: 'Duration of A2A handshakes in seconds',
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

// ============================================================================
// Knowledge Graph Metrics
// ============================================================================

/**
 * Knowledge graph nodes gauge
 */
export const knowledgeGraphNodes = new Gauge({
  name: 'anoteros_knowledge_graph_nodes',
  help: 'Number of nodes in knowledge graph',
  labelNames: ['type'],
  registers: [register],
});

/**
 * Knowledge graph edges gauge
 */
export const knowledgeGraphEdges = new Gauge({
  name: 'anoteros_knowledge_graph_edges',
  help: 'Number of edges in knowledge graph',
  registers: [register],
});

/**
 * CCC credits distributed counter
 */
export const cccCreditsDistributed = new Counter({
  name: 'anoteros_ccc_credits_distributed_total',
  help: 'Total CCC credits distributed',
  labelNames: ['reason'], // knowledge_sync, citation, contribution
  registers: [register],
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Record HTTP request metrics
 */
export function recordHttpRequest(
  method: string,
  route: string,
  statusCode: number,
  durationSeconds: number
) {
  httpRequestTotal.inc({ method, route, status_code: statusCode });
  httpRequestDuration.observe({ method, route, status_code: statusCode }, durationSeconds);
}

/**
 * Record HTTP error
 */
export function recordHttpError(method: string, route: string, errorType: string) {
  httpErrorsTotal.inc({ method, route, error_type: errorType });
}

/**
 * Record audit completion
 */
export function recordAuditCompleted(status: 'success' | 'failed', durationSeconds: number) {
  auditsCompletedTotal.inc({ status });
  auditDuration.observe(durationSeconds);
}

/**
 * Record payment transaction
 */
export function recordPaymentTransaction(
  status: 'success' | 'failed' | 'pending',
  currency: string,
  amount: number
) {
  paymentTransactionsTotal.inc({ status, currency });
  paymentAmount.observe({ status }, amount);
}

/**
 * Record cache hit/miss
 */
export function recordCacheAccess(cacheName: string, hit: boolean, durationSeconds: number) {
  if (hit) {
    cacheHitsTotal.inc({ cache_name: cacheName });
  } else {
    cacheMissesTotal.inc({ cache_name: cacheName });
  }
  cacheOperationDuration.observe({ operation: 'get', cache_name: cacheName }, durationSeconds);
}

/**
 * Record database query
 */
export function recordDbQuery(
  operation: string,
  table: string,
  durationSeconds: number,
  error?: string
) {
  dbQueryDuration.observe({ operation, table }, durationSeconds);
  if (error) {
    dbErrorsTotal.inc({ operation, error_type: error });
  }
}

/**
 * Record external API call
 */
export function recordExternalApiCall(
  service: string,
  endpoint: string,
  durationSeconds: number,
  error?: string
) {
  externalApiDuration.observe({ service, endpoint }, durationSeconds);
  if (error) {
    externalApiErrorsTotal.inc({ service, error_type: error });
  }
}

/**
 * Update circuit breaker state
 */
export function updateCircuitBreakerState(
  service: string,
  state: 'closed' | 'open' | 'half-open'
) {
  const stateValue = state === 'closed' ? 0 : state === 'open' ? 1 : 2;
  circuitBreakerState.set({ service }, stateValue);
}

/**
 * Get metrics in Prometheus format
 */
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Get metrics content type
 */
export function getMetricsContentType(): string {
  return register.contentType;
}
