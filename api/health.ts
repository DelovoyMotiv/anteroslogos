/**
 * Health check endpoint
 * Simple test to verify serverless functions work
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    env: {
      hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
      nodeVersion: process.version,
    }
  });
}
