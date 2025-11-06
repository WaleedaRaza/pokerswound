-- ============================================
-- MIGRATION 13: Add Missing Columns to hand_history
-- Required for data extraction pipeline to work
-- ============================================

-- Add missing columns to hand_history table
ALTER TABLE hand_history
  ADD COLUMN IF NOT EXISTS player_ids UUID[],
  ADD COLUMN IF NOT EXISTS winner_id UUID,
  ADD COLUMN IF NOT EXISTS winning_hand TEXT,
  ADD COLUMN IF NOT EXISTS hand_rank INTEGER,
  ADD COLUMN IF NOT EXISTS board_cards TEXT,
  ADD COLUMN IF NOT EXISTS actions_log JSONB;

-- Add foreign key constraint for winner_id
ALTER TABLE hand_history
  DROP CONSTRAINT IF EXISTS hand_history_winner_id_fkey;

ALTER TABLE hand_history
  ADD CONSTRAINT hand_history_winner_id_fkey
  FOREIGN KEY (winner_id) REFERENCES user_profiles(id)
  ON DELETE SET NULL;

-- Add index for faster winner lookups
CREATE INDEX IF NOT EXISTS idx_hand_history_winner_id ON hand_history(winner_id);
CREATE INDEX IF NOT EXISTS idx_hand_history_hand_rank ON hand_history(hand_rank);
CREATE INDEX IF NOT EXISTS idx_hand_history_pot_size ON hand_history(pot_size DESC);

-- Verify columns exist
DO $$
DECLARE
  missing_cols TEXT[] := ARRAY[]::TEXT[];
  col_name TEXT;
BEGIN
  -- Check each required column
  FOR col_name IN 
    SELECT unnest(ARRAY['player_ids', 'winner_id', 'winning_hand', 'hand_rank', 'board_cards', 'actions_log'])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'hand_history' 
        AND column_name = col_name
    ) THEN
      missing_cols := array_append(missing_cols, col_name);
    END IF;
  END LOOP;
  
  IF array_length(missing_cols, 1) > 0 THEN
    RAISE WARNING '❌ Still missing columns: %', array_to_string(missing_cols, ', ');
  ELSE
    RAISE NOTICE '✅ All required columns exist in hand_history table!';
  END IF;
END $$;

SELECT '✅ Migration 13 complete - hand_history table ready for data extraction!' as result;

