/**
 * System Status Endpoints (Consolidated)
 * GET /api/system?action=health
 * GET /api/system?action=ready
 * GET /api/system?action=status
 * GET /api/system?action=metrics
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../lib/validation/middleware';

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
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

export default withCors(handler);
