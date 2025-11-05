-- ============================================
-- Migration 03: Profile Stats Synchronization
-- Purpose: Auto-sync player_statistics → user_profiles
-- Date: 2025-11-05
-- ============================================

-- ============================================
-- PART 1: ADD MISSING COLUMNS TO user_profiles
-- ============================================

-- Add columns if they don't exist (safe if already present)
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS total_hands_played INTEGER DEFAULT 0;

ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS total_wins INTEGER DEFAULT 0;

ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS win_rate NUMERIC DEFAULT 0.0;

ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS biggest_pot_won BIGINT DEFAULT 0;

ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS friend_count INTEGER DEFAULT 0;

-- ============================================
-- PART 2: CREATE SYNC TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION sync_user_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user_profiles when player_statistics changes
  UPDATE user_profiles
  SET 
    total_hands_played = NEW.total_hands_played,
    total_games_played = NEW.total_games_played,
    total_wins = NEW.total_hands_won,  -- Map hands_won to wins
    win_rate = NEW.hand_win_rate,       -- Use hand win rate
    total_winnings = NEW.total_profit_loss,
    updated_at = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 3: CREATE TRIGGER
-- ============================================

DROP TRIGGER IF EXISTS update_profile_stats_trigger ON player_statistics;

CREATE TRIGGER update_profile_stats_trigger
AFTER INSERT OR UPDATE ON player_statistics
FOR EACH ROW 
EXECUTE FUNCTION sync_user_profile_stats();

-- ============================================
-- PART 4: BACKFILL EXISTING DATA
-- ============================================

-- Sync all existing player_statistics to user_profiles
UPDATE user_profiles up
SET 
  total_hands_played = ps.total_hands_played,
  total_games_played = ps.total_games_played,
  total_wins = ps.total_hands_won,
  win_rate = ps.hand_win_rate,
  total_winnings = ps.total_profit_loss,
  updated_at = NOW()
FROM player_statistics ps
WHERE up.id = ps.user_id;

-- ============================================
-- PART 5: ENSURE PERMISSIONS
-- ============================================

-- Grant necessary permissions to service_role
GRANT ALL ON player_statistics TO service_role;
GRANT ALL ON user_profiles TO service_role;

-- ============================================
-- VERIFICATION QUERIES (Run after migration)
-- ============================================

-- Check stats are synced
-- SELECT 
--   up.username,
--   up.total_hands_played as profile_hands,
--   ps.total_hands_played as stats_hands,
--   up.total_hands_played = ps.total_hands_played as synced
-- FROM user_profiles up
-- LEFT JOIN player_statistics ps ON up.id = ps.user_id
-- WHERE ps.user_id IS NOT NULL
-- LIMIT 10;

SELECT 'Migration 03 complete: Profile stats will now auto-sync!' AS result;

