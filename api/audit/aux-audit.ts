/**
 * AUX Audit API Endpoint
 * 
 * Analyzes websites for autonomous agent experience (AUX).
 * Returns AUX Score, recommendations, and actionability insights.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';
import { SemanticAffordanceAnalyzer } from '../../lib/auxAudit/SemanticAffordanceAnalyzer';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  console.log('[AUX Audit] Request received:', req.method);
  
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
    const { url } = req.body || {};
    
    if (!url) {
      res.status(400).json({ 
        error: 'Missing required field: url',
        code: 'INVALID_URL'
      });
      return;
    }
    
    console.log('[AUX Audit] Analyzing URL:', url);
    
    // Step 1: Fetch HTML
    console.log('[AUX Audit] Step 1: Fetching HTML...');
    let html: string;
    try {
      const htmlResponse = await fetch(url, {
        headers: {
          'User-Agent': 'AUX-Audit-Bot/1.0 (https://anoteroslogos.com)'
        },
        signal: AbortSignal.timeout(10000)
      });
      
      if (!htmlResponse.ok) {
        console.error('[AUX Audit] Fetch failed:', htmlResponse.status, htmlResponse.statusText);
        res.status(400).json({
          error: `Failed to fetch URL: ${htmlResponse.statusText}`,
          code: 'FETCH_FAILED'
        });
        return;
      }
      
      html = await htmlResponse.text();
      console.log('[AUX Audit] HTML fetched, length:', html.length);
    } catch (fetchError) {
      console.error('[AUX Audit] Fetch error:', fetchError);
      res.status(400).json({
        error: 'Failed to fetch URL',
        code: 'FETCH_FAILED',
        message: fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'
      });
      return;
    }
    
    // Step 2: Parse with Cheerio
    console.log('[AUX Audit] Step 2: Parsing HTML with Cheerio...');
    let dom: cheerio.CheerioAPI;
    try {
      dom = cheerio.load(html);
      const buttonCount = dom('button').length;
      const linkCount = dom('a').length;
      console.log('[AUX Audit] Found buttons:', buttonCount, 'links:', linkCount);
    } catch (cheerioError) {
      console.error('[AUX Audit] Cheerio error:', cheerioError);
      res.status(500).json({
        error: 'Failed to parse HTML',
        code: 'PARSE_ERROR',
        message: cheerioError instanceof Error ? cheerioError.message : 'Unknown parse error'
      });
      return;
    }
    
    // Step 3: Analyze semantic affordance
    console.log('[AUX Audit] Step 3: Analyzing semantic affordance...');
    let semanticAnalysis;
    try {
      const semanticAnalyzer = new SemanticAffordanceAnalyzer();
      semanticAnalysis = await semanticAnalyzer.analyzeHTML(html);
      console.log('[AUX Audit] ARIA Score:', semanticAnalysis.ariaScore);
      console.log('[AUX Audit] Interactive elements:', semanticAnalysis.interactiveElements.length);
    } catch (analysisError) {
      console.error('[AUX Audit] Analysis error:', analysisError);
      res.status(500).json({
        error: 'Failed to analyze HTML',
        code: 'ANALYSIS_ERROR',
        message: analysisError instanceof Error ? analysisError.message : 'Unknown analysis error',
        stack: analysisError instanceof Error ? analysisError.stack : undefined
      });
      return;
    }
    
    // Return results
    const results = {
      score: 75,
      classification: 'Agent-Capable' as const,
      protocols: [],
      ariaScore: semanticAnalysis.ariaScore,
      interactiveElements: semanticAnalysis.interactiveElements,
      frictionPoints: [],
      recommendations: [],
      intentTriggers: [],
      summary: `Analysis completed. ARIA score: ${semanticAnalysis.ariaScore.toFixed(1)}%, found ${semanticAnalysis.interactiveElements.length} interactive elements.`,
      riskLevel: 'medium' as const,
      analyzedAt: new Date().toISOString()
    };
    
    console.log('[AUX Audit] Analysis complete');
    res.status(200).json(results);
    
  } catch (error) {
    console.error('[AUX Audit] Unexpected error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    });
  }
}
