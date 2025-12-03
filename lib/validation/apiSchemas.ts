/**
 * Zod Validation Schemas for All API Endpoints
 * Comprehensive input validation for production security
 * 
 * @module lib/validation/apiSchemas
 * @version 1.0.0
 */

import { z } from 'zod';

// =====================================================
// COMMON SCHEMAS
// =====================================================

export const AidSchema = z.string()
  .regex(/^aid:\/\/[a-z0-9-]+\/[a-f0-9]{12}$/, 'Invalid AID format')
  .describe('Agent Identity URI');

export const Ed25519PublicKeySchema = z.string()
  .length(64)
  .regex(/^[a-f0-9]{64}$/, 'Invalid Ed25519 public key')
  .describe('Ed25519 public key (hex)');

export const Ed25519PrivateKeySchema = z.string()
  .length(64)
  .regex(/^[a-f0-9]{64}$/, 'Invalid Ed25519 private key')
  .describe('Ed25519 private key (hex)');

export const Ed25519SignatureSchema = z.string()
  .length(128)
  .regex(/^[a-f0-9]{128}$/, 'Invalid Ed25519 signature')
  .describe('Ed25519 signature (hex)');

export const ChallengeSchema = z.string()
  .regex(/^anoteroslogos:[a-z0-9]+:[a-f0-9]{32}:[a-f0-9]{16}$/, 'Invalid challenge format')
  .describe('Challenge string');

export const UrlSchema = z.string()
  .url('Invalid URL')
  .max(2048, 'URL too long')
  .describe('HTTP/HTTPS URL');

export const JsonRpcVersionSchema = z.literal('2.0');

export const JsonRpcIdSchema = z.union([z.string(), z.number()]);

// =====================================================
// JSON-RPC 2.0 SCHEMAS
// =====================================================

export const JsonRpcRequestSchema = z.object({
  jsonrpc: JsonRpcVersionSchema,
  id: JsonRpcIdSchema,
  method: z.string().min(1).max(128),
  params: z.record(z.unknown()).optional(),
});

export const JsonRpcResponseSchema = z.object({
  jsonrpc: JsonRpcVersionSchema,
  id: JsonRpcIdSchema.nullable(),
  result: z.unknown().optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.unknown().optional(),
  }).optional(),
});

// =====================================================
// A2A CASCADE SCHEMAS
// =====================================================

export const UCPTCascadeMessageSchema = z.object({
  type: z.literal('ucpt-cascade'),
  ucpt: z.string().min(1).max(10000),
  sourceAid: AidSchema,
  tool: z.string().min(1).max(128),
  ttl: z.number().int().min(0).max(7),
  timestamp: z.number().int().positive(),
});

export const A2ACascadeRequestSchema = JsonRpcRequestSchema.extend({
  method: z.literal('a2a.mesh.cascade'),
  params: UCPTCascadeMessageSchema,
});

// =====================================================
// MCP PROTOCOL SCHEMAS
// =====================================================

export const McpInitializeParamsSchema = z.object({
  protocolVersion: z.string().optional(),
  capabilities: z.record(z.unknown()).optional(),
  clientInfo: z.object({
    name: z.string(),
    version: z.string(),
  }).optional(),
});

export const McpToolsCallParamsSchema = z.object({
  name: z.string().min(1).max(128),
  arguments: z.record(z.unknown()).optional().default({}),
});

export const McpResourcesReadParamsSchema = z.object({
  uri: z.string().min(1).max(512),
});

export const McpPromptsGetParamsSchema = z.object({
  name: z.string().min(1).max(128),
  arguments: z.record(z.string()).optional(),
});

// =====================================================
// MCP TOOL EXECUTION SCHEMAS
// =====================================================

export const ToolSearchRegexParamsSchema = z.object({
  query: z.string().min(1).max(256),
  top_k: z.number().int().min(1).max(50).optional().default(5),
});

export const CodeExecutionParamsSchema = z.object({
  code: z.string().min(1).max(100000),
  language: z.literal('javascript'),
  timeout_ms: z.number().int().min(100).max(30000).optional(),
  tenant_id: z.string().min(1).max(128).optional(),
});

export const AuditSiteParamsSchema = z.object({
  url: UrlSchema,
  useAI: z.boolean().optional().default(false),
});

export const GetGraphParamsSchema = z.object({
  url: UrlSchema,
});

export const PredictCitationParamsSchema = z.object({
  url: UrlSchema,
  platform: z.enum(['all', 'Claude', 'ChatGPT', 'Perplexity', 'Gemini', 'Meta']).optional().default('all'),
});

// =====================================================
// HANDSHAKE SCHEMAS
// =====================================================

export const HandshakeNewAgentSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  description: z.string().max(512).optional(),
});

export const HandshakeGetChallengeSchema = z.object({
  aid: AidSchema,
});

export const HandshakeVerifySignatureSchema = z.object({
  aid: AidSchema,
  publicKey: Ed25519PublicKeySchema,
  challenge: ChallengeSchema,
  signature: Ed25519SignatureSchema,
});

export const HandshakeRequestSchema = z.union([
  HandshakeNewAgentSchema,
  HandshakeGetChallengeSchema,
  HandshakeVerifySignatureSchema,
]);

// =====================================================
// CHALLENGE SCHEMAS
// =====================================================

export const ChallengeGetSchema = z.object({
  aid: AidSchema,
});

export const ChallengeVerifySchema = z.object({
  aid: AidSchema,
  challenge: ChallengeSchema,
  publicKey: Ed25519PublicKeySchema,
  signature: Ed25519SignatureSchema,
});

// =====================================================
// PUBLIC-AID SCHEMAS
// =====================================================

export const PublicAidCreateSchema = z.object({
  name: z.string().min(1).max(64).optional().default('agent'),
  description: z.string().max(512).optional().default(''),
});

// =====================================================
// PROGRAMMATIC TOOL CALLING SCHEMAS
// =====================================================

export const ProgrammaticExecutionSchema = z.object({
  code: z.string().min(1).max(100000),
  language: z.literal('javascript').optional().default('javascript'),
  timeout: z.number().int().min(100).max(30000).optional(),
});

// =====================================================
// VALIDATION HELPERS
// =====================================================

export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: z.ZodError };

export function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): ValidationResult<T> {
  const result = schema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function formatValidationError(error: z.ZodError): {
  message: string;
  errors: Array<{ path: string; message: string }>;
} {
  return {
    message: 'Validation failed',
    errors: error.errors.map(err => ({
      path: err.path.join('.'),
      message: err.message,
    })),
  };
}
