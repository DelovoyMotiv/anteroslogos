-- Migration: Subscription Webhooks System
-- Description: Create tables and functions for webhook notification system
-- Feature: billing-system-enhancement
-- Requirements: 9.5

-- =====================================================
-- Subscription Webhooks Table
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL CHECK (webhook_url ~ '^https?://'),
  secret_key TEXT NOT NULL, -- HMAC secret for signature verification
  events TEXT[] NOT NULL DEFAULT '{}', -- Array of subscribed events
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_user_webhook_url UNIQUE (user_id, webhook_url)
);

CREATE INDEX idx_subscription_webhooks_user ON subscription_webhooks(user_id);
CREATE INDEX idx_subscription_webhooks_active ON subscription_webhooks(is_active) WHERE is_active = true;

COMMENT ON TABLE subscription_webhooks IS 'Webhook endpoints for subscription event notifications';
COMMENT ON COLUMN subscription_webhooks.secret_key IS 'HMAC-SHA256 secret for webhook signature verification';
COMMENT ON COLUMN subscription_webhooks.events IS 'Array of event types: subscription.created, subscription.activated, subscription.cancelled, payment.verified';

-- =====================================================
-- Webhook Delivery Log Table
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES subscription_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'subscription.created',
    'subscription.activated',
    'subscription.cancelled',
    'payment.verified'
  )),
  payload JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'retrying')),
  http_status_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_deliveries_webhook ON subscription_webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_status ON subscription_webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_retry ON subscription_webhook_deliveries(next_retry_at) 
  WHERE status = 'retrying' AND next_retry_at IS NOT NULL;
CREATE INDEX idx_webhook_deliveries_created ON subscription_webhook_deliveries(created_at DESC);

COMMENT ON TABLE subscription_webhook_deliveries IS 'Delivery log for webhook notifications with retry tracking';

-- =====================================================
-- RLS Policies
-- =====================================================

ALTER TABLE subscription_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Users can manage their own webhooks
CREATE POLICY subscription_webhooks_user_policy ON subscription_webhooks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own webhook deliveries
CREATE POLICY subscription_webhook_deliveries_user_policy ON subscription_webhook_deliveries
  FOR SELECT
  USING (
    webhook_id IN (
      SELECT id FROM subscription_webhooks WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to get pending webhook deliveries for retry
CREATE OR REPLACE FUNCTION get_pending_webhook_deliveries()
RETURNS TABLE (
  id UUID,
  webhook_id UUID,
  webhook_url TEXT,
  secret_key TEXT,
  event_type TEXT,
  payload JSONB,
  attempt_count INTEGER,
  max_attempts INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.webhook_id,
    w.webhook_url,
    w.secret_key,
    d.event_type,
    d.payload,
    d.attempt_count,
    d.max_attempts
  FROM subscription_webhook_deliveries d
  JOIN subscription_webhooks w ON w.id = d.webhook_id
  WHERE d.status = 'retrying'
    AND d.next_retry_at <= NOW()
    AND d.attempt_count < d.max_attempts
    AND w.is_active = true
  ORDER BY d.next_retry_at ASC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_pending_webhook_deliveries IS 'Get webhook deliveries ready for retry';

-- Function to update webhook delivery status
CREATE OR REPLACE FUNCTION update_webhook_delivery_status(
  p_delivery_id UUID,
  p_status TEXT,
  p_http_status_code INTEGER DEFAULT NULL,
  p_response_body TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_attempt_count INTEGER;
  v_max_attempts INTEGER;
  v_next_retry_at TIMESTAMPTZ;
BEGIN
  -- Get current attempt count
  SELECT attempt_count, max_attempts INTO v_attempt_count, v_max_attempts
  FROM subscription_webhook_deliveries
  WHERE id = p_delivery_id;
  
  -- Increment attempt count
  v_attempt_count := v_attempt_count + 1;
  
  -- Calculate next retry time with exponential backoff
  -- Retry delays: 1 min, 5 min, 15 min
  IF p_status = 'failed' AND v_attempt_count < v_max_attempts THEN
    v_next_retry_at := NOW() + (POWER(5, v_attempt_count) || ' minutes')::INTERVAL;
    p_status := 'retrying';
  ELSE
    v_next_retry_at := NULL;
  END IF;
  
  -- Update delivery record
  UPDATE subscription_webhook_deliveries
  SET 
    status = p_status,
    http_status_code = p_http_status_code,
    response_body = p_response_body,
    error_message = p_error_message,
    attempt_count = v_attempt_count,
    next_retry_at = v_next_retry_at,
    delivered_at = CASE WHEN p_status = 'success' THEN NOW() ELSE delivered_at END,
    updated_at = NOW()
  WHERE id = p_delivery_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_webhook_delivery_status IS 'Update webhook delivery status with retry logic';

