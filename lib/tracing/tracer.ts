/**
 * OpenTelemetry Tracer Configuration
 * 
 * Initializes and configures the OpenTelemetry SDK with:
 * - OTLP HTTP exporter for trace data
 * - Automatic instrumentation for Node.js
 * - Resource detection and service identification
 * - Trace context propagation
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { trace, Span, SpanStatusCode, Tracer, context, Context } from '@opentelemetry/api';

export interface TracingConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  otlpEndpoint?: string;
  enabled?: boolean;
  sampleRate?: number;
}

let sdk: NodeSDK | null = null;
let tracer: Tracer | null = null;

/**
 * Initialize OpenTelemetry tracing
 * 
 * Sets up the OpenTelemetry SDK with automatic instrumentation
 * and OTLP exporter for sending traces to a collector
 */
export function initializeTracing(config: TracingConfig): void {
  if (!config.enabled) {
    console.log('[Tracing] Tracing is disabled');
    return;
  }

  try {
    // Create resource with service information
    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: config.serviceName,
      [ATTR_SERVICE_VERSION]: config.serviceVersion,
      'environment': config.environment,
    });

    // Configure OTLP exporter
    const traceExporter = new OTLPTraceExporter({
      url: config.otlpEndpoint || 'http://localhost:4318/v1/traces',
      headers: {},
    });

    // Initialize SDK with auto-instrumentation
    sdk = new NodeSDK({
      resource,
      traceExporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          // Disable some instrumentations if needed
          '@opentelemetry/instrumentation-fs': {
            enabled: false, // File system operations can be noisy
          },
        }),
      ],
    });

    // Start the SDK
    sdk.start();

    // Get tracer instance
    tracer = trace.getTracer(config.serviceName, config.serviceVersion);

    console.log(`[Tracing] OpenTelemetry initialized for ${config.serviceName}`);
  } catch (error) {
    console.error('[Tracing] Failed to initialize OpenTelemetry:', error);
    throw error;
  }
}

/**
 * Shutdown tracing gracefully
 * 
 * Flushes any pending spans and shuts down the SDK
 */
export async function shutdownTracing(): Promise<void> {
  if (sdk) {
    try {
      await sdk.shutdown();
      console.log('[Tracing] OpenTelemetry shut down successfully');
    } catch (error) {
      console.error('[Tracing] Error shutting down OpenTelemetry:', error);
      throw error;
    }
  }
}

/**
 * Get the tracer instance
 * 
 * Returns the configured tracer or a no-op tracer if not initialized
 */
export function getTracer(): Tracer {
  if (!tracer) {
    // Return no-op tracer if not initialized
    return trace.getTracer('noop');
  }
  return tracer;
}

/**
 * Start a new span
 * 
 * Creates a new span with the given name and attributes
 */
export function startSpan(
  name: string,
  attributes?: Record<string, string | number | boolean>
): Span {
  const currentTracer = getTracer();
  const span = currentTracer.startSpan(name, {
    attributes,
  });
  return span;
}

/**
 * End a span
 * 
 * Marks the span as complete and records its duration
 */
export function endSpan(span: Span, error?: Error): void {
  if (error) {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
  } else {
    span.setStatus({ code: SpanStatusCode.OK });
  }
  span.end();
}

/**
 * Record an exception in the current span
 */
export function recordException(error: Error, attributes?: Record<string, string>): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.recordException(error, attributes as any);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
  }
}

/**
 * Set attributes on a span
 */
export function setSpanAttributes(
  span: Span,
  attributes: Record<string, string | number | boolean>
): void {
  span.setAttributes(attributes);
}

/**
 * Add an event to a span
 */
export function addSpanEvent(
  span: Span,
  name: string,
  attributes?: Record<string, string | number | boolean>
): void {
  span.addEvent(name, attributes);
}

/**
 * Get the current active context
 */
export function getActiveContext(): Context {
  return context.active();
}

/**
 * Set the active context
 */
export function setActiveContext(ctx: Context): Context {
  return context.with(ctx, () => context.active());
}
