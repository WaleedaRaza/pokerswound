-- Migration: Add dealer_position column to rooms table
-- Purpose: Track the rotating dealer button position for multi-hand games
-- Created: 2025-11-14

-- Add dealer_position column (defaults to 0 for first hand)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS dealer_position INTEGER DEFAULT 0;

-- Ensure existing rooms have a valid dealer position
UPDATE rooms SET dealer_position = 0 WHERE dealer_position IS NULL;

-- Add comment
COMMENT ON COLUMN rooms.dealer_position IS 'Current dealer button position (player index, not seat index). Rotates after each hand.';

