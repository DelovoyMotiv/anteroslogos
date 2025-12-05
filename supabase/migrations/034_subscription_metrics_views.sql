-- =====================================================
-- Migration 034: Subscription Metrics Views
-- Purpose: Create monitoring views for subscription analytics
-- Requirements: 10.1, 10.2, 10.3, 10.4
-- =====================================================

-- =====================================================
-- VIEW: active_subscriptions_by_tier
-- Purpose: Count of active subscriptions per tier
-- Requirement: 10.1
-- =====================================================

CREATE OR REPLACE VIEW public.active_subscriptions_by_tier AS
SELECT 
  p.plan_name,
  p.display_name,
  p.price_usd,
  COUNT(s.id) AS active_count,
  COUNT(s.id) FILTER (WHERE s.cancel_at_period_end = TRUE) AS cancelling_count,
  COUNT(s.id) FILTER (WHERE s.current_period_end < NOW() + INTERVAL '7 days') AS expiring_soon_count,
  MIN(s.created_at) AS first_subscription_date,
  MAX(s.created_at) AS latest_subscription_date
FROM public.subscription_plans p
LEFT JOIN public.user_subscriptions s ON p.id = s.plan_id 
  AND s.status = 'active'
GROUP BY p.id, p.plan_name, p.display_name, p.price_usd
ORDER BY p.price_usd ASC;

COMMENT ON VIEW public.active_subscriptions_by_tier IS 
  'Active subscription counts by tier with cancellation and expiration metrics';

-- =====================================================
-- VIEW: monthly_recurring_revenue
-- Purpose: Calculate MRR by plan tier
-- Requirement: 10.2
-- =====================================================

CREATE OR REPLACE VIEW public.monthly_recurring_revenue AS
SELECT 
  p.plan_name,
  p.display_name,
  p.price_usd AS plan_price,
  COUNT(s.id) AS active_subscriptions,
  (COUNT(s.id) * p.price_usd) AS tier_mrr,
  COUNT(s.id) FILTER (WHERE s.cancel_at_period_end = TRUE) AS at_risk_subscriptions,
  (COUNT(s.id) FILTER (WHERE s.cancel_at_period_end = TRUE) * p.price_usd) AS at_risk_mrr
FROM public.subscription_plans p
LEFT JOIN public.user_subscriptions s ON p.id = s.plan_id 
  AND s.status = 'active'
WHERE p.plan_name != 'free' -- Exclude free tier from revenue calculations
GROUP BY p.id, p.plan_name, p.display_name, p.price_usd
ORDER BY p.price_usd DESC;

COMMENT ON VIEW public.monthly_recurring_revenue IS 
  'Monthly recurring revenue (MRR) by tier with at-risk revenue tracking';

-- =====================================================
-- VIEW: quota_usage_statistics
-- Purpose: Analyze quota consumption patterns by tier
-- Requirement: 10.3
-- =====================================================

CREATE OR REPLACE VIEW public.quota_usage_statistics AS
SELECT 
  p.plan_name,
  p.display_name,
  p.audit_quota,
  COUNT(DISTINCT s.id) AS active_subscriptions,
  COALESCE(AVG(usage_counts.usage_count), 0) AS avg_usage,
  COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY usage_counts.usage_count), 0) AS median_usage,
  COALESCE(MAX(usage_counts.usage_count), 0) AS max_usage,
  COALESCE(MIN(usage_counts.usage_count), 0) AS min_usage,
  COALESCE(AVG(usage_counts.usage_count::NUMERIC / NULLIF(p.audit_quota, 0) * 100), 0) AS avg_quota_utilization_pct,
  COUNT(DISTINCT s.id) FILTER (
    WHERE usage_counts.usage_count >= p.audit_quota * 0.8
  ) AS near_limit_count,
  COUNT(DISTINCT s.id) FILTER (
    WHERE usage_counts.usage_count >= p.audit_quota
  ) AS at_limit_count
FROM public.subscription_plans p
LEFT JOIN public.user_subscriptions s ON p.id = s.plan_id 
  AND s.status = 'active'
LEFT JOIN LATERAL (
  SELECT 
    s.id AS subscription_id,
    COUNT(*) AS usage_count
  FROM public.subscription_usage_logs ul
  WHERE ul.subscription_id = s.id
    AND ul.timestamp >= s.current_period_start
    AND ul.timestamp < s.current_period_end
  GROUP BY s.id
) usage_counts ON TRUE
WHERE p.plan_name != 'free' OR s.id IS NOT NULL -- Include free tier only if subscriptions exist
GROUP BY p.id, p.plan_name, p.display_name, p.audit_quota
ORDER BY p.price_usd ASC;

COMMENT ON VIEW public.quota_usage_statistics IS 
  'Quota consumption statistics by tier with utilization percentages';

-- =====================================================
-- VIEW: conversion_funnel_metrics
-- Purpose: Track conversion rates from free to paid tiers
-- Requirement: 10.4
-- =====================================================

CREATE OR REPLACE VIEW public.conversion_funnel_metrics AS
WITH user_subscription_history AS (
  SELECT 
    s.user_id,
    p.plan_name,
    p.price_usd,
    s.status,
    s.created_at,
    ROW_NUMBER() OVER (PARTITION BY s.user_id ORDER BY s.created_at) AS subscription_sequence
  FROM public.user_subscriptions s
  INNER JOIN public.subscription_plans p ON s.plan_id = p.id
),
first_subscriptions AS (
  SELECT 
    user_id,
    plan_name AS first_plan,
    created_at AS first_subscription_date
  FROM user_subscription_history
  WHERE subscription_sequence = 1
),
conversions AS (
  SELECT 
    fs.first_plan,
    COUNT(DISTINCT fs.user_id) AS total_users,
    COUNT(DISTINCT CASE 
      WHEN ush.plan_name IN ('starter', 'pro', 'enterprise') 
      THEN ush.user_id 
    END) AS converted_to_paid,
    COUNT(DISTINCT CASE 
      WHEN ush.plan_name = 'starter' 
      THEN ush.user_id 
    END) AS converted_to_starter,
    COUNT(DISTINCT CASE 
      WHEN ush.plan_name = 'pro' 
      THEN ush.user_id 
    END) AS converted_to_pro,
    COUNT(DISTINCT CASE 
      WHEN ush.plan_name = 'enterprise' 
      THEN ush.user_id 
    END) AS converted_to_enterprise,
    AVG(EXTRACT(EPOCH FROM (ush.created_at - fs.first_subscription_date)) / 86400) 
      FILTER (WHERE ush.subscription_sequence > 1) AS avg_days_to_conversion
  FROM first_subscriptions fs
  LEFT JOIN user_subscription_history ush ON fs.user_id = ush.user_id
  GROUP BY fs.first_plan
)
SELECT 
  first_plan,
  total_users,
  converted_to_paid,
  ROUND((converted_to_paid::NUMERIC / NULLIF(total_users, 0) * 100), 2) AS conversion_rate_pct,
  converted_to_starter,
  converted_to_pro,
  converted_to_enterprise,
  ROUND(avg_days_to_conversion, 1) AS avg_days_to_conversion
FROM conversions
ORDER BY 
  CASE first_plan
    WHEN 'free' THEN 1
    WHEN 'starter' THEN 2
    WHEN 'pro' THEN 3
    WHEN 'enterprise' THEN 4
  END;

COMMENT ON VIEW public.conversion_funnel_metrics IS 
  'Conversion funnel tracking from initial plan to paid tiers';

-- =====================================================
-- VIEW: subscription_health_dashboard
-- Purpose: Comprehensive health metrics for monitoring
-- Combines multiple metrics for operational dashboard
-- =====================================================

CREATE OR REPLACE VIEW public.subscription_health_dashboard AS
SELECT 
  -- Overall metrics
  (SELECT COUNT(*) FROM public.user_subscriptions WHERE status = 'active') AS total_active_subscriptions,
  (SELECT SUM(tier_mrr) FROM public.monthly_recurring_revenue) AS total_mrr,
  
  -- Pending invoices
  (SELECT COUNT(*) FROM public.subscription_invoices WHERE status = 'pending') AS pending_invoices_count,
  (SELECT COUNT(*) FROM public.subscription_invoices 
   WHERE status = 'pending' AND expires_at < NOW() + INTERVAL '24 hours') AS invoices_expiring_soon,
  (SELECT COUNT(*) FROM public.subscription_invoices 
   WHERE status = 'pending' AND created_at < NOW() - INTERVAL '24 hours') AS stuck_invoices_count,
  
  -- Subscription health
  (SELECT COUNT(*) FROM public.user_subscriptions 
   WHERE status = 'active' AND cancel_at_period_end = TRUE) AS cancelling_subscriptions,
  (SELECT COUNT(*) FROM public.user_subscriptions 
   WHERE status = 'active' AND current_period_end < NOW() + INTERVAL '7 days') AS expiring_within_7_days,
  (SELECT COUNT(*) FROM public.user_subscriptions 
   WHERE status = 'active' AND current_period_end < NOW() + INTERVAL '3 days') AS expiring_within_3_days,
  
  -- Quota health
  (SELECT COUNT(DISTINCT s.id) 
   FROM public.user_subscriptions s
   INNER JOIN public.subscription_plans p ON s.plan_id = p.id
   INNER JOIN LATERAL (
     SELECT COUNT(*) AS usage_count
     FROM public.subscription_usage_logs ul
     WHERE ul.subscription_id = s.id
       AND ul.timestamp >= s.current_period_start
   ) usage ON TRUE
   WHERE s.status = 'active' 
     AND usage.usage_count >= p.audit_quota * 0.8) AS subscriptions_near_quota_limit,
  
  -- Timestamp
  NOW() AS snapshot_time;

COMMENT ON VIEW public.subscription_health_dashboard IS 
  'Comprehensive subscription health metrics for operational monitoring';

-- =====================================================
-- MATERIALIZED VIEW: subscription_revenue_trends
-- Purpose: Historical revenue trends (refreshed daily)
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.subscription_revenue_trends AS
WITH daily_snapshots AS (
  SELECT 
    DATE_TRUNC('day', s.created_at) AS snapshot_date,
    p.plan_name,
    COUNT(s.id) AS new_subscriptions,
    SUM(p.price_usd) AS new_mrr
  FROM public.user_subscriptions s
  INNER JOIN public.subscription_plans p ON s.plan_id = p.id
  WHERE s.status IN ('active', 'cancelled', 'expired')
  GROUP BY DATE_TRUNC('day', s.created_at), p.plan_name
),
cancellation_snapshots AS (
  SELECT 
    DATE_TRUNC('day', s.cancelled_at) AS snapshot_date,
    p.plan_name,
    COUNT(s.id) AS cancelled_subscriptions,
    SUM(p.price_usd) AS churned_mrr
  FROM public.user_subscriptions s
  INNER JOIN public.subscription_plans p ON s.plan_id = p.id
  WHERE s.cancelled_at IS NOT NULL
  GROUP BY DATE_TRUNC('day', s.cancelled_at), p.plan_name
)
SELECT 
  COALESCE(ds.snapshot_date, cs.snapshot_date) AS date,
  COALESCE(ds.plan_name, cs.plan_name) AS plan_name,
  COALESCE(ds.new_subscriptions, 0) AS new_subscriptions,
  COALESCE(ds.new_mrr, 0) AS new_mrr,
  COALESCE(cs.cancelled_subscriptions, 0) AS cancelled_subscriptions,
  COALESCE(cs.churned_mrr, 0) AS churned_mrr,
  COALESCE(ds.new_mrr, 0) - COALESCE(cs.churned_mrr, 0) AS net_mrr_change
FROM daily_snapshots ds
FULL OUTER JOIN cancellation_snapshots cs 
  ON ds.snapshot_date = cs.snapshot_date 
  AND ds.plan_name = cs.plan_name
ORDER BY date DESC, plan_name;

-- Create index for fast date range queries
CREATE INDEX IF NOT EXISTS idx_subscription_revenue_trends_date 
  ON public.subscription_revenue_trends(date DESC);

COMMENT ON MATERIALIZED VIEW public.subscription_revenue_trends IS 
  'Historical revenue trends by day and plan tier (refresh daily)';

-- =====================================================
-- FUNCTION: refresh_subscription_revenue_trends
-- Purpose: Refresh the revenue trends materialized view
-- =====================================================

CREATE OR REPLACE FUNCTION public.refresh_subscription_revenue_trends()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.subscription_revenue_trends;
END;
$;

COMMENT ON FUNCTION public.refresh_subscription_revenue_trends IS 
  'Refresh revenue trends materialized view (call from cron daily)';

-- =====================================================
-- GRANTS: Allow authenticated users to view metrics
-- =====================================================

GRANT SELECT ON public.active_subscriptions_by_tier TO authenticated;
GRANT SELECT ON public.monthly_recurring_revenue TO authenticated;
GRANT SELECT ON public.quota_usage_statistics TO authenticated;
GRANT SELECT ON public.conversion_funnel_metrics TO authenticated;
GRANT SELECT ON public.subscription_health_dashboard TO authenticated;
GRANT SELECT ON public.subscription_revenue_trends TO authenticated;

-- =====================================================
-- ANALYZE: Update table statistics
-- =====================================================

ANALYZE public.user_subscriptions;
ANALYZE public.subscription_invoices;
ANALYZE public.subscription_usage_logs;

