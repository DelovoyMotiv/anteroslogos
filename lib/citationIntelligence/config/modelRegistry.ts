/**
 * Model Registry
 * Central configuration for multi-model LLM integration
 * 
 * This module provides:
 * - Model pricing information for cost tracking
 * - Model registry with task-specific configurations
 * - Model selection logic based on task type
 * - Fallback model resolution
 * 
 * @module lib/citationIntelligence/config/modelRegistry
 */

import type { TaskType, ModelPricing, ModelConfig } from '../types/llm.types';

// ============================================================================
// Model Pricing Configuration
// ============================================================================

/**
 * MODEL_PRICING
 * Pricing information for all supported models
 * Costs are in USD per 1 million tokens
 * 
 * Pricing is based on OpenRouter's current rates (as of 2025-12)
 * Note: Prices may change; update this configuration accordingly
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Anthropic Claude Models
  'anthropic/claude-sonnet-4.5': {
    input: 3.0,
    output: 15.0,
    cached: 0.3, // 10x cheaper for cached tokens
  },
  'anthropic/claude-3.5-sonnet': {
    input: 3.0,
    output: 15.0,
    cached: 0.3,
  },
  'anthropic/claude-3-opus': {
    input: 15.0,
    output: 75.0,
    cached: 1.5,
  },
  
  // OpenAI GPT Models
  'openai/gpt-5.1': {
    input: 10.0,
    output: 30.0,
  },
  'openai/gpt-4-turbo': {
    input: 10.0,
    output: 30.0,
  },
  'openai/gpt-4': {
    input: 30.0,
    output: 60.0,
  },
  'openai/gpt-3.5-turbo': {
    input: 0.5,
    output: 1.5,
  },
  
  // Google Gemini Models
  'google/gemini-3-pro-preview': {
    input: 1.25,
    output: 5.0,
    cached: 0.125,
  },
  'google/gemini-pro-1.5': {
    input: 1.25,
    output: 5.0,
    cached: 0.125,
  },
  'google/gemini-pro': {
    input: 0.5,
    output: 1.5,
  },
  
  // X.AI Grok Models
  'x-ai/grok-4': {
    input: 5.0,
    output: 15.0,
  },
  'x-ai/grok-3': {
    input: 2.5,
    output: 7.5,
  },
  
  // Meta Llama Models (Free tier)
  'meta-llama/llama-3.2-3b-instruct:free': {
    input: 0.0,
    output: 0.0,
  },
  'meta-llama/llama-3.2-1b-instruct:free': {
    input: 0.0,
    output: 0.0,
  },
  
  // Fallback/Default pricing for unknown models
  'unknown': {
    input: 5.0,
    output: 15.0,
  },
};

// ============================================================================
// Model Registry Configuration
// ============================================================================

/**
 * MODEL_REGISTRY
 * Configuration for all models in the system
 * Maps task types to specialized models with fallback options
 * 
 * Each model is optimized for specific tasks:
 * - content_opt: Content optimization and variation generation
 * - fact_check: Factual accuracy validation and entity extraction
 * - schema_gen: JSON-LD schema generation
 * - analysis: Competitive analysis and strategic insights
 */
export const MODEL_REGISTRY: Record<TaskType, ModelConfig> = {
  content_opt: {
    modelId: 'anthropic/claude-sonnet-4.5',
    displayName: 'Claude Sonnet 4.5',
    primary: 'anthropic/claude-sonnet-4.5',
    fallback: 'anthropic/claude-3.5-sonnet',
    pricing: MODEL_PRICING['anthropic/claude-sonnet-4.5'],
    taskTypes: ['content_opt'],
    parameters: {
      maxTokens: 4096,
      temperature: 0.7,
      topP: 0.9,
    },
    capabilities: {
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: true,
      maxContextLength: 200000,
    },
  },
  
  fact_check: {
    modelId: 'openai/gpt-5.1',
    displayName: 'GPT-5.1',
    primary: 'openai/gpt-5.1',
    fallback: 'openai/gpt-4-turbo',
    pricing: MODEL_PRICING['openai/gpt-5.1'],
    taskTypes: ['fact_check'],
    parameters: {
      maxTokens: 2048,
      temperature: 0.3, // Lower temperature for factual accuracy
      topP: 0.95,
    },
    capabilities: {
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: true,
      maxContextLength: 128000,
    },
  },
  
  schema_gen: {
    modelId: 'google/gemini-3-pro-preview',
    displayName: 'Gemini 3 Pro Preview',
    primary: 'google/gemini-3-pro-preview',
    fallback: 'google/gemini-pro-1.5',
    pricing: MODEL_PRICING['google/gemini-3-pro-preview'],
    taskTypes: ['schema_gen'],
    parameters: {
      maxTokens: 8192,
      temperature: 0.2, // Very low temperature for structured output
      topP: 0.95,
    },
    capabilities: {
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: true,
      maxContextLength: 1000000,
    },
  },
  
  analysis: {
    modelId: 'x-ai/grok-4',
    displayName: 'Grok 4',
    primary: 'x-ai/grok-4',
    fallback: 'anthropic/claude-3.5-sonnet',
    pricing: MODEL_PRICING['x-ai/grok-4'],
    taskTypes: ['analysis'],
    parameters: {
      maxTokens: 4096,
      temperature: 0.5,
      topP: 0.9,
    },
    capabilities: {
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: true,
      maxContextLength: 128000,
    },
  },
};

// ============================================================================
// Model Selection Functions
// ============================================================================

/**
 * Get the appropriate model for a given task type
 * 
 * @param taskType - The type of task to perform
 * @returns The model identifier (e.g., 'anthropic/claude-sonnet-4.5')
 * @throws Error if task type is not recognized
 * 
 * @example
 * ```typescript
 * const model = getModelForTask('content_opt');
 * // Returns: 'anthropic/claude-sonnet-4.5'
 * ```
 */
export function getModelForTask(taskType: TaskType): string {
  const config = MODEL_REGISTRY[taskType];
  
  if (!config) {
    throw new Error(`Unknown task type: ${taskType}. Valid types: ${Object.keys(MODEL_REGISTRY).join(', ')}`);
  }
  
  return config.primary;
}

/**
 * Get the fallback model for a given model
 * 
 * @param model - The primary model identifier
 * @returns The fallback model identifier, or the original model if no fallback is configured
 * 
 * @example
 * ```typescript
 * const fallback = getFallbackModel('anthropic/claude-sonnet-4.5');
 * // Returns: 'anthropic/claude-3.5-sonnet'
 * ```
 */
export function getFallbackModel(model: string): string {
  // Find the config that has this model as primary
  const config = Object.values(MODEL_REGISTRY).find(c => c.primary === model);
  
  if (!config) {
    // If model not found in registry, return a safe default fallback
    console.warn(`Model ${model} not found in registry, using default fallback`);
    return 'anthropic/claude-3.5-sonnet';
  }
  
  return config.fallback;
}

/**
 * Get pricing information for a given model
 * 
 * @param model - The model identifier
 * @returns Pricing information (input/output costs per 1M tokens)
 * 
 * @example
 * ```typescript
 * const pricing = getModelPricing('anthropic/claude-sonnet-4.5');
 * // Returns: { input: 3.0, output: 15.0, cached: 0.3 }
 * ```
 */
export function getModelPricing(model: string): ModelPricing {
  const pricing = MODEL_PRICING[model];
  
  if (!pricing) {
    console.warn(`Pricing not found for model ${model}, using default pricing`);
    return MODEL_PRICING['unknown'];
  }
  
  return pricing;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the complete configuration for a given task type
 * 
 * @param taskType - The type of task to perform
 * @returns Complete model configuration
 * @throws Error if task type is not recognized
 * 
 * @example
 * ```typescript
 * const config = getModelConfig('content_opt');
 * // Returns: { modelId: 'anthropic/claude-sonnet-4.5', ... }
 * ```
 */
export function getModelConfig(taskType: TaskType): ModelConfig {
  const config = MODEL_REGISTRY[taskType];
  
  if (!config) {
    throw new Error(`Unknown task type: ${taskType}. Valid types: ${Object.keys(MODEL_REGISTRY).join(', ')}`);
  }
  
  return config;
}

/**
 * Get all available task types
 * 
 * @returns Array of all supported task types
 * 
 * @example
 * ```typescript
 * const taskTypes = getAvailableTaskTypes();
 * // Returns: ['content_opt', 'fact_check', 'schema_gen', 'analysis']
 * ```
 */
export function getAvailableTaskTypes(): TaskType[] {
  return Object.keys(MODEL_REGISTRY) as TaskType[];
}

/**
 * Check if a task type is supported
 * 
 * @param taskType - The task type to check
 * @returns True if the task type is supported
 * 
 * @example
 * ```typescript
 * const isSupported = isTaskTypeSupported('content_opt');
 * // Returns: true
 * ```
 */
export function isTaskTypeSupported(taskType: string): taskType is TaskType {
  return taskType in MODEL_REGISTRY;
}

/**
 * Get all models in the registry
 * 
 * @returns Array of all model identifiers
 * 
 * @example
 * ```typescript
 * const models = getAllModels();
 * // Returns: ['anthropic/claude-sonnet-4.5', 'openai/gpt-5.1', ...]
 * ```
 */
export function getAllModels(): string[] {
  return Object.values(MODEL_REGISTRY).map(config => config.primary);
}

/**
 * Calculate estimated cost for a request
 * 
 * @param model - The model identifier
 * @param promptTokens - Number of prompt tokens
 * @param completionTokens - Number of completion tokens
 * @param cachedTokens - Number of cached tokens (optional)
 * @returns Estimated cost in USD
 * 
 * @example
 * ```typescript
 * const cost = calculateEstimatedCost('anthropic/claude-sonnet-4.5', 1000, 500);
 * // Returns: 0.0105 (1000 * 3.0 / 1M + 500 * 15.0 / 1M)
 * ```
 */
export function calculateEstimatedCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
  cachedTokens: number = 0
): number {
  const pricing = getModelPricing(model);
  
  let cost = 0;
  
  // Calculate input cost
  cost += (promptTokens * pricing.input) / 1_000_000;
  
  // Calculate output cost
  cost += (completionTokens * pricing.output) / 1_000_000;
  
  // Calculate cached token cost (if applicable)
  if (cachedTokens > 0 && pricing.cached) {
    cost += (cachedTokens * pricing.cached) / 1_000_000;
  }
  
  return cost;
}

// ============================================================================
// Environment Variable Integration
// ============================================================================

/**
 * Safely get environment variable from import.meta.env or process.env
 */
function getEnvVar(key: string): string | undefined {
  try {
    // Try import.meta.env first (browser/Vite)
    if (typeof import.meta !== 'undefined' && (import.meta as any)?.env) {
      return (import.meta as any).env[key];
    }
  } catch {
    // import.meta not available, fall through to process.env
  }
  
  // Fallback to process.env (Node.js/Vercel)
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  
  return undefined;
}

/**
 * Get model from environment variable or use default from registry
 * 
 * @param taskType - The type of task to perform
 * @returns The model identifier from environment or registry default
 * 
 * @example
 * ```typescript
 * const model = getModelFromEnv('content_opt');
 * // Returns: process.env.VITE_OPENROUTER_MODEL_CONTENT_OPT || 'anthropic/claude-sonnet-4.5'
 * ```
 */
export function getModelFromEnv(taskType: TaskType): string {
  const envVarMap: Record<TaskType, string> = {
    content_opt: 'VITE_OPENROUTER_MODEL_CONTENT_OPT',
    fact_check: 'VITE_OPENROUTER_MODEL_FACT_CHECK',
    schema_gen: 'VITE_OPENROUTER_MODEL_SCHEMA',
    analysis: 'VITE_OPENROUTER_MODEL_ANALYSIS',
  };
  
  const envVar = envVarMap[taskType];
  const envValue = getEnvVar(envVar);
  
  // Return environment value if set, otherwise use registry default
  return envValue || getModelForTask(taskType);
}

/**
 * Validate that all required environment variables are set
 * 
 * @returns Object with validation results
 * 
 * @example
 * ```typescript
 * const validation = validateEnvironmentConfig();
 * if (!validation.valid) {
 *   console.error('Missing environment variables:', validation.missing);
 * }
 * ```
 */
export function validateEnvironmentConfig(): {
  valid: boolean;
  missing: string[];
  warnings: string[];
} {
  const required = [
    'VITE_OPENROUTER_API_KEY',
    'OPENROUTER_API_KEY', // Also check non-prefixed version
  ];
  
  const optional = [
    'VITE_OPENROUTER_MODEL_CONTENT_OPT',
    'VITE_OPENROUTER_MODEL_FACT_CHECK',
    'VITE_OPENROUTER_MODEL_SCHEMA',
    'VITE_OPENROUTER_MODEL_ANALYSIS',
    'VITE_OPENROUTER_RATE_LIMIT_RPM',
    'VITE_OPENROUTER_BUDGET_LIMIT',
    'VITE_OPENROUTER_ALERT_THRESHOLD',
  ];
  
  const missing: string[] = [];
  const warnings: string[] = [];
  
  // Check required variables (at least one must be set)
  const hasApiKey = required.some(varName => {
    const value = getEnvVar(varName);
    return !!value;
  });
  
  if (!hasApiKey) {
    missing.push('VITE_OPENROUTER_API_KEY or OPENROUTER_API_KEY');
  }
  
  // Check optional variables (warnings only)
  for (const varName of optional) {
    const value = getEnvVar(varName);
    if (!value) {
      warnings.push(`${varName} not set, using default value`);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}
