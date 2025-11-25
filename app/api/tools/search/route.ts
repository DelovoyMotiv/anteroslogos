/**
 * Tool Search Library - Anthropic Advanced Tool Use 2025-11-20
 * Production-grade semantic search over aggregated tool schemas
 */

import Fuse from 'fuse.js';
import * as fs from 'fs';
import * as path from 'path';

interface ToolSchema {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: unknown;
    input_examples?: Array<Record<string, unknown>>;
  };
  source?: string; // Track which schema file this came from
}

let cachedToolSchemas: ToolSchema[] | null = null;

/**
 * Load and aggregate all tool schemas from multiple formats
 * Deduplicates by tool name, prioritizing most complete definition
 */
function loadToolSchemas(): ToolSchema[] {
  if (cachedToolSchemas) return cachedToolSchemas;
  
  const wellKnownDir = path.join(process.cwd(), 'public', '.well-known');
  const schemaFiles = [
    { file: 'mcp-tools-openai.json', source: 'openai' },
    { file: 'mcp-tools-claude.json', source: 'claude' },
    { file: 'mcp-tools-grok.json', source: 'grok' },
  ];
  
  const toolMap = new Map<string, ToolSchema>();
  
  for (const { file, source } of schemaFiles) {
    try {
      const schemaPath = path.join(wellKnownDir, file);
      if (!fs.existsSync(schemaPath)) continue;
      
      const data = fs.readFileSync(schemaPath, 'utf-8');
      const schemas = JSON.parse(data) as ToolSchema[];
      
      for (const schema of schemas) {
        const toolName = schema.function.name;
        const existing = toolMap.get(toolName);
        
        // Prioritize schema with input_examples
        if (!existing || (schema.function.input_examples && !existing.function.input_examples)) {
          toolMap.set(toolName, { ...schema, source });
        }
      }
    } catch (error) {
      console.warn(`Failed to load ${file}:`, error);
    }
  }
  
  cachedToolSchemas = Array.from(toolMap.values());
  console.log(`Loaded ${cachedToolSchemas.length} unique tools from ${schemaFiles.length} sources`);
  
  return cachedToolSchemas;
}

export function searchTools(query: string, limit: number = 10): {
  query: string;
  results: Array<{
    tool: ToolSchema;
    score: number | undefined;
    relevance: number;
  }>;
  total: number;
} {
  if (!query || query.length < 2) {
    return { query, results: [], total: 0 };
  }

  const tools = loadToolSchemas();
  
  // Fuse.js configuration for BM25-like scoring
  const fuse = new Fuse(tools, {
    keys: [
      { name: 'function.name', weight: 0.4 },
      { name: 'function.description', weight: 0.6 }
    ],
    threshold: 0.4,
    includeScore: true,
    minMatchCharLength: 2,
    useExtendedSearch: true
  });

  const results = fuse.search(query).slice(0, Math.min(limit, 20));

  return {
    query,
    results: results.map(r => ({
      tool: r.item,
      score: r.score,
      relevance: Math.max(0, 1 - (r.score || 0))
    })),
    total: results.length
  };
}
