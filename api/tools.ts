/**
 * Unified Tools API Endpoint
 * POST /api/tools
 * 
 * Handles multiple tool operations through a single endpoint
 * Reduces the number of serverless functions for Vercel deployment
 * 
 * Supported tools:
 * - agent-manifest: Generate logos.json semantic topology files
 * 
 * @module api/tools
 * @version 1.0.0
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateManifest, ManifestGenerationError, InvalidJSONError, SchemaValidationError } from '../lib/agentManifest/generator';
import { validateManifestUrl, normalizeManifestUrl } from '../lib/agentManifest/urlUtils';

/**
 * Base request interface
 */
interface ToolsRequest {
  tool: string;
  [key: string]: unknown;
}

/**
 * Agent Manifest specific request
 */
interface AgentManifestRequest extends ToolsRequest {
  tool: 'agent-manifest';
  url: string;
}

/**
 * Success response interface
 */
interface ToolsSuccessResponse {
  success: true;
  data: unknown;
}

/**
 * Error response interface
 */
interface ToolsErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

/**
 * Combined response type
 */
type ToolsResponse = ToolsSuccessResponse | ToolsErrorResponse;

/**
 * Handle agent manifest generation
 */
async function handleAgentManifest(
  req: AgentManifestRequest,
  res: VercelResponse
): Promise<void> {
  console.log('[handleAgentManifest] Starting manifest generation');
  const { url } = req;

  // Validate URL is provided and is a string
  if (url === undefined || url === null || typeof url !== 'string') {
    console.error('[handleAgentManifest] Invalid URL:', url);
    res.status(400).json({
      success: false,
      error: 'URL is required. Please provide a valid website URL.',
    });
    return;
  }

  // Validate URL is not empty
  if (url.trim().length === 0) {
    console.error('[handleAgentManifest] Empty URL');
    res.status(400).json({
      success: false,
      error: 'Please enter a website URL',
    });
    return;
  }

  console.log('[handleAgentManifest] Validating URL:', url);

  // Validate and sanitize URL
  const validationResult = validateManifestUrl(url);
  
  if (!validationResult.isValid) {
    console.error('[handleAgentManifest] URL validation failed:', validationResult.error);
    res.status(400).json({
      success: false,
      error: validationResult.error || 'Invalid URL format. Please enter a valid website URL.',
    });
    return;
  }

  // Normalize URL for consistent processing
  const sanitizedUrl = normalizeManifestUrl(validationResult.sanitizedUrl!);
  console.log('[handleAgentManifest] Sanitized URL:', sanitizedUrl);

  try {
    console.log('[handleAgentManifest] Calling generateManifest');
    // Generate manifest using LLM
    const manifest = await generateManifest(sanitizedUrl);

    console.log('[handleAgentManifest] Manifest generated successfully');
    // Return success response
    res.status(200).json({
      success: true,
      data: { manifest },
    });

  } catch (error) {
    // Log error for debugging
    console.error('[api/tools/agent-manifest] Error generating manifest:', error);
    console.error('[api/tools/agent-manifest] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[api/tools/agent-manifest] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[api/tools/agent-manifest] Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    // Handle specific error types
    if (error instanceof SchemaValidationError) {
      res.status(500).json({
        success: false,
        error: 'Failed to generate valid manifest. Please try again.',
        details: error.validationErrors,
      });
      return;
    }

    if (error instanceof InvalidJSONError) {
      res.status(500).json({
        success: false,
        error: 'Failed to generate valid manifest. Please try again.',
      });
      return;
    }

    if (error instanceof ManifestGenerationError) {
      const errorMessage = error.message;

      if (errorMessage.includes('not configured') || errorMessage.includes('API key')) {
        res.status(503).json({
          success: false,
          error: 'AI service is not configured. Please contact support.',
        });
        return;
      }

      if (errorMessage.includes('rate limit')) {
        res.status(429).json({
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
        });
        return;
      }

      if (errorMessage.includes('timeout')) {
        res.status(504).json({
          success: false,
          error: 'Request timed out. Please try again.',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to generate manifest. Please try again.',
      });
      return;
    }

    if (error instanceof Error && error.message.includes('network')) {
      res.status(503).json({
        success: false,
        error: 'Network error occurred. Please check your connection and try again.',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    });
  }
}

/**
 * Main handler for unified tools endpoint
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    // Log incoming request
    console.log('[api/tools] Incoming request:', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
    });

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Validate request method (POST only)
  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
    });
    return;
  }

  try {
    const body = req.body as ToolsRequest;
    const { tool } = body;

    console.log('[api/tools] Processing tool:', tool);

    // Validate tool parameter
    if (!tool || typeof tool !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Tool parameter is required.',
      });
      return;
    }

    // Route to appropriate handler
    switch (tool) {
      case 'agent-manifest':
        console.log('[api/tools] Routing to agent-manifest handler');
        await handleAgentManifest(body as AgentManifestRequest, res);
        break;

      default:
        res.status(400).json({
          success: false,
          error: `Unknown tool: ${tool}. Supported tools: agent-manifest`,
        });
    }

  } catch (error) {
    console.error('[api/tools] Unexpected error:', error);
    console.error('[api/tools] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred.',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
