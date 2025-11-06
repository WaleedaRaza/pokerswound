-- ============================================
-- MIGRATION 15: Fix biggest_pot Column Duplication
-- Consolidate biggest_pot_won + biggest_pot into single column
-- ============================================

-- Handle the case where BOTH columns exist
DO $$
DECLARE
  has_old BOOLEAN;
  has_new BOOLEAN;
BEGIN
  -- Check which columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'biggest_pot_won'
  ) INTO has_old;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'biggest_pot'
  ) INTO has_new;
  
  RAISE NOTICE 'Column status: biggest_pot_won=%, biggest_pot=%', has_old, has_new;
  
  -- CASE 1: Both exist (common after Migration 12)
  IF has_old AND has_new THEN
    -- Copy max value from both columns to biggest_pot
    UPDATE user_profiles
    SET biggest_pot = GREATEST(
      COALESCE(biggest_pot, 0),
      COALESCE(biggest_pot_won, 0)
    );
    
    -- Drop the old column
    ALTER TABLE user_profiles DROP COLUMN biggest_pot_won;
    
    RAISE NOTICE '✅ Merged biggest_pot_won into biggest_pot and dropped old column';
  
  -- CASE 2: Only old exists (rename it)
  ELSIF has_old AND NOT has_new THEN
    ALTER TABLE user_profiles RENAME COLUMN biggest_pot_won TO biggest_pot;
    RAISE NOTICE '✅ Renamed biggest_pot_won → biggest_pot';
  
  -- CASE 3: Only new exists (all good)
  ELSIF has_new AND NOT has_old THEN
    RAISE NOTICE '✅ biggest_pot column already exists (correct state)';
  
  -- CASE 4: Neither exists (create it)
  ELSE
    ALTER TABLE user_profiles ADD COLUMN biggest_pot BIGINT DEFAULT 0;
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

