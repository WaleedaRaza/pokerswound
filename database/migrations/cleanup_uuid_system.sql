-- =====================================================
-- SCHEMA CLEANUP: Remove Unused UUID Game System
-- =====================================================
-- 
-- WHAT THIS DOES:
-- Removes 5 tables (games, hands, players, actions, pots) that:
--   1. Are not actively used by the application
--   2. Conflict with the working TEXT ID system (game_states)
--   3. Have missing columns and cause errors
--
-- WHAT THIS KEEPS:
-- - game_states (TEXT ID system - ACTIVE)
-- - rooms (lobby system)
-- - room_seats (seating system)
-- - All analytics, social, and future feature tables
--
-- SAFETY:
-- - Run audit query first to verify tables are empty
-- - Create Supabase backup before running this
-- - Uses CASCADE to handle any lingering foreign keys
--
-- =====================================================

-- STEP 1: AUDIT (Run this first to verify safety)
-- Copy this block separately and check results
-- =====================================================

SELECT 
  'games' as table_name,
  COUNT(*) as row_count,
  CASE WHEN COUNT(*) = 0 THEN '✅ SAFE TO DELETE' ELSE '⚠️ HAS DATA - INVESTIGATE' END as status
FROM games

UNION ALL

SELECT 
  'hands' as table_name,
  COUNT(*) as row_count,
  CASE WHEN COUNT(*) = 0 THEN '✅ SAFE TO DELETE' ELSE '⚠️ HAS DATA - INVESTIGATE' END as status
FROM hands

UNION ALL

SELECT 
  'players' as table_name,
  COUNT(*) as row_count,
  CASE WHEN COUNT(*) = 0 THEN '✅ SAFE TO DELETE' ELSE '⚠️ HAS DATA - INVESTIGATE' END as status
FROM players

UNION ALL

SELECT 
  'actions' as table_name,
  COUNT(*) as row_count,
  CASE WHEN COUNT(*) = 0 THEN '✅ SAFE TO DELETE' ELSE '⚠️ HAS DATA - INVESTIGATE' END as status
FROM actions

UNION ALL

SELECT 
  'pots' as table_name,
  COUNT(*) as row_count,
  CASE WHEN COUNT(*) = 0 THEN '✅ SAFE TO DELETE' ELSE '⚠️ HAS DATA - INVESTIGATE' END as status
FROM pots

UNION ALL

SELECT 
  'game_states' as table_name,
  COUNT(*) as row_count,
  CASE WHEN COUNT(*) > 0 THEN '✅ ACTIVE SYSTEM' ELSE '⚠️ EMPTY - CHECK CODE' END as status
FROM game_states

ORDER BY table_name;

-- Expected Result:
-- ✅ games: 0 rows (SAFE TO DELETE)
-- ✅ hands: 0 rows (SAFE TO DELETE)
-- ✅ players: 0 rows (SAFE TO DELETE)
-- ✅ actions: 0 rows (SAFE TO DELETE)
-- ✅ pots: 0 rows (SAFE TO DELETE)
-- ✅ game_states: >0 rows (ACTIVE SYSTEM)
--
-- If all UUID tables show 0 rows → PROCEED TO STEP 2
-- If any UUID table has data → STOP, investigate what's using it

-- =====================================================
-- STEP 2: BACKUP
-- =====================================================
-- 
-- DO NOT RUN THIS AS SQL
-- Instead, go to:
--   Supabase Dashboard → Database → Backups → Create Backup
-- 
-- Name it: "before_uuid_cleanup_YYYYMMDD"
-- Wait for completion before proceeding.
--
-- =====================================================

-- =====================================================
-- STEP 3: DELETE UUID TABLES
-- =====================================================
-- 
-- ONLY RUN THIS AFTER:
--   1. Audit shows all UUID tables empty
--   2. Backup is created
--   3. You're ready to proceed
--
-- =====================================================

BEGIN;

-- Drop in reverse dependency order (children first)
-- CASCADE ensures foreign keys don't block deletion

DROP TABLE IF EXISTS actions CASCADE;
-- Stores individual player actions (FOLD, CALL, etc.)
-- Depends on: hands, games
-- Status: UNUSED - Actions stored in game_states JSONB instead

DROP TABLE IF EXISTS pots CASCADE;
-- Stores pot information per hand
-- Depends on: hands
-- Status: UNUSED - Pot data stored in game_states JSONB instead

DROP TABLE IF EXISTS players CASCADE;
-- Stores players in a game (UUID system)
-- Depends on: games
-- Status: UNUSED - Replaced by room_seats table

DROP TABLE IF EXISTS hands CASCADE;
-- Stores individual hands within a game
-- Depends on: games
-- Status: UNUSED - Hand data stored in game_states JSONB instead

DROP TABLE IF EXISTS games CASCADE;
-- Stores game metadata (UUID system)
-- Status: UNUSED - Replaced by game_states (TEXT ID system)

-- Verify game_states (our active system) still exists
DO $$
DECLARE
  game_states_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO game_states_count FROM game_states;
  RAISE NOTICE '✅ game_states table still exists with % rows', game_states_count;
  
  IF game_states_count = 0 THEN
    RAISE WARNING '⚠️ game_states table is empty - check if this is expected';
  END IF;
END $$;

-- Verify rooms table still exists
DO $$
DECLARE
  rooms_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO rooms_count FROM rooms;
  RAISE NOTICE '✅ rooms table still exists with % rows', rooms_count;
END $$;

-- Verify room_seats table still exists
DO $$
DECLARE
  room_seats_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO room_seats_count FROM room_seats;
  RAISE NOTICE '✅ room_seats table still exists with % rows', room_seats_count;
END $$;

COMMIT;

-- =====================================================
-- STEP 4: VERIFICATION
-- =====================================================
-- Run this to confirm deletion was successful
-- =====================================================

-- Check that UUID tables are gone
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('actions', 'pots', 'players', 'hands', 'games') 
    THEN '⚠️ SHOULD NOT EXIST'
    ELSE '✅ EXPECTED'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name IN ('actions', 'pots', 'players', 'hands', 'games', 'game_states', 'rooms', 'room_seats')
ORDER BY table_name;

-- Expected Result:
-- game_states - ✅ EXPECTED
-- rooms - ✅ EXPECTED
-- room_seats - ✅ EXPECTED
-- (actions, pots, players, hands, games should NOT appear in list)

-- =====================================================
-- ROLLBACK (Emergency Only)
-- =====================================================
--
-- If something went wrong and you need to restore:
--
-- Option 1: Use Supabase Dashboard
--   1. Go to Database → Backups
--   2. Find your backup
--   3. Click Restore
--
-- Option 2: If you have pg_dump backup
--   psql YOUR_CONNECTION_STRING < backup_file.sql
--
-- =====================================================

-- =====================================================
-- POST-CLEANUP CHECKLIST
-- =====================================================
--
-- After running this migration:
--
-- [ ] Run verification query (STEP 4) - confirms tables deleted
-- [ ] Delete TypeScript repo files:
--       rm -f src/services/database/repos/games.repo.ts
--       rm -f src/services/database/repos/full-game.repo.ts
--       rm -f dist/services/database/repos/games.repo.js
--       rm -f dist/services/database/repos/full-game.repo.js
-- [ ] Rebuild TypeScript: npm run build
-- [ ] Restart server: npm start
-- [ ] Test basic functionality:
--       - Server starts without errors
--       - /play page loads
--       - No SQL errors in console
-- [ ] Mark TODOs complete:
--       - schema-audit ✅
--       - schema-backup ✅
--       - schema-delete-uuid ✅
--       - schema-delete-repos ✅
--       - schema-verify ✅
--
-- =====================================================

