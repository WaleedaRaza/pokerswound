-- ============================================
-- MIGRATION 10: Fix processed_actions Foreign Key
-- Make room_id nullable so we can store actions after rooms are deleted
-- ============================================

-- Drop the existing foreign key constraint
ALTER TABLE processed_actions 
  DROP CONSTRAINT IF EXISTS processed_actions_room_id_fkey;

-- Make room_id nullable (rooms can be deleted, but we still want action history)
ALTER TABLE processed_actions 
  ALTER COLUMN room_id DROP NOT NULL;

-- Add back a softer foreign key with ON DELETE SET NULL
ALTER TABLE processed_actions
  ADD CONSTRAINT processed_actions_room_id_fkey 
  FOREIGN KEY (room_id) 
  REFERENCES rooms(id) 
  ON DELETE SET NULL;  -- When room deleted, set to NULL instead of blocking

SELECT '✅ Migration 10 complete - processed_actions can now handle deleted rooms' as result;

