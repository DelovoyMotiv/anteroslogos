/**
 * System Status Endpoints (Consolidated)
 * GET /api/system?action=health
 * GET /api/system?action=ready
 * GET /api/system?action=status
 * GET /api/system?action=metrics
 *
 * NOTE: This module intentionally avoids importing middleware that carries
 * load-time side effects (e.g. the CORS/validation middleware chain pulls in
 * CSRF and rate-limiter modules that run env-dependent code and timers at
 * import time). The health branch must be dependency-free by construction so
 * it can always return HTTP 200 without requiring any external dependency.
 * CORS headers are therefore applied inline below.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

function applyCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyCors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const action = req.query.action as string || 'health';

  switch (action) {
    case 'health':
      res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
      break;
    case 'ready':
      res.status(200).json({ ready: true, timestamp: new Date().toISOString() });
      break;
    case 'status':
      res.status(200).json({ status: 'operational', timestamp: new Date().toISOString() });
      break;
    case 'metrics':
      res.status(200).json({ uptime: process.uptime(), memory: process.memoryUsage() });
      break;
    default:
      res.status(400).json({ error: 'Invalid action' });
  }
}
