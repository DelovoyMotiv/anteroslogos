/**
 * Tracing Middleware
 * 
 * Provides middleware for automatic tracing of HTTP requests
 * and utilities for manual span creation
 */

import { trace, context, SpanStatusCode, Span, propagation } from '@opentelemetry/api';
import { getTracer } from './tracer';
import type { Request, Response, NextFunction } from 'express';
// ResponseEndArgs reserved for future use
// @ts-expect-error - Reserved for future use
import type { ResponseEndArgs } from '../../types/lib.types';

export const TRACE_PARENT_HEADER = 'traceparent';
export const TRACE_STATE_HEADER = 'tracestate';

/**
 * Express middleware for automatic request tracing
 * 
 * Creates a span for each HTTP request and propagates trace context
 */
export function tracingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const tracer = getTracer();
  
  // Extract trace context from incoming request headers
  const extractedContext = propagation.extract(context.active(), req.headers);
  
  // Start a new span for this request
  const span = tracer.startSpan(
    `${req.method} ${req.path}`,
    {
      attributes: {
        'http.method': req.method,
        'http.url': req.url,
        'http.target': req.path,
        'http.host': req.hostname,
        'http.scheme': req.protocol,
        'http.user_agent': req.get('user-agent') || 'unknown',
      },
    },
    extractedContext
  );

  // Store span in request for later access
  // Store span in request for later access (extending Request interface)
  (req as Request & { _span: unknown })._span = span;

  // Wrap response.end to capture response details
  const originalEnd = res.end;

  res.end = function (this: Response, ...args: any[]): Response {
    // Set response attributes
    span.setAttributes({
      'http.status_code': res.statusCode,
      'http.response_content_length': res.get('content-length') || 0,
    });

    // Set span status based on HTTP status code
    if (res.statusCode >= 400) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: `HTTP ${res.statusCode}`,
      });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }

    // End the span
    span.end();

    // Call original end
    return originalEnd.apply(this, args as any);
  } as any;

  // Continue with request in the span context
  context.with(trace.setSpan(extractedContext, span), () => {
    next();
  });
}

/**
 * Wrap a synchronous function with tracing
 */
export function withTracing<T>(
  name: string,
  fn: () => T,
  attributes?: Record<string, string | number | boolean>
): T {
  const tracer = getTracer();
  const span = tracer.startSpan(name, { attributes });

  try {
    const result = fn();
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: (error as Error).message,
    });
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Wrap an async function with tracing
 */
export async function withTracingAsync<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  const tracer = getTracer();
  const span = tracer.startSpan(name, { attributes });

  try {
    const result = await fn();
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: (error as Error).message,
    });
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Create a new span manually
 * 
 * Returns the span and a function to end it
 */
export function createSpan(
  name: string,
  attributes?: Record<string, string | number | boolean>
): { span: Span; end: (error?: Error) => void } {
  const tracer = getTracer();
  const span = tracer.startSpan(name, { attributes });

  const end = (error?: Error) => {
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
  };

  return { span, end };
}

/**
 * Get the current active span
 */
export function getCurrentSpan(): Span | undefined {
  return trace.getActiveSpan();
}

/**
 * Get trace context from current span
 * 
 * Returns traceparent and tracestate headers for propagation
 */
export function getTraceContext(): { traceparent?: string; tracestate?: string } {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  
  return {
    traceparent: carrier[TRACE_PARENT_HEADER],
    tracestate: carrier[TRACE_STATE_HEADER],
  };
}

/**
 * Propagate trace context to outgoing HTTP headers
 */
export function propagateTraceContext(headers: Record<string, string>): Record<string, string> {
  const traceContext = getTraceContext();
  
  if (traceContext.traceparent) {
    headers[TRACE_PARENT_HEADER] = traceContext.traceparent;
  }
  
  if (traceContext.tracestate) {
    headers[TRACE_STATE_HEADER] = traceContext.tracestate;
  }
  
  return headers;
}
