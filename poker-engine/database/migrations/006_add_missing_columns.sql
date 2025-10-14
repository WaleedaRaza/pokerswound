-- Add missing columns to rooms table
-- Migration: 006_add_missing_columns.sql

-- Add host_user_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='rooms' AND column_name='host_user_id') THEN
    ALTER TABLE rooms ADD COLUMN host_user_id UUID REFERENCES users(id);
    RAISE NOTICE 'Added host_user_id column';
  END IF;
END $$;

-- Add invite_code if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='rooms' AND column_name='invite_code') THEN
    ALTER TABLE rooms ADD COLUMN invite_code VARCHAR(10) UNIQUE;
    RAISE NOTICE 'Added invite_code column';
  END IF;
END $$;

-- Add lobby_status if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='rooms' AND column_name='lobby_status') THEN
    ALTER TABLE rooms ADD COLUMN lobby_status VARCHAR(20) DEFAULT 'lobby';
    RAISE NOTICE 'Added lobby_status column';
  END IF;
END $$;

-- Add game_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='rooms' AND column_name='game_id') THEN
    ALTER TABLE rooms ADD COLUMN game_id VARCHAR(255);
    RAISE NOTICE 'Added game_id column';
  END IF;
END $$;

-- Create index on invite_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_rooms_invite_code ON rooms(invite_code);

-- Create index on host_user_id
CREATE INDEX IF NOT EXISTS idx_rooms_host_user_id ON rooms(host_user_id);

SELECT 'Migration 006 completed successfully' AS result;

