-- Migration 010: Fix foreign key constraints for Supabase auth integration
-- This migration updates foreign key references to work with Supabase auth.users

-- First, let's check if we need to create a users table that mirrors auth.users
-- or update the foreign key references

-- Option 1: Update foreign key to reference auth.users instead of users
-- (This requires the auth schema to be accessible)

-- Drop the existing foreign key constraint
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_host_user_id_fkey;

-- Update the foreign key to reference auth.users
ALTER TABLE rooms 
ADD CONSTRAINT rooms_host_user_id_fkey 
FOREIGN KEY (host_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Also update room_players table if it has similar issues
ALTER TABLE room_players DROP CONSTRAINT IF EXISTS room_players_user_id_fkey;
ALTER TABLE room_players 
ADD CONSTRAINT room_players_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update any other tables that reference users
ALTER TABLE room_seats DROP CONSTRAINT IF EXISTS room_seats_user_id_fkey;
ALTER TABLE room_seats 
ADD CONSTRAINT room_seats_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update chips_transactions if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chips_transactions') THEN
    ALTER TABLE chips_transactions DROP CONSTRAINT IF EXISTS chips_transactions_user_id_fkey;
    ALTER TABLE chips_transactions 
    ADD CONSTRAINT chips_transactions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create a function to sync auth.users with our users table (if needed)
CREATE OR REPLACE FUNCTION sync_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update user profile when auth user is created/updated
  INSERT INTO public.user_profiles (
    id,
    username,
    display_name,
    avatar_url,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    display_name = COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    avatar_url = NEW.raw_user_meta_data->>'avatar_url',
    updated_at = NEW.updated_at;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync auth users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_auth_user();

-- Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  location VARCHAR(100),
  website TEXT,
  
  -- Poker-specific fields
  total_games_played INTEGER DEFAULT 0,
  total_winnings BIGINT DEFAULT 0,
  best_hand TEXT,
  favorite_position VARCHAR(20),
  
  -- Preferences
  auto_rebuy BOOLEAN DEFAULT false,
  auto_show_cards BOOLEAN DEFAULT true,
  sound_enabled BOOLEAN DEFAULT true,
  animations_enabled BOOLEAN DEFAULT true,
  
  -- Privacy
  show_online_status BOOLEAN DEFAULT true,
  allow_friend_requests BOOLEAN DEFAULT true,
  show_game_history BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name ON public.user_profiles(display_name);

SELECT 'Migration 010 completed successfully - Auth foreign keys fixed' AS result;
