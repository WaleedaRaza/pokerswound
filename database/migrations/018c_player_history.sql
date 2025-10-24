-- Migration: Player History
-- Date: 2024-01-15
-- Purpose: Add comprehensive player game and hand history tracking

-- Player game history (participation in games)
CREATE TABLE IF NOT EXISTS player_game_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    game_id VARCHAR(100) NOT NULL,
    room_id UUID,
    
    -- Game participation details
    seat_index INTEGER NOT NULL,
    buy_in_amount BIGINT NOT NULL DEFAULT 0,
    cash_out_amount BIGINT DEFAULT 0,
    net_result BIGINT GENERATED ALWAYS AS (cash_out_amount - buy_in_amount) STORED,
    
    -- Game timing
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    duration_minutes INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN left_at IS NOT NULL THEN EXTRACT(EPOCH FROM (left_at - joined_at)) / 60
            ELSE NULL 
        END
    ) STORED,
    
    -- Performance metrics
    hands_played INTEGER DEFAULT 0,
    hands_won INTEGER DEFAULT 0,
    vpip_percentage DECIMAL(5,2), -- Voluntarily Put $ In Pot
    pfr_percentage DECIMAL(5,2),  -- Pre-Flop Raise
    aggression_factor DECIMAL(5,2),
    
    -- Final status
    final_status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (final_status IN ('ACTIVE', 'SITTING_OUT', 'FOLDED', 'ALL_IN', 'OUT', 'CASHED_OUT')),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player hand history (detailed hand participation)
CREATE TABLE IF NOT EXISTS player_hand_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    game_id VARCHAR(100) NOT NULL,
    hand_id UUID,
    room_id UUID,
    
    -- Hand details
    hand_number INTEGER NOT NULL,
    seat_index INTEGER NOT NULL,
    position VARCHAR(20), -- 'UTG', 'UTG+1', 'MP', 'CO', 'BTN', 'SB', 'BB'
    
    -- Cards
    hole_cards JSONB DEFAULT '[]',
    final_hand_rank INTEGER, -- 1=High Card, 2=Pair, etc.
    final_hand_description VARCHAR(50), -- "Pair of Aces", "Flush", etc.
    
    -- Action details
    preflop_action VARCHAR(20), -- 'FOLD', 'CALL', 'RAISE', 'ALL_IN'
    flop_action VARCHAR(20),
    turn_action VARCHAR(20),
    river_action VARCHAR(20),
    showdown_action VARCHAR(20),
    
    -- Betting amounts
    preflop_bet BIGINT DEFAULT 0,
    flop_bet BIGINT DEFAULT 0,
    turn_bet BIGINT DEFAULT 0,
    river_bet BIGINT DEFAULT 0,
    total_bet BIGINT GENERATED ALWAYS AS (preflop_bet + flop_bet + turn_bet + river_bet) STORED,
    
    -- Pot details
    pot_contribution BIGINT DEFAULT 0,
    pot_winnings BIGINT DEFAULT 0,
    net_hand_result BIGINT GENERATED ALWAYS AS (pot_winnings - pot_contribution) STORED,
    
    -- Hand outcome
    hand_outcome VARCHAR(20), -- 'WIN', 'LOSS', 'TIE', 'FOLD'
    is_showdown BOOLEAN DEFAULT FALSE,
    is_all_in BOOLEAN DEFAULT FALSE,
    
    -- Timing
    hand_started_at TIMESTAMPTZ DEFAULT NOW(),
    hand_ended_at TIMESTAMPTZ,
    hand_duration_seconds INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN hand_ended_at IS NOT NULL THEN EXTRACT(EPOCH FROM (hand_ended_at - hand_started_at))
            ELSE NULL 
        END
    ) STORED,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player statistics (aggregated performance data)
CREATE TABLE IF NOT EXISTS player_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    
    -- Overall stats
    total_games_played INTEGER DEFAULT 0,
    total_hands_played INTEGER DEFAULT 0,
    total_hands_won INTEGER DEFAULT 0,
    total_buy_ins BIGINT DEFAULT 0,
    total_cash_outs BIGINT DEFAULT 0,
    total_profit_loss BIGINT GENERATED ALWAYS AS (total_cash_outs - total_buy_ins) STORED,
    
    -- Win rates
    game_win_rate DECIMAL(5,2) DEFAULT 0.00,
    hand_win_rate DECIMAL(5,2) DEFAULT 0.00,
    showdown_win_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Playing style metrics
    vpip_percentage DECIMAL(5,2) DEFAULT 0.00, -- Voluntarily Put $ In Pot
    pfr_percentage DECIMAL(5,2) DEFAULT 0.00,  -- Pre-Flop Raise
    aggression_factor DECIMAL(5,2) DEFAULT 0.00,
    cbet_percentage DECIMAL(5,2) DEFAULT 0.00, -- Continuation Bet
    fold_to_cbet_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    -- Positional stats
    vpip_early_position DECIMAL(5,2) DEFAULT 0.00,
    vpip_middle_position DECIMAL(5,2) DEFAULT 0.00,
    vpip_late_position DECIMAL(5,2) DEFAULT 0.00,
    vpip_blinds DECIMAL(5,2) DEFAULT 0.00,
    
    -- Time-based stats
    total_play_time_minutes INTEGER DEFAULT 0,
    average_session_length_minutes DECIMAL(8,2) DEFAULT 0.00,
    longest_session_minutes INTEGER DEFAULT 0,
    
    -- Streaks
    current_win_streak INTEGER DEFAULT 0,
    current_loss_streak INTEGER DEFAULT 0,
    longest_win_streak INTEGER DEFAULT 0,
    longest_loss_streak INTEGER DEFAULT 0,
    
    -- Recent performance (last 30 days)
    recent_games_played INTEGER DEFAULT 0,
    recent_hands_played INTEGER DEFAULT 0,
    recent_profit_loss BIGINT DEFAULT 0,
    recent_win_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Timestamps
    last_game_played_at TIMESTAMPTZ,
    last_hand_played_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player achievements/badges
CREATE TABLE IF NOT EXISTS player_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    achievement_type VARCHAR(50) NOT NULL,
    achievement_name VARCHAR(100) NOT NULL,
    achievement_description TEXT,
    achievement_data JSONB DEFAULT '{}',
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    is_hidden BOOLEAN DEFAULT FALSE,
    
    UNIQUE (user_id, achievement_type, achievement_name)
);

-- Player notes (notes about other players)
CREATE TABLE IF NOT EXISTS player_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_user_id UUID NOT NULL,
    subject_user_id UUID NOT NULL,
    note_text TEXT NOT NULL,
    is_private BOOLEAN DEFAULT TRUE,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE (author_user_id, subject_user_id)
);

-- Indexes for player_game_history
CREATE INDEX IF NOT EXISTS idx_player_game_history_user ON player_game_history(user_id);
CREATE INDEX IF NOT EXISTS idx_player_game_history_game ON player_game_history(game_id);
CREATE INDEX IF NOT EXISTS idx_player_game_history_room ON player_game_history(room_id);
CREATE INDEX IF NOT EXISTS idx_player_game_history_joined_at ON player_game_history(joined_at);
CREATE INDEX IF NOT EXISTS idx_player_game_history_net_result ON player_game_history(net_result);

-- Indexes for player_hand_history
CREATE INDEX IF NOT EXISTS idx_player_hand_history_user ON player_hand_history(user_id);
CREATE INDEX IF NOT EXISTS idx_player_hand_history_game ON player_hand_history(game_id);
CREATE INDEX IF NOT EXISTS idx_player_hand_history_hand ON player_hand_history(hand_id);
CREATE INDEX IF NOT EXISTS idx_player_hand_history_room ON player_hand_history(room_id);
CREATE INDEX IF NOT EXISTS idx_player_hand_history_hand_number ON player_hand_history(hand_number);
CREATE INDEX IF NOT EXISTS idx_player_hand_history_outcome ON player_hand_history(hand_outcome);
CREATE INDEX IF NOT EXISTS idx_player_hand_history_net_result ON player_hand_history(net_hand_result);

-- Indexes for player_statistics
CREATE INDEX IF NOT EXISTS idx_player_statistics_user ON player_statistics(user_id);
CREATE INDEX IF NOT EXISTS idx_player_statistics_profit_loss ON player_statistics(total_profit_loss);
CREATE INDEX IF NOT EXISTS idx_player_statistics_win_rate ON player_statistics(hand_win_rate);

-- Indexes for player_achievements
CREATE INDEX IF NOT EXISTS idx_player_achievements_user ON player_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_player_achievements_type ON player_achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_player_achievements_earned_at ON player_achievements(earned_at);

-- Indexes for player_notes
CREATE INDEX IF NOT EXISTS idx_player_notes_author ON player_notes(author_user_id);
CREATE INDEX IF NOT EXISTS idx_player_notes_subject ON player_notes(subject_user_id);
CREATE INDEX IF NOT EXISTS idx_player_notes_created_at ON player_notes(created_at);

-- Create function to update player statistics
CREATE OR REPLACE FUNCTION update_player_statistics(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO player_statistics (user_id, total_games_played, total_hands_played, total_hands_won, 
                                  total_buy_ins, total_cash_outs, game_win_rate, hand_win_rate,
                                  last_game_played_at, last_hand_played_at, updated_at)
    SELECT 
        p_user_id,
        COUNT(DISTINCT pgh.id) as total_games,
        COUNT(phh.id) as total_hands,
        COUNT(CASE WHEN phh.hand_outcome = 'WIN' THEN 1 END) as hands_won,
        COALESCE(SUM(pgh.buy_in_amount), 0) as total_buy_ins,
        COALESCE(SUM(pgh.cash_out_amount), 0) as total_cash_outs,
        CASE WHEN COUNT(DISTINCT pgh.id) > 0 
             THEN (COUNT(CASE WHEN pgh.net_result > 0 THEN 1 END)::DECIMAL / COUNT(DISTINCT pgh.id)) * 100
             ELSE 0 END as game_win_rate,
        CASE WHEN COUNT(phh.id) > 0 
             THEN (COUNT(CASE WHEN phh.hand_outcome = 'WIN' THEN 1 END)::DECIMAL / COUNT(phh.id)) * 100
             ELSE 0 END as hand_win_rate,
        MAX(pgh.joined_at) as last_game,
        MAX(phh.hand_started_at) as last_hand,
        NOW() as updated_at
    FROM player_game_history pgh
    LEFT JOIN player_hand_history phh ON pgh.user_id = phh.user_id AND pgh.game_id = phh.game_id
    WHERE pgh.user_id = p_user_id
    ON CONFLICT (user_id) DO UPDATE SET
        total_games_played = EXCLUDED.total_games_played,
        total_hands_played = EXCLUDED.total_hands_played,
        total_hands_won = EXCLUDED.total_hands_won,
        total_buy_ins = EXCLUDED.total_buy_ins,
        total_cash_outs = EXCLUDED.total_cash_outs,
        game_win_rate = EXCLUDED.game_win_rate,
        hand_win_rate = EXCLUDED.hand_win_rate,
        last_game_played_at = EXCLUDED.last_game_played_at,
        last_hand_played_at = EXCLUDED.last_hand_played_at,
        updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql;

SELECT 'Migration 018c_player_history completed - player history tables added' AS result;
