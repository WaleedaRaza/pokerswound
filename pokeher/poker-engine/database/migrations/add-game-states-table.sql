-- Migration: Add game_states table for database persistence
-- Purpose: Store complete game state with optimistic locking for concurrency control
-- 
-- This migration creates the `game_states` table which will store the complete state
-- of poker games using JSON/JSONB for flexibility and rapid iteration.
--
-- Optimistic locking via version numbers prevents lost updates in concurrent scenarios.
-- Links to the `rooms` table to connect lobby system with game engine.

CREATE TABLE IF NOT EXISTS game_states (
  -- Primary identifiers
  id TEXT PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,  -- Link to lobby system
  host_user_id TEXT NOT NULL,
  
  -- Game status tracking (matches GameStatus enum in TypeScript)
  status TEXT NOT NULL CHECK (status IN ('WAITING', 'DEALING', 'PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN', 'COMPLETED', 'PAUSED', 'waiting', 'active', 'paused', 'completed', 'deleted')),
  
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
CREATE INDEX IF NOT EXISTS idx_game_states_room_id ON game_states(room_id);
CREATE INDEX IF NOT EXISTS idx_game_states_host_user_id ON game_states(host_user_id);
CREATE INDEX IF NOT EXISTS idx_game_states_status ON game_states(status) WHERE status IN ('waiting', 'active');
CREATE INDEX IF NOT EXISTS idx_game_states_created_at ON game_states(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_states_updated_at ON game_states(updated_at DESC);

-- GIN index for JSONB queries (e.g., searching for players in a game)
CREATE INDEX IF NOT EXISTS idx_game_states_current_state_players ON game_states USING GIN ((current_state->'players'));

-- Add comments for documentation
COMMENT ON TABLE game_states IS 'Stores complete poker game state with optimistic locking for concurrency control';
COMMENT ON COLUMN game_states.room_id IS 'Links game state to the room it was created from';
COMMENT ON COLUMN game_states.current_state IS 'Complete GameStateModel snapshot as JSONB';
COMMENT ON COLUMN game_states.version IS 'Optimistic locking version number, incremented on each update';

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_game_states_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before updates
DROP TRIGGER IF EXISTS trigger_update_game_states_timestamp ON game_states;
CREATE TRIGGER trigger_update_game_states_timestamp
  BEFORE UPDATE ON game_states
  FOR EACH ROW
  EXECUTE FUNCTION update_game_states_updated_at();

-- Sample query to check if migration succeeded
-- SELECT COUNT(*) as game_count, status, COUNT(DISTINCT host_user_id) as unique_hosts
-- FROM game_states
-- GROUP BY status;

-- Query to find games linked to rooms
-- SELECT gs.id as game_id, r.name as room_name, gs.status, gs.hand_number
-- FROM game_states gs
-- JOIN rooms r ON gs.room_id = r.id
-- WHERE gs.status IN ('waiting', 'active');

COMMIT;

