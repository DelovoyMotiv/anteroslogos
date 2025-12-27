/**
 * AUX Audit API Endpoint - Minimal Debug Version
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  console.log('[AUX Audit] Handler started');
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).json({ 
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
    return;
  }
  
  try {
    console.log('[AUX Audit] Processing request');
    
    const { url } = req.body || {};
    
    if (!url) {
      res.status(400).json({ 
        error: 'Missing required field: url',
        code: 'INVALID_URL'
      });
      return;
    }
    
    console.log('[AUX Audit] URL:', url);
    
    // Minimal response
    const results = {
      score: 75,
      classification: 'Agent-Capable' as const,
      protocols: [],
      ariaScore: 0,
      interactiveElements: [],
      frictionPoints: [],
      recommendations: [],
      intentTriggers: [],
      summary: 'Minimal test response',
      riskLevel: 'medium' as const,
      analyzedAt: new Date().toISOString()
    };
    
    console.log('[AUX Audit] Sending response');
    res.status(200).json(results);
    
  } catch (error) {
    console.error('[AUX Audit] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
