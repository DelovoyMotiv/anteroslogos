-- =====================================================
-- Migration 031: Billing System Performance Indexes
-- Purpose: Add missing indexes for query performance optimization
-- Requirements: 8.1, 9.1
-- =====================================================

-- =====================================================
-- INDEXES: user_subscriptions
-- =====================================================

-- Index for expiration queries (renewal engine)
-- Supports: SELECT * FROM user_subscriptions WHERE current_period_end < NOW() + INTERVAL '7 days'
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_current_period_end 
  ON public.user_subscriptions(current_period_end)
  WHERE status = 'active' AND current_period_end IS NOT NULL;

COMMENT ON INDEX idx_user_subscriptions_current_period_end IS 
  'Optimizes renewal engine queries for subscriptions expiring soon';

-- =====================================================
-- INDEXES: subscription_invoices
-- =====================================================

-- Composite index for pending invoice queries (payment detector)
-- Supports: SELECT * FROM subscription_invoices WHERE status = 'pending' AND expires_at > NOW()
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_status_expires_at 
  ON public.subscription_invoices(status, expires_at)
  WHERE status = 'pending';

COMMENT ON INDEX idx_subscription_invoices_status_expires_at IS 
  'Optimizes payment detector queries for pending invoices';

-- =====================================================
-- INDEXES: subscription_usage_logs
-- =====================================================

-- Composite index for usage history queries
-- Supports: SELECT * FROM subscription_usage_logs WHERE subscription_id = ? ORDER BY timestamp DESC
CREATE INDEX IF NOT EXISTS idx_subscription_usage_logs_subscription_timestamp 
  ON public.subscription_usage_logs(subscription_id, timestamp DESC);

COMMENT ON INDEX idx_subscription_usage_logs_subscription_timestamp IS 
  'Optimizes usage history queries with descending timestamp ordering';

-- =====================================================
-- ANALYZE: Update table statistics
-- =====================================================

ANALYZE public.user_subscriptions;
ANALYZE public.subscription_invoices;
ANALYZE public.subscription_usage_logs;

