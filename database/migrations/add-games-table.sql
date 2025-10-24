-- Migration: Add games table for database persistence
-- Purpose: Store complete game state with optimistic locking for concurrency control
-- 
-- This migration creates the `games` table which will store the complete state
-- of poker games using JSON/JSONB for flexibility and rapid iteration.
--
-- Optimistic locking via version numbers prevents lost updates in concurrent scenarios.

CREATE TABLE IF NOT EXISTS games (
  -- Primary identifiers
  id TEXT PRIMARY KEY,
  host_user_id TEXT NOT NULL,
  
  -- Game status tracking
  status TEXT NOT NULL CHECK (status IN ('waiting', 'active', 'paused', 'completed', 'deleted')),
  
  -- Complete game state as JSONB for flexibility
  -- This contains the full GameStateModel snapshot including:
  -- - players, configuration, handState, pot, bettingRound, timing, actionHistory, etc.
  current_state JSONB NOT NULL,
  
  -- Denormalized fields for fast queries (derived from current_state)
  hand_number INT NOT NULL DEFAULT 0,
  dealer_position INT,
  total_pot INT NOT NULL DEFAULT 0,
  
  -- Optimistic locking for concurrency control
  version INT NOT NULL DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_games_host_user_id ON games(host_user_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status) WHERE status IN ('waiting', 'active');
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_updated_at ON games(updated_at DESC);

-- GIN index for JSONB queries (e.g., searching for players in a game)
CREATE INDEX IF NOT EXISTS idx_games_current_state_players ON games USING GIN ((current_state->'players'));

-- Add comment for documentation
COMMENT ON TABLE games IS 'Stores complete poker game state with optimistic locking for concurrency control';
COMMENT ON COLUMN games.current_state IS 'Complete GameStateModel snapshot as JSONB';
COMMENT ON COLUMN games.version IS 'Optimistic locking version number, incremented on each update';

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_games_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before updates
DROP TRIGGER IF EXISTS trigger_update_games_timestamp ON games;
CREATE TRIGGER trigger_update_games_timestamp
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_games_updated_at();

-- Sample query to check if migration succeeded
-- SELECT COUNT(*) as game_count, status, COUNT(DISTINCT host_user_id) as unique_hosts
-- FROM games
-- GROUP BY status;

COMMIT;

