/**
 * Type definitions for Agent Middleware system
 * Provides structured data models for extraction, entities, and API responses
 */

/**
 * Entity represents a semantic entity extracted from web content
 */
export interface Entity {
  id: string; // ULID for unique identification
  type: string; // Schema.org type (Organization, Person, Product, etc.)
  name: string; // Primary name/title
  properties: Record<string, unknown>; // Flexible property bag
  confidence: number; // 0-1 confidence score
  source: 'schema' | 'content' | 'inferred'; // Data source
  url?: string; // Canonical URL if available
  image?: string; // Primary image URL
  description?: string; // Short description
}

/**
 * Relationship represents a connection between two entities
 */
export interface Relationship {
  source: string; // Source entity ID
  target: string; // Target entity ID
  type: string; // Relationship type (offers, author, mentions, etc.)
  confidence: number; // 0-1 confidence score
  properties?: Record<string, unknown>; // Additional relationship metadata
}

/**
 * KnowledgeGraph represents the complete graph of entities and relationships
 */
export interface KnowledgeGraph {
  entities: Entity[];
  relationships: Relationship[];
  metadata: {
    entity_count: number;
    relationship_count: number;
    entity_types: Record<string, number>; // Type distribution
    relationship_types: Record<string, number>; // Relationship distribution
  };
}

/**
 * Schema markup data extracted from HTML
 */
export interface SchemaMarkupData {
  types: string[];
  data: Record<string, unknown>[];
}

/**
 * Meta tags extracted from HTML
 */
export interface MetaTagsData {
  title?: string;
  description?: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: string;
  canonical?: string;
  [key: string]: unknown;
}

/**
 * Content data extracted from HTML
 */
export interface ContentData {
  title: string;
  summary: string;
  markdown?: string; // Deep mode only
  word_count?: number; // Deep mode only
  headings?: string[];
  links?: string[];
}

/**
 * Structure data about the HTML document
 */
export interface StructureData {
  hasSchema: boolean;
  schemaTypes: string[];
  headingCount: number;
  linkCount: number;
  imageCount: number;
}

/**
 * Performance metrics for extraction
 */
export interface PerformanceData {
  fetchTime: number;
  parseTime: number;
  totalTime: number;
}

/**
 * Options for extraction engine
 */
export interface ExtractionOptions {
  mode: 'fast' | 'deep';
  timeout?: number;
  userAgent?: string;
  useBrowser?: boolean; // Force headless browser
}

/**
 * Result from extraction engine
 */
export interface ExtractionResult {
  url: string;
  timestamp: string;
  html: string;
  schemaMarkup: SchemaMarkupData;
  metaTags: MetaTagsData;
  content: ContentData;
  structure: StructureData;
  performance: PerformanceData;
  // Deep mode only:
  entities?: Entity[];
  relationships?: Relationship[];
  knowledgeGraph?: KnowledgeGraph;
}

/**
 * Compact JSON format for token-efficient serialization
 */
export interface CompactJson {
  schema: string[]; // Field names
  data: unknown[][]; // Values in columnar format
}

/**
 * Compact knowledge graph format
 */
export interface CompactKnowledgeGraph {
  schema: string[]; // ["id", "type", "name", "value", "confidence"]
  entities: unknown[][]; // [[e1_id, e1_type, e1_name, e1_value, e1_conf], ...]
  relations: {
    schema: string[]; // ["source", "target", "type"]
    data: unknown[][]; // [[src_id, tgt_id, rel_type], ...]
  };
}

/**
 * JSON-LD document format
 */
export interface JsonLdDocument {
  '@context': string | Record<string, unknown>;
  '@type': string;
  [key: string]: unknown;
}

/**
 * Data that can be serialized
 */
export interface SerializableData {
  entities: Entity[];
  relationships: Relationship[];
}

/**
 * API request for wrap endpoint
 */
export interface WrapRequest {
  url: string;
  mode?: 'fast' | 'deep'; // Default: 'fast'
  format?: 'json-ld' | 'compact'; // Default: 'compact'
}

/**
 * Response metadata
 */
export interface ResponseMeta {
  target_url: string;
  timestamp: string; // ISO 8601
  latency_ms: number;
  cost_tokens: number;
  cache_hit: boolean;
  mode: 'fast' | 'deep';
  format: 'json-ld' | 'compact';
}

/**
 * Content section of API response
 */
export interface ContentSection {
  title: string;
  summary: string;
  markdown?: string; // Deep mode only
  word_count?: number; // Deep mode only
}

/**
 * Knowledge graph section of API response
 */
export interface KnowledgeGraphSection {
  schema: string[];
  entities: unknown[][];
  relations: {
    schema: string[];
    data: unknown[][];
  };
}

/**
 * API response for wrap endpoint
 */
export interface WrapResponse {
  meta: ResponseMeta;
  content: ContentSection;
  knowledge_graph: KnowledgeGraphSection;
}

/**
 * Error codes for agent middleware
 */
export enum ErrorCode {
  ERR_URL_UNREACHABLE = 'ERR_URL_UNREACHABLE',
  ERR_BOT_BLOCKED = 'ERR_BOT_BLOCKED',
  ERR_DOM_UNREADABLE = 'ERR_DOM_UNREADABLE',
  ERR_TIMEOUT = 'ERR_TIMEOUT',
  ERR_INVALID_URL = 'ERR_INVALID_URL',
  ERR_AUTH_MISSING = 'ERR_AUTH_MISSING',
  ERR_AUTH_INVALID = 'ERR_AUTH_INVALID',
  ERR_QUOTA_EXCEEDED = 'ERR_QUOTA_EXCEEDED',
  ERR_RATE_LIMIT = 'ERR_RATE_LIMIT',
  ERR_INTERNAL = 'ERR_INTERNAL',
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  error: {
    code: ErrorCode | string;
    message: string;
    details?: {
      url?: string;
      timestamp?: string;
      request_id?: string;
      [key: string]: unknown;
    };
  };
}

/**
 * Cached result structure
 */
export interface CachedResult {
  data: WrapResponse;
  cached_at: string;
  expires_at: string;
}

/**
 * API key structure
 */
export interface ApiKey {
  id: string;
  key: string;
  tenant_id: string;
  quota_limit: number;
  quota_used: number;
  is_active: boolean;
  created_at: string;
  expires_at?: string;
}
