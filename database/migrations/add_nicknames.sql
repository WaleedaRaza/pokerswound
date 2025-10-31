-- MIGRATION: Add Nicknames to Room Seats
-- Description: Allow players to set display nicknames instead of showing UUIDs
-- Date: 2025-10-31

-- Add nickname column to room_seats
ALTER TABLE room_seats 
ADD COLUMN IF NOT EXISTS nickname VARCHAR(15);

-- Add constraint: nickname must be 3-15 characters if provided
ALTER TABLE room_seats 
ADD CONSTRAINT nickname_length_check 
CHECK (nickname IS NULL OR (length(nickname) >= 3 AND length(nickname) <= 15));

-- Create index for faster nickname lookups
CREATE INDEX IF NOT EXISTS idx_room_seats_nickname ON room_seats(nickname);

-- Optional: Create unique constraint per room (uncomment if you want unique nicknames per room)
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_room_seats_room_nickname 
-- ON room_seats(room_id, nickname) WHERE nickname IS NOT NULL AND left_at IS NULL;

COMMENT ON COLUMN room_seats.nickname IS 'Player display nickname (3-15 characters, alphanumeric + underscore)';

