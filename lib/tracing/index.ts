/**
 * OpenTelemetry Distributed Tracing Module
 * 
 * Provides comprehensive distributed tracing for:
 * - HTTP requests and responses
 * - Database operations
 * - External API calls
 * - A2A protocol messages
 * - Background jobs
 * 
 * Property 45: Distributed Tracing
 * Validates: Requirements 8.4
 */

export {
  initializeTracing,
  shutdownTracing,
  getTracer,
  startSpan,
  endSpan,
  recordException,
  setSpanAttributes,
  addSpanEvent,
  type TracingConfig,
} from './tracer';

export {
  tracingMiddleware,
  withTracing,
  withTracingAsync,
  createSpan,
  getCurrentSpan,
  getTraceContext,
  propagateTraceContext,
} from './middleware';

export {
  traceDbQuery,
  traceExternalApiCall,
  traceA2AMessage,
  traceCacheOperation,
  traceBackgroundJob,
} from './helpers';

export {
  getTracingConfig,
  defaultTracingConfig,
  productionTracingConfig,
} from './config';
