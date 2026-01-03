/**
 * AUX Audit API Endpoint - Complete Inline Implementation
 * All logic inline to avoid module import issues in serverless
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// ============================================================================
// VERCEL FUNCTION CONFIGURATION
// ============================================================================

/**
 * Vercel function configuration for browser scraping
 * **Validates: Requirements 8.1, 8.2, 8.3**
 */
export const config = {
  maxDuration: 60,        // 60 seconds for Playwright browser rendering
  memory: 1024,           // 1GB for Chromium and page analysis
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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
  
  // Add timeout protection
  const timeoutId = setTimeout(() => {
    console.error('[AUX Audit] Function timeout - taking too long');
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      res.status(504).json({
        error: 'Request timeout',
        code: 'TIMEOUT',
        message: 'Analysis took too long. Try a simpler page or try again later.'
      });
    }
  }, 9000); // 9 seconds (before Vercel's 10s limit)
  
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
    
    // Fetch HTML with shorter timeout
    console.log('[AUX Audit] Fetching HTML...');
    const htmlResponse = await fetch(url, {
      headers: {
        'User-Agent': 'AUX-Audit-Bot/1.0'
      },
      signal: AbortSignal.timeout(5000) // Reduced from 10s to 5s
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
    
    // Semantic HTML tags
    const interactiveSelectors = ['button', 'a', 'input', 'select', 'textarea'];
    
    console.log('[AUX Audit] Starting interactive elements parsing...');
    console.log('[AUX Audit] HTML length:', html.length);
    console.log('[AUX Audit] HTML preview:', html.substring(0, 500));
    const rootHtml = $.root().html();
    console.log('[AUX Audit] Cheerio root element:', rootHtml ? rootHtml.substring(0, 200) : 'null');
    
    interactiveSelectors.forEach(tag => {
      const elements = $(tag);
      console.log(`[AUX Audit] Found ${elements.length} <${tag}> elements`);
      
      elements.each((index, element) => {
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
        
        // Log first few elements for debugging
        if (index < 3) {
          console.log(`[AUX Audit] Element ${index}:`, { tag, selector, text: text.substring(0, 50), hasAriaLabel });
        }
      });
    });
    
    // ARIA roles that indicate interactive elements
    const interactiveRoles = [
      'button', 'link', 'menuitem', 'tab', 'checkbox', 'radio', 
      'textbox', 'searchbox', 'combobox', 'slider', 'spinbutton',
      'switch', 'option', 'menuitemcheckbox', 'menuitemradio'
    ];
    
    interactiveRoles.forEach(roleValue => {
      $(`[role="${roleValue}"]`).each((index, element) => {
        const $el = $(element);
        const tag = element.tagName?.toLowerCase() || 'div';
        
        // Skip if already counted as semantic element
        if (interactiveSelectors.includes(tag)) {
          return;
        }
        
        const ariaLabel = $el.attr('aria-label');
        const hasAriaLabel = !!ariaLabel;
        const text = $el.text().trim();
        const id = $el.attr('id');
        const className = $el.attr('class');
        
        let selector: string;
        if (id) {
          selector = `#${id}`;
        } else if (className) {
          const firstClass = className.split(' ')[0];
          selector = `${tag}.${firstClass}[role="${roleValue}"]`;
        } else {
          selector = `${tag}[role="${roleValue}"]:nth-of-type(${index + 1})`;
        }
        
        interactiveElements.push({
          tag,
          selector,
          hasAriaLabel,
          ariaLabel,
          role: roleValue,
          text: text || undefined,
          type: undefined
        });
      });
    });
    
    // Elements with tabindex (focusable elements)
    $('[tabindex]').each((index, element) => {
      const $el = $(element);
      const tag = element.tagName?.toLowerCase() || 'div';
      const tabindex = $el.attr('tabindex');
      
      // Skip if already counted
      if (interactiveSelectors.includes(tag)) {
        return;
      }
      
      // Skip if has role (already counted above)
      if ($el.attr('role')) {
        return;
      }
      
      // Only count positive or zero tabindex (negative means programmatically focusable only)
      const tabindexNum = parseInt(tabindex || '-1', 10);
      if (tabindexNum < 0) {
        return;
      }
      
      const ariaLabel = $el.attr('aria-label');
      const hasAriaLabel = !!ariaLabel;
      const text = $el.text().trim();
      const id = $el.attr('id');
      const className = $el.attr('class');
      
      let selector: string;
      if (id) {
        selector = `#${id}`;
      } else if (className) {
        const firstClass = className.split(' ')[0];
        selector = `${tag}.${firstClass}[tabindex="${tabindex}"]`;
      } else {
        selector = `${tag}[tabindex="${tabindex}"]:nth-of-type(${index + 1})`;
      }
      
      interactiveElements.push({
        tag,
        selector,
        hasAriaLabel,
        ariaLabel,
        role: undefined,
        text: text || undefined,
        type: undefined
      });
    });
    
    console.log('[AUX Audit] Total interactive elements found:', interactiveElements.length);
    console.log('[AUX Audit] Breakdown by tag:', {
      button: interactiveElements.filter(el => el.tag === 'button').length,
      a: interactiveElements.filter(el => el.tag === 'a').length,
      input: interactiveElements.filter(el => el.tag === 'input').length,
      select: interactiveElements.filter(el => el.tag === 'select').length,
      textarea: interactiveElements.filter(el => el.tag === 'textarea').length,
      withRole: interactiveElements.filter(el => el.role).length,
      withTabindex: interactiveElements.filter(el => !interactiveSelectors.includes(el.tag) && !el.role).length
    });
    
    // ========================================================================
    // FALLBACK: Use Playwright if Cheerio found nothing (JS-rendered sites)
    // ========================================================================
    // TEMPORARILY DISABLED: Playwright has issues in Vercel serverless
    // Will re-enable after testing with proper configuration
    /*
    if (interactiveElements.length === 0) {
      console.log('[AUX Audit] No elements found with Cheerio, trying Playwright for JS-rendered content...');
      
      try {
        // Use playwright-core + @sparticuz/chromium for serverless compatibility
        const playwright = await import('playwright-core');
        const chromium = await import('@sparticuz/chromium');
        
        console.log('[AUX Audit] Launching Chromium...');
        
        const browser = await playwright.chromium.launch({
          args: chromium.default.args,
          executablePath: await chromium.default.executablePath(),
          headless: true,
        });
        
        const context = await browser.newContext({
          userAgent: 'AUX-Audit-Bot/1.0'
        });
        const page = await context.newPage();
        
        console.log('[AUX Audit] Navigating to URL...');
        
        // Navigate and wait for network idle
        await page.goto(url, { 
          waitUntil: 'networkidle',
          timeout: 15000 
        });
        
        console.log('[AUX Audit] Playwright page loaded, extracting elements...');
        
        // Extract interactive elements using page.evaluate
        const playwrightElements = await page.evaluate(() => {
          const elements: any[] = [];
          
          // Semantic HTML tags
          const selectors = ['button', 'a', 'input', 'select', 'textarea'];
          
          selectors.forEach(tag => {
            document.querySelectorAll(tag).forEach((el, index) => {
              const element = el as HTMLElement;
              const ariaLabel = element.getAttribute('aria-label');
              const role = element.getAttribute('role');
              const text = element.textContent?.trim() || '';
              const type = tag === 'input' ? (element as HTMLInputElement).type : undefined;
              
              // Generate selector
              const id = element.id;
              const className = element.className;
              const name = (element as any).name;
              
              let selector: string;
              if (id) {
                selector = `#${id}`;
              } else if (className && typeof className === 'string') {
                const firstClass = className.split(' ')[0];
                selector = `${tag}.${firstClass}`;
              } else if (name) {
                selector = `${tag}[name="${name}"]`;
              } else {
                selector = `${tag}:nth-of-type(${index + 1})`;
              }
              
              elements.push({
                tag,
                selector,
                hasAriaLabel: !!ariaLabel,
                ariaLabel: ariaLabel || undefined,
                role: role || undefined,
                text: text || undefined,
                type
              });
            });
          });
          
          // ARIA roles
          const interactiveRoles = [
            'button', 'link', 'menuitem', 'tab', 'checkbox', 'radio', 
            'textbox', 'searchbox', 'combobox', 'slider', 'spinbutton',
            'switch', 'option', 'menuitemcheckbox', 'menuitemradio'
          ];
          
          interactiveRoles.forEach(roleValue => {
            document.querySelectorAll(`[role="${roleValue}"]`).forEach((el, index) => {
              const element = el as HTMLElement;
              const tag = element.tagName.toLowerCase();
              
              // Skip if already counted
              if (selectors.includes(tag)) return;
              
              const ariaLabel = element.getAttribute('aria-label');
              const text = element.textContent?.trim() || '';
              const id = element.id;
              const className = element.className;
              
              let selector: string;
              if (id) {
                selector = `#${id}`;
              } else if (className && typeof className === 'string') {
                const firstClass = className.split(' ')[0];
                selector = `${tag}.${firstClass}[role="${roleValue}"]`;
              } else {
                selector = `${tag}[role="${roleValue}"]:nth-of-type(${index + 1})`;
              }
              
              elements.push({
                tag,
                selector,
                hasAriaLabel: !!ariaLabel,
                ariaLabel: ariaLabel || undefined,
                role: roleValue,
                text: text || undefined,
                type: undefined
              });
            });
          });
          
          // Tabindex elements
          document.querySelectorAll('[tabindex]').forEach((el, index) => {
            const element = el as HTMLElement;
            const tag = element.tagName.toLowerCase();
            const tabindex = element.getAttribute('tabindex');
            
            // Skip if already counted
            if (selectors.includes(tag)) return;
            if (element.getAttribute('role')) return;
            
            const tabindexNum = parseInt(tabindex || '-1', 10);
            if (tabindexNum < 0) return;
            
            const ariaLabel = element.getAttribute('aria-label');
            const text = element.textContent?.trim() || '';
            const id = element.id;
            const className = element.className;
            
            let selector: string;
            if (id) {
              selector = `#${id}`;
            } else if (className && typeof className === 'string') {
              const firstClass = className.split(' ')[0];
              selector = `${tag}.${firstClass}[tabindex="${tabindex}"]`;
            } else {
              selector = `${tag}[tabindex="${tabindex}"]:nth-of-type(${index + 1})`;
            }
            
            elements.push({
              tag,
              selector,
              hasAriaLabel: !!ariaLabel,
              ariaLabel: ariaLabel || undefined,
              role: undefined,
              text: text || undefined,
              type: undefined
            });
          });
          
          return elements;
        });
        
        await browser.close();
        
        console.log('[AUX Audit] Playwright found', playwrightElements.length, 'interactive elements');
        interactiveElements.push(...playwrightElements);
        
      } catch (playwrightError) {
        console.error('[AUX Audit] Playwright fallback failed:', playwrightError);
        // Continue with empty array - will show in recommendations
      }
    }
    */
    
    console.log('[AUX Audit] Note: Playwright fallback temporarily disabled for serverless compatibility');
    
    console.log('[AUX Audit] Final interactive elements count:', interactiveElements.length);
    
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
      { name: 'agents.json', paths: ['/agents.json'] },
      { name: 'ai-plugin.json', paths: ['/.well-known/ai-plugin.json'] },
      { name: 'mcp.json', paths: ['/.well-known/mcp.json'] },
      { name: 'AGENTS.md', paths: ['/AGENTS.md', '/.well-known/AGENTS.md'] },
      { name: 'llm.txt', paths: ['/llm.txt', '/.well-known/llm.txt'] }
    ];
    
    // Check protocols in parallel - check multiple paths per protocol
    const protocolChecks = protocolPaths.map(async ({ name, paths }) => {
      // Try each path until we find one that exists
      for (const path of paths) {
        try {
          const fullUrl = new URL(path, baseUrl).toString();
          const response = await fetch(fullUrl, {
            method: 'HEAD',
            headers: { 'User-Agent': 'AUX-Audit-Bot/1.0' },
            signal: AbortSignal.timeout(3000) // Reduced from 5s to 3s
          });
          
          if (response.ok || response.status === 304) {
            return {
              name,
              available: true,
              url: fullUrl
            };
          }
        } catch {
          // Continue to next path
        }
      }
      
      // None of the paths worked
      return {
        name,
        available: false,
        url: new URL(paths[0], baseUrl).toString()
      };
    });
    
    // Check robots.txt
    const robotsCheck = async () => {
      try {
        const robotsUrl = new URL('/robots.txt', baseUrl).toString();
        const response = await fetch(robotsUrl, {
          headers: { 'User-Agent': 'AUX-Audit-Bot/1.0' },
          signal: AbortSignal.timeout(3000) // Reduced from 5s to 3s
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
    // TEMPORARILY DISABLED: LLM calls take too long for Vercel 10s limit
    // ========================================================================
    let recommendations: any[] = [];
    let intentTriggers: any[] = [];
    let llmSummary = '';
    
    const openRouterKey = getEnvVar('OPENROUTER_API_KEY');
    
    // DISABLED: LLM analysis takes 5-15 seconds, exceeds Vercel timeout
    /*
    if (openRouterKey) {
      console.log('[AUX Audit] Running LLM analysis...');
      
      try {
        const prompt = `YOU ARE A TIER-1 AGENTIC INFRASTRUCTURE ARCHITECT. Your goal is to provide engineering-grade solutions, not generic advice.

RULES FOR RECOMMENDATIONS:
1. CAPTCHA/SECURITY: Never suggest simply "removing" security. Instead, suggest:
   - "Implement Trusted Agent Protocol (TAP) with cryptographic signatures"
   - "Whitelist verified AI User-Agents (OAI-SearchBot, ClaudeBot, GoogleBot-AI) in WAF rules"
   - "Use signed JWT tokens in X-Agent-Auth headers for authorized agents"
   - "Implement rate-limited /api/agent endpoints with API key authentication"

2. INTERACTIVE ELEMENTS: If missing, suggest:
   - "Implement agents.json manifest at /.well-known/agents.json"
   - "Expose API endpoints via Model Context Protocol (MCP)"
   - "Add role and aria-label attributes to interactive divs"
   - "Implement Server-Side Rendering (SSR) or static HTML fallback for agent crawlers"

3. PROTOCOLS: If missing, suggest:
   - "Add agents.json with capability declarations"
   - "Implement AGENTS.md with human-readable agent documentation"
   - "Add llm.txt with site context and navigation hints"
   - "Configure robots.txt to allow OAI-SearchBot and ClaudeBot"

4. TONE: Technical, precise, authoritative. No fluff. Focus on 2025-2026 best practices.

ANALYZE THIS WEBSITE FOR AI AGENT ACTIONABILITY:

ARIA Score: ${ariaScore}%
Interactive Elements: ${interactiveElements.length}
Friction Points: ${frictionPoints.length}
Protocols Available: ${protocols.filter(p => p.available).length}

Sample Interactive Elements (first 10):
${interactiveElements.slice(0, 10).map(el => {
  const text = el.text || el.ariaLabel || 'no label';
  const truncatedText = text.length > 100 ? text.substring(0, 100) + '...' : text;
  return `- ${el.tag}: "${truncatedText}" (${el.selector})`;
}).join('\n')}

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
            model: 'kwaipilot/kat-coder-pro:free',
            messages: [
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 1500,
          }),
          signal: AbortSignal.timeout(15000) // Reduced from 30s to 15s
        }).catch(fetchError => {
          console.error('[AUX Audit] LLM fetch error:', fetchError);
          throw fetchError;
        });
        
        console.log('[AUX Audit] LLM response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[AUX Audit] LLM response data:', JSON.stringify(data).substring(0, 500));
          
          const content = data.choices?.[0]?.message?.content;
          
          if (!content) {
            console.error('[AUX Audit] No content in LLM response');
          } else {
            console.log('[AUX Audit] LLM content:', content.substring(0, 300));
            
            // Try to parse JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                const parsed = JSON.parse(jsonMatch[0]);
                recommendations = parsed.recommendations || [];
                
                console.log('[AUX Audit] Parsed recommendations:', recommendations.length);
                
                // Process intentTriggers - add element field
                const rawIntentTriggers = parsed.intentTriggers || [];
                intentTriggers = rawIntentTriggers.map((trigger: any) => {
                  // Find matching interactive element by selector
                  const matchingElement = interactiveElements.find(
                    el => el.selector === trigger.selector
                  );
                  
                  return {
                    intent: trigger.intent || 'unknown',
                    selector: trigger.selector || '',
                    confidence: trigger.confidence || 'low',
                    element: matchingElement || {
                      tag: 'unknown',
                      selector: trigger.selector || '',
                      hasAriaLabel: false,
                      text: undefined
                    }
                  };
                });
                
                console.log('[AUX Audit] Parsed intentTriggers:', intentTriggers.length);
                
                llmSummary = parsed.summary || '';
                
                console.log('[AUX Audit] LLM analysis complete');
              } catch (parseError) {
                console.error('[AUX Audit] Failed to parse JSON from LLM response:', parseError);
              }
            } else {
              console.error('[AUX Audit] No JSON found in LLM response');
            }
          }
        } else {
          const errorText = await response.text();
          console.error('[AUX Audit] LLM API error:', response.status, errorText);
        }
      } catch (error) {
        console.error('[AUX Audit] LLM analysis failed:', error);
        // Continue without LLM analysis
      }
    } else {
      console.log('[AUX Audit] Skipping LLM analysis (no API key)');
    }
    */
    
    console.log('[AUX Audit] LLM analysis disabled for performance - using fallback recommendations');
    
    // ========================================================================
    // FALLBACK RECOMMENDATIONS (if LLM didn't provide any)
    // ========================================================================
    if (recommendations.length === 0) {
      // Generate professional engineering-grade recommendations based on analysis
      
      if (ariaScore < 50) {
        recommendations.push({
          title: 'Implement Semantic HTML and ARIA Attributes',
          description: 'Add role, aria-label, and aria-describedby attributes to interactive elements. Use semantic HTML tags (<button>, <nav>, <form>) instead of generic <div> elements to improve agent discoverability.',
          priority: 'high',
          impact: 40
        });
      }
      
      if (interactiveElements.length === 0) {
        recommendations.push({
          title: 'Add Server-Side Rendering or Static HTML Fallback',
          description: 'Implement SSR (Next.js, Nuxt) or generate static HTML snapshots for agent crawlers. Detect User-Agent headers (OAI-SearchBot, ClaudeBot) and serve pre-rendered content to enable agent interaction with JavaScript-heavy sites.',
          priority: 'high',
          impact: 60
        });
      }
      
      // FIXED: Only recommend protocols if they're actually missing
      const availableProtocols = protocols.filter(p => p.available).length;
      const totalProtocols = protocols.length;
      if (availableProtocols < totalProtocols / 2) {
        recommendations.push({
          title: 'Implement Agent Discovery Protocols',
          description: 'Create /.well-known/agents.json with capability declarations, add /AGENTS.md with human-readable documentation, and configure /llm.txt with site context. Update robots.txt to allow OAI-SearchBot and ClaudeBot.',
          priority: 'medium',
          impact: 30
        });
      }
      
      if (frictionPoints.length > 0) {
        const hasCaptcha = frictionPoints.some(fp => fp.type === 'captcha');
        
        if (hasCaptcha) {
          recommendations.push({
            title: 'Implement Trusted Agent Authentication',
            description: 'Instead of removing CAPTCHA, whitelist verified AI agents in your WAF (Cloudflare, AWS WAF). Use signed JWT tokens in X-Agent-Auth headers or implement rate-limited /api/agent endpoints with API key authentication for authorized agents.',
            priority: 'high',
            impact: 45
          });
        } else {
          recommendations.push({
            title: 'Reduce Agent Friction Points',
            description: 'Provide agent-friendly alternatives to interstitials and canvas-based UI. Implement conditional rendering based on User-Agent detection to serve simplified interfaces to AI agents.',
            priority: 'medium',
            impact: 25
          });
        }
      }
      
      // If still no recommendations, add a generic one
      if (recommendations.length === 0) {
        recommendations.push({
          title: 'Maintain Agent-Friendly Architecture',
          description: 'Continue following web standards, semantic HTML, and accessibility best practices. Consider implementing Model Context Protocol (MCP) endpoints for advanced agent capabilities.',
          priority: 'low',
          impact: 10
        });
      }
    }
    
    // ========================================================================
    // FALLBACK INTENT TRIGGERS (if LLM didn't provide any)
    // ========================================================================
    if (intentTriggers.length === 0 && interactiveElements.length > 0) {
      // Generate basic intent triggers from interactive elements
      const searchElements = interactiveElements.filter(el => 
        el.type === 'search' || 
        (el.text && el.text.toLowerCase().includes('search')) ||
        (el.ariaLabel && el.ariaLabel.toLowerCase().includes('search'))
      );
      
      if (searchElements.length > 0) {
        intentTriggers.push({
          intent: 'search',
          selector: searchElements[0].selector,
          confidence: 'medium',
          element: searchElements[0]
        });
      }
      
      const submitElements = interactiveElements.filter(el => 
        el.type === 'submit' || 
        (el.text && (el.text.toLowerCase().includes('submit') || el.text.toLowerCase().includes('send'))) ||
        (el.tag === 'button' && el.text)
      );
      
      if (submitElements.length > 0) {
        intentTriggers.push({
          intent: 'submit',
          selector: submitElements[0].selector,
          confidence: 'medium',
          element: submitElements[0]
        });
      }
      
      const navigationLinks = interactiveElements.filter(el => 
        el.tag === 'a' && el.text
      );
      
      if (navigationLinks.length > 0) {
        intentTriggers.push({
          intent: 'navigate',
          selector: navigationLinks[0].selector,
          confidence: 'low',
          element: navigationLinks[0]
        });
      }
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
    
    // DEBUGGING: Log counts before sending response
    console.log('[AUX Audit] Interactive elements count:', interactiveElements.length);
    console.log('[AUX Audit] Intent triggers count:', intentTriggers.length);
    console.log('[AUX Audit] Recommendations count:', recommendations.length);
    console.log('[AUX Audit] Protocols available:', protocols.filter(p => p.available).length, '/', protocols.length);
    
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
    
    console.log('[AUX Audit] Sending response with', results.interactiveElements.length, 'interactive elements');
    clearTimeout(timeoutId);
    res.status(200).json(results);
    
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[AUX Audit] Critical error:', error);
    console.error('[AUX Audit] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Ensure we always return JSON, never HTML
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      });
    }
    return;
  }
}
