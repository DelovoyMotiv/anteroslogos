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
 * Simple inline validation for AgentsJSON
 */
function isValidAgentsJSON(obj: any): boolean {
  try {
    // Check required top-level fields
    if (!obj || typeof obj !== 'object') return false;
    if (obj.$schema !== 'https://anoteroslogos.com/schemas/agents-v1.json') return false;
    if (obj.version !== '1.0') return false;
    
    // Check identity
    if (!obj.identity || typeof obj.identity !== 'object') return false;
    if (!obj.identity.name || typeof obj.identity.name !== 'string') return false;
    if (!obj.identity.description || typeof obj.identity.description !== 'string') return false;
    if (!Array.isArray(obj.identity.tags) || obj.identity.tags.length === 0) return false;
    
    // Check knowledge array
    if (!Array.isArray(obj.knowledge) || obj.knowledge.length === 0) return false;
    const validRoles = ['documentation', 'pricing', 'about', 'product', 'contact', 'support'];
    for (const entry of obj.knowledge) {
      if (!entry.role || !validRoles.includes(entry.role)) return false;
      if (!entry.url || typeof entry.url !== 'string') return false;
      if (!entry.description || typeof entry.description !== 'string') return false;
    }
    
    // Check actions array (can be empty)
    if (!Array.isArray(obj.actions)) return false;
    
    return true;
  } catch {
    return false;
  }
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

    // Create abort controller for timeout (8 seconds to leave buffer)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      // Call OpenRouter API directly with faster model
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://anoteroslogos.com',
          'X-Title': 'Anóteros Lógos Agent Manifest Generator',
        },
        body: JSON.stringify({
          model: 'kwaipilot/kat-coder-pro:free', // Free model for JSON generation
          messages: [
            {
              role: 'system',
              content: 'You are an expert in Agent-Native Web standards and AI discoverability. Generate a complete agents.json file for the given domain. Return ONLY valid JSON, no markdown. Use clear, accessible language - NO academic terminology.'
            },
            {
              role: 'user',
              content: `Generate a complete agents.json file for: ${url}

CRITICAL REQUIREMENTS:
1. Include 3-5 knowledge entries (not just 1!)
2. Use standard web semantic roles: documentation, pricing, about, product, contact, support
3. Each entry must have meaningful descriptions for AI agents
4. Include actions array (can be empty if no known APIs)

FORBIDDEN TERMS (do NOT use):
- axiom, theorem, lemma, corollary, definition
- semantic topology, knowledge topology
- Any academic or mathematical terminology

Schema structure:
{
  "$schema": "https://anoteroslogos.com/schemas/agents-v1.json",
  "version": "1.0",
  "identity": {
    "name": "[Brand Name]",
    "description": "[High-entropy description of core value proposition]",
    "tags": ["Industry", "Focus", "Category"]
  },
  "knowledge": [
    {"role": "about", "url": "/about", "description": "[What this page contains]"},
    {"role": "product", "url": "/products", "description": "[What this page contains]"},
    {"role": "documentation", "url": "/docs", "description": "[What this page contains]"},
    {"role": "pricing", "url": "/pricing", "description": "[What this page contains]"},
    {"role": "contact", "url": "/contact", "description": "[What this page contains]"}
  ],
  "actions": []
}

Return ONLY the complete JSON object with 3-5 knowledge entries.`
            }
          ],
          temperature: 0.7,
          max_tokens: 1500, // Reduced for speed
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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

      // Validate the manifest against the schema
      if (!isValidAgentsJSON(manifest)) {
        console.error('[handleAgentManifest] Schema validation failed');
        res.status(500).json({
          success: false,
          error: 'Failed to generate valid manifest. The AI response did not match the expected schema.',
        });
        return;
      }

      console.log('[handleAgentManifest] Success');
      res.status(200).json({
        success: true,
        data: { manifest },
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('[handleAgentManifest] Request timeout');
        res.status(504).json({
          success: false,
          error: 'Request timeout. Please try again.',
        });
        return;
      }
      
      throw fetchError;
    }

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
