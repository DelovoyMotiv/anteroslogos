/**
 * AUX Audit API Endpoint - Testing Cheerio
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Dynamic import to avoid build-time issues
async function loadCheerio() {
  const cheerio = await import('cheerio');
  return cheerio;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  console.log('[AUX Audit] Handler started');
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).json({ 
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
    return;
  }
  
  try {
    console.log('[AUX Audit] Processing request');
    
    const { url } = req.body || {};
    
    if (!url) {
      res.status(400).json({ 
        error: 'Missing required field: url',
        code: 'INVALID_URL'
      });
      return;
    }
    
    console.log('[AUX Audit] URL:', url);
    
    // Fetch HTML
    console.log('[AUX Audit] Fetching HTML...');
    const htmlResponse = await fetch(url, {
      headers: {
        'User-Agent': 'AUX-Audit-Bot/1.0'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!htmlResponse.ok) {
      res.status(400).json({
        error: `Failed to fetch URL: ${htmlResponse.statusText}`,
        code: 'FETCH_FAILED'
      });
      return;
    }
    
    const html = await htmlResponse.text();
    console.log('[AUX Audit] HTML fetched, length:', html.length);
    
    // Load and use Cheerio
    console.log('[AUX Audit] Loading Cheerio...');
    const cheerio = await loadCheerio();
    const $ = cheerio.load(html);
    
    const buttonCount = $('button').length;
    const linkCount = $('a').length;
    const inputCount = $('input').length;
    
    console.log('[AUX Audit] Cheerio analysis complete');
    console.log('[AUX Audit] Buttons:', buttonCount, 'Links:', linkCount, 'Inputs:', inputCount);
    
    // Response
    const results = {
      score: 75,
      classification: 'Agent-Capable' as const,
      protocols: [],
      ariaScore: 0,
      interactiveElements: [],
      frictionPoints: [],
      recommendations: [],
      intentTriggers: [],
      summary: `Cheerio test: Found ${buttonCount} buttons, ${linkCount} links, ${inputCount} inputs`,
      riskLevel: 'medium' as const,
      analyzedAt: new Date().toISOString()
    };
    
    console.log('[AUX Audit] Sending response');
    res.status(200).json(results);
    
  } catch (error) {
    console.error('[AUX Audit] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
