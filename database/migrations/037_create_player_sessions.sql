-- Migration: Add player_sessions table for stable player identity
-- Purpose: Persist player sessions that survive refreshes and server restarts
-- 
-- This migration creates the `player_sessions` table which maintains
-- stable player identities across browser refreshes and server restarts.
--
-- Sessions have a 24-hour TTL and ensure players can rejoin games seamlessly.

CREATE TABLE IF NOT EXISTS player_sessions (
  -- Primary identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  seat_index INT NOT NULL CHECK (seat_index >= 0 AND seat_index < 10),
  
  -- Session metadata
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours',
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one session per user per game
  CONSTRAINT unique_user_game UNIQUE(user_id, game_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_player_sessions_user_id ON player_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_player_sessions_game_id ON player_sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_player_sessions_expires_at ON player_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_player_sessions_token ON player_sessions(session_token);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_player_sessions_cleanup ON player_sessions(expires_at) 
WHERE expires_at < NOW();

-- Add comment for documentation
COMMENT ON TABLE player_sessions IS 'Maintains stable player identities across refreshes and server restarts';
COMMENT ON COLUMN player_sessions.session_token IS 'Unique token stored in browser localStorage for session recovery';
COMMENT ON COLUMN player_sessions.expires_at IS 'Sessions automatically expire after 24 hours of creation';

-- Function to update last_accessed_at timestamp
CREATE OR REPLACE FUNCTION update_player_session_access()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_accessed_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update access time on any update
DROP TRIGGER IF EXISTS trigger_update_player_session_access ON player_sessions;
CREATE TRIGGER trigger_update_player_session_access
  BEFORE UPDATE ON player_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_player_session_access();

-- Function to clean up expired sessions (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_player_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM player_sessions
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_player_sessions() IS 'Removes expired player sessions. Returns count of deleted sessions.';

-- Sample usage:
-- SELECT cleanup_expired_player_sessions();

COMMIT;
