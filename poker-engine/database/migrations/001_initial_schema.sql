-- Initial database schema for Poker Engine
-- Migration: 001_initial_schema.sql
-- Description: Core tables for users, authentication, rooms, and basic game state

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================
-- USERS & AUTHENTICATION
-- ================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  avatar_url VARCHAR(500),
  
  -- Chip balance
  total_chips BIGINT DEFAULT 1000 CHECK (total_chips >= 0),
  
  -- Account status
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  role VARCHAR(20) DEFAULT 'player' CHECK (role IN ('player', 'admin', 'moderator', 'suspended')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  email_verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_username CHECK (username ~* '^[a-zA-Z0-9_-]{3,50}$')
);

-- User sessions for device management and refresh tokens
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(255) NOT NULL,
  device_info JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_revoked BOOLEAN DEFAULT false,
  
  -- Indexes
  INDEX idx_user_sessions_user_id (user_id),
  INDEX idx_user_sessions_expires_at (expires_at),
  INDEX idx_user_sessions_token_hash (refresh_token_hash)
);

-- Rejoin tokens for mid-game reconnection
CREATE TABLE IF NOT EXISTS rejoin_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id UUID NOT NULL, -- will reference games table when created
  room_id UUID NOT NULL, -- will reference rooms table
  seat_index INTEGER NOT NULL CHECK (seat_index >= 0 AND seat_index < 10),
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_user_game_rejoin UNIQUE (user_id, game_id),
  
  -- Indexes
  INDEX idx_rejoin_tokens_user_id (user_id),
  INDEX idx_rejoin_tokens_game_id (game_id),
  INDEX idx_rejoin_tokens_expires_at (expires_at)
);

-- ================================
-- ROOMS & TABLES
-- ================================

-- Poker rooms/tables
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Privacy settings
  is_private BOOLEAN DEFAULT false,
  invite_code VARCHAR(10) UNIQUE,
  password_hash VARCHAR(255), -- for password-protected rooms
  
  -- Game configuration
  game_type VARCHAR(20) DEFAULT 'TEXAS_HOLDEM' CHECK (game_type IN ('TEXAS_HOLDEM', 'OMAHA', 'SEVEN_CARD_STUD')),
  small_blind INTEGER NOT NULL CHECK (small_blind > 0),
  big_blind INTEGER NOT NULL CHECK (big_blind > small_blind),
  ante INTEGER DEFAULT 0 CHECK (ante >= 0),
  max_players INTEGER DEFAULT 6 CHECK (max_players >= 2 AND max_players <= 10),
  min_players INTEGER DEFAULT 2 CHECK (min_players >= 2),
  
  -- Buy-in limits
  min_buy_in INTEGER NOT NULL CHECK (min_buy_in > 0),
  max_buy_in INTEGER NOT NULL CHECK (max_buy_in >= min_buy_in),
  
  -- Room settings
  turn_time_limit INTEGER DEFAULT 30 CHECK (turn_time_limit > 0), -- seconds
  timebank_seconds INTEGER DEFAULT 60 CHECK (timebank_seconds >= 0),
  auto_muck_losing_hands BOOLEAN DEFAULT true,
  allow_rabbit_hunting BOOLEAN DEFAULT false,
  allow_spectators BOOLEAN DEFAULT true,
  
  -- Room state
  status VARCHAR(20) DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'ACTIVE', 'PAUSED', 'CLOSED')),
  current_game_id UUID, -- reference to active game
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes
  INDEX idx_rooms_status (status),
  INDEX idx_rooms_game_type (game_type),
  INDEX idx_rooms_stakes (small_blind, big_blind),
  INDEX idx_rooms_created_at (created_at DESC)
);

-- Room memberships and seat assignments
CREATE TABLE IF NOT EXISTS room_seats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seat_index INTEGER NOT NULL CHECK (seat_index >= 0 AND seat_index < 10),
  
  -- Player status
  status VARCHAR(20) DEFAULT 'SEATED' CHECK (status IN ('SEATED', 'PLAYING', 'SITTING_OUT', 'WAITLIST')),
  chips_in_play BIGINT DEFAULT 0 CHECK (chips_in_play >= 0), -- current table stake
  
  -- Timestamps
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_action_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT unique_room_seat UNIQUE (room_id, seat_index),
  CONSTRAINT unique_user_room UNIQUE (room_id, user_id), -- one seat per user per room
  
  -- Indexes
  INDEX idx_room_seats_room_id (room_id),
  INDEX idx_room_seats_user_id (user_id),
  INDEX idx_room_seats_status (status)
);

-- Spectators (non-playing observers)
CREATE TABLE IF NOT EXISTS room_spectators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT unique_spectator_room UNIQUE (room_id, user_id),
  
  -- Indexes
  INDEX idx_room_spectators_room_id (room_id),
  INDEX idx_room_spectators_user_id (user_id)
);

-- ================================
-- CHIPS & ECONOMY
-- ================================

-- Immutable transaction log for all chip movements
CREATE TABLE IF NOT EXISTS chips_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT, -- never delete users with transactions
  
  -- Transaction details
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN (
    'BUY_IN', 'REBUY', 'CASHOUT', 'WIN', 'LOSS', 'BLIND', 'ANTE', 
    'ADMIN_ADJUST', 'BONUS', 'RAKEBACK', 'TOURNAMENT_ENTRY', 'TOURNAMENT_PRIZE'
  )),
  amount BIGINT NOT NULL, -- positive = credit, negative = debit
  balance_before BIGINT NOT NULL CHECK (balance_before >= 0),
  balance_after BIGINT NOT NULL CHECK (balance_after >= 0),
  
  -- Context references
  room_id UUID REFERENCES rooms(id),
  game_id UUID, -- references games table when implemented
  hand_id UUID, -- references hands table when implemented
  
  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Audit trail
  created_by UUID REFERENCES users(id), -- for admin adjustments
  ip_address INET,
  user_agent TEXT,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_chips_transactions_user_id (user_id),
  INDEX idx_chips_transactions_type (transaction_type),
  INDEX idx_chips_transactions_processed_at (processed_at DESC),
  INDEX idx_chips_transactions_room_id (room_id),
  INDEX idx_chips_transactions_game_id (game_id)
);

-- Table stakes tracking (chips currently in play)
CREATE TABLE IF NOT EXISTS table_stakes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL CHECK (amount >= 0),
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unlocked_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT unique_user_room_stakes UNIQUE (user_id, room_id),
  
  -- Indexes
  INDEX idx_table_stakes_user_id (user_id),
  INDEX idx_table_stakes_room_id (room_id)
);

-- Pending transactions (for async processing)
CREATE TABLE IF NOT EXISTS chips_pending (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL,
  amount BIGINT NOT NULL,
  room_id UUID REFERENCES rooms(id),
  
  -- Processing status
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Timing
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes
  INDEX idx_chips_pending_user_id (user_id),
  INDEX idx_chips_pending_status (status),
  INDEX idx_chips_pending_expires_at (expires_at)
);

-- ================================
-- AUDIT & SECURITY
-- ================================

-- Audit log for security and admin actions
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id), -- null for system actions
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  
  -- Details
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  
  -- Results
  success BOOLEAN NOT NULL,
  error_message TEXT,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_audit_log_user_id (user_id),
  INDEX idx_audit_log_action (action),
  INDEX idx_audit_log_created_at (created_at DESC),
  INDEX idx_audit_log_resource (resource_type, resource_id)
);

-- ================================
-- FUNCTIONS & TRIGGERS
-- ================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to validate chip balance integrity
CREATE OR REPLACE FUNCTION validate_chip_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure balance_after = balance_before + amount
  IF NEW.balance_after != (NEW.balance_before + NEW.amount) THEN
    RAISE EXCEPTION 'Invalid chip transaction: balance_after (%) != balance_before (%) + amount (%)', 
      NEW.balance_after, NEW.balance_before, NEW.amount;
  END IF;
  
  -- Ensure balance never goes negative
  IF NEW.balance_after < 0 THEN
    RAISE EXCEPTION 'Invalid chip transaction: balance cannot be negative (%))', NEW.balance_after;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for chip balance validation
CREATE TRIGGER validate_chips_transactions_balance 
  BEFORE INSERT ON chips_transactions 
  FOR EACH ROW EXECUTE FUNCTION validate_chip_balance();

-- ================================
-- INITIAL DATA
-- ================================

-- Create default admin user (change password immediately!)
INSERT INTO users (email, username, password_hash, display_name, role, total_chips, is_verified)
VALUES (
  'admin@poker.local',
  'admin',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewngHTNk.5gZLWhy', -- password: 'admin123' - CHANGE THIS!
  'Administrator',
  'admin',
  10000000, -- 10M chips for admin
  true
) ON CONFLICT (email) DO NOTHING;

-- Create a test room for development
INSERT INTO rooms (name, description, owner_id, small_blind, big_blind, min_buy_in, max_buy_in, is_private)
SELECT 
  'Test Table $10/$20',
  'Development test table with $10/$20 blinds',
  id,
  10,
  20,
  200,  -- min buy-in: 10 big blinds
  2000, -- max buy-in: 100 big blinds
  false
FROM users WHERE username = 'admin'
ON CONFLICT DO NOTHING;

-- ================================
-- INDEXES FOR PERFORMANCE
-- ================================

-- Additional composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_active_email ON users (email) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_rooms_public_active ON rooms (created_at DESC) WHERE is_private = false AND status = 'WAITING';
CREATE INDEX IF NOT EXISTS idx_room_seats_active ON room_seats (room_id, seat_index) WHERE left_at IS NULL;

-- ================================
-- COMMENTS
-- ================================

COMMENT ON TABLE users IS 'User accounts and authentication';
COMMENT ON TABLE user_sessions IS 'Active user sessions and refresh tokens';
COMMENT ON TABLE rejoin_tokens IS 'One-time tokens for rejoining games after disconnect';
COMMENT ON TABLE rooms IS 'Poker tables/rooms configuration';
COMMENT ON TABLE room_seats IS 'Player seat assignments in rooms';
COMMENT ON TABLE room_spectators IS 'Non-playing observers in rooms';
COMMENT ON TABLE chips_transactions IS 'Immutable ledger of all chip movements';
COMMENT ON TABLE table_stakes IS 'Chips currently locked in play at tables';
COMMENT ON TABLE chips_pending IS 'Async chip transactions awaiting processing';
COMMENT ON TABLE audit_log IS 'Security and administrative action audit trail';

-- Migration complete
SELECT 'Migration 001_initial_schema.sql completed successfully' as status;
