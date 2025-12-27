/**
 * AUX Audit API Endpoint - Minimal Version for Debugging
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[AUX Audit] Request received:', req.method, req.url);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    console.log('[AUX Audit] OPTIONS request');
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    console.log('[AUX Audit] Invalid method:', req.method);
    return res.status(405).json({ 
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }
  
  try {
    console.log('[AUX Audit] Processing POST request');
    console.log('[AUX Audit] Body:', JSON.stringify(req.body));
    
    const { url } = req.body || {};
    
    if (!url) {
      console.log('[AUX Audit] Missing URL');
      return res.status(400).json({ 
        error: 'Missing required field: url',
        code: 'INVALID_URL'
      });
    }
    
    console.log('[AUX Audit] URL received:', url);
    
    // Return mock successful response
    const mockResponse = {
      score: 75,
      classification: 'Good',
      protocols: [],
      ariaScore: 80,
      interactiveElements: [],
      frictionPoints: [],
      recommendations: [
        {
          title: 'Test Recommendation',
          description: 'This is a test response',
          priority: 'medium' as const,
          impact: 5
        }
      ],
      intentTriggers: [],
      summary: 'Mock audit completed successfully. Full implementation coming soon.',
      riskLevel: 'low' as const,
      analyzedAt: new Date().toISOString()
    };
    
    console.log('[AUX Audit] Sending response');
    return res.status(200).json(mockResponse);
    
  } catch (error) {
    console.error('[AUX Audit] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    });
  }
}
