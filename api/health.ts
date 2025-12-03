/**
 * Health Check API Endpoint
 * 
 * Provides liveness probe for Kubernetes/container orchestration.
 * Returns 200 if service is running.
 * 
 * @endpoint GET /api/health
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { globalHealthCheckManager } from '../lib/reliability/health';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const result = await globalHealthCheckManager.checkLiveness();
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('[Health] Liveness check error:', error);
    return res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
