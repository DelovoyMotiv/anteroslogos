/**
 * JSON Schema validator for AgentsJSON manifest validation
 * Validates generated manifests against the agents.json schema
 * 
 * @module lib/agentManifest/validator
 * @version 1.0.0
 */

import { z } from 'zod';
import type { AgentsJSON } from './types';

/**
 * Zod schema for web semantic roles
 */
const WebSemanticRoleSchema = z.enum(['documentation', 'pricing', 'about', 'product', 'contact', 'support']);

/**
 * Zod schema for HTTP methods
 */
const HttpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'DELETE']);

/**
 * Zod schema for knowledge entries
 */
const KnowledgeEntrySchema = z.object({
  role: WebSemanticRoleSchema,
  url: z.string().min(1, 'URL is required'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
});

/**
 * Zod schema for action entries
 */
const ActionSchema = z.object({
  name: z.string().min(1, 'Action name is required'),
  type: HttpMethodSchema,
  path: z.string().min(1, 'Action path is required'),
});

/**
 * Zod schema for identity information
 */
const AgentIdentitySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  tags: z.array(z.string()).min(1, 'At least one tag is required'),
});

/**
 * Complete Zod schema for AgentsJSON
 */
export const AgentsJSONSchema = z.object({
  $schema: z.literal('https://anoteroslogos.com/schemas/agents-v1.json'),
  version: z.literal('1.0'),
  identity: AgentIdentitySchema,
  knowledge: z.array(KnowledgeEntrySchema).min(1, 'At least one knowledge entry is required'),
  actions: z.array(ActionSchema),
});

/**
 * Validation result type
 */
export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: z.ZodError };

/**
 * Validates an AgentsJSON manifest against the schema
 * 
 * @param input - The manifest object to validate
 * @returns Validation result with typed data or error
 */
export function validateManifest(input: unknown): ValidationResult<AgentsJSON> {
  const result = AgentsJSONSchema.safeParse(input);
  if (result.success) {
    // Zod validates the structure, so we can safely cast to AgentsJSON
    return { success: true, data: result.data as AgentsJSON };
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
 * Type guard to check if an object is a valid AgentsJSON manifest
 * 
 * @param input - Object to check
 * @returns True if input is a valid AgentsJSON manifest
 */
export function isValidManifest(input: unknown): input is AgentsJSON {
  const result = validateManifest(input);
  return result.success;
}
