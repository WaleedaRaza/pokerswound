-- Add rebuy system for cash game mode
-- Migration 004: Add game_mode, allow_rebuys, and rebuys table

-- Add game mode to rooms
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS game_mode TEXT DEFAULT 'tournament' CHECK (game_mode IN ('tournament', 'cash'));
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS allow_rebuys BOOLEAN DEFAULT false;

-- Track rebuy history
CREATE TABLE IF NOT EXISTS rebuys (
  id SERIAL PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES rooms(id),
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rebuys_room ON rebuys(room_id);
CREATE INDEX IF NOT EXISTS idx_rebuys_user ON rebuys(user_id);

COMMENT ON TABLE rebuys IS 'Tracks player rebuys in cash game mode';
COMMENT ON COLUMN rooms.game_mode IS 'Game type: tournament (elimination) or cash (rebuys allowed)';
COMMENT ON COLUMN rooms.allow_rebuys IS 'Whether players can rebuy chips when they run out';

