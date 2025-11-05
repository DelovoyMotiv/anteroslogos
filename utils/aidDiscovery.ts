/**
 * AID (Agent Identity & Discovery) Protocol Detection
 * Checks domains for AI agent support via DNS TXT records and HTTPS well-known endpoints
 */

export interface AIDAgentInfo {
  detected: boolean;
  discoveryMethod: 'dns' | 'https' | 'both' | 'none';
  version?: string;
  protocols?: string[];
  endpoint?: string;
  serviceId?: string;
  domain?: string;
  agentName?: string;
  agentDescription?: string;
  agentVersion?: string;
  capabilities?: string[];
  vendor?: string;
  homepage?: string;
  documentation?: string;
  contact?: string;
  metadata?: {
    organization?: string;
    industry?: string;
    established?: string;
    specialization?: string[];
  };
  pricing?: {
    free?: {
      requests_per_minute: number;
      requests_per_hour: number;
    };
    basic?: {
      monthly_price: number;
      requests_per_minute: number;
      requests_per_hour: number;
    };
    pro?: {
      monthly_price: number;
      requests_per_minute: number;
      requests_per_hour: number;
    };
  };
  errors: string[];
  warnings: string[];
}

interface DNSResponse {
  found: boolean;
  value?: string;
  error?: string;
}

interface WellKnownResponse {
  found: boolean;
  data?: any;
  error?: string;
}

/**
 * Parse AID TXT record value
 * Format: v=1.1;p=a2a,http;u=https://example.com/api;s=service;d=example.com
 */
function parseAIDTxtRecord(txtValue: string): Partial<AIDAgentInfo> {
  const result: Partial<AIDAgentInfo> = {
    errors: [],
    warnings: []
  };

  try {
    const parts = txtValue.split(';');
    const params: Record<string, string> = {};

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key && value) {
        params[key.trim()] = value.trim();
      }
    }

    // Parse version
    if (params.v) {
      result.version = params.v;
      if (params.v !== '1.1' && params.v !== '1.0') {
        result.warnings!.push(`Unknown AID version: ${params.v}`);
      }
    } else {
      result.errors!.push('Missing version field (v)');
    }

    // Parse protocols
    if (params.p) {
      result.protocols = params.p.split(',').map(p => p.trim());
    } else {
      result.errors!.push('Missing protocols field (p)');
    }

    // Parse endpoint
    if (params.u) {
      result.endpoint = params.u;
      // Validate URL
      try {
        new URL(params.u);
      } catch {
        result.errors!.push(`Invalid endpoint URL: ${params.u}`);
      }
    } else {
      result.errors!.push('Missing endpoint field (u)');
    }

    // Parse service ID
    if (params.s) {
      result.serviceId = params.s;
    }

    // Parse domain
    if (params.d) {
      result.domain = params.d;
    }

    return result;
  } catch (error) {
    result.errors!.push(`Failed to parse TXT record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

/**
 * Check DNS TXT record for AID protocol
 * Uses DNS-over-HTTPS (DoH) via Google Public DNS
 */
async function checkDNSTxtRecord(domain: string): Promise<DNSResponse> {
  try {
    const agentSubdomain = `_agent.${domain}`;
    
    // Use DNS-over-HTTPS (Google Public DNS)
    const dohUrl = `https://dns.google/resolve?name=${encodeURIComponent(agentSubdomain)}&type=TXT`;
    
    const response = await fetch(dohUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/dns-json'
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (!response.ok) {
      return {
        found: false,
        error: `DNS query failed: ${response.status} ${response.statusText}`
      };
    }

    const data = await response.json();

    // Check if TXT record exists
    if (data.Status === 0 && data.Answer && data.Answer.length > 0) {
      // Find TXT record
      const txtRecord = data.Answer.find((record: any) => record.type === 16); // Type 16 = TXT
      
      if (txtRecord && txtRecord.data) {
        // Remove quotes from DNS response
        const txtValue = txtRecord.data.replace(/^"(.*)"$/, '$1');
        
        // Validate it looks like AID format
        if (txtValue.includes('v=') && txtValue.includes('p=')) {
          return {
            found: true,
            value: txtValue
          };
        } else {
          return {
            found: false,
            error: 'TXT record found but does not match AID format'
          };
        }
      }
    }

    return {
      found: false,
      error: 'No TXT record found for _agent subdomain'
    };

  } catch (error) {
    return {
      found: false,
      error: `DNS lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Check HTTPS well-known endpoint for agent.json
 */
async function checkWellKnownEndpoint(domain: string): Promise<WellKnownResponse> {
  try {
    // Construct URL - try both http and https
    const httpsUrl = `https://${domain}/.well-known/agent.json`;
    
    const response = await fetch(httpsUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Anoteros-Logos-GEO-Audit/2.0'
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
      redirect: 'follow'
    });

    if (!response.ok) {
      return {
        found: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return {
        found: false,
        error: `Invalid content-type: ${contentType || 'missing'}`
      };
    }

    const data = await response.json();

    // Validate basic AID structure
    if (data.v && (data.p || data.protocols)) {
      return {
        found: true,
        data
      };
    } else {
      return {
        found: false,
        error: 'JSON found but does not match AID schema'
      };
    }

  } catch (error) {
    return {
      found: false,
      error: `HTTPS request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Validate and extract agent metadata from well-known JSON
 */
function extractAgentMetadata(data: any): Partial<AIDAgentInfo> {
  const result: Partial<AIDAgentInfo> = {
    errors: [],
    warnings: []
  };

  try {
    // Extract basic info
    result.version = data.v || data.version;
    result.protocols = Array.isArray(data.p) ? data.p : (data.p ? data.p.split(',') : data.protocols);
    result.endpoint = data.u || data.endpoint;
    result.serviceId = data.s || data.serviceId;
    result.domain = data.d || data.domain;

    // Extract agent details (nested in 'a' field)
    if (data.a || data.agent) {
      const agent = data.a || data.agent;
      result.agentName = agent.name;
      result.agentDescription = agent.description;
      result.agentVersion = agent.version;
      result.capabilities = agent.capabilities;
      result.vendor = agent.vendor;
      result.homepage = agent.homepage;
      result.documentation = agent.documentation;
      result.contact = agent.contact;
    }

    // Extract metadata
    if (data.metadata) {
      result.metadata = {
        organization: data.metadata.organization,
        industry: data.metadata.industry,
        established: data.metadata.established,
        specialization: data.metadata.specialization
      };
    }

    // Extract pricing
    if (data.metadata?.pricing) {
      result.pricing = data.metadata.pricing;
    }

    return result;
  } catch (error) {
    result.errors!.push(`Failed to extract metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

/**
 * Main function: Discover AID agent for a domain
 */
export async function discoverAIDAgent(url: string): Promise<AIDAgentInfo> {
  const result: AIDAgentInfo = {
    detected: false,
    discoveryMethod: 'none',
    errors: [],
    warnings: []
  };

  try {
    // Extract domain from URL
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    // Check both DNS and HTTPS in parallel
    const [dnsResult, httpsResult] = await Promise.allSettled([
      checkDNSTxtRecord(domain),
      checkWellKnownEndpoint(domain)
    ]);

    let dnsFound = false;
    let httpsFound = false;

    // Process DNS result
    if (dnsResult.status === 'fulfilled' && dnsResult.value.found) {
      dnsFound = true;
      const parsed = parseAIDTxtRecord(dnsResult.value.value!);
      Object.assign(result, parsed);
      result.errors.push(...(parsed.errors || []));
      result.warnings.push(...(parsed.warnings || []));
    } else if (dnsResult.status === 'fulfilled' && dnsResult.value.error) {
      result.warnings.push(`DNS: ${dnsResult.value.error}`);
    } else if (dnsResult.status === 'rejected') {
      result.warnings.push(`DNS lookup failed: ${dnsResult.reason}`);
    }

    // Process HTTPS result
    if (httpsResult.status === 'fulfilled' && httpsResult.value.found) {
      httpsFound = true;
      const metadata = extractAgentMetadata(httpsResult.value.data);
      
      // Merge metadata (HTTPS data is more detailed)
      Object.assign(result, metadata);
      result.errors.push(...(metadata.errors || []));
      result.warnings.push(...(metadata.warnings || []));
    } else if (httpsResult.status === 'fulfilled' && httpsResult.value.error) {
      result.warnings.push(`HTTPS: ${httpsResult.value.error}`);
    } else if (httpsResult.status === 'rejected') {
      result.warnings.push(`HTTPS request failed: ${httpsResult.reason}`);
    }

    // Determine detection status
    if (dnsFound && httpsFound) {
      result.detected = true;
      result.discoveryMethod = 'both';
    } else if (dnsFound) {
      result.detected = true;
      result.discoveryMethod = 'dns';
      result.warnings.push('DNS TXT record found, but HTTPS well-known endpoint missing or inaccessible');
    } else if (httpsFound) {
      result.detected = true;
      result.discoveryMethod = 'https';
      result.warnings.push('HTTPS well-known found, but DNS TXT record missing');
    } else {
      result.detected = false;
      result.discoveryMethod = 'none';
      result.errors.push('No AID agent detected via DNS or HTTPS');
    }

    // Validate required fields for detected agents
    if (result.detected) {
      if (!result.version) {
        result.errors.push('AID version missing');
      }
      if (!result.protocols || result.protocols.length === 0) {
        result.errors.push('Supported protocols missing');
      }
      if (!result.endpoint) {
        result.errors.push('Agent endpoint missing');
      }
    }

  } catch (error) {
    result.errors.push(`Discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * Calculate AID score contribution (0-100)
 */
export function calculateAIDScore(aidInfo: AIDAgentInfo): number {
  if (!aidInfo.detected) {
    return 0;
  }

  let score = 0;

  // Base score for detection (40 points)
  score += 40;

  // Discovery method bonus (20 points)
  if (aidInfo.discoveryMethod === 'both') {
    score += 20; // Full implementation
  } else if (aidInfo.discoveryMethod === 'dns') {
    score += 15; // DNS is primary
  } else if (aidInfo.discoveryMethod === 'https') {
    score += 10; // HTTPS fallback only
  }

  // Protocol support (15 points)
  if (aidInfo.protocols) {
    const protocolScore = Math.min(aidInfo.protocols.length * 5, 15);
    score += protocolScore;
  }

  // Agent metadata completeness (15 points)
  let metadataScore = 0;
  if (aidInfo.agentName) metadataScore += 3;
  if (aidInfo.agentDescription) metadataScore += 3;
  if (aidInfo.capabilities && aidInfo.capabilities.length > 0) metadataScore += 4;
  if (aidInfo.vendor) metadataScore += 2;
  if (aidInfo.documentation) metadataScore += 3;
  score += Math.min(metadataScore, 15);

  // Valid endpoint (10 points)
  if (aidInfo.endpoint) {
    try {
      new URL(aidInfo.endpoint);
      score += 10;
    } catch {
      score += 5; // Partial credit if endpoint exists but invalid
    }
  }

  // Deduct for errors
  const errorPenalty = Math.min(aidInfo.errors.length * 5, 20);
  score -= errorPenalty;

  return Math.max(0, Math.min(100, score));
}

/**
 * Generate AID recommendations
 */
export function generateAIDRecommendations(aidInfo: AIDAgentInfo, domain: string): Array<{
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  effort: 'quick-win' | 'strategic' | 'long-term';
  title: string;
  description: string;
  impact: string;
  implementation: string;
  estimatedTime: string;
  codeExample?: string;
}> {
  const recommendations = [];

  if (!aidInfo.detected) {
    // No AID support - critical recommendation
    recommendations.push({
      category: 'AI Agent Discovery',
      priority: 'high' as const,
      effort: 'strategic' as const,
      title: 'Implement AID (Agent Identity & Discovery) Protocol',
      description: 'Your domain is not discoverable by AI agents. AID protocol makes your services visible to the agentic web ecosystem (Perplexity, ChatGPT, Claude, Gemini agents).',
      impact: 'Enables AI agent discovery, increases visibility in agentic marketplaces, and positions your domain for the future of AI-driven web.',
      implementation: `1. Create /.well-known/agent.json file with agent metadata\n2. Add DNS TXT record: _agent.${domain}\n3. Configure protocol support (A2A, MCP, HTTP)\n4. Document agent capabilities and endpoints`,
      estimatedTime: '2-4 hours',
      codeExample: `DNS TXT Record:
_agent.${domain} TXT "v=1.1;p=a2a,http;u=https://${domain}/api;s=service;d=${domain}"

HTTPS Well-Known (/.well-known/agent.json):
{
  "v": "1.1",
  "p": ["a2a", "http"],
  "u": "https://${domain}/api",
  "s": "service",
  "d": "${domain}",
  "a": {
    "name": "Your Agent Name",
    "description": "Agent description",
    "capabilities": ["capability1", "capability2"]
  }
}`
    });
  } else {
    // Has AID but with issues
    if (aidInfo.discoveryMethod === 'dns' && !aidInfo.agentName) {
      recommendations.push({
        category: 'AI Agent Discovery',
        priority: 'medium' as const,
        effort: 'quick-win' as const,
        title: 'Add HTTPS Well-Known Endpoint for Complete AID Support',
        description: 'You have DNS TXT record but missing HTTPS well-known endpoint. Add /.well-known/agent.json for fallback discovery and richer metadata.',
        impact: 'Improves agent discoverability with fallback mechanism, enables detailed metadata exposure.',
        implementation: 'Create /.well-known/agent.json file with complete agent information including capabilities, pricing, and documentation links.',
        estimatedTime: '30 minutes'
      });
    }

    if (aidInfo.discoveryMethod === 'https' && aidInfo.warnings.some(w => w.includes('DNS'))) {
      recommendations.push({
        category: 'AI Agent Discovery',
        priority: 'medium' as const,
        effort: 'quick-win' as const,
        title: 'Add DNS TXT Record for Primary AID Discovery',
        description: 'You have HTTPS well-known but missing DNS TXT record. DNS is the primary discovery method and faster than HTTPS.',
        impact: 'Enables faster agent discovery (DNS < 50ms vs HTTPS ~200ms), improves reliability.',
        implementation: `Add DNS TXT record at your domain registrar:\n_agent.${domain} TXT "${aidInfo.version || '1.1'};p=${(aidInfo.protocols || []).join(',')};u=${aidInfo.endpoint || `https://${domain}/api`};s=${aidInfo.serviceId || 'service'};d=${domain}"`,
        estimatedTime: '15 minutes'
      });
    }

    if (!aidInfo.capabilities || aidInfo.capabilities.length === 0) {
      recommendations.push({
        category: 'AI Agent Discovery',
        priority: 'low' as const,
        effort: 'quick-win' as const,
        title: 'Document Agent Capabilities',
        description: 'Add capabilities array to agent metadata to help AI agents understand what your service offers.',
        impact: 'Improves agent matchmaking, helps AI agents decide if your service fits their needs.',
        implementation: 'Update agent.json with capabilities array listing available API methods or services.',
        estimatedTime: '20 minutes'
      });
    }

    if (!aidInfo.documentation) {
      recommendations.push({
        category: 'AI Agent Discovery',
        priority: 'low' as const,
        effort: 'quick-win' as const,
        title: 'Add Documentation URL',
        description: 'Include documentation link in agent metadata to help developers integrate with your agent.',
        impact: 'Improves developer experience, reduces integration friction.',
        implementation: 'Add "documentation" field to agent.json pointing to your API docs or integration guide.',
        estimatedTime: '10 minutes'
      });
    }

    if (aidInfo.errors.length > 0) {
      recommendations.push({
        category: 'AI Agent Discovery',
        priority: 'high' as const,
        effort: 'quick-win' as const,
        title: 'Fix AID Configuration Errors',
        description: `Your AID implementation has errors: ${aidInfo.errors.slice(0, 2).join(', ')}${aidInfo.errors.length > 2 ? '...' : ''}`,
        impact: 'Ensures proper agent discovery, prevents integration failures.',
        implementation: 'Review and fix reported errors in your AID configuration.',
        estimatedTime: '30 minutes'
      });
    }
  }

  return recommendations;
}
