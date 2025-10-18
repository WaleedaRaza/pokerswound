-- Migration: Allow guest/anonymous users to join rooms
-- Drop foreign key constraints that require users to exist in auth.users

-- Drop room_players foreign key to auth.users
ALTER TABLE room_players 
DROP CONSTRAINT IF EXISTS room_players_user_id_fkey;

-- Drop room_seats foreign key to auth.users  
ALTER TABLE room_seats
DROP CONSTRAINT IF EXISTS room_seats_user_id_fkey;

-- Drop room_spectators foreign key to auth.users
ALTER TABLE room_spectators
DROP CONSTRAINT IF EXISTS room_spectators_user_id_fkey;

-- Note: user_profiles will still store all users (both auth.users and guests)
-- The id column in user_profiles is just a UUID, no foreign key required

COMMENT ON TABLE room_players IS 'Players in room lobbies - supports both authenticated and guest users';
COMMENT ON TABLE room_seats IS 'Seated players at tables - supports both authenticated and guest users';
COMMENT ON TABLE room_spectators IS 'Spectators watching games - supports both authenticated and guest users';

