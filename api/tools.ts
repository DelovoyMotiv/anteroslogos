/**
 * Unified Tools API Endpoint
 * POST /api/tools
 * 
 * Minimal version for debugging - all logic inline
 * 
 * @module api/tools
 * @version 1.0.0
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

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
 */
async function handleAgentManifest(
  req: AgentManifestRequest,
  res: VercelResponse
): Promise<void> {
  console.log('[handleAgentManifest] Starting');
  
  try {
    const { url } = req;

    // Basic URL validation
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'URL is required',
      });
      return;
    }

    // Check if API key exists
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('[handleAgentManifest] No API key');
      res.status(503).json({
        success: false,
        error: 'AI service is not configured',
      });
      return;
    }

    console.log('[handleAgentManifest] API key found, calling OpenRouter');

    // Call OpenRouter API directly
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://anoteroslogos.com',
        'X-Title': 'Anóteros Lógos Agent Manifest Generator',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4.5',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in Semantic Topology. Generate a logos.json file for the given domain. Return ONLY valid JSON, no markdown.'
          },
          {
            role: 'user',
            content: `Generate a logos.json semantic topology file for: ${url}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[handleAgentManifest] OpenRouter error:', errorData);
      res.status(500).json({
        success: false,
        error: 'Failed to generate manifest',
      });
      return;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      res.status(500).json({
        success: false,
        error: 'No response from AI',
      });
      return;
    }

    // Parse JSON from response
    let jsonString = content.trim();
    if (jsonString.startsWith('```')) {
      const match = jsonString.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (match && match[1]) {
        jsonString = match[1].trim();
      }
    }

    const manifest = JSON.parse(jsonString);

    console.log('[handleAgentManifest] Success');
    res.status(200).json({
      success: true,
      data: { manifest },
    });

  } catch (error) {
    console.error('[handleAgentManifest] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate manifest',
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
