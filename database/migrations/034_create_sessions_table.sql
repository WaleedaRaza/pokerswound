-- Migration 034: Sessions Table for Redis-backed session persistence
-- This table stores session metadata and provides fallback/audit trail

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  fingerprint TEXT,
  last_activity_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT sessions_user_id_unique UNIQUE (user_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity_at DESC);

-- Add columns to room_seats for grace period tracking
ALTER TABLE room_seats 
  ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS away_since TIMESTAMP;

-- Add seat_token column for JWT verification
ALTER TABLE room_seats 
  ADD COLUMN IF NOT EXISTS seat_token TEXT;

COMMENT ON TABLE sessions IS 'Persistent session storage for Redis-backed sessions';
COMMENT ON COLUMN sessions.fingerprint IS 'Browser fingerprint for reconnection';
COMMENT ON COLUMN sessions.metadata IS 'Additional session data (JSON)';
COMMENT ON COLUMN room_seats.last_heartbeat_at IS 'Last heartbeat timestamp for connection tracking';
COMMENT ON COLUMN room_seats.away_since IS 'Timestamp when player went AWAY (grace period)';
COMMENT ON COLUMN room_seats.seat_token IS 'JWT token for seat authorization';

