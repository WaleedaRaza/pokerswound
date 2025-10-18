-- Migration: Social Features
-- Date: 2024-01-15
-- Purpose: Add friendships, clubs, and messaging system

-- Username change tracking
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

-- Role permissions
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

-- Per-game aliases
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
ADD CONSTRAINT player_aliases_alias_len 
CHECK (length(alias) BETWEEN 1 AND 32);

ALTER TABLE player_aliases 
ADD CONSTRAINT player_aliases_alias_format 
CHECK (alias ~ '^[a-zA-Z0-9_-]+$');

CREATE INDEX IF NOT EXISTS idx_player_aliases_game ON player_aliases(game_id);
CREATE INDEX IF NOT EXISTS idx_player_aliases_user ON player_aliases(user_id);
CREATE INDEX IF NOT EXISTS idx_player_aliases_alias ON player_aliases(alias);

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
ADD CONSTRAINT friendships_status_check 
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
ADD CONSTRAINT club_members_role_check 
CHECK (role IN ('member', 'moderator', 'admin', 'owner'));

CREATE INDEX IF NOT EXISTS idx_clubs_owner ON clubs(owner_id);
CREATE INDEX IF NOT EXISTS idx_club_members_club ON club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_user ON club_members(user_id);
CREATE INDEX IF NOT EXISTS idx_club_members_role ON club_members(role);

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
ADD CONSTRAINT conversations_type_check 
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

