-- Phase 0: Critical Robustness Fixes
-- Migration to support transaction management and concurrency control

-- 1. Add better indexing for concurrency
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_version ON games(id, version);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_players_game_active ON players(game_id, active) WHERE active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_actions_sequence ON game_actions(hand_id, seq);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hands_game_street ON hands(game_id, current_street);

-- 2. Add constraints for data integrity
ALTER TABLE game_actions ADD CONSTRAINT IF NOT EXISTS check_valid_action 
  CHECK (action IN ('FOLD','CHECK','CALL','BET','RAISE','ALL_IN','SMALL_BLIND','BIG_BLIND','ANTE'));

ALTER TABLE players ADD CONSTRAINT IF NOT EXISTS check_valid_stack CHECK (stack >= 0);
ALTER TABLE players ADD CONSTRAINT IF NOT EXISTS check_valid_bet CHECK (current_bet >= 0);

-- 3. Add distributed locks table for concurrency control
CREATE TABLE IF NOT EXISTS distributed_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lock_name TEXT NOT NULL,
  lock_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(lock_name)
);

CREATE INDEX IF NOT EXISTS idx_distributed_locks_name ON distributed_locks(lock_name);
CREATE INDEX IF NOT EXISTS idx_distributed_locks_expires ON distributed_locks(expires_at);

-- 4. Add stored procedures for transaction support
CREATE OR REPLACE FUNCTION begin_transaction()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This is a placeholder for begin transaction
  -- In Supabase, transactions are handled at the client level
  -- But this function can be used for custom transaction logic
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION commit_transaction()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This is a placeholder for commit transaction
  -- In Supabase, transactions are handled at the client level
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION rollback_transaction()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This is a placeholder for rollback transaction
  -- In Supabase, transactions are handled at the client level
  RETURN;
END;
$$;

-- 5. Add function to cleanup expired locks
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM distributed_locks 
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 6. Add function for atomic game state updates
CREATE OR REPLACE FUNCTION update_game_state_atomic(
  p_game_id UUID,
  p_expected_version INTEGER,
  p_updates JSONB
)
RETURNS TABLE(success BOOLEAN, new_version INTEGER, error_msg TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_version INTEGER;
  new_version INTEGER;
BEGIN
  -- Lock the game row for update
  SELECT version INTO current_version
  FROM games 
  WHERE id = p_game_id
  FOR UPDATE;
  
  -- Check if game exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'Game not found';
    RETURN;
  END IF;
  
  -- Check version conflict
  IF current_version != p_expected_version THEN
    RETURN QUERY SELECT false, current_version, 'Version conflict';
    RETURN;
  END IF;
  
  -- Calculate new version
  new_version := current_version + 1;
  
  -- Update the game with new data and version
  UPDATE games 
  SET 
    current_state = COALESCE((p_updates->>'current_state')::JSONB, current_state),
    status = COALESCE(p_updates->>'status', status),
    total_pot = COALESCE((p_updates->>'total_pot')::DECIMAL, total_pot),
    version = new_version,
    updated_at = now()
  WHERE id = p_game_id;
  
  RETURN QUERY SELECT true, new_version, NULL::TEXT;
END;
$$;

-- 7. Add function for atomic player state updates
CREATE OR REPLACE FUNCTION update_player_state_atomic(
  p_player_id UUID,
  p_stack_delta DECIMAL DEFAULT NULL,
  p_current_bet DECIMAL DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_hole_cards JSONB DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, new_stack DECIMAL, error_msg TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_stack DECIMAL;
  new_stack DECIMAL;
BEGIN
  -- Lock the player row for update
  SELECT stack INTO current_stack
  FROM players 
  WHERE id = p_player_id
  FOR UPDATE;
  
  -- Check if player exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::DECIMAL, 'Player not found';
    RETURN;
  END IF;
  
  -- Calculate new stack if delta provided
  IF p_stack_delta IS NOT NULL THEN
    new_stack := current_stack + p_stack_delta;
    
    -- Validate new stack is not negative
    IF new_stack < 0 THEN
      RETURN QUERY SELECT false, current_stack, 'Stack cannot be negative';
      RETURN;
    END IF;
  ELSE
    new_stack := current_stack;
  END IF;
  
  -- Update the player
  UPDATE players 
  SET 
    stack = COALESCE(new_stack, stack),
    current_bet = COALESCE(p_current_bet, current_bet),
    status = COALESCE(p_status, status),
    hole_cards = COALESCE(p_hole_cards, hole_cards),
    updated_at = now()
  WHERE id = p_player_id;
  
  RETURN QUERY SELECT true, new_stack, NULL::TEXT;
END;
$$;

-- 8. Add RLS policies for distributed locks
ALTER TABLE distributed_locks ENABLE ROW LEVEL SECURITY;

-- Only service role can manage distributed locks
DROP POLICY IF EXISTS distributed_locks_service_only ON distributed_locks;
CREATE POLICY distributed_locks_service_only ON distributed_locks
  FOR ALL USING (false); -- Only service role bypasses RLS

-- 9. Add performance monitoring table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value DECIMAL NOT NULL,
  metric_type TEXT NOT NULL DEFAULT 'gauge', -- 'gauge', 'counter', 'histogram'
  tags JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(metric_name, created_at);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created ON performance_metrics(created_at);

-- 10. Add error tracking table
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  context JSONB DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  severity TEXT NOT NULL DEFAULT 'error', -- 'debug', 'info', 'warn', 'error', 'fatal'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type, created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity, created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_game ON error_logs(game_id) WHERE game_id IS NOT NULL;

-- Enable RLS for new tables
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Policies for performance metrics (service role only)
DROP POLICY IF EXISTS performance_metrics_service_only ON performance_metrics;
CREATE POLICY performance_metrics_service_only ON performance_metrics
  FOR ALL USING (false);

-- Policies for error logs (service role only)
DROP POLICY IF EXISTS error_logs_service_only ON error_logs;
CREATE POLICY error_logs_service_only ON error_logs
  FOR ALL USING (false);

-- 11. Add cleanup job for old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_cleaned integer := 0;
  cleaned_count integer;
BEGIN
  -- Clean up expired locks
  SELECT cleanup_expired_locks() INTO cleaned_count;
  total_cleaned := total_cleaned + cleaned_count;
  
  -- Clean up old performance metrics (keep 7 days)
  DELETE FROM performance_metrics 
  WHERE created_at < now() - interval '7 days';
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  total_cleaned := total_cleaned + cleaned_count;
  
  -- Clean up old error logs (keep 30 days)
  DELETE FROM error_logs 
  WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  total_cleaned := total_cleaned + cleaned_count;
  
  RETURN total_cleaned;
END;
$$;

-- Note: The cleanup function should be called periodically by a cron job or similar
-- This can be done via pg_cron extension or external scheduling
