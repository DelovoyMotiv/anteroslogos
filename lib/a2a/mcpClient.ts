/**
 * MCP Client - Production A2A Tool Execution
 * Handles actual tool calls through A2A Protocol
 * Compatible with Code Execution Mode
 */

import { performGeoAudit } from '../../utils/geoAuditEnhanced';
import { KnowledgeGraphBuilder } from '../../utils/knowledgeGraph/builder';
import { detectCitations, calculateCitationROI } from '../../utils/citationProof/tracker';
import { discoverAIDAgent } from '../../utils/aidDiscovery';
import { getAuditHistory } from '../../utils/auditHistory';
import type { AIDAgentInfo } from '../../utils/aidDiscovery';

// =====================================================
// TYPES
// =====================================================

export interface A2AToolCall {
  method: string;
  params: Record<string, any>;
}

export interface A2AToolResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTimeMs: number;
}

// =====================================================
// TOOL ROUTER
// =====================================================

/**
 * Call A2A tool from code execution environment
 * Routes to actual implementation based on method name
 */
export async function callA2ATool<T = any>(method: string, params: Record<string, any>): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await routeToolCall(method, params);
    const executionTime = Date.now() - startTime;
    
    console.log(`✓ Tool ${method} executed in ${executionTime}ms`);
    
    return result as T;
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`✗ Tool ${method} failed after ${executionTime}ms:`, error);
    throw error;
  }
}

/**
 * Route tool call to appropriate implementation
 */
async function routeToolCall(method: string, params: Record<string, any>): Promise<any> {
  const [server, tool] = method.split('__');
  
  switch (server) {
    case 'geo-audit':
      return handleGeoAuditTools(tool, params);
    
    case 'knowledge-graph':
      return handleKnowledgeGraphTools(tool, params);
    
    case 'citation-tracking':
      return handleCitationTrackingTools(tool, params);
    
    case 'aidiscovery':
      return handleAIDTools(tool, params);
    
    default:
      throw new Error(`Unknown MCP server: ${server}`);
  }
}

// =====================================================
// GEO AUDIT TOOLS
// =====================================================

async function handleGeoAuditTools(tool: string, params: Record<string, any>): Promise<any> {
  switch (tool) {
    case 'auditWebsite': {
      const { url, useAI = false } = params;
      if (!url) throw new Error('Missing required parameter: url');
      
      const result = await performGeoAudit(url, useAI);
      return result;
    }
    
    case 'batchAudit': {
      const { urls, maxConcurrent = 5 } = params;
      if (!urls || !Array.isArray(urls)) {
        throw new Error('Missing or invalid parameter: urls (must be array)');
      }
      if (urls.length > 100) {
        throw new Error('Too many URLs (max 100)');
      }
      
      const results: Array<any> = [];
      
      for (let i = 0; i < urls.length; i += maxConcurrent) {
        const batch = urls.slice(i, i + maxConcurrent);
        const batchResults = await Promise.all(
          batch.map(async (url: string) => {
            try {
              const result = await performGeoAudit(url, { useAI: false });
              return { ...result, url };
            } catch (error) {
              return {
                url,
                error: error instanceof Error ? error.message : 'Unknown error',
              };
            }
          })
        );
        results.push(...batchResults);
      }
      
      return {
        total: urls.length,
        results,
        completed: results.filter((r: any) => !r.error).length,
        failed: results.filter((r: any) => r.error).length,
      };
    }
    
    case 'getAuditHistory': {
      const { url, limit = 10 } = params;
      if (!url) throw new Error('Missing required parameter: url');
      
      const history = getAuditHistory();
      const filtered = history.filter(h => h.url === url).slice(0, limit);
      
      return {
        url,
        count: filtered.length,
        audits: filtered,
      };
    }
    
    default:
      throw new Error(`Unknown geo-audit tool: ${tool}`);
  }
}

// =====================================================
// KNOWLEDGE GRAPH TOOLS
// =====================================================

async function handleKnowledgeGraphTools(tool: string, params: Record<string, any>): Promise<any> {
  switch (tool) {
    case 'buildKnowledgeGraph': {
      const { html, sourceUrl } = params;
      if (!html || !sourceUrl) {
        throw new Error('Missing required parameters: html, sourceUrl');
      }
      
      const domain = new URL(sourceUrl).hostname;
      const builder = new KnowledgeGraphBuilder(domain);
      const graph = await builder.buildFromHTML(html, sourceUrl);
      
      return graph;
    }
    
    case 'queryKnowledgeGraph': {
      const { entityType } = params;
      
      // In production, this would query a database
      // For now, return empty results as real query logic requires database
      return {
        entityType,
        count: 0,
        entities: [],
        message: 'Query functionality requires database connection',
      };
    }
    
    default:
      throw new Error(`Unknown knowledge-graph tool: ${tool}`);
  }
}

// =====================================================
// CITATION TRACKING TOOLS
// =====================================================

async function handleCitationTrackingTools(tool: string, params: Record<string, any>): Promise<any> {
  switch (tool) {
    case 'detectCitations': {
      const { platform, response, domain } = params;
      if (!platform || !response || !domain) {
        throw new Error('Missing required parameters: platform, response, domain');
      }
      
      const detectedCitations = detectCitations(response, domain, platform as any);
      
      return {
        platform,
        domain,
        citations: detectedCitations,
        count: detectedCitations.length,
      };
    }
    
    case 'calculateCitationROI': {
      const { citations } = params;
      if (!citations || !Array.isArray(citations)) {
        throw new Error('Missing or invalid parameter: citations (must be array)');
      }
      
      const roi = calculateCitationROI(citations);
      
      return roi;
    }
    
    default:
      throw new Error(`Unknown citation-tracking tool: ${tool}`);
  }
}

// =====================================================
// AID DISCOVERY TOOLS
// =====================================================

async function handleAIDTools(tool: string, params: Record<string, any>): Promise<any> {
  switch (tool) {
    case 'discoverAIDAgent': {
      const { url } = params;
      if (!url) throw new Error('Missing required parameter: url');
      
      const aidInfo = await discoverAIDAgent(url);
      
      return aidInfo;
    }
    
    case 'validateAIDConfig': {
      const { aidInfo } = params;
      if (!aidInfo) throw new Error('Missing required parameter: aidInfo');
      
      const validation = validateAIDConfiguration(aidInfo);
      
      return validation;
    }
    
    default:
      throw new Error(`Unknown aidiscovery tool: ${tool}`);
  }
}

/**
 * Validate AID configuration completeness
 */
function validateAIDConfiguration(aidInfo: AIDAgentInfo): {
  valid: boolean;
  score: number;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 100;
  
  if (!aidInfo.detected) {
    issues.push('AID protocol not detected');
    score -= 100;
    recommendations.push('Implement AID protocol with DNS TXT and HTTPS well-known');
    
    return { valid: false, score: 0, issues, recommendations };
  }
  
  if (aidInfo.discoveryMethod === 'none') {
    issues.push('No discovery method available');
    score -= 50;
  } else if (aidInfo.discoveryMethod !== 'both') {
    issues.push(`Only ${aidInfo.discoveryMethod} discovery available`);
    score -= 20;
    recommendations.push('Implement both DNS and HTTPS discovery for redundancy');
  }
  
  if (!aidInfo.version || aidInfo.version !== '1.1') {
    issues.push('Missing or outdated AID version');
    score -= 10;
  }
  
  if (!aidInfo.protocols || aidInfo.protocols.length === 0) {
    issues.push('No protocols specified');
    score -= 15;
  }
  
  if (!aidInfo.endpoint) {
    issues.push('Missing agent endpoint');
    score -= 15;
  }
  
  if (!aidInfo.agentName) {
    issues.push('Missing agent name');
    score -= 10;
    recommendations.push('Add agent name to metadata');
  }
  
  if (!aidInfo.capabilities || aidInfo.capabilities.length === 0) {
    issues.push('No capabilities defined');
    score -= 10;
    recommendations.push('Document agent capabilities in metadata');
  }
  
  if (aidInfo.errors && aidInfo.errors.length > 0) {
    issues.push(`${aidInfo.errors.length} configuration errors`);
    score -= aidInfo.errors.length * 5;
    recommendations.push('Fix configuration errors');
  }
  
  return {
    valid: score >= 50,
    score: Math.max(0, score),
    issues,
    recommendations,
  };
}

// =====================================================
// EXPORT
// =====================================================

export { routeToolCall };
