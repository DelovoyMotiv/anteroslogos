/**
 * AUX Audit API Endpoint
 * 
 * POST /api/audit/aux-audit
 * Analyzes a website's actionability for autonomous AI agents
 * 
 * Note: File renamed from aux.ts to aux-audit.ts because "aux" is a reserved
 * device name in Windows (legacy from MS-DOS for auxiliary port)
 * 
 * Requirements:
 * - 6.1: POST endpoint at /api/audit/aux-audit
 * - 6.2: Accept JSON body with "url" field
 * - 6.3: Return 400 for invalid URLs
 * - 6.4: Return 200 with analysis results on success
 * - 6.5: Complete within 15 seconds or timeout
 * - 13.5: Per-IP rate limiting
 * - 14.1-14.5: Comprehensive error handling
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import type { AUXAuditRequest, AUXAuditResults, ScrapedData, FormElement } from '../../lib/auxAudit/types';
import { validateAndSanitizeUrl } from '../../utils/urlValidator';
import { ProtocolDiscoveryEngine } from '../../lib/auxAudit/ProtocolDiscoveryEngine';
import { SemanticAffordanceAnalyzer } from '../../lib/auxAudit/SemanticAffordanceAnalyzer';
import { FrictionAnalyzer } from '../../lib/auxAudit/FrictionAnalyzer';
import { LLMReasoningService } from '../../lib/auxAudit/LLMReasoningService';
import { calculateAUXScore, classifyScore } from '../../lib/auxAudit/scoringUtils';
import { RecommendationEngine } from '../../lib/auxAudit/RecommendationEngine';
import { withRateLimit } from '../../lib/middleware/rateLimiter';
import { 
  validateAUXAuditRequest, 
  validateAUXAuditResults,
  deserializeAUXAuditRequest 
} from '../../lib/auxAudit/serialization';

const TIMEOUT_MS = 15000;

function generateRequestId(): string {
  return `aux_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function logError(requestId: string, context: string, error: unknown): void {
  console.error(`[AUX Audit] [${requestId}] ${context}:`, error);
}

function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing');
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function extractUserId(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const token = authHeader.substring(7);
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.sub || null;
  } catch {
    return null;
  }
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    urlObj.pathname = urlObj.pathname.replace(/\/$/, '') || '/';
    urlObj.search = Array.from(urlObj.searchParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    return urlObj.toString();
  } catch {
    return url;
  }
}

async function saveAuditToDatabase(
  results: AUXAuditResults,
  url: string,
  userId: string | null,
  durationMs: number,
  ipAddress: string | null,
  userAgent: string | null,
  requestId: string
): Promise<void> {
  try {
    const supabase = createServerSupabaseClient();
    const normalizedUrl = normalizeUrl(url);
    const domain = extractDomain(url);
    
    const { error } = await supabase.from('aux_audits').insert({
      user_id: userId,
      url,
      normalized_url: normalizedUrl,
      domain,
      analyzed_at: results.analyzedAt,
      aux_score: results.score,
      classification: results.classification,
      aria_score: results.ariaScore,
      risk_level: results.riskLevel,
      protocols: results.protocols as any,
      interactive_elements: results.interactiveElements as any,
      friction_points: results.frictionPoints as any,
      recommendations: results.recommendations as any,
      intent_triggers: results.intentTriggers as any,
      summary: results.summary,
      duration_ms: durationMs,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
    
    if (error) {
      console.error(`[AUX Audit] [${requestId}] Database save error:`, error);
    } else {
      console.log(`[AUX Audit] [${requestId}] Results saved to database`);
    }
  } catch (error) {
    console.error(`[AUX Audit] [${requestId}] Database save exception:`, error);
  }
}

async function fetchHTML(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AUX-Audit-Bot/1.0 (Agent Experience Analyzer)',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    return html;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout while fetching HTML');
      }
      throw error;
    }
    throw new Error('Unknown error while fetching HTML');
  }
}

function extractForms(dom: cheerio.CheerioAPI): FormElement[] {
  const forms: FormElement[] = [];
  
  dom('form').each((index, element) => {
    const $form = dom(element);
    const action = $form.attr('action');
    const method = $form.attr('method')?.toUpperCase() || 'GET';
    
    const inputs: any[] = [];
    $form.find('input, select, textarea').each((_, input) => {
      const $input = dom(input);
      inputs.push({
        tag: input.tagName,
        selector: `form:nth-of-type(${index + 1}) ${input.tagName}`,
        hasAriaLabel: !!$input.attr('aria-label'),
        ariaLabel: $input.attr('aria-label'),
        role: $input.attr('role'),
        text: $input.text().trim() || undefined,
        type: $input.attr('type'),
      });
    });
    
    forms.push({
      selector: `form:nth-of-type(${index + 1})`,
      action,
      method,
      inputs,
    });
  });
  
  return forms;
}

async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
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
      code: 'INVALID_URL',
      details: 'Only POST requests are accepted',
      timestamp: new Date().toISOString(),
      requestId,
    });
    return;
  }
  
  try {
    let requestBody: AUXAuditRequest;
    
    try {
      if (typeof req.body === 'string') {
        const deserializeResult = deserializeAUXAuditRequest(req.body);
        if (!deserializeResult.success) {
          logError(requestId, 'Request deserialization error', deserializeResult.error);
          res.status(400).json({
            error: 'Invalid JSON in request body',
            code: 'SERIALIZATION_ERROR',
            details: deserializeResult.error,
            timestamp: new Date().toISOString(),
            requestId,
          });
          return;
        }
        requestBody = deserializeResult.data!;
      } else {
        const validationResult = validateAUXAuditRequest(req.body);
        if (!validationResult.success) {
          logError(requestId, 'Request validation error', validationResult.error);
          const isMissingUrl = !req.body || !req.body.url;
          res.status(400).json({
            error: isMissingUrl ? 'Missing required field: url' : 'Invalid request format',
            code: isMissingUrl ? 'INVALID_URL' : 'SERIALIZATION_ERROR',
            details: validationResult.error,
            timestamp: new Date().toISOString(),
            requestId,
          });
          return;
        }
        requestBody = validationResult.data!;
      }
    } catch (error) {
      logError(requestId, 'JSON parse error', error);
      res.status(400).json({
        error: 'Invalid JSON in request body',
        code: 'SERIALIZATION_ERROR',
        details: 'Request body must be valid JSON',
        timestamp: new Date().toISOString(),
        requestId,
      });
      return;
    }
    
    const validation = validateAndSanitizeUrl(requestBody.url);
    
    if (!validation.isValid) {
      res.status(400).json({
        error: validation.error || 'Invalid URL',
        code: 'INVALID_URL',
        details: validation.error,
        timestamp: new Date().toISOString(),
        requestId,
      });
      return;
    }
    
    const sanitizedUrl = validation.sanitizedUrl!;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Analysis timeout'));
      }, TIMEOUT_MS);
    });
    
    const analysisPromise = performAnalysis(sanitizedUrl, requestId);
    
    try {
      const results = await Promise.race([analysisPromise, timeoutPromise]);
      
      const validationResult = validateAUXAuditResults(results);
      if (!validationResult.success) {
        logError(requestId, 'Results validation error', validationResult.error);
        res.status(500).json({
          error: 'Failed to serialize results',
          code: 'SERIALIZATION_ERROR',
          details: validationResult.error,
          timestamp: new Date().toISOString(),
          requestId,
        });
        return;
      }
      
      const duration = Date.now() - startTime;
      
      const userId = extractUserId(req);
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                       (req.headers['x-real-ip'] as string) || 
                       null;
      const userAgent = req.headers['user-agent'] || null;
      
      saveAuditToDatabase(
        results,
        sanitizedUrl,
        userId,
        duration,
        ipAddress,
        userAgent,
        requestId
      ).catch(() => {});
      
      res.status(200).json(validationResult.data);
      
      console.log(`[AUX Audit] [${requestId}] Success in ${duration}ms`);
    } catch (error) {
      if (error instanceof Error && error.message === 'Analysis timeout') {
        logError(requestId, 'Timeout', error);
        res.status(504).json({
          error: 'Analysis timeout',
          code: 'TIMEOUT',
          details: 'Analysis exceeded 15 second limit',
          timestamp: new Date().toISOString(),
          requestId,
        });
        return;
      }
      throw error;
    }
  } catch (error) {
    logError(requestId, 'Unhandled error', error);
    
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('fetch') || 
          errorMessage.includes('network') || 
          errorMessage.includes('enotfound') ||
          errorMessage.includes('econnrefused')) {
        res.status(502).json({
          error: 'Unable to reach URL',
          code: 'FETCH_FAILED',
          details: 'The target URL could not be reached. Please check the URL and try again.',
          timestamp: new Date().toISOString(),
          requestId,
        });
        return;
      }
      
      if (errorMessage.includes('http')) {
        res.status(502).json({
          error: 'HTTP error',
          code: 'FETCH_FAILED',
          details: error.message,
          timestamp: new Date().toISOString(),
          requestId,
        });
        return;
      }
      
      if (errorMessage.includes('parse') || errorMessage.includes('html')) {
        res.status(500).json({
          error: 'Failed to parse HTML',
          code: 'PARSE_ERROR',
          details: 'The HTML content could not be parsed',
          timestamp: new Date().toISOString(),
          requestId,
        });
        return;
      }
      
      if (errorMessage.includes('llm') || errorMessage.includes('openrouter')) {
        res.status(503).json({
          error: 'LLM service unavailable',
          code: 'LLM_ERROR',
          details: 'The AI analysis service is temporarily unavailable',
          timestamp: new Date().toISOString(),
          requestId,
        });
        return;
      }
    }
    
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
}

// Temporarily export without rate limiting for debugging
export default handler;

// TODO: Re-enable rate limiting after debugging
// export default withRateLimit(handler, {
//   skip: (req) => req.method === 'OPTIONS',
// });

async function performAnalysis(url: string, requestId: string): Promise<AUXAuditResults> {
  console.log(`[AUX Audit] [${requestId}] Starting analysis for: ${url}`);
  
  const protocolEngine = new ProtocolDiscoveryEngine();
  const semanticAnalyzer = new SemanticAffordanceAnalyzer();
  const frictionAnalyzer = new FrictionAnalyzer();
  const llmService = new LLMReasoningService();
  const recommendationEngine = new RecommendationEngine();
  
  console.log(`[AUX Audit] [${requestId}] Fetching HTML...`);
  const html = await fetchHTML(url, 10000);
  
  console.log(`[AUX Audit] [${requestId}] Parsing HTML...`);
  const dom = cheerio.load(html);
  
  console.log(`[AUX Audit] [${requestId}] Running analysis engines...`);
  const [protocols, semanticAnalysis, frictionPoints] = await Promise.all([
    protocolEngine.discoverProtocols(url),
    semanticAnalyzer.analyzeHTML(html),
    frictionAnalyzer.detectFriction(html, dom),
  ]);
  
  console.log(`[AUX Audit] [${requestId}] Extracting forms...`);
  const forms = extractForms(dom);
  
  const scrapedData: ScrapedData = {
    ariaScore: semanticAnalysis.ariaScore,
    protocols,
    interactiveElements: semanticAnalysis.interactiveElements,
    frictionPoints,
    forms,
  };
  
  console.log(`[AUX Audit] [${requestId}] Requesting LLM analysis...`);
  const llmAnalysis = await llmService.analyzeAUX(scrapedData);
  
  console.log(`[AUX Audit] [${requestId}] Calculating AUX score...`);
  const finalScore = calculateAUXScore(scrapedData, llmAnalysis);
  const classification = classifyScore(finalScore);
  
  const preliminaryResults: AUXAuditResults = {
    score: finalScore,
    classification,
    protocols,
    ariaScore: semanticAnalysis.ariaScore,
    interactiveElements: semanticAnalysis.interactiveElements,
    frictionPoints,
    recommendations: llmAnalysis.recommendations,
    intentTriggers: llmAnalysis.intentTriggers,
    summary: llmAnalysis.summary,
    riskLevel: llmAnalysis.riskLevel,
    analyzedAt: new Date().toISOString(),
  };
  
  console.log(`[AUX Audit] [${requestId}] Generating recommendations...`);
  const additionalRecommendations = recommendationEngine.generateRecommendations(preliminaryResults);
  
  const allRecommendations = [
    ...llmAnalysis.recommendations,
    ...additionalRecommendations,
  ];
  
  const uniqueRecommendations = Array.from(
    new Map(allRecommendations.map(rec => [rec.title, rec])).values()
  );
  
  const sortedRecommendations = uniqueRecommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.impact - a.impact;
  });
  
  const finalResults: AUXAuditResults = {
    ...preliminaryResults,
    recommendations: sortedRecommendations,
  };
  
  console.log(`[AUX Audit] [${requestId}] Analysis complete. Score: ${finalScore}`);
  
  return finalResults;
}
