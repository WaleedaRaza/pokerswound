-- ============================================
-- Migration 03: Profile Stats Synchronization
-- Purpose: Auto-sync player_statistics → user_profiles
-- Status: COMPLETE VERSION (with all fields)
-- Date: 2025-11-05
-- ============================================

-- ============================================
-- PART 1: ADD MISSING COLUMNS TO user_profiles
-- ============================================

-- Add all stats columns if they don't exist
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS total_hands_played INTEGER DEFAULT 0;

ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS total_wins INTEGER DEFAULT 0;

ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS win_rate NUMERIC(5,2) DEFAULT 0.0;

ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS total_games_played INTEGER DEFAULT 0;

ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS biggest_pot_won BIGINT DEFAULT 0;

ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS total_winnings BIGINT DEFAULT 0;

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
    total_wins = NEW.total_hands_won,
    win_rate = CASE 
      WHEN NEW.total_hands_played > 0 
      THEN ROUND((NEW.total_hands_won::numeric / NEW.total_hands_played::numeric) * 100, 2)
      ELSE 0 
    END,
    total_winnings = NEW.total_profit_loss,
    updated_at = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 3: CREATE TRIGGER
-- ============================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_profile_stats_trigger ON player_statistics;

-- Create new trigger
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
  total_hands_played = COALESCE(ps.total_hands_played, 0),
  total_wins = COALESCE(ps.total_hands_won, 0),
  win_rate = CASE 
    WHEN COALESCE(ps.total_hands_played, 0) > 0 
    THEN ROUND((COALESCE(ps.total_hands_won, 0)::numeric / ps.total_hands_played::numeric) * 100, 2)
    ELSE 0 
  END,
  total_winnings = COALESCE(ps.total_profit_loss, 0),
  updated_at = NOW()
FROM player_statistics ps
WHERE up.id = ps.user_id;

-- ============================================
-- PART 5: VERIFY SETUP
-- ============================================

-- Check trigger exists (should return 1 row)
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger 
  WHERE tgname = 'update_profile_stats_trigger';
  
  IF trigger_count = 1 THEN
    RAISE NOTICE '✅ Trigger "update_profile_stats_trigger" created successfully';
  ELSE
    RAISE WARNING '❌ Trigger not found! Something went wrong.';
  END IF;
END $$;

-- Check columns exist
DO $$
DECLARE
  column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns 
  WHERE table_name = 'user_profiles' 
  AND column_name IN ('total_hands_played', 'total_wins', 'win_rate');
  
  IF column_count = 3 THEN
    RAISE NOTICE '✅ All required columns exist in user_profiles';
  ELSE
    RAISE WARNING '❌ Missing columns! Expected 3, found %', column_count;
  END IF;
END $$;

-- Show sample of synced data
SELECT 
  up.username,
  up.total_hands_played as profile_hands,
  ps.total_hands_played as stats_hands,
  up.total_hands_played = ps.total_hands_played as synced,
  up.win_rate
FROM user_profiles up
LEFT JOIN player_statistics ps ON up.id = ps.user_id
WHERE ps.user_id IS NOT NULL
LIMIT 10;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT '✅ Migration 03 COMPLETE: Profile stats will now auto-sync!' AS result;
SELECT '🧪 TEST: Play a hand and check your profile stats update' AS next_step;

