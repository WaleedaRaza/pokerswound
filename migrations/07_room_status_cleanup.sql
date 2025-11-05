-- ============================================
-- MIGRATION 07: Room Status Cleanup
-- Consolidate room status into clear 3-state lifecycle
-- ============================================

-- STEP 1: Create enum type for room status
DO $$ BEGIN
  CREATE TYPE room_status AS ENUM ('active', 'inactive', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- STEP 2: Add new status column with enum type
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS status_new room_status;

-- STEP 3: Migrate existing data
-- Map old status values to new clean states
UPDATE rooms SET status_new = 
  CASE 
    WHEN UPPER(status::text) = 'WAITING' THEN 'inactive'::room_status
    WHEN UPPER(status::text) = 'ACTIVE' THEN 'active'::room_status
    WHEN UPPER(status::text) = 'CLOSED' THEN 'closed'::room_status
    WHEN LOWER(status::text) = 'active' THEN 'active'::room_status
    WHEN LOWER(status::text) = 'closed' THEN 'closed'::room_status
    ELSE 'inactive'::room_status  -- Default for any unknown status
  END
WHERE status_new IS NULL;

-- STEP 4: Drop old column and rename new one
ALTER TABLE rooms DROP COLUMN IF EXISTS status;
ALTER TABLE rooms RENAME COLUMN status_new TO status;

-- STEP 5: Set constraints
ALTER TABLE rooms ALTER COLUMN status SET DEFAULT 'inactive';
ALTER TABLE rooms ALTER COLUMN status SET NOT NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_status_host ON rooms(host_user_id, status);

-- ============================================
-- TRIGGER 1: Auto-activate room on first player join
-- ============================================
CREATE OR REPLACE FUNCTION auto_activate_room()
RETURNS TRIGGER AS $$
BEGIN
  -- When first player joins, mark room as active
  UPDATE rooms 
  SET status = 'active', updated_at = NOW()
  WHERE id = NEW.room_id 
    AND status = 'inactive';
  
  -- Log the activation
  IF FOUND THEN
    RAISE NOTICE '🟢 Room % auto-activated (first player joined)', NEW.room_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS room_auto_activate ON room_seats;
CREATE TRIGGER room_auto_activate
AFTER INSERT ON room_seats
FOR EACH ROW
EXECUTE FUNCTION auto_activate_room();

-- ============================================
-- TRIGGER 2: Auto-deactivate room on last player leave
-- ============================================
CREATE OR REPLACE FUNCTION auto_deactivate_room()
RETURNS TRIGGER AS $$
DECLARE
  remaining_players INTEGER;
BEGIN
  -- Count remaining players in the room
  SELECT COUNT(*) INTO remaining_players
  FROM room_seats 
  WHERE room_id = OLD.room_id;
  
  -- If no players left, mark room as inactive
  IF remaining_players = 0 THEN
    UPDATE rooms 
    SET status = 'inactive', updated_at = NOW()
    WHERE id = OLD.room_id 
      AND status = 'active';
    
    IF FOUND THEN
      RAISE NOTICE '⚪ Room % auto-deactivated (last player left)', OLD.room_id;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS room_auto_deactivate ON room_seats;
CREATE TRIGGER room_auto_deactivate
AFTER DELETE ON room_seats
FOR EACH ROW
EXECUTE FUNCTION auto_deactivate_room();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Show current distribution of room statuses
SELECT 
  status,
  COUNT(*) as count,
  COUNT(DISTINCT host_user_id) as unique_hosts
FROM rooms
GROUP BY status
ORDER BY status;

-- Show any rooms with players but marked inactive (should be 0)
SELECT 
  r.id,
  r.name,
  r.status,
  COUNT(rs.user_id) as player_count
FROM rooms r
LEFT JOIN room_seats rs ON rs.room_id = r.id
WHERE r.status = 'inactive'
GROUP BY r.id, r.name, r.status
HAVING COUNT(rs.user_id) > 0;

-- Show any active rooms with no players (should be 0)
SELECT 
  r.id,
  r.name,
  r.status,
  COUNT(rs.user_id) as player_count
FROM rooms r
LEFT JOIN room_seats rs ON rs.room_id = r.id
WHERE r.status = 'active'
GROUP BY r.id, r.name, r.status
HAVING COUNT(rs.user_id) = 0;

SELECT '✅ Migration 07 complete - Room status cleaned up!' as result;

