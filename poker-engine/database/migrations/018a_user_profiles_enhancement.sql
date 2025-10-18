-- Migration: User Profiles Enhancement
-- Date: 2024-01-15
-- Purpose: Add global username and role system to user_profiles

-- Add new columns to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS global_username VARCHAR(50),
ADD COLUMN IF NOT EXISTS display_name VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS user_role VARCHAR(20) DEFAULT 'user',
ADD COLUMN IF NOT EXISTS username_changed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS username_change_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_username_changes INTEGER DEFAULT 3;

-- Add constraints for username management
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_global_username_len 
CHECK (global_username IS NULL OR length(global_username) BETWEEN 3 AND 50);

ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_global_username_format 
CHECK (global_username IS NULL OR global_username ~ '^[a-zA-Z0-9_-]+$');

ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_role_check 
CHECK (user_role IN ('user', 'admin', 'god'));

ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_username_changes_limit 
CHECK (username_change_count <= max_username_changes);

-- Add unique constraint for global_username
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_global_username_key 
ON user_profiles(global_username) WHERE global_username IS NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_global_username ON user_profiles(global_username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_role ON user_profiles(user_role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_online ON user_profiles(is_online);

-- Migrate existing data
UPDATE user_profiles 
SET global_username = username 
WHERE global_username IS NULL AND username IS NOT NULL;

UPDATE user_profiles 
SET user_role = 'user' 
WHERE user_role IS NULL;

-- Set your current user as admin
UPDATE user_profiles 
SET user_role = 'admin' 
WHERE id = '7d3c1161-b937-4e7b-ac1e-793217cf4f73';

