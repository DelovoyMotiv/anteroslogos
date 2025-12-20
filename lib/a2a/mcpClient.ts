/**
 * MCP Client - Production A2A Tool Execution
 * Handles actual tool calls through A2A Protocol
 * Compatible with Code Execution Mode
 */

import { performGeoAudit } from '../../utils/geoAuditEnhanced';
import { KnowledgeGraphBuilder } from '../../utils/knowledgeGraph/builder';
import { detectCitations, calculateCitationROI } from '../../utils/citationProof/tracker';
import { discoverAIPAgent } from '../../utils/aipDiscovery';
import { getAuditHistory } from '../../utils/auditHistory';
import type { AIPAgentInfo } from '../../utils/aipDiscovery';
import type { JSONValue, ToolCallParams, ToolCallResult } from '../../types/a2a.types';

// =====================================================
// TYPES
// =====================================================

export interface A2AToolCall {
  method: string;
  params: ToolCallParams;
}

export type A2AToolResult = ToolCallResult;

// =====================================================
// TOOL ROUTER
// =====================================================

/**
 * Call A2A tool from code execution environment
 * Routes to actual implementation based on method name
 */
export async function callA2ATool<T = JSONValue>(method: string, params: ToolCallParams): Promise<T> {
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
async function routeToolCall(method: string, params: ToolCallParams): Promise<JSONValue> {
  const [server, tool] = method.split('__');
  
  switch (server) {
    case 'geo-audit':
      return handleGeoAuditTools(tool, params);
    
    case 'knowledge-graph':
      return handleKnowledgeGraphTools(tool, params);
    
    case 'citation-tracking':
      return handleCitationTrackingTools(tool, params);
    
    case 'aipdiscovery':
      return handleAIPTools(tool, params);
    
    default:
      throw new Error(`Unknown MCP server: ${server}`);
  }
}

// =====================================================
// GEO AUDIT TOOLS
// =====================================================

async function handleGeoAuditTools(tool: string, params: ToolCallParams): Promise<JSONValue> {
  switch (tool) {
    case 'auditWebsite': {
      const { url, useAI = false } = params;
      if (!url) throw new Error('Missing required parameter: url');
      
      const result = await performGeoAudit(url as string, { useAI: useAI as boolean });
      return result as unknown as JSONValue;
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
      const maxConcurrentNum = typeof maxConcurrent === 'number' ? maxConcurrent : 5;
      const urlStrings = urls.filter((u): u is string => typeof u === 'string');
      
      for (let i = 0; i < urlStrings.length; i += maxConcurrentNum) {
        const batch = urlStrings.slice(i, i + maxConcurrentNum);
        const batchResults = await Promise.all(
          batch.map(async (url) => {
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
        total: urlStrings.length,
        results,
        completed: results.filter((r) => !(r as Record<string, unknown>).error).length,
        failed: results.filter((r) => (r as Record<string, unknown>).error).length,
      } as unknown as JSONValue;
    }
    
    case 'getAuditHistory': {
      const { url, limit = 10 } = params;
      if (!url) throw new Error('Missing required parameter: url');
      
      const limitNum = typeof limit === 'number' ? limit : 10;
      const history = getAuditHistory();
      const filtered = history.filter(h => h.url === url).slice(0, limitNum);
      
      return {
        url,
        count: filtered.length,
        audits: filtered,
      } as unknown as JSONValue;
    }
    
    default:
      throw new Error(`Unknown geo-audit tool: ${tool}`);
  }
}

// =====================================================
// KNOWLEDGE GRAPH TOOLS
// =====================================================

async function handleKnowledgeGraphTools(tool: string, params: ToolCallParams): Promise<JSONValue> {
  switch (tool) {
    case 'buildKnowledgeGraph': {
      const { html, sourceUrl } = params;
      if (!html || !sourceUrl || typeof html !== 'string' || typeof sourceUrl !== 'string') {
        throw new Error('Missing required parameters: html, sourceUrl (must be strings)');
      }
      
      const domain = new URL(sourceUrl).hostname;
      const builder = new KnowledgeGraphBuilder(domain);
      const graph = await builder.buildFromHTML(html, sourceUrl);
      
      return graph as unknown as JSONValue;
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

async function handleCitationTrackingTools(tool: string, params: ToolCallParams): Promise<JSONValue> {
  switch (tool) {
    case 'detectCitations': {
      const { platform, response, domain } = params;
      if (!platform || !response || !domain || 
          typeof platform !== 'string' || typeof response !== 'string' || typeof domain !== 'string') {
        throw new Error('Missing required parameters: platform, response, domain (must be strings)');
      }
      
      const detectedCitations = detectCitations(response, domain, platform as any);
      
      return {
        platform,
        domain,
        citations: detectedCitations,
        count: detectedCitations.length,
      } as unknown as JSONValue;
    }
    
    case 'calculateCitationROI': {
      const { citations } = params;
      if (!citations || !Array.isArray(citations)) {
        throw new Error('Missing or invalid parameter: citations (must be array)');
      }
      
      const roi = calculateCitationROI(citations as any);
      
      return roi as unknown as JSONValue;
    }
    
    default:
      throw new Error(`Unknown citation-tracking tool: ${tool}`);
  }
}

// =====================================================
// AIP DISCOVERY TOOLS
// =====================================================

async function handleAIPTools(tool: string, params: ToolCallParams): Promise<JSONValue> {
  switch (tool) {
    case 'discoverAIPAgent': {
      const { url } = params;
      if (!url || typeof url !== 'string') {
        throw new Error('Missing required parameter: url (must be string)');
      }
      
      const aipInfo = await discoverAIPAgent(url);
      
      return aipInfo as unknown as JSONValue;
    }
    
    case 'validateAIPConfig': {
      const { aipInfo } = params;
      if (!aipInfo) throw new Error('Missing required parameter: aipInfo');
      
      const validation = validateAIPConfiguration(aipInfo as unknown as AIPAgentInfo);
      
      return validation as unknown as JSONValue;
    }
    
    default:
      throw new Error(`Unknown aipdiscovery tool: ${tool}`);
  }
}

/**
 * Validate AIP configuration completeness
 */
function validateAIPConfiguration(aipInfo: AIPAgentInfo): {
  valid: boolean;
  score: number;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 100;
  
  if (!aipInfo.detected) {
    issues.push('AIP protocol not detected');
    score -= 100;
    recommendations.push('Implement AIP protocol with DNS TXT and HTTPS well-known');
    
    return { valid: false, score: 0, issues, recommendations };
  }
  
  if (aipInfo.discoveryMethod === 'none') {
    issues.push('No discovery method available');
    score -= 50;
  } else if (aipInfo.discoveryMethod !== 'both') {
    issues.push(`Only ${aipInfo.discoveryMethod} discovery available`);
    score -= 20;
    recommendations.push('Implement both DNS and HTTPS discovery for redundancy');
  }
  
  if (!aipInfo.version || aipInfo.version !== '1.1') {
    issues.push('Missing or outdated AIP version');
    score -= 10;
  }
  
  if (!aipInfo.protocols || aipInfo.protocols.length === 0) {
    issues.push('No protocols specified');
    score -= 15;
  }
  
  if (!aipInfo.endpoint) {
    issues.push('Missing agent endpoint');
    score -= 15;
  }
  
  if (!aipInfo.agentName) {
    issues.push('Missing agent name');
    score -= 10;
    recommendations.push('Add agent name to metadata');
  }
  
  if (!aipInfo.capabilities || aipInfo.capabilities.length === 0) {
    issues.push('No capabilities defined');
    score -= 10;
    recommendations.push('Document agent capabilities in metadata');
  }
  
  if (aipInfo.errors && aipInfo.errors.length > 0) {
    issues.push(`${aipInfo.errors.length} configuration errors`);
    score -= aipInfo.errors.length * 5;
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
