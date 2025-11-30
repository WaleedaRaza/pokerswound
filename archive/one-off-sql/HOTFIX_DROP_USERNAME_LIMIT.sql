-- ============================================
-- HOTFIX: Drop Username Change Limit Constraint
-- Run this in Supabase SQL Editor immediately
-- ============================================

-- Drop the check constraint that limits username changes
ALTER TABLE user_profiles 
  DROP CONSTRAINT IF EXISTS user_profiles_username_changes_limit;

-- Drop the username_changes column (no longer needed)
ALTER TABLE user_profiles 
  DROP COLUMN IF EXISTS username_changes;

-- Verify it's gone
SELECT 
  constraint_name, 
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'user_profiles' 
  AND constraint_name LIKE '%username%';

-- Expected: Only 'user_profiles_username_key' (unique constraint) should remain

SELECT '✅ Username change limit removed - unlimited changes allowed!' as status;

