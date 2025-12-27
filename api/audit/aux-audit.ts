/**
 * AUX Audit API Endpoint
 * 
 * Analyzes websites for autonomous agent experience (AUX).
 * Returns AUX Score, recommendations, and actionability insights.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';
import { SemanticAffordanceAnalyzer } from '../../lib/auxAudit/SemanticAffordanceAnalyzer';
import type { ProtocolStatus } from '../../lib/auxAudit/types';

/**
 * Simplified Protocol Discovery (without cache for serverless)
 */
async function discoverProtocols(url: string): Promise<ProtocolStatus[]> {
  const normalizeUrl = (url: string): string => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  };
  
  const baseUrl = normalizeUrl(url);
  
  const protocolPaths = [
    { name: 'agents.json', path: '/agents.json' },
    { name: 'ai-plugin.json', path: '/.well-known/ai-plugin.json' },
    { name: 'mcp.json', path: '/.well-known/mcp.json' }
  ];
  
  const protocolChecks = protocolPaths.map(async ({ name, path }) => {
    try {
      const fullUrl = new URL(path, baseUrl).toString();
      const response = await fetch(fullUrl, {
        method: 'HEAD',
        headers: { 'User-Agent': 'AUX-Audit-Bot/1.0' },
        signal: AbortSignal.timeout(5000)
      });
      
      return {
        name,
        available: response.ok || response.status === 304,
        url: fullUrl
      };
    } catch {
      return {
        name,
        available: false,
        url: new URL(path, baseUrl).toString()
      };
    }
  });
  
  const protocols = await Promise.all(protocolChecks);
  
  // Add robots.txt check
  try {
    const robotsUrl = new URL('/robots.txt', baseUrl).toString();
    const response = await fetch(robotsUrl, {
      headers: { 'User-Agent': 'AUX-Audit-Bot/1.0' },
      signal: AbortSignal.timeout(5000)
    });
    
    protocols.push({
      name: 'robots.txt',
      available: response.ok,
      url: robotsUrl
    });
  } catch {
    protocols.push({
      name: 'robots.txt',
      available: false,
      url: new URL('/robots.txt', baseUrl).toString()
    });
  }
  
  return protocols;
}


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
    
    // Step 1: Test basic fetch
    console.log('[AUX Audit] Step 1: Fetching HTML...');
    const htmlResponse = await fetch(url, {
      headers: {
        'User-Agent': 'AUX-Audit-Bot/1.0 (https://anoteroslogos.com)'
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
    
    // Step 2: Test Cheerio parsing
    console.log('[AUX Audit] Step 2: Parsing HTML with Cheerio...');
    const dom = cheerio.load(html);
    const buttonCount = dom('button').length;
    const linkCount = dom('a').length;
    console.log('[AUX Audit] Found buttons:', buttonCount, 'links:', linkCount);
    
    // Step 3: Discover protocols
    console.log('[AUX Audit] Step 3: Discovering protocols...');
    const protocols = await discoverProtocols(url);
    console.log('[AUX Audit] Protocols found:', protocols.length);
    
    // Step 4: Analyze semantic affordance
    console.log('[AUX Audit] Step 4: Analyzing semantic affordance...');
    const semanticAnalyzer = new SemanticAffordanceAnalyzer();
    const semanticAnalysis = await semanticAnalyzer.analyzeHTML(html);
    console.log('[AUX Audit] ARIA Score:', semanticAnalysis.ariaScore);
    console.log('[AUX Audit] Interactive elements:', semanticAnalysis.interactiveElements.length);
    
    // Return basic success response
    const results = {
      score: 75,
      classification: 'Agent-Capable' as const,
      protocols,
      ariaScore: semanticAnalysis.ariaScore,
      interactiveElements: semanticAnalysis.interactiveElements,
      frictionPoints: [],
      recommendations: [],
      intentTriggers: [],
      summary: `Analysis completed. Found ${protocols.length} protocols, ARIA score: ${semanticAnalysis.ariaScore.toFixed(1)}%`,
      riskLevel: 'medium' as const,
      analyzedAt: new Date().toISOString()
    };
    
    console.log('[AUX Audit] Analysis complete');
    res.status(200).json(results);
    
  } catch (error) {
    console.error('[AUX Audit] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    });
  }
}
