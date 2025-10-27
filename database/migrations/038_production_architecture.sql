-- ============================================
-- PRODUCTION ARCHITECTURE - DB SOURCE OF TRUTH
-- Adds missing columns for spectators, nicknames, and connection tracking
-- ============================================

-- Add display names (table-specific nicknames)
ALTER TABLE room_seats 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(50);

ALTER TABLE room_spectators
ADD COLUMN IF NOT EXISTS display_name VARCHAR(50);

-- Add connection tracking
ALTER TABLE room_seats
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE room_spectators
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure rejoin_tokens table exists with correct schema
CREATE TABLE IF NOT EXISTS rejoin_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('player', 'spectator', 'host')),
    seat_index INTEGER, -- NULL for spectators/host
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_rejoin_tokens_token_hash ON rejoin_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_rejoin_tokens_expires_at ON rejoin_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_room_seats_last_seen ON room_seats(last_seen_at) WHERE left_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_room_spectators_last_seen ON room_spectators(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_room_seats_room_user ON room_seats(room_id, user_id) WHERE left_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_room_spectators_room_user ON room_spectators(room_id, user_id);

-- Add function to clean up expired tokens (run via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM rejoin_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Add function to mark disconnected users (run via cron)
CREATE OR REPLACE FUNCTION mark_disconnected_users()
RETURNS void AS $$
BEGIN
    -- Mark seats as abandoned after 10 minutes of inactivity
    UPDATE room_seats
    SET left_at = NOW(),
        status = 'ABANDONED'
    WHERE last_seen_at < NOW() - INTERVAL '10 minutes'
      AND left_at IS NULL
      AND status != 'ABANDONED';
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON COLUMN room_seats.display_name IS 'Table-specific nickname (different from username)';
COMMENT ON COLUMN room_spectators.display_name IS 'Spectator display name at this table';
COMMENT ON COLUMN room_seats.last_seen_at IS 'Last heartbeat from client, used for grace period';
COMMENT ON COLUMN room_spectators.last_seen_at IS 'Last heartbeat from spectator';
COMMENT ON TABLE rejoin_tokens IS 'Short-lived tokens for seamless reconnection to room';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify columns exist
DO $$
BEGIN
    ASSERT (SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'room_seats' AND column_name = 'display_name') IS NOT NULL,
           'room_seats.display_name not created';
    ASSERT (SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'room_spectators' AND column_name = 'display_name') IS NOT NULL,
           'room_spectators.display_name not created';
    ASSERT (SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'room_seats' AND column_name = 'last_seen_at') IS NOT NULL,
           'room_seats.last_seen_at not created';
    RAISE NOTICE '✅ Production architecture migration completed successfully';
END $$;

