/**
 * Vercel Serverless Function - Tool Search
 * GET /api/tools/search?query=github&limit=5
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { searchTools } from '../../app/api/tools/search/route';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const query = String(req.query.query || '');
  const limit = parseInt(String(req.query.limit || '10'), 10);

  if (!query || query.length < 2) {
    return res.status(400).json({ error: 'Query parameter required (min 2 characters)' });
  }

  try {
    const result = searchTools(query, limit);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to search tools',
      message: error instanceof Error ? error.message : 'Unknown'
    });
  }
}
