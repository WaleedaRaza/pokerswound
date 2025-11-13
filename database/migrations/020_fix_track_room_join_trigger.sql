-- Migration 020: Fix track_room_join trigger to ensure user_profiles exists
-- Problem: track_room_join() tries to insert into room_participations with user_id
--          that doesn't exist in user_profiles (guest users, race conditions)
-- Solution: Ensure user exists in user_profiles before inserting into room_participations
-- 
-- Schema Context:
-- - room_participations.user_id references user_profiles(id)
-- - Guest users might exist in auth.users but not user_profiles
-- - Need to create minimal profile entry if missing

CREATE OR REPLACE FUNCTION track_room_join()
RETURNS TRIGGER AS $$
DECLARE
  user_exists BOOLEAN;
  guest_username VARCHAR(50);
BEGIN
  -- ✅ CRITICAL FIX: Ensure user exists in user_profiles before proceeding
  -- Check if user profile exists
  SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE id = NEW.user_id) INTO user_exists;
  
  -- If user doesn't exist, create minimal profile entry (only if user exists in auth.users)
  IF NOT user_exists THEN
    -- Generate guest username from user_id (for guests/anonymous users)
    guest_username := 'guest_' || SUBSTRING(NEW.user_id::TEXT, 1, 8);
    
    -- Ensure username is unique
    WHILE EXISTS(SELECT 1 FROM public.user_profiles WHERE username = guest_username) LOOP
      guest_username := 'guest_' || SUBSTRING(NEW.user_id::TEXT, 1, 8) || '_' || FLOOR(RANDOM() * 1000)::TEXT;
    END LOOP;
    
    -- Only create profile if user exists in auth.users (required by FK constraint)
    INSERT INTO public.user_profiles (
      id,
      username,
      display_name,
      created_at,
      updated_at
    )
    SELECT 
      NEW.user_id,
      COALESCE(
        raw_user_meta_data->>'username',
        split_part(email, '@', 1),
        guest_username
      ),
      COALESCE(
        raw_user_meta_data->>'display_name',
        split_part(email, '@', 1),
        guest_username
      ),
      COALESCE(created_at, NOW()),
      NOW()
    FROM auth.users
    WHERE id = NEW.user_id
    ON CONFLICT (id) DO NOTHING;
    
    -- If user doesn't exist in auth.users, we can't create profile (FK constraint)
    -- This shouldn't happen if room_seats is properly constrained, but handle gracefully
    IF NOT FOUND THEN
      RAISE WARNING 'User % does not exist in auth.users, cannot create profile', NEW.user_id;
      -- Skip room_participations insert - user must exist in auth.users first
      RETURN NEW;
    END IF;
  END IF;
  
  -- Now safe to update user profile with current room
  UPDATE public.user_profiles
  SET 
    currently_in_room_id = NEW.room_id,
    total_rooms_joined = total_rooms_joined + 1,
    last_active_at = NOW(),
    updated_at = NOW()
  WHERE id = NEW.user_id;
  
  -- Record or update participation (now safe - user exists)
  INSERT INTO public.room_participations (user_id, room_id, joined_at)
  VALUES (NEW.user_id, NEW.room_id, NOW())
  ON CONFLICT (user_id, room_id) 
  DO UPDATE SET 
    joined_at = NOW(), 
    left_at = NULL,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify trigger exists and is attached
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'user_joins_room' 
    AND tgrelid = 'public.room_seats'::regclass
  ) THEN
    CREATE TRIGGER user_joins_room
    AFTER INSERT ON public.room_seats
    FOR EACH ROW
    EXECUTE FUNCTION track_room_join();
  END IF;
END $$;

SELECT 'Migration 020 completed successfully - track_room_join trigger fixed to ensure user_profiles exists' AS result;

