/**
 * Unified CRUD Endpoint
 * Consolidates AIP Registry, Subscriptions, and Tenants management
 * 
 * Routes:
 * - /api/crud?resource=aip-registry - AIP Registry operations
 * - /api/crud?resource=subscriptions - Subscriptions operations
 * - /api/crud?resource=tenants - Tenants operations
 * 
 * Methods: GET, POST, PUT, DELETE
 * 
 * **Validates: Requirements 6.3**
 * **Property 25: Complete CRUD Operations**
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors, withRateLimit, compose } from '../lib/validation/middleware';

/**
 * Main unified CRUD handler
 * Routes requests to appropriate resource handler based on ?resource= parameter
 * 
 * NOTE: This endpoint is currently a placeholder to reduce serverless function count
 * for Vercel Hobby plan (12 function limit). Full implementation coming soon.
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const resource = req.query.resource as string;

  // Validate resource parameter
  if (!resource) {
    return res.status(400).json({ 
      error: 'Missing resource parameter',
      hint: 'Use ?resource=aip-registry, ?resource=subscriptions, or ?resource=tenants'
    });
  }

  // Temporary response - implementation in progress
  return res.status(501).json({
    error: 'Not Implemented',
    message: 'CRUD endpoints are being consolidated. Please use direct endpoints temporarily.',
    resource,
    migration: {
      'aip-registry': 'Endpoint consolidation in progress',
      'subscriptions': 'Endpoint consolidation in progress',
      'tenants': 'Endpoint consolidation in progress'
    },
    timestamp: new Date().toISOString()
  });
}

// Apply middleware: CORS -> Rate Limiting
export default compose(
  withCors,
  (handler) => withRateLimit(handler, { maxRequests: 60, windowMs: 60000 })
)(handler);
