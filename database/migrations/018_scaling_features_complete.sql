-- Migration: Complete Scaling Features Implementation
-- Date: 2024-01-15
-- Purpose: Add all scaling features for social, analytics, AI, and moderation
-- Rollback: Use backup-pre-scaling.sql

-- ============================================
-- 1. ENHANCED USER PROFILES
-- ============================================

-- Add new columns to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS global_username VARCHAR(50),
ADD COLUMN IF NOT EXISTS display_name VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS user_role VARCHAR(20) DEFAULT 'user',
ADD COLUMN IF NOT EXISTS username_changed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS username_change_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_username_changes INTEGER DEFAULT 3;

-- Add constraints for username management
ALTER TABLE user_profiles 
ADD CONSTRAINT IF NOT EXISTS user_profiles_global_username_len 
CHECK (global_username IS NULL OR length(global_username) BETWEEN 3 AND 50),
ADD CONSTRAINT IF NOT EXISTS user_profiles_global_username_format 
CHECK (global_username IS NULL OR global_username ~ '^[a-zA-Z0-9_-]+$'),
ADD CONSTRAINT IF NOT EXISTS user_profiles_role_check 
CHECK (user_role IN ('user', 'admin', 'god')),
ADD CONSTRAINT IF NOT EXISTS user_profiles_username_changes_limit 
CHECK (username_change_count <= max_username_changes);

-- Add unique constraint for global_username
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_global_username_key 
ON user_profiles(global_username) WHERE global_username IS NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_global_username ON user_profiles(global_username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_role ON user_profiles(user_role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_online ON user_profiles(is_online);

-- ============================================
-- 2. USERNAME CHANGE TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS username_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    old_username VARCHAR(50),
    new_username VARCHAR(50) NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_username_changes_user_date ON username_changes(user_id, changed_at);
CREATE INDEX IF NOT EXISTS idx_username_changes_new_username ON username_changes(new_username);

-- ============================================
-- 3. ROLE-BASED ACCESS CONTROL
-- ============================================

CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(20) NOT NULL,
    permission VARCHAR(50) NOT NULL,
    resource VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (role, permission, resource)
);

-- Insert default permissions
INSERT INTO role_permissions (role, permission, resource) VALUES
-- User permissions
('user', 'read', 'own_profile'),
('user', 'update', 'own_profile'),
('user', 'create', 'friendships'),
('user', 'create', 'messages'),
('user', 'create', 'player_aliases'),
('user', 'read', 'own_game_history'),
('user', 'read', 'own_hand_history'),

-- Admin permissions
('admin', 'read', 'all_profiles'),
('admin', 'update', 'all_profiles'),
('admin', 'delete', 'messages'),
('admin', 'read', 'reports'),
('admin', 'update', 'reports'),
('admin', 'create', 'announcements'),
('admin', 'moderate', 'users'),
('admin', 'view', 'analytics'),

-- God permissions
('god', 'create', 'admin_users'),
('god', 'delete', 'admin_users'),
('god', 'update', 'system_settings'),
('god', 'access', 'all_data'),
('god', 'bypass', 'rate_limits'),
('god', 'manage', 'roles')
ON CONFLICT (role, permission, resource) DO NOTHING;

-- ============================================
-- 4. PER-GAME ALIASES
-- ============================================

CREATE TABLE IF NOT EXISTS player_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id VARCHAR(100) NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    alias VARCHAR(32) NOT NULL,
    is_admin_override BOOLEAN DEFAULT FALSE,
    set_by_user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (game_id, user_id)
);

ALTER TABLE player_aliases 
ADD CONSTRAINT IF NOT EXISTS player_aliases_alias_len 
CHECK (length(alias) BETWEEN 1 AND 32),
ADD CONSTRAINT IF NOT EXISTS player_aliases_alias_format 
CHECK (alias ~ '^[a-zA-Z0-9_-]+$');

CREATE INDEX IF NOT EXISTS idx_player_aliases_game ON player_aliases(game_id);
CREATE INDEX IF NOT EXISTS idx_player_aliases_user ON player_aliases(user_id);
CREATE INDEX IF NOT EXISTS idx_player_aliases_alias ON player_aliases(alias);

-- ============================================
-- 5. SOCIAL FEATURES
-- ============================================

-- Friendships
CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL,
    addressee_id UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (requester_id, addressee_id)
);

ALTER TABLE friendships 
ADD CONSTRAINT IF NOT EXISTS friendships_status_check 
CHECK (status IN ('pending', 'accepted', 'blocked'));

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- Clubs
CREATE TABLE IF NOT EXISTS clubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_private BOOLEAN DEFAULT false,
    owner_id UUID NOT NULL,
    max_members INTEGER DEFAULT 500,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS club_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    invited_by UUID,
    UNIQUE (club_id, user_id)
);

ALTER TABLE club_members 
ADD CONSTRAINT IF NOT EXISTS club_members_role_check 
CHECK (role IN ('member', 'moderator', 'admin', 'owner'));

CREATE INDEX IF NOT EXISTS idx_clubs_owner ON clubs(owner_id);
CREATE INDEX IF NOT EXISTS idx_club_members_club ON club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_user ON club_members(user_id);
CREATE INDEX IF NOT EXISTS idx_club_members_role ON club_members(role);

-- ============================================
-- 6. MESSAGING SYSTEM
-- ============================================

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL,
    name VARCHAR(100),
    is_admin_only BOOLEAN DEFAULT FALSE,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE conversations 
ADD CONSTRAINT IF NOT EXISTS conversations_type_check 
CHECK (type IN ('dm', 'room', 'club', 'admin'));

CREATE TABLE IF NOT EXISTS conversation_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (conversation_id, user_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    body TEXT NOT NULL,
    meta JSONB,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_by UUID,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS message_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    flagged_by UUID NOT NULL,
    flag_reason VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for messaging
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversation_members_conv ON conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_message_reads_message ON message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user ON message_reads(user_id);

-- ============================================
-- 7. PLAYER HISTORY & ANALYTICS
-- ============================================

-- Player game history
CREATE TYPE player_game_result AS ENUM ('win','loss','breakeven','unknown');

CREATE TABLE IF NOT EXISTS player_game_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    game_id VARCHAR(100) NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    seat_number INTEGER,
    hands_played INTEGER NOT NULL DEFAULT 0,
    chips_bought_in INTEGER NOT NULL DEFAULT 0,
    chips_cashed_out INTEGER NOT NULL DEFAULT 0,
    net_chips INTEGER NOT NULL DEFAULT 0,
    vpip NUMERIC(5,2),
    pfr NUMERIC(5,2),
    three_bet NUMERIC(5,2),
    wwsf NUMERIC(5,2),
    wsd NUMERIC(5,2),
    agg_factor NUMERIC(6,2),
    result player_game_result DEFAULT 'unknown',
    played_as_role VARCHAR(20),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, game_id)
);

-- Player hand history
CREATE TYPE hand_outcome AS ENUM ('won','lost','split','folded','all_in_lost','all_in_won','unknown');

CREATE TABLE IF NOT EXISTS player_hand_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    hand_id UUID NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
    game_id VARCHAR(100) NOT NULL,
    seat_number INTEGER,
    preflop_action TEXT,
    flop_action TEXT,
    turn_action TEXT,
    river_action TEXT,
    contributed INTEGER NOT NULL DEFAULT 0,
    won INTEGER NOT NULL DEFAULT 0,
    outcome hand_outcome DEFAULT 'unknown',
    all_in BOOLEAN DEFAULT FALSE,
    show_down BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, hand_id)
);

-- Daily player stats
CREATE TABLE IF NOT EXISTS player_stats_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    date DATE NOT NULL,
    hands_played INTEGER DEFAULT 0,
    vpip NUMERIC(5,2),
    pfr NUMERIC(5,2),
    three_bet NUMERIC(5,2),
    wwsf NUMERIC(5,2),
    wsd NUMERIC(5,2),
    aggression_factor NUMERIC(6,2),
    net_chips INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, date)
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_pgh_user ON player_game_history(user_id);
CREATE INDEX IF NOT EXISTS idx_pgh_game ON player_game_history(game_id);
CREATE INDEX IF NOT EXISTS idx_pgh_result ON player_game_history(result);
CREATE INDEX IF NOT EXISTS idx_phh_user ON player_hand_history(user_id);
CREATE INDEX IF NOT EXISTS idx_phh_hand ON player_hand_history(hand_id);
CREATE INDEX IF NOT EXISTS idx_phh_game ON player_hand_history(game_id);
CREATE INDEX IF NOT EXISTS idx_psd_user ON player_stats_daily(user_id);
CREATE INDEX IF NOT EXISTS idx_psd_date ON player_stats_daily(date);

-- ============================================
-- 8. AI & GTO INFRASTRUCTURE
-- ============================================

-- Hand fingerprints
CREATE TABLE IF NOT EXISTS hand_fingerprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hand_id UUID NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
    fingerprint_hash VARCHAR(64) NOT NULL UNIQUE,
    canonical_representation TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hand embeddings (requires pgvector extension)
CREATE TABLE IF NOT EXISTS hand_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hand_id UUID NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
    embedding VECTOR(1536), -- Will be created if pgvector is available
    model_version VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GTO solutions
CREATE TABLE IF NOT EXISTS gto_solutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hand_id UUID NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
    solution_hash VARCHAR(64) NOT NULL,
    solution_data JSONB NOT NULL,
    model_version VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for AI features
CREATE INDEX IF NOT EXISTS idx_hand_fingerprints_hand ON hand_fingerprints(hand_id);
CREATE INDEX IF NOT EXISTS idx_hand_fingerprints_hash ON hand_fingerprints(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_hand_embeddings_hand ON hand_embeddings(hand_id);
CREATE INDEX IF NOT EXISTS idx_gto_solutions_hand ON gto_solutions(hand_id);
CREATE INDEX IF NOT EXISTS idx_gto_solutions_hash ON gto_solutions(solution_hash);

-- ============================================
-- 9. MODERATION & SAFETY
-- ============================================

-- User blocks
CREATE TABLE IF NOT EXISTS user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL,
    blocked_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (blocker_id, blocked_id)
);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL,
    reported_id UUID NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    description TEXT,
    evidence JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reports 
ADD CONSTRAINT IF NOT EXISTS reports_type_check 
CHECK (report_type IN ('cheating', 'harassment', 'spam', 'inappropriate', 'other')),
ADD CONSTRAINT IF NOT EXISTS reports_status_check 
CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed'));

-- Admin features
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    created_by UUID NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    target_roles TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS admin_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    target_user_id UUID,
    target_resource VARCHAR(50),
    details JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for moderation
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_type ON admin_actions(action_type);

-- ============================================
-- 10. UTILITY FUNCTIONS
-- ============================================

-- Username change validation
CREATE OR REPLACE FUNCTION can_change_username(user_id UUID) 
RETURNS BOOLEAN AS $$
DECLARE
    change_count INTEGER;
    max_changes INTEGER;
BEGIN
    -- Get user's change limits
    SELECT max_username_changes INTO max_changes
    FROM user_profiles 
    WHERE id = user_id;
    
    -- Count changes in last 30 days
    SELECT COUNT(*) INTO change_count
    FROM username_changes 
    WHERE user_id = $1 
    AND changed_at > NOW() - INTERVAL '30 days';
    
    -- Check if under limit
    RETURN change_count < COALESCE(max_changes, 3);
END;
$$ LANGUAGE plpgsql;

-- Permission checking
CREATE OR REPLACE FUNCTION has_permission(
    user_id UUID, 
    permission VARCHAR(50), 
    resource VARCHAR(50) DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    user_role VARCHAR(20);
    permission_exists BOOLEAN;
BEGIN
    -- Get user's role
    SELECT user_role INTO user_role
    FROM user_profiles 
    WHERE id = user_id;
    
    -- Check if permission exists for role
    SELECT EXISTS(
        SELECT 1 FROM role_permissions 
        WHERE role = user_role 
        AND permission = $2 
        AND (resource = $3 OR resource IS NULL)
    ) INTO permission_exists;
    
    RETURN COALESCE(permission_exists, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at() 
RETURNS TRIGGER AS $$
BEGIN 
    NEW.updated_at = NOW(); 
    RETURN NEW; 
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to mutable tables
DO $$
DECLARE
    table_name TEXT;
    tables_to_update TEXT[] := ARRAY[
        'user_profiles', 'player_aliases', 'friendships', 'clubs', 'club_members',
        'conversations', 'conversation_members', 'messages', 'player_game_history',
        'player_hand_history', 'announcements'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables_to_update
    LOOP
        -- Add updated_at column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = table_name AND column_name = 'updated_at'
        ) THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW()', table_name);
        END IF;
        
        -- Create trigger if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger 
            WHERE tgname = '_upd_' || table_name
        ) THEN
            EXECUTE format('CREATE TRIGGER _upd_%I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', 
                          table_name, table_name);
        END IF;
    END LOOP;
END;
$$;

-- ============================================
-- 11. MIGRATE EXISTING DATA
-- ============================================

-- Set global_username from existing username
UPDATE user_profiles 
SET global_username = username 
WHERE global_username IS NULL AND username IS NOT NULL;

-- Set default roles
UPDATE user_profiles 
SET user_role = 'user' 
WHERE user_role IS NULL;

-- Set your current user as admin (replace with actual ID)
UPDATE user_profiles 
SET user_role = 'admin' 
WHERE id = '7d3c1161-b937-4e7b-ac1e-793217cf4f73';

-- ============================================
-- 12. CREATE HELPFUL VIEWS
-- ============================================

-- User game history view
CREATE OR REPLACE VIEW v_user_game_history AS
SELECT
    pgh.user_id,
    pgh.game_id,
    g.created_at AS game_created_at,
    COALESCE(pa.alias, up.display_name, up.global_username, up.username) AS display_name_in_game,
    pgh.hands_played, 
    pgh.net_chips, 
    pgh.result,
    pgh.started_at, 
    pgh.ended_at
FROM player_game_history pgh
LEFT JOIN games g ON g.id = pgh.game_id
LEFT JOIN player_aliases pa ON pa.game_id = pgh.game_id AND pa.user_id = pgh.user_id
LEFT JOIN user_profiles up ON up.id = pgh.user_id;

-- User hand history view
CREATE OR REPLACE VIEW v_user_hand_history AS
SELECT
    phh.user_id, 
    phh.hand_id, 
    phh.game_id,
    h.hand_number, 
    h.status, 
    phh.outcome,
    phh.contributed, 
    phh.won, 
    phh.all_in, 
    phh.show_down,
    h.created_at
FROM player_hand_history phh
JOIN hands h ON h.id = phh.hand_id;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- This migration adds:
-- ✅ Global username system with rate limiting
-- ✅ Role-based access control (user, admin, god)
-- ✅ Social features (friends, clubs, messaging)
-- ✅ Player history and analytics
-- ✅ AI infrastructure (hand fingerprints, GTO)
-- ✅ Moderation tools (blocks, reports, admin actions)
-- ✅ Comprehensive indexing for performance
-- ✅ Utility functions for common operations
-- ✅ Data migration from existing schema

