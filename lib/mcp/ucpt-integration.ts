/**
 * UCPT MCP Integration
 * Wrapper for tool execution with provenance token generation
 */

import { generateUCPT } from '../ucpt/generator';
import { hashCanonicalCBOR } from '../ucpt/serializer';
import { getCachedResult, cacheResult, isCached } from '../ucpt/cache';
import { executeDeterministic, createDeterministicContext } from '../ucpt/deterministic';
import { loadUCPTKeypair, isUCPTEnabled, getIssuerAID, getUCPTTTL } from '../ucpt/keys';
import { config } from '../config';
import { execSync } from 'child_process';
import type { SerializedUCPT, UCPTCacheKey } from '../ucpt/types';
import type { ToolExecutionContext, ToolParameters } from './types';

// =====================================================
// GIT HELPERS
// =====================================================

/**
 * Get current git commit (required for UCPT)
 */
function getGitCommit(): string {
  try {
    const commit = execSync('git rev-parse HEAD', { encoding: 'utf-8', cwd: process.cwd() }).trim();
    if (!/^[0-9a-f]{40}$/.test(commit)) {
      throw new Error(`Invalid git commit format: ${commit}`);
    }
    return commit;
  } catch (error) {
    throw new Error(`Failed to get git commit: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get current git version
 */
function getGitVersion(): string {
  try {
    const version = execSync('git describe --tags --always', { encoding: 'utf-8', cwd: process.cwd() }).trim();
    if (!version) {
      return config.app.version; // Fallback to app version
    }
    return version;
  } catch (error) {
    console.warn('Failed to get git version, using app version:', error);
    return config.app.version;
  }
}

// =====================================================
// UCPT-WRAPPED TOOL EXECUTION
// =====================================================

export interface ToolExecutionResult {
  result: unknown;
  ucpt?: SerializedUCPT;
  cached?: boolean;
  deterministicHash?: string;
}

/**
 * Execute tool with UCPT provenance token generation
 * Supports caching and deterministic execution
 */
export async function executeToolWithUCPT(
  toolName: string,
  params: ToolParameters,
  context: ToolExecutionContext,
  toolFunction: (params: ToolParameters, context: ToolExecutionContext) => Promise<unknown>
): Promise<ToolExecutionResult> {
  // Check if UCPT enabled
  if (!isUCPTEnabled()) {
    // UCPT disabled, execute normally
    const result = await toolFunction(params, context);
    return { result };
  }
  
  // Load keypair
  const keypair = loadUCPTKeypair();
  if (!keypair) {
    // Keys not configured, execute normally
    const result = await toolFunction(params, context);
    return { result };
  }
  
  // Get git metadata
  const graphCommit = getGitCommit();
  const graphVersion = getGitVersion();
  
  // Compute input hash for cache lookup
  const inputHash = hashCanonicalCBOR(params);
  
  // Check cache if enabled
  if (config.ucpt.cacheEnabled) {
    const cacheKey: UCPTCacheKey = {
      input_hash: inputHash,
      graph_commit: graphCommit,
      tool: toolName,
    };
    
    const cached = await isCached(cacheKey);
    if (cached) {
      const cachedEntry = await getCachedResult(cacheKey);
      if (cachedEntry) {
        console.log(`✅ UCPT cache hit: ${toolName}`);
        return {
          result: cachedEntry.result,
          ucpt: cachedEntry.ucpt,
          cached: true,
        };
      }
    }
  }
  
  // Execute tool deterministically
  const iat = Math.floor(Date.now() / 1000);
  const detContext = createDeterministicContext(iat);
  detContext.graph_commit = graphCommit;
  
  const result = await executeDeterministic(detContext, async () => {
    return await toolFunction(params, context);
  });
  
  // Generate UCPT token
  try {
    const ucpt = await generateUCPT({
      issuer_aid: getIssuerAID(),
      tool_name: toolName,
      input: params,
      output: result,
      graph_commit: graphCommit,
      graph_version: graphVersion,
      causal_path_ids: extractCausalPathIds(result),
      private_key: keypair.privateKey,
      public_key: keypair.publicKey,
      ttl_seconds: getUCPTTTL(),
    });
    
    // Cache result if enabled
    if (config.ucpt.cacheEnabled) {
      const cacheKey: UCPTCacheKey = {
        input_hash: inputHash,
        graph_commit: graphCommit,
        tool: toolName,
      };
      
      await cacheResult(cacheKey, result, ucpt, getUCPTTTL()).catch(error => {
        console.error('Failed to cache result:', error);
      });
    }
    
    return {
      result,
      ucpt,
      cached: false,
      deterministicHash: hashCanonicalCBOR(result),
    };
  } catch (error) {
    console.error('UCPT generation failed:', error);
    // Return result without UCPT on error (graceful degradation)
    return { result };
  }
}

/**
 * Extract causal path IDs from result
 * Looks for common patterns in graph/audit results
 */
function extractCausalPathIds(result: unknown): number[] {
  if (!result || typeof result !== 'object') {
    return [0]; // Default: single root node
  }
  
  const res = result as Record<string, unknown>;
  
  // Check for causal_path_ids field (from causal_citation_trace)
  if (res.causal_path_ids && Array.isArray(res.causal_path_ids)) {
    return res.causal_path_ids.filter((id: unknown) => typeof id === 'number');
  }
  
  // Check for graph nodes
  if (res.nodes && Array.isArray(res.nodes)) {
    return res.nodes
      .map((node: unknown) => (node as Record<string, unknown>)?.id)
      .filter((id: unknown) => typeof id === 'number');
  }
  
  // Check for graph.nodes (from getGraph)
  if (res.graph && typeof res.graph === 'object') {
    const graph = res.graph as Record<string, unknown>;
    if (graph.nodes && Array.isArray(graph.nodes)) {
      return graph.nodes
        .map((node: unknown) => (node as Record<string, unknown>)?.id)
        .filter((id: unknown) => typeof id === 'number');
    }
  }
  
  // Check for entities (from knowledge graph)
  if (res.entities && Array.isArray(res.entities)) {
    return res.entities
      .map((_: unknown, index: number) => index)
      .filter((id: unknown) => typeof id === 'number');
  }
  
  // Default: single root node
  return [0];
}

/**
 * Check if UCPT is available for this request
 */
export function isUCPTAvailable(): boolean {
  return isUCPTEnabled();
}
