-- ============================================
-- HOTFIX: Fix game_start trigger and clean old rooms
-- Run this in Supabase SQL Editor NOW
-- ============================================

-- FIX 1: Update the game_start trigger to use NEW.id
CREATE OR REPLACE FUNCTION track_game_start()
RETURNS TRIGGER AS $$
BEGIN
  -- When game becomes active, mark all seated players as playing
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    UPDATE user_profiles
    SET 
      is_playing = TRUE,
      current_game_id = NEW.id,  -- FIXED: was NEW.game_id, should be NEW.id
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

-- FIX 2: Clean up old/inactive rooms
UPDATE rooms 
SET status = 'closed' 
WHERE status = 'active' 
  AND (
    updated_at < NOW() - INTERVAL '1 day'
    OR id NOT IN (SELECT DISTINCT room_id FROM room_seats WHERE room_id IS NOT NULL)
  );

-- Show how many rooms were closed
SELECT 'Closed ' || COUNT(*) || ' old rooms' as result
FROM rooms 
WHERE status = 'closed' AND updated_at > NOW() - INTERVAL '1 minute';

-- Show your active rooms now
SELECT 
  r.id,
  r.name,
  r.status,
  r.created_at,
  COUNT(rs.user_id) as players_count
FROM rooms r
LEFT JOIN room_seats rs ON rs.room_id = r.id
WHERE r.host_user_id = 'YOUR_USER_ID_HERE'  -- Replace with your actual user ID
  AND r.status = 'active'
GROUP BY r.id, r.name, r.status, r.created_at
ORDER BY r.created_at DESC;

SELECT '✅ Trigger fixed! Old rooms cleaned. Try creating a game now.' as next_step;

