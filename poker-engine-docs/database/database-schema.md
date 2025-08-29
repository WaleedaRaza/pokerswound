# DATABASE SCHEMA

## Overview
The database schema is designed for Supabase (PostgreSQL) and provides comprehensive data storage for the poker engine, including user management, game states, transactions, and audit trails. The schema ensures data integrity, supports real-time features, and maintains complete audit trails.

## Schema Architecture

### 1. Core Tables
```
Users (auth.users) ←→ Players ←→ Games ←→ Game_Histories
     ↓                    ↓         ↓           ↓
Transactions          Actions    Entropy_Logs  Audit_Logs
     ↓                    ↓         ↓           ↓
Balances            Sessions    RNG_Logs     Security_Logs
```

### 2. Table Relationships
- **One-to-Many**: User → Players, Game → Actions, Game → Game_Histories
- **Many-to-Many**: Players ↔ Games (through Players table)
- **One-to-One**: Game → Current_State (JSONB)

## Complete Schema Definition

### 1. Authentication Tables (Supabase Auth)

#### auth.users
```sql
-- Managed by Supabase Auth
CREATE TABLE auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  email_confirmed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  last_sign_in_at TIMESTAMP,
  raw_app_meta_data JSONB,
  raw_user_meta_data JSONB,
  is_super_admin BOOLEAN DEFAULT false,
  encrypted_password TEXT,
  confirmation_token TEXT,
  confirmation_sent_at TIMESTAMP,
  recovery_token TEXT,
  recovery_sent_at TIMESTAMP,
  email_change_token_new TEXT,
  email_change TEXT,
  email_change_sent_at TIMESTAMP,
  last_sign_in_with_ip INET,
  sign_in_count INTEGER DEFAULT 0,
  banned_until TIMESTAMP,
  re_authentication_sent_at TIMESTAMP,
  re_authentication_token TEXT,
  phone TEXT,
  phone_confirmed_at TIMESTAMP,
  phone_change TEXT,
  phone_change_token TEXT,
  phone_change_sent_at TIMESTAMP,
  email_change_token_current TEXT,
  email_change_confirm_status SMALLINT DEFAULT 0,
  banned_reason TEXT,
  aud TEXT,
  role TEXT,
  aal TEXT,
  not_after TIMESTAMP,
  sub TEXT,
  email_change_token_new_sent_at TIMESTAMP,
  reauthentication_sent_at TIMESTAMP,
  CONSTRAINT users_aud_check CHECK (aud in ('authenticated','anon')),
  CONSTRAINT users_role_check CHECK (role in ('authenticated','anon','service_role'))
);
```

### 2. Core Application Tables

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  balance DECIMAL(15,2) DEFAULT 0.00,
  total_winnings DECIMAL(15,2) DEFAULT 0.00,
  total_losses DECIMAL(15,2) DEFAULT 0.00,
  games_played INTEGER DEFAULT 0,
  hands_won INTEGER DEFAULT 0,
  biggest_pot_won DECIMAL(15,2) DEFAULT 0.00,
  longest_winning_streak INTEGER DEFAULT 0,
  current_winning_streak INTEGER DEFAULT 0,
  is_online BOOLEAN DEFAULT false,
  last_seen_at TIMESTAMP DEFAULT now(),
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  CONSTRAINT users_balance_check CHECK (balance >= 0),
  CONSTRAINT users_total_winnings_check CHECK (total_winnings >= 0),
  CONSTRAINT users_total_losses_check CHECK (total_losses >= 0),
  CONSTRAINT users_games_played_check CHECK (games_played >= 0),
  CONSTRAINT users_hands_won_check CHECK (hands_won >= 0),
  CONSTRAINT users_biggest_pot_won_check CHECK (biggest_pot_won >= 0),
  CONSTRAINT users_longest_winning_streak_check CHECK (longest_winning_streak >= 0),
  CONSTRAINT users_current_winning_streak_check CHECK (current_winning_streak >= 0)
);

-- Indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_balance ON users(balance);
CREATE INDEX idx_users_is_online ON users(is_online);
CREATE INDEX idx_users_last_seen_at ON users(last_seen_at);
```

#### games
```sql
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  table_type VARCHAR(20) DEFAULT 'cash', -- 'cash', 'tournament'
  max_players INTEGER DEFAULT 9,
  min_players INTEGER DEFAULT 2,
  small_blind_amount DECIMAL(10,2) NOT NULL,
  big_blind_amount DECIMAL(10,2) NOT NULL,
  min_buy_in DECIMAL(10,2) NOT NULL,
  max_buy_in DECIMAL(10,2) NOT NULL,
  current_state JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting', -- 'waiting', 'active', 'paused', 'completed'
  entropy_seed TEXT NOT NULL,
  dealer_position INTEGER DEFAULT 0,
  hand_number INTEGER DEFAULT 0,
  total_pot DECIMAL(15,2) DEFAULT 0.00,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  CONSTRAINT games_max_players_check CHECK (max_players BETWEEN 2 AND 9),
  CONSTRAINT games_min_players_check CHECK (min_players BETWEEN 2 AND max_players),
  CONSTRAINT games_blind_amounts_check CHECK (big_blind_amount > small_blind_amount),
  CONSTRAINT games_buy_in_check CHECK (max_buy_in >= min_buy_in),
  CONSTRAINT games_total_pot_check CHECK (total_pot >= 0),
  CONSTRAINT games_hand_number_check CHECK (hand_number >= 0)
);

-- Indexes for performance
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_created_by ON games(created_by);
CREATE INDEX idx_games_created_at ON games(created_at);
CREATE INDEX idx_games_current_state ON games USING GIN(current_state);
```

#### players
```sql
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL, -- 0-8 (seat position)
  stack DECIMAL(15,2) NOT NULL,
  current_bet DECIMAL(15,2) DEFAULT 0.00,
  hole_cards JSONB, -- Array of card objects
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'folded', 'all_in', 'sitting_out', 'disconnected'
  is_dealer BOOLEAN DEFAULT false,
  is_small_blind BOOLEAN DEFAULT false,
  is_big_blind BOOLEAN DEFAULT false,
  last_action VARCHAR(20), -- 'fold', 'check', 'call', 'bet', 'raise'
  last_action_amount DECIMAL(15,2),
  last_action_time TIMESTAMP,
  total_bet_this_hand DECIMAL(15,2) DEFAULT 0.00,
  hands_won_this_game INTEGER DEFAULT 0,
  biggest_pot_won_this_game DECIMAL(15,2) DEFAULT 0.00,
  joined_at TIMESTAMP DEFAULT now(),
  left_at TIMESTAMP,
  
  CONSTRAINT players_position_check CHECK (position >= 0 AND position <= 8),
  CONSTRAINT players_stack_check CHECK (stack >= 0),
  CONSTRAINT players_current_bet_check CHECK (current_bet >= 0),
  CONSTRAINT players_total_bet_this_hand_check CHECK (total_bet_this_hand >= 0),
  CONSTRAINT players_hands_won_this_game_check CHECK (hands_won_this_game >= 0),
  CONSTRAINT players_biggest_pot_won_this_game_check CHECK (biggest_pot_won_this_game >= 0),
  UNIQUE(game_id, position),
  UNIQUE(game_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_players_game_id ON players(game_id);
CREATE INDEX idx_players_user_id ON players(user_id);
CREATE INDEX idx_players_status ON players(status);
CREATE INDEX idx_players_position ON players(position);
```

#### game_actions
```sql
CREATE TABLE game_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  hand_number INTEGER NOT NULL,
  street VARCHAR(20) NOT NULL, -- 'preflop', 'flop', 'turn', 'river'
  action VARCHAR(20) NOT NULL, -- 'fold', 'check', 'call', 'bet', 'raise', 'all_in'
  amount DECIMAL(15,2),
  pot_before_action DECIMAL(15,2) NOT NULL,
  pot_after_action DECIMAL(15,2) NOT NULL,
  player_stack_before DECIMAL(15,2) NOT NULL,
  player_stack_after DECIMAL(15,2) NOT NULL,
  player_position INTEGER NOT NULL,
  community_cards JSONB, -- Array of card objects
  timestamp TIMESTAMP DEFAULT now(),
  
  CONSTRAINT game_actions_amount_check CHECK (amount >= 0),
  CONSTRAINT game_actions_pot_before_action_check CHECK (pot_before_action >= 0),
  CONSTRAINT game_actions_pot_after_action_check CHECK (pot_after_action >= 0),
  CONSTRAINT game_actions_player_stack_before_check CHECK (player_stack_before >= 0),
  CONSTRAINT game_actions_player_stack_after_check CHECK (player_stack_after >= 0),
  CONSTRAINT game_actions_player_position_check CHECK (player_position >= 0 AND player_position <= 8)
);

-- Indexes for performance
CREATE INDEX idx_game_actions_game_id ON game_actions(game_id);
CREATE INDEX idx_game_actions_player_id ON game_actions(player_id);
CREATE INDEX idx_game_actions_hand_number ON game_actions(hand_number);
CREATE INDEX idx_game_actions_street ON game_actions(street);
CREATE INDEX idx_game_actions_timestamp ON game_actions(timestamp);
```

#### game_histories
```sql
CREATE TABLE game_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  hand_number INTEGER NOT NULL,
  entropy_seed TEXT NOT NULL,
  community_cards JSONB NOT NULL, -- Array of card objects
  pot_structure JSONB NOT NULL, -- Main pot and side pots
  winners JSONB NOT NULL, -- Array of winner objects
  hand_evaluations JSONB NOT NULL, -- Hand rankings for all players
  total_pot DECIMAL(15,2) NOT NULL,
  rake_amount DECIMAL(15,2) DEFAULT 0.00,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP NOT NULL,
  duration_seconds INTEGER NOT NULL,
  
  CONSTRAINT game_histories_hand_number_check CHECK (hand_number >= 0),
  CONSTRAINT game_histories_total_pot_check CHECK (total_pot >= 0),
  CONSTRAINT game_histories_rake_amount_check CHECK (rake_amount >= 0),
  CONSTRAINT game_histories_duration_seconds_check CHECK (duration_seconds >= 0),
  UNIQUE(game_id, hand_number)
);

-- Indexes for performance
CREATE INDEX idx_game_histories_game_id ON game_histories(game_id);
CREATE INDEX idx_game_histories_hand_number ON game_histories(hand_number);
CREATE INDEX idx_game_histories_completed_at ON game_histories(completed_at);
```

### 3. Financial Tables

#### transactions
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  hand_number INTEGER,
  type VARCHAR(20) NOT NULL, -- 'purchase', 'win', 'loss', 'refund', 'adjustment'
  amount DECIMAL(15,2) NOT NULL,
  balance_before DECIMAL(15,2) NOT NULL,
  balance_after DECIMAL(15,2) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now(),
  
  CONSTRAINT transactions_amount_check CHECK (amount != 0),
  CONSTRAINT transactions_balance_after_check CHECK (balance_after >= 0)
);

-- Indexes for performance
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_game_id ON transactions(game_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
```

#### balances
```sql
CREATE TABLE balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  locked_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total_deposited DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total_withdrawn DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  last_transaction_id UUID REFERENCES transactions(id),
  updated_at TIMESTAMP DEFAULT now(),
  
  CONSTRAINT balances_balance_check CHECK (balance >= 0),
  CONSTRAINT balances_locked_balance_check CHECK (locked_balance >= 0),
  CONSTRAINT balances_total_deposited_check CHECK (total_deposited >= 0),
  CONSTRAINT balances_total_withdrawn_check CHECK (total_withdrawn >= 0),
  UNIQUE(user_id)
);

-- Indexes for performance
CREATE INDEX idx_balances_user_id ON balances(user_id);
CREATE INDEX idx_balances_balance ON balances(balance);
```

### 4. Audit and Security Tables

#### audit_logs
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  action_type VARCHAR(50) NOT NULL,
  action_details JSONB NOT NULL,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  severity VARCHAR(10) DEFAULT 'info', -- 'debug', 'info', 'warning', 'error', 'critical'
  created_at TIMESTAMP DEFAULT now(),
  
  CONSTRAINT audit_logs_severity_check CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical'))
);

-- Indexes for performance
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_game_id ON audit_logs(game_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

#### entropy_logs
```sql
CREATE TABLE entropy_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  hand_number INTEGER,
  entropy_seed TEXT NOT NULL,
  sources JSONB NOT NULL, -- Array of entropy sources
  quality_metrics JSONB NOT NULL, -- Entropy quality assessment
  collection_time_ms INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  
  CONSTRAINT entropy_logs_hand_number_check CHECK (hand_number >= 0),
  CONSTRAINT entropy_logs_collection_time_ms_check CHECK (collection_time_ms >= 0)
);

-- Indexes for performance
CREATE INDEX idx_entropy_logs_game_id ON entropy_logs(game_id);
CREATE INDEX idx_entropy_logs_hand_number ON entropy_logs(hand_number);
CREATE INDEX idx_entropy_logs_created_at ON entropy_logs(created_at);
```

#### security_logs
```sql
CREATE TABLE security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL, -- 'login_attempt', 'suspicious_action', 'cheat_detection', 'ban'
  event_details JSONB NOT NULL,
  ip_address INET,
  user_agent TEXT,
  risk_score INTEGER DEFAULT 0, -- 0-100
  action_taken VARCHAR(50), -- 'none', 'warn', 'temp_ban', 'perm_ban'
  created_at TIMESTAMP DEFAULT now(),
  
  CONSTRAINT security_logs_risk_score_check CHECK (risk_score >= 0 AND risk_score <= 100)
);

-- Indexes for performance
CREATE INDEX idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX idx_security_logs_game_id ON security_logs(game_id);
CREATE INDEX idx_security_logs_event_type ON security_logs(event_type);
CREATE INDEX idx_security_logs_risk_score ON security_logs(risk_score);
CREATE INDEX idx_security_logs_created_at ON security_logs(created_at);
```

### 5. Real-time and Session Tables

#### sessions
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  refresh_token TEXT UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  last_activity_at TIMESTAMP DEFAULT now(),
  
  CONSTRAINT sessions_expires_at_check CHECK (expires_at > created_at)
);

-- Indexes for performance
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_session_token ON sessions(session_token);
CREATE INDEX idx_sessions_is_active ON sessions(is_active);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

#### game_sessions
```sql
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  websocket_connection_id TEXT,
  joined_at TIMESTAMP DEFAULT now(),
  left_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  last_heartbeat_at TIMESTAMP DEFAULT now(),
  connection_quality VARCHAR(20) DEFAULT 'good', -- 'good', 'poor', 'disconnected'
  
  CONSTRAINT game_sessions_joined_at_check CHECK (joined_at <= COALESCE(left_at, joined_at))
);

-- Indexes for performance
CREATE INDEX idx_game_sessions_game_id ON game_sessions(game_id);
CREATE INDEX idx_game_sessions_player_id ON game_sessions(player_id);
CREATE INDEX idx_game_sessions_is_active ON game_sessions(is_active);
CREATE INDEX idx_game_sessions_last_heartbeat_at ON game_sessions(last_heartbeat_at);
```

## Data Models

### 1. User Model
```typescript
interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  balance: number;
  totalWinnings: number;
  totalLosses: number;
  gamesPlayed: number;
  handsWon: number;
  biggestPotWon: number;
  longestWinningStreak: number;
  currentWinningStreak: number;
  isOnline: boolean;
  lastSeenAt: Date;
  preferences: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. Game Model
```typescript
interface Game {
  id: string;
  name: string;
  tableType: 'cash' | 'tournament';
  maxPlayers: number;
  minPlayers: number;
  smallBlindAmount: number;
  bigBlindAmount: number;
  minBuyIn: number;
  maxBuyIn: number;
  currentState: GameState;
  status: 'waiting' | 'active' | 'paused' | 'completed';
  entropySeed: string;
  dealerPosition: number;
  handNumber: number;
  totalPot: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}
```

### 3. Player Model
```typescript
interface Player {
  id: string;
  gameId: string;
  userId: string;
  position: number;
  stack: number;
  currentBet: number;
  holeCards?: Card[];
  status: 'active' | 'folded' | 'all_in' | 'sitting_out' | 'disconnected';
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  lastAction?: string;
  lastActionAmount?: number;
  lastActionTime?: Date;
  totalBetThisHand: number;
  handsWonThisGame: number;
  biggestPotWonThisGame: number;
  joinedAt: Date;
  leftAt?: Date;
}
```

### 4. Game State Model
```typescript
interface GameState {
  id: string;
  players: Player[];
  communityCards: Card[];
  pot: Pot;
  currentBet: number;
  street: Street;
  currentPlayerIndex: number;
  deck: Card[];
  entropySeed: string;
  lastActionTime: number;
  handNumber: number;
  dealerPosition: number;
  smallBlindAmount: number;
  bigBlindAmount: number;
  status: GameStatus;
  startedAt?: Date;
  completedAt?: Date;
}

interface Pot {
  mainPot: number;
  sidePots: SidePot[];
  totalPot: number;
}

interface SidePot {
  amount: number;
  eligiblePlayers: string[];
}
```

### 5. Transaction Model
```typescript
interface Transaction {
  id: string;
  userId: string;
  gameId?: string;
  handNumber?: number;
  type: 'purchase' | 'win' | 'loss' | 'refund' | 'adjustment';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}
```

## Database Functions and Triggers

### 1. Balance Update Function
```sql
CREATE OR REPLACE FUNCTION update_user_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user balance when transaction is created
  UPDATE users 
  SET balance = NEW.balance_after,
      updated_at = NOW()
  WHERE id = NEW.user_id;
  
  -- Update balance record
  INSERT INTO balances (user_id, balance, last_transaction_id, updated_at)
  VALUES (NEW.user_id, NEW.balance_after, NEW.id, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    balance = EXCLUDED.balance,
    last_transaction_id = EXCLUDED.last_transaction_id,
    updated_at = EXCLUDED.updated_at;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_balance
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_balance();
```

### 2. Game Statistics Update Function
```sql
CREATE OR REPLACE FUNCTION update_game_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update game statistics when hand is completed
  UPDATE users 
  SET 
    games_played = games_played + 1,
    total_winnings = total_winnings + COALESCE(NEW.winnings, 0),
    total_losses = total_losses + COALESCE(NEW.losses, 0),
    hands_won = hands_won + CASE WHEN NEW.is_winner THEN 1 ELSE 0 END,
    biggest_pot_won = GREATEST(biggest_pot_won, COALESCE(NEW.pot_won, 0)),
    updated_at = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 3. Audit Log Function
```sql
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id, 
    game_id, 
    action_type, 
    action_details, 
    ip_address, 
    user_agent, 
    session_id, 
    severity
  ) VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    COALESCE(NEW.game_id, OLD.game_id),
    TG_OP, -- INSERT, UPDATE, DELETE
    CASE 
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      ELSE to_jsonb(NEW)
    END,
    inet_client_addr(),
    current_setting('request.headers')::json->>'user-agent',
    current_setting('request.headers')::json->>'session-id',
    'info'
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

## Indexing Strategy

### 1. Primary Indexes
- **Primary Keys**: All tables have UUID primary keys
- **Foreign Keys**: Indexed for referential integrity
- **Unique Constraints**: Enforced with indexes

### 2. Performance Indexes
- **Frequently Queried Columns**: status, created_at, user_id
- **Range Queries**: timestamp columns for date ranges
- **Full-Text Search**: username, description fields
- **JSONB Indexes**: For complex querying of JSON data

### 3. Composite Indexes
```sql
-- For efficient game queries
CREATE INDEX idx_games_status_created_at ON games(status, created_at);

-- For efficient player queries
CREATE INDEX idx_players_game_status ON players(game_id, status);

-- For efficient transaction queries
CREATE INDEX idx_transactions_user_type_created ON transactions(user_id, type, created_at);
```

## Data Retention and Archiving

### 1. Retention Policies
```sql
-- Archive old game actions (older than 1 year)
CREATE TABLE game_actions_archive (LIKE game_actions);

-- Archive old audit logs (older than 2 years)
CREATE TABLE audit_logs_archive (LIKE audit_logs);

-- Archive old security logs (older than 1 year)
CREATE TABLE security_logs_archive (LIKE security_logs);
```

### 2. Cleanup Functions
```sql
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- Move old game actions to archive
  INSERT INTO game_actions_archive 
  SELECT * FROM game_actions 
  WHERE created_at < NOW() - INTERVAL '1 year';
  
  DELETE FROM game_actions 
  WHERE created_at < NOW() - INTERVAL '1 year';
  
  -- Move old audit logs to archive
  INSERT INTO audit_logs_archive 
  SELECT * FROM audit_logs 
  WHERE created_at < NOW() - INTERVAL '2 years';
  
  DELETE FROM audit_logs 
  WHERE created_at < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;
```

## Backup and Recovery

### 1. Backup Strategy
- **Full Backups**: Daily complete database backups
- **Incremental Backups**: Hourly transaction log backups
- **Point-in-Time Recovery**: Support for any point in last 30 days

### 2. Recovery Procedures
```sql
-- Restore from backup
-- pg_restore -d poker_engine backup_file.sql

-- Point-in-time recovery
-- pg_restore -d poker_engine --recovery-target-time="2024-01-01 12:00:00" backup_file.sql
```

This comprehensive database schema provides a robust foundation for the poker engine with proper data integrity, performance optimization, and complete audit trails. 