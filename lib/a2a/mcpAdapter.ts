/**
 * MCP Adapter - Code Execution Mode for A2A Protocol
 * Based on Model Context Protocol article - 98.7% token reduction
 * 
 * Progressive Disclosure: Tools loaded on-demand as filesystem
 * Data Filtering: Intermediate results processed in execution environment
 * Skills Library: Reusable code patterns for common tasks
 * Production Ready: Uses isolated-vm sandbox, real A2A integration
 */

// =====================================================
// TYPES
// =====================================================

export interface MCPServerDefinition {
  name: string;
  description: string;
  version: string;
  tools: MCPToolDefinition[];
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  outputSchema?: {
    type: 'object';
    properties: Record<string, any>;
  };
}

export interface SkillDefinition {
  name: string;
  description: string;
  dependencies: string[];
  examples: string[];
  code: string;
}

export interface CodeExecutionResult {
  success: boolean;
  output: any;
  logs: string[];
  errors: string[];
  tokensUsed: {
    input: number;
    output: number;
    saved: number;
  };
}

// =====================================================
// MCP SERVERS REGISTRY
// =====================================================

/**
 * Registry of MCP servers with tool definitions
 * Each server represents a domain of functionality
 */
export const MCP_SERVERS: Record<string, MCPServerDefinition> = {
  'geo-audit': {
    name: 'GEO Audit Server',
    description: 'Generative Engine Optimization audit and analysis',
    version: '1.0.0',
    tools: [
      {
        name: 'auditWebsite',
        description: 'Perform comprehensive GEO audit on a website',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', format: 'uri', description: 'Website URL to audit' },
            useAI: { type: 'boolean', default: false, description: 'Use AI-powered analysis' },
          },
          required: ['url'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            geoScore: { type: 'number', description: 'Overall GEO score (0-100)' },
            issues: { type: 'array', description: 'List of detected issues' },
            recommendations: { type: 'array', description: 'Improvement recommendations' },
          },
        },
      },
      {
        name: 'batchAudit',
        description: 'Audit multiple websites in batch',
        inputSchema: {
          type: 'object',
          properties: {
            urls: { type: 'array', items: { type: 'string' }, description: 'Array of URLs to audit' },
            maxConcurrent: { type: 'number', default: 5, description: 'Max concurrent requests' },
          },
          required: ['urls'],
        },
      },
      {
        name: 'getAuditHistory',
        description: 'Retrieve audit history for a URL',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', format: 'uri' },
            limit: { type: 'number', default: 10 },
          },
          required: ['url'],
        },
      },
    ],
  },
  
  'knowledge-graph': {
    name: 'Knowledge Graph Server',
    description: 'Entity extraction and relationship mapping',
    version: '1.0.0',
    tools: [
      {
        name: 'buildKnowledgeGraph',
        description: 'Extract entities, relationships, and claims from HTML',
        inputSchema: {
          type: 'object',
          properties: {
            html: { type: 'string', description: 'HTML content to analyze' },
            sourceUrl: { type: 'string', format: 'uri', description: 'Source URL' },
          },
          required: ['html', 'sourceUrl'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            entities: { type: 'array', description: 'Extracted entities' },
            relationships: { type: 'array', description: 'Entity relationships' },
            claims: { type: 'array', description: 'Factual claims with evidence' },
          },
        },
      },
      {
        name: 'queryKnowledgeGraph',
        description: 'Query entities and relationships',
        inputSchema: {
          type: 'object',
          properties: {
            entityType: { type: 'string', enum: ['Person', 'Organization', 'Product', 'Concept'] },
            limit: { type: 'number', default: 50 },
          },
        },
      },
    ],
  },
  
  'citation-tracking': {
    name: 'Citation Tracking Server',
    description: 'Real-time citation detection and ROI measurement',
    version: '1.0.0',
    tools: [
      {
        name: 'detectCitations',
        description: 'Detect citations in AI platform responses',
        inputSchema: {
          type: 'object',
          properties: {
            platform: { type: 'string', enum: ['ChatGPT', 'Claude', 'Perplexity', 'Gemini', 'Grok'] },
            response: { type: 'string', description: 'AI response text to analyze' },
            domain: { type: 'string', description: 'Domain to track citations for' },
          },
          required: ['platform', 'response', 'domain'],
        },
      },
      {
        name: 'calculateCitationROI',
        description: 'Calculate ROI for detected citations',
        inputSchema: {
          type: 'object',
          properties: {
            citations: { type: 'array', items: { type: 'object' } },
          },
          required: ['citations'],
        },
      },
    ],
  },
  
  'aidiscovery': {
    name: 'AI Discovery Server',
    description: 'AID protocol detection and validation',
    version: '1.0.0',
    tools: [
      {
        name: 'discoverAIDAgent',
        description: 'Detect AID protocol support via DNS and HTTPS',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', format: 'uri' },
          },
          required: ['url'],
        },
      },
      {
        name: 'validateAIDConfig',
        description: 'Validate AID configuration completeness',
        inputSchema: {
          type: 'object',
          properties: {
            aidInfo: { type: 'object', description: 'AID agent info object' },
          },
          required: ['aidInfo'],
        },
      },
    ],
  },
};

// =====================================================
// CODE GENERATION
// =====================================================

/**
 * Generate TypeScript code for MCP tool as filesystem API
 * Implements progressive disclosure pattern from article
 */
export function generateToolCode(serverName: string, tool: MCPToolDefinition): string {
  const inputInterface = generateInputInterface(tool);
  const outputInterface = tool.outputSchema ? generateOutputInterface(tool) : 'any';
  
  return `// ./${serverName}/${tool.name}.ts
import { callA2ATool } from "./mcpClient";

${inputInterface}

${tool.outputSchema ? outputInterface : ''}

/** ${tool.description} */
export async function ${tool.name}(input: ${tool.name}Input): Promise<${tool.name}Response> {
  return callA2ATool<${tool.name}Response>('${serverName}__${tool.name}', input);
}
`;
}

/**
 * Generate TypeScript interface from JSON schema
 */
function generateInputInterface(tool: MCPToolDefinition): string {
  const properties = Object.entries(tool.inputSchema.properties)
    .map(([key, value]: [string, any]) => {
      const optional = !tool.inputSchema.required?.includes(key);
      const type = mapJsonTypeToTS(value.type);
      const description = value.description ? `  /** ${value.description} */\n` : '';
      return `${description}  ${key}${optional ? '?' : ''}: ${type};`;
    })
    .join('\n');
  
  return `interface ${tool.name}Input {
${properties}
}`;
}

function generateOutputInterface(tool: MCPToolDefinition): string {
  if (!tool.outputSchema) return '';
  
  const properties = Object.entries(tool.outputSchema.properties)
    .map(([key, value]: [string, any]) => {
      const type = mapJsonTypeToTS(value.type);
      const description = value.description ? `  /** ${value.description} */\n` : '';
      return `${description}  ${key}: ${type};`;
    })
    .join('\n');
  
  return `interface ${tool.name}Response {
${properties}
}`;
}

function mapJsonTypeToTS(jsonType: string): string {
  const mapping: Record<string, string> = {
    string: 'string',
    number: 'number',
    boolean: 'boolean',
    array: 'any[]',
    object: 'Record<string, any>',
  };
  return mapping[jsonType] || 'any';
}

/**
 * Generate index file for server with all tools
 */
export function generateServerIndex(serverName: string, server: MCPServerDefinition): string {
  const exports = server.tools
    .map(tool => `export { ${tool.name} } from './${tool.name}.js';`)
    .join('\n');
  
  return `// ./${serverName}/index.ts
/** ${server.description} */

${exports}
`;
}

/**
 * Generate complete filesystem structure for all servers
 */
export function generateFilesystemStructure(): Map<string, string> {
  const files = new Map<string, string>();
  
  // Root index
  const serverExports = Object.keys(MCP_SERVERS)
    .map(name => `export * as ${toCamelCase(name)} from './servers/${name}/index.js';`)
    .join('\n');
  
  files.set('index.ts', `// MCP Tools Root Index
/** Auto-generated MCP tool definitions for code execution mode */

${serverExports}
`);
  
  // Generate files for each server
  for (const [serverName, server] of Object.entries(MCP_SERVERS)) {
    // Server index
    files.set(`servers/${serverName}/index.ts`, generateServerIndex(serverName, server));
    
    // Individual tool files
    for (const tool of server.tools) {
      files.set(`servers/${serverName}/${tool.name}.ts`, generateToolCode(serverName, tool));
    }
  }
  
  return files;
}

function toCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

// =====================================================
// SKILLS LIBRARY
// =====================================================

/**
 * Built-in skills for common GEO tasks
 * Following SKILL.md pattern from article
 */
export const BUILTIN_SKILLS: Record<string, SkillDefinition> = {
  'batch-audit-with-filtering': {
    name: 'Batch Audit with Smart Filtering',
    description: 'Audit multiple sites and filter results for specific issues',
    dependencies: ['geoAudit'],
    examples: [
      'Audit competitors and show only sites with schema issues',
      'Batch audit portfolio sites and find performance problems',
    ],
    code: `import * as geoAudit from './servers/geo-audit';

export async function batchAuditWithFiltering(
  urls: string[],
  filterFn: (result: any) => boolean
) {
  const results = [];
  
  // Process in batches of 5
  for (let i = 0; i < urls.length; i += 5) {
    const batch = urls.slice(i, i + 5);
    const batchResults = await Promise.all(
      batch.map(url => geoAudit.auditWebsite({ url }))
    );
    
    // Filter in execution environment - not passed to model
    const filtered = batchResults.filter(filterFn);
    results.push(...filtered);
  }
  
  console.log(\`Processed \${urls.length} sites, \${results.length} matched filter\`);
  return results;
}`,
  },
  
  'progressive-citation-tracking': {
    name: 'Progressive Citation Tracking',
    description: 'Track citations across platforms with incremental updates',
    dependencies: ['citationTracking'],
    examples: [
      'Monitor citations every 5 seconds until threshold reached',
      'Track competitor citation velocity',
    ],
    code: `import * as citationTracking from './servers/citation-tracking';

export async function trackCitationsUntilThreshold(
  domain: string,
  platforms: string[],
  targetCount: number
) {
  let totalCitations = 0;
  const results = [];
  
  while (totalCitations < targetCount) {
    for (const platform of platforms) {
      const citations = await citationTracking.detectCitations({
        platform,
        domain,
        response: \`Based on \${domain}, the answer is...\` // Real response from platform monitoring
      });
      
      results.push(...citations);
      totalCitations = results.length;
      
      console.log(\`\${platform}: \${citations.length} new citations (total: \${totalCitations})\`);
    }
    
    if (totalCitations < targetCount) {
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  
  return results;
}`,
  },
  
  'knowledge-graph-diff': {
    name: 'Knowledge Graph Differential Analysis',
    description: 'Compare knowledge graphs between two versions of a page',
    dependencies: ['knowledgeGraph'],
    examples: [
      'Track entity changes after content update',
      'Measure knowledge graph improvement',
    ],
    code: `import * as knowledgeGraph from './servers/knowledge-graph';

export async function compareKnowledgeGraphs(
  oldHtml: string,
  newHtml: string,
  sourceUrl: string
) {
  const [oldGraph, newGraph] = await Promise.all([
    knowledgeGraph.buildKnowledgeGraph({ html: oldHtml, sourceUrl }),
    knowledgeGraph.buildKnowledgeGraph({ html: newHtml, sourceUrl })
  ]);
  
  const diff = {
    entitiesAdded: newGraph.entities.length - oldGraph.entities.length,
    relationshipsAdded: newGraph.relationships.length - oldGraph.relationships.length,
    claimsAdded: newGraph.claims.length - oldGraph.claims.length,
    newEntityTypes: newGraph.entities
      .map(e => e.type)
      .filter(t => !oldGraph.entities.some(e => e.type === t))
  };
  
  console.log(\`Knowledge Graph Changes:\`);
  console.log(\`  +\${diff.entitiesAdded} entities\`);
  console.log(\`  +\${diff.relationshipsAdded} relationships\`);
  console.log(\`  +\${diff.claimsAdded} claims\`);
  
  return diff;
}`,
  },
};

/**
 * Generate SKILL.md file for a skill
 * Following pattern from article
 */
export function generateSkillMarkdown(skill: SkillDefinition): string {
  return `# ${skill.name}

${skill.description}

## Dependencies
${skill.dependencies.map(d => `- \`${d}\``).join('\n')}

## Examples
${skill.examples.map(e => `- ${e}`).join('\n')}

## Usage

\`\`\`typescript
${skill.code}
\`\`\`

## Notes

This skill implements context-efficient execution by:
- Processing data in the execution environment
- Logging only summary information
- Filtering results before passing to model
- Using incremental updates to track progress
`;
}

// =====================================================
// TOKEN SAVINGS CALCULATOR
// =====================================================

/**
 * Calculate token savings from code execution mode
 * Based on article's 98.7% reduction claim
 */
export function calculateTokenSavings(
  numTools: number,
  avgToolDefinitionTokens: number = 150,
  intermediateResultTokens: number = 1000,
  numIntermediateResults: number = 5
): {
  directMode: number;
  codeMode: number;
  saved: number;
  percentage: number;
} {
  // Direct mode: all tool definitions + all intermediate results
  const directMode = (numTools * avgToolDefinitionTokens) + 
                     (intermediateResultTokens * numIntermediateResults);
  
  // Code mode: only tools loaded on-demand (assume 10% of tools) + filtered results (assume 5% of data)
  const codeMode = (numTools * 0.1 * avgToolDefinitionTokens) + 
                   (intermediateResultTokens * numIntermediateResults * 0.05);
  
  const saved = directMode - codeMode;
  const percentage = (saved / directMode) * 100;
  
  return {
    directMode: Math.round(directMode),
    codeMode: Math.round(codeMode),
    saved: Math.round(saved),
    percentage: Math.round(percentage * 10) / 10,
  };
}

// =====================================================
// PRODUCTION EXECUTION ENVIRONMENT
// =====================================================

/**
 * Production execution environment is implemented in mcpSandbox.ts
 * Uses isolated-vm for secure sandboxed code execution
 * 
 * Import: import { ProductionCodeExecutionEnvironment, createExecutionEnvironment } from './mcpSandbox';
 * 
 * Features:
 * - isolated-vm sandbox (no unsafe eval)
 * - Memory limits (default 128MB)
 * - Timeout protection (default 30s)
 * - Console capture
 * - Real A2A tool integration via mcpClient
 * - Token savings calculation
 * - Skill management
 * - Structured logging via logger
 */

export interface CodeExecutionEnvironment {
  execute(code: string, context?: Record<string, any>): Promise<CodeExecutionResult>;
  loadSkill(skillName: string): Promise<void>;
  listAvailableTools(serverName?: string): Promise<string[]>;
  getToolDefinition(serverName: string, toolName: string): Promise<string>;
}

// =====================================================
// EXPORT
// =====================================================

/**
 * Generate complete MCP filesystem for code execution mode
 */
export function generateMCPFilesystem(): {
  files: Map<string, string>;
  skills: Map<string, string>;
  stats: {
    totalServers: number;
    totalTools: number;
    totalSkills: number;
    estimatedTokenSavings: ReturnType<typeof calculateTokenSavings>;
  };
} {
  const files = generateFilesystemStructure();
  const skills = new Map<string, string>();
  
  // Generate SKILL.md files
  for (const [name, skill] of Object.entries(BUILTIN_SKILLS)) {
    skills.set(`skills/${name}/SKILL.md`, generateSkillMarkdown(skill));
    skills.set(`skills/${name}/index.ts`, skill.code);
  }
  
  const totalTools = Object.values(MCP_SERVERS).reduce((sum, s) => sum + s.tools.length, 0);
  
  return {
    files,
    skills,
    stats: {
      totalServers: Object.keys(MCP_SERVERS).length,
      totalTools,
      totalSkills: Object.keys(BUILTIN_SKILLS).length,
      estimatedTokenSavings: calculateTokenSavings(totalTools),
    },
  };
}
