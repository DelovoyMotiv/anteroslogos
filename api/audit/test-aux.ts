/**
 * Test AUX Audit Endpoint - Simplified for debugging
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Return mock response
    return res.status(200).json({
      score: 75,
      classification: 'Good',
      protocols: [],
      ariaScore: 80,
      interactiveElements: [],
      frictionPoints: [],
      recommendations: [],
      intentTriggers: [],
      summary: 'Test audit completed successfully',
      riskLevel: 'low',
      analyzedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Test AUX] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
