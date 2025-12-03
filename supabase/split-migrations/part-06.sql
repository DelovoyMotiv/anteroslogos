-- ============================================
-- Migration 6: 006_payment_correlation_index.sql
-- ============================================

-- =====================================================
-- Migration: 006 - Payment Correlation for Auto-Detection
-- Purpose: Enable automatic payment detection without explicit txHash
-- Method: Probabilistic matching via recipient+amount+timewindow
-- Date: 2025-11-21
-- =====================================================

-- =====================================================
-- FUNCTION: find_matching_invoice
-- Purpose: Find pending invoice matching payment details
-- Algorithm: Multi-criteria scoring with confidence threshold
-- =====================================================

CREATE OR REPLACE FUNCTION public.find_matching_invoice(
  p_recipient_address TEXT,
  p_amount DECIMAL(18,6),
  p_token TEXT,
  p_tx_timestamp TIMESTAMPTZ,
  p_tx_hash TEXT
)
RETURNS TABLE (
  invoice_id TEXT,
  invoice_uuid UUID,
  confidence_score INTEGER,
  match_criteria TEXT[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_time_window_start TIMESTAMPTZ;
  v_time_window_end TIMESTAMPTZ;
  v_amount_tolerance DECIMAL(18,6);
BEGIN
  -- Time window: ±15 minutes from transaction timestamp
  v_time_window_start := p_tx_timestamp - INTERVAL '15 minutes';
  v_time_window_end := p_tx_timestamp + INTERVAL '15 minutes';
  
  -- Amount tolerance: ±0.01 USDC (1 cent) to handle rounding
  v_amount_tolerance := 0.01;
  
  RETURN QUERY
  WITH scored_invoices AS (
    SELECT
      i.invoice_id,
      i.id as invoice_uuid,
      i.amount as invoice_amount,
      i.token as invoice_token,
      i.recipient_address as invoice_recipient,
      i.created_at,
      i.expires_at,
      -- Scoring criteria (100 points max)
      CASE
        -- Exact recipient match (50 points)
        WHEN LOWER(i.recipient_address) = LOWER(p_recipient_address) THEN 50
        ELSE 0
      END +
      CASE
        -- Exact amount match (30 points)
        WHEN ABS(i.amount - p_amount) < 0.000001 THEN 30
        -- Amount within tolerance (20 points)
        WHEN ABS(i.amount - p_amount) <= v_amount_tolerance THEN 20
        ELSE 0
      END +
      CASE
        -- Token match (10 points)
        WHEN i.token = p_token THEN 10
        ELSE 0
      END +
      CASE
        -- Recent invoice (10 points if <5 min old)
        WHEN p_tx_timestamp - i.created_at < INTERVAL '5 minutes' THEN 10
        -- Older invoice (5 points if <15 min old)
        WHEN p_tx_timestamp - i.created_at < INTERVAL '15 minutes' THEN 5
        ELSE 0
      END as confidence_score,
      -- Match criteria array (for debugging)
      ARRAY[
        CASE WHEN LOWER(i.recipient_address) = LOWER(p_recipient_address) THEN 'recipient_exact' ELSE 'recipient_mismatch' END,
        CASE 
          WHEN ABS(i.amount - p_amount) < 0.000001 THEN 'amount_exact'
          WHEN ABS(i.amount - p_amount) <= v_amount_tolerance THEN 'amount_close'
          ELSE 'amount_mismatch'
        END,
        CASE WHEN i.token = p_token THEN 'token_match' ELSE 'token_mismatch' END,
        'time_delta:' || EXTRACT(EPOCH FROM (p_tx_timestamp - i.created_at))::TEXT || 's'
      ] as criteria
    FROM public.a2a_invoices i
    WHERE
      -- Must be pending (not yet paid)
      i.status = 'pending'
      -- Must not be expired
      AND i.expires_at > NOW()
      -- Must be within time window
      AND i.created_at >= v_time_window_start
      AND i.created_at <= v_time_window_end
      -- Must match chain
      AND i.chain_id = 8453
      -- Must not have tx_hash already
      AND i.tx_hash IS NULL
      -- Fuzzy amount match (within 10% or ±1 USDC, whichever is larger)
      AND (
        ABS(i.amount - p_amount) <= GREATEST(i.amount * 0.1, 1.0)
      )
  )
  SELECT
    s.invoice_id,
    s.invoice_uuid,
    s.confidence_score,
    s.criteria
  FROM scored_invoices s
  WHERE s.confidence_score >= 60 -- Minimum 60% confidence threshold
  ORDER BY s.confidence_score DESC, s.created_at DESC
  LIMIT 1; -- Return only best match
END;
$$;

-- =====================================================
-- TABLE: a2a_payment_detections
-- Purpose: Audit log for automatic payment detection
-- =====================================================

CREATE TABLE IF NOT EXISTS public.a2a_payment_detections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tx_hash TEXT NOT NULL,
  block_number BIGINT NOT NULL,
  tx_timestamp TIMESTAMPTZ NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  amount DECIMAL(18,6) NOT NULL,
  token TEXT NOT NULL,
  detected_invoice_id TEXT,
  detected_invoice_uuid UUID REFERENCES public.a2a_invoices(id) ON DELETE SET NULL,
  confidence_score INTEGER,
  match_criteria TEXT[],
  detection_status TEXT NOT NULL CHECK (detection_status IN ('matched', 'no_match', 'error', 'duplicate')),
  error_message TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_tx_hash CHECK (tx_hash ~* '^0x[a-fA-F0-9]{64}$'),
  CONSTRAINT valid_addresses CHECK (
    from_address ~* '^0x[a-fA-F0-9]{40}$' AND
    to_address ~* '^0x[a-fA-F0-9]{40}$'
  ),
  CONSTRAINT valid_confidence CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100))
);

-- Indexes for performance
CREATE INDEX idx_a2a_payment_detections_tx_hash ON public.a2a_payment_detections(tx_hash);
CREATE INDEX idx_a2a_payment_detections_invoice ON public.a2a_payment_detections(detected_invoice_uuid) WHERE detected_invoice_uuid IS NOT NULL;
CREATE INDEX idx_a2a_payment_detections_status ON public.a2a_payment_detections(detection_status, created_at DESC);
CREATE INDEX idx_a2a_payment_detections_timestamp ON public.a2a_payment_detections(tx_timestamp DESC);

-- RLS Policies (read-only for authenticated users)
ALTER TABLE public.a2a_payment_detections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage detection log"
  ON public.a2a_payment_detections FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can view their invoice detections"
  ON public.a2a_payment_detections FOR SELECT
  USING (
    detected_invoice_uuid IN (
      SELECT id FROM public.a2a_invoices WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- FUNCTION: record_payment_detection
-- Purpose: Atomically record detection attempt and update invoice if matched
-- =====================================================

CREATE OR REPLACE FUNCTION public.record_payment_detection(
  p_tx_hash TEXT,
  p_block_number BIGINT,
  p_tx_timestamp TIMESTAMPTZ,
  p_from_address TEXT,
  p_to_address TEXT,
  p_amount DECIMAL(18,6),
  p_token TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_detection_id UUID;
  v_matched_invoice RECORD;
  v_existing_detection UUID;
BEGIN
  -- Check for duplicate detection (idempotency)
  SELECT id INTO v_existing_detection
  FROM public.a2a_payment_detections
  WHERE tx_hash = p_tx_hash
  LIMIT 1;
  
  IF v_existing_detection IS NOT NULL THEN
    -- Already processed this transaction
    RETURN v_existing_detection;
  END IF;
  
  -- Find matching invoice
  SELECT * INTO v_matched_invoice
  FROM public.find_matching_invoice(
    p_to_address,
    p_amount,
    p_token,
    p_tx_timestamp,
    p_tx_hash
  );
  
  -- Record detection attempt
  IF v_matched_invoice.invoice_id IS NOT NULL THEN
    -- Match found
    INSERT INTO public.a2a_payment_detections (
      tx_hash,
      block_number,
      tx_timestamp,
      from_address,
      to_address,
      amount,
      token,
      detected_invoice_id,
      detected_invoice_uuid,
      confidence_score,
      match_criteria,
      detection_status
    ) VALUES (
      p_tx_hash,
      p_block_number,
      p_tx_timestamp,
      p_from_address,
      p_to_address,
      p_amount,
      p_token,
      v_matched_invoice.invoice_id,
      v_matched_invoice.invoice_uuid,
      v_matched_invoice.confidence_score,
      v_matched_invoice.match_criteria,
      'matched'
    )
    RETURNING id INTO v_detection_id;
    
    -- Update invoice with tx_hash (triggers processVerifiedTransaction)
    UPDATE public.a2a_invoices
    SET
      tx_hash = p_tx_hash,
      block_number = p_block_number,
      status = 'confirming',
      updated_at = NOW()
    WHERE id = v_matched_invoice.invoice_uuid
      AND status = 'pending' -- Only update if still pending
      AND tx_hash IS NULL; -- Only if no tx_hash yet
    
  ELSE
    -- No match found
    INSERT INTO public.a2a_payment_detections (
      tx_hash,
      block_number,
      tx_timestamp,
      from_address,
      to_address,
      amount,
      token,
      detected_invoice_id,
      detected_invoice_uuid,
      confidence_score,
      match_criteria,
      detection_status
    ) VALUES (
      p_tx_hash,
      p_block_number,
      p_tx_timestamp,
      p_from_address,
      p_to_address,
      p_amount,
      p_token,
      NULL,
      NULL,
      NULL,
      NULL,
      'no_match'
    )
    RETURNING id INTO v_detection_id;
  END IF;
  
  RETURN v_detection_id;
END;
$$;

-- =====================================================
-- GRANTS
-- =====================================================

GRANT SELECT ON public.a2a_payment_detections TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_matching_invoice(TEXT, DECIMAL, TEXT, TIMESTAMPTZ, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_payment_detection(TEXT, BIGINT, TIMESTAMPTZ, TEXT, TEXT, DECIMAL, TEXT) TO service_role;

-- =====================================================
-- TRIGGER: auto_verify_detected_payment
-- Purpose: Automatically trigger verification after successful detection
-- =====================================================

CREATE OR REPLACE FUNCTION public.trigger_payment_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger verification for matched payments
  IF NEW.detection_status = 'matched' AND NEW.detected_invoice_uuid IS NOT NULL THEN
    -- Verification will be handled by external process (chainWatcher.processVerifiedTransaction)
    -- This trigger just ensures invoice status is updated to 'confirming'
    -- Full verification including confirmations will happen in next chain watcher cycle
    
    -- Log successful auto-detection
    RAISE NOTICE 'Auto-detected payment % for invoice % (confidence: %)', 
      NEW.tx_hash, NEW.detected_invoice_id, NEW.confidence_score;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_payment_detected
  AFTER INSERT ON public.a2a_payment_detections
  FOR EACH ROW
  WHEN (NEW.detection_status = 'matched')
  EXECUTE FUNCTION public.trigger_payment_verification();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION public.find_matching_invoice IS 'Probabilistic matching of on-chain payment to pending invoice via multi-criteria scoring';
COMMENT ON FUNCTION public.record_payment_detection IS 'Atomically record payment detection and update matched invoice';
COMMENT ON FUNCTION public.trigger_payment_verification IS 'Trigger function for post-detection verification workflow';
COMMENT ON TABLE public.a2a_payment_detections IS 'Audit log for automatic payment detection attempts';


-- Migration complete: 006_payment_correlation_index.sql


