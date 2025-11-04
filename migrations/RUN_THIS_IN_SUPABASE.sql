-- ============================================
-- COPY-PASTE THIS DIRECTLY INTO SUPABASE SQL EDITOR
-- ============================================

-- Add pending blind columns for queued blind changes
ALTER TABLE rooms 
  ADD COLUMN IF NOT EXISTS pending_small_blind INTEGER,
  ADD COLUMN IF NOT EXISTS pending_big_blind INTEGER;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'rooms' 
AND column_name IN ('pending_small_blind', 'pending_big_blind');

-- Expected result: 2 rows showing both columns exist

