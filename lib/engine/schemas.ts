/**
 * Zod schemas for Agent Middleware API validation
 * Provides runtime validation for requests and responses
 */

import { z } from 'zod';

/**
 * Schema for extraction mode
 */
export const extractionModeSchema = z.enum(['fast', 'deep']);

/**
 * Schema for output format
 */
export const outputFormatSchema = z.enum(['json-ld', 'compact']);

/**
 * Schema for URL validation
 */
export const urlSchema = z.string().url().refine(
  (url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  },
  { message: 'URL must use HTTP or HTTPS protocol' }
);

/**
 * Schema for wrap request
 */
export const wrapRequestSchema = z.object({
  url: urlSchema,
  mode: extractionModeSchema.optional().default('fast'),
  format: outputFormatSchema.optional().default('compact'),
});

/**
 * Schema for entity source
 */
export const entitySourceSchema = z.enum(['schema', 'content', 'inferred']);

/**
 * Schema for confidence score (0-1)
 */
export const confidenceSchema = z.number().min(0).max(1);

/**
 * Schema for entity
 */
export const entitySchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  properties: z.record(z.unknown()),
  confidence: confidenceSchema,
  source: entitySourceSchema,
  url: z.string().url().optional(),
  image: z.string().url().optional(),
  description: z.string().optional(),
});

/**
 * Schema for relationship
 */
export const relationshipSchema = z.object({
  source: z.string(),
  target: z.string(),
  type: z.string(),
  confidence: confidenceSchema,
  properties: z.record(z.unknown()).optional(),
});

/**
 * Schema for knowledge graph
 */
export const knowledgeGraphSchema = z.object({
  entities: z.array(entitySchema),
  relationships: z.array(relationshipSchema),
  metadata: z.object({
    entity_count: z.number().int().nonnegative(),
    relationship_count: z.number().int().nonnegative(),
    entity_types: z.record(z.number().int().nonnegative()),
    relationship_types: z.record(z.number().int().nonnegative()),
  }),
});

/**
 * Schema for response metadata
 */
export const responseMetaSchema = z.object({
  target_url: urlSchema,
  timestamp: z.string().datetime(),
  latency_ms: z.number().nonnegative(),
  cost_tokens: z.number().int().nonnegative(),
  cache_hit: z.boolean(),
  mode: extractionModeSchema,
  format: outputFormatSchema,
});

/**
 * Schema for content section
 */
export const contentSectionSchema = z.object({
  title: z.string(),
  summary: z.string(),
  markdown: z.string().optional(),
  word_count: z.number().int().nonnegative().optional(),
});

/**
 * Schema for compact knowledge graph section
 */
export const knowledgeGraphSectionSchema = z.object({
  schema: z.array(z.string()),
  entities: z.array(z.array(z.unknown())),
  relations: z.object({
    schema: z.array(z.string()),
    data: z.array(z.array(z.unknown())),
  }),
});

/**
 * Schema for wrap response
 */
export const wrapResponseSchema = z.object({
  meta: responseMetaSchema,
  content: contentSectionSchema,
  knowledge_graph: knowledgeGraphSectionSchema,
});

/**
 * Schema for error code
 */
export const errorCodeSchema = z.enum([
  'ERR_URL_UNREACHABLE',
  'ERR_BOT_BLOCKED',
  'ERR_DOM_UNREADABLE',
  'ERR_TIMEOUT',
  'ERR_CSR_TIMEOUT',
  'ERR_WAF_BLOCK',
  'ERR_SCHEMA_NESTED',
  'ERR_REDIRECT_LOOP',
  'ERR_INVALID_URL',
  'ERR_AUTH_MISSING',
  'ERR_AUTH_INVALID',
  'ERR_QUOTA_EXCEEDED',
  'ERR_RATE_LIMIT',
  'ERR_INTERNAL',
]);

/**
 * Schema for error response
 */
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.union([errorCodeSchema, z.string()]),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});

/**
 * Type exports inferred from schemas
 */
export type WrapRequestInput = z.infer<typeof wrapRequestSchema>;
export type WrapResponseOutput = z.infer<typeof wrapResponseSchema>;
export type ErrorResponseOutput = z.infer<typeof errorResponseSchema>;
