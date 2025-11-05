-- ============================================
-- Migration 04: Room Limits & Privacy
-- Purpose: Add private rooms and enforce room limits
-- Date: 2025-11-05
-- ============================================

-- Add columns for private rooms
ALTER TABLE rooms 
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;

ALTER TABLE rooms 
  ADD COLUMN IF NOT EXISTS room_code VARCHAR(6);

-- Create index for room code lookups
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(room_code) WHERE room_code IS NOT NULL;

-- Grant permissions
GRANT ALL ON rooms TO service_role;
GRANT ALL ON rooms TO postgres;

SELECT 'Migration 04 complete: Rooms can now be private with codes!' AS result;

