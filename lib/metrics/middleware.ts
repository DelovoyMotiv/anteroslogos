/**
 * Metrics Middleware
 * 
 * Automatically tracks HTTP request metrics for all API endpoints.
 * Measures latency, counts requests, and records errors.
 * 
 * Property 42: Metrics Export
 * Validates: Requirements 8.2
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { recordHttpRequest, recordHttpError } from './index';

/**
 * Extract route pattern from URL
 * Converts /api/users/123 to /api/users/:id
 */
function extractRoute(url: string): string {
  // Remove query parameters
  const path = url.split('?')[0];
  
  // Replace UUIDs and numeric IDs with placeholders
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+/g, '/:id');
}

/**
 * Metrics middleware wrapper
 * Wraps an API handler to automatically track metrics
 */
export function withMetrics(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void | VercelResponse>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const startTime = Date.now();
    const method = req.method || 'UNKNOWN';
    const route = extractRoute(req.url || '/');
    
    // Store original res.status and res.json to intercept
    const originalStatus = res.status.bind(res);
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    
    let statusCode = 200;
    let errorType: string | undefined;
    
    // Intercept status calls
    res.status = function(code: number) {
      statusCode = code;
      return originalStatus(code);
    };
    
    // Intercept json calls
    type JSONValue = any;
    res.json = function(body: JSONValue) {
      const duration = (Date.now() - startTime) / 1000;
      
      // Check if response indicates an error
      if (statusCode >= 400 && body?.error) {
        errorType = typeof body.error === 'string' ? body.error : (body.error.type || 'unknown');
        recordHttpError(method, route, String(errorType));
      }
      
      recordHttpRequest(method, route, statusCode, duration);
      return originalJson(body);
    };
    
    // Intercept send calls
    res.send = function(body: JSONValue) {
      const duration = (Date.now() - startTime) / 1000;
      recordHttpRequest(method, route, statusCode, duration);
      return originalSend(body);
    };
    
    try {
      // Call the original handler
      await handler(req, res);
    } catch (error) {
      // Record error metrics
      const duration = (Date.now() - startTime) / 1000;
      errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
      
      recordHttpError(method, route, errorType);
      recordHttpRequest(method, route, 500, duration);
      
      // Re-throw to let error handling middleware deal with it
      throw error;
    }
  };
}

/**
 * Simple metrics tracking for handlers that don't use the wrapper
 */
export function trackRequest(
  method: string,
  route: string,
  statusCode: number,
  durationMs: number
) {
  recordHttpRequest(method, route, statusCode, durationMs / 1000);
}

/**
 * Track error for handlers that don't use the wrapper
 */
export function trackError(method: string, route: string, errorType: string) {
  recordHttpError(method, route, errorType);
}
