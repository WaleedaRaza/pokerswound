-- DIAGNOSTIC QUERIES FOR REFRESH CRISIS
-- Run these in Supabase SQL Editor to verify schema

-- ==============================
-- 1. CHECK game_states COLUMNS
-- ==============================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'game_states'
ORDER BY ordinal_position;

-- Expected: Should have 'current_state' (JSONB), NOT 'state'

-- ==============================
-- 2. CHECK rooms COLUMNS
-- ==============================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'rooms'
ORDER BY ordinal_position;

-- Check: Does 'current_game_id' column exist?

-- ==============================
-- 3. CHECK room_seats COLUMNS
-- ==============================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'room_seats'
ORDER BY ordinal_position;

-- Expected: Should have 'user_id', 'seat_index', 'chips_in_play', 'left_at'

-- ==============================
-- 4. CHECK user_profiles COLUMNS
-- ==============================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Expected: Primary key should be 'id', NOT 'user_id'

-- ==============================
-- 5. SAMPLE ACTIVE GAME
-- ==============================
-- Replace 'YOUR_ROOM_ID' with an actual room ID from testing
SELECT 
  id,
  room_id,
  status,
  current_state,
  created_at,
  updated_at
FROM game_states 
WHERE room_id = 'YOUR_ROOM_ID'
ORDER BY created_at DESC 
LIMIT 1;

-- ==============================
-- 6. SAMPLE ROOM SEATS
-- ==============================
-- Replace 'YOUR_ROOM_ID' with an actual room ID from testing
SELECT 
  seat_index,
  user_id,
  status,
  chips_in_play,
  joined_at,
  left_at
FROM room_seats 
WHERE room_id = 'YOUR_ROOM_ID'
  AND left_at IS NULL
ORDER BY seat_index ASC;

-- ==============================
-- 7. CHECK FOR ORPHANED GAMES
-- ==============================
-- Games that don't have corresponding rooms
SELECT g.id, g.room_id, g.status
FROM game_states g
LEFT JOIN rooms r ON g.room_id = r.id
WHERE r.id IS NULL
LIMIT 10;

-- ==============================
-- 8. CHECK FOR DUPLICATE GAME IDs
-- ==============================
SELECT id, COUNT(*) as count
FROM game_states
GROUP BY id
HAVING COUNT(*) > 1;

-- Expected: Should return ZERO rows (no duplicates)

