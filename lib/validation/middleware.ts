/**
 * Validation Middleware for API Endpoints
 * Runtime input validation with detailed error responses
 * 
 * @module lib/validation/middleware
 * @version 1.0.0
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { formatValidationError, validateInput } from './apiSchemas';
import { isRequestWithParams } from '../../types/lib.types';

// =====================================================
// MIDDLEWARE TYPES
// =====================================================

export type ValidatedHandler<TBody = unknown, TQuery = unknown> = (
  req: VercelRequest,
  res: VercelResponse,
  validated: {
    body: TBody;
    query: TQuery;
  }
) => Promise<void> | void;

export interface ValidationOptions {
  bodySchema?: z.ZodSchema;
  querySchema?: z.ZodSchema;
  paramsSchema?: z.ZodSchema;
  allowedMethods?: string[];
}

// =====================================================
// VALIDATION MIDDLEWARE
// =====================================================

/**
 * Validates request body, query params, and HTTP method
 * Returns 400 with detailed errors for invalid inputs
 */
export function withValidation(
  options: ValidationOptions,
  handler: ValidatedHandler
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    // Method validation
    if (options.allowedMethods && !options.allowedMethods.includes(req.method || '')) {
      return res.status(405).json({
        error: 'Method not allowed',
        allowed: options.allowedMethods,
        received: req.method,
      });
    }

    const validated: { body?: unknown; query?: unknown; params?: unknown } = {};

    // Validate body
    if (options.bodySchema) {
      const bodyResult = validateInput(options.bodySchema, req.body);
      if (bodyResult.success === false) {
        // Type narrowed: bodyResult is { success: false; error: z.ZodError }
        return res.status(400).json({
          error: 'Invalid request body',
          ...formatValidationError(bodyResult.error),
        });
      }
      // Type narrowed: bodyResult is { success: true; data: T }
      validated.body = bodyResult.data;
    }

    // Validate query
    if (options.querySchema) {
      const queryResult = validateInput(options.querySchema, req.query);
      if (queryResult.success === false) {
        // Type narrowed: queryResult is { success: false; error: z.ZodError }
        return res.status(400).json({
          error: 'Invalid query parameters',
          ...formatValidationError(queryResult.error),
        });
      }
      // Type narrowed: queryResult is { success: true; data: T }
      validated.query = queryResult.data;
    }

    // Validate params (for dynamic routes)
    if (options.paramsSchema && isRequestWithParams(req)) {
      const paramsResult = validateInput(options.paramsSchema, req.params);
      if (paramsResult.success === false) {
        // Type narrowed: paramsResult is { success: false; error: z.ZodError }
        return res.status(400).json({
          error: 'Invalid route parameters',
          ...formatValidationError(paramsResult.error),
        });
      }
      // Type narrowed: paramsResult is { success: true; data: T }
      validated.params = paramsResult.data;
    }

    // Call handler with validated data
    return handler(req, res, validated as { body: unknown; query: unknown });
  };
}

// =====================================================
// JSON-RPC VALIDATION MIDDLEWARE
// =====================================================

/**
 * Validates JSON-RPC 2.0 request structure
 * Returns JSON-RPC error response for invalid requests
 */
export function withJsonRpcValidation(
  methodSchemas: Record<string, z.ZodSchema>,
  handler: (
    req: VercelRequest,
    res: VercelResponse,
    validated: {
      method: string;
      params: unknown;
      id: string | number;
    }
  ) => Promise<void> | void
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    // Validate basic JSON-RPC structure
    const request = req.body;

    if (!request || typeof request !== 'object') {
      return res.status(400).json({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error',
          data: 'Request body must be valid JSON',
        },
      });
    }

    if (request.jsonrpc !== '2.0') {
      return res.status(400).json({
        jsonrpc: '2.0',
        id: request.id || null,
        error: {
          code: -32600,
          message: 'Invalid Request',
          data: 'jsonrpc must be "2.0"',
        },
      });
    }

    if (!request.method || typeof request.method !== 'string') {
      return res.status(400).json({
        jsonrpc: '2.0',
        id: request.id || null,
        error: {
          code: -32600,
          message: 'Invalid Request',
          data: 'method is required and must be a string',
        },
      });
    }

    // Validate method-specific params
    const methodSchema = methodSchemas[request.method];
    if (methodSchema) {
      const paramsResult = validateInput(methodSchema, request.params || {});
      if (paramsResult.success === false) {
        // Type narrowed: paramsResult is { success: false; error: z.ZodError }
        const formatted = formatValidationError(paramsResult.error);
        return res.status(400).json({
          jsonrpc: '2.0',
          id: request.id || null,
          error: {
            code: -32602,
            message: 'Invalid params',
            data: formatted,
          },
        });
      }

      // Type narrowed: paramsResult is { success: true; data: T }
      return handler(req, res, {
        method: request.method,
        params: paramsResult.data,
        id: request.id,
      });
    }

    // Method exists but no schema defined - pass through
    return handler(req, res, {
      method: request.method,
      params: request.params || {},
      id: request.id,
    });
  };
}

// =====================================================
// CORS MIDDLEWARE
// =====================================================

/**
 * Adds CORS headers and handles OPTIONS requests
 */
export function withCors(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void,
  options: {
    origin?: string;
    methods?: string[];
    headers?: string[];
  } = {}
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const {
      origin = '*',
      methods = ['GET', 'POST', 'OPTIONS'],
      headers = ['Content-Type', 'Authorization'],
    } = options;

    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', headers.join(', '));

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    return handler(req, res);
  };
}

// =====================================================
// RATE LIMITING MIDDLEWARE
// =====================================================

/**
 * @deprecated Use withRateLimit from lib/middleware/rateLimiter instead
 * This is kept for backward compatibility but will be removed in future versions
 */
export { withRateLimit } from '../middleware/rateLimiter';

// =====================================================
// CSRF PROTECTION MIDDLEWARE
// =====================================================

export { 
  withCsrfProtection, 
  withCsrfTokenGeneration,
  generateCsrfToken,
  validateCsrfToken,
  getCsrfToken,
  clearCsrfToken,
  setCsrfCookie,
} from '../security/csrf';

// =====================================================
// COMPOSE MIDDLEWARE
// =====================================================

/**
 * Composes multiple middleware functions
 */
export function compose(
  ...middlewares: Array<
    (handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void) => 
    (req: VercelRequest, res: VercelResponse) => Promise<void> | void
  >
) {
  return (handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void) => {
    return middlewares.reduceRight(
      (acc, middleware) => middleware(acc),
      handler
    );
  };
}
