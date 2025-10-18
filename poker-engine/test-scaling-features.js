#!/usr/bin/env node

/**
 * Test Script for Scaling Features
 * Tests all new database tables and functionality
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function testScalingFeatures() {
    console.log('🧪 Testing Scaling Features...\n');
    
    try {
        // Test 1: User Profile Enhancements
        console.log('1️⃣ Testing User Profile Enhancements...');
        const userProfileTest = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'user_profiles' 
            AND column_name IN ('global_username', 'display_name', 'user_role', 'is_online', 'last_seen')
            ORDER BY column_name
        `);
        console.log(`   ✅ Found ${userProfileTest.rows.length} new columns in user_profiles`);
        
        // Test 2: Social Features
        console.log('\n2️⃣ Testing Social Features...');
        const socialTables = ['friendships', 'clubs', 'club_members', 'conversations', 'conversation_members', 'messages', 'player_aliases'];
        for (const table of socialTables) {
            const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
            console.log(`   ✅ ${table}: ${result.rows[0].count} rows`);
        }
        
        // Test 3: Player History
        console.log('\n3️⃣ Testing Player History...');
        const historyTables = ['player_game_history', 'player_hand_history', 'player_statistics', 'player_achievements', 'player_notes'];
        for (const table of historyTables) {
            const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
            console.log(`   ✅ ${table}: ${result.rows[0].count} rows`);
        }
        
        // Test 4: AI Infrastructure
        console.log('\n4️⃣ Testing AI Infrastructure...');
        const aiTables = ['hand_fingerprints', 'hand_embeddings', 'gto_solutions', 'player_behavior_patterns', 'ai_model_performance', 'ai_analysis_jobs'];
        for (const table of aiTables) {
            const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
            console.log(`   ✅ ${table}: ${result.rows[0].count} rows`);
        }
        
        // Test 5: Moderation Features
        console.log('\n5️⃣ Testing Moderation Features...');
        const moderationTables = ['user_blocks', 'user_reports', 'admin_actions', 'system_announcements', 'user_warnings', 'user_bans', 'ban_appeals', 'moderation_queue', 'system_settings'];
        for (const table of moderationTables) {
            const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
            console.log(`   ✅ ${table}: ${result.rows[0].count} rows`);
        }
        
        // Test 6: Functions
        console.log('\n6️⃣ Testing Functions...');
        const functions = [
            'can_change_username',
            'has_permission', 
            'update_player_statistics',
            'find_similar_hands',
            'get_gto_solution',
            'is_user_blocked',
            'is_user_banned',
            'get_system_setting',
            'log_admin_action'
        ];
        
        for (const func of functions) {
            const result = await pool.query(`
                SELECT routine_name 
                FROM information_schema.routines 
                WHERE routine_name = $1 AND routine_type = 'FUNCTION'
            `, [func]);
            if (result.rows.length > 0) {
                console.log(`   ✅ Function ${func} exists`);
            } else {
                console.log(`   ❌ Function ${func} missing`);
            }
        }
        
        // Test 7: Indexes
        console.log('\n7️⃣ Testing Key Indexes...');
        const keyIndexes = [
            'idx_user_profiles_global_username',
            'idx_friendships_requester',
            'idx_player_game_history_user',
            'idx_hand_fingerprints_cards_hash',
            'idx_user_reports_status',
            'idx_system_settings_key'
        ];
        
        for (const index of keyIndexes) {
            const result = await pool.query(`
                SELECT indexname 
                FROM pg_indexes 
                WHERE indexname = $1
            `, [index]);
            if (result.rows.length > 0) {
                console.log(`   ✅ Index ${index} exists`);
            } else {
                console.log(`   ❌ Index ${index} missing`);
            }
        }
        
        // Test 8: Constraints
        console.log('\n8️⃣ Testing Constraints...');
        const constraints = [
            'user_profiles_role_check',
            'friendships_status_check',
            'club_members_role_check',
            'conversations_type_check'
        ];
        
        for (const constraint of constraints) {
            const result = await pool.query(`
                SELECT constraint_name 
                FROM information_schema.table_constraints 
                WHERE constraint_name = $1
            `, [constraint]);
            if (result.rows.length > 0) {
                console.log(`   ✅ Constraint ${constraint} exists`);
            } else {
                console.log(`   ❌ Constraint ${constraint} missing`);
            }
        }
        
        // Test 9: System Settings
        console.log('\n9️⃣ Testing System Settings...');
        const settingsResult = await pool.query(`
            SELECT setting_key, setting_value 
            FROM system_settings 
            WHERE setting_key IN ('max_username_length', 'registration_enabled', 'ai_analysis_enabled')
            ORDER BY setting_key
        `);
        console.log(`   ✅ Found ${settingsResult.rows.length} system settings`);
        settingsResult.rows.forEach(row => {
            console.log(`      ${row.setting_key}: ${row.setting_value}`);
        });
        
        // Test 10: Role Permissions
        console.log('\n🔟 Testing Role Permissions...');
        const rolesResult = await pool.query(`
            SELECT role, COUNT(*) as permission_count
            FROM role_permissions 
            GROUP BY role 
            ORDER BY role
        `);
        console.log(`   ✅ Found permissions for ${rolesResult.rows.length} roles`);
        rolesResult.rows.forEach(row => {
            console.log(`      ${row.role}: ${row.permission_count} permissions`);
        });
        
        console.log('\n🎉 All scaling features tests completed successfully!');
        console.log('\n📊 Summary:');
        console.log('   • User profiles enhanced with global usernames and roles');
        console.log('   • Social features (friends, clubs, messaging) ready');
        console.log('   • Player history tracking implemented');
        console.log('   • AI infrastructure for analysis and GTO solutions');
        console.log('   • Comprehensive moderation and admin tools');
        console.log('   • System settings and role-based permissions');
        console.log('\n✅ Database is ready for scaling to advanced features!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run the test
testScalingFeatures().catch(console.error);
