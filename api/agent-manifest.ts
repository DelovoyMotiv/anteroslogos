/**
 * Agent Manifest API Endpoint
 * POST /api/agent-manifest
 * 
 * Generates a logos.json semantic topology file for a given website URL
 * Uses LLM-powered generation via OpenRouter
 * 
 * @module api/agent-manifest
 * @version 1.0.0
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateManifest, ManifestGenerationError, InvalidJSONError, SchemaValidationError } from '../lib/agentManifest/generator';
import { validateManifestUrl, normalizeManifestUrl } from '../lib/agentManifest/urlUtils';
import type { LogosJSON } from '../lib/agentManifest/types';

/**
 * Request body interface
 */
interface AgentManifestRequest {
  url: string;
}

/**
 * Success response interface
 */
interface AgentManifestSuccessResponse {
  success: true;
  manifest: LogosJSON;
}

/**
 * Error response interface
 */
interface AgentManifestErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

/**
 * Combined response type
 */
type AgentManifestResponse = AgentManifestSuccessResponse | AgentManifestErrorResponse;

/**
 * Main handler for agent manifest generation
 * 
 * Validates request, generates manifest using LLM, and returns result
 * Implements comprehensive error handling for various failure scenarios
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
      error: 'Method not allowed. Use POST to generate manifests.',
    });
    return;
  }

  try {
    // Extract URL from request body
    const body = req.body as AgentManifestRequest;
    const { url } = body;

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

    // Generate manifest using LLM
    const manifest = await generateManifest(sanitizedUrl);

    // Return success response
    res.status(200).json({
      success: true,
      manifest,
    });

  } catch (error) {
    // Log error for debugging
    console.error('[api/agent-manifest] Error generating manifest:', error);

    // Handle specific error types
    if (error instanceof SchemaValidationError) {
      // Manifest failed schema validation
      res.status(500).json({
        success: false,
        error: 'Failed to generate valid manifest. Please try again.',
        details: error.validationErrors,
      });
      return;
    }

    if (error instanceof InvalidJSONError) {
      // LLM returned invalid JSON
      res.status(500).json({
        success: false,
        error: 'Failed to generate valid manifest. Please try again.',
      });
      return;
    }

    if (error instanceof ManifestGenerationError) {
      // Check for specific error messages
      const errorMessage = error.message;

      if (errorMessage.includes('not configured') || errorMessage.includes('API key')) {
        // API key missing or invalid
        res.status(503).json({
          success: false,
          error: 'AI service is not configured. Please contact support.',
        });
        return;
      }

      if (errorMessage.includes('rate limit')) {
        // Rate limit exceeded
        res.status(429).json({
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
        });
        return;
      }

      if (errorMessage.includes('timeout')) {
        // Request timeout
        res.status(504).json({
          success: false,
          error: 'Request timed out. Please try again.',
        });
        return;
      }

      // Generic manifest generation error
      res.status(500).json({
        success: false,
        error: 'Failed to generate manifest. Please try again.',
      });
      return;
    }

    // Handle network errors
    if (error instanceof Error && error.message.includes('network')) {
      res.status(503).json({
        success: false,
        error: 'Network error occurred. Please check your connection and try again.',
      });
      return;
    }

    // Generic error fallback
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    });
  }
}
