-- Migration 013: Fix ALL foreign key constraints to point to auth.users
-- This migration updates every foreign key to use auth.users instead of public.users

-- First, let's see what we're dealing with
DO $$ 
DECLARE
    constraint_record RECORD;
BEGIN
    -- Get all foreign key constraints that reference public.users
    FOR constraint_record IN 
        SELECT 
            tc.table_name,
            tc.constraint_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_schema = 'public'
            AND ccu.table_name = 'users'
    LOOP
        RAISE NOTICE 'Found constraint: %.% -> %.%', 
            constraint_record.table_name, 
            constraint_record.column_name,
            constraint_record.foreign_table_name,
            constraint_record.foreign_column_name;
    END LOOP;
END $$;

-- Drop ALL foreign key constraints that reference public.users
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

-- Now recreate them to point to auth.users
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

-- Update existing rooms to have proper host_user_id
UPDATE public.rooms 
SET host_user_id = (SELECT id FROM auth.users LIMIT 1)
WHERE host_user_id IS NULL 
AND EXISTS (SELECT 1 FROM auth.users);

-- Also update owner_id to match
UPDATE public.rooms 
SET owner_id = host_user_id
WHERE owner_id IS NULL 
AND host_user_id IS NOT NULL;

-- Clean up any orphaned data
DELETE FROM public.room_players 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM public.room_seats 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM public.room_spectators 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM auth.users);

-- Update any other tables that might have orphaned user references
DELETE FROM public.actions 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM public.audit_log 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM public.chips_pending 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM public.chips_transactions 
WHERE created_by IS NOT NULL 
AND created_by NOT IN (SELECT id FROM auth.users);

DELETE FROM public.players 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM public.rejoin_tokens 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM public.table_stakes 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM public.user_sessions 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM auth.users);

-- Now we can safely drop the old public.users table since everything points to auth.users
-- But first, let's check if it has any data we need to preserve
DO $$ 
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM public.users;
    IF user_count > 0 THEN
        RAISE NOTICE 'public.users has % rows - these will be lost!', user_count;
        RAISE NOTICE 'Make sure all users are in auth.users before proceeding';
    ELSE
        RAISE NOTICE 'public.users is empty - safe to drop';
    END IF;
END $$;

-- Drop the old public.users table (commented out for safety - uncomment when ready)
-- DROP TABLE IF EXISTS public.users CASCADE;

SELECT 'Migration 013 completed - All foreign keys now point to auth.users' AS result;
