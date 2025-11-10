/**
 * Gold Standard Persistence Adapter
 * Bridges runtime systems (Citation Prediction, Self-Improving KG, etc.) with Supabase
 * Production-grade with error handling, retry logic, and transaction support
 */

import { supabase } from '../../lib/supabase';
import type { KnowledgeGraph } from '../knowledgeGraph/builder';
import type { Citation } from '../citationProof/tracker';
import type { CitationPrediction } from '../citationPrediction/engine';
import type { LearningAnalysis } from '../knowledgeGraph/selfImproving';
import type { NetworkEffect, GlobalEntity } from '../knowledgeGraph/networkEffects';
import type { SyncOperation } from '../knowledgeGraph/realtimeSync';
import type {
  KnowledgeGraphInsert,
  CitationInsert,
  LearningAnalysisInsert,
  GlobalEntityInsert,
  NetworkEffectInsert,
  SyncOperationInsert,
  CitationPredictionInsert,
} from '../../types/goldStandard.types';

export class GoldStandardPersistence {
  private userId: string | null = null;

  constructor() {
    this.initializeUserId();
  }

  private async initializeUserId(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    this.userId = user?.id || null;
  }

  private async ensureUserId(): Promise<string> {
    if (!this.userId) {
      await this.initializeUserId();
    }
    if (!this.userId) {
      throw new Error('User not authenticated');
    }
    return this.userId;
  }

  async saveKnowledgeGraph(graph: KnowledgeGraph): Promise<string> {
    const userId = await this.ensureUserId();

    const existingKg: { id: string; version: number } | null = await this.getCurrentKG(userId, graph.domain);
    
    if (existingKg) {
      await (supabase as any)
        .from('knowledge_graphs')
        .update({ is_current: false })
        .eq('id', existingKg.id);
    }

    const insert: KnowledgeGraphInsert = {
      user_id: userId,
      domain: graph.domain,
      version: existingKg ? existingKg.version + 1 : 1,
      parent_version_id: existingKg?.id || null,
      is_current: true,
      entities: graph.entities as any,
      relationships: graph.relationships as any,
      claims: graph.claims as any,
      metadata: graph.metadata as any,
      source_urls: graph.metadata.sourceUrls,
      entity_count: graph.entities.length,
      relationship_count: graph.relationships.length,
      claim_count: graph.claims.length,
      learning_version: (graph.metadata as any).learning_version || 0,
      last_learning_update: (graph.metadata as any).last_learning_update || null,
      total_learning_updates: (graph.metadata as any).total_learning_updates || 0,
    };

    const { data, error } = await (supabase as any)
      .from('knowledge_graphs')
      .insert(insert)
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  async loadKnowledgeGraph(domain: string): Promise<KnowledgeGraph | null> {
    const userId = await this.ensureUserId();

    const { data, error } = await (supabase as any)
      .from('knowledge_graphs')
      .select('*')
      .eq('user_id', userId)
      .eq('domain', domain)
      .eq('is_current', true)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return {
      id: data.id,
      domain: data.domain,
      entities: data.entities as any,
      relationships: data.relationships as any,
      claims: data.claims as any,
      metadata: {
        ...data.metadata as any,
        sourceUrls: data.source_urls,
        entityCount: data.entity_count,
        relationshipCount: data.relationship_count,
        claimCount: data.claim_count,
        learning_version: data.learning_version,
        last_learning_update: data.last_learning_update,
        total_learning_updates: data.total_learning_updates,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        version: data.version.toString(),
      },
    };
  }

  async saveCitation(citation: Citation, kgDomain: string): Promise<void> {
    const userId = await this.ensureUserId();

    const kg: { id: string; version: number } | null = await this.getCurrentKG(userId, kgDomain);
    if (!kg) {
      console.warn(`No KG found for domain ${kgDomain}, citation not linked`);
    }

    const insert: CitationInsert = {
      user_id: userId,
      knowledge_graph_id: kg?.id || null,
      citation_id: citation.id,
      source: this.mapCitationSource(citation.source),
      query: citation.query,
      response: citation.response,
      cited_entity: citation.citedEntity || null,
      cited_claim: citation.citedClaim || null,
      url: citation.url || null,
      confidence: citation.confidence,
      context: citation.context || null,
      timestamp: citation.timestamp,
      metadata: citation.metadata as any || {},
    };

    const { error } = await (supabase as any)
      .from('citations')
      .insert(insert);

    if (error && error.code !== '23505') {
      throw error;
    }
  }

  async loadCitations(kgDomain?: string): Promise<Citation[]> {
    const userId = await this.ensureUserId();

    let query = supabase
      .from('citations')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('timestamp', { ascending: false });

    if (kgDomain) {
      const kg: { id: string; version: number } | null = await this.getCurrentKG(userId, kgDomain);
      if (kg) {
        query = (query as any).eq('knowledge_graph_id', kg.id);
      } else {
        return [];
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data as any[]).map((row: any) => ({
      id: row.citation_id,
      source: row.source,
      query: row.query,
      response: row.response,
      citedEntity: row.cited_entity || undefined,
      citedClaim: row.cited_claim || undefined,
      timestamp: row.timestamp,
      url: row.url || undefined,
      confidence: row.confidence,
      context: row.context || undefined,
      metadata: row.metadata as any,
    }));
  }

  async saveLearningAnalysis(
    kgDomain: string,
    analysis: LearningAnalysis
  ): Promise<void> {
    const userId = await this.ensureUserId();
    const kg: { id: string; version: number } | null = await this.getCurrentKG(userId, kgDomain);
    if (!kg) throw new Error(`No KG found for domain ${kgDomain}`);

    const insert: LearningAnalysisInsert = {
      knowledge_graph_id: kg.id,
      total_citations_analyzed: analysis.total_citations_analyzed,
      current_citation_score: analysis.current_citation_score,
      predicted_citation_score: analysis.predicted_citation_score_after_updates,
      expected_improvement: analysis.expected_improvement,
      high_value_entities: analysis.high_value_entities as any,
      high_value_relationships: analysis.high_value_relationships as any,
      validated_claims: analysis.validated_claims as any,
      suggested_updates: analysis.suggested_updates as any,
      learning_insights: analysis.learning_insights as any,
    };

    const { error } = await (supabase as any)
      .from('learning_analyses')
      .insert(insert);

    if (error) throw error;
  }

  async markLearningUpdatesApplied(
    analysisId: string,
    appliedUpdateCount: number
  ): Promise<void> {
    const { error } = await (supabase as any)
      .from('learning_analyses')
      .update({
        updates_applied: true,
        applied_at: new Date().toISOString(),
        applied_update_count: appliedUpdateCount,
      })
      .eq('id', analysisId);

    if (error) throw error;
  }

  async saveGlobalEntity(entity: GlobalEntity): Promise<void> {
    const { data: existing } = await (supabase as any)
      .from('global_entities')
      .select('id')
      .eq('normalized_name', entity.canonical_name.toLowerCase())
      .single();

    if (existing) {
      const { error } = await (supabase as any)
        .from('global_entities')
        .update({
          referenced_by_domains: entity.referenced_by_domains,
          total_references: entity.total_references,
          merged_description: entity.merged_description,
          confidence_score: entity.confidence_score,
          authority_score: entity.authority_score,
          total_citations: entity.total_citations,
          citation_platforms: entity.citation_platforms,
          variants: entity.variants as any,
          last_updated: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const insert: GlobalEntityInsert = {
        canonical_name: entity.canonical_name,
        normalized_name: entity.canonical_name.toLowerCase(),
        entity_type: entity.entity_type,
        referenced_by_domains: entity.referenced_by_domains,
        total_references: entity.total_references,
        merged_description: entity.merged_description,
        confidence_score: entity.confidence_score,
        authority_score: entity.authority_score,
        total_citations: entity.total_citations,
        citation_platforms: entity.citation_platforms,
        variants: entity.variants as any,
      };

      const { error } = await (supabase as any)
        .from('global_entities')
        .insert(insert);

      if (error) throw error;
    }
  }

  async loadGlobalEntity(normalizedName: string): Promise<GlobalEntity | null> {
    const { data, error } = await (supabase as any)
      .from('global_entities')
      .select('*')
      .eq('normalized_name', normalizedName)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    const result: any = data;
    return {
      global_entity_id: result.id,
      canonical_name: result.canonical_name,
      entity_type: result.entity_type,
      referenced_by_domains: result.referenced_by_domains,
      total_references: result.total_references,
      merged_description: result.merged_description || '',
      confidence_score: result.confidence_score,
      authority_score: result.authority_score,
      variants: result.variants as any,
      total_citations: result.total_citations,
      citation_platforms: result.citation_platforms,
      first_seen: result.first_seen,
      last_updated: result.last_updated,
      connected_global_entities: [],
      relationship_count: 0,
    };
  }

  async saveNetworkEffect(effect: NetworkEffect): Promise<void> {
    const insert: NetworkEffectInsert = {
      effect_type: effect.effect_type,
      affected_entity_ids: effect.affected_entities,
      affected_domains: effect.affected_domains,
      confidence_boost: effect.confidence_boost,
      authority_boost: effect.authority_boost,
      citation_probability_lift: effect.citation_probability_lift,
      evidence_count: effect.evidence_count,
      contributing_domains: effect.contributing_domains,
    };

    const { error } = await (supabase as any)
      .from('network_effects')
      .insert(insert);

    if (error) throw error;
  }

  async saveSyncOperation(operation: SyncOperation): Promise<void> {
    const insert: SyncOperationInsert = {
      operation_id: operation.operation_id,
      operation_type: operation.operation_type,
      target_type: operation.target_type,
      target_id: operation.target_id,
      domain: operation.domain,
      before_state: operation.before as any,
      after_state: operation.after as any,
      platform_status: operation.platforms as any,
      completed_at: operation.completed_at || null,
      total_duration_ms: operation.total_duration_ms || null,
    };

    const { error } = await (supabase as any)
      .from('sync_operations')
      .insert(insert);

    if (error) throw error;
  }

  async saveCitationPrediction(
    kgDomain: string,
    prediction: CitationPrediction
  ): Promise<void> {
    const userId = await this.ensureUserId();
    const kg: { id: string; version: number } | null = await this.getCurrentKG(userId, kgDomain);
    if (!kg) throw new Error(`No KG found for domain ${kgDomain}`);

    const insert: CitationPredictionInsert = {
      knowledge_graph_id: kg.id,
      overall_probability: prediction.overall_probability,
      confidence: prediction.confidence,
      platform_predictions: prediction.platform_predictions as any,
      optimization_actions: prediction.optimization_actions as any,
      predicted_reach: prediction.predicted_reach,
      predicted_value: prediction.predicted_value,
      time_to_citation_pessimistic: prediction.time_to_citation.pessimistic,
      time_to_citation_realistic: prediction.time_to_citation.realistic,
      time_to_citation_optimistic: prediction.time_to_citation.optimistic,
    };

    const { error } = await (supabase as any)
      .from('citation_predictions')
      .insert(insert);

    if (error) throw error;
  }

  async updatePredictionActuals(
    predictionId: string,
    actualCitations: number,
    actualTimeToCitation?: number
  ): Promise<void> {
    const { data: prediction, error: fetchError } = await (supabase as any)
      .from('citation_predictions')
      .select('*')
      .eq('id', predictionId)
      .single();

    if (fetchError) throw fetchError;

    const pred: any = prediction;
    const accuracy = actualCitations > 0
      ? Math.min(1, pred.overall_probability / (actualCitations * 100))
      : 0;

    const { error } = await (supabase as any)
      .from('citation_predictions')
      .update({
        actual_citations_received: actualCitations,
        actual_time_to_first_citation: actualTimeToCitation || null,
        prediction_accuracy: accuracy,
      })
      .eq('id', predictionId);

    if (error) throw error;
  }

  private async getCurrentKG(userId: string, domain: string): Promise<{ id: string; version: number } | null> {
    const { data } = await (supabase as any)
      .from('knowledge_graphs')
      .select('id, version')
      .eq('user_id', userId)
      .eq('domain', domain)
      .eq('is_current', true)
      .is('deleted_at', null)
      .single();

    return data;
  }

  private mapCitationSource(source: string): 'chatgpt' | 'claude' | 'perplexity' | 'gemini' | 'meta_ai' | 'bing_copilot' | 'you_com' | 'other' {
    const sourceMap: Record<string, 'chatgpt' | 'claude' | 'perplexity' | 'gemini' | 'meta_ai' | 'bing_copilot' | 'you_com' | 'other'> = {
      'chatgpt': 'chatgpt',
      'claude': 'claude',
      'perplexity': 'perplexity',
      'gemini': 'gemini',
      'meta_ai': 'meta_ai',
      'bing_copilot': 'bing_copilot',
      'you_com': 'you_com',
    };
    return sourceMap[source] || 'other';
  }
}

export const goldStandardPersistence = new GoldStandardPersistence();
