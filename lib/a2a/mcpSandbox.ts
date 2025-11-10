/**
 * MCP Sandbox - Production Code Execution Environment
 * Uses isolated-vm for secure sandboxed execution
 * No eval(), full isolation, memory limits
 */

import ivm from 'isolated-vm';
import { callA2ATool } from './mcpClient';
import { logger } from './logger';

// =====================================================
// TYPES
// =====================================================

export interface ExecutionResult {
  output: string[];
  returnValue: any;
  executionTimeMs: number;
  memoryUsedMB: number;
  tokenSavings: {
    directMode: number;
    codeMode: number;
    saved: number;
    percentage: number;
  };
}

export interface SandboxOptions {
  memoryLimit: number; // MB
  timeoutMs: number;
  allowNetworkAccess: boolean;
}

export interface SkillDefinition {
  name: string;
  description: string;
  parameters: Array<{ name: string; type: string; required: boolean }>;
  code: string;
}

// =====================================================
// PRODUCTION EXECUTION ENVIRONMENT
// =====================================================

export class ProductionCodeExecutionEnvironment {
  private isolate: ivm.Isolate;
  private options: SandboxOptions;
  private skills: Map<string, SkillDefinition> = new Map();
  
  constructor(options: Partial<SandboxOptions> = {}) {
    this.options = {
      memoryLimit: options.memoryLimit || 128, // 128MB default
      timeoutMs: options.timeoutMs || 30000, // 30 seconds default
      allowNetworkAccess: options.allowNetworkAccess ?? true,
    };
    
    this.isolate = new ivm.Isolate({ memoryLimit: this.options.memoryLimit });
    
    logger.info('ProductionCodeExecutionEnvironment initialized', {
      memoryLimit: this.options.memoryLimit,
      timeout: this.options.timeoutMs,
      networkAccess: this.options.allowNetworkAccess,
    });
  }
  
  /**
   * Execute TypeScript/JavaScript code in isolated sandbox
   */
  async execute(code: string, context: Record<string, any> = {}): Promise<ExecutionResult> {
    const startTime = Date.now();
    const output: string[] = [];
    
    logger.info('Executing code in sandbox', {
      codeLength: code.length,
      contextKeys: Object.keys(context),
    });
    
    try {
      // Create isolated context
      const ivmContext = await this.isolate.createContext();
      const jail = ivmContext.global;
      
      // Setup console capture
      await jail.set('global', jail.derefInto());
      
      const consoleLog = new ivm.Reference((msg: string) => {
        output.push(msg);
        logger.debug('Sandbox console.log', { message: msg });
      });
      
      const consoleError = new ivm.Reference((msg: string) => {
        output.push(`ERROR: ${msg}`);
        logger.warn('Sandbox console.error', { message: msg });
      });
      
      await jail.set('_consoleLog', consoleLog);
      await jail.set('_consoleError', consoleError);
      
      await ivmContext.eval(`
        global.console = {
          log: (...args) => _consoleLog.applySync(undefined, [args.map(String).join(' ')]),
          error: (...args) => _consoleError.applySync(undefined, [args.map(String).join(' ')]),
        };
      `);
      
      // Setup callA2ATool bridge
      const toolCallBridge = new ivm.Reference(async (method: string, params: string) => {
        const parsedParams = JSON.parse(params);
        logger.debug('Tool call from sandbox', { method, params: parsedParams });
        
        if (!this.options.allowNetworkAccess) {
          throw new Error('Network access disabled in sandbox');
        }
        
        const result = await callA2ATool(method, parsedParams);
        return JSON.stringify(result);
      });
      
      await jail.set('_callA2ATool', toolCallBridge);
      
      await ivmContext.eval(`
        global.callA2ATool = async (method, params) => {
          const resultStr = await _callA2ATool.apply(undefined, [method, JSON.stringify(params)]);
          return JSON.parse(resultStr);
        };
      `);
      
      // Inject context variables
      for (const [key, value] of Object.entries(context)) {
        await jail.set(key, new ivm.ExternalCopy(value).copyInto());
      }
      
      // Execute code with timeout
      const script = await this.isolate.compileScript(code);
      const result = await script.run(ivmContext, { timeout: this.options.timeoutMs });
      
      const executionTime = Date.now() - startTime;
      const memoryUsed = this.isolate.getHeapStatisticsSync().used_heap_size / (1024 * 1024);
      
      // Calculate token savings
      const tokenSavings = this.calculateTokenSavings(output.length);
      
      logger.info('Code execution completed', {
        executionTimeMs: executionTime,
        memoryUsedMB: memoryUsed,
        outputLines: output.length,
        tokenSavings,
      });
      
      return {
        output,
        returnValue: result,
        executionTimeMs: executionTime,
        memoryUsedMB: memoryUsed,
        tokenSavings,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error('Code execution failed', {
        error: error instanceof Error ? error.message : String(error),
        executionTimeMs: executionTime,
      });
      
      throw new Error(`Execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Load reusable skill into environment
   */
  async loadSkill(skill: SkillDefinition): Promise<void> {
    logger.info('Loading skill', {
      name: skill.name,
      parameters: skill.parameters.map(p => p.name),
    });
    
    // Validate skill code can compile
    try {
      await this.isolate.compileScript(skill.code);
    } catch (error) {
      logger.error('Skill validation failed', {
        skill: skill.name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Invalid skill code: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    this.skills.set(skill.name, skill);
    logger.info('Skill loaded successfully', { name: skill.name });
  }
  
  /**
   * Save skill for reuse
   */
  saveSkill(name: string, description: string, parameters: Array<{ name: string; type: string; required: boolean }>, code: string): SkillDefinition {
    const skill: SkillDefinition = {
      name,
      description,
      parameters,
      code,
    };
    
    this.skills.set(name, skill);
    
    logger.info('Skill saved', {
      name,
      parameterCount: parameters.length,
      codeLength: code.length,
    });
    
    return skill;
  }
  
  /**
   * List available tools from MCP servers
   */
  listAvailableTools(): Array<{ server: string; tool: string; method: string }> {
    const tools = [
      // Geo Audit
      { server: 'geo-audit', tool: 'auditWebsite', method: 'geo-audit__auditWebsite' },
      { server: 'geo-audit', tool: 'batchAudit', method: 'geo-audit__batchAudit' },
      { server: 'geo-audit', tool: 'getAuditHistory', method: 'geo-audit__getAuditHistory' },
      
      // Knowledge Graph
      { server: 'knowledge-graph', tool: 'buildKnowledgeGraph', method: 'knowledge-graph__buildKnowledgeGraph' },
      { server: 'knowledge-graph', tool: 'queryKnowledgeGraph', method: 'knowledge-graph__queryKnowledgeGraph' },
      
      // Citation Tracking
      { server: 'citation-tracking', tool: 'detectCitations', method: 'citation-tracking__detectCitations' },
      { server: 'citation-tracking', tool: 'calculateCitationROI', method: 'citation-tracking__calculateCitationROI' },
      
      // AID Discovery
      { server: 'aidiscovery', tool: 'discoverAIDAgent', method: 'aidiscovery__discoverAIDAgent' },
      { server: 'aidiscovery', tool: 'validateAIDConfig', method: 'aidiscovery__validateAIDConfig' },
    ];
    
    return tools;
  }
  
  /**
   * Get tool definition for progressive disclosure
   */
  getToolDefinition(method: string): { schema: any; example: string } | null {
    const definitions: Record<string, { schema: any; example: string }> = {
      'geo-audit__auditWebsite': {
        schema: {
          type: 'function',
          function: {
            name: 'geo-audit__auditWebsite',
            description: 'Perform comprehensive GEO audit on a website',
            parameters: {
              type: 'object',
              properties: {
                url: { type: 'string', description: 'Website URL to audit' },
                useAI: { type: 'boolean', description: 'Use AI-powered analysis', default: false },
              },
              required: ['url'],
            },
          },
        },
        example: `const result = await callA2ATool('geo-audit__auditWebsite', { url: 'https://example.com' });`,
      },
      'geo-audit__batchAudit': {
        schema: {
          type: 'function',
          function: {
            name: 'geo-audit__batchAudit',
            description: 'Audit multiple websites in batch',
            parameters: {
              type: 'object',
              properties: {
                urls: { type: 'array', items: { type: 'string' }, description: 'Array of URLs to audit (max 100)' },
                maxConcurrent: { type: 'number', description: 'Max concurrent requests', default: 5 },
              },
              required: ['urls'],
            },
          },
        },
        example: `const result = await callA2ATool('geo-audit__batchAudit', { urls: ['https://a.com', 'https://b.com'], maxConcurrent: 3 });`,
      },
      'citation-tracking__detectCitations': {
        schema: {
          type: 'function',
          function: {
            name: 'citation-tracking__detectCitations',
            description: 'Detect citations in AI platform response',
            parameters: {
              type: 'object',
              properties: {
                platform: { type: 'string', enum: ['perplexity', 'chatgpt', 'gemini', 'claude'], description: 'AI platform name' },
                response: { type: 'string', description: 'AI response text' },
                domain: { type: 'string', description: 'Domain to search for' },
              },
              required: ['platform', 'response', 'domain'],
            },
          },
        },
        example: `const result = await callA2ATool('citation-tracking__detectCitations', { platform: 'perplexity', response: 'According to example.com...', domain: 'example.com' });`,
      },
    };
    
    return definitions[method] || null;
  }
  
  /**
   * Calculate token savings vs direct mode
   */
  private calculateTokenSavings(outputLines: number): {
    directMode: number;
    codeMode: number;
    saved: number;
    percentage: number;
  } {
    // Direct mode: All tool definitions + full results
    const numTools = 11;
    const avgToolDefTokens = 150;
    const avgResultTokens = 1000;
    const directModeTokens = (numTools * avgToolDefTokens) + (outputLines * avgResultTokens);
    
    // Code mode: Minimal tool definitions + filtered results
    const codeToolDefRatio = 0.1; // Only load 10% of tools progressively
    const codeResultRatio = 0.05; // Filter 95% of intermediate data
    const codeModeTokens = (numTools * codeToolDefRatio * avgToolDefTokens) + (outputLines * avgResultTokens * codeResultRatio);
    
    const saved = directModeTokens - codeModeTokens;
    const percentage = (saved / directModeTokens) * 100;
    
    return {
      directMode: Math.round(directModeTokens),
      codeMode: Math.round(codeModeTokens),
      saved: Math.round(saved),
      percentage: Math.round(percentage * 10) / 10,
    };
  }
  
  /**
   * Get loaded skills
   */
  getSkills(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }
  
  /**
   * Dispose isolate and free resources
   */
  dispose(): void {
    logger.info('Disposing code execution environment');
    this.isolate.dispose();
  }
}

// =====================================================
// FACTORY
// =====================================================

/**
 * Create production execution environment with default settings
 */
export function createExecutionEnvironment(options?: Partial<SandboxOptions>): ProductionCodeExecutionEnvironment {
  return new ProductionCodeExecutionEnvironment(options);
}
