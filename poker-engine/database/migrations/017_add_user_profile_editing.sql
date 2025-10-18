-- Migration: Add user profile editing capabilities
-- Date: 2024-01-15

-- Add profile editing fields to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(50),
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add unique constraint on username (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_username_unique 
ON user_profiles (LOWER(username));

-- Add index for display name searches
CREATE INDEX IF NOT EXISTS user_profiles_display_name_idx 
ON user_profiles (display_name);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at_trigger
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profile_updated_at();

-- Update existing records to have display_name = username if null
UPDATE user_profiles 
SET display_name = username 
WHERE display_name IS NULL;

-- Add check constraint for username length and format
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_username_check 
CHECK (
    LENGTH(username) >= 3 AND 
    LENGTH(username) <= 20 AND 
    username ~ '^[a-zA-Z0-9_-]+$'
);

-- Add check constraint for display_name length
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_display_name_check 
CHECK (
    LENGTH(display_name) >= 1 AND 
    LENGTH(display_name) <= 50
);
