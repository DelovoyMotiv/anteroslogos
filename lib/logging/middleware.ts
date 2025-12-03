/**
 * Correlation ID Middleware
 * 
 * Adds correlation ID to all requests and propagates through logs
 * 
 * **Feature: production-audit-improvements, Property 40: Correlation ID Propagation**
 * **Validates: Requirements 8.1**
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateCorrelationId, withCorrelationIdAsync, logger } from './logger';

/**
 * Correlation ID header name
 */
export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Express/Vercel middleware to add correlation ID to requests
 */
export function correlationIdMiddleware(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    // Get correlation ID from header or generate new one
    const correlationId = 
      (req.headers[CORRELATION_ID_HEADER] as string) || 
      generateCorrelationId();
    
    // Add correlation ID to response headers
    res.setHeader(CORRELATION_ID_HEADER, correlationId);
    
    // Log request start
    logger.info({
      msg: 'Request started',
      method: req.method,
      url: req.url,
      correlationId,
    });
    
    const startTime = Date.now();
    
    try {
      // Run handler with correlation ID context
      await withCorrelationIdAsync(correlationId, async () => {
        await handler(req, res);
      });
      
      // Log request completion
      const duration = Date.now() - startTime;
      logger.info({
        msg: 'Request completed',
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        correlationId,
      });
    } catch (error) {
      // Log request error
      const duration = Date.now() - startTime;
      logger.error({
        msg: 'Request failed',
        method: req.method,
        url: req.url,
        error: error instanceof Error ? error.message : String(error),
        duration,
        correlationId,
      });
      
      throw error;
    }
  };
}

/**
 * Add correlation ID to existing request context
 */
export function addCorrelationId(req: VercelRequest): string {
  const correlationId = 
    (req.headers[CORRELATION_ID_HEADER] as string) || 
    generateCorrelationId();
  
  // Store in request object for later access
  (req as unknown as Record<string, unknown>).correlationId = correlationId;
  
  return correlationId;
}

/**
 * Get correlation ID from request
 */
export function getRequestCorrelationId(req: VercelRequest): string | undefined {
  return (req as unknown as Record<string, unknown>).correlationId as string | undefined || (req.headers[CORRELATION_ID_HEADER] as string);
}
