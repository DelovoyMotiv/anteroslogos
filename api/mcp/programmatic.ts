/**
 * Vercel Serverless Function - Programmatic Tool Calling
 * POST /api/mcp/programmatic
 * Production-grade with proper error handling and tenant isolation
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { executeProgrammatic } from '../../app/api/mcp/programmatic/route';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Method validation
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Beta header validation (opt-in security)
  const advancedToolUse = req.headers['anthropic-beta'] || req.headers['x-anthropic-beta'];
  if (!advancedToolUse || !String(advancedToolUse).includes('advanced-tool-use-2025-11-20')) {
    return res.status(403).json({
      error: 'Programmatic tool calling requires advanced-tool-use-2025-11-20 beta header',
      required_header: 'anthropic-beta: advanced-tool-use-2025-11-20'
    });
  }

  // Input validation
  if (!req.body || !req.body.code) {
    return res.status(400).json({
      error: 'Invalid request body',
      required_fields: ['code'],
      optional_fields: ['language', 'timeout']
    });
  }

  try {
    // Tenant ID from header (default for backward compatibility)
    const tenantId = String(req.headers['x-tenant-id'] || 'default');
    
    // Environment validation
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
      throw new Error('Supabase environment variables not configured');
    }
    
    // Create Supabase client with RLS
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    // Execute in production sandbox
    const result = await executeProgrammatic(req.body, supabase, tenantId);
    
    // Return full result with UCPT proof, logs, and execution metrics
    return res.status(200).json({
      success: true,
      ...result,
      tenant_id: tenantId,
    });
  } catch (error) {
    // Production error handling
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = errorMessage.includes('timeout') ? 408 : 500;
    
    return res.status(statusCode).json({
      success: false,
      error: 'Execution failed',
      message: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
}
