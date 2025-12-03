-- =====================================================
-- Rollback Migration 023: Database Constraints Enhancement
-- Purpose: Remove constraints added in migration 023
-- Date: 2025-12-02
-- =====================================================

-- WARNING: This rollback removes data integrity constraints
-- Only use this if absolutely necessary

-- =====================================================
-- PART 1: DROP CHECK CONSTRAINTS
-- =====================================================

-- Profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_credits_remaining_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_total_audits_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_email_format_check;

-- Audits
ALTER TABLE public.audits DROP CONSTRAINT IF EXISTS audits_duration_ms_check;
ALTER TABLE public.audits DROP CONSTRAINT IF EXISTS audits_scores_range_check;
ALTER TABLE public.audits DROP CONSTRAINT IF EXISTS audits_url_format_check;

-- Knowledge Graphs
ALTER TABLE public.knowledge_graphs DROP CONSTRAINT IF EXISTS knowledge_graphs_version_check;
ALTER TABLE public.knowledge_graphs DROP CONSTRAINT IF EXISTS knowledge_graphs_learning_version_check;
ALTER TABLE public.knowledge_graphs DROP CONSTRAINT IF EXISTS knowledge_graphs_learning_updates_check;

-- Citations
ALTER TABLE public.citations DROP CONSTRAINT IF EXISTS citations_confidence_range_check;
ALTER TABLE public.citations DROP CONSTRAINT IF EXISTS citations_query_not_empty_check;
ALTER TABLE public.citations DROP CONSTRAINT IF EXISTS citations_response_not_empty_check;

-- API Keys
ALTER TABLE public.api_keys DROP CONSTRAINT IF EXISTS api_keys_rate_limits_positive_check;
ALTER TABLE public.api_keys DROP CONSTRAINT IF EXISTS api_keys_usage_count_check;
ALTER TABLE public.api_keys DROP CONSTRAINT IF EXISTS api_keys_name_length_check;

-- Agent Keys
ALTER TABLE public.agent_keys DROP CONSTRAINT IF EXISTS agent_keys_name_length_check;
ALTER TABLE public.agent_keys DROP CONSTRAINT IF EXISTS agent_keys_aid_uri_format_check;
ALTER TABLE public.agent_keys DROP CONSTRAINT IF EXISTS agent_keys_public_key_length_check;

-- Usage Events
ALTER TABLE public.usage_events DROP CONSTRAINT IF EXISTS usage_events_duration_ms_check;
ALTER TABLE public.usage_events DROP CONSTRAINT IF EXISTS usage_events_tokens_used_check;
ALTER TABLE public.usage_events DROP CONSTRAINT IF EXISTS usage_events_cost_usd_check;

-- Tenants
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_name_length_check;
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_slug_format_check;
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_primary_color_format_check;

-- Tenant Members
ALTER TABLE public.tenant_members DROP CONSTRAINT IF EXISTS tenant_members_role_check;
ALTER TABLE public.tenant_members DROP CONSTRAINT IF EXISTS tenant_members_status_check;
ALTER TABLE public.tenant_members DROP CONSTRAINT IF EXISTS tenant_members_invited_at_check;

-- A2A Wallets
ALTER TABLE public.a2a_wallets DROP CONSTRAINT IF EXISTS a2a_wallets_address_format_check;
ALTER TABLE public.a2a_wallets DROP CONSTRAINT IF EXISTS a2a_wallets_chain_id_check;
ALTER TABLE public.a2a_wallets DROP CONSTRAINT IF EXISTS a2a_wallets_custodial_encryption_check;

-- A2A Invoices
ALTER TABLE public.a2a_invoices DROP CONSTRAINT IF EXISTS a2a_invoices_amount_positive_check;
ALTER TABLE public.a2a_invoices DROP CONSTRAINT IF EXISTS a2a_invoices_token_check;
ALTER TABLE public.a2a_invoices DROP CONSTRAINT IF EXISTS a2a_invoices_confirmations_check;

-- A2A Ledger
ALTER TABLE public.a2a_ledger DROP CONSTRAINT IF EXISTS a2a_ledger_amount_positive_check;
ALTER TABLE public.a2a_ledger DROP CONSTRAINT IF EXISTS a2a_ledger_balance_after_check;
ALTER TABLE public.a2a_ledger DROP CONSTRAINT IF EXISTS a2a_ledger_entry_type_check;
ALTER TABLE public.a2a_ledger DROP CONSTRAINT IF EXISTS a2a_ledger_token_check;

-- Subscription Plans
ALTER TABLE public.subscription_plans DROP CONSTRAINT IF EXISTS subscription_plans_price_usd_check;
ALTER TABLE public.subscription_plans DROP CONSTRAINT IF EXISTS subscription_plans_billing_cycle_check;
ALTER TABLE public.subscription_plans DROP CONSTRAINT IF EXISTS subscription_plans_audit_quota_check;

-- User Subscriptions
ALTER TABLE public.user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_status_check;
ALTER TABLE public.user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_active_period_check;
ALTER TABLE public.user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_period_order_check;

-- Subscription Invoices
ALTER TABLE public.subscription_invoices DROP CONSTRAINT IF EXISTS subscription_invoices_amount_positive_check;
ALTER TABLE public.subscription_invoices DROP CONSTRAINT IF EXISTS subscription_invoices_billing_period_check;
ALTER TABLE public.subscription_invoices DROP CONSTRAINT IF EXISTS subscription_invoices_paid_tx_hash_check;

-- Subscription Usage Logs
ALTER TABLE public.subscription_usage_logs DROP CONSTRAINT IF EXISTS subscription_usage_logs_cost_units_check;
ALTER TABLE public.subscription_usage_logs DROP CONSTRAINT IF EXISTS subscription_usage_logs_quota_remaining_check;
ALTER TABLE public.subscription_usage_logs DROP CONSTRAINT IF EXISTS subscription_usage_logs_event_type_check;

-- Global Entities
ALTER TABLE public.global_entities DROP CONSTRAINT IF EXISTS global_entities_confidence_score_check;
ALTER TABLE public.global_entities DROP CONSTRAINT IF EXISTS global_entities_authority_score_check;
ALTER TABLE public.global_entities DROP CONSTRAINT IF EXISTS global_entities_total_references_check;
ALTER TABLE public.global_entities DROP CONSTRAINT IF EXISTS global_entities_total_citations_check;

-- Global Relationships
ALTER TABLE public.global_relationships DROP CONSTRAINT IF EXISTS global_relationships_confidence_score_check;
ALTER TABLE public.global_relationships DROP CONSTRAINT IF EXISTS global_relationships_citation_count_check;
ALTER TABLE public.global_relationships DROP CONSTRAINT IF EXISTS global_relationships_no_self_reference_check;

-- Learning Analyses
ALTER TABLE public.learning_analyses DROP CONSTRAINT IF EXISTS learning_analyses_total_citations_check;
ALTER TABLE public.learning_analyses DROP CONSTRAINT IF EXISTS learning_analyses_scores_range_check;
ALTER TABLE public.learning_analyses DROP CONSTRAINT IF EXISTS learning_analyses_applied_update_count_check;

-- =====================================================
-- PART 2: DROP UTILITY FUNCTION
-- =====================================================

DROP FUNCTION IF EXISTS verify_constraint_coverage();

-- =====================================================
-- ROLLBACK COMPLETE
-- =====================================================

DO $
BEGIN
  RAISE NOTICE '✅ Rollback 023 completed successfully';
  RAISE NOTICE 'All constraints from migration 023 have been removed';
  RAISE NOTICE 'WARNING: Data integrity is now reduced';
END $;

