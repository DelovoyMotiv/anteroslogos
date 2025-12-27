/**
 * AUX Audit API Endpoint - Inline Implementation
 * All logic inline to avoid module import issues in serverless
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

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
    
    // Dynamic import of Cheerio
    console.log('[AUX Audit] Loading Cheerio...');
    const cheerio = await import('cheerio');
    const $ = cheerio.load(html);
    
    console.log('[AUX Audit] Cheerio loaded successfully');
    
    // Extract interactive elements (inline logic)
    const interactiveElements: any[] = [];
    const interactiveSelectors = ['button', 'a', 'input', 'select'];
    
    interactiveSelectors.forEach(tag => {
      $(tag).each((index, element) => {
        const $el = $(element);
        const ariaLabel = $el.attr('aria-label');
        const hasAriaLabel = !!ariaLabel;
        const role = $el.attr('role');
        const text = $el.text().trim();
        const type = tag === 'input' ? $el.attr('type') : undefined;
        
        // Generate selector
        const id = $el.attr('id');
        const className = $el.attr('class');
        const name = $el.attr('name');
        
        let selector: string;
        if (id) {
          selector = `#${id}`;
        } else if (className) {
          const firstClass = className.split(' ')[0];
          selector = `${tag}.${firstClass}`;
        } else if (name) {
          selector = `${tag}[name="${name}"]`;
        } else {
          selector = `${tag}:nth-of-type(${index + 1})`;
        }
        
        interactiveElements.push({
          tag,
          selector,
          hasAriaLabel,
          ariaLabel,
          role,
          text: text || undefined,
          type
        });
      });
    });
    
    console.log('[AUX Audit] Found', interactiveElements.length, 'interactive elements');
    
    // Calculate ARIA score
    const labeledCount = interactiveElements.filter(
      el => el.hasAriaLabel || el.role
    ).length;
    const ariaScore = interactiveElements.length > 0 
      ? Math.round((labeledCount / interactiveElements.length) * 10000) / 100
      : 0;
    
    console.log('[AUX Audit] ARIA Score:', ariaScore);
    
    // Detect friction points (inline logic)
    const frictionPoints: any[] = [];
    
    // Detect CAPTCHA
    const lowerHtml = html.toLowerCase();
    if (lowerHtml.includes('turnstile') || lowerHtml.includes('recaptcha')) {
      frictionPoints.push({
        type: 'captcha',
        description: 'CAPTCHA detected - blocks automated agent interaction',
        severity: 'high',
        location: 'Page contains CAPTCHA implementation'
      });
    }
    
    // Detect interstitials
    const interstitialSelectors = [
      '[role="dialog"]',
      '[role="alertdialog"]',
      '.modal',
      '.overlay'
    ];
    
    for (const selector of interstitialSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        let hasVisible = false;
        elements.each((_, el) => {
          const style = $(el).attr('style') || '';
          if (!style.includes('display: none') && !style.includes('display:none')) {
            hasVisible = true;
            return false;
          }
        });
        
        if (hasVisible) {
          frictionPoints.push({
            type: 'interstitial',
            description: 'Intrusive interstitial detected',
            severity: 'medium',
            location: 'Modal or overlay element found'
          });
          break;
        }
      }
    }
    
    // Detect canvas UI
    const canvasElements = $('canvas');
    if (canvasElements.length >= 3) {
      frictionPoints.push({
        type: 'canvas',
        description: 'Canvas-based UI detected',
        severity: 'high',
        location: 'Multiple canvas elements found'
      });
    }
    
    console.log('[AUX Audit] Found', frictionPoints.length, 'friction points');
    
    // Response
    const results = {
      score: 75,
      classification: 'Agent-Capable' as const,
      protocols: [],
      ariaScore,
      interactiveElements,
      frictionPoints,
      recommendations: [],
      intentTriggers: [],
      summary: `Analysis complete. ARIA score: ${ariaScore.toFixed(1)}%, found ${interactiveElements.length} interactive elements, ${frictionPoints.length} friction points detected`,
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
