/**
 * Recommendation Engine
 * 
 * Generates actionable recommendations for improving agent experience (AUX).
 * Analyzes audit results and provides prioritized suggestions with code examples.
 */

import type { AUXAuditResults, Recommendation, ProtocolStatus, FrictionPoint } from './types';

/**
 * RecommendationEngine class
 * 
 * Generates recommendations based on:
 * - Missing agent protocols
 * - Low ARIA density scores
 * - Detected friction points
 * - Overall AUX score
 */
export class RecommendationEngine {
  /**
   * Generates prioritized recommendations based on audit results
   * 
   * @param auditResults - Complete AUX audit results
   * @returns Array of recommendations sorted by priority and impact
   */
  generateRecommendations(auditResults: AUXAuditResults): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Generate protocol-based recommendations
    recommendations.push(...this.generateProtocolRecommendations(auditResults.protocols));
    
    // Generate ARIA-based recommendations
    recommendations.push(...this.generateARIARecommendations(auditResults.ariaScore, auditResults.interactiveElements));
    
    // Generate friction-based recommendations
    recommendations.push(...this.generateFrictionRecommendations(auditResults.frictionPoints));
    
    // Sort by priority (high > medium > low) and then by impact (higher first)
    return this.prioritizeRecommendations(recommendations);
  }

  /**
   * Generates recommendations for missing or incomplete agent protocols
   * 
   * @param protocols - List of protocol statuses
   * @returns Array of protocol-related recommendations
   */
  private generateProtocolRecommendations(protocols: ProtocolStatus[]): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Check for agents.json
    const agentsJson = protocols.find(p => p.name === 'agents.json');
    if (!agentsJson?.available) {
      recommendations.push({
        title: 'Add agents.json manifest',
        description: 'Create an agents.json file to declare your site\'s agent capabilities and endpoints. This helps autonomous agents understand how to interact with your site programmatically.',
        priority: 'high',
        impact: 25,
        codeExample: `{
  "name": "Your Site Name",
  "description": "Brief description of your site",
  "endpoints": {
    "search": "/api/search",
    "actions": "/api/actions"
  },
  "capabilities": ["search", "purchase", "booking"]
}`,
        docLink: 'https://github.com/anthropics/agent-protocol'
      });
    }
    
    // Check for ai-plugin.json
    const aiPlugin = protocols.find(p => p.name === 'ai-plugin.json');
    if (!aiPlugin?.available) {
      recommendations.push({
        title: 'Add OpenAI plugin manifest',
        description: 'Create an ai-plugin.json file in the .well-known directory to enable OpenAI agent integration. This allows ChatGPT and other OpenAI agents to discover and use your API.',
        priority: 'high',
        impact: 20,
        codeExample: `{
  "schema_version": "v1",
  "name_for_human": "Your Site Name",
  "name_for_model": "your_site",
  "description_for_human": "Description for users",
  "description_for_model": "Description for AI models",
  "auth": {
    "type": "none"
  },
  "api": {
    "type": "openapi",
    "url": "https://yoursite.com/openapi.json"
  }
}`,
        docLink: 'https://platform.openai.com/docs/plugins/introduction'
      });
    }
    
    // Check for mcp.json
    const mcpJson = protocols.find(p => p.name === 'mcp.json');
    if (!mcpJson?.available) {
      recommendations.push({
        title: 'Add Model Context Protocol manifest',
        description: 'Create an mcp.json file in the .well-known directory to support the Model Context Protocol. This enables Claude and other MCP-compatible agents to interact with your site.',
        priority: 'medium',
        impact: 15,
        codeExample: `{
  "version": "1.0",
  "name": "Your Site MCP",
  "description": "MCP integration for your site",
  "tools": [
    {
      "name": "search",
      "description": "Search your site",
      "input_schema": {
        "type": "object",
        "properties": {
          "query": { "type": "string" }
        }
      }
    }
  ]
}`,
        docLink: 'https://modelcontextprotocol.io/introduction'
      });
    }
    
    // Check robots.txt for agent-friendly directives
    const robotsTxt = protocols.find(p => p.name === 'robots.txt');
    if (robotsTxt?.available && robotsTxt.content) {
      const { allowsOAI, allowsCCBot } = robotsTxt.content;
      if (!allowsOAI || !allowsCCBot) {
        recommendations.push({
          title: 'Update robots.txt for AI agents',
          description: 'Add explicit allow directives for AI agent crawlers (OAI-SearchBot, CCBot) in your robots.txt file. This signals that your site welcomes agent interaction.',
          priority: 'medium',
          impact: 10,
          codeExample: `User-agent: OAI-SearchBot
Allow: /

User-agent: CCBot
Allow: /

User-agent: *
Disallow: /admin/`,
          docLink: 'https://developers.google.com/search/docs/crawling-indexing/robots/intro'
        });
      }
    }
    
    return recommendations;
  }

  /**
   * Generates recommendations for improving ARIA accessibility
   * 
   * @param ariaScore - Current ARIA density score (0-100)
   * @param interactiveElements - List of interactive elements
   * @returns Array of ARIA-related recommendations
   */
  private generateARIARecommendations(ariaScore: number, interactiveElements: any[]): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Low ARIA score (< 50)
    if (ariaScore < 50) {
      recommendations.push({
        title: 'Add ARIA labels to interactive elements',
        description: `Your ARIA density score is ${ariaScore.toFixed(1)}%. Add aria-label attributes to buttons, links, and form inputs to help agents understand their purpose. Agents rely on semantic labels to identify actionable elements.`,
        priority: 'high',
        impact: 30,
        codeExample: `<!-- Before -->
<button class="btn-primary">Submit</button>

<!-- After -->
<button class="btn-primary" aria-label="Submit contact form">Submit</button>

<!-- For icon buttons -->
<button aria-label="Close dialog">
  <svg>...</svg>
</button>`,
        docLink: 'https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-label'
      });
    }
    // Medium ARIA score (50-80)
    else if (ariaScore < 80) {
      recommendations.push({
        title: 'Improve ARIA coverage',
        description: `Your ARIA density score is ${ariaScore.toFixed(1)}%. While decent, there's room for improvement. Focus on adding semantic labels to remaining unlabeled interactive elements, especially form inputs and icon buttons.`,
        priority: 'medium',
        impact: 15,
        codeExample: `<!-- Add labels to form inputs -->
<input 
  type="email" 
  aria-label="Email address"
  placeholder="Enter your email"
/>

<!-- Use aria-describedby for additional context -->
<input 
  type="password" 
  aria-label="Password"
  aria-describedby="password-requirements"
/>
<span id="password-requirements">
  Must be at least 8 characters
</span>`,
        docLink: 'https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/'
      });
    }
    
    // Check for unlabeled form inputs specifically
    const unlabeledInputs = interactiveElements.filter(
      el => el.tag === 'input' && !el.hasAriaLabel && !el.ariaLabel
    );
    
    if (unlabeledInputs.length > 5) {
      recommendations.push({
        title: 'Label form inputs for agent understanding',
        description: `Found ${unlabeledInputs.length} unlabeled form inputs. Agents need explicit labels to understand what data to provide. Add aria-label or associate inputs with <label> elements.`,
        priority: 'high',
        impact: 20,
        codeExample: `<!-- Option 1: Using aria-label -->
<input type="text" aria-label="First name" />

<!-- Option 2: Using label element -->
<label for="firstName">First name</label>
<input type="text" id="firstName" />

<!-- Option 3: Wrapping with label -->
<label>
  First name
  <input type="text" />
</label>`,
        docLink: 'https://www.w3.org/WAI/tutorials/forms/labels/'
      });
    }
    
    return recommendations;
  }

  /**
   * Generates recommendations for mitigating friction points
   * 
   * @param frictionPoints - List of detected friction points
   * @returns Array of friction-mitigation recommendations
   */
  private generateFrictionRecommendations(frictionPoints: FrictionPoint[]): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Check for CAPTCHAs
    const captchas = frictionPoints.filter(fp => fp.type === 'captcha');
    if (captchas.length > 0) {
      recommendations.push({
        title: 'Provide CAPTCHA alternatives for agents',
        description: 'CAPTCHAs completely block autonomous agents. Consider implementing agent-specific authentication methods or API keys for verified agents while keeping CAPTCHAs for suspicious traffic.',
        priority: 'high',
        impact: 35,
        codeExample: `// Detect agent user-agents
const isAgent = /OAI-SearchBot|CCBot|ClaudeBot/i.test(userAgent);

if (isAgent && hasValidApiKey(request)) {
  // Skip CAPTCHA for authenticated agents
  return processRequest(request);
} else {
  // Show CAPTCHA for regular users
  return showCaptcha();
}`,
        docLink: 'https://developers.cloudflare.com/turnstile/concepts/agent-detection/'
      });
    }
    
    // Check for interstitials
    const interstitials = frictionPoints.filter(fp => fp.type === 'interstitial');
    if (interstitials.length > 0) {
      recommendations.push({
        title: 'Make interstitials dismissible for agents',
        description: 'Intrusive interstitials (modals, popups) can block agent navigation. Add clear dismiss buttons with semantic labels, or detect agent user-agents and skip non-essential interstitials.',
        priority: 'medium',
        impact: 20,
        codeExample: `<!-- Add clear close button with ARIA label -->
<div role="dialog" aria-labelledby="modal-title">
  <h2 id="modal-title">Newsletter Signup</h2>
  <button 
    aria-label="Close newsletter signup dialog"
    onclick="closeModal()"
  >
    ×
  </button>
  <!-- Modal content -->
</div>

<!-- Or skip for agents -->
<script>
  const isAgent = /bot|crawler|agent/i.test(navigator.userAgent);
  if (!isAgent) {
    showNewsletterModal();
  }
</script>`,
        docLink: 'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/'
      });
    }
    
    // Check for canvas-based UI
    const canvasUI = frictionPoints.filter(fp => fp.type === 'canvas');
    if (canvasUI.length > 0) {
      recommendations.push({
        title: 'Provide DOM alternatives to canvas UI',
        description: 'Canvas-based interfaces are opaque to agents. Provide parallel DOM-based interfaces or API endpoints that expose the same functionality in a structured format.',
        priority: 'high',
        impact: 30,
        codeExample: `<!-- Provide both canvas and DOM versions -->
<div class="visualization">
  <!-- Canvas for visual users -->
  <canvas id="chart" aria-hidden="true"></canvas>
  
  <!-- DOM alternative for agents and screen readers -->
  <div class="chart-data" role="table">
    <div role="row">
      <span role="columnheader">Month</span>
      <span role="columnheader">Sales</span>
    </div>
    <div role="row">
      <span role="cell">January</span>
      <span role="cell">$10,000</span>
    </div>
  </div>
</div>`,
        docLink: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas#accessibility'
      });
    }
    
    // Check for auth walls
    const authWalls = frictionPoints.filter(fp => fp.type === 'auth-wall');
    if (authWalls.length > 0) {
      recommendations.push({
        title: 'Implement agent authentication flow',
        description: 'Authentication walls block agents from accessing content. Implement OAuth or API key authentication specifically for agents, with clear documentation on how to obtain credentials.',
        priority: 'medium',
        impact: 25,
        codeExample: `// Agent authentication endpoint
app.post('/api/agent/auth', async (req, res) => {
  const { apiKey } = req.body;
  
  if (await validateApiKey(apiKey)) {
    const token = generateJWT({ type: 'agent', key: apiKey });
    res.json({ token, expiresIn: 3600 });
  } else {
    res.status(401).json({ error: 'Invalid API key' });
  }
});

// Document in agents.json
{
  "authentication": {
    "type": "api_key",
    "endpoint": "/api/agent/auth",
    "docs": "/docs/agent-auth"
  }
}`,
        docLink: 'https://swagger.io/docs/specification/authentication/'
      });
    }
    
    return recommendations;
  }

  /**
   * Sorts recommendations by priority and impact
   * 
   * Priority order: high > medium > low
   * Within same priority: higher impact first
   * 
   * @param recommendations - Unsorted recommendations
   * @returns Sorted recommendations
   */
  private prioritizeRecommendations(recommendations: Recommendation[]): Recommendation[] {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    
    return recommendations.sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      
      // Then sort by impact (higher first)
      return b.impact - a.impact;
    });
  }
}
