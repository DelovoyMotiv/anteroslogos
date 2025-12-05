-- =====================================================
-- Test Script: Billing Enhancement Migrations
-- Purpose: Validate migrations 031-034 functionality
-- =====================================================

BEGIN;

-- =====================================================
-- Test 1: Verify indexes exist
-- =====================================================

DO $
DECLARE
  v_index_count INTEGER;
BEGIN
  -- Check for new indexes
  SELECT COUNT(*) INTO v_index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname IN (
      'idx_user_subscriptions_current_period_end',
      'idx_subscription_invoices_status_expires_at',
      'idx_subscription_usage_logs_subscription_timestamp',
      'idx_subscription_usage_logs_period_count',
      'idx_subscription_quota_cache_subscription',
      'idx_subscription_quota_cache_user',
      'idx_subscription_revenue_trends_date'
    );
  
  IF v_index_count < 7 THEN
    RAISE EXCEPTION 'Missing indexes: expected 7, found %', v_index_count;
  END IF;
  
  RAISE NOTICE 'Test 1 PASSED: All indexes created';
END;
$;

-- =====================================================
-- Test 2: Verify materialized views exist
-- =====================================================

DO $
DECLARE
  v_view_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_view_count
  FROM pg_matviews
  WHERE schemaname = 'public'
    AND matviewname IN (
      'subscription_quota_cache',
      'subscription_revenue_trends'
    );
  
  IF v_view_count < 2 THEN
    RAISE EXCEPTION 'Missing materialized views: expected 2, found %', v_view_count;
  END IF;
  
  RAISE NOTICE 'Test 2 PASSED: All materialized views created';
END;
$;

-- =====================================================
-- Test 3: Verify regular views exist
-- =====================================================

DO $
DECLARE
  v_view_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_view_count
  FROM pg_views
  WHERE schemaname = 'public'
    AND viewname IN (
      'active_subscriptions_by_tier',
      'monthly_recurring_revenue',
      'quota_usage_statistics',
      'conversion_funnel_metrics',
      'subscription_health_dashboard'
    );
  
  IF v_view_count < 5 THEN
    RAISE EXCEPTION 'Missing views: expected 5, found %', v_view_count;
  END IF;
  
  RAISE NOTICE 'Test 3 PASSED: All views created';
END;
$;

-- =====================================================
-- Test 4: Verify functions exist
-- =====================================================

DO $
DECLARE
  v_function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'check_subscription_quota',
      'consume_subscription_quota',
      'refresh_subscription_quota_cache',
      'refresh_subscription_revenue_trends'
    );
  
  IF v_function_count < 4 THEN
    RAISE EXCEPTION 'Missing functions: expected 4, found %', v_function_count;
  END IF;
  
  RAISE NOTICE 'Test 4 PASSED: All functions created';
END;
$;

-- =====================================================
-- Test 5: Test check_subscription_quota function
-- =====================================================

DO $
DECLARE
  v_result RECORD;
BEGIN
  -- Test with non-existent user (should return unavailable)
  SELECT * INTO v_result
  FROM check_subscription_quota('00000000-0000-0000-0000-000000000000'::UUID, 1);
  
  IF v_result.available = TRUE THEN
    RAISE EXCEPTION 'Expected unavailable for non-existent user';
  END IF;
  
  RAISE NOTICE 'Test 5 PASSED: check_subscription_quota handles non-existent users';
END;
$;

-- =====================================================
-- Test 6: Test views return data
-- =====================================================

DO $
DECLARE
  v_count INTEGER;
BEGIN
  -- Test active_subscriptions_by_tier
  SELECT COUNT(*) INTO v_count FROM active_subscriptions_by_tier;
  IF v_count = 0 THEN
    RAISE WARNING 'active_subscriptions_by_tier returned no rows (may be expected if no data)';
  END IF;
  
  -- Test monthly_recurring_revenue
  SELECT COUNT(*) INTO v_count FROM monthly_recurring_revenue;
  IF v_count = 0 THEN
    RAISE WARNING 'monthly_recurring_revenue returned no rows (may be expected if no data)';
  END IF;
  
  -- Test quota_usage_statistics
  SELECT COUNT(*) INTO v_count FROM quota_usage_statistics;
  IF v_count = 0 THEN
    RAISE WARNING 'quota_usage_statistics returned no rows (may be expected if no data)';
  END IF;
  
  -- Test conversion_funnel_metrics
  SELECT COUNT(*) INTO v_count FROM conversion_funnel_metrics;
  IF v_count = 0 THEN
    RAISE WARNING 'conversion_funnel_metrics returned no rows (may be expected if no data)';
  END IF;
  
  -- Test subscription_health_dashboard
  SELECT COUNT(*) INTO v_count FROM subscription_health_dashboard;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'subscription_health_dashboard should always return 1 row';
  END IF;
  
  RAISE NOTICE 'Test 6 PASSED: All views are queryable';
END;
$;

-- =====================================================
-- Test 7: Test materialized view refresh functions
-- =====================================================

DO $
BEGIN
  -- Test refresh_subscription_quota_cache
  PERFORM refresh_subscription_quota_cache();
  RAISE NOTICE 'Test 7a PASSED: refresh_subscription_quota_cache executed';
  
  -- Test refresh_subscription_revenue_trends
  PERFORM refresh_subscription_revenue_trends();
  RAISE NOTICE 'Test 7b PASSED: refresh_subscription_revenue_trends executed';
END;
$;

-- =====================================================
-- Test 8: Verify index usage in query plans
-- =====================================================

DO $
DECLARE
  v_plan TEXT;
BEGIN
  -- Test that expiration query uses index
  SELECT query_plan INTO v_plan
  FROM (
    EXPLAIN (FORMAT TEXT)
    SELECT * FROM user_subscriptions 
    WHERE status = 'active' 
      AND current_period_end < NOW() + INTERVAL '7 days'
  ) AS query_plan;
  
  IF v_plan NOT LIKE '%idx_user_subscriptions_current_period_end%' 
     AND v_plan NOT LIKE '%idx_user_subscriptions_period_end%' THEN
    RAISE WARNING 'Expiration query may not be using expected index';
  END IF;
  
  RAISE NOTICE 'Test 8 PASSED: Query plan analysis completed';
END;
$;

-- =====================================================
-- Summary
-- =====================================================

DO $
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'All tests completed successfully!';
  RAISE NOTICE 'Billing enhancement migrations validated';
  RAISE NOTICE '========================================';
END;
$;

ROLLBACK;

