-- =====================================================
-- Event Store Schema for Event Sourcing
-- =====================================================
-- This table stores ALL domain events that occur in the system.
-- Events are immutable and append-only (never updated or deleted).
-- 
-- Purpose:
-- - Game replay (rebuild state from events)
-- - Audit trail (complete history)
-- - Analytics (query past events)
-- - Time travel debugging
-- - Crash recovery
-- =====================================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- DOMAIN EVENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS domain_events (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Event identification
  event_type VARCHAR(100) NOT NULL,
  -- Examples: 'game.created', 'game.action_processed', 'game.hand_completed'
  
  -- Aggregate identification (which game/entity this event belongs to)
  aggregate_type VARCHAR(50) NOT NULL,
  -- Examples: 'Game', 'Player', 'Room'
  
  aggregate_id VARCHAR(255) NOT NULL,
  -- The ID of the game/entity (e.g., game UUID)
  
  -- Event payload
  event_data JSONB NOT NULL,
  -- Complete event data (action details, player info, etc.)
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  -- Optional metadata (user_id, ip_address, client_version, etc.)
  
  -- Version control for optimistic concurrency
  version INTEGER NOT NULL DEFAULT 1,
  -- Each event increments version for its aggregate
  
  -- Timing
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- When the event occurred
  
  -- Global ordering
  sequence_number BIGSERIAL NOT NULL,
  -- Globally unique, auto-incrementing sequence for event ordering
  
  -- Causation (event chains)
  causation_id UUID,
  -- ID of the command that caused this event
  
  correlation_id UUID,
  -- ID linking related events (e.g., all events in one user session)
  
  -- User context
  user_id UUID,
  -- Which user triggered this event (if applicable)
  
  -- Event processing status (for async handlers)
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  processing_errors JSONB
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Most common query: Get all events for a specific game
CREATE INDEX IF NOT EXISTS idx_domain_events_aggregate 
ON domain_events(aggregate_id, version);

-- Query by event type (e.g., all 'game.hand_completed' events)
CREATE INDEX IF NOT EXISTS idx_domain_events_type 
ON domain_events(event_type);

-- Query by timestamp (e.g., all events in last hour)
CREATE INDEX IF NOT EXISTS idx_domain_events_timestamp 
ON domain_events(event_timestamp DESC);

-- Query by sequence (for reading event stream in order)
CREATE INDEX IF NOT EXISTS idx_domain_events_sequence 
ON domain_events(sequence_number);

-- Query unprocessed events (for async event handlers)
CREATE INDEX IF NOT EXISTS idx_domain_events_processed 
ON domain_events(processed, event_timestamp) 
WHERE processed = FALSE;

-- Query by user (e.g., all events for a specific player)
CREATE INDEX IF NOT EXISTS idx_domain_events_user 
ON domain_events(user_id, event_timestamp DESC) 
WHERE user_id IS NOT NULL;

-- Query by correlation (e.g., all events in one user session)
CREATE INDEX IF NOT EXISTS idx_domain_events_correlation 
ON domain_events(correlation_id, sequence_number) 
WHERE correlation_id IS NOT NULL;

-- GIN index for JSONB queries (e.g., search event_data)
CREATE INDEX IF NOT EXISTS idx_domain_events_data 
ON domain_events USING gin(event_data);

-- =====================================================
-- CONSTRAINTS
-- =====================================================

-- Ensure version increments correctly for each aggregate
-- (Optional: can be enforced in application layer)
CREATE UNIQUE INDEX IF NOT EXISTS idx_domain_events_aggregate_version 
ON domain_events(aggregate_id, version);

-- =====================================================
-- EVENT SNAPSHOTS TABLE (Optional - for performance)
-- =====================================================
-- Snapshots allow rebuilding state faster by starting from
-- a snapshot instead of replaying ALL events from the beginning.
-- 
-- Example: If a game has 1000 events, we can snapshot at event 500,
-- then only replay events 501-1000 to get current state.
-- =====================================================

CREATE TABLE IF NOT EXISTS event_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Which aggregate this snapshot belongs to
  aggregate_type VARCHAR(50) NOT NULL,
  aggregate_id VARCHAR(255) NOT NULL,
  
  -- Snapshot state
  snapshot_data JSONB NOT NULL,
  -- Complete state at this point in time
  
  -- Version tracking
  version INTEGER NOT NULL,
  -- The version of the aggregate when this snapshot was taken
  
  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadata
  event_count INTEGER,
  -- How many events were replayed to create this snapshot
  
  snapshot_reason VARCHAR(50),
  -- 'manual', 'scheduled', 'threshold_reached', etc.
  
  CONSTRAINT unique_snapshot_version UNIQUE (aggregate_id, version)
);

-- Index for retrieving latest snapshot
CREATE INDEX IF NOT EXISTS idx_event_snapshots_aggregate 
ON event_snapshots(aggregate_id, version DESC);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get latest snapshot for an aggregate
CREATE OR REPLACE FUNCTION get_latest_snapshot(
  p_aggregate_id VARCHAR(255)
)
RETURNS TABLE (
  snapshot_data JSONB,
  version INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    es.snapshot_data,
    es.version
  FROM event_snapshots es
  WHERE es.aggregate_id = p_aggregate_id
  ORDER BY es.version DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get event stream from a specific version
CREATE OR REPLACE FUNCTION get_event_stream(
  p_aggregate_id VARCHAR(255),
  p_from_version INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  event_type VARCHAR(100),
  event_data JSONB,
  version INTEGER,
  event_timestamp TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    de.id,
    de.event_type,
    de.event_data,
    de.version,
    de.event_timestamp
  FROM domain_events de
  WHERE de.aggregate_id = p_aggregate_id
    AND de.version > p_from_version
  ORDER BY de.version ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to create a snapshot
CREATE OR REPLACE FUNCTION create_snapshot(
  p_aggregate_type VARCHAR(50),
  p_aggregate_id VARCHAR(255),
  p_snapshot_data JSONB,
  p_version INTEGER,
  p_event_count INTEGER,
  p_reason VARCHAR(50) DEFAULT 'manual'
)
RETURNS UUID AS $$
DECLARE
  v_snapshot_id UUID;
BEGIN
  INSERT INTO event_snapshots (
    aggregate_type,
    aggregate_id,
    snapshot_data,
    version,
    event_count,
    snapshot_reason
  ) VALUES (
    p_aggregate_type,
    p_aggregate_id,
    p_snapshot_data,
    p_version,
    p_event_count,
    p_reason
  )
  RETURNING id INTO v_snapshot_id;
  
  RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ANALYTICS VIEWS (Optional)
-- =====================================================

-- View for recent events (last 24 hours)
CREATE OR REPLACE VIEW recent_events AS
SELECT 
  id,
  event_type,
  aggregate_type,
  aggregate_id,
  event_data,
  event_timestamp,
  sequence_number
FROM domain_events
WHERE event_timestamp > NOW() - INTERVAL '24 hours'
ORDER BY sequence_number DESC;

-- View for event statistics
CREATE OR REPLACE VIEW event_statistics AS
SELECT 
  event_type,
  aggregate_type,
  COUNT(*) as event_count,
  MIN(event_timestamp) as first_occurrence,
  MAX(event_timestamp) as last_occurrence,
  COUNT(DISTINCT aggregate_id) as unique_aggregates
FROM domain_events
GROUP BY event_type, aggregate_type
ORDER BY event_count DESC;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify tables were created
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'domain_events'
  ) THEN
    RAISE NOTICE '✅ domain_events table created successfully';
  END IF;
  
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'event_snapshots'
  ) THEN
    RAISE NOTICE '✅ event_snapshots table created successfully';
  END IF;
END $$;

-- Show created indexes
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('domain_events', 'event_snapshots')
ORDER BY tablename, indexname;

