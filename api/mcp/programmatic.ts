/**
 * Vercel Serverless Function - Programmatic Tool Calling
 * POST /api/mcp/programmatic
 * Production-grade with proper error handling and tenant isolation
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { executeProgrammatic } from '../../app/api/mcp/programmatic/route';
import { withValidation, compose } from '../../lib/validation/middleware';
import { ProgrammaticExecutionSchema } from '../../lib/validation/apiSchemas';

import type { McpProgrammaticValidated, ValidatedApiHandler } from '../../types/api.types';

async function mainHandler(
  req: VercelRequest,
  res: VercelResponse,
  validated: McpProgrammaticValidated
): Promise<void> {
  // Beta header validation (opt-in security)
  const advancedToolUse = req.headers['anthropic-beta'] || req.headers['x-anthropic-beta'];
  if (!advancedToolUse || !String(advancedToolUse).includes('advanced-tool-use-2025-11-20')) {
    return res.status(403).json({
      error: 'Programmatic tool calling requires advanced-tool-use-2025-11-20 beta header',
      required_header: 'anthropic-beta: advanced-tool-use-2025-11-20'
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
    const result = await executeProgrammatic(validated.body, supabase, tenantId);
    
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

// Apply middleware: Validation
export default compose(
  (handler) => withValidation(
    {
      bodySchema: ProgrammaticExecutionSchema,
      allowedMethods: ['POST'],
    },
    handler as ValidatedApiHandler<McpProgrammaticValidated>
  )
)(mainHandler);
