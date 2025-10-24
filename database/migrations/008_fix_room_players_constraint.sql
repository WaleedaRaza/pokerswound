-- Fix room_players status constraint to allow lowercase values
-- Migration: 008_fix_room_players_constraint.sql

-- Drop old constraint
ALTER TABLE room_players DROP CONSTRAINT IF EXISTS room_players_status_check;

-- Add new constraint with lowercase values (matching code)
ALTER TABLE room_players ADD CONSTRAINT room_players_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'left', 'PENDING', 'APPROVED', 'REJECTED', 'LEFT'));

SELECT 'Migration 008 completed - room_players status constraint fixed' AS result;

