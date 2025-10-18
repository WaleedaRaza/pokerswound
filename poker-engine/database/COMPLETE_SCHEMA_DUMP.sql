-- ============================================
-- COMPLETE DATABASE SCHEMA DUMP
-- Poker Engine Database - Current State
-- Generated: 2024-01-15
-- ============================================

-- ============================================
-- 1. TABLES OVERVIEW
-- ============================================

/*
CORE GAME TABLES:
- rooms: Game rooms/lobbies
- room_players: Players in room lobbies
- room_seats: Players seated at tables
- room_spectators: Non-playing observers
- games: Active game instances
- players: Players in active games
- hands: Individual poker hands
- actions: Player actions (bet, call, fold, etc.)
- pots: Pot tracking and distribution
- hand_history: Complete hand records

AUTHENTICATION TABLES:
- auth.users: Supabase authentication (managed by Supabase)
- user_profiles: Application-specific user data
- user_sessions: Session management (legacy)

AUDIT & TRACKING TABLES:
- audit_log: System activity log
- chips_transactions: Chip movement tracking
- chips_pending: Pending chip transfers
- rejoin_tokens: Player reconnection tokens

CONFIGURATION TABLES:
- table_stakes: Stakes configuration
- game_configurations: Game rule sets
*/

-- ============================================
-- 2. TABLE DEFINITIONS WITH COLUMNS
-- ============================================

-- ROOMS TABLE
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    host_user_id UUID REFERENCES auth.users(id),
    invite_code VARCHAR(20) UNIQUE NOT NULL,
    small_blind INTEGER NOT NULL,
    big_blind INTEGER NOT NULL,
    min_buy_in INTEGER NOT NULL,
    max_buy_in INTEGER NOT NULL,
    max_players INTEGER DEFAULT 9,
    is_private BOOLEAN DEFAULT false,
    lobby_status VARCHAR(20) DEFAULT 'waiting',
    game_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROOM_PLAYERS TABLE
CREATE TABLE IF NOT EXISTS room_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- No FK constraint (allows guests)
    status VARCHAR(20) DEFAULT 'pending',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id)
);

-- ROOM_SEATS TABLE
CREATE TABLE IF NOT EXISTS room_seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- No FK constraint (allows guests)
    seat_index INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'SEATED',
    chips_in_play INTEGER DEFAULT 0,
    sat_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ
);

-- ROOM_SPECTATORS TABLE
CREATE TABLE IF NOT EXISTS room_spectators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- No FK constraint (allows guests)
    joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- GAMES TABLE
CREATE TABLE IF NOT EXISTS games (
    id VARCHAR(100) PRIMARY KEY,
    room_id UUID REFERENCES rooms(id),
    status VARCHAR(20) DEFAULT 'waiting',
    current_hand INTEGER DEFAULT 0,
    small_blind INTEGER NOT NULL,
    big_blind INTEGER NOT NULL,
    ante INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ
);

-- PLAYERS TABLE
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id VARCHAR(100) NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- No FK constraint (allows guests)
    seat_number INTEGER NOT NULL,
    chips INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    position VARCHAR(20),
    is_dealer BOOLEAN DEFAULT false,
    is_small_blind BOOLEAN DEFAULT false,
    is_big_blind BOOLEAN DEFAULT false,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ
);

-- HANDS TABLE
CREATE TABLE IF NOT EXISTS hands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id VARCHAR(100) NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    hand_number INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'preflop',
    pot INTEGER DEFAULT 0,
    community_cards TEXT[], -- Array of card strings
    winner_user_id UUID, -- No FK constraint (allows guests)
    winning_hand TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- ACTIONS TABLE
CREATE TABLE IF NOT EXISTS actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hand_id UUID NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- No FK constraint (allows guests)
    action_type VARCHAR(20) NOT NULL,
    amount INTEGER DEFAULT 0,
    position INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- POTS TABLE
CREATE TABLE IF NOT EXISTS pots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hand_id UUID NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
    pot_number INTEGER DEFAULT 1,
    amount INTEGER NOT NULL,
    eligible_players UUID[], -- Array of user IDs
    winner_user_id UUID, -- No FK constraint (allows guests)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HAND_HISTORY TABLE
CREATE TABLE IF NOT EXISTS hand_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id VARCHAR(100) NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    hand_id UUID NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
    hand_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- USER_PROFILES TABLE
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY, -- References auth.users(id) but no FK constraint
    username VARCHAR(50) NOT NULL,
    display_name VARCHAR(50),
    bio TEXT,
    avatar_url TEXT,
    chips INTEGER DEFAULT 1000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AUDIT_LOG TABLE
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- No FK constraint (allows guests)
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CHIPS_TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS chips_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- No FK constraint (allows guests)
    transaction_type VARCHAR(20) NOT NULL,
    amount INTEGER NOT NULL,
    game_id VARCHAR(100) REFERENCES games(id),
    hand_id UUID REFERENCES hands(id),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CHIPS_PENDING TABLE
CREATE TABLE IF NOT EXISTS chips_pending (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- No FK constraint (allows guests)
    amount INTEGER NOT NULL,
    game_id VARCHAR(100) REFERENCES games(id),
    status VARCHAR(20) DEFAULT 'pending',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- REJOIN_TOKENS TABLE
CREATE TABLE IF NOT EXISTS rejoin_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- No FK constraint (allows guests)
    game_id VARCHAR(100) NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    token VARCHAR(100) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE_STAKES TABLE
CREATE TABLE IF NOT EXISTS table_stakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    small_blind INTEGER NOT NULL,
    big_blind INTEGER NOT NULL,
    min_buy_in INTEGER NOT NULL,
    max_buy_in INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- USER_SESSIONS TABLE (Legacy)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- No FK constraint (allows guests)
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. INDEXES
-- ============================================

-- ROOMS INDEXES
CREATE INDEX IF NOT EXISTS rooms_host_user_id_idx ON rooms(host_user_id);
CREATE INDEX IF NOT EXISTS rooms_invite_code_idx ON rooms(invite_code);
CREATE INDEX IF NOT EXISTS rooms_status_idx ON rooms(lobby_status);
CREATE INDEX IF NOT EXISTS rooms_created_at_idx ON rooms(created_at);

-- ROOM_PLAYERS INDEXES
CREATE INDEX IF NOT EXISTS room_players_room_id_idx ON room_players(room_id);
CREATE INDEX IF NOT EXISTS room_players_user_id_idx ON room_players(user_id);
CREATE INDEX IF NOT EXISTS room_players_status_idx ON room_players(status);

-- ROOM_SEATS INDEXES
CREATE INDEX IF NOT EXISTS room_seats_room_id_idx ON room_seats(room_id);
CREATE INDEX IF NOT EXISTS room_seats_user_id_idx ON room_seats(user_id);
CREATE INDEX IF NOT EXISTS room_seats_seat_index_idx ON room_seats(seat_index);
CREATE INDEX IF NOT EXISTS room_seats_status_idx ON room_seats(status);

-- GAMES INDEXES
CREATE INDEX IF NOT EXISTS games_room_id_idx ON games(room_id);
CREATE INDEX IF NOT EXISTS games_status_idx ON games(status);
CREATE INDEX IF NOT EXISTS games_created_at_idx ON games(created_at);

-- PLAYERS INDEXES
CREATE INDEX IF NOT EXISTS players_game_id_idx ON players(game_id);
CREATE INDEX IF NOT EXISTS players_user_id_idx ON players(user_id);
CREATE INDEX IF NOT EXISTS players_seat_number_idx ON players(seat_number);
CREATE INDEX IF NOT EXISTS players_status_idx ON players(status);

-- HANDS INDEXES
CREATE INDEX IF NOT EXISTS hands_game_id_idx ON hands(game_id);
CREATE INDEX IF NOT EXISTS hands_hand_number_idx ON hands(hand_number);
CREATE INDEX IF NOT EXISTS hands_status_idx ON hands(status);
CREATE INDEX IF NOT EXISTS hands_created_at_idx ON hands(created_at);

-- ACTIONS INDEXES
CREATE INDEX IF NOT EXISTS actions_hand_id_idx ON actions(hand_id);
CREATE INDEX IF NOT EXISTS actions_user_id_idx ON actions(user_id);
CREATE INDEX IF NOT EXISTS actions_action_type_idx ON actions(action_type);
CREATE INDEX IF NOT EXISTS actions_position_idx ON actions(position);
CREATE INDEX IF NOT EXISTS actions_created_at_idx ON actions(created_at);

-- POTS INDEXES
CREATE INDEX IF NOT EXISTS pots_hand_id_idx ON pots(hand_id);
CREATE INDEX IF NOT EXISTS pots_winner_user_id_idx ON pots(winner_user_id);

-- HAND_HISTORY INDEXES
CREATE INDEX IF NOT EXISTS hand_history_game_id_idx ON hand_history(game_id);
CREATE INDEX IF NOT EXISTS hand_history_hand_id_idx ON hand_history(hand_id);
CREATE INDEX IF NOT EXISTS hand_history_created_at_idx ON hand_history(created_at);

-- USER_PROFILES INDEXES
CREATE INDEX IF NOT EXISTS user_profiles_username_idx ON user_profiles(username);
CREATE INDEX IF NOT EXISTS user_profiles_created_at_idx ON user_profiles(created_at);

-- AUDIT_LOG INDEXES
CREATE INDEX IF NOT EXISTS audit_log_user_id_idx ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS audit_log_action_idx ON audit_log(action);
CREATE INDEX IF NOT EXISTS audit_log_table_name_idx ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log(created_at);

-- CHIPS_TRANSACTIONS INDEXES
CREATE INDEX IF NOT EXISTS chips_transactions_user_id_idx ON chips_transactions(user_id);
CREATE INDEX IF NOT EXISTS chips_transactions_type_idx ON chips_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS chips_transactions_game_id_idx ON chips_transactions(game_id);
CREATE INDEX IF NOT EXISTS chips_transactions_created_at_idx ON chips_transactions(created_at);

-- CHIPS_PENDING INDEXES
CREATE INDEX IF NOT EXISTS chips_pending_user_id_idx ON chips_pending(user_id);
CREATE INDEX IF NOT EXISTS chips_pending_status_idx ON chips_pending(status);
CREATE INDEX IF NOT EXISTS chips_pending_expires_at_idx ON chips_pending(expires_at);

-- REJOIN_TOKENS INDEXES
CREATE INDEX IF NOT EXISTS rejoin_tokens_user_id_idx ON rejoin_tokens(user_id);
CREATE INDEX IF NOT EXISTS rejoin_tokens_game_id_idx ON rejoin_tokens(game_id);
CREATE INDEX IF NOT EXISTS rejoin_tokens_token_idx ON rejoin_tokens(token);
CREATE INDEX IF NOT EXISTS rejoin_tokens_expires_at_idx ON rejoin_tokens(expires_at);

-- ============================================
-- 4. CONSTRAINTS
-- ============================================

-- ROOMS CONSTRAINTS
ALTER TABLE rooms ADD CONSTRAINT rooms_small_blind_positive CHECK (small_blind > 0);
ALTER TABLE rooms ADD CONSTRAINT rooms_big_blind_positive CHECK (big_blind > 0);
ALTER TABLE rooms ADD CONSTRAINT rooms_min_buy_in_positive CHECK (min_buy_in > 0);
ALTER TABLE rooms ADD CONSTRAINT rooms_max_buy_in_positive CHECK (max_buy_in > 0);
ALTER TABLE rooms ADD CONSTRAINT rooms_max_players_range CHECK (max_players >= 2 AND max_players <= 10);
ALTER TABLE rooms ADD CONSTRAINT rooms_lobby_status_check CHECK (lobby_status IN ('waiting', 'active', 'paused', 'ended'));

-- ROOM_PLAYERS CONSTRAINTS
ALTER TABLE room_players ADD CONSTRAINT room_players_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'left'));

-- ROOM_SEATS CONSTRAINTS
ALTER TABLE room_seats ADD CONSTRAINT room_seats_seat_index_range CHECK (seat_index >= 0 AND seat_index <= 9);
ALTER TABLE room_seats ADD CONSTRAINT room_seats_chips_non_negative CHECK (chips_in_play >= 0);
ALTER TABLE room_seats ADD CONSTRAINT room_seats_status_check CHECK (status IN ('SEATED', 'STANDING', 'AWAY'));

-- GAMES CONSTRAINTS
ALTER TABLE games ADD CONSTRAINT games_status_check CHECK (status IN ('waiting', 'active', 'paused', 'ended'));
ALTER TABLE games ADD CONSTRAINT games_small_blind_positive CHECK (small_blind > 0);
ALTER TABLE games ADD CONSTRAINT games_big_blind_positive CHECK (big_blind > 0);
ALTER TABLE games ADD CONSTRAINT games_ante_non_negative CHECK (ante >= 0);

-- PLAYERS CONSTRAINTS
ALTER TABLE players ADD CONSTRAINT players_seat_number_range CHECK (seat_number >= 0 AND seat_number <= 9);
ALTER TABLE players ADD CONSTRAINT players_chips_non_negative CHECK (chips >= 0);
ALTER TABLE players ADD CONSTRAINT players_status_check CHECK (status IN ('active', 'folded', 'all_in', 'sitting_out', 'left'));

-- HANDS CONSTRAINTS
ALTER TABLE hands ADD CONSTRAINT hands_hand_number_positive CHECK (hand_number > 0);
ALTER TABLE hands ADD CONSTRAINT hands_pot_non_negative CHECK (pot >= 0);
ALTER TABLE hands ADD CONSTRAINT hands_status_check CHECK (status IN ('preflop', 'flop', 'turn', 'river', 'showdown', 'ended'));

-- ACTIONS CONSTRAINTS
ALTER TABLE actions ADD CONSTRAINT actions_amount_non_negative CHECK (amount >= 0);
ALTER TABLE actions ADD CONSTRAINT actions_position_positive CHECK (position > 0);
ALTER TABLE actions ADD CONSTRAINT actions_action_type_check CHECK (action_type IN ('fold', 'call', 'raise', 'bet', 'check', 'all_in'));

-- POTS CONSTRAINTS
ALTER TABLE pots ADD CONSTRAINT pots_pot_number_positive CHECK (pot_number > 0);
ALTER TABLE pots ADD CONSTRAINT pots_amount_positive CHECK (amount > 0);

-- USER_PROFILES CONSTRAINTS
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_username_length CHECK (LENGTH(username) >= 3 AND LENGTH(username) <= 50);
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_chips_non_negative CHECK (chips >= 0);

-- CHIPS_TRANSACTIONS CONSTRAINTS
ALTER TABLE chips_transactions ADD CONSTRAINT chips_transactions_type_check CHECK (transaction_type IN ('buy_in', 'cash_out', 'win', 'loss', 'bonus', 'penalty'));
ALTER TABLE chips_transactions ADD CONSTRAINT chips_transactions_amount_non_zero CHECK (amount != 0);

-- CHIPS_PENDING CONSTRAINTS
ALTER TABLE chips_pending ADD CONSTRAINT chips_pending_amount_positive CHECK (amount > 0);
ALTER TABLE chips_pending ADD CONSTRAINT chips_pending_status_check CHECK (status IN ('pending', 'completed', 'expired', 'cancelled'));

-- REJOIN_TOKENS CONSTRAINTS
ALTER TABLE rejoin_tokens ADD CONSTRAINT rejoin_tokens_expires_future CHECK (expires_at > created_at);

-- ============================================
-- 5. RELATIONSHIPS SUMMARY
-- ============================================

/*
HIERARCHICAL RELATIONSHIPS:
1. rooms (1) -> room_players (many)
2. rooms (1) -> room_seats (many) 
3. rooms (1) -> room_spectators (many)
4. rooms (1) -> games (1)
5. games (1) -> players (many)
6. games (1) -> hands (many)
7. hands (1) -> actions (many)
8. hands (1) -> pots (many)
9. hands (1) -> hand_history (1)

USER RELATIONSHIPS:
- auth.users (1) -> user_profiles (1) [No FK constraint]
- auth.users (1) -> rooms (many) [host_user_id]
- user_profiles (1) -> room_players (many) [user_id, no FK]
- user_profiles (1) -> room_seats (many) [user_id, no FK]
- user_profiles (1) -> players (many) [user_id, no FK]

AUDIT RELATIONSHIPS:
- All tables -> audit_log (many) [via user_id and record_id]

CHIPS RELATIONSHIPS:
- user_profiles (1) -> chips_transactions (many) [user_id, no FK]
- user_profiles (1) -> chips_pending (many) [user_id, no FK]
- games (1) -> chips_transactions (many)
- hands (1) -> chips_transactions (many)
*/

-- ============================================
-- 6. DATA VOLUME ESTIMATES
-- ============================================

/*
CURRENT SCALE (Estimated):
- rooms: ~100-1000 active rooms
- room_players: ~500-5000 active players
- games: ~100-1000 active games
- hands: ~10,000-100,000 hands per month
- actions: ~100,000-1,000,000 actions per month
- audit_log: ~1,000,000-10,000,000 entries per month

SCALING CONSIDERATIONS:
- Partitioning: hands, actions, audit_log by date
- Archiving: old hand_history, audit_log entries
- Caching: frequently accessed user_profiles, room data
- Read replicas: for analytics and reporting
- Sharding: by user_id or game_id for extreme scale
*/

-- ============================================
-- 7. PERFORMANCE NOTES
-- ============================================

/*
HOT TABLES (High Read/Write):
- rooms: Room creation, joining, status updates
- room_players: Player management
- players: Game state updates
- actions: Real-time game actions
- hands: Game progression

WARM TABLES (Medium Activity):
- games: Game lifecycle management
- pots: Pot calculations
- user_profiles: Profile updates

COLD TABLES (Low Activity):
- hand_history: Historical data
- audit_log: Compliance and debugging
- chips_transactions: Financial records
- rejoin_tokens: Temporary data

OPTIMIZATION OPPORTUNITIES:
1. Add composite indexes for common query patterns
2. Consider materialized views for complex aggregations
3. Implement table partitioning for time-series data
4. Add database-level caching for frequently accessed data
5. Consider read replicas for analytics workloads
*/
