-- Quick fix: Make everything work with auth.users
-- This is a simple, direct approach to get rooms working

-- 1. First, let's clean up the mess - drop ALL foreign key constraints
ALTER TABLE public.actions DROP CONSTRAINT IF EXISTS actions_user_id_fkey;
ALTER TABLE public.audit_log DROP CONSTRAINT IF EXISTS audit_log_user_id_fkey;
ALTER TABLE public.chips_pending DROP CONSTRAINT IF EXISTS chips_pending_user_id_fkey;
ALTER TABLE public.chips_transactions DROP CONSTRAINT IF EXISTS chips_transactions_created_by_fkey;
ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_user_id_fkey;
ALTER TABLE public.rejoin_tokens DROP CONSTRAINT IF EXISTS rejoin_tokens_user_id_fkey;
ALTER TABLE public.room_players DROP CONSTRAINT IF EXISTS room_players_approved_by_fkey;
ALTER TABLE public.room_spectators DROP CONSTRAINT IF EXISTS room_spectators_user_id_fkey;
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_owner_id_fkey;
ALTER TABLE public.table_stakes DROP CONSTRAINT IF EXISTS table_stakes_user_id_fkey;
ALTER TABLE public.user_sessions DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey;

-- 2. Clean up orphaned data
DELETE FROM public.room_players WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.room_seats WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.room_spectators WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.actions WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.audit_log WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.chips_pending WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.chips_transactions WHERE created_by NOT IN (SELECT id FROM auth.users);
DELETE FROM public.players WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.rejoin_tokens WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.table_stakes WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.user_sessions WHERE user_id NOT IN (SELECT id FROM auth.users);

-- 3. Update rooms to have proper host_user_id
UPDATE public.rooms 
SET host_user_id = (SELECT id FROM auth.users LIMIT 1),
    owner_id = (SELECT id FROM auth.users LIMIT 1)
WHERE host_user_id IS NULL;

-- 4. Recreate foreign keys pointing to auth.users
ALTER TABLE public.actions 
ADD CONSTRAINT actions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.audit_log 
ADD CONSTRAINT audit_log_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.chips_pending 
ADD CONSTRAINT chips_pending_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.chips_transactions 
ADD CONSTRAINT chips_transactions_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.players 
ADD CONSTRAINT players_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.rejoin_tokens 
ADD CONSTRAINT rejoin_tokens_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.room_players 
ADD CONSTRAINT room_players_approved_by_fkey 
FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.room_spectators 
ADD CONSTRAINT room_spectators_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.rooms 
ADD CONSTRAINT rooms_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.table_stakes 
ADD CONSTRAINT table_stakes_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_sessions 
ADD CONSTRAINT user_sessions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. Make sure host_user_id also points to auth.users
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_host_user_id_fkey;
ALTER TABLE public.rooms 
ADD CONSTRAINT rooms_host_user_id_fkey 
FOREIGN KEY (host_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 6. Make sure room_players.user_id points to auth.users
ALTER TABLE public.room_players DROP CONSTRAINT IF EXISTS room_players_user_id_fkey;
ALTER TABLE public.room_players 
ADD CONSTRAINT room_players_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 7. Make sure room_seats.user_id points to auth.users
ALTER TABLE public.room_seats DROP CONSTRAINT IF EXISTS room_seats_user_id_fkey;
ALTER TABLE public.room_seats 
ADD CONSTRAINT room_seats_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

SELECT 'Auth fix complete - all foreign keys now point to auth.users' AS result;
