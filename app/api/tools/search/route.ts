/**
 * Tool Search Library - Anthropic Advanced Tool Use 2025-11-20
 * Exports searchTools function for use in Vercel Serverless Functions
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
  };
}

let cachedToolSchemas: ToolSchema[] | null = null;

function loadToolSchemas(): ToolSchema[] {
  if (cachedToolSchemas) return cachedToolSchemas;
  
  const schemaPath = path.join(process.cwd(), 'public', '.well-known', 'mcp-tools-openai.json');
  const data = fs.readFileSync(schemaPath, 'utf-8');
  cachedToolSchemas = JSON.parse(data);
  return cachedToolSchemas!;
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
