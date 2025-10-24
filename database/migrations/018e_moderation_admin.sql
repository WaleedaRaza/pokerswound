-- Migration: Moderation and Admin Features
-- Date: 2024-01-15
-- Purpose: Add user blocks, reports, admin features, and moderation tools

-- User blocks (blocking other users)
CREATE TABLE IF NOT EXISTS user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_user_id UUID NOT NULL,
    blocked_user_id UUID NOT NULL,
    block_type VARCHAR(20) DEFAULT 'USER' CHECK (block_type IN ('USER', 'MESSAGE', 'GAME_INVITE')),
    reason VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- NULL means permanent block
    
    UNIQUE (blocker_user_id, blocked_user_id, block_type)
);

-- User reports (reporting inappropriate behavior)
CREATE TABLE IF NOT EXISTS user_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_user_id UUID NOT NULL,
    reported_user_id UUID NOT NULL,
    report_type VARCHAR(30) NOT NULL CHECK (report_type IN (
        'HARASSMENT', 'CHEATING', 'ABUSIVE_LANGUAGE', 'SPAM', 
        'INAPPROPRIATE_CONTENT', 'REAL_MONEY_GAMBLING', 'UNDERAGE',
        'IMPERSONATION', 'SCAMMING', 'OTHER'
    )),
    report_category VARCHAR(20) DEFAULT 'BEHAVIOR' CHECK (report_category IN ('BEHAVIOR', 'CONTENT', 'TECHNICAL', 'OTHER')),
    
    -- Report details
    description TEXT NOT NULL,
    evidence_data JSONB DEFAULT '{}', -- screenshots, chat logs, etc.
    game_context JSONB DEFAULT '{}', -- game_id, hand_id, room_id if applicable
    chat_context JSONB DEFAULT '{}', -- message_id, conversation_id if applicable
    
    -- Report status
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED', 'ESCALATED')),
    priority VARCHAR(10) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    
    -- Moderation action
    assigned_moderator_id UUID,
    moderator_notes TEXT,
    action_taken VARCHAR(50), -- 'WARNING', 'TEMPORARY_BAN', 'PERMANENT_BAN', 'NO_ACTION'
    action_details JSONB DEFAULT '{}',
    action_taken_at TIMESTAMPTZ,
    
    -- Resolution
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin actions log (audit trail for admin actions)
CREATE TABLE IF NOT EXISTS admin_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- 'USER_BAN', 'USER_WARNING', 'MESSAGE_DELETE', etc.
    target_user_id UUID,
    target_resource_id UUID, -- could be message_id, game_id, etc.
    target_resource_type VARCHAR(30), -- 'MESSAGE', 'GAME', 'ROOM', 'USER'
    
    -- Action details
    action_description TEXT NOT NULL,
    action_data JSONB DEFAULT '{}',
    reason TEXT,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System announcements (admin-created announcements)
CREATE TABLE IF NOT EXISTS system_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    announcement_type VARCHAR(20) DEFAULT 'INFO' CHECK (announcement_type IN ('INFO', 'WARNING', 'MAINTENANCE', 'FEATURE_UPDATE')),
    priority VARCHAR(10) DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    
    -- Targeting
    target_audience VARCHAR(20) DEFAULT 'ALL' CHECK (target_audience IN ('ALL', 'AUTHENTICATED', 'GUESTS', 'ADMINS')),
    target_roles TEXT[] DEFAULT '{}', -- specific roles to target
    target_user_ids UUID[] DEFAULT '{}', -- specific users to target
    
    -- Display settings
    is_active BOOLEAN DEFAULT TRUE,
    show_on_login BOOLEAN DEFAULT FALSE,
    show_in_game BOOLEAN DEFAULT TRUE,
    show_in_lobby BOOLEAN DEFAULT TRUE,
    
    -- Timing
    published_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    -- Author
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcement views (track who has seen announcements)
CREATE TABLE IF NOT EXISTS announcement_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES system_announcements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE (announcement_id, user_id)
);

-- User warnings (formal warnings issued to users)
CREATE TABLE IF NOT EXISTS user_warnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    warning_type VARCHAR(30) NOT NULL CHECK (warning_type IN (
        'BEHAVIOR', 'LANGUAGE', 'CHEATING', 'SPAM', 'HARASSMENT', 'OTHER'
    )),
    warning_level INTEGER DEFAULT 1 CHECK (warning_level BETWEEN 1 AND 5),
    description TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    
    -- Issuer
    issued_by UUID NOT NULL,
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID,
    
    -- Escalation
    escalated_to_ban BOOLEAN DEFAULT FALSE,
    escalated_at TIMESTAMPTZ,
    escalated_by UUID
);

-- User bans (temporary or permanent bans)
CREATE TABLE IF NOT EXISTS user_bans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    ban_type VARCHAR(20) NOT NULL CHECK (ban_type IN ('TEMPORARY', 'PERMANENT', 'IP', 'HARDWARE')),
    ban_reason VARCHAR(100) NOT NULL,
    ban_details TEXT,
    
    -- Ban scope
    ban_scope VARCHAR(20) DEFAULT 'FULL' CHECK (ban_scope IN ('FULL', 'CHAT_ONLY', 'GAME_ONLY', 'ROOM_CREATION')),
    affected_services TEXT[] DEFAULT '{}', -- which services are affected
    
    -- Timing
    banned_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- NULL for permanent bans
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Issuer
    banned_by UUID NOT NULL,
    ban_duration_hours INTEGER, -- for temporary bans
    
    -- Appeal
    can_appeal BOOLEAN DEFAULT TRUE,
    appeal_deadline TIMESTAMPTZ,
    appeal_count INTEGER DEFAULT 0,
    last_appeal_at TIMESTAMPTZ,
    
    -- Resolution
    unbanned_at TIMESTAMPTZ,
    unbanned_by UUID,
    unban_reason TEXT
);

-- Ban appeals (users appealing their bans)
CREATE TABLE IF NOT EXISTS ban_appeals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ban_id UUID NOT NULL REFERENCES user_bans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    -- Appeal details
    appeal_reason TEXT NOT NULL,
    appeal_evidence JSONB DEFAULT '{}',
    additional_info TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'DENIED', 'WITHDRAWN')),
    
    -- Review
    reviewed_by UUID,
    review_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    
    -- Timestamps
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Moderation queue (tasks for moderators)
CREATE TABLE IF NOT EXISTS moderation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_type VARCHAR(30) NOT NULL CHECK (queue_type IN (
        'REPORT_REVIEW', 'APPEAL_REVIEW', 'CONTENT_MODERATION', 'USER_INVESTIGATION'
    )),
    priority INTEGER DEFAULT 0, -- higher number = higher priority
    
    -- Task details
    task_description TEXT NOT NULL,
    task_data JSONB NOT NULL,
    related_user_id UUID,
    related_resource_id UUID,
    related_resource_type VARCHAR(30),
    
    -- Assignment
    assigned_to UUID,
    assigned_at TIMESTAMPTZ,
    estimated_completion_minutes INTEGER,
    
    -- Status
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    completed_at TIMESTAMPTZ,
    completed_by UUID,
    completion_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System settings (configurable system parameters)
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(20) DEFAULT 'STRING' CHECK (setting_type IN ('STRING', 'INTEGER', 'BOOLEAN', 'JSON', 'DECIMAL')),
    description TEXT,
    category VARCHAR(50) DEFAULT 'GENERAL',
    
    -- Validation
    validation_regex VARCHAR(200),
    min_value DECIMAL,
    max_value DECIMAL,
    allowed_values TEXT[],
    
    -- Access control
    requires_admin BOOLEAN DEFAULT FALSE,
    requires_god BOOLEAN DEFAULT FALSE,
    
    -- Change tracking
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, category) VALUES
('max_username_length', '50', 'INTEGER', 'Maximum length for usernames', 'USER_MANAGEMENT'),
('min_username_length', '3', 'INTEGER', 'Minimum length for usernames', 'USER_MANAGEMENT'),
('username_change_cooldown_hours', '24', 'INTEGER', 'Hours between username changes', 'USER_MANAGEMENT'),
('max_username_changes_per_month', '3', 'INTEGER', 'Maximum username changes per month', 'USER_MANAGEMENT'),
('max_friends_count', '500', 'INTEGER', 'Maximum number of friends per user', 'SOCIAL'),
('max_club_members', '1000', 'INTEGER', 'Maximum members per club', 'SOCIAL'),
('max_message_length', '2000', 'INTEGER', 'Maximum length for chat messages', 'MESSAGING'),
('message_rate_limit_per_minute', '30', 'INTEGER', 'Maximum messages per minute per user', 'MESSAGING'),
('report_auto_escalation_threshold', '5', 'INTEGER', 'Number of reports before auto-escalation', 'MODERATION'),
('ban_appeal_cooldown_hours', '24', 'INTEGER', 'Hours between ban appeals', 'MODERATION'),
('maintenance_mode', 'false', 'BOOLEAN', 'Whether the system is in maintenance mode', 'SYSTEM'),
('registration_enabled', 'true', 'BOOLEAN', 'Whether new user registration is enabled', 'SYSTEM'),
('guest_mode_enabled', 'true', 'BOOLEAN', 'Whether guest mode is enabled', 'SYSTEM'),
('ai_analysis_enabled', 'true', 'BOOLEAN', 'Whether AI analysis features are enabled', 'AI'),
('gto_solver_enabled', 'true', 'BOOLEAN', 'Whether GTO solver is enabled', 'AI')
ON CONFLICT (setting_key) DO NOTHING;

-- Indexes for user_blocks
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_user_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_user_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_type ON user_blocks(block_type);
CREATE INDEX IF NOT EXISTS idx_user_blocks_active ON user_blocks(is_active);
CREATE INDEX IF NOT EXISTS idx_user_blocks_created_at ON user_blocks(created_at);

-- Indexes for user_reports
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON user_reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported ON user_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_type ON user_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_reports_priority ON user_reports(priority);
CREATE INDEX IF NOT EXISTS idx_user_reports_assigned_moderator ON user_reports(assigned_moderator_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_created_at ON user_reports(created_at);

-- Indexes for admin_actions
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target_user ON admin_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_type ON admin_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at);

-- Indexes for system_announcements
CREATE INDEX IF NOT EXISTS idx_announcements_type ON system_announcements(announcement_type);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON system_announcements(priority);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON system_announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_published_at ON system_announcements(published_at);
CREATE INDEX IF NOT EXISTS idx_announcements_expires_at ON system_announcements(expires_at);

-- Indexes for announcement_views
CREATE INDEX IF NOT EXISTS idx_announcement_views_announcement ON announcement_views(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_views_user ON announcement_views(user_id);

-- Indexes for user_warnings
CREATE INDEX IF NOT EXISTS idx_user_warnings_user ON user_warnings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_warnings_type ON user_warnings(warning_type);
CREATE INDEX IF NOT EXISTS idx_user_warnings_level ON user_warnings(warning_level);
CREATE INDEX IF NOT EXISTS idx_user_warnings_active ON user_warnings(is_active);
CREATE INDEX IF NOT EXISTS idx_user_warnings_issued_at ON user_warnings(issued_at);

-- Indexes for user_bans
CREATE INDEX IF NOT EXISTS idx_user_bans_user ON user_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bans_type ON user_bans(ban_type);
CREATE INDEX IF NOT EXISTS idx_user_bans_active ON user_bans(is_active);
CREATE INDEX IF NOT EXISTS idx_user_bans_expires_at ON user_bans(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_bans_banned_at ON user_bans(banned_at);

-- Indexes for ban_appeals
CREATE INDEX IF NOT EXISTS idx_ban_appeals_ban ON ban_appeals(ban_id);
CREATE INDEX IF NOT EXISTS idx_ban_appeals_user ON ban_appeals(user_id);
CREATE INDEX IF NOT EXISTS idx_ban_appeals_status ON ban_appeals(status);
CREATE INDEX IF NOT EXISTS idx_ban_appeals_submitted_at ON ban_appeals(submitted_at);

-- Indexes for moderation_queue
CREATE INDEX IF NOT EXISTS idx_moderation_queue_type ON moderation_queue(queue_type);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_priority ON moderation_queue(priority);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_assigned_to ON moderation_queue(assigned_to);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_created_at ON moderation_queue(created_at);

-- Indexes for system_settings
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_requires_admin ON system_settings(requires_admin);

-- Function to check if user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(
    p_blocker_user_id UUID,
    p_blocked_user_id UUID,
    p_block_type VARCHAR(20) DEFAULT 'USER'
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_blocks 
        WHERE blocker_user_id = p_blocker_user_id 
          AND blocked_user_id = p_blocked_user_id 
          AND block_type = p_block_type
          AND is_active = TRUE
          AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is banned
CREATE OR REPLACE FUNCTION is_user_banned(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_bans 
        WHERE user_id = p_user_id 
          AND is_active = TRUE
          AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get system setting value
CREATE OR REPLACE FUNCTION get_system_setting(p_setting_key VARCHAR(100))
RETURNS TEXT AS $$
DECLARE
    setting_value TEXT;
BEGIN
    SELECT setting_value INTO setting_value
    FROM system_settings 
    WHERE setting_key = p_setting_key;
    
    RETURN COALESCE(setting_value, '');
END;
$$ LANGUAGE plpgsql;

-- Function to log admin action
CREATE OR REPLACE FUNCTION log_admin_action(
    p_admin_user_id UUID,
    p_action_type VARCHAR(50),
    p_action_description TEXT,
    p_target_user_id UUID DEFAULT NULL,
    p_target_resource_id UUID DEFAULT NULL,
    p_target_resource_type VARCHAR(30) DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_action_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    action_id UUID;
BEGIN
    INSERT INTO admin_actions (
        admin_user_id, action_type, action_description, target_user_id,
        target_resource_id, target_resource_type, reason, action_data
    ) VALUES (
        p_admin_user_id, p_action_type, p_action_description, p_target_user_id,
        p_target_resource_id, p_target_resource_type, p_reason, p_action_data
    ) RETURNING id INTO action_id;
    
    RETURN action_id;
END;
$$ LANGUAGE plpgsql;

SELECT 'Migration 018e_moderation_admin completed - moderation and admin features added' AS result;
