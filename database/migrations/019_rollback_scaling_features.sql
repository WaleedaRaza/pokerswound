-- Rollback Migration: Scaling Features
-- Date: 2024-01-15
-- Purpose: Rollback all scaling feature migrations (018a through 018e)
-- WARNING: This will delete all data in the new tables!

-- Drop tables in reverse order to avoid foreign key conflicts

-- Moderation and Admin Features (018e)
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS moderation_queue CASCADE;
DROP TABLE IF EXISTS ban_appeals CASCADE;
DROP TABLE IF EXISTS user_bans CASCADE;
DROP TABLE IF EXISTS user_warnings CASCADE;
DROP TABLE IF EXISTS announcement_views CASCADE;
DROP TABLE IF EXISTS system_announcements CASCADE;
DROP TABLE IF EXISTS admin_actions CASCADE;
DROP TABLE IF EXISTS user_reports CASCADE;
DROP TABLE IF EXISTS user_blocks CASCADE;

-- AI Infrastructure (018d)
DROP TABLE IF EXISTS ai_analysis_jobs CASCADE;
DROP TABLE IF EXISTS ai_model_performance CASCADE;
DROP TABLE IF EXISTS player_behavior_patterns CASCADE;
DROP TABLE IF EXISTS gto_solutions CASCADE;
DROP TABLE IF EXISTS hand_embeddings CASCADE;
DROP TABLE IF EXISTS hand_fingerprints CASCADE;

-- Player History (018c)
DROP TABLE IF EXISTS player_notes CASCADE;
DROP TABLE IF EXISTS player_achievements CASCADE;
DROP TABLE IF EXISTS player_statistics CASCADE;
DROP TABLE IF EXISTS player_hand_history CASCADE;
DROP TABLE IF EXISTS player_game_history CASCADE;

-- Social Features (018b)
DROP TABLE IF EXISTS message_flags CASCADE;
DROP TABLE IF EXISTS message_reads CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_members CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS club_members CASCADE;
DROP TABLE IF EXISTS clubs CASCADE;
DROP TABLE IF EXISTS friendships CASCADE;
DROP TABLE IF EXISTS player_aliases CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS username_changes CASCADE;

-- User Profile Enhancements (018a) - Remove added columns
ALTER TABLE user_profiles DROP COLUMN IF EXISTS global_username;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS display_name;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS is_online;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS last_seen;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS user_role;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS username_changed_at;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS username_change_count;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS max_username_changes;

-- Drop constraints and indexes added in 018a
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_global_username_key;
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_username_len;
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_global_username_format;
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_username_changes_limit;

DROP INDEX IF EXISTS idx_user_profiles_global_username;
DROP INDEX IF EXISTS idx_user_profiles_user_role;

-- Drop functions created in migrations
DROP FUNCTION IF EXISTS can_change_username(UUID, VARCHAR(50));
DROP FUNCTION IF EXISTS has_permission(UUID, VARCHAR(50), VARCHAR(50));
DROP FUNCTION IF EXISTS update_player_statistics(UUID);
DROP FUNCTION IF EXISTS find_similar_hands(vector(1536), INTEGER, DECIMAL);
DROP FUNCTION IF EXISTS get_gto_solution(VARCHAR(20), VARCHAR(20), DECIMAL(8,4), DECIMAL(8,4), DECIMAL(8,4), VARCHAR(64), VARCHAR(64), VARCHAR(15));
DROP FUNCTION IF EXISTS is_user_blocked(UUID, UUID, VARCHAR(20));
DROP FUNCTION IF EXISTS is_user_banned(UUID);
DROP FUNCTION IF EXISTS get_system_setting(VARCHAR(100));
DROP FUNCTION IF EXISTS log_admin_action(UUID, VARCHAR(50), TEXT, UUID, UUID, VARCHAR(30), TEXT, JSONB);

-- Drop pgvector extension if it was added
DROP EXTENSION IF EXISTS vector;

SELECT 'Rollback migration 019 completed - all scaling features removed' AS result;
