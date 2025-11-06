-- ============================================
-- MIGRATION 15: Fix biggest_pot Column Name Mismatch
-- Rename biggest_pot_won → biggest_pot for consistency
-- ============================================

-- Check if biggest_pot_won exists and biggest_pot doesn't
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'biggest_pot_won'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'biggest_pot'
  ) THEN
    -- Rename the column
    ALTER TABLE user_profiles
      RENAME COLUMN biggest_pot_won TO biggest_pot;
    
    RAISE NOTICE '✅ Renamed biggest_pot_won → biggest_pot';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'biggest_pot'
  ) THEN
    RAISE NOTICE '✅ biggest_pot column already exists';
  ELSE
    -- Neither exists, create it
    ALTER TABLE user_profiles
      ADD COLUMN biggest_pot BIGINT DEFAULT 0;
    
    RAISE NOTICE '✅ Created biggest_pot column';
  END IF;
END $$;

-- Verify
DO $$
DECLARE
  col_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'biggest_pot'
  ) INTO col_exists;
  
  IF col_exists THEN
    RAISE NOTICE '✅ Verification: biggest_pot column exists';
  ELSE
    RAISE WARNING '❌ Verification failed: biggest_pot column does not exist';
  END IF;
END $$;

SELECT '✅ Migration 15 complete - biggest_pot column name fixed!' as result;

