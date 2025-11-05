-- ============================================
-- MIGRATION 08: Hand History + Room Cleanup
-- Create hand_history table, simplify rooms, strengthen data extraction
-- ============================================

-- ============================================
-- PART 1: Create hand_history table
-- ============================================

CREATE TABLE IF NOT EXISTS hand_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context
  game_id UUID NOT NULL, -- which game this hand was part of
  room_id UUID, -- which room (can be NULL if room deleted)
  hand_number INTEGER NOT NULL, -- 1, 2, 3... within the game
  
  -- Players
  player_ids UUID[] NOT NULL, -- all players in this hand
  winner_id UUID, -- NULL for split pots or if everyone folds
  
  -- Hand Details
  pot_size INTEGER NOT NULL DEFAULT 0,
  board_cards TEXT, -- e.g., "Ah Kd Qs 7c 3s" (community cards)
  winning_hand TEXT, -- e.g., "Royal Flush", "Two Pair (Aces and Kings)"
  hand_rank INTEGER, -- 1=Royal Flush, 2=Straight Flush, ..., 10=High Card
  
  -- Action Log (for replay)
  actions_log JSONB, -- [{player_id, action, amount, timestamp}, ...]
  
  -- Timestamps
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP DEFAULT NOW(),
  duration_seconds INTEGER GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (ended_at - started_at))) STORED,
  
  -- Indexes
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_hand_history_player ON hand_history USING GIN(player_ids);
CREATE INDEX IF NOT EXISTS idx_hand_history_winner ON hand_history(winner_id);
CREATE INDEX IF NOT EXISTS idx_hand_history_game ON hand_history(game_id);
CREATE INDEX IF NOT EXISTS idx_hand_history_room ON hand_history(room_id);
CREATE INDEX IF NOT EXISTS idx_hand_history_ended ON hand_history(ended_at DESC);

-- ============================================
-- PART 2: Add hand_rank helper function
-- ============================================

-- Function to determine hand rank from hand description
CREATE OR REPLACE FUNCTION get_hand_rank(hand_text TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE
    WHEN hand_text ILIKE '%royal flush%' THEN 1
    WHEN hand_text ILIKE '%straight flush%' THEN 2
    WHEN hand_text ILIKE '%four of a kind%' OR hand_text ILIKE '%quads%' THEN 3
    WHEN hand_text ILIKE '%full house%' THEN 4
    WHEN hand_text ILIKE '%flush%' THEN 5
    WHEN hand_text ILIKE '%straight%' THEN 6
    WHEN hand_text ILIKE '%three of a kind%' OR hand_text ILIKE '%trips%' THEN 7
    WHEN hand_text ILIKE '%two pair%' THEN 8
    WHEN hand_text ILIKE '%pair%' THEN 9
    ELSE 10 -- High card
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- PART 3: Trigger to update biggest_pot in user_profiles
-- ============================================

CREATE OR REPLACE FUNCTION update_biggest_pot()
RETURNS TRIGGER AS $$
BEGIN
  -- Update biggest_pot for the winner if this pot is bigger
  IF NEW.winner_id IS NOT NULL THEN
    UPDATE user_profiles
    SET 
      biggest_pot = GREATEST(COALESCE(biggest_pot, 0), NEW.pot_size),
      updated_at = NOW()
    WHERE id = NEW.winner_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_biggest_pot ON hand_history;
CREATE TRIGGER update_user_biggest_pot
AFTER INSERT ON hand_history
FOR EACH ROW
EXECUTE FUNCTION update_biggest_pot();

-- ============================================
-- PART 4: Simplify rooms table (remove status complexity)
-- ============================================

-- Add deleted_at for soft deletes (optional - can use hard deletes too)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Index for filtering out deleted rooms
CREATE INDEX IF NOT EXISTS idx_rooms_deleted ON rooms(host_user_id) WHERE deleted_at IS NULL;

-- For room limit queries, only count non-deleted rooms
-- Query: SELECT COUNT(*) FROM rooms WHERE host_user_id = $1 AND deleted_at IS NULL

-- ============================================
-- PART 5: Update game_completions to capture more data
-- ============================================

-- Add fields to game_completions if they don't exist
ALTER TABLE game_completions ADD COLUMN IF NOT EXISTS room_name TEXT;
ALTER TABLE game_completions ADD COLUMN IF NOT EXISTS host_user_id UUID;
ALTER TABLE game_completions ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

-- Update the game completion trigger to populate these fields
CREATE OR REPLACE FUNCTION track_game_complete()
RETURNS TRIGGER AS $$
DECLARE
  room_data RECORD;
  player_list UUID[];
BEGIN
  -- Only process when game becomes completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Get room data
    SELECT name, host_user_id INTO room_data
    FROM rooms
    WHERE id = NEW.room_id;
    
    -- Get list of players
    SELECT ARRAY_AGG(DISTINCT user_id) INTO player_list
    FROM room_seats
    WHERE room_id = NEW.room_id;
    
    -- Insert game completion record
    INSERT INTO game_completions (
      game_id,
      room_id,
      room_name,
      host_user_id,
      player_ids,
      winner_id,
      total_pot,
      hands_played,
      started_at,
      ended_at,
      duration_seconds
    ) VALUES (
      NEW.id,
      NEW.room_id,
      room_data.name,
      room_data.host_user_id,
      player_list,
      NEW.winner_id, -- Assumes winner_id is tracked in game_states
      NEW.total_pot, -- Assumes total_pot is tracked in game_states
      NEW.hands_completed, -- Assumes hands_completed is tracked in game_states
      NEW.created_at,
      NOW(),
      EXTRACT(EPOCH FROM (NOW() - NEW.created_at))::INTEGER
    );
    
    -- Update all players' profiles
    UPDATE user_profiles
    SET 
      total_games_completed = total_games_completed + 1,
      is_playing = FALSE,
      current_game_id = NULL,
      last_active_at = NOW(),
      updated_at = NOW()
    WHERE id = ANY(player_list);
    
    RAISE NOTICE '🏁 Game % completed - data extracted to game_completions', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 6: Add user_profiles fields if missing
-- ============================================

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS best_hand TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS best_hand_date TIMESTAMP;

-- ============================================
-- PART 7: Function to get user's hand history
-- ============================================

CREATE OR REPLACE FUNCTION get_user_hand_history(p_user_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  hand_id UUID,
  hand_number INTEGER,
  room_id UUID,
  won BOOLEAN,
  pot_size INTEGER,
  board_cards TEXT,
  winning_hand TEXT,
  hand_rank INTEGER,
  ended_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.hand_number,
    h.room_id,
    h.winner_id = p_user_id,
    h.pot_size,
    h.board_cards,
    h.winning_hand,
    h.hand_rank,
    h.ended_at
  FROM hand_history h
  WHERE p_user_id = ANY(h.player_ids)
  ORDER BY h.ended_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 8: Function to get user's game history
-- ============================================

CREATE OR REPLACE FUNCTION get_user_game_history(p_user_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  game_id UUID,
  room_name TEXT,
  won BOOLEAN,
  hands_played INTEGER,
  total_pot INTEGER,
  ended_at TIMESTAMP,
  duration_seconds INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gc.game_id,
    gc.room_name,
    gc.winner_id = p_user_id,
    gc.hands_played,
    gc.total_pot,
    gc.ended_at,
    gc.duration_seconds
  FROM game_completions gc
  WHERE p_user_id = ANY(gc.player_ids)
  ORDER BY gc.ended_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 9: Function to get user's best hands
-- ============================================

CREATE OR REPLACE FUNCTION get_user_best_hands(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  hand_id UUID,
  winning_hand TEXT,
  hand_rank INTEGER,
  pot_size INTEGER,
  board_cards TEXT,
  ended_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.winning_hand,
    h.hand_rank,
    h.pot_size,
    h.board_cards,
    h.ended_at
  FROM hand_history h
  WHERE h.winner_id = p_user_id
  ORDER BY h.hand_rank ASC, h.pot_size DESC, h.ended_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICATION
-- ============================================

-- Show table structure
SELECT 
  'hand_history' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'hand_history'
ORDER BY ordinal_position;

SELECT '✅ Migration 08 complete - Hand history tracking ready!' as result;

