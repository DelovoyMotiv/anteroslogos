/**
 * Unified Tools API Endpoint
 * POST /api/tools
 * 
 * Refactored to use ManifestGeneratorOrchestrator for truth-based generation
 * 
 * @module api/tools
 * @version 2.0.0
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ManifestGeneratorOrchestrator, ManifestGenerationError, ErrorCode } from '../lib/agentManifest';

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
 * Handle agent manifest generation
 * Uses ManifestGeneratorOrchestrator for truth-based generation
 */
async function handleAgentManifest(
  req: AgentManifestRequest,
  res: VercelResponse
): Promise<void> {
  console.log('[handleAgentManifest] Starting');
  console.log('[handleAgentManifest] Request body:', JSON.stringify(req.body));
  
  // Check if OpenRouter API key is configured
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('[handleAgentManifest] OPENROUTER_API_KEY not configured');
    res.status(503).json({
      success: false,
      error: 'AI service is not configured. Please contact support.',
      code: 'SERVICE_UNAVAILABLE',
    });
    return;
  }
  
  console.log('[handleAgentManifest] API key is configured');
  
  try {
    const { url } = req;
    console.log('[handleAgentManifest] Processing URL:', url);

    // Basic URL validation
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Please enter a website URL',
      });
      return;
    }

    // Validate URL format
    const trimmedUrl = url.trim();
    let urlObj: URL;
    try {
      // First try parsing as-is
      urlObj = new URL(trimmedUrl);
    } catch {
      // If that fails, try prepending https:// only if it doesn't already have a protocol
      if (!trimmedUrl.includes('://')) {
        try {
          urlObj = new URL(`https://${trimmedUrl}`);
        } catch {
          res.status(400).json({
            success: false,
            error: 'Invalid URL format. Please enter a valid website URL.',
          });
          return;
        }
      } else {
        // Has :// but still invalid
        res.status(400).json({
          success: false,
          error: 'Invalid URL format. Please enter a valid website URL.',
        });
        return;
      }
    }
    
    // Additional validation: check for valid protocol
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      res.status(400).json({
        success: false,
        error: 'Invalid URL format. Please enter a valid website URL.',
      });
      return;
    }

    // Use the normalized URL
    const normalizedUrl = urlObj.toString();

    console.log('[handleAgentManifest] URL normalized to:', normalizedUrl);
    console.log('[handleAgentManifest] Generating manifest using orchestrator');

    // Create orchestrator instance
    console.log('[handleAgentManifest] Creating orchestrator instance...');
    const orchestrator = new ManifestGeneratorOrchestrator();
    console.log('[handleAgentManifest] Orchestrator created successfully');

    try {
      // Generate manifest using orchestrator
      console.log('[handleAgentManifest] Calling orchestrator.generate()...');
      const manifest = await orchestrator.generate(normalizedUrl);

      console.log('[handleAgentManifest] Success');
      res.status(200).json({
        success: true,
        data: { manifest },
      });

    } catch (error) {
      // Handle ManifestGenerationError with specific error codes
      if (error instanceof ManifestGenerationError) {
        console.error(`[handleAgentManifest] Generation failed: ${error.code} - ${error.message}`);
        
        // Map error codes to HTTP status codes and user-friendly messages
        let statusCode = 500;
        let userMessage = error.message;
        
        switch (error.code) {
          case ErrorCode.NETWORK_ERROR:
            statusCode = 503;
            userMessage = 'Unable to reach the website. Please check the URL and try again.';
            break;
            
          case ErrorCode.BOT_BLOCKED:
            statusCode = 403;
            userMessage = 'The website blocks automated access. Manual manifest creation required.';
            break;
            
          case ErrorCode.INSUFFICIENT_CONTENT:
            statusCode = 422;
            userMessage = 'The website content is too short or insufficient to generate a meaningful manifest.';
            break;
            
          case ErrorCode.LLM_TIMEOUT:
            statusCode = 504;
            userMessage = 'AI generation timed out. Please try again.';
            break;
            
          case ErrorCode.INVALID_JSON:
            statusCode = 500;
            userMessage = 'AI generated invalid response. Please try again.';
            break;
            
          case ErrorCode.VALIDATION_FAILED:
            statusCode = 422;
            userMessage = 'Generated manifest failed validation.';
            break;
            
          case ErrorCode.SCRAPE_FAILED:
          default:
            statusCode = 500;
            userMessage = 'Failed to generate manifest. Please try again.';
            break;
        }
        
        // Build error response with detailed information
        const errorResponse: any = {
          success: false,
          error: userMessage,
          code: error.code,
        };
        
        // Add details if available
        if (error.details) {
          errorResponse.details = error.details;
        }
        
        res.status(statusCode).json(errorResponse);
        return;
      }
      
      // Handle unexpected errors
      throw error;
    } finally {
      // Cleanup orchestrator resources
      try {
        console.log('[handleAgentManifest] Cleaning up orchestrator resources...');
        await orchestrator.cleanup();
        console.log('[handleAgentManifest] Cleanup completed');
      } catch (cleanupError) {
        console.error('[handleAgentManifest] Cleanup error:', cleanupError);
        // Don't throw cleanup errors
      }
    }

  } catch (error) {
    console.error('[handleAgentManifest] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while generating the manifest.',
      details: error instanceof Error ? error.message : String(error),
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
  // Wrap everything in try-catch to ensure we always return JSON
  try {
    // Log incoming request
    console.log('[api/tools] Incoming request:', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      env: {
        VERCEL: process.env.VERCEL,
        NODE_VERSION: process.version,
        PLATFORM: process.platform,
        ARCH: process.arch,
      },
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
  } catch (error) {
    // Last resort error handler - ensure we always return JSON
    console.error('[api/tools] Critical error in handler:', error);
    try {
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({
        success: false,
        error: 'A critical error occurred.',
        details: error instanceof Error ? error.message : String(error),
      });
    } catch (finalError) {
      // If even JSON response fails, log it
      console.error('[api/tools] Failed to send error response:', finalError);
    }
  }
}
