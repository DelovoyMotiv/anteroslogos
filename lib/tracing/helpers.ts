/**
 * Tracing Helper Functions
 * 
 * Provides convenient functions for tracing common operations:
 * - Database queries
 * - External API calls
 * - A2A protocol messages
 * - Cache operations
 * - Background jobs
 */

import { withTracingAsync } from './middleware';

/**
 * Trace a database query
 * 
 * Creates a span for the database operation with relevant attributes
 */
export async function traceDbQuery<T>(
  operation: string,
  table: string,
  query: () => Promise<T>
): Promise<T> {
  return withTracingAsync(
    `db.${operation}`,
    query,
    {
      'db.system': 'postgresql',
      'db.operation': operation,
      'db.table': table,
    }
  );
}

/**
 * Trace an external API call
 * 
 * Creates a span for the external service call with relevant attributes
 */
export async function traceExternalApiCall<T>(
  service: string,
  endpoint: string,
  method: string,
  call: () => Promise<T>
): Promise<T> {
  return withTracingAsync(
    `external.${service}`,
    call,
    {
      'http.method': method,
      'http.url': endpoint,
      'peer.service': service,
    }
  );
}

/**
 * Trace an A2A protocol message
 * 
 * Creates a span for A2A message processing
 */
export async function traceA2AMessage<T>(
  method: string,
  agentId: string,
  handler: () => Promise<T>
): Promise<T> {
  return withTracingAsync(
    `a2a.${method}`,
    handler,
    {
      'a2a.method': method,
      'a2a.agent_id': agentId,
      'messaging.system': 'a2a',
    }
  );
}

/**
 * Trace a cache operation
 * 
 * Creates a span for cache get/set/delete operations
 */
export async function traceCacheOperation<T>(
  operation: 'get' | 'set' | 'delete',
  cacheName: string,
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  return withTracingAsync(
    `cache.${operation}`,
    fn,
    {
      'cache.operation': operation,
      'cache.name': cacheName,
      'cache.key': key,
    }
  );
}

/**
 * Trace a background job
 * 
 * Creates a span for background job execution
 */
export async function traceBackgroundJob<T>(
  jobName: string,
  jobId: string,
  job: () => Promise<T>
): Promise<T> {
  return withTracingAsync(
    `job.${jobName}`,
    job,
    {
      'job.name': jobName,
      'job.id': jobId,
    }
  );
}
