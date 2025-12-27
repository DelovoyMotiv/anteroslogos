/**
 * Agent Manifest Generator
 * Public API for generating agents.json files
 * 
 * @module lib/agentManifest
 * @version 1.0.0
 */

// Export types
export type {
  AgentsJSON,
  AgentIdentity,
  KnowledgeEntry,
  Action,
  WebSemanticRole,
  HttpMethod,
} from './types';

// Export validation functions
export {
  validateManifest,
  formatValidationError,
  isValidManifest,
  AgentsJSONSchema,
} from './validator';

export type { ValidationResult } from './validator';

// Export URL utilities
export {
  validateManifestUrl,
  normalizeManifestUrl,
  extractDomain,
  isAccessibleUrl,
} from './urlUtils';

// Export generation functions
export {
  generateManifest,
  ManifestGenerationError,
  InvalidJSONError,
  SchemaValidationError,
} from './generator';

// Export prompt builders (for testing)
export {
  buildSystemPrompt,
  buildUserPrompt,
} from './prompts';
