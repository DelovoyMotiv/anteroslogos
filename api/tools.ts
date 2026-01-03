/**
 * Unified Tools API Endpoint
 * POST /api/tools
 * 
 * Simplified version that works in Vercel serverless environment
 * 
 * @module api/tools
 * @version 3.0.0
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Base request interface
 */
interface ToolsRequest {
  tool: string;
  url?: string;
  [key: string]: unknown;
}

/**
 * Scraped content interface
 */
interface ScrapedContent {
  url: string;
  title: string;
  description: string;
  headings: string[];
  textContent: string;
}

/**
 * Simple fetch-based scraper (no browser, no playwright)
 */
async function scrapeUrl(url: string): Promise<ScrapedContent> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AgentManifestBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    
    // Use cheerio for parsing (it's a dependency)
    const cheerio = await import('cheerio');
    const $ = cheerio.load(html);

    // Extract title
    let title = $('title').first().text().trim();
    if (!title) {
      title = $('h1').first().text().trim() || 'Untitled';
    }

    // Extract description
    let description = $('meta[name="description"]').attr('content') || '';
    if (!description) {
      description = $('p').first().text().trim().slice(0, 200) || '';
    }

    // Extract headings
    const headings: string[] = [];
    $('h1, h2, h3').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text && headings.length < 10) {
        headings.push(text);
      }
    });

    // Extract text content
    const textContent = $('body').text().trim().slice(0, 2000);

    return {
      url,
      title,
      description,
      headings,
      textContent,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Call OpenRouter API to generate manifest
 */
async function generateManifestWithLLM(content: ScrapedContent): Promise<object> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const systemPrompt = `You are an expert at creating agents.json manifest files for websites.
Generate a valid agents.json manifest based on the provided website content.
The manifest should follow this structure:
{
  "v": "1.0",
  "url": "website url",
  "name": "website name",
  "description": "brief description",
  "capabilities": ["list", "of", "capabilities"],
  "knowledge": [{"topic": "topic name", "description": "topic description"}]
}
Return ONLY valid JSON, no markdown or explanations.`;

  const userPrompt = `Generate an agents.json manifest for this website:
URL: ${content.url}
Title: ${content.title}
Description: ${content.description}
Headings: ${content.headings.join(', ')}
Content preview: ${content.textContent.slice(0, 500)}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://anoteroslogos.com',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3-haiku',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const llmResponse = data.choices?.[0]?.message?.content || '';

  // Parse JSON from response
  let jsonString = llmResponse.trim();
  if (jsonString.startsWith('```')) {
    const match = jsonString.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (match && match[1]) {
      jsonString = match[1].trim();
    }
  }

  return JSON.parse(jsonString);
}

/**
 * Handle agent manifest generation
 */
async function handleAgentManifest(
  url: string,
  res: VercelResponse
): Promise<void> {
  console.log('[handleAgentManifest] Starting for URL:', url);

  // Check API key
  if (!process.env.OPENROUTER_API_KEY) {
    res.status(503).json({
      success: false,
      error: 'AI service is not configured.',
      code: 'SERVICE_UNAVAILABLE',
    });
    return;
  }

  try {
    // Validate URL
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Please enter a website URL',
      });
      return;
    }

    // Normalize URL
    let normalizedUrl = url.trim();
    if (!normalizedUrl.includes('://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // Validate URL format
    try {
      const urlObj = new URL(normalizedUrl);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Invalid protocol');
      }
      normalizedUrl = urlObj.toString();
    } catch {
      res.status(400).json({
        success: false,
        error: 'Invalid URL format.',
      });
      return;
    }

    console.log('[handleAgentManifest] Scraping URL:', normalizedUrl);

    // Scrape content
    const content = await scrapeUrl(normalizedUrl);
    console.log('[handleAgentManifest] Scraped content, title:', content.title);

    // Check content
    if (content.textContent.length < 100) {
      res.status(422).json({
        success: false,
        error: 'Website content is too short to generate a manifest.',
      });
      return;
    }

    // Generate manifest with LLM
    console.log('[handleAgentManifest] Calling LLM...');
    const manifest = await generateManifestWithLLM(content);
    console.log('[handleAgentManifest] Manifest generated successfully');

    res.status(200).json({
      success: true,
      data: { manifest },
    });

  } catch (error) {
    console.error('[handleAgentManifest] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Determine error type
    if (errorMessage.includes('403') || errorMessage.includes('401')) {
      res.status(403).json({
        success: false,
        error: 'Website blocks automated access.',
      });
      return;
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('abort')) {
      res.status(504).json({
        success: false,
        error: 'Request timed out.',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to generate manifest.',
      details: errorMessage,
    });
  }
}

/**
 * Main handler
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // POST only
    if (req.method !== 'POST') {
      res.status(405).json({
        success: false,
        error: 'Method not allowed. Use POST.',
      });
      return;
    }

    const body = req.body as ToolsRequest;
    const { tool, url } = body;

    console.log('[api/tools] Request:', { tool, url });

    if (!tool || typeof tool !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Tool parameter is required.',
      });
      return;
    }

    switch (tool) {
      case 'agent-manifest':
        await handleAgentManifest(url || '', res);
        break;

      default:
        res.status(400).json({
          success: false,
          error: `Unknown tool: ${tool}`,
        });
    }

  } catch (error) {
    console.error('[api/tools] Critical error:', error);
    res.status(500).json({
      success: false,
      error: 'A critical error occurred.',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
