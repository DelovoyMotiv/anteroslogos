/**
 * Gold Standard Database Types
 * TypeScript types for Knowledge Graphs, Citations, Learning Data, Network Effects
 * Generated from PostgreSQL schema 002_gold_standard_schema.sql
 */

import type { Json } from './database.types';

export interface KnowledgeGraphRow {
  id: string;
  user_id: string | null;
  domain: string;
  version: number;
  parent_version_id: string | null;
  is_current: boolean;
  entities: Json;
  relationships: Json;
  claims: Json;
  metadata: Json;
  source_urls: string[];
  entity_count: number;
  relationship_count: number;
  claim_count: number;
  learning_version: number;
  last_learning_update: string | null;
  total_learning_updates: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface KnowledgeGraphInsert {
  id?: string;
  user_id?: string | null;
  domain: string;
  version?: number;
  parent_version_id?: string | null;
  is_current?: boolean;
  entities: Json;
  relationships: Json;
  claims: Json;
  metadata?: Json;
  source_urls?: string[];
  entity_count?: number;
  relationship_count?: number;
  claim_count?: number;
  learning_version?: number;
  last_learning_update?: string | null;
  total_learning_updates?: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface CitationRow {
  id: string;
  user_id: string | null;
  knowledge_graph_id: string | null;
  citation_id: string;
  source: 'chatgpt' | 'claude' | 'perplexity' | 'gemini' | 'meta_ai' | 'bing_copilot' | 'you_com' | 'other';
  query: string;
  response: string;
  cited_entity: string | null;
  cited_claim: string | null;
  url: string | null;
  confidence: number;
  context: string | null;
  timestamp: string;
  metadata: Json;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CitationInsert {
  id?: string;
  user_id?: string | null;
  knowledge_graph_id?: string | null;
  citation_id: string;
  source: 'chatgpt' | 'claude' | 'perplexity' | 'gemini' | 'meta_ai' | 'bing_copilot' | 'you_com' | 'other';
  query: string;
  response: string;
  cited_entity?: string | null;
  cited_claim?: string | null;
  url?: string | null;
  confidence: number;
  context?: string | null;
  timestamp?: string;
  metadata?: Json;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface LearningAnalysisRow {
  id: string;
  knowledge_graph_id: string;
  total_citations_analyzed: number;
  current_citation_score: number;
  predicted_citation_score: number;
  expected_improvement: number;
  high_value_entities: Json;
  high_value_relationships: Json;
  validated_claims: Json;
  suggested_updates: Json;
  learning_insights: Json;
  updates_applied: boolean;
  applied_at: string | null;
  applied_update_count: number;
  created_at: string;
  updated_at: string;
}

export interface LearningAnalysisInsert {
  id?: string;
  knowledge_graph_id: string;
  total_citations_analyzed?: number;
  current_citation_score: number;
  predicted_citation_score: number;
  expected_improvement: number;
  high_value_entities?: Json;
  high_value_relationships?: Json;
  validated_claims?: Json;
  suggested_updates?: Json;
  learning_insights?: Json;
  updates_applied?: boolean;
  applied_at?: string | null;
  applied_update_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface GlobalEntityRow {
  id: string;
  canonical_name: string;
  normalized_name: string;
  entity_type: string;
  referenced_by_domains: string[];
  total_references: number;
  merged_description: string | null;
  confidence_score: number;
  authority_score: number;
  total_citations: number;
  citation_platforms: string[];
  variants: Json;
  first_seen: string;
  last_updated: string;
}

export interface GlobalEntityInsert {
  id?: string;
  canonical_name: string;
  normalized_name: string;
  entity_type: string;
  referenced_by_domains?: string[];
  total_references?: number;
  merged_description?: string | null;
  confidence_score?: number;
  authority_score?: number;
  total_citations?: number;
  citation_platforms?: string[];
  variants?: Json;
  first_seen?: string;
  last_updated?: string;
}

export interface GlobalRelationshipRow {
  id: string;
  source_global_entity_id: string;
  target_global_entity_id: string;
  relationship_type: string;
  supporting_domains: string[];
  confidence_score: number;
  citation_count: number;
  created_at: string;
  updated_at: string;
}

export interface GlobalRelationshipInsert {
  id?: string;
  source_global_entity_id: string;
  target_global_entity_id: string;
  relationship_type: string;
  supporting_domains?: string[];
  confidence_score?: number;
  citation_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface NetworkEffectRow {
  id: string;
  effect_type: 'entity_amplification' | 'relationship_validation' | 'claim_validation' | 'authority_boost';
  affected_entity_ids: string[];
  affected_domains: string[];
  confidence_boost: number;
  authority_boost: number;
  citation_probability_lift: number;
  evidence_count: number;
  contributing_domains: string[];
  created_at: string;
}

export interface NetworkEffectInsert {
  id?: string;
  effect_type: 'entity_amplification' | 'relationship_validation' | 'claim_validation' | 'authority_boost';
  affected_entity_ids?: string[];
  affected_domains?: string[];
  confidence_boost: number;
  authority_boost: number;
  citation_probability_lift: number;
  evidence_count: number;
  contributing_domains?: string[];
  created_at?: string;
}

export interface SyncOperationRow {
  id: string;
  operation_id: string;
  operation_type: 'create' | 'update' | 'delete';
  target_type: 'entity' | 'relationship' | 'claim' | 'full_graph';
  target_id: string;
  domain: string;
  before_state: Json | null;
  after_state: Json | null;
  platform_status: Json;
  created_at: string;
  completed_at: string | null;
  total_duration_ms: number | null;
}

export interface SyncOperationInsert {
  id?: string;
  operation_id: string;
  operation_type: 'create' | 'update' | 'delete';
  target_type: 'entity' | 'relationship' | 'claim' | 'full_graph';
  target_id: string;
  domain: string;
  before_state?: Json | null;
  after_state?: Json | null;
  platform_status?: Json;
  created_at?: string;
  completed_at?: string | null;
  total_duration_ms?: number | null;
}

export interface CitationPredictionRow {
  id: string;
  knowledge_graph_id: string;
  overall_probability: number;
  confidence: number;
  platform_predictions: Json;
  optimization_actions: Json;
  predicted_reach: number;
  predicted_value: number;
  time_to_citation_pessimistic: number | null;
  time_to_citation_realistic: number | null;
  time_to_citation_optimistic: number | null;
  actual_citations_received: number;
  actual_time_to_first_citation: number | null;
  prediction_accuracy: number | null;
  created_at: string;
  updated_at: string;
}

export interface CitationPredictionInsert {
  id?: string;
  knowledge_graph_id: string;
  overall_probability: number;
  confidence: number;
  platform_predictions: Json;
  optimization_actions?: Json;
  predicted_reach: number;
  predicted_value: number;
  time_to_citation_pessimistic?: number | null;
  time_to_citation_realistic?: number | null;
  time_to_citation_optimistic?: number | null;
  actual_citations_received?: number;
  actual_time_to_first_citation?: number | null;
  prediction_accuracy?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface GoldStandardDatabase {
  knowledge_graphs: {
    Row: KnowledgeGraphRow;
    Insert: KnowledgeGraphInsert;
    Update: Partial<KnowledgeGraphInsert>;
  };
  citations: {
    Row: CitationRow;
    Insert: CitationInsert;
    Update: Partial<CitationInsert>;
  };
  learning_analyses: {
    Row: LearningAnalysisRow;
    Insert: LearningAnalysisInsert;
    Update: Partial<LearningAnalysisInsert>;
  };
  global_entities: {
    Row: GlobalEntityRow;
    Insert: GlobalEntityInsert;
    Update: Partial<GlobalEntityInsert>;
  };
  global_relationships: {
    Row: GlobalRelationshipRow;
    Insert: GlobalRelationshipInsert;
    Update: Partial<GlobalRelationshipInsert>;
  };
  network_effects: {
    Row: NetworkEffectRow;
    Insert: NetworkEffectInsert;
    Update: Partial<NetworkEffectInsert>;
  };
  sync_operations: {
    Row: SyncOperationRow;
    Insert: SyncOperationInsert;
    Update: Partial<SyncOperationInsert>;
  };
  citation_predictions: {
    Row: CitationPredictionRow;
    Insert: CitationPredictionInsert;
    Update: Partial<CitationPredictionInsert>;
  };
}
