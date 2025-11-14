-- Migration: Add auto_start_enabled setting to rooms table
-- Allows host to control whether hands auto-start after completion

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS auto_start_enabled BOOLEAN DEFAULT true;

-- Set all existing rooms to auto-start enabled (backwards compatible)
UPDATE rooms SET auto_start_enabled = true WHERE auto_start_enabled IS NULL;

COMMENT ON COLUMN rooms.auto_start_enabled IS 'If true, hands automatically start 3s after completion. If false, host must manually start each hand.';

