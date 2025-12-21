/**
 * JSON Schema validator for LogosJSON manifest validation
 * Validates generated manifests against the logos.json schema
 * 
 * @module lib/agentManifest/validator
 * @version 1.0.0
 */

import { z } from 'zod';
import type { LogosJSON } from './types';

/**
 * Zod schema for semantic roles
 */
const SemanticRoleSchema = z.enum(['axiom', 'theorem', 'lemma', 'corollary', 'definition']);

/**
 * Zod schema for authority levels
 */
const AuthorityLevelSchema = z.enum(['self-declared', 'verified', 'authoritative']);

/**
 * Zod schema for crawling policies
 */
const CrawlingPolicySchema = z.enum([
  'allow-high-frequency',
  'allow-standard',
  'allow-low-frequency',
  'disallow'
]);

/**
 * Zod schema for attribution policies
 */
const AttributionPolicySchema = z.enum([
  'require-link',
  'require-citation',
  'optional',
  'none'
]);

/**
 * Zod schema for knowledge root entries
 */
const KnowledgeRootSchema = z.object({
  url: z.string().min(1, 'URL is required'),
  semantic_role: SemanticRoleSchema,
  instruction: z.string().min(10, 'Instruction must be at least 10 characters'),
});

/**
 * Zod schema for manifest metadata
 */
const LogosMetadataSchema = z.object({
  version: z.string().min(1, 'Version is required'),
  updated: z.string().datetime('Invalid ISO 8601 date format'),
  authority_level: AuthorityLevelSchema,
});

/**
 * Zod schema for identity information
 */
const LogosIdentitySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  domain_focus: z.array(z.string()).min(1, 'At least one domain focus tag is required'),
});

/**
 * Zod schema for knowledge topology
 */
const KnowledgeTopologySchema = z.object({
  roots: z.array(KnowledgeRootSchema).min(1, 'At least one knowledge root is required'),
});

/**
 * Zod schema for directives
 */
const LogosDirectivesSchema = z.object({
  crawling: CrawlingPolicySchema,
  attribution: AttributionPolicySchema,
});

/**
 * Complete Zod schema for LogosJSON
 */
export const LogosJSONSchema = z.object({
  $schema: z.literal('https://anoteroslogos.com/schemas/logos-v1.json'),
  meta: LogosMetadataSchema,
  identity: LogosIdentitySchema,
  knowledge_topology: KnowledgeTopologySchema,
  directives: LogosDirectivesSchema,
});

/**
 * Validation result type
 */
export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: z.ZodError };

/**
 * Validates a LogosJSON manifest against the schema
 * 
 * @param input - The manifest object to validate
 * @returns Validation result with typed data or error
 */
export function validateManifest(input: unknown): ValidationResult<LogosJSON> {
  const result = LogosJSONSchema.safeParse(input);
  if (result.success) {
    // Zod validates the structure, so we can safely cast to LogosJSON
    return { success: true, data: result.data as LogosJSON };
  }
  return { success: false, error: result.error };
}

/**
 * Formats validation errors into a readable structure
 * 
 * @param error - Zod validation error
 * @returns Formatted error object with message and error details
 */
export function formatValidationError(error: z.ZodError): {
  message: string;
  errors: Array<{ path: string; message: string }>;
} {
  return {
    message: 'Manifest validation failed',
    errors: error.errors.map(err => ({
      path: err.path.join('.'),
      message: err.message,
    })),
  };
}

/**
 * Type guard to check if an object is a valid LogosJSON manifest
 * 
 * @param input - Object to check
 * @returns True if input is a valid LogosJSON manifest
 */
export function isValidManifest(input: unknown): input is LogosJSON {
  const result = validateManifest(input);
  return result.success;
}
