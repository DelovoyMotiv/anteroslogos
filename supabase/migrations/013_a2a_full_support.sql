-- =====================================================
-- Migration 013: Linux Foundation A2A Protocol v1.0 Full Support
-- Purpose: Database tables for A2A tasks, sessions, reputation, and events
-- Spec: https://a2a-protocol.org/
-- =====================================================

-- =====================================================
-- TABLE: a2a_tasks
-- Purpose: Store A2A task lifecycle and execution state
-- =====================================================

CREATE TABLE IF NOT EXISTS public.a2a_tasks (
  -- Core Identity (ULID)
  id TEXT PRIMARY KEY CHECK (id ~ '^[0-9A-HJKMNP-TV-Z]{26}$'),
  agent_id TEXT NOT NULL,
  session_id TEXT, -- FK added later after a2a_sessions is created
  
  -- Task Definition
  capability TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  
  -- Lifecycle Timestamps
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Progress Tracking
  progress JSONB,
  
  -- Results
  result JSONB,
  artifacts JSONB,
  error JSONB,
  
  -- Cost & Billing
  cost JSONB,
  
  -- Extensions
  extensions JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Indexes
  CONSTRAINT a2a_tasks_valid_dates CHECK (
    (started_at IS NULL OR started_at >= created_at) AND
    (completed_at IS NULL OR completed_at >= COALESCE(started_at, created_at))
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_agent_id ON public.a2a_tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_session_id ON public.a2a_tasks(session_id);
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_status ON public.a2a_tasks(status);
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_capability ON public.a2a_tasks(capability);
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_created_at ON public.a2a_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_completed_at ON public.a2a_tasks(completed_at DESC) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_priority ON public.a2a_tasks(priority) WHERE status IN ('pending', 'running');

-- GIN index for JSONB fields (fast querying)
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_params_gin ON public.a2a_tasks USING GIN (params);
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_extensions_gin ON public.a2a_tasks USING GIN (extensions);

COMMENT ON TABLE public.a2a_tasks IS 'A2A Protocol v1.0 task lifecycle and execution state';

-- =====================================================
-- TABLE: a2a_sessions
-- Purpose: Multi-task session grouping and aggregation
-- =====================================================

CREATE TABLE IF NOT EXISTS public.a2a_sessions (
  -- Core Identity (ULID)
  id TEXT PRIMARY KEY CHECK (id ~ '^[0-9A-HJKMNP-TV-Z]{26}$'),
  agent_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Session Configuration
  name TEXT,
  description TEXT,
  
  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Aggregated Metrics (computed)
  metrics JSONB,
  
  -- Extensions
  extensions JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  CONSTRAINT a2a_sessions_valid_dates CHECK (
    (started_at IS NULL OR started_at >= created_at) AND
    (completed_at IS NULL OR completed_at >= COALESCE(started_at, created_at))
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_a2a_sessions_agent_id ON public.a2a_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_a2a_sessions_user_id ON public.a2a_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_a2a_sessions_status ON public.a2a_sessions(status);
CREATE INDEX IF NOT EXISTS idx_a2a_sessions_created_at ON public.a2a_sessions(created_at DESC);

COMMENT ON TABLE public.a2a_sessions IS 'A2A Protocol v1.0 multi-task session grouping';

-- Add foreign key constraint now that a2a_sessions exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'a2a_tasks_session_id_fkey'
  ) THEN
    ALTER TABLE public.a2a_tasks
      ADD CONSTRAINT a2a_tasks_session_id_fkey
      FOREIGN KEY (session_id)
      REFERENCES public.a2a_sessions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- =====================================================
-- TABLE: a2a_agent_reputation
-- Purpose: Track agent performance and reputation scores
-- =====================================================

CREATE TABLE IF NOT EXISTS public.a2a_agent_reputation (
  agent_id TEXT PRIMARY KEY,
  
  -- Success Metrics (40% weight)
  total_tasks INTEGER NOT NULL DEFAULT 0,
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  failed_tasks INTEGER NOT NULL DEFAULT 0,
  success_rate NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (success_rate >= 0 AND success_rate <= 100),
  
  -- Cost Accuracy (25% weight)
  total_cost_estimates INTEGER NOT NULL DEFAULT 0,
  cost_variance_sum NUMERIC(10,4) NOT NULL DEFAULT 0,
  cost_accuracy NUMERIC(5,2) NOT NULL DEFAULT 100 CHECK (cost_accuracy >= 0 AND cost_accuracy <= 100),
  
  -- Response Time (20% weight)
  total_response_times_ms BIGINT NOT NULL DEFAULT 0,
  avg_response_time_ms INTEGER NOT NULL DEFAULT 0,
  response_time_score NUMERIC(5,2) NOT NULL DEFAULT 100 CHECK (response_time_score >= 0 AND response_time_score <= 100),
  
  -- Consensus Verification (15% weight)
  consensus_tasks INTEGER NOT NULL DEFAULT 0,
  consensus_passed INTEGER NOT NULL DEFAULT 0,
  consensus_success_rate NUMERIC(5,2) NOT NULL DEFAULT 100 CHECK (consensus_success_rate >= 0 AND consensus_success_rate <= 100),
  
  -- Overall Reputation
  reputation_score NUMERIC(5,2) NOT NULL DEFAULT 100 CHECK (reputation_score >= 0 AND reputation_score <= 100),
  reputation_grade TEXT NOT NULL DEFAULT 'S' CHECK (reputation_grade IN ('S', 'A', 'B', 'C', 'D', 'F')),
  
  -- Metadata
  first_task_at TIMESTAMPTZ,
  last_task_at TIMESTAMPTZ,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_a2a_agent_reputation_score ON public.a2a_agent_reputation(reputation_score DESC);
CREATE INDEX IF NOT EXISTS idx_a2a_agent_reputation_grade ON public.a2a_agent_reputation(reputation_grade);
CREATE INDEX IF NOT EXISTS idx_a2a_agent_reputation_updated ON public.a2a_agent_reputation(last_updated_at DESC);

COMMENT ON TABLE public.a2a_agent_reputation IS 'A2A Protocol v1.0 agent performance and reputation tracking';

-- =====================================================
-- TABLE: a2a_task_events
-- Purpose: Event log for task lifecycle (audit trail)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.a2a_task_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id TEXT NOT NULL REFERENCES public.a2a_tasks(id) ON DELETE CASCADE,
  
  -- Event Details
  event_type TEXT NOT NULL CHECK (event_type IN (
    'task.created',
    'task.started',
    'task.progress',
    'task.completed',
    'task.failed',
    'task.cancelled',
    'payment.created',
    'payment.verified',
    'consensus.initiated',
    'consensus.achieved'
  )),
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_a2a_task_events_task_id ON public.a2a_task_events(task_id);
CREATE INDEX IF NOT EXISTS idx_a2a_task_events_type ON public.a2a_task_events(event_type);
CREATE INDEX IF NOT EXISTS idx_a2a_task_events_created_at ON public.a2a_task_events(created_at DESC);

COMMENT ON TABLE public.a2a_task_events IS 'A2A Protocol v1.0 task lifecycle event log';

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.a2a_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.a2a_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.a2a_agent_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.a2a_task_events ENABLE ROW LEVEL SECURITY;

-- a2a_tasks policies
CREATE POLICY "Users can view their own tasks"
  ON public.a2a_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.a2a_sessions s
      WHERE s.id = a2a_tasks.session_id
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all tasks"
  ON public.a2a_tasks FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- a2a_sessions policies
CREATE POLICY "Users can view their own sessions"
  ON public.a2a_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own sessions"
  ON public.a2a_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sessions"
  ON public.a2a_sessions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all sessions"
  ON public.a2a_sessions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- a2a_agent_reputation policies (read-only for authenticated users)
CREATE POLICY "Authenticated users can view agent reputation"
  ON public.a2a_agent_reputation FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage agent reputation"
  ON public.a2a_agent_reputation FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- a2a_task_events policies
CREATE POLICY "Users can view events for their tasks"
  ON public.a2a_task_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.a2a_tasks t
      INNER JOIN public.a2a_sessions s ON s.id = t.session_id
      WHERE t.id = a2a_task_events.task_id
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all task events"
  ON public.a2a_task_events FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to update session metrics
CREATE OR REPLACE FUNCTION public.update_session_metrics(p_session_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_metrics JSONB;
BEGIN
  WITH task_stats AS (
    SELECT
      COUNT(*) as total_tasks,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
      COUNT(*) FILTER (WHERE status = 'failed') as failed_tasks,
      COALESCE(SUM((cost->>'total_cost')::numeric), 0) as total_cost_usd,
      COALESCE(SUM(
        CASE
          WHEN started_at IS NOT NULL AND completed_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000
          ELSE 0
        END
      ), 0)::bigint as total_time_ms
    FROM public.a2a_tasks
    WHERE session_id = p_session_id
  )
  SELECT jsonb_build_object(
    'total_tasks', total_tasks,
    'completed_tasks', completed_tasks,
    'failed_tasks', failed_tasks,
    'total_cost_usd', total_cost_usd,
    'total_time_ms', total_time_ms
  ) INTO v_metrics
  FROM task_stats;
  
  UPDATE public.a2a_sessions
  SET metrics = v_metrics, updated_at = NOW()
  WHERE id = p_session_id;
  
  RETURN v_metrics;
END;
$$;

COMMENT ON FUNCTION public.update_session_metrics IS 'Calculate and update aggregated metrics for a session';

-- Function to record task event
CREATE OR REPLACE FUNCTION public.record_task_event(
  p_task_id TEXT,
  p_event_type TEXT,
  p_event_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO public.a2a_task_events (task_id, event_type, event_data)
  VALUES (p_task_id, p_event_type, p_event_data)
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

COMMENT ON FUNCTION public.record_task_event IS 'Record a task lifecycle event';

-- =====================================================
-- GRANTS
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON public.a2a_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.a2a_sessions TO authenticated;
GRANT SELECT ON public.a2a_agent_reputation TO authenticated;
GRANT SELECT, INSERT ON public.a2a_task_events TO authenticated;

GRANT ALL ON public.a2a_tasks TO service_role;
GRANT ALL ON public.a2a_sessions TO service_role;
GRANT ALL ON public.a2a_agent_reputation TO service_role;
GRANT ALL ON public.a2a_task_events TO service_role;

-- =====================================================
-- VALIDATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 013: A2A Full Support completed successfully';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - a2a_tasks (task lifecycle and execution)';
  RAISE NOTICE '  - a2a_sessions (multi-task session grouping)';
  RAISE NOTICE '  - a2a_agent_reputation (performance tracking)';
  RAISE NOTICE '  - a2a_task_events (audit trail)';
  RAISE NOTICE 'RLS policies and helper functions configured';
END $$;
