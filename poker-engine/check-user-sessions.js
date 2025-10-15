#!/usr/bin/env node

/**
 * Check user_sessions table structure
 */

require('dotenv').config();
const { Pool } = require('pg');

async function checkUserSessions() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('📊 Checking user_sessions table structure...');
    
    const sessionsStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'user_sessions'
      ORDER BY ordinal_position;
    `);
    
    console.log('\nUser sessions table structure:');
    sessionsStructure.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking user_sessions:', error.message);
  } finally {
    await pool.end();
  }
}

checkUserSessions().catch(console.error);

