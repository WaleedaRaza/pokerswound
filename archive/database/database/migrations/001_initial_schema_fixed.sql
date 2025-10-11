-- Initial database schema for Poker Engine
-- Migration: 001_initial_schema.sql (Fixed)
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
  is_revoked BOOLEAN DEFAULT false
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
  CONSTRAINT unique_user_game_rejoin UNIQUE (user_id, game_id)
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
  
  -- Table limits
  min_players INTEGER DEFAULT 2 CHECK (min_players >= 2 AND min_players <= 10),
  max_players INTEGER DEFAULT 9 CHECK (max_players >= min_players AND max_players <= 10),
  min_buyin INTEGER CHECK (min_buyin > 0),
  max_buyin INTEGER CHECK (max_buyin >= min_buyin),
  
  -- Status and timing
  status VARCHAR(20) DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'ACTIVE', 'PAUSED', 'CLOSED')),
  auto_start BOOLEAN DEFAULT true,
  hand_timeout_seconds INTEGER DEFAULT 30 CHECK (hand_timeout_seconds > 0),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_room_name CHECK (LENGTH(name) >= 3)
);

-- Room memberships and seat assignments
CREATE TABLE IF NOT EXISTS room_seats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seat_index INTEGER NOT NULL CHECK (seat_index >= 0 AND seat_index < 10),
  
  -- Player status
  status VARCHAR(20) DEFAULT 'SEATED' CHECK (status IN ('SEATED', 'PLAYING', 'SITTING_OUT', 'WAITLIST')),
  chips_in_play BIGINT DEFAULT 0 CHECK (chips_in_play >= 0),
  
  -- Timing
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_action_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_user_room_seat UNIQUE (user_id, room_id),
  CONSTRAINT unique_room_seat_index UNIQUE (room_id, seat_index)
);

-- Room spectators
CREATE TABLE IF NOT EXISTS room_spectators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- CHIPS ECONOMY
-- ================================

-- Chips transaction ledger for audit trail
CREATE TABLE IF NOT EXISTS chips_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Transaction details
  transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN (
    'BUY_IN', 'REBUY', 'ADD_ON', 'CASHOUT', 'RAKE', 'BONUS', 
    'PENALTY', 'REFUND', 'ADMIN_ADJUSTMENT', 'TOURNAMENT_ENTRY', 
    'TOURNAMENT_PAYOUT', 'GAME_WIN', 'GAME_LOSS'
  )),
  amount BIGINT NOT NULL, -- can be negative for debits
  balance_before BIGINT NOT NULL CHECK (balance_before >= 0),
  balance_after BIGINT NOT NULL CHECK (balance_after >= 0),
  
  -- Context
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  game_id UUID, -- will reference games table
  hand_id UUID, -- will reference hands table
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Processing
  status VARCHAR(20) DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_by UUID REFERENCES users(id) ON DELETE SET NULL, -- for admin adjustments
  
  -- Constraints
  CONSTRAINT valid_transaction_amount CHECK (amount != 0)
);

-- Table stakes tracking (chips committed to specific rooms)
CREATE TABLE IF NOT EXISTS table_stakes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  
  -- Stake amounts
  chips_committed BIGINT NOT NULL CHECK (chips_committed >= 0),
  chips_in_play BIGINT DEFAULT 0 CHECK (chips_in_play >= 0),
  
  -- Timing
  committed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_user_room_stake UNIQUE (user_id, room_id)
);

-- Pending chips operations (buy-ins, cashouts that need processing)
CREATE TABLE IF NOT EXISTS chips_pending (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Operation details
  operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('BUY_IN', 'CASHOUT', 'REBUY', 'ADD_ON')),
  amount BIGINT NOT NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  
  -- Processing
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_pending_amount CHECK (amount > 0)
);

-- ================================
-- AUDIT & SECURITY
-- ================================

-- Audit log for all significant actions
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Action details
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(30) NOT NULL,
  resource_id UUID,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  
  -- Outcome
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  
  -- Timing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- GAMES & HANDS (Basic Structure)
-- ================================

-- Game instances
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  
  -- Game configuration
  game_type VARCHAR(20) NOT NULL DEFAULT 'TEXAS_HOLDEM',
  small_blind INTEGER NOT NULL,
  big_blind INTEGER NOT NULL,
  ante INTEGER DEFAULT 0,
  
  -- Game state
  status VARCHAR(20) DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED')),
  current_hand_id UUID, -- will reference hands table
  dealer_seat INTEGER CHECK (dealer_seat >= 0 AND dealer_seat < 10),
  
  -- Seeded randomness
  shuffle_seed VARCHAR(255), -- for provably fair shuffling
  entropy_source TEXT, -- YouTube video info for transparency
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual poker hands
CREATE TABLE IF NOT EXISTS hands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  
  -- Hand details
  hand_number INTEGER NOT NULL,
  dealer_seat INTEGER NOT NULL CHECK (dealer_seat >= 0 AND dealer_seat < 10),
  small_blind_seat INTEGER CHECK (small_blind_seat >= 0 AND small_blind_seat < 10),
  big_blind_seat INTEGER CHECK (big_blind_seat >= 0 AND big_blind_seat < 10),
  
  -- Game state
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
  current_street VARCHAR(15) DEFAULT 'PREFLOP' CHECK (current_street IN ('PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN')),
  pot_total BIGINT DEFAULT 0 CHECK (pot_total >= 0),
  
  -- Cards
  community_cards JSONB DEFAULT '[]', -- array of card objects
  deck_state JSONB, -- for hand reconstruction
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT unique_game_hand_number UNIQUE (game_id, hand_number)
);

-- ================================
-- EVENT SOURCING & STATE MANAGEMENT
-- ================================

-- Game events for complete audit trail
CREATE TABLE IF NOT EXISTS game_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  hand_id UUID REFERENCES hands(id) ON DELETE CASCADE,
  
  -- Event details
  event_type VARCHAR(30) NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  sequence_number BIGINT NOT NULL,
  
  -- Context
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  seat_index INTEGER CHECK (seat_index >= 0 AND seat_index < 10),
  
  -- Timing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_game_sequence UNIQUE (game_id, sequence_number)
);

-- Game state snapshots for quick recovery
CREATE TABLE IF NOT EXISTS game_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  hand_id UUID REFERENCES hands(id) ON DELETE CASCADE,
  
  -- Snapshot details
  snapshot_type VARCHAR(20) DEFAULT 'PERIODIC' CHECK (snapshot_type IN ('PERIODIC', 'HAND_END', 'MANUAL')),
  sequence_number BIGINT NOT NULL, -- last event included in snapshot
  
  -- State data
  game_state JSONB NOT NULL,
  player_states JSONB DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_game_snapshot_sequence UNIQUE (game_id, sequence_number)
);

-- ================================
-- INDEXES FOR PERFORMANCE
-- ================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- User sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(refresh_token_hash);

-- Rejoin tokens indexes
CREATE INDEX IF NOT EXISTS idx_rejoin_tokens_user_id ON rejoin_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_rejoin_tokens_game_id ON rejoin_tokens(game_id);
CREATE INDEX IF NOT EXISTS idx_rejoin_tokens_expires_at ON rejoin_tokens(expires_at);

-- Rooms indexes
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_game_type ON rooms(game_type);
CREATE INDEX IF NOT EXISTS idx_rooms_stakes ON rooms(small_blind, big_blind);
CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON rooms(created_at DESC);

-- Room seats indexes
CREATE INDEX IF NOT EXISTS idx_room_seats_room_id ON room_seats(room_id);
CREATE INDEX IF NOT EXISTS idx_room_seats_user_id ON room_seats(user_id);
CREATE INDEX IF NOT EXISTS idx_room_seats_status ON room_seats(status);

-- Room spectators indexes
CREATE INDEX IF NOT EXISTS idx_room_spectators_room_id ON room_spectators(room_id);
CREATE INDEX IF NOT EXISTS idx_room_spectators_user_id ON room_spectators(user_id);

-- Chips transactions indexes
CREATE INDEX IF NOT EXISTS idx_chips_transactions_user_id ON chips_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_chips_transactions_type ON chips_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_chips_transactions_processed_at ON chips_transactions(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_chips_transactions_room_id ON chips_transactions(room_id);
CREATE INDEX IF NOT EXISTS idx_chips_transactions_game_id ON chips_transactions(game_id);

-- Table stakes indexes
CREATE INDEX IF NOT EXISTS idx_table_stakes_user_id ON table_stakes(user_id);
CREATE INDEX IF NOT EXISTS idx_table_stakes_room_id ON table_stakes(room_id);

-- Chips pending indexes
CREATE INDEX IF NOT EXISTS idx_chips_pending_user_id ON chips_pending(user_id);
CREATE INDEX IF NOT EXISTS idx_chips_pending_status ON chips_pending(status);
CREATE INDEX IF NOT EXISTS idx_chips_pending_expires_at ON chips_pending(expires_at);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id);

-- Games indexes
CREATE INDEX IF NOT EXISTS idx_games_room_id ON games(room_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at DESC);

-- Hands indexes
CREATE INDEX IF NOT EXISTS idx_hands_game_id ON hands(game_id);
CREATE INDEX IF NOT EXISTS idx_hands_status ON hands(status);
CREATE INDEX IF NOT EXISTS idx_hands_started_at ON hands(started_at DESC);

-- Game events indexes
CREATE INDEX IF NOT EXISTS idx_game_events_game_id ON game_events(game_id);
CREATE INDEX IF NOT EXISTS idx_game_events_hand_id ON game_events(hand_id);
CREATE INDEX IF NOT EXISTS idx_game_events_sequence ON game_events(game_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_game_events_created_at ON game_events(created_at);

-- Game snapshots indexes
CREATE INDEX IF NOT EXISTS idx_game_snapshots_game_id ON game_snapshots(game_id);
CREATE INDEX IF NOT EXISTS idx_game_snapshots_sequence ON game_snapshots(game_id, sequence_number DESC);
CREATE INDEX IF NOT EXISTS idx_game_snapshots_created_at ON game_snapshots(created_at DESC);

-- ================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_table_stakes_updated_at BEFORE UPDATE ON table_stakes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
