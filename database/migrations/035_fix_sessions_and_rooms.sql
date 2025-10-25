-- Migration 035: Fix sessions table for express-session and rooms schema
-- This migration fixes the sessions table to work with express-session
-- and ensures rooms table has current_game_id

-- Drop the old sessions table if it exists (wrong schema)
DROP TABLE IF EXISTS sessions CASCADE;

-- Create sessions table with express-session compatible schema
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

-- Index for cleanup of expired sessions
CREATE INDEX IF NOT EXISTS idx_session_expire ON sessions(expire);

-- Ensure rooms table has current_game_id column
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS current_game_id VARCHAR;

-- Verify room_seats table has the grace period columns
ALTER TABLE room_seats 
  ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS away_since TIMESTAMP,
  ADD COLUMN IF NOT EXISTS seat_token TEXT;

-- Comments
COMMENT ON TABLE sessions IS 'Express-session compatible session storage (Redis-backed with DB fallback)';
COMMENT ON COLUMN sessions.sid IS 'Session ID (primary key)';
COMMENT ON COLUMN sessions.sess IS 'Session data as JSON';
COMMENT ON COLUMN sessions.expire IS 'Session expiration timestamp';
COMMENT ON COLUMN rooms.current_game_id IS 'ID of currently active game in this room';
COMMENT ON COLUMN room_seats.last_heartbeat_at IS 'Last heartbeat timestamp for connection tracking';
COMMENT ON COLUMN room_seats.away_since IS 'Timestamp when player went AWAY (grace period)';
COMMENT ON COLUMN room_seats.seat_token IS 'JWT token for seat authorization';

