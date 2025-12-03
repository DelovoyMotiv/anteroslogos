/**
 * Readiness Check API Endpoint
 * 
 * Provides readiness probe for Kubernetes/container orchestration.
 * Returns 200 if service is ready to accept traffic (all dependencies healthy).
 * Returns 503 if service is not ready.
 * 
 * @endpoint GET /api/ready
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  globalHealthCheckManager, 
  HealthStatus,
  createDatabaseHealthCheck 
} from '../lib/reliability/health';
import { createClient } from '@supabase/supabase-js';

// Initialize health checks on first request
let initialized = false;

function initializeHealthChecks() {
  if (initialized) return;
  
  // Add database health check
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    globalHealthCheckManager.register(
      'database',
      createDatabaseHealthCheck(supabase)
    );
  }
  
  // Add more health checks as needed
  // Example: Redis, external APIs, etc.
  
  initialized = true;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Initialize health checks on first request
    initializeHealthChecks();
    
    const result = await globalHealthCheckManager.checkReadiness();
    
    // Return 503 if unhealthy, 200 otherwise
    const statusCode = result.status === HealthStatus.UNHEALTHY ? 503 : 200;
    
    return res.status(statusCode).json(result);
  } catch (error) {
    console.error('[Ready] Readiness check error:', error);
    return res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
