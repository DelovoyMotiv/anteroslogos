/**
 * Vercel Serverless Function - Programmatic Tool Calling
 * POST /api/mcp/programmatic
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { executeProgrammatic } from '../../app/api/mcp/programmatic/route';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const advancedToolUse = req.headers['anthropic-beta'] || req.headers['x-anthropic-beta'];
  if (!advancedToolUse || !String(advancedToolUse).includes('advanced-tool-use-2025-11-20')) {
    return res.status(403).json({ error: 'Programmatic tool calling requires advanced-tool-use-2025-11-20 beta header' });
  }

  try {
    const tenantId = String(req.headers['x-tenant-id'] || 'default');
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!
    );

    const result = await executeProgrammatic(req.body, supabase, tenantId);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: 'Execution failed',
      message: error instanceof Error ? error.message : 'Unknown'
    });
  }
}
