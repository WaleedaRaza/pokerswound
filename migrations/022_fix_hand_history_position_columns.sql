-- Add position columns if they don't exist
ALTER TABLE hand_history
  ADD COLUMN IF NOT EXISTS dealer_position INTEGER,
  ADD COLUMN IF NOT EXISTS sb_position INTEGER,
  ADD COLUMN IF NOT EXISTS bb_position INTEGER,
  ADD COLUMN IF NOT EXISTS starting_stacks JSONB;

-- Add index for positional queries
CREATE INDEX IF NOT EXISTS idx_hand_history_dealer_position ON hand_history(dealer_position);
CREATE INDEX IF NOT EXISTS idx_hand_history_winner_dealer ON hand_history(winner_id, dealer_position);

-- Add comments
COMMENT ON COLUMN hand_history.dealer_position IS 'Dealer button position (BTN seat index)';
COMMENT ON COLUMN hand_history.sb_position IS 'Small blind position (seat index)';
COMMENT ON COLUMN hand_history.bb_position IS 'Big blind position (seat index)';
COMMENT ON COLUMN hand_history.starting_stacks IS 'Starting stacks per seat: {seatIndex: stackAmount}';

-- Verify columns exist
DO $$
DECLARE
  missing_cols TEXT[] := ARRAY[]::TEXT[];
  col_name TEXT;
BEGIN
  FOR col_name IN 
    SELECT unnest(ARRAY['dealer_position', 'sb_position', 'bb_position', 'starting_stacks'])
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
    RAISE NOTICE '✅ All position columns added to hand_history table!';
  END IF;
END $$;

SELECT '✅ Migration 22 complete - Position columns verified in hand_history!' as result;