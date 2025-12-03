-- ============================================
-- Migration 22: 021_performance_indexes.sql
-- ============================================

-- Performance Optimization: Missing Indexes Migration
-- Generated based on query analysis and N+1 pattern detection
-- Addresses Requirements 4.1, 4.2 (Performance Optimization)

-- =====================================================
-- PROFILES TABLE INDEXES
-- =====================================================

-- Index for subscription status queries
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status 
  ON public.profiles(subscription_status) 
  WHERE subscription_status = 'active';

-- Index for plan type with credits (common filter)
CREATE INDEX IF NOT EXISTS idx_profiles_plan_credits 
  ON public.profiles(plan_type, credits_remaining) 
  WHERE credits_remaining > 0;

-- Index for Stripe customer lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_lookup 
  ON public.profiles(stripe_customer_id, subscription_status) 
  WHERE stripe_customer_id IS NOT NULL;

-- =====================================================
-- AUDITS TABLE INDEXES
-- =====================================================

-- Composite index for user's recent audits (most common query)
CREATE INDEX IF NOT EXISTS idx_audits_user_recent 
  ON public.audits(user_id, timestamp DESC, overall_score) 
  WHERE deleted_at IS NULL;

-- Index for domain-based analytics
CREATE INDEX IF NOT EXISTS idx_audits_domain_score 
  ON public.audits(domain, overall_score, timestamp DESC) 
  WHERE deleted_at IS NULL AND is_public = TRUE;

-- Index for grade-based filtering
CREATE INDEX IF NOT EXISTS idx_audits_grade_timestamp 
  ON public.audits(grade, timestamp DESC) 
  WHERE deleted_at IS NULL;

-- Partial index for failed audits (troubleshooting)
CREATE INDEX IF NOT EXISTS idx_audits_low_scores 
  ON public.audits(user_id, timestamp DESC) 
  WHERE overall_score < 50 AND deleted_at IS NULL;

-- =====================================================
-- KNOWLEDGE_GRAPHS TABLE INDEXES
-- =====================================================

-- Composite index for current KG lookup (most frequent query)
CREATE INDEX IF NOT EXISTS idx_kg_user_domain_current 
  ON public.knowledge_graphs(user_id, domain, is_current, id) 
  WHERE is_current = TRUE AND deleted_at IS NULL;

-- Index for version history queries
CREATE INDEX IF NOT EXISTS idx_kg_version_history 
  ON public.knowledge_graphs(user_id, domain, version DESC) 
  WHERE deleted_at IS NULL;

-- Index for entity count analytics
CREATE INDEX IF NOT EXISTS idx_kg_entity_count 
  ON public.knowledge_graphs(entity_count DESC, created_at DESC) 
  WHERE deleted_at IS NULL;

-- =====================================================
-- CITATIONS TABLE INDEXES
-- =====================================================

-- Composite index for KG citations (N+1 query prevention)
CREATE INDEX IF NOT EXISTS idx_citations_kg_timestamp 
  ON public.citations(knowledge_graph_id, timestamp DESC, source) 
  WHERE deleted_at IS NULL;

-- Index for source-based analytics
CREATE INDEX IF NOT EXISTS idx_citations_source_confidence 
  ON public.citations(source, confidence DESC, timestamp DESC) 
  WHERE deleted_at IS NULL;

-- Index for entity citation tracking
CREATE INDEX IF NOT EXISTS idx_citations_entity_source 
  ON public.citations(cited_entity, source, timestamp DESC) 
  WHERE cited_entity IS NOT NULL AND deleted_at IS NULL;

-- =====================================================
-- API_KEYS TABLE INDEXES
-- =====================================================

-- Composite index for active key validation (hot path)
CREATE INDEX IF NOT EXISTS idx_api_keys_validation 
  ON public.api_keys(key_hash, revoked, expires_at) 
  WHERE revoked = FALSE;

-- Index for user's active keys
CREATE INDEX IF NOT EXISTS idx_api_keys_user_active 
  ON public.api_keys(user_id, created_at DESC) 
  WHERE revoked = FALSE;

-- Index for expiring keys (cleanup job)
CREATE INDEX IF NOT EXISTS idx_api_keys_expiring 
  ON public.api_keys(expires_at) 
  WHERE revoked = FALSE AND expires_at IS NOT NULL AND expires_at < NOW() + INTERVAL '7 days';

-- =====================================================
-- USAGE_EVENTS TABLE INDEXES
-- =====================================================

-- Composite index for user usage queries (dashboard)
CREATE INDEX IF NOT EXISTS idx_usage_user_date_tool 
  ON public.usage_events(user_id, timestamp DESC, tool_name, status);

-- Index for tool analytics
CREATE INDEX IF NOT EXISTS idx_usage_tool_status_time 
  ON public.usage_events(tool_name, status, timestamp DESC);

-- Index for cost tracking
CREATE INDEX IF NOT EXISTS idx_usage_cost_tracking 
  ON public.usage_events(user_id, timestamp DESC, cost_usd) 
  WHERE cost_usd > 0;

-- Partial index for errors (monitoring)
CREATE INDEX IF NOT EXISTS idx_usage_errors 
  ON public.usage_events(timestamp DESC, tool_name, error_message) 
  WHERE status = 'error';

-- =====================================================
-- GLOBAL_ENTITIES TABLE INDEXES
-- =====================================================

-- Index for authority-based ranking
CREATE INDEX IF NOT EXISTS idx_global_entities_authority_refs 
  ON public.global_entities(authority_score DESC, total_references DESC);

-- Index for citation tracking
CREATE INDEX IF NOT EXISTS idx_global_entities_citations 
  ON public.global_entities(total_citations DESC, last_updated DESC);

-- GIN index for domain array searches (network effects)
CREATE INDEX IF NOT EXISTS idx_global_entities_domains_gin 
  ON public.global_entities USING GIN (referenced_by_domains);

-- =====================================================
-- LEARNING_ANALYSES TABLE INDEXES
-- =====================================================

-- Index for unapplied analyses (action items)
CREATE INDEX IF NOT EXISTS idx_learning_unapplied 
  ON public.learning_analyses(knowledge_graph_id, created_at DESC) 
  WHERE updates_applied = FALSE;

-- Index for improvement tracking
CREATE INDEX IF NOT EXISTS idx_learning_improvement 
  ON public.learning_analyses(expected_improvement DESC, created_at DESC);

-- =====================================================
-- SUBSCRIPTIONS TABLE INDEXES
-- =====================================================

-- Index for active subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_active 
  ON public.subscriptions(status, current_period_end) 
  WHERE status = 'active';

-- Index for expiring subscriptions (renewal reminders)
CREATE INDEX IF NOT EXISTS idx_subscriptions_expiring 
  ON public.subscriptions(current_period_end, user_id) 
  WHERE status = 'active' AND current_period_end < NOW() + INTERVAL '7 days';

-- Index for canceled subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_canceled 
  ON public.subscriptions(canceled_at DESC) 
  WHERE cancel_at_period_end = TRUE;

-- =====================================================
-- AUDIT_LOG TABLE INDEXES
-- =====================================================

-- Composite index for user audit trail
CREATE INDEX IF NOT EXISTS idx_audit_log_user_action_time 
  ON public.audit_log(user_id, action, timestamp DESC);

-- Index for security monitoring
CREATE INDEX IF NOT EXISTS idx_audit_log_security 
  ON public.audit_log(action, timestamp DESC) 
  WHERE action LIKE 'security.%' OR action LIKE 'auth.%';

-- =====================================================
-- SYNC_OPERATIONS TABLE INDEXES
-- =====================================================

-- Index for pending operations
CREATE INDEX IF NOT EXISTS idx_sync_ops_pending 
  ON public.sync_operations(created_at DESC, operation_type) 
  WHERE completed_at IS NULL;

-- Index for domain sync history
CREATE INDEX IF NOT EXISTS idx_sync_ops_domain_completed 
  ON public.sync_operations(domain, completed_at DESC) 
  WHERE completed_at IS NOT NULL;

-- =====================================================
-- CITATION_PREDICTIONS TABLE INDEXES
-- =====================================================

-- Index for high-probability predictions
CREATE INDEX IF NOT EXISTS idx_predictions_high_prob 
  ON public.citation_predictions(overall_probability DESC, created_at DESC) 
  WHERE overall_probability >= 70;

-- Index for accuracy tracking
CREATE INDEX IF NOT EXISTS idx_predictions_accuracy 
  ON public.citation_predictions(prediction_accuracy DESC) 
  WHERE prediction_accuracy IS NOT NULL;

-- =====================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- =====================================================

-- Update statistics for query planner optimization
ANALYZE public.profiles;
ANALYZE public.audits;
ANALYZE public.knowledge_graphs;
ANALYZE public.citations;
ANALYZE public.api_keys;
ANALYZE public.usage_events;
ANALYZE public.global_entities;
ANALYZE public.learning_analyses;
ANALYZE public.subscriptions;
ANALYZE public.audit_log;
ANALYZE public.sync_operations;
ANALYZE public.citation_predictions;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON INDEX idx_audits_user_recent IS 'Optimizes user dashboard queries for recent audits';
COMMENT ON INDEX idx_kg_user_domain_current IS 'Prevents N+1 queries when loading current knowledge graphs';
COMMENT ON INDEX idx_citations_kg_timestamp IS 'Optimizes citation loading for knowledge graphs';
COMMENT ON INDEX idx_api_keys_validation IS 'Hot path optimization for API key validation';
COMMENT ON INDEX idx_usage_user_date_tool IS 'Optimizes usage analytics dashboard queries';
COMMENT ON INDEX idx_global_entities_domains_gin IS 'Enables fast network effect domain searches';

-- =====================================================
-- VACUUM AND REINDEX (Run during maintenance window)
-- =====================================================

-- Uncomment to run during maintenance:
-- VACUUM ANALYZE public.profiles;
-- VACUUM ANALYZE public.audits;
-- VACUUM ANALYZE public.knowledge_graphs;
-- VACUUM ANALYZE public.citations;
-- VACUUM ANALYZE public.usage_events;


-- Migration complete: 021_performance_indexes.sql


