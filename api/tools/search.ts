/**
 * Vercel Serverless Function - Tool Search
 * GET /api/tools/search?query=github&limit=5
 * Production-grade semantic search with validation
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { searchTools } from '../../app/api/tools/search/route';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Method validation
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      allowed_methods: ['GET']
    });
  }

  // Extract and validate parameters
  const query = String(req.query.query || '').trim();
  const limitParam = String(req.query.limit || '10');
  const limit = parseInt(limitParam, 10);

  // Query validation
  if (!query || query.length < 2) {
    return res.status(400).json({
      error: 'Query parameter required (min 2 characters)',
      provided: query,
      example: '/api/tools/search?query=audit&limit=5'
    });
  }

  if (query.length > 200) {
    return res.status(400).json({
      error: 'Query too long (max 200 characters)',
      length: query.length
    });
  }

  // Limit validation
  if (isNaN(limit) || limit < 1 || limit > 20) {
    return res.status(400).json({
      error: 'Invalid limit parameter (must be between 1 and 20)',
      provided: limitParam
    });
  }

  try {
    const result = searchTools(query, limit);
    
    // Add response metadata
    return res.status(200).json({
      ...result,
      meta: {
        query_length: query.length,
        limit_applied: limit,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Tool search failed:', error);
    return res.status(500).json({
      error: 'Failed to search tools',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
