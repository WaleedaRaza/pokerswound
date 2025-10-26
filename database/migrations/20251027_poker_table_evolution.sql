-- POKER TABLE EVOLUTION MIGRATION
-- Day 1: Database Foundation
-- This migration is NON-BREAKING - only adds new columns/tables

BEGIN;

-- ============================================
-- ENHANCE EXISTING TABLES (Non-breaking additions)
-- ============================================

-- 1. Enhance rooms table with game configuration
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS turn_time_seconds INT DEFAULT 30;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS timebank_seconds INT DEFAULT 60;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS auto_start_next_hand BOOLEAN DEFAULT false;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS allow_spectators BOOLEAN DEFAULT true;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS show_folded_cards BOOLEAN DEFAULT false;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS table_version VARCHAR(10) DEFAULT '1.0.0';

-- 2. Enhance game_states table with sequence numbers
ALTER TABLE game_states ADD COLUMN IF NOT EXISTS seq BIGINT DEFAULT 0;
-- Version column already exists as INTEGER, skip adding it
-- ALTER TABLE game_states ADD COLUMN IF NOT EXISTS version VARCHAR(10) DEFAULT '1.0.0';
ALTER TABLE game_states ADD COLUMN IF NOT EXISTS actor_turn_started_at BIGINT;
ALTER TABLE game_states ADD COLUMN IF NOT EXISTS actor_timebank_remaining INT DEFAULT 60;
ALTER TABLE game_states ADD COLUMN IF NOT EXISTS shuffle_seed VARCHAR(64);
ALTER TABLE game_states ADD COLUMN IF NOT EXISTS pause_accumulated_ms INT DEFAULT 0;

-- 3. Enhance room_seats with player status
ALTER TABLE room_seats ADD COLUMN IF NOT EXISTS player_status VARCHAR(20) DEFAULT 'ACTIVE';
ALTER TABLE room_seats ADD COLUMN IF NOT EXISTS missed_turns INT DEFAULT 0;
ALTER TABLE room_seats ADD COLUMN IF NOT EXISTS last_action_at TIMESTAMP DEFAULT NOW();

-- Create index for active seats lookup
CREATE INDEX IF NOT EXISTS idx_room_seats_active 
ON room_seats(room_id, status) 
WHERE status IN ('SEATED', 'PLAYING');

-- ============================================
-- NEW TABLES FOR PRODUCTION FEATURES
-- ============================================

-- 4. Processed actions for idempotency
CREATE TABLE IF NOT EXISTS processed_actions (
  idempotency_key VARCHAR(64) PRIMARY KEY,
  room_id UUID NOT NULL,
  user_id UUID NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '1 hour'
);

CREATE INDEX IF NOT EXISTS idx_processed_actions_expires 
ON processed_actions(expires_at);

-- Cleanup job for expired entries
CREATE INDEX IF NOT EXISTS idx_processed_actions_user_room 
ON processed_actions(user_id, room_id, created_at DESC);

-- 5. Game audit log for observability (renamed to avoid conflict)
CREATE TABLE IF NOT EXISTS game_audit_log (
  id BIGSERIAL PRIMARY KEY,
  trace_id VARCHAR(64) NOT NULL,
  room_id UUID NOT NULL,
  game_id UUID,
  hand_id UUID,
  user_id UUID NOT NULL,
  seq BIGINT,
  action VARCHAR(100) NOT NULL,
  payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_game_audit_trace ON game_audit_log(trace_id);
CREATE INDEX IF NOT EXISTS idx_game_audit_room_time ON game_audit_log(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_audit_user_time ON game_audit_log(user_id, created_at DESC);

-- Partition by month for scalability (optional, can add later)
-- ALTER TABLE audit_log PARTITION BY RANGE (created_at);

-- 6. Rate limiting tracking
CREATE TABLE IF NOT EXISTS rate_limits (
  user_id UUID NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  window_start TIMESTAMP NOT NULL,
  count INT DEFAULT 1,
  PRIMARY KEY (user_id, action_type, window_start)
);

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limits_window 
ON rate_limits(window_start);

-- 7. Room join requests (mid-game)
CREATE TABLE IF NOT EXISTS room_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id),
  requested_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending',
  approved_by UUID REFERENCES user_profiles(id),
  processed_at TIMESTAMP,
  spectator_until_hand INT,
  CONSTRAINT unique_pending_request UNIQUE(room_id, user_id, status)
);

CREATE INDEX IF NOT EXISTS idx_join_requests_room_status 
ON room_join_requests(room_id, status)
WHERE status = 'pending';

-- 8. Card reveals tracking
CREATE TABLE IF NOT EXISTS card_reveals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hand_id UUID REFERENCES hands(id) ON DELETE CASCADE,
  player_id UUID REFERENCES user_profiles(id),
  cards VARCHAR(10)[],
  revealed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_card_reveals_hand 
ON card_reveals(hand_id);

-- 9. Shuffle audit for provably fair RNG
CREATE TABLE IF NOT EXISTS shuffle_audit (
  hand_id UUID PRIMARY KEY REFERENCES hands(id) ON DELETE CASCADE,
  commitment_hash VARCHAR(64) NOT NULL,
  server_secret_hash VARCHAR(64) NOT NULL,
  client_entropy JSONB,
  shuffle_seed VARCHAR(64),
  deck_hash VARCHAR(64),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 10. Protocol versions for backward compatibility
CREATE TABLE IF NOT EXISTS protocol_versions (
  version VARCHAR(10) PRIMARY KEY,
  supported BOOLEAN DEFAULT true,
  deprecated_at TIMESTAMP,
  min_client_version VARCHAR(10),
  schemas JSONB NOT NULL
);

-- Insert initial protocol version
INSERT INTO protocol_versions (version, schemas) 
VALUES ('1.0.0', '{
  "table_update": {
    "type": "object",
    "properties": {
      "pot": {"type": "number"},
      "street": {"type": "string"},
      "communityCards": {"type": "array"},
      "seats": {"type": "array"}
    }
  }
}'::jsonb)
ON CONFLICT (version) DO NOTHING;

-- 11. Rejoin tokens enhancement
ALTER TABLE rejoin_tokens ADD COLUMN IF NOT EXISTS seat_index INT;
ALTER TABLE rejoin_tokens ADD COLUMN IF NOT EXISTS game_state_seq BIGINT;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to increment sequence number atomically
CREATE OR REPLACE FUNCTION increment_game_seq(p_room_id UUID)
RETURNS BIGINT AS $$
DECLARE
  new_seq BIGINT;
BEGIN
  UPDATE game_states 
  SET seq = seq + 1
  WHERE room_id = p_room_id
  RETURNING seq INTO new_seq;
  
  RETURN new_seq;
END;
$$ LANGUAGE plpgsql;

-- Function to clean expired data
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
BEGIN
  -- Clean expired idempotency keys
  DELETE FROM processed_actions 
  WHERE expires_at < NOW();
  
  -- Clean old rate limit entries
  DELETE FROM rate_limits 
  WHERE window_start < NOW() - INTERVAL '1 hour';
  
  -- Clean expired rejoin tokens
  DELETE FROM rejoin_tokens 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INITIAL DATA & CHECKS
-- ============================================

-- Ensure all active rooms have initial sequence numbers
UPDATE game_states gs
SET seq = 1
WHERE seq = 0 OR seq IS NULL;

-- Version column is INTEGER type, set to numeric value
UPDATE game_states
SET version = 1
WHERE version IS NULL OR version = 0;

-- ============================================
-- VERIFICATION QUERIES (Commented out to debug)
-- ============================================

-- Will verify manually after migration completes
-- DO $$
-- ... verification code ...
-- END $$;

COMMIT;

-- ============================================
-- ROLLBACK SCRIPT (Save separately)
-- ============================================
/*
-- To rollback this migration:

BEGIN;

-- Remove new columns
ALTER TABLE rooms DROP COLUMN IF EXISTS turn_time_seconds CASCADE;
ALTER TABLE rooms DROP COLUMN IF EXISTS timebank_seconds CASCADE;
ALTER TABLE rooms DROP COLUMN IF EXISTS auto_start_next_hand CASCADE;
ALTER TABLE rooms DROP COLUMN IF EXISTS allow_spectators CASCADE;
ALTER TABLE rooms DROP COLUMN IF EXISTS show_folded_cards CASCADE;
ALTER TABLE rooms DROP COLUMN IF EXISTS is_paused CASCADE;
ALTER TABLE rooms DROP COLUMN IF EXISTS paused_at CASCADE;
ALTER TABLE rooms DROP COLUMN IF EXISTS table_version CASCADE;

ALTER TABLE game_states DROP COLUMN IF EXISTS seq CASCADE;
ALTER TABLE game_states DROP COLUMN IF EXISTS version CASCADE;
ALTER TABLE game_states DROP COLUMN IF EXISTS actor_turn_started_at CASCADE;
ALTER TABLE game_states DROP COLUMN IF EXISTS actor_timebank_remaining CASCADE;
ALTER TABLE game_states DROP COLUMN IF EXISTS shuffle_seed CASCADE;
ALTER TABLE game_states DROP COLUMN IF EXISTS pause_accumulated_ms CASCADE;

ALTER TABLE room_seats DROP COLUMN IF EXISTS player_status CASCADE;
ALTER TABLE room_seats DROP COLUMN IF EXISTS missed_turns CASCADE;
ALTER TABLE room_seats DROP COLUMN IF EXISTS last_action_at CASCADE;

ALTER TABLE rejoin_tokens DROP COLUMN IF EXISTS seat_index CASCADE;
ALTER TABLE rejoin_tokens DROP COLUMN IF EXISTS game_state_seq CASCADE;

-- Remove new tables
DROP TABLE IF EXISTS processed_actions CASCADE;
DROP TABLE IF EXISTS game_audit_log CASCADE;
DROP TABLE IF EXISTS rate_limits CASCADE;
DROP TABLE IF EXISTS room_join_requests CASCADE;
DROP TABLE IF EXISTS card_reveals CASCADE;
DROP TABLE IF EXISTS shuffle_audit CASCADE;
DROP TABLE IF EXISTS protocol_versions CASCADE;

-- Remove functions
DROP FUNCTION IF EXISTS increment_game_seq(UUID) CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_data() CASCADE;

COMMIT;
*/
