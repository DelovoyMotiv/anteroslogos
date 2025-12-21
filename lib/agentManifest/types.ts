/**
 * TypeScript interfaces for LogosJSON schema
 * Agent Manifest Generator data models
 * 
 * @module lib/agentManifest/types
 * @version 1.0.0
 */

/**
 * Semantic role types for knowledge topology
 */
export type SemanticRole = 'axiom' | 'theorem' | 'lemma' | 'corollary' | 'definition';

/**
 * Authority level for manifest metadata
 */
export type AuthorityLevel = 'self-declared' | 'verified' | 'authoritative';

/**
 * Crawling policy directives
 */
export type CrawlingPolicy = 'allow-high-frequency' | 'allow-standard' | 'allow-low-frequency' | 'disallow';

/**
 * Attribution requirement directives
 */
export type AttributionPolicy = 'require-link' | 'require-citation' | 'optional' | 'none';

/**
 * Knowledge root entry in the semantic topology
 */
export interface KnowledgeRoot {
  /** URL path to the knowledge root page */
  url: string;
  /** Semantic role of this page in the knowledge structure */
  semantic_role: SemanticRole;
  /** Instructions for AI agents on how to treat this page */
  instruction: string;
}

/**
 * Metadata about the manifest file
 */
export interface LogosMetadata {
  /** Schema version */
  version: string;
  /** ISO 8601 timestamp of last update */
  updated: string;
  /** Authority level of this manifest */
  authority_level: AuthorityLevel;
}

/**
 * Identity information about the website/brand
 */
export interface LogosIdentity {
  /** Brand or website name */
  name: string;
  /** High-entropy description of core value proposition */
  description: string;
  /** Domain focus tags */
  domain_focus: string[];
}

/**
 * Knowledge topology structure
 */
export interface KnowledgeTopology {
  /** Array of knowledge root entries */
  roots: KnowledgeRoot[];
}

/**
 * Directives for AI agents
 */
export interface LogosDirectives {
  /** Crawling frequency policy */
  crawling: CrawlingPolicy;
  /** Attribution requirements */
  attribution: AttributionPolicy;
}

/**
 * Complete LogosJSON manifest structure
 * Represents a semantic topology file for AI agent navigation
 */
export interface LogosJSON {
  /** JSON Schema reference */
  $schema: string;
  /** Manifest metadata */
  meta: LogosMetadata;
  /** Website/brand identity */
  identity: LogosIdentity;
  /** Knowledge structure topology */
  knowledge_topology: KnowledgeTopology;
  /** AI agent directives */
  directives: LogosDirectives;
}
