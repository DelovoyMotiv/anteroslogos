/**
 * Vercel Edge Middleware - AI Agent Bypass
 * 
 * Purpose: Allow machine agents (Perplexity, ChatGPT, Claude, datacenter IPs)
 * to access the site without browser-specific header requirements.
 * 
 * Critical for M2M (Machine-to-Machine) accessibility.
 * 
 * Note: This uses Vercel Edge Runtime API, not Next.js
 */

// Known AI agent User-Agent patterns
const AI_AGENT_PATTERNS = [
  /GPTBot/i,
  /ChatGPT-User/i,
  /Claude-Web/i,
  /ClaudeBot/i,
  /anthropic-ai/i,
  /PerplexityBot/i,
  /Google-Extended/i,
  /CCBot/i,
  /Meta-ExternalAgent/i,
  /cohere-ai/i,
  /Applebot/i,
  /python-requests/i,
  /axios/i,
  /node-fetch/i,
  /curl/i,
  /wget/i,
  /Headless/i,
  /AnoterosLogos-MCP/i,
];

// Paths that should always be accessible to agents
const AGENT_ACCESSIBLE_PATHS = [
  '/.well-known/',
  '/api/a2a',
  '/api/mcp',
  '/api/goldStandard',
  '/sitemap.xml',
  '/robots.txt',
  '/agent-identity',
];

function isAIAgent(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return AI_AGENT_PATTERNS.some(pattern => pattern.test(userAgent));
}

function isAgentPath(pathname: string): boolean {
  return AGENT_ACCESSIBLE_PATHS.some(path => pathname.startsWith(path));
}

export async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;
  const userAgent = request.headers.get('user-agent');
  const accept = request.headers.get('accept');

  // OPTIONS preflight requests - always allow
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Agent-Info, X-API-Key, User-Agent, Accept',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Bypass for AI agents or agent-specific paths
  if (isAIAgent(userAgent) || isAgentPath(pathname)) {
    // Fetch the original response
    const response = await fetch(request);
    
    // Clone response and add permissive CORS headers
    const modifiedResponse = new Response(response.body, response);
    modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
    modifiedResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
    modifiedResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Agent-Info, X-API-Key, User-Agent, Accept');
    
    // Ensure robots can access
    if (isAgentPath(pathname)) {
      modifiedResponse.headers.set('X-Robots-Tag', 'all');
    }
    
    return modifiedResponse;
  }

  // Bypass for JSON API requests (headless browsers)
  if (accept?.includes('application/json') || pathname.startsWith('/api/')) {
    const response = await fetch(request);
    const modifiedResponse = new Response(response.body, response);
    modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
    return modifiedResponse;
  }

  // Default: Pass through without modification
  return fetch(request);
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
