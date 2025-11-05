-- ============================================
-- MIGRATION 09: Remove Status Column - Radical Simplification
-- Philosophy: Room exists = active. Room deleted = gone. No status.
-- ============================================

-- ============================================
-- PART 1: Drop the status column entirely
-- ============================================

-- First, drop any constraints/indexes on status
DROP INDEX IF EXISTS idx_rooms_status;
DROP INDEX IF EXISTS idx_rooms_status_host;
DROP INDEX IF EXISTS idx_rooms_deleted;

-- Drop the enum type if it exists
DROP TYPE IF EXISTS room_status CASCADE;

-- Remove status column from rooms
ALTER TABLE rooms DROP COLUMN IF EXISTS status;
ALTER TABLE rooms DROP COLUMN IF EXISTS status_new;
ALTER TABLE rooms DROP COLUMN IF EXISTS deleted_at;

-- ============================================
-- PART 2: Drop triggers that auto-manage status
-- ============================================

-- These triggers tried to auto-set status based on player count
-- We don't need them anymore - rooms just exist or don't
DROP TRIGGER IF EXISTS room_auto_activate ON room_seats;
DROP TRIGGER IF EXISTS room_auto_deactivate ON room_seats;
DROP FUNCTION IF EXISTS auto_activate_room();
DROP FUNCTION IF EXISTS auto_deactivate_room();

-- ============================================
-- PART 3: Clean up existing data
-- ============================================

-- All rooms that exist in the table are "active" by definition
-- No action needed - existence = active

-- ============================================
-- PART 4: Add helpful indexes for performance
-- ============================================

-- Index for finding user's rooms
CREATE INDEX IF NOT EXISTS idx_rooms_host_user ON rooms(host_user_id);

-- Index for finding room by invite code (fast joins)
CREATE INDEX IF NOT EXISTS idx_rooms_invite_code ON rooms(invite_code);

-- Index for recent rooms
CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON rooms(created_at DESC);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Show all columns in rooms table (status should be gone)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'rooms' 
ORDER BY ordinal_position;

-- Count total rooms per user
SELECT 
  host_user_id,
  COUNT(*) as total_rooms,
  MIN(created_at) as oldest_room,
  MAX(created_at) as newest_room
FROM rooms
GROUP BY host_user_id
ORDER BY total_rooms DESC
LIMIT 10;

SELECT '✅ Migration 09 complete - Status column removed. Rooms are radically simple now!' as result;
SELECT 'Room exists = active. Room deleted = gone. That''s it.' as philosophy;

