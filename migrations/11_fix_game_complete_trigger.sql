-- MIGRATION 11: Fix track_game_complete() Trigger
-- Issue: Trigger uses NEW.game_id but game_states table uses 'id' column
-- Fix: Change NEW.game_id to NEW.id

-- Drop and recreate the trigger function with correct column reference
CREATE OR REPLACE FUNCTION track_game_complete() RETURNS TRIGGER AS $$
DECLARE
  host_id UUID;
  player_ids_array UUID[];
  game_duration INT;
BEGIN
  -- Only proceed if game is being marked as completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- Get host_user_id from rooms table
    SELECT host_user_id INTO host_id
    FROM rooms
    WHERE id = NEW.room_id;
    
    -- Get all player_ids from room_seats
    SELECT ARRAY_AGG(DISTINCT user_id) INTO player_ids_array
    FROM room_seats
    WHERE room_id = NEW.room_id AND left_at IS NULL;
    
    -- Calculate game duration
    game_duration := EXTRACT(EPOCH FROM (NOW() - NEW.created_at))::INT;
    
    -- Insert game completion record
    -- FIXED: Changed NEW.game_id to NEW.id (game_states uses 'id' column)
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
      NEW.id,  -- FIXED: was NEW.game_id
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
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger already exists, no need to recreate
-- (Just the function needed to be fixed)

-- Verification query
SELECT 
  tgname AS trigger_name,
  tgenabled AS enabled,
  proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'game_completed_trigger';

