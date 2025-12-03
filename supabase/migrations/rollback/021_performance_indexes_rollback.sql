-- =====================================================
-- ROLLBACK: Migration 021 - Performance Indexes
-- Purpose: Remove performance optimization indexes
-- Data Loss Risk: NONE (only indexes, no data loss)
-- =====================================================

-- =====================================================
-- PROFILES TABLE INDEXES
-- =====================================================
DROP INDEX IF EXISTS idx_profiles_stripe_lookup;
DROP INDEX IF EXISTS idx_profiles_plan_credits;
DROP INDEX IF EXISTS idx_profiles_subscription_status;

-- =====================================================
-- AUDITS TABLE INDEXES
-- =====================================================
DROP INDEX IF EXISTS idx_audits_low_scores;
DROP INDEX IF EXISTS idx_audits_grade_timestamp;
DROP INDEX IF EXISTS idx_audits_domain_score;
DROP INDEX IF EXISTS idx_audits_user_recent;

-- =====================================================
-- KNOWLEDGE_GRAPHS TABLE INDEXES
-- =====================================================
DROP INDEX IF EXISTS idx_kg_entity_count;
DROP INDEX IF EXISTS idx_kg_version_history;
DROP INDEX IF EXISTS idx_kg_user_domain_current;

-- =====================================================
-- CITATIONS TABLE INDEXES
-- =====================================================
DROP INDEX IF EXISTS idx_citations_entity_source;
DROP INDEX IF EXISTS idx_citations_source_confidence;
DROP INDEX IF EXISTS idx_citations_kg_timestamp;

-- =====================================================
-- API_KEYS TABLE INDEXES
-- =====================================================
DROP INDEX IF EXISTS idx_api_keys_expiring;
DROP INDEX IF EXISTS idx_api_keys_user_active;
DROP INDEX IF EXISTS idx_api_keys_validation;

-- =====================================================
-- USAGE_EVENTS TABLE INDEXES
-- =====================================================
DROP INDEX IF EXISTS idx_usage_errors;
DROP INDEX IF EXISTS idx_usage_cost_tracking;
DROP INDEX IF EXISTS idx_usage_tool_status_time;
DROP INDEX IF EXISTS idx_usage_user_date_tool;

-- =====================================================
-- GLOBAL_ENTITIES TABLE INDEXES
-- =====================================================
DROP INDEX IF EXISTS idx_global_entities_domains_gin;
DROP INDEX IF EXISTS idx_global_entities_citations;
DROP INDEX IF EXISTS idx_global_entities_authority_refs;

-- =====================================================
-- LEARNING_ANALYSES TABLE INDEXES
-- =====================================================
DROP INDEX IF EXISTS idx_learning_improvement;
DROP INDEX IF EXISTS idx_learning_unapplied;

-- =====================================================
-- SUBSCRIPTIONS TABLE INDEXES
-- =====================================================
DROP INDEX IF EXISTS idx_subscriptions_canceled;
DROP INDEX IF EXISTS idx_subscriptions_expiring;
DROP INDEX IF EXISTS idx_subscriptions_active;

-- =====================================================
-- AUDIT_LOG TABLE INDEXES
-- =====================================================
DROP INDEX IF EXISTS idx_audit_log_security;
DROP INDEX IF EXISTS idx_audit_log_user_action_time;

-- =====================================================
-- SYNC_OPERATIONS TABLE INDEXES
-- =====================================================
DROP INDEX IF EXISTS idx_sync_ops_domain_completed;
DROP INDEX IF EXISTS idx_sync_ops_pending;

-- =====================================================
-- CITATION_PREDICTIONS TABLE INDEXES
-- =====================================================
DROP INDEX IF EXISTS idx_predictions_accuracy;
DROP INDEX IF EXISTS idx_predictions_high_prob;

-- Log rollback completion
DO $
BEGIN
  RAISE NOTICE '✅ Rollback 021 completed: Performance indexes removed';
  RAISE NOTICE 'Note: Query performance may degrade until indexes are recreated';
END $;
