-- ============================================
-- MIGRATION 16: Add Encoded Hand Column
-- Add compact PHE (Poker Hand Encoding) format
-- ============================================

-- Add encoded_hand column for compact storage
ALTER TABLE hand_history
  ADD COLUMN IF NOT EXISTS encoded_hand TEXT;

-- Add index for fast string searches (grep-like)
CREATE INDEX IF NOT EXISTS idx_hand_history_encoded ON hand_history(encoded_hand);

-- Add comment
COMMENT ON COLUMN hand_history.encoded_hand IS 'PHE format: P0:AhKd|P1:XX|B:Jh9h5h|W:0|R:5|P:120|A:0R20,1C20 (80% smaller than JSON)';

-- Verify
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'hand_history' 
      AND column_name = 'encoded_hand'
  ) THEN
    RAISE NOTICE '✅ encoded_hand column added to hand_history';
  ELSE
    RAISE WARNING '❌ Failed to add encoded_hand column';
  END IF;
END $$;

SELECT '✅ Migration 16 complete - PHE encoding ready!' as result;

