-- ============================================
-- MIGRATION 14: Fix best_hand_rank Type Mismatch
-- Change from VARCHAR to INTEGER for proper comparison
-- ============================================

-- Step 1: Convert any existing data to integers (if any)
-- This will set NULL for any non-numeric values
UPDATE user_profiles
SET best_hand_rank = NULL
WHERE best_hand_rank IS NOT NULL 
  AND best_hand_rank !~ '^[0-9]+$';

-- Step 2: Change column type from VARCHAR to INTEGER
ALTER TABLE user_profiles
  ALTER COLUMN best_hand_rank TYPE INTEGER USING best_hand_rank::INTEGER;

-- Step 3: Add constraint to ensure valid hand ranks (1-10)
ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS valid_hand_rank;

ALTER TABLE user_profiles
  ADD CONSTRAINT valid_hand_rank 
  CHECK (best_hand_rank IS NULL OR (best_hand_rank >= 1 AND best_hand_rank <= 10));

-- Step 4: Verify type change
DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'user_profiles'
    AND column_name = 'best_hand_rank';
  
  IF col_type = 'integer' THEN
    RAISE NOTICE '✅ best_hand_rank is now INTEGER type';
  ELSE
    RAISE WARNING '❌ best_hand_rank is still %', col_type;
  END IF;
END $$;

SELECT '✅ Migration 14 complete - best_hand_rank type fixed!' as result;

