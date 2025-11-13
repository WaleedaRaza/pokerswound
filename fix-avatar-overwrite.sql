-- QUICK FIX: Stop trigger from overwriting custom avatars
-- Run this directly in your database (Supabase SQL editor, psql, or pgAdmin)
--
-- Schema Context:
-- - Table: public.user_profiles (id, username, display_name, avatar_url, ...)
-- - Trigger: on_auth_user_created on auth.users
-- - Function: sync_auth_user() syncs auth.users -> user_profiles
--
-- The problem: Every time you log in, Supabase's trigger overwrites your custom avatar
-- with Google's profile picture from raw_user_meta_data->>'avatar_url'
--
-- The fix: Preserve existing avatar_url, only set from Supabase on new users

CREATE OR REPLACE FUNCTION sync_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  generated_username VARCHAR(50);
  final_username VARCHAR(50);
  username_suffix INTEGER := 0;
BEGIN
  -- Generate username: prefer metadata, fallback to email prefix
  generated_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  
  -- ✅ On INSERT: Generate unique username if conflict exists
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = NEW.id) THEN
    -- New user: Generate unique username
    final_username := generated_username;
    
    -- If username exists, append suffix until unique
    WHILE EXISTS (SELECT 1 FROM public.user_profiles WHERE username = final_username) LOOP
      username_suffix := username_suffix + 1;
      final_username := generated_username || username_suffix::TEXT;
      
      -- Safety: prevent infinite loop
      IF username_suffix > 9999 THEN
        final_username := 'user_' || SUBSTRING(NEW.id::TEXT, 1, 8);
        EXIT;
      END IF;
    END LOOP;
    
    -- Insert new user profile
    INSERT INTO public.user_profiles (
      id,
      username,
      display_name,
      avatar_url,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      final_username,
      COALESCE(NEW.raw_user_meta_data->>'display_name', final_username),
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.created_at,
      NEW.updated_at
    );
  ELSE
    -- Existing user: UPDATE - preserve username and avatar_url
    UPDATE public.user_profiles SET
      -- ✅ CRITICAL: Don't update username (preserve user's custom username)
      display_name = COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        user_profiles.display_name
      ),
      -- ✅ CRITICAL: Preserve existing avatar_url (don't overwrite custom avatars)
      avatar_url = COALESCE(
        user_profiles.avatar_url,
        NEW.raw_user_meta_data->>'avatar_url'
      ),
      updated_at = NEW.updated_at
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the fix
SELECT 'Avatar trigger fixed! Custom avatars will now persist.' AS result;

