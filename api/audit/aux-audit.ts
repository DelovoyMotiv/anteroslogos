/**
 * AUX Audit API Endpoint - With SemanticAffordanceAnalyzer
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Dynamic imports to avoid build-time issues
async function loadCheerio() {
  const cheerio = await import('cheerio');
  return cheerio;
}

async function loadSemanticAnalyzer() {
  const { SemanticAffordanceAnalyzer } = await import('../../lib/auxAudit/SemanticAffordanceAnalyzer');
  return SemanticAffordanceAnalyzer;
}

async function loadFrictionAnalyzer() {
  const { FrictionAnalyzer } = await import('../../lib/auxAudit/FrictionAnalyzer');
  return FrictionAnalyzer;
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
    
    // Load Cheerio
    console.log('[AUX Audit] Loading Cheerio...');
    const cheerio = await loadCheerio();
    const $ = cheerio.load(html);
    
    const buttonCount = $('button').length;
    const linkCount = $('a').length;
    const inputCount = $('input').length;
    
    console.log('[AUX Audit] Cheerio counts - Buttons:', buttonCount, 'Links:', linkCount, 'Inputs:', inputCount);
    
    // Load and use SemanticAffordanceAnalyzer
    console.log('[AUX Audit] Loading SemanticAffordanceAnalyzer...');
    const SemanticAffordanceAnalyzer = await loadSemanticAnalyzer();
    const analyzer = new SemanticAffordanceAnalyzer();
    
    console.log('[AUX Audit] Running semantic analysis...');
    const semanticAnalysis = await analyzer.analyzeHTML(html, cheerio);
    
    console.log('[AUX Audit] Semantic analysis complete');
    console.log('[AUX Audit] ARIA Score:', semanticAnalysis.ariaScore);
    console.log('[AUX Audit] Interactive elements:', semanticAnalysis.interactiveElements.length);
    
    // Load and use FrictionAnalyzer
    console.log('[AUX Audit] Loading FrictionAnalyzer...');
    const FrictionAnalyzer = await loadFrictionAnalyzer();
    const frictionAnalyzer = new FrictionAnalyzer();
    
    console.log('[AUX Audit] Running friction analysis...');
    const frictionPoints = await frictionAnalyzer.detectFriction(html, $);
    
    console.log('[AUX Audit] Friction analysis complete');
    console.log('[AUX Audit] Friction points found:', frictionPoints.length);
    
    // Response
    const results = {
      score: 75,
      classification: 'Agent-Capable' as const,
      protocols: [],
      ariaScore: semanticAnalysis.ariaScore,
      interactiveElements: semanticAnalysis.interactiveElements,
      frictionPoints,
      recommendations: [],
      intentTriggers: [],
      summary: `Analysis complete. ARIA score: ${semanticAnalysis.ariaScore.toFixed(1)}%, found ${semanticAnalysis.interactiveElements.length} interactive elements, ${frictionPoints.length} friction points detected`,
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
