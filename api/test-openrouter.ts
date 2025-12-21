/**
 * Test endpoint to verify OpenRouter client import
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createOpenRouterClient } from '../utils/ai/openrouter';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  console.log('[test-openrouter] Request received');
  
  try {
    const client = createOpenRouterClient();
    
    res.status(200).json({
      success: true,
      message: 'OpenRouter client import works!',
      clientCreated: !!client,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[test-openrouter] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
