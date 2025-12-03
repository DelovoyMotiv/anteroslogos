/**
 * Prometheus Metrics API Endpoint
 * 
 * Exposes metrics in Prometheus format for scraping.
 * 
 * @endpoint GET /api/metrics
 * 
 * Property 42: Metrics Export
 * Validates: Requirements 8.2
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getMetrics, getMetricsContentType } from '../lib/metrics';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get metrics in Prometheus format
    const metrics = await getMetrics();
    
    // Set appropriate content type for Prometheus
    res.setHeader('Content-Type', getMetricsContentType());
    
    return res.status(200).send(metrics);
  } catch (error) {
    console.error('[Metrics] Error generating metrics:', error);
    return res.status(500).json({
      error: 'Failed to generate metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
