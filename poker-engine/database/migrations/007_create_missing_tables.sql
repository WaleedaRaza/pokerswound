-- Create missing tables that code expects
-- Migration: 007_create_missing_tables.sql

-- room_players table (for lobby approval system)
CREATE TABLE IF NOT EXISTS room_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Player status in lobby
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'LEFT')),
  
  -- Timing
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Constraints
  CONSTRAINT unique_user_room_player UNIQUE (user_id, room_id)
);

-- Create games table if not exists (for in-memory game state persistence)
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
  current_hand_id UUID,
  dealer_seat INTEGER CHECK (dealer_seat >= 0 AND dealer_seat < 10),
  
  -- Seeded randomness
  shuffle_seed VARCHAR(255),
  entropy_source TEXT,
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create players table if not exists (for player state in game)
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Player state
  seat_index INTEGER NOT NULL CHECK (seat_index >= 0 AND seat_index < 10),
  stack BIGINT NOT NULL CHECK (stack >= 0),
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SITTING_OUT', 'FOLDED', 'ALL_IN', 'OUT')),
  
  -- Cards
  hole_cards JSONB DEFAULT '[]',
  
  -- Timing
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_game_user UNIQUE (game_id, user_id),
  CONSTRAINT unique_game_seat UNIQUE (game_id, seat_index)
);

-- Create hands table if not exists
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
  community_cards JSONB DEFAULT '[]',
  deck_state JSONB,
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT unique_game_hand_number UNIQUE (game_id, hand_number)
);

-- Create actions table if not exists (for action log)
CREATE TABLE IF NOT EXISTS actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hand_id UUID NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Action details
  action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('FOLD', 'CHECK', 'CALL', 'BET', 'RAISE', 'ALL_IN')),
  amount BIGINT DEFAULT 0 CHECK (amount >= 0),
  street VARCHAR(15) NOT NULL,
  
  -- Context
  seat_index INTEGER NOT NULL CHECK (seat_index >= 0 AND seat_index < 10),
  pot_before BIGINT,
  pot_after BIGINT,
  
  -- Timing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sequence_number INTEGER NOT NULL,
  
  -- Constraints
  CONSTRAINT unique_hand_sequence UNIQUE (hand_id, sequence_number)
);

-- Create pots table if not exists (for side pot tracking)
CREATE TABLE IF NOT EXISTS pots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hand_id UUID NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
  
  -- Pot details
  pot_type VARCHAR(20) NOT NULL CHECK (pot_type IN ('MAIN', 'SIDE')),
  amount BIGINT NOT NULL CHECK (amount >= 0),
  eligible_players JSONB DEFAULT '[]', -- array of player IDs
  
  -- Winners
  winner_ids JSONB DEFAULT '[]',
  distributed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create hand_history table if not exists (for complete hand records)
CREATE TABLE IF NOT EXISTS hand_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id VARCHAR(255),
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  hand_number INTEGER,
  pot_size BIGINT,
  community_cards TEXT[],
  winners JSONB,
  player_actions JSONB,
  final_stacks JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for room_players
CREATE INDEX IF NOT EXISTS idx_room_players_room_id ON room_players(room_id);
CREATE INDEX IF NOT EXISTS idx_room_players_user_id ON room_players(user_id);
CREATE INDEX IF NOT EXISTS idx_room_players_status ON room_players(status);

-- Indexes for games
CREATE INDEX IF NOT EXISTS idx_games_room_id ON games(room_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);

-- Indexes for players
CREATE INDEX IF NOT EXISTS idx_players_game_id ON players(game_id);
CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);

-- Indexes for hands
CREATE INDEX IF NOT EXISTS idx_hands_game_id ON hands(game_id);
CREATE INDEX IF NOT EXISTS idx_hands_status ON hands(status);

-- Indexes for actions
CREATE INDEX IF NOT EXISTS idx_actions_hand_id ON actions(hand_id);
CREATE INDEX IF NOT EXISTS idx_actions_game_id ON actions(game_id);
CREATE INDEX IF NOT EXISTS idx_actions_user_id ON actions(user_id);

-- Indexes for pots
CREATE INDEX IF NOT EXISTS idx_pots_hand_id ON pots(hand_id);

-- Indexes for hand_history
CREATE INDEX IF NOT EXISTS idx_hand_history_game_id ON hand_history(game_id);
CREATE INDEX IF NOT EXISTS idx_hand_history_room_id ON hand_history(room_id);

SELECT 'Migration 007 completed - all missing tables created' AS result;

