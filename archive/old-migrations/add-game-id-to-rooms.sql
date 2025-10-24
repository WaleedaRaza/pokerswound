-- Add game_id column to rooms table to link room to game
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS game_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rooms_game_id ON rooms(game_id);

