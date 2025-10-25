-- Migration 036: Fix sessions table name conflict with Supabase auth
-- Supabase uses 'sessions' for auth, we need a different table for express-session

-- Drop columns we added to Supabase's sessions table
ALTER TABLE sessions DROP COLUMN IF EXISTS sid CASCADE;
ALTER TABLE sessions DROP COLUMN IF EXISTS sess CASCADE;

-- Create our own table with a different name
CREATE TABLE IF NOT EXISTS app_sessions (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

-- Index for cleanup of expired sessions
CREATE INDEX IF NOT EXISTS idx_app_session_expire ON app_sessions(expire);

COMMENT ON TABLE app_sessions IS 'Express-session storage (separate from Supabase auth sessions)';

