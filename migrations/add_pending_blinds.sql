-- Add pending blind columns for queued blind changes during active games
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS pending_small_blind INTEGER;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS pending_big_blind INTEGER;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_rooms_pending_blinds ON rooms(id) WHERE pending_small_blind IS NOT NULL;

