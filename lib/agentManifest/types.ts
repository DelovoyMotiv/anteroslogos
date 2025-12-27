/**
 * TypeScript interfaces for AgentsJSON schema
 * Agent Manifest Generator data models
 * 
 * @module lib/agentManifest/types
 * @version 1.0.0
 */

/**
 * Standard web semantic roles for knowledge entries
 */
export type WebSemanticRole = 'documentation' | 'pricing' | 'about' | 'product' | 'contact' | 'support';

/**
 * HTTP method types for actions
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * Knowledge entry in the agent manifest
 * Represents a key page or resource on the website
 */
export interface KnowledgeEntry {
  /** Semantic role of this page (standard web terminology) */
  role: WebSemanticRole;
  /** URL path to the page */
  url: string;
  /** Description of what this page contains */
  description: string;
}

/**
 * Action entry representing an API endpoint or interactive feature
 */
export interface Action {
  /** Name of the action */
  name: string;
  /** HTTP method type */
  type: HttpMethod;
  /** API endpoint path */
  path: string;
}

/**
 * Identity information about the website/brand
 */
export interface AgentIdentity {
  /** Brand or website name */
  name: string;
  /** High-entropy description of core value proposition */
  description: string;
  /** Industry/focus/category tags */
  tags: string[];
}

/**
 * Complete AgentsJSON manifest structure
 * Represents an industry-standard agent-native file for AI agent navigation
 */
export interface AgentsJSON {
  /** JSON Schema reference */
  $schema: string;
  /** Schema version */
  version: string;
  /** Website/brand identity */
  identity: AgentIdentity;
  /** Knowledge entries (key pages) */
  knowledge: KnowledgeEntry[];
  /** Available actions (API endpoints) */
  actions: Action[];
}
