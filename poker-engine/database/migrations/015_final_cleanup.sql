-- Migration 015: Final cleanup - remove public.users table
-- This migration ensures we only use auth.users + user_profiles

-- First, verify all foreign keys point to auth.users (not public.users)
DO $$ 
DECLARE
    bad_constraint RECORD;
BEGIN
    -- Check if any constraints still reference public.users
    FOR bad_constraint IN
        SELECT 
            tc.table_name,
            tc.constraint_name,
            ccu.table_name AS foreign_table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
        WHERE ccu.table_name = 'users' 
        AND ccu.table_schema = 'public'
        AND tc.constraint_type = 'FOREIGN KEY'
    LOOP
        RAISE WARNING 'Foreign key % on table % still references public.users!', 
            bad_constraint.constraint_name, bad_constraint.table_name;
    END LOOP;
END $$;

-- Drop the old users table (it's no longer needed)
DROP TABLE IF EXISTS public.users CASCADE;

-- Ensure user_profiles has all necessary columns
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS chips BIGINT DEFAULT 1000;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON public.user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_online ON public.user_profiles(is_online);

-- Update user_profiles to ensure all auth.users have profiles
INSERT INTO public.user_profiles (id, username, display_name, created_at, updated_at)
SELECT 
    id,
    COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1)) as username,
    COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1)) as display_name,
    created_at,
    updated_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.user_profiles)
ON CONFLICT (id) DO NOTHING;

-- Create a function to update last_seen timestamp
CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.user_profiles
    SET last_seen = NOW(), is_online = true
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update last_seen when user joins a session
DROP TRIGGER IF EXISTS on_session_created ON auth.sessions;
CREATE TRIGGER on_session_created
    AFTER INSERT ON auth.sessions
    FOR EACH ROW EXECUTE FUNCTION update_user_last_seen();

SELECT 'Migration 015 complete - public.users removed, user_profiles is the single source of truth' AS result;
