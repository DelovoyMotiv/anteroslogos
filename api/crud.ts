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

// Import handlers from original files
import aipRegistryHandler from './aip-registry';
import subscriptionsHandler from './subscriptions';
import tenantsHandler from './tenants';

/**
 * Main unified CRUD handler
 * Routes requests to appropriate resource handler based on ?resource= parameter
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

  // Route to appropriate handler
  switch (resource) {
    case 'aip-registry':
      return aipRegistryHandler(req, res);
    
    case 'subscriptions':
      return subscriptionsHandler(req, res);
    
    case 'tenants':
      return tenantsHandler(req, res);
    
    default:
      return res.status(400).json({ 
        error: 'Invalid resource',
        resource,
        allowed: ['aip-registry', 'subscriptions', 'tenants']
      });
  }
}

// Apply middleware: CORS -> Rate Limiting
export default compose(
  withCors,
  (handler) => withRateLimit(handler, { maxRequests: 60, windowMs: 60000 })
)(handler);
