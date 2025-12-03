-- =====================================================
-- ROLLBACK: Migration 002 - Gold Standard Schema
-- Purpose: Remove all Gold Standard system tables and objects
-- Data Loss Risk: HIGH (all knowledge graph and citation data will be lost)
-- =====================================================

-- WARNING: This rollback will delete ALL knowledge graph and citation data
-- Only use in development or with explicit approval

-- Drop helper functions
DROP FUNCTION IF EXISTS get_global_entity_by_name(TEXT);
DROP FUNCTION IF EXISTS get_kg_citation_count(UUID);
DROP FUNCTION IF EXISTS get_current_kg(UUID, TEXT);

-- Drop triggers
DROP TRIGGER IF EXISTS update_predictions_updated_at ON public.citation_predictions;
DROP TRIGGER IF EXISTS update_global_rel_updated_at ON public.global_relationships;
DROP TRIGGER IF EXISTS update_global_entities_updated_at ON public.global_entities;
DROP TRIGGER IF EXISTS update_learning_updated_at ON public.learning_analyses;
DROP TRIGGER IF EXISTS update_citations_updated_at ON public.citations;
DROP TRIGGER IF EXISTS update_kg_updated_at ON public.knowledge_graphs;

-- Drop RLS policies
-- citation_predictions
DROP POLICY IF EXISTS "Users can view predictions for own KGs" ON public.citation_predictions;

-- sync_operations
DROP POLICY IF EXISTS "Users can view sync operations for own domains" ON public.sync_operations;

-- network_effects
DROP POLICY IF EXISTS "Authenticated users can view network effects" ON public.network_effects;

-- global_relationships
DROP POLICY IF EXISTS "Authenticated users can view global relationships" ON public.global_relationships;

-- global_entities
DROP POLICY IF EXISTS "Authenticated users can view global entities" ON public.global_entities;

-- learning_analyses
DROP POLICY IF EXISTS "Users can view learning analyses for own KGs" ON public.learning_analyses;

-- citations
DROP POLICY IF EXISTS "Users can insert own citations" ON public.citations;
DROP POLICY IF EXISTS "Users can view own citations" ON public.citations;

-- knowledge_graphs
DROP POLICY IF EXISTS "Users can delete own knowledge graphs" ON public.knowledge_graphs;
DROP POLICY IF EXISTS "Users can update own knowledge graphs" ON public.knowledge_graphs;
DROP POLICY IF EXISTS "Users can insert own knowledge graphs" ON public.knowledge_graphs;
DROP POLICY IF EXISTS "Users can view own knowledge graphs" ON public.knowledge_graphs;

-- Drop indexes
DROP INDEX IF EXISTS idx_predictions_actions;
DROP INDEX IF EXISTS idx_predictions_probability;
DROP INDEX IF EXISTS idx_predictions_created;
DROP INDEX IF EXISTS idx_predictions_kg_id;
DROP INDEX IF EXISTS idx_sync_ops_status;
DROP INDEX IF EXISTS idx_sync_ops_completed;
DROP INDEX IF EXISTS idx_sync_ops_created;
DROP INDEX IF EXISTS idx_sync_ops_domain;
DROP INDEX IF EXISTS idx_sync_ops_operation_id;
DROP INDEX IF EXISTS idx_network_effects_domains;
DROP INDEX IF EXISTS idx_network_effects_entities;
DROP INDEX IF EXISTS idx_network_effects_created;
DROP INDEX IF EXISTS idx_network_effects_type;
DROP INDEX IF EXISTS idx_global_rel_unique;
DROP INDEX IF EXISTS idx_global_rel_domains;
DROP INDEX IF EXISTS idx_global_rel_type;
DROP INDEX IF EXISTS idx_global_rel_target;
DROP INDEX IF EXISTS idx_global_rel_source;
DROP INDEX IF EXISTS idx_global_entities_unique;
DROP INDEX IF EXISTS idx_global_entities_domains;
DROP INDEX IF EXISTS idx_global_entities_references;
DROP INDEX IF EXISTS idx_global_entities_authority;
DROP INDEX IF EXISTS idx_global_entities_type;
DROP INDEX IF EXISTS idx_global_entities_normalized;
DROP INDEX IF EXISTS idx_learning_applied;
DROP INDEX IF EXISTS idx_learning_created_at;
DROP INDEX IF EXISTS idx_learning_kg_id;
DROP INDEX IF EXISTS idx_citations_unique;
DROP INDEX IF EXISTS idx_citations_cited_entity;
DROP INDEX IF EXISTS idx_citations_timestamp;
DROP INDEX IF EXISTS idx_citations_source;
DROP INDEX IF EXISTS idx_citations_kg_id;
DROP INDEX IF EXISTS idx_citations_user_id;
DROP INDEX IF EXISTS idx_kg_current_unique;
DROP INDEX IF EXISTS idx_kg_relationships;
DROP INDEX IF EXISTS idx_kg_entities;
DROP INDEX IF EXISTS idx_kg_is_current;
DROP INDEX IF EXISTS idx_kg_created_at;
DROP INDEX IF EXISTS idx_kg_domain;
DROP INDEX IF EXISTS idx_kg_user_id;

-- Drop tables (in reverse dependency order)
DROP TABLE IF EXISTS public.citation_predictions CASCADE;
DROP TABLE IF EXISTS public.sync_operations CASCADE;
DROP TABLE IF EXISTS public.network_effects CASCADE;
DROP TABLE IF EXISTS public.global_relationships CASCADE;
DROP TABLE IF EXISTS public.global_entities CASCADE;
DROP TABLE IF EXISTS public.learning_analyses CASCADE;
DROP TABLE IF EXISTS public.citations CASCADE;
DROP TABLE IF EXISTS public.knowledge_graphs CASCADE;

-- Log rollback completion
DO $
BEGIN
  RAISE NOTICE '✅ Rollback 002 completed: Gold Standard schema removed';
  RAISE WARNING '⚠️  CRITICAL: All knowledge graph data has been deleted';
  RAISE WARNING '⚠️  CRITICAL: All citation data has been deleted';
  RAISE WARNING '⚠️  CRITICAL: All learning analyses have been deleted';
  RAISE WARNING '⚠️  CRITICAL: All global entity data has been deleted';
END $;
