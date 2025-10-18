-- Migration: AI Infrastructure
-- Date: 2024-01-15
-- Purpose: Add AI analysis features, hand fingerprints, and analytics

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Hand fingerprints (unique hand signatures for analysis)
CREATE TABLE IF NOT EXISTS hand_fingerprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hand_id UUID,
    game_id VARCHAR(100) NOT NULL,
    
    -- Hand signature components
    hole_cards_hash VARCHAR(64) NOT NULL, -- SHA256 of sorted hole cards
    community_cards_hash VARCHAR(64) NOT NULL, -- SHA256 of sorted community cards
    position VARCHAR(20) NOT NULL, -- 'UTG', 'UTG+1', 'MP', 'CO', 'BTN', 'SB', 'BB'
    stack_to_pot_ratio DECIMAL(8,4), -- SPR = effective stack / pot size
    pot_odds DECIMAL(8,4), -- pot odds as decimal
    
    -- Action sequence fingerprint
    preflop_actions TEXT, -- e.g., "FOLD,CALL,RAISE"
    flop_actions TEXT,
    turn_actions TEXT,
    river_actions TEXT,
    action_sequence_hash VARCHAR(64) NOT NULL, -- SHA256 of full action sequence
    
    -- Hand strength indicators
    hand_strength_category VARCHAR(20), -- 'NUTS', 'STRONG', 'MEDIUM', 'WEAK', 'AIR'
    equity_vs_range DECIMAL(5,2), -- estimated equity against typical range
    fold_equity DECIMAL(5,2), -- estimated fold equity
    
    -- Betting patterns
    is_bluff BOOLEAN DEFAULT FALSE,
    is_value_bet BOOLEAN DEFAULT FALSE,
    is_semi_bluff BOOLEAN DEFAULT FALSE,
    aggression_level INTEGER DEFAULT 0, -- 0-10 scale
    
    -- Outcome
    final_outcome VARCHAR(20), -- 'WIN', 'LOSS', 'TIE', 'FOLD'
    showdown_reached BOOLEAN DEFAULT FALSE,
    pot_winnings BIGINT DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    analyzed_at TIMESTAMPTZ,
    
    -- Unique constraint on hand signature
    UNIQUE (hole_cards_hash, community_cards_hash, action_sequence_hash, position)
);

-- Hand embeddings (vector representations for ML)
CREATE TABLE IF NOT EXISTS hand_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hand_fingerprint_id UUID NOT NULL REFERENCES hand_fingerprints(id) ON DELETE CASCADE,
    
    -- Vector embedding (1536 dimensions for OpenAI-style embeddings)
    embedding vector(1536),
    
    -- Embedding metadata
    embedding_model VARCHAR(50) NOT NULL, -- 'openai-ada-002', 'custom-poker-v1', etc.
    embedding_version VARCHAR(20) NOT NULL,
    embedding_dimensions INTEGER DEFAULT 1536,
    
    -- Context for embedding
    context_window_size INTEGER DEFAULT 100, -- number of previous hands included
    context_hand_ids UUID[], -- array of previous hand IDs used in context
    
    -- Quality metrics
    confidence_score DECIMAL(5,4), -- 0.0 to 1.0
    similarity_threshold DECIMAL(5,4), -- minimum similarity for clustering
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GTO (Game Theory Optimal) solutions cache
CREATE TABLE IF NOT EXISTS gto_solutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Problem specification
    game_type VARCHAR(20) NOT NULL DEFAULT 'TEXAS_HOLDEM',
    position VARCHAR(20) NOT NULL,
    stack_depth DECIMAL(8,4) NOT NULL, -- effective stack / big blind
    pot_size DECIMAL(8,4) NOT NULL,
    bet_size DECIMAL(8,4) NOT NULL,
    
    -- Hand specification
    hole_cards_hash VARCHAR(64) NOT NULL,
    community_cards_hash VARCHAR(64) NOT NULL,
    street VARCHAR(15) NOT NULL, -- 'PREFLOP', 'FLOP', 'TURN', 'RIVER'
    
    -- GTO solution
    optimal_action VARCHAR(20) NOT NULL, -- 'FOLD', 'CALL', 'RAISE', 'ALL_IN'
    optimal_frequency DECIMAL(5,4) NOT NULL, -- 0.0 to 1.0
    optimal_bet_size DECIMAL(8,4),
    
    -- Alternative actions with frequencies
    alternative_actions JSONB DEFAULT '{}', -- {"CALL": 0.3, "RAISE": 0.1}
    
    -- Solution metadata
    solver_type VARCHAR(30) NOT NULL, -- 'PIO_SOLVER', 'GTO_PLUS', 'CUSTOM'
    solver_version VARCHAR(20) NOT NULL,
    computation_time_seconds INTEGER,
    iterations INTEGER,
    
    -- Quality metrics
    convergence_threshold DECIMAL(10,8),
    exploitability DECIMAL(10,8), -- how exploitable the solution is
    
    -- Caching
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    
    -- Unique constraint on problem specification
    UNIQUE (game_type, position, stack_depth, pot_size, bet_size, 
            hole_cards_hash, community_cards_hash, street, solver_type)
);

-- Player behavior patterns (ML-derived insights)
CREATE TABLE IF NOT EXISTS player_behavior_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Pattern identification
    pattern_type VARCHAR(50) NOT NULL, -- 'TIGHT_AGGRESSIVE', 'LOOSE_PASSIVE', 'MANIAC', etc.
    pattern_confidence DECIMAL(5,4) NOT NULL, -- 0.0 to 1.0
    pattern_strength DECIMAL(5,4) NOT NULL, -- how strongly the pattern is expressed
    
    -- Pattern characteristics
    vpip_range DECIMAL(5,2) NOT NULL, -- [min, max] VPIP for this pattern
    pfr_range DECIMAL(5,2) NOT NULL, -- [min, max] PFR for this pattern
    aggression_range DECIMAL(5,2) NOT NULL, -- [min, max] aggression factor
    position_preferences JSONB DEFAULT '{}', -- which positions they prefer
    
    -- Behavioral indicators
    bluff_frequency DECIMAL(5,4), -- how often they bluff
    value_bet_frequency DECIMAL(5,4), -- how often they value bet
    fold_frequency DECIMAL(5,4), -- how often they fold to aggression
    call_frequency DECIMAL(5,4), -- how often they call
    
    -- Temporal patterns
    time_of_day_preferences JSONB DEFAULT '{}', -- when they play most
    session_length_patterns JSONB DEFAULT '{}', -- typical session lengths
    tilt_indicators JSONB DEFAULT '{}', -- signs of tilt behavior
    
    -- Pattern evolution
    pattern_emerged_at TIMESTAMPTZ,
    pattern_stable_since TIMESTAMPTZ,
    pattern_confidence_history JSONB DEFAULT '[]', -- confidence over time
    
    -- Analysis metadata
    analysis_model VARCHAR(50) NOT NULL,
    analysis_version VARCHAR(20) NOT NULL,
    sample_size INTEGER NOT NULL, -- number of hands analyzed
    analysis_period_days INTEGER NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI model performance tracking
CREATE TABLE IF NOT EXISTS ai_model_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(20) NOT NULL,
    model_type VARCHAR(30) NOT NULL, -- 'HAND_ANALYSIS', 'BEHAVIOR_PREDICTION', 'GTO_SOLVER'
    
    -- Performance metrics
    accuracy DECIMAL(5,4), -- overall accuracy
    precision DECIMAL(5,4), -- true positives / (true positives + false positives)
    recall DECIMAL(5,4), -- true positives / (true positives + false negatives)
    f1_score DECIMAL(5,4), -- harmonic mean of precision and recall
    
    -- Specific metrics by task
    hand_prediction_accuracy DECIMAL(5,4),
    behavior_classification_accuracy DECIMAL(5,4),
    gto_solution_quality DECIMAL(5,4),
    
    -- Training data
    training_samples INTEGER,
    validation_samples INTEGER,
    test_samples INTEGER,
    training_duration_hours DECIMAL(8,2),
    
    -- Model metadata
    hyperparameters JSONB DEFAULT '{}',
    feature_importance JSONB DEFAULT '{}',
    model_size_mb DECIMAL(8,2),
    
    -- Deployment info
    deployed_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT FALSE,
    performance_threshold DECIMAL(5,4), -- minimum performance to stay active
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE (model_name, model_version)
);

-- AI analysis jobs (for background processing)
CREATE TABLE IF NOT EXISTS ai_analysis_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(50) NOT NULL, -- 'HAND_ANALYSIS', 'BEHAVIOR_ANALYSIS', 'GTO_SOLVE'
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED'
    
    -- Job parameters
    parameters JSONB NOT NULL DEFAULT '{}',
    priority INTEGER DEFAULT 0, -- higher number = higher priority
    
    -- Input data
    input_data JSONB DEFAULT '{}',
    input_hand_ids UUID[],
    input_user_ids UUID[],
    
    -- Results
    results JSONB DEFAULT '{}',
    output_data JSONB DEFAULT '{}',
    
    -- Processing info
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    processing_time_seconds INTEGER,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Resource usage
    cpu_usage_percent DECIMAL(5,2),
    memory_usage_mb INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for hand_fingerprints
CREATE INDEX IF NOT EXISTS idx_hand_fingerprints_hand ON hand_fingerprints(hand_id);
CREATE INDEX IF NOT EXISTS idx_hand_fingerprints_game ON hand_fingerprints(game_id);
CREATE INDEX IF NOT EXISTS idx_hand_fingerprints_cards_hash ON hand_fingerprints(hole_cards_hash, community_cards_hash);
CREATE INDEX IF NOT EXISTS idx_hand_fingerprints_action_hash ON hand_fingerprints(action_sequence_hash);
CREATE INDEX IF NOT EXISTS idx_hand_fingerprints_position ON hand_fingerprints(position);
CREATE INDEX IF NOT EXISTS idx_hand_fingerprints_outcome ON hand_fingerprints(final_outcome);
CREATE INDEX IF NOT EXISTS idx_hand_fingerprints_created_at ON hand_fingerprints(created_at);

-- Indexes for hand_embeddings
CREATE INDEX IF NOT EXISTS idx_hand_embeddings_fingerprint ON hand_embeddings(hand_fingerprint_id);
CREATE INDEX IF NOT EXISTS idx_hand_embeddings_model ON hand_embeddings(embedding_model);
CREATE INDEX IF NOT EXISTS idx_hand_embeddings_created_at ON hand_embeddings(created_at);

-- Vector similarity search index (using HNSW for fast approximate nearest neighbor)
CREATE INDEX IF NOT EXISTS idx_hand_embeddings_vector ON hand_embeddings 
USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- Indexes for gto_solutions
CREATE INDEX IF NOT EXISTS idx_gto_solutions_game_type ON gto_solutions(game_type);
CREATE INDEX IF NOT EXISTS idx_gto_solutions_position ON gto_solutions(position);
CREATE INDEX IF NOT EXISTS idx_gto_solutions_cards_hash ON gto_solutions(hole_cards_hash, community_cards_hash);
CREATE INDEX IF NOT EXISTS idx_gto_solutions_street ON gto_solutions(street);
CREATE INDEX IF NOT EXISTS idx_gto_solutions_solver ON gto_solutions(solver_type);
CREATE INDEX IF NOT EXISTS idx_gto_solutions_created_at ON gto_solutions(created_at);
CREATE INDEX IF NOT EXISTS idx_gto_solutions_expires_at ON gto_solutions(expires_at);

-- Indexes for player_behavior_patterns
CREATE INDEX IF NOT EXISTS idx_player_behavior_user ON player_behavior_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_player_behavior_type ON player_behavior_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_player_behavior_confidence ON player_behavior_patterns(pattern_confidence);
CREATE INDEX IF NOT EXISTS idx_player_behavior_created_at ON player_behavior_patterns(created_at);

-- Indexes for ai_model_performance
CREATE INDEX IF NOT EXISTS idx_ai_model_name ON ai_model_performance(model_name);
CREATE INDEX IF NOT EXISTS idx_ai_model_type ON ai_model_performance(model_type);
CREATE INDEX IF NOT EXISTS idx_ai_model_active ON ai_model_performance(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_model_accuracy ON ai_model_performance(accuracy);

-- Indexes for ai_analysis_jobs
CREATE INDEX IF NOT EXISTS idx_ai_jobs_type ON ai_analysis_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai_analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_priority ON ai_analysis_jobs(priority);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_created_at ON ai_analysis_jobs(created_at);

-- Function to find similar hands using vector similarity
CREATE OR REPLACE FUNCTION find_similar_hands(
    p_embedding vector(1536),
    p_limit INTEGER DEFAULT 10,
    p_similarity_threshold DECIMAL DEFAULT 0.8
)
RETURNS TABLE (
    hand_fingerprint_id UUID,
    similarity DECIMAL,
    hole_cards_hash VARCHAR(64),
    community_cards_hash VARCHAR(64),
    action_sequence_hash VARCHAR(64),
    final_outcome VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        he.hand_fingerprint_id,
        1 - (he.embedding <=> p_embedding) as similarity,
        hf.hole_cards_hash,
        hf.community_cards_hash,
        hf.action_sequence_hash,
        hf.final_outcome
    FROM hand_embeddings he
    JOIN hand_fingerprints hf ON he.hand_fingerprint_id = hf.id
    WHERE 1 - (he.embedding <=> p_embedding) >= p_similarity_threshold
    ORDER BY he.embedding <=> p_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get GTO solution for a specific situation
CREATE OR REPLACE FUNCTION get_gto_solution(
    p_game_type VARCHAR(20),
    p_position VARCHAR(20),
    p_stack_depth DECIMAL(8,4),
    p_pot_size DECIMAL(8,4),
    p_bet_size DECIMAL(8,4),
    p_hole_cards_hash VARCHAR(64),
    p_community_cards_hash VARCHAR(64),
    p_street VARCHAR(15)
)
RETURNS TABLE (
    optimal_action VARCHAR(20),
    optimal_frequency DECIMAL(5,4),
    optimal_bet_size DECIMAL(8,4),
    alternative_actions JSONB,
    solver_type VARCHAR(30),
    confidence DECIMAL(10,8)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gs.optimal_action,
        gs.optimal_frequency,
        gs.optimal_bet_size,
        gs.alternative_actions,
        gs.solver_type,
        (1.0 - gs.exploitability) as confidence
    FROM gto_solutions gs
    WHERE gs.game_type = p_game_type
      AND gs.position = p_position
      AND gs.stack_depth = p_stack_depth
      AND gs.pot_size = p_pot_size
      AND gs.bet_size = p_bet_size
      AND gs.hole_cards_hash = p_hole_cards_hash
      AND gs.community_cards_hash = p_community_cards_hash
      AND gs.street = p_street
      AND (gs.expires_at IS NULL OR gs.expires_at > NOW())
    ORDER BY gs.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

SELECT 'Migration 018d_ai_infrastructure completed - AI analysis features added' AS result;
