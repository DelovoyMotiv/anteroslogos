/**
 * Simplified Tools API Endpoint for debugging
 * Tests if basic serverless function works without complex imports
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    console.log('[api/tools-simple] Request received');
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // Only POST allowed
    if (req.method !== 'POST') {
      res.status(405).json({
        success: false,
        error: 'Method not allowed',
      });
      return;
    }

    const body = req.body as any;
    console.log('[api/tools-simple] Body:', body);

    // Check if OpenRouter API key exists
    const hasApiKey = !!process.env.OPENROUTER_API_KEY;
    console.log('[api/tools-simple] Has API key:', hasApiKey);

    res.status(200).json({
      success: true,
      message: 'Simple endpoint works',
      data: {
        receivedTool: body?.tool,
        receivedUrl: body?.url,
        hasApiKey,
        nodeVersion: process.version,
      },
    });

  } catch (error) {
    console.error('[api/tools-simple] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
