-- ============================================
-- MIGRATION 12: Best Hand & Biggest Pot Tracking
-- Completes the data extraction pipeline for profile stats
-- ============================================

-- ============================================
-- PART 1: VERIFY COLUMNS EXIST
-- ============================================

-- These should already exist from Migration 08, but adding IF NOT EXISTS for safety
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS best_hand TEXT,
  ADD COLUMN IF NOT EXISTS best_hand_rank INTEGER,
  ADD COLUMN IF NOT EXISTS best_hand_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS biggest_pot BIGINT DEFAULT 0;

-- ============================================
-- PART 2: CREATE BEST HAND TRIGGER
-- ============================================

-- Trigger function to update best_hand when better hand is won
CREATE OR REPLACE FUNCTION update_user_best_hand()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if this is a win with a valid hand rank
  IF NEW.winner_id IS NOT NULL AND NEW.hand_rank IS NOT NULL AND NEW.winning_hand IS NOT NULL THEN
    
    -- Update user's best_hand if this is better (lower rank = better)
    -- Or if they don't have a best_hand yet
    UPDATE user_profiles
    SET 
      best_hand = NEW.winning_hand,
      best_hand_rank = NEW.hand_rank,
      best_hand_date = NEW.created_at,
      updated_at = NOW()
    WHERE id = NEW.winner_id
    AND (
      best_hand_rank IS NULL 
      OR NEW.hand_rank < best_hand_rank
    );
    
    -- Log if we updated
    IF FOUND THEN
      RAISE NOTICE '🏆 Updated best_hand for user %: % (rank %)', 
        NEW.winner_id, NEW.winning_hand, NEW.hand_rank;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_best_hand_trigger ON hand_history;

-- Create trigger
CREATE TRIGGER update_best_hand_trigger
AFTER INSERT ON hand_history
FOR EACH ROW
EXECUTE FUNCTION update_user_best_hand();

-- ============================================
-- PART 3: BACKFILL EXISTING DATA (Optional)
-- ============================================

-- Update best hands for users who already have hand history
-- This finds the best hand each user has ever won
WITH best_hands AS (
  SELECT DISTINCT ON (winner_id)
    winner_id,
    winning_hand,
    hand_rank,
    created_at
  FROM hand_history
  WHERE winner_id IS NOT NULL 
    AND winning_hand IS NOT NULL
    AND hand_rank IS NOT NULL
  ORDER BY winner_id, hand_rank ASC, created_at DESC
)
UPDATE user_profiles up
SET 
  best_hand = bh.winning_hand,
  best_hand_rank = bh.hand_rank,
  best_hand_date = bh.created_at,
  updated_at = NOW()
FROM best_hands bh
WHERE up.id = bh.winner_id
  AND (up.best_hand_rank IS NULL OR bh.hand_rank < up.best_hand_rank);

-- Update biggest pots for users who already have hand history
WITH biggest_pots AS (
  SELECT 
    winner_id,
    MAX(pot_size) as max_pot
  FROM hand_history
  WHERE winner_id IS NOT NULL
  GROUP BY winner_id
)
UPDATE user_profiles up
SET 
  biggest_pot = GREATEST(COALESCE(up.biggest_pot, 0), bp.max_pot),
  updated_at = NOW()
FROM biggest_pots bp
WHERE up.id = bp.winner_id;

-- ============================================
-- PART 4: VERIFICATION
-- ============================================

-- Check trigger exists
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger 
  WHERE tgname = 'update_best_hand_trigger';
  
  IF trigger_count = 1 THEN
    RAISE NOTICE '✅ Trigger "update_best_hand_trigger" created successfully';
  ELSE
    RAISE WARNING '❌ Trigger not found! Something went wrong.';
  END IF;
END $$;

-- Show sample of users with best hands
SELECT 
  username,
  best_hand,
  best_hand_rank,
  best_hand_date,
  biggest_pot,
  total_hands_played,
  total_wins
FROM user_profiles
WHERE best_hand IS NOT NULL
ORDER BY best_hand_rank ASC, biggest_pot DESC
LIMIT 10;

SELECT '✅ Migration 12 complete - Best hand & biggest pot tracking enabled!' as result;

