/**
 * Unified Tools API Endpoint
 * POST /api/tools
 * 
 * Self-contained version with browser support via @sparticuz/chromium
 * 
 * @module api/tools
 * @version 4.1.0
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
  usedBrowser?: boolean;
}

/**
 * Check if running in Vercel environment
 */
function isVercel(): boolean {
  return process.env.VERCEL === '1' || process.env.VERCEL === 'true';
}

/**
 * Scrape URL using headless browser (Playwright + @sparticuz/chromium)
 */
async function scrapeWithBrowser(url: string): Promise<ScrapedContent> {
  console.log('[scrapeWithBrowser] Starting browser scrape for:', url);
  
  // Dynamically import playwright-core and chromium
  const playwright = await import('playwright-core');
  
  let executablePath: string | undefined;
  
  if (isVercel()) {
    // Use @sparticuz/chromium for Vercel
    const chromium = await import('@sparticuz/chromium');
    executablePath = await chromium.default.executablePath();
    console.log('[scrapeWithBrowser] Using Vercel chromium:', executablePath);
  }
  
  // Launch browser with serverless-optimized settings
  const browser = await playwright.chromium.launch({
    executablePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-accelerated-2d-canvas',
      ...(isVercel() ? ['--single-process', '--no-zygote'] : []),
    ],
  });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
    });

    // Mask webdriver detection
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    const page = await context.newPage();

    // Block heavy resources for speed
    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
        return route.abort();
      }
      return route.continue();
    });

    // Navigate with networkidle for CSR hydration
    await page.goto(url, {
      timeout: 15000,
      waitUntil: 'networkidle',
    });

    // Wait extra time for React/Vue hydration
    await page.waitForTimeout(2000);

    // Extract content
    const html = await page.content();
    
    const cheerio = await import('cheerio');
    const $ = cheerio.load(html);

    let title = $('title').first().text().trim();
    if (!title) {
      title = $('h1').first().text().trim() || 'Untitled';
    }

    let description = $('meta[name="description"]').attr('content') || '';
    if (!description) {
      description = $('p').first().text().trim().slice(0, 200) || '';
    }

    const headings: string[] = [];
    $('h1, h2, h3').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text && headings.length < 10) {
        headings.push(text);
      }
    });

    const textContent = $('body').text().trim().slice(0, 2000);

    await context.close();
    
    console.log('[scrapeWithBrowser] Successfully scraped, title:', title);

    return {
      url,
      title,
      description,
      headings,
      textContent,
      usedBrowser: true,
    };
  } finally {
    await browser.close();
  }
}

/**
 * Simple fetch-based scraper (fallback when browser unavailable)
 */
async function scrapeUrlSimple(url: string): Promise<ScrapedContent> {
  console.log('[scrapeUrlSimple] Using simple fetch for:', url);
  
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
    
    const cheerio = await import('cheerio');
    const $ = cheerio.load(html);

    let title = $('title').first().text().trim();
    if (!title) {
      title = $('h1').first().text().trim() || 'Untitled';
    }

    let description = $('meta[name="description"]').attr('content') || '';
    if (!description) {
      description = $('p').first().text().trim().slice(0, 200) || '';
    }

    const headings: string[] = [];
    $('h1, h2, h3').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text && headings.length < 10) {
        headings.push(text);
      }
    });

    const textContent = $('body').text().trim().slice(0, 2000);

    return {
      url,
      title,
      description,
      headings,
      textContent,
      usedBrowser: false,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Main scrape function - tries browser first, falls back to simple fetch
 */
async function scrapeUrl(url: string): Promise<ScrapedContent> {
  try {
    // Try browser-based scraping first
    return await scrapeWithBrowser(url);
  } catch (error) {
    console.error('[scrapeUrl] Browser scraping failed:', error);
    console.log('[scrapeUrl] Falling back to simple fetch...');
    
    // Fallback to simple fetch
    return await scrapeUrlSimple(url);
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
The manifest MUST follow this EXACT structure:
{
  "$schema": "https://anoteroslogos.com/schemas/agents.json",
  "version": "1.0",
  "identity": {
    "name": "Brand or website name",
    "description": "High-entropy description of core value proposition",
    "tags": ["tag1", "tag2", "tag3"]
  },
  "knowledge": [
    {
      "role": "documentation",
      "url": "/docs",
      "description": "Description of what this page contains"
    }
  ],
  "actions": []
}

IMPORTANT RULES:
- "identity" object is REQUIRED with "name", "description", and "tags" array
- "knowledge" array entries MUST have "role" (one of: documentation, pricing, about, product, contact, support), "url", and "description"
- "actions" can be empty array if no API endpoints detected
- Return ONLY valid JSON, no markdown or explanations`;

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
