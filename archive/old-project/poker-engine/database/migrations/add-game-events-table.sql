-- Migration: Add game_events table for event sourcing
-- Purpose: Store all game events for audit trail, replay, and analytics

-- Drop existing game_events if it exists (from old schema)
DROP TABLE IF EXISTS game_events CASCADE;

CREATE TABLE game_events (
  id BIGSERIAL PRIMARY KEY,
  game_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  sequence INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT,
  version INT DEFAULT 1,
  
  -- Ensure events are sequential per game
  CONSTRAINT unique_game_sequence UNIQUE (game_id, sequence),
  
  -- Link to game_states table (optional, games might not be persisted yet)
  CONSTRAINT fk_game_state
    FOREIGN KEY(game_id)
    REFERENCES game_states(id)
    ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_events_game_id ON game_events(game_id);
CREATE INDEX IF NOT EXISTS idx_game_events_created_at ON game_events(created_at);
CREATE INDEX IF NOT EXISTS idx_game_events_event_type ON game_events(event_type);
CREATE INDEX IF NOT EXISTS idx_game_events_user_id ON game_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_game_events_sequence ON game_events(game_id, sequence);

-- JSONB index for querying event data
CREATE INDEX IF NOT EXISTS idx_game_events_data_gin ON game_events USING gin(event_data);

-- Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION update_game_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE game_events IS 'Event sourcing store for all game events';
COMMENT ON COLUMN game_events.game_id IS 'Reference to game in game_states table';
COMMENT ON COLUMN game_events.event_type IS 'Type of event (GameCreated, PlayerJoined, PlayerAction, etc.)';
COMMENT ON COLUMN game_events.event_data IS 'Full event payload as JSON';
COMMENT ON COLUMN game_events.sequence IS 'Sequential event number within game (starts at 1)';
COMMENT ON COLUMN game_events.user_id IS 'User who triggered this event (null for system events)';

-- Example query helpers
-- Get all events for a game:
--   SELECT * FROM game_events WHERE game_id = 'game-xyz' ORDER BY sequence;
-- 
-- Get events by type:
--   SELECT * FROM game_events WHERE game_id = 'game-xyz' AND event_type = 'PlayerAction' ORDER BY sequence;
--
-- Replay game from events:
--   SELECT event_data FROM game_events WHERE game_id = 'game-xyz' ORDER BY sequence;

