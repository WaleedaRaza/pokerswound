-- Authentication System Schema (for regular PostgreSQL)
-- This migration sets up user authentication and session management

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(20) UNIQUE NOT NULL,
  display_name VARCHAR(50),
  avatar_url TEXT,
  bio TEXT,
  location VARCHAR(100),
  website TEXT,
  email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(255),
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Poker-specific fields
  total_games_played INTEGER DEFAULT 0,
  total_winnings BIGINT DEFAULT 0,
  best_hand TEXT,
  favorite_position VARCHAR(20),
  
  -- Preferences
  auto_rebuy BOOLEAN DEFAULT false,
  auto_show_cards BOOLEAN DEFAULT true,
  sound_enabled BOOLEAN DEFAULT true,
  animations_enabled BOOLEAN DEFAULT true,
  
  -- Privacy
  show_online_status BOOLEAN DEFAULT true,
  allow_friend_requests BOOLEAN DEFAULT true,
  show_game_history BOOLEAN DEFAULT true
);

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  game_id TEXT,
  room_id TEXT,
  socket_id TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  is_active BOOLEAN DEFAULT true
);

-- Create user_tokens table for email verification and password reset
CREATE TABLE IF NOT EXISTS public.user_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  token_type VARCHAR(50) NOT NULL, -- 'email_verification', 'password_reset'
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_game_id ON public.user_sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_room_id ON public.user_sessions(room_id);

CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON public.user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_token ON public.user_tokens(token);
CREATE INDEX IF NOT EXISTS idx_user_tokens_type ON public.user_tokens(token_type);
CREATE INDEX IF NOT EXISTS idx_user_tokens_expires ON public.user_tokens(expires_at, used);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  UPDATE public.user_sessions 
  SET is_active = false 
  WHERE expires_at < NOW() AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM public.user_tokens 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to generate secure random token
CREATE OR REPLACE FUNCTION public.generate_secure_token(length INTEGER DEFAULT 32)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Insert some sample users for testing (optional)
-- Password is 'password123' hashed with bcrypt
INSERT INTO public.users (id, email, password_hash, username, display_name, email_verified, created_at, updated_at)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001',
    'test@example.com',
    '$2b$10$rQZ8K9vQZ8K9vQZ8K9vQZ8O.8K9vQZ8K9vQZ8K9vQZ8K9vQZ8K9vQZ8K',
    'testuser',
    'Test User',
    true,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'admin@example.com',
    '$2b$10$rQZ8K9vQZ8K9vQZ8K9vQZ8O.8K9vQZ8K9vQZ8K9vQZ8K9vQZ8K9vQZ8K',
    'admin',
    'Admin User',
    true,
    NOW(),
    NOW()
  )
ON CONFLICT (email) DO NOTHING;

-- Grant necessary permissions (adjust based on your setup)
-- GRANT USAGE ON SCHEMA public TO your_app_user;
-- GRANT ALL ON public.users TO your_app_user;
-- GRANT ALL ON public.user_sessions TO your_app_user;
-- GRANT ALL ON public.user_tokens TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
