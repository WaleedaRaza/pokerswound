-- ============================================
-- WIPE LEGACY DATA - START FRESH
-- Run this in Supabase SQL Editor
-- ============================================

-- SAFETY CHECK: Confirm you want to wipe
DO $$
BEGIN
  RAISE NOTICE '⚠️ About to wipe all game data and reset stats!';
  RAISE NOTICE 'Press CANCEL if you want to keep legacy data';
  RAISE NOTICE 'Press RUN to start fresh (recommended for testing)';
END $$;

-- STEP 1: Wipe all game history tables
TRUNCATE TABLE hand_history CASCADE;
TRUNCATE TABLE room_participations CASCADE;
TRUNCATE TABLE game_completions CASCADE;
TRUNCATE TABLE player_statistics CASCADE;

-- STEP 2: Reset all profile stats to zero
UPDATE user_profiles SET
  total_hands_played = 0,
  total_wins = 0,
  win_rate = 0,
  total_winnings = 0,
  biggest_pot = 0,
  best_hand = NULL,
  best_hand_date = NULL,
  best_hand_rank = NULL
WHERE id IS NOT NULL;

-- STEP 3: Verify clean slate
SELECT 
  (SELECT COUNT(*) FROM hand_history) as hand_history_count,
  (SELECT COUNT(*) FROM room_participations) as room_participations_count,
  (SELECT COUNT(*) FROM game_completions) as game_completions_count,
  (SELECT COUNT(*) FROM player_statistics) as player_statistics_count,
  (SELECT COUNT(*) FROM user_profiles WHERE total_hands_played > 0) as users_with_hands;

-- Expected result: All counts should be 0

SELECT '✅ Clean slate ready! Legacy data wiped.' as status;

