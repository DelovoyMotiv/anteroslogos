/**
 * Unified Status Endpoint
 * Combines health, readiness, and metrics endpoints
 * 
 * Routes:
 * - /api/status?check=health - Liveness probe
 * - /api/status?check=ready - Readiness probe  
 * - /api/status?check=metrics - Prometheus metrics
 * - /api/status - Default health check
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  globalHealthCheckManager, 
  HealthStatus,
  createDatabaseHealthCheck 
} from '../lib/reliability/health';
import { getMetrics, getMetricsContentType } from '../lib/metrics';
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
  
  const { check } = req.query;
  const checkType = typeof check === 'string' ? check : 'health';

  try {
    switch (checkType) {
      case 'health':
        // Liveness probe
        const healthResult = await globalHealthCheckManager.checkLiveness();
        return res.status(200).json(healthResult);

      case 'ready':
        // Readiness probe
        initializeHealthChecks();
        const readyResult = await globalHealthCheckManager.checkReadiness();
        const statusCode = readyResult.status === HealthStatus.UNHEALTHY ? 503 : 200;
        return res.status(statusCode).json(readyResult);

      case 'metrics':
        // Prometheus metrics
        const metrics = await getMetrics();
        res.setHeader('Content-Type', getMetricsContentType());
        return res.status(200).send(metrics);

      default:
        return res.status(400).json({ 
          error: 'Invalid check type. Must be "health", "ready", or "metrics"' 
        });
    }
  } catch (error) {
    console.error(`[Status] Error in ${checkType} check:`, error);
    return res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
