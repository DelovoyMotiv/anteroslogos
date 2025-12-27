/**
 * AUX Audit API Endpoint - Complete Inline Implementation
 * All logic inline to avoid module import issues in serverless
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Helper function to get env var
function getEnvVar(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
}

// Helper function to normalize URL
function normalizeUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
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
    
    // Dynamic import of Cheerio
    console.log('[AUX Audit] Loading Cheerio...');
    const cheerio = await import('cheerio');
    const $ = cheerio.load(html);
    
    console.log('[AUX Audit] Cheerio loaded successfully');
    
    // ========================================================================
    // SEMANTIC ANALYSIS - Extract interactive elements
    // ========================================================================
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
    
    // ========================================================================
    // FRICTION DETECTION
    // ========================================================================
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
    
    // ========================================================================
    // PROTOCOL DISCOVERY
    // ========================================================================
    console.log('[AUX Audit] Starting protocol discovery...');
    const protocols: any[] = [];
    const baseUrl = normalizeUrl(url);
    
    const protocolPaths = [
      { name: 'agents.json', path: '/agents.json' },
      { name: 'ai-plugin.json', path: '/.well-known/ai-plugin.json' },
      { name: 'mcp.json', path: '/.well-known/mcp.json' }
    ];
    
    // Check protocols in parallel
    const protocolChecks = protocolPaths.map(async ({ name, path }) => {
      try {
        const fullUrl = new URL(path, baseUrl).toString();
        const response = await fetch(fullUrl, {
          method: 'HEAD',
          headers: { 'User-Agent': 'AUX-Audit-Bot/1.0' },
          signal: AbortSignal.timeout(5000)
        });
        
        const available = response.ok || response.status === 304;
        
        return {
          name,
          available,
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
    
    // Check robots.txt
    const robotsCheck = async () => {
      try {
        const robotsUrl = new URL('/robots.txt', baseUrl).toString();
        const response = await fetch(robotsUrl, {
          headers: { 'User-Agent': 'AUX-Audit-Bot/1.0' },
          signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) {
          return {
            name: 'robots.txt',
            available: true, // Default to allowed
            url: robotsUrl
          };
        }
        
        const content = await response.text();
        const lines = content.split('\n').map(line => line.trim());
        
        let allowsOAI = true;
        let allowsCCBot = true;
        let currentUserAgent: string | null = null;
        
        for (const line of lines) {
          if (line.startsWith('#') || line === '') continue;
          
          if (line.toLowerCase().startsWith('user-agent:')) {
            currentUserAgent = line.substring(11).trim().toLowerCase();
          } else if (line.toLowerCase().startsWith('disallow:') && currentUserAgent) {
            const disallowPath = line.substring(9).trim();
            
            if (currentUserAgent === 'oai-searchbot' || currentUserAgent === '*') {
              if (disallowPath === '/' || disallowPath === '') {
                allowsOAI = false;
              }
            }
            
            if (currentUserAgent === 'ccbot' || currentUserAgent === '*') {
              if (disallowPath === '/' || disallowPath === '') {
                allowsCCBot = false;
              }
            }
          }
        }
        
        return {
          name: 'robots.txt',
          available: allowsOAI || allowsCCBot,
          url: robotsUrl
        };
      } catch {
        return {
          name: 'robots.txt',
          available: true,
          url: new URL('/robots.txt', baseUrl).toString()
        };
      }
    };
    
    const allProtocols = await Promise.all([...protocolChecks, robotsCheck()]);
    protocols.push(...allProtocols);
    
    console.log('[AUX Audit] Protocol discovery complete:', protocols.length, 'protocols checked');
    
    // ========================================================================
    // LLM ANALYSIS (Optional - only if API key available)
    // ========================================================================
    let recommendations: any[] = [];
    let intentTriggers: any[] = [];
    let llmSummary = '';
    
    const openRouterKey = getEnvVar('OPENROUTER_API_KEY');
    
    if (openRouterKey) {
      console.log('[AUX Audit] Running LLM analysis...');
      
      try {
        const prompt = `Analyze this website for AI agent actionability:

ARIA Score: ${ariaScore}%
Interactive Elements: ${interactiveElements.length}
Friction Points: ${frictionPoints.length}
Protocols Available: ${protocols.filter(p => p.available).length}

Sample Interactive Elements (first 10):
${interactiveElements.slice(0, 10).map(el => `- ${el.tag}: "${el.text || el.ariaLabel || 'no label'}" (${el.selector})`).join('\n')}

Friction Points:
${frictionPoints.map(fp => `- ${fp.type}: ${fp.description}`).join('\n') || 'None detected'}

Provide:
1. Top 3 recommendations to improve agent actionability (title, description, priority: low/medium/high, impact: 0-100)
2. Top 3 detected intent triggers (intent name, selector, confidence: low/medium/high)
3. Brief summary (2-3 sentences)

Format as JSON:
{
  "recommendations": [{"title": "...", "description": "...", "priority": "high", "impact": 25}],
  "intentTriggers": [{"intent": "search", "selector": "input[type=search]", "confidence": "high"}],
  "summary": "..."
}`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://anoteroslogos.com',
            'X-Title': 'AUX Audit LLM Analysis',
          },
          body: JSON.stringify({
            model: 'anthropic/claude-3.5-sonnet',
            messages: [
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 1500,
          }),
          signal: AbortSignal.timeout(30000)
        });
        
        if (response.ok) {
          const data = await response.json();
          const content = data.choices[0].message.content;
          
          // Try to parse JSON from response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            recommendations = parsed.recommendations || [];
            intentTriggers = parsed.intentTriggers || [];
            llmSummary = parsed.summary || '';
            
            console.log('[AUX Audit] LLM analysis complete');
          }
        }
      } catch (error) {
        console.error('[AUX Audit] LLM analysis failed:', error);
        // Continue without LLM analysis
      }
    } else {
      console.log('[AUX Audit] Skipping LLM analysis (no API key)');
    }
    
    // ========================================================================
    // CALCULATE FINAL AUX SCORE
    // ========================================================================
    
    // Base score from ARIA
    let finalScore = ariaScore;
    
    // Protocol bonus (+5 per protocol, max +20)
    const protocolBonus = Math.min(protocols.filter(p => p.available).length * 5, 20);
    finalScore += protocolBonus;
    
    // Friction penalty (-10 per high severity, -5 per medium)
    const frictionPenalty = frictionPoints.reduce((sum, fp) => {
      if (fp.severity === 'high') return sum + 10;
      if (fp.severity === 'medium') return sum + 5;
      return sum;
    }, 0);
    finalScore -= frictionPenalty;
    
    // Interactive elements bonus (if > 50 elements, +10)
    if (interactiveElements.length > 50) {
      finalScore += 10;
    }
    
    // Clamp to 0-100
    finalScore = Math.max(0, Math.min(100, Math.round(finalScore)));
    
    // Determine classification
    let classification: 'Agent-Blind' | 'Agent-Capable' | 'Agent-Ready';
    if (finalScore >= 80) {
      classification = 'Agent-Ready';
    } else if (finalScore >= 50) {
      classification = 'Agent-Capable';
    } else {
      classification = 'Agent-Blind';
    }
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high';
    if (frictionPoints.some(fp => fp.severity === 'high')) {
      riskLevel = 'high';
    } else if (frictionPoints.length > 0) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }
    
    console.log('[AUX Audit] Final score:', finalScore, 'Classification:', classification);
    
    // ========================================================================
    // BUILD RESPONSE
    // ========================================================================
    
    const summary = llmSummary || 
      `Analysis complete. ARIA score: ${ariaScore.toFixed(1)}%, found ${interactiveElements.length} interactive elements, ${frictionPoints.length} friction points detected, ${protocols.filter(p => p.available).length} protocols available.`;
    
    const results = {
      score: finalScore,
      classification,
      protocols,
      ariaScore,
      interactiveElements,
      frictionPoints,
      recommendations,
      intentTriggers,
      summary,
      riskLevel,
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
