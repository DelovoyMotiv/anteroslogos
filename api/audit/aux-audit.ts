/**
 * AUX Audit API Endpoint
 * 
 * Analyzes websites for autonomous agent experience (AUX).
 * Returns AUX Score, recommendations, and actionability insights.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';
import { ProtocolDiscoveryEngine } from '../../lib/auxAudit/ProtocolDiscoveryEngine';
import { SemanticAffordanceAnalyzer } from '../../lib/auxAudit/SemanticAffordanceAnalyzer';
import { FrictionAnalyzer } from '../../lib/auxAudit/FrictionAnalyzer';
import { RecommendationEngine } from '../../lib/auxAudit/RecommendationEngine';
import { calculateAUXScore, classifyScore } from '../../lib/auxAudit/scoringUtils';
import type { AUXAuditResults, ScrapedData, LLMAnalysis } from '../../lib/auxAudit/types';

/**
 * Simple OpenRouter client for LLM analysis
 * Uses the same pattern as Agent Manifest for consistency
 */
class SimpleOpenRouterClient {
  private apiKey: string;
  private model: string;
  private baseURL: string;

  constructor(apiKey: string, model: string = 'anthropic/claude-sonnet-4.5') {
    this.apiKey = apiKey;
    this.model = model;
    this.baseURL = 'https://openrouter.ai/api/v1';
  }

  async chat(messages: Array<{ role: string; content: string }>, options?: { temperature?: number; max_tokens?: number }): Promise<string> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://anoteroslogos.com',
        'X-Title': 'Anóteros Lógos AUX Audit',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.max_tokens ?? 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenRouter API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}

/**
 * Perform LLM analysis using OpenRouter
 */
async function performLLMAnalysis(data: ScrapedData): Promise<LLMAnalysis> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('LLM service is not configured. Please set OPENROUTER_API_KEY environment variable.');
  }
  
  const client = new SimpleOpenRouterClient(apiKey);
  
  // Build prompt
  const protocolSummary = data.protocols.length > 0
    ? data.protocols.map(p => `- ${p.name}: ${p.available ? '✓ Available' : '✗ Not Found'}`).join('\n')
    : 'No agent-specific protocols detected';
  
  const elementsSummary = data.interactiveElements.length > 0
    ? `Found ${data.interactiveElements.length} interactive elements (${data.interactiveElements.filter(e => e.hasAriaLabel).length} with ARIA labels)`
    : 'No interactive elements found';
  
  const frictionSummary = data.frictionPoints.length > 0
    ? data.frictionPoints.map(fp => `- ${fp.type} (${fp.severity}): ${fp.description}`).join('\n')
    : 'No friction points detected';
  
  const prompt = `Analyze the following website data for autonomous agent actionability:

## ARIA Accessibility Score
${data.ariaScore.toFixed(1)}% of interactive elements have proper ARIA labels or roles

## Agent Protocols
${protocolSummary}

## Interactive Elements
${elementsSummary}

## Friction Points
${frictionSummary}

Based on this data, provide a comprehensive analysis of how well this website supports autonomous AI agents (like OpenAI Operator or Claude Computer Use) in completing tasks such as purchasing, booking, or logging in.

Your response must be valid JSON with the following structure:
{
  "score": <number 0-100>,
  "frictionPoints": [<array of strings describing friction points>],
  "riskLevel": "<low|medium|high>",
  "summary": "<string summarizing the analysis>",
  "recommendations": [
    {
      "title": "<string>",
      "description": "<string>",
      "priority": "<low|medium|high>",
      "impact": <number 0-100>
    }
  ],
  "intentTriggers": [
    {
      "intent": "<string: buy|book|login|signup|search|contact|etc>",
      "selector": "<string: CSS selector>",
      "confidence": "<low|medium|high>",
      "element": {
        "tag": "<string>",
        "selector": "<string>",
        "hasAriaLabel": <boolean>
      }
    }
  ]
}`;

  const systemPrompt = `You are an expert autonomous AI agent evaluating website actionability. Your role is to assess how well websites support autonomous agents (like OpenAI Operator, Claude Computer Use, or similar systems) in completing tasks.

When scoring (0-100):
- 0-49: Agent-Blind (major barriers, agents cannot complete tasks)
- 50-80: Agent-Capable (some support, agents can complete basic tasks with difficulty)
- 81-100: Agent-Ready (excellent support, agents can easily complete tasks)

Always respond with valid JSON matching the specified structure.`;

  const response = await client.chat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt }
  ]);
  
  // Parse response
  let jsonStr = response.trim();
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  const parsed = JSON.parse(jsonStr);
  
  return {
    score: parsed.score,
    frictionPoints: parsed.frictionPoints || [],
    riskLevel: parsed.riskLevel,
    summary: parsed.summary,
    recommendations: parsed.recommendations || [],
    intentTriggers: parsed.intentTriggers || [],
  };
}

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
    
    // Step 1: Fetch HTML
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
    const dom = cheerio.load(html);
    
    // Step 2: Discover protocols
    console.log('[AUX Audit] Discovering protocols...');
    const protocolEngine = new ProtocolDiscoveryEngine();
    const protocols = await protocolEngine.discoverProtocols(url);
    
    // Step 3: Analyze semantic affordance
    console.log('[AUX Audit] Analyzing semantic affordance...');
    const semanticAnalyzer = new SemanticAffordanceAnalyzer();
    const semanticAnalysis = await semanticAnalyzer.analyzeHTML(html);
    
    // Step 4: Detect friction
    console.log('[AUX Audit] Detecting friction...');
    const frictionAnalyzer = new FrictionAnalyzer();
    const frictionPoints = await frictionAnalyzer.detectFriction(html, dom);
    
    // Step 5: Prepare scraped data
    const scrapedData: ScrapedData = {
      ariaScore: semanticAnalysis.ariaScore,
      protocols,
      interactiveElements: semanticAnalysis.interactiveElements,
      frictionPoints,
      forms: []
    };
    
    // Step 6: LLM analysis
    console.log('[AUX Audit] Performing LLM analysis...');
    const llmAnalysis = await performLLMAnalysis(scrapedData);
    
    // Step 7: Calculate final score
    const finalScore = calculateAUXScore(scrapedData, llmAnalysis);
    const classification = classifyScore(finalScore);
    
    // Step 8: Generate recommendations
    console.log('[AUX Audit] Generating recommendations...');
    const recommendationEngine = new RecommendationEngine();
    const tempResults: AUXAuditResults = {
      score: finalScore,
      classification,
      protocols,
      ariaScore: semanticAnalysis.ariaScore,
      interactiveElements: semanticAnalysis.interactiveElements,
      frictionPoints,
      recommendations: [],
      intentTriggers: llmAnalysis.intentTriggers,
      summary: llmAnalysis.summary,
      riskLevel: llmAnalysis.riskLevel,
      analyzedAt: new Date().toISOString()
    };
    const recommendations = recommendationEngine.generateRecommendations(tempResults);
    
    // Step 9: Build final results
    const results: AUXAuditResults = {
      score: finalScore,
      classification,
      protocols,
      ariaScore: semanticAnalysis.ariaScore,
      interactiveElements: semanticAnalysis.interactiveElements,
      frictionPoints,
      recommendations,
      intentTriggers: llmAnalysis.intentTriggers,
      summary: llmAnalysis.summary,
      riskLevel: llmAnalysis.riskLevel,
      analyzedAt: new Date().toISOString()
    };
    
    console.log('[AUX Audit] Analysis complete. Score:', finalScore);
    return res.status(200).json(results);
    
  } catch (error) {
    console.error('[AUX Audit] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
