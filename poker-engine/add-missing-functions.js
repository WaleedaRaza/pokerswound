#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function addMissingFunctions() {
    try {
        console.log('Adding missing functions...');
        
        // Create can_change_username function
        await pool.query(`
            CREATE OR REPLACE FUNCTION can_change_username(p_user_id UUID, p_new_username VARCHAR(50))
            RETURNS BOOLEAN AS $$
            BEGIN
                RETURN (
                    SELECT username_change_count < max_username_changes 
                    FROM user_profiles 
                    WHERE id = p_user_id
                ) AND (
                    SELECT COUNT(*) = 0 
                    FROM username_changes 
                    WHERE user_id = p_user_id 
                    AND changed_at > NOW() - INTERVAL '24 hours'
                );
            END;
            $$ LANGUAGE plpgsql;
        `);
        console.log('✅ Created can_change_username function');
        
        // Create has_permission function
        await pool.query(`
            CREATE OR REPLACE FUNCTION has_permission(p_user_id UUID, p_permission VARCHAR(50), p_resource VARCHAR(50) DEFAULT NULL)
            RETURNS BOOLEAN AS $$
            DECLARE
                user_role VARCHAR(20);
            BEGIN
                SELECT up.user_role INTO user_role 
                FROM user_profiles up 
                WHERE up.id = p_user_id;
                
                RETURN EXISTS (
                    SELECT 1 
                    FROM role_permissions rp 
                    WHERE rp.role = user_role 
                    AND rp.permission = p_permission 
                    AND (p_resource IS NULL OR rp.resource = p_resource)
                );
            END;
            $$ LANGUAGE plpgsql;
        `);
        console.log('✅ Created has_permission function');
        
        console.log('🎉 All missing functions created successfully!');
        
    } catch (error) {
        console.error('❌ Error creating functions:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

addMissingFunctions().catch(console.error);
