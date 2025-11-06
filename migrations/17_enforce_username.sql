-- ============================================
-- Migration 17: Enforce Username NOT NULL
-- Purpose: Ensure all users have a username (single source of truth)
-- Date: 2025-11-06
-- ============================================

-- ============================================
-- PART 1: BACKFILL MISSING USERNAMES
-- ============================================

-- Set default username for any NULL/empty usernames
UPDATE user_profiles 
SET username = COALESCE(
  NULLIF(username, ''),
  'user_' || SUBSTRING(id::text, 1, 8)
)
WHERE username IS NULL OR username = '';

-- ============================================
-- PART 2: ADD NOT NULL CONSTRAINT
-- ============================================

-- Now that all rows have usernames, enforce NOT NULL
ALTER TABLE user_profiles 
  ALTER COLUMN username SET NOT NULL;

-- ============================================
-- PART 3: VERIFY
-- ============================================

-- Check for any remaining issues
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM user_profiles
  WHERE username IS NULL OR username = '';
  
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Found % users without username!', null_count;
  END IF;
  
  RAISE NOTICE '✅ All users have valid usernames';
END $$;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT 
  COUNT(*) as total_users,
  COUNT(DISTINCT username) as unique_usernames
FROM user_profiles;

SELECT '✅ Migration 17 complete - Username is now NOT NULL' as status;

