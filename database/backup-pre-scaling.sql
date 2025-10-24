-- Database Checkpoint: Pre-Scaling Schema
-- Created: 2024-01-15
-- Purpose: Rollback point before implementing scaling features
-- 
-- To restore this checkpoint:
-- 1. Drop all new tables created after this point
-- 2. Run the rollback statements below
-- 3. Restore from this backup if needed

-- ============================================
-- BACKUP CURRENT SCHEMA STATE
-- ============================================

-- Current tables (as of checkpoint):
-- - rooms, room_players, room_seats, room_spectators
-- - games, players, hands, actions, pots, hand_history
-- - user_profiles, audit_log, chips_transactions, chips_pending
-- - rejoin_tokens, table_stakes, user_sessions
-- - domain_events, event_snapshots, profiles

-- ============================================
-- ROLLBACK PROCEDURES
-- ============================================

-- If you need to rollback, run these in order:

-- 1. Drop new tables (if they exist)
-- DROP TABLE IF EXISTS username_changes CASCADE;
-- DROP TABLE IF EXISTS role_permissions CASCADE;
-- DROP TABLE IF EXISTS player_aliases CASCADE;
-- DROP TABLE IF EXISTS friendships CASCADE;
-- DROP TABLE IF EXISTS clubs CASCADE;
-- DROP TABLE IF EXISTS club_members CASCADE;
-- DROP TABLE IF EXISTS conversations CASCADE;
-- DROP TABLE IF EXISTS conversation_members CASCADE;
-- DROP TABLE IF EXISTS messages CASCADE;
-- DROP TABLE IF EXISTS message_reads CASCADE;
-- DROP TABLE IF EXISTS message_flags CASCADE;
-- DROP TABLE IF EXISTS player_game_history CASCADE;
-- DROP TABLE IF EXISTS player_hand_history CASCADE;
-- DROP TABLE IF EXISTS hand_fingerprints CASCADE;
-- DROP TABLE IF EXISTS hand_embeddings CASCADE;
-- DROP TABLE IF EXISTS player_stats_daily CASCADE;
-- DROP TABLE IF EXISTS gto_solutions CASCADE;
-- DROP TABLE IF EXISTS user_blocks CASCADE;
-- DROP TABLE IF EXISTS reports CASCADE;
-- DROP TABLE IF EXISTS announcements CASCADE;
-- DROP TABLE IF EXISTS admin_actions CASCADE;

-- 2. Remove new columns from user_profiles
-- ALTER TABLE user_profiles DROP COLUMN IF EXISTS global_username;
-- ALTER TABLE user_profiles DROP COLUMN IF EXISTS display_name;
-- ALTER TABLE user_profiles DROP COLUMN IF EXISTS is_online;
-- ALTER TABLE user_profiles DROP COLUMN IF EXISTS last_seen;
-- ALTER TABLE user_profiles DROP COLUMN IF EXISTS user_role;
-- ALTER TABLE user_profiles DROP COLUMN IF EXISTS username_changed_at;
-- ALTER TABLE user_profiles DROP COLUMN IF EXISTS username_change_count;
-- ALTER TABLE user_profiles DROP COLUMN IF EXISTS max_username_changes;

-- 3. Drop new functions
-- DROP FUNCTION IF EXISTS can_change_username(UUID);
-- DROP FUNCTION IF EXISTS has_permission(UUID, VARCHAR, VARCHAR);
-- DROP FUNCTION IF EXISTS set_updated_at();

-- 4. Drop new indexes
-- DROP INDEX IF EXISTS idx_user_profiles_global_username;
-- DROP INDEX IF EXISTS idx_user_profiles_user_role;
-- DROP INDEX IF EXISTS idx_username_changes_user_date;
-- DROP INDEX IF EXISTS idx_username_changes_new_username;

-- ============================================
-- CURRENT DATA BACKUP
-- ============================================

-- Export current data (run these to backup data)
-- pg_dump --data-only --table=user_profiles > user_profiles_backup.sql
-- pg_dump --data-only --table=rooms > rooms_backup.sql
-- pg_dump --data-only --table=games > games_backup.sql
-- pg_dump --data-only --table=hands > hands_backup.sql

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these to verify current state:
-- SELECT COUNT(*) FROM user_profiles;
-- SELECT COUNT(*) FROM rooms;
-- SELECT COUNT(*) FROM games;
-- SELECT COUNT(*) FROM hands;
-- SELECT COUNT(*) FROM actions;

-- ============================================
-- CHECKPOINT COMPLETE
-- ============================================

-- This checkpoint was created before implementing:
-- 1. Global username system
-- 2. Role-based access control (user, admin, god)
-- 3. Social features (friends, clubs, messaging)
-- 4. Player history and analytics
-- 5. AI infrastructure (hand fingerprints, GTO)
-- 6. Moderation tools (blocks, reports, admin actions)

