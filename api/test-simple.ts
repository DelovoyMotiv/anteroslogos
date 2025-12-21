/**
 * Simple test endpoint to verify Vercel deployment
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  console.log('[test-simple] Request received');
  
  res.status(200).json({
    success: true,
    message: 'Simple endpoint works!',
    timestamp: new Date().toISOString(),
  });
}
