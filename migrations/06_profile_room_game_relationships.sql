-- ============================================
-- Migration 06: Profile-Centric Architecture
-- Purpose: Create strong relationships between profiles, rooms, and games
-- Philosophy: Profile as living tracker of all interactions
-- Date: 2025-11-05
-- ============================================

-- ============================================
-- PART 1: ROOM PARTICIPATION TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS room_participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  
  -- Timing
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  left_at TIMESTAMP,
  
  -- Role
  was_host BOOLEAN DEFAULT FALSE,
  
  -- Activity metrics (updated via triggers)
  hands_played INTEGER DEFAULT 0,
  games_completed INTEGER DEFAULT 0,
  total_winnings BIGINT DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, room_id)
);

CREATE INDEX idx_room_participations_user ON room_participations(user_id);
CREATE INDEX idx_room_participations_room ON room_participations(room_id);
CREATE INDEX idx_room_participations_active ON room_participations(user_id) WHERE left_at IS NULL;

-- ============================================
-- PART 2: GAME COMPLETION TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS game_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id TEXT NOT NULL UNIQUE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  
  -- Timing
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  duration_seconds INTEGER,
  
  -- Host
  host_user_id UUID REFERENCES user_profiles(id),
  
  -- Game details
  total_hands_played INTEGER NOT NULL DEFAULT 0,
  total_pot_size BIGINT DEFAULT 0,
  
  -- Participants (array of UUIDs)
  player_ids UUID[] NOT NULL,
  player_count INTEGER,
  
  -- Winner
  winner_user_id UUID REFERENCES user_profiles(id),
  winning_amount BIGINT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_game_completions_room ON game_completions(room_id);
CREATE INDEX idx_game_completions_host ON game_completions(host_user_id);
CREATE INDEX idx_game_completions_winner ON game_completions(winner_user_id);
CREATE INDEX idx_game_completions_completed ON game_completions(completed_at DESC);
CREATE INDEX idx_game_completions_players ON game_completions USING GIN (player_ids);

-- ============================================
-- PART 3: ENHANCE USER PROFILES (Real-Time State)
-- ============================================

-- Current state columns
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS currently_in_room_id UUID REFERENCES rooms(id),
  ADD COLUMN IF NOT EXISTS current_game_id TEXT,
  ADD COLUMN IF NOT EXISTS is_playing BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS current_seat_index INTEGER,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP DEFAULT NOW();

-- Aggregate counters
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS total_rooms_created INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_rooms_joined INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_games_started INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_games_completed INTEGER DEFAULT 0;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_currently_in_room ON user_profiles(currently_in_room_id) WHERE currently_in_room_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_playing ON user_profiles(is_playing) WHERE is_playing = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_active ON user_profiles(last_active_at DESC);

-- ============================================
-- PART 4: TRIGGER 1 - Track Room Join
-- ============================================

CREATE OR REPLACE FUNCTION track_room_join()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user profile with current room
  UPDATE user_profiles
  SET 
    currently_in_room_id = NEW.room_id,
    total_rooms_joined = total_rooms_joined + 1,
    last_active_at = NOW(),
    updated_at = NOW()
  WHERE id = NEW.user_id;
  
  -- Record or update participation
  INSERT INTO room_participations (user_id, room_id, joined_at)
  VALUES (NEW.user_id, NEW.room_id, NOW())
  ON CONFLICT (user_id, room_id) 
  DO UPDATE SET 
    joined_at = NOW(), 
    left_at = NULL,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_joins_room ON room_seats;
CREATE TRIGGER user_joins_room
AFTER INSERT ON room_seats
FOR EACH ROW
EXECUTE FUNCTION track_room_join();

-- ============================================
-- PART 5: TRIGGER 2 - Track Room Leave
-- ============================================

CREATE OR REPLACE FUNCTION track_room_leave()
RETURNS TRIGGER AS $$
BEGIN
  -- Clear current room from profile
  UPDATE user_profiles
  SET 
    currently_in_room_id = CASE 
      WHEN currently_in_room_id = OLD.room_id THEN NULL 
      ELSE currently_in_room_id 
    END,
    is_playing = CASE 
      WHEN currently_in_room_id = OLD.room_id THEN FALSE 
      ELSE is_playing 
    END,
    current_game_id = CASE 
      WHEN currently_in_room_id = OLD.room_id THEN NULL 
      ELSE current_game_id 
    END,
    current_seat_index = NULL,
    last_active_at = NOW(),
    updated_at = NOW()
  WHERE id = OLD.user_id;
  
  -- Mark participation as ended
  UPDATE room_participations
  SET 
    left_at = NOW(),
    updated_at = NOW()
  WHERE user_id = OLD.user_id 
    AND room_id = OLD.room_id 
    AND left_at IS NULL;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_leaves_room ON room_seats;
CREATE TRIGGER user_leaves_room
AFTER DELETE ON room_seats
FOR EACH ROW
EXECUTE FUNCTION track_room_leave();

-- ============================================
-- PART 6: TRIGGER 3 - Track Room Creation
-- ============================================

CREATE OR REPLACE FUNCTION track_room_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment rooms created counter
  UPDATE user_profiles
  SET 
    total_rooms_created = total_rooms_created + 1,
    last_active_at = NOW(),
    updated_at = NOW()
  WHERE id = NEW.host_user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS room_created ON rooms;
CREATE TRIGGER room_created
AFTER INSERT ON rooms
FOR EACH ROW
WHEN (NEW.host_user_id IS NOT NULL)
EXECUTE FUNCTION track_room_creation();

-- ============================================
-- PART 7: TRIGGER 4 - Track Game Start
-- ============================================

CREATE OR REPLACE FUNCTION track_game_start()
RETURNS TRIGGER AS $$
BEGIN
  -- When game becomes active, mark all seated players as playing
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    UPDATE user_profiles
    SET 
      is_playing = TRUE,
      current_game_id = NEW.game_id,
      total_games_started = total_games_started + 1,
      last_active_at = NOW(),
      updated_at = NOW()
    WHERE id IN (
      SELECT user_id FROM room_seats WHERE room_id = NEW.room_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS game_starts ON game_states;
CREATE TRIGGER game_starts
AFTER INSERT OR UPDATE ON game_states
FOR EACH ROW
EXECUTE FUNCTION track_game_start();

-- ============================================
-- PART 8: TRIGGER 5 - Track Game Complete
-- ============================================

CREATE OR REPLACE FUNCTION track_game_complete()
RETURNS TRIGGER AS $$
DECLARE
  player_ids_array UUID[];
  host_id UUID;
  game_duration INTEGER;
BEGIN
  -- Get all player IDs who played in this game
  SELECT ARRAY_AGG(DISTINCT user_id) INTO player_ids_array
  FROM room_seats
  WHERE room_id = NEW.room_id;
  
  -- Get host
  SELECT host_user_id INTO host_id
  FROM rooms
  WHERE id = NEW.room_id;
  
  -- Calculate duration
  game_duration := EXTRACT(EPOCH FROM (NOW() - NEW.created_at))::INTEGER;
  
  -- Create game completion record
  INSERT INTO game_completions (
    game_id,
    room_id,
    host_user_id,
    started_at,
    completed_at,
    duration_seconds,
    total_hands_played,
    player_ids,
    player_count
  ) VALUES (
    NEW.game_id,
    NEW.room_id,
    host_id,
    NEW.created_at,
    NOW(),
    game_duration,
    COALESCE(NEW.hand_number, 0),
    player_ids_array,
    COALESCE(array_length(player_ids_array, 1), 0)
  )
  ON CONFLICT (game_id) DO NOTHING;
  
  -- Update all players' completion counts
  UPDATE user_profiles
  SET 
    total_games_completed = total_games_completed + 1,
    is_playing = FALSE,
    current_game_id = NULL,
    last_active_at = NOW(),
    updated_at = NOW()
  WHERE id = ANY(player_ids_array);
  
  -- Update room participation metrics
  UPDATE room_participations
  SET 
    games_completed = games_completed + 1,
    updated_at = NOW()
  WHERE user_id = ANY(player_ids_array)
    AND room_id = NEW.room_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS game_completes ON game_states;
CREATE TRIGGER game_completes
AFTER UPDATE ON game_states
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
EXECUTE FUNCTION track_game_complete();

-- ============================================
-- PART 9: BACKFILL EXISTING DATA
-- ============================================

-- Backfill room participations from current room_seats
INSERT INTO room_participations (user_id, room_id, joined_at)
SELECT 
  rs.user_id,
  rs.room_id,
  COALESCE(rs.joined_at, NOW())
FROM room_seats rs
ON CONFLICT (user_id, room_id) DO NOTHING;

-- Update currently_in_room_id for users with active seats
UPDATE user_profiles up
SET currently_in_room_id = rs.room_id
FROM room_seats rs
WHERE up.id = rs.user_id
  AND up.currently_in_room_id IS NULL;

-- Update total_rooms_joined
UPDATE user_profiles
SET total_rooms_joined = (
  SELECT COUNT(DISTINCT room_id) 
  FROM room_participations 
  WHERE user_id = user_profiles.id
);

-- Update total_rooms_created
UPDATE user_profiles
SET total_rooms_created = (
  SELECT COUNT(*) 
  FROM rooms 
  WHERE host_user_id = user_profiles.id
);

-- ============================================
-- PART 10: HELPER VIEWS
-- ============================================

-- View: Active Players (who's playing right now)
CREATE OR REPLACE VIEW active_players AS
SELECT 
  up.id,
  up.username,
  up.currently_in_room_id,
  up.current_game_id,
  up.is_playing,
  r.name as room_name,
  up.last_active_at
FROM user_profiles up
LEFT JOIN rooms r ON r.id = up.currently_in_room_id
WHERE up.currently_in_room_id IS NOT NULL
ORDER BY up.last_active_at DESC;

-- View: User Activity Summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
  up.id,
  up.username,
  up.total_rooms_created,
  up.total_rooms_joined,
  up.total_games_started,
  up.total_games_completed,
  up.total_hands_played,
  up.total_wins,
  up.win_rate,
  up.is_playing,
  up.last_active_at,
  CASE 
    WHEN up.last_active_at > NOW() - INTERVAL '5 minutes' THEN 'online'
    WHEN up.last_active_at > NOW() - INTERVAL '1 hour' THEN 'away'
    ELSE 'offline'
  END as status
FROM user_profiles up;

-- ============================================
-- PART 11: VERIFICATION
-- ============================================

DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger 
  WHERE tgname IN (
    'user_joins_room',
    'user_leaves_room',
    'room_created',
    'game_starts',
    'game_completes'
  );
  
  IF trigger_count = 5 THEN
    RAISE NOTICE '✅ All 5 triggers created successfully';
  ELSE
    RAISE WARNING '❌ Expected 5 triggers, found %', trigger_count;
  END IF;
END $$;

-- Check tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'room_participations') AND
     EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'game_completions') THEN
    RAISE NOTICE '✅ All tracking tables created successfully';
  ELSE
    RAISE WARNING '❌ Tracking tables not found';
  END IF;
END $$;

-- Show sample data
SELECT 
  username,
  total_rooms_joined,
  total_games_completed,
  total_hands_played,
  is_playing,
  last_active_at
FROM user_profiles
LIMIT 5;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT '✅ Migration 06 COMPLETE: Profile-centric architecture established!' AS result;
SELECT '🎯 Profiles now track all interactions in real-time' AS benefit;
SELECT '🧪 TEST: Join a room and check profile updates' AS next_step;

