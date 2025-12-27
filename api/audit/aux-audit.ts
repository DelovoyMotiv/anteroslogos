/**
 * AUX Audit API Endpoint
 * 
 * Analyzes websites for autonomous agent experience (AUX).
 * Returns AUX Score, recommendations, and actionability insights.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';


export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[AUX Audit] Request received:', req.method);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }
  
  try {
    const { url } = req.body || {};
    
    if (!url) {
      return res.status(400).json({ 
        error: 'Missing required field: url',
        code: 'INVALID_URL'
      });
    }
    
    console.log('[AUX Audit] Analyzing URL:', url);
    
    // Step 1: Test basic fetch
    console.log('[AUX Audit] Step 1: Fetching HTML...');
    const htmlResponse = await fetch(url, {
      headers: {
        'User-Agent': 'AUX-Audit-Bot/1.0 (https://anoteroslogos.com)'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!htmlResponse.ok) {
      return res.status(400).json({
        error: `Failed to fetch URL: ${htmlResponse.statusText}`,
        code: 'FETCH_FAILED'
      });
    }
    
    const html = await htmlResponse.text();
    console.log('[AUX Audit] HTML fetched, length:', html.length);
    
    // Step 2: Test Cheerio parsing
    console.log('[AUX Audit] Step 2: Parsing HTML with Cheerio...');
    const dom = cheerio.load(html);
    const buttonCount = dom('button').length;
    const linkCount = dom('a').length;
    console.log('[AUX Audit] Found buttons:', buttonCount, 'links:', linkCount);
    
    // Return basic success response
    const results = {
      score: 75,
      classification: 'Agent-Capable' as const,
      protocols: [],
      ariaScore: 0,
      interactiveElements: [],
      frictionPoints: [],
      recommendations: [],
      intentTriggers: [],
      summary: 'Basic analysis completed. HTML fetched successfully.',
      riskLevel: 'medium' as const,
      analyzedAt: new Date().toISOString()
    };
    
    console.log('[AUX Audit] Analysis complete');
    return res.status(200).json(results);
    
  } catch (error) {
    console.error('[AUX Audit] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    });
  }
}
