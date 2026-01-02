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
  ScrapedContent,
} from './types';

// Export error types and classes
export {
  ScrapeError,
  ManifestGenerationError,
  ErrorCode,
} from './errors';

export type { ScrapeErrorCode } from './errors';

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
  InvalidJSONError,
  SchemaValidationError,
} from './generator';

// Note: ManifestGenerationError is exported from './errors' above (new version)
// The old version from './generator' is kept for backward compatibility but not re-exported

// Export prompt builders (for testing)
export {
  buildSystemPrompt,
  buildUserPrompt,
} from './prompts';

// Export scraping service
export {
  ScrapingService,
} from './scraping';

// Export validation services
export {
  LivenessValidator,
  EnhancedValidator,
} from './validation';

export type { EnhancedValidationResult } from './validation';

// Export orchestrator
export {
  ManifestGeneratorOrchestrator,
} from './orchestrator';
