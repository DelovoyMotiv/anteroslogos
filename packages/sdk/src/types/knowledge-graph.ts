import { z } from 'zod';

/**
 * Entity type classification
 */
export const EntityTypeSchema = z.enum([
  'organization',
  'person',
  'product',
  'concept',
  'location',
  'event',
]);
export type EntityType = z.infer<typeof EntityTypeSchema>;

/**
 * Knowledge graph entity
 */
export const EntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: EntityTypeSchema,
  description: z.string().optional(),
  confidence: z.number().min(0).max(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict();
export type Entity = z.infer<typeof EntitySchema>;

/**
 * Relationship type
 */
export const RelationshipTypeSchema = z.enum([
  'hierarchical',
  'associative',
  'causal',
  'temporal',
]);
export type RelationshipType = z.infer<typeof RelationshipTypeSchema>;

/**
 * Entity relationship
 */
export const RelationshipSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: RelationshipTypeSchema,
  label: z.string(),
  confidence: z.number().min(0).max(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict();
export type Relationship = z.infer<typeof RelationshipSchema>;

/**
 * Factual claim
 */
export const ClaimSchema = z.object({
  id: z.string(),
  entityId: z.string(),
  statement: z.string(),
  confidence: z.number().min(0).max(1),
  source: z.string().url().optional(),
}).strict();
export type Claim = z.infer<typeof ClaimSchema>;

/**
 * Knowledge graph extraction request
 */
export const KnowledgeGraphRequestSchema = z.object({
  url: z.string().url('Invalid URL format'),
  includeClaims: z.boolean().default(true),
  maxEntities: z.number().min(1).max(1000).default(100),
}).strict();
export type KnowledgeGraphRequest = z.infer<typeof KnowledgeGraphRequestSchema>;

/**
 * Knowledge graph extraction result
 */
export const KnowledgeGraphResultSchema = z.object({
  url: z.string().url(),
  entities: z.array(EntitySchema),
  relationships: z.array(RelationshipSchema),
  claims: z.array(ClaimSchema).optional(),
  timestamp: z.number(),
}).strict();
export type KnowledgeGraphResult = z.infer<typeof KnowledgeGraphResultSchema>;
