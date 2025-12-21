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
import type { LogosJSON } from '../lib/agentManifest/types';

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
  const { url } = req;

  // Validate URL is provided and is a string
  if (url === undefined || url === null || typeof url !== 'string') {
    res.status(400).json({
      success: false,
      error: 'URL is required. Please provide a valid website URL.',
    });
    return;
  }

  // Validate URL is not empty
  if (url.trim().length === 0) {
    res.status(400).json({
      success: false,
      error: 'Please enter a website URL',
    });
    return;
  }

  // Validate and sanitize URL
  const validationResult = validateManifestUrl(url);
  
  if (!validationResult.isValid) {
    res.status(400).json({
      success: false,
      error: validationResult.error || 'Invalid URL format. Please enter a valid website URL.',
    });
    return;
  }

  // Normalize URL for consistent processing
  const sanitizedUrl = normalizeManifestUrl(validationResult.sanitizedUrl!);

  try {
    // Generate manifest using LLM
    const manifest = await generateManifest(sanitizedUrl);

    // Return success response
    res.status(200).json({
      success: true,
      data: { manifest },
    });

  } catch (error) {
    // Log error for debugging
    console.error('[api/tools/agent-manifest] Error generating manifest:', error);

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
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred.',
    });
  }
}
