#!/usr/bin/env node
/**
 * Quick database state checker
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkState() {
  console.log('🔍 Checking current database state...\n');
  
  // Check if audit_log table exists
  const tables = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('audit_log', 'processed_actions', 'rate_limits')
    ORDER BY table_name
  `);
  
  console.log('Existing tables:', tables.rows.map(r => r.table_name));
  
  // Check if game_states has seq column
  const gameStateCols = await pool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'game_states' 
    AND column_name IN ('seq', 'version', 'actor_turn_started_at')
  `);
  
  console.log('\nExisting game_states columns:', gameStateCols.rows.map(r => r.column_name));
  
  // Check if rooms has new columns
  const roomCols = await pool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'rooms' 
    AND column_name IN ('turn_time_seconds', 'timebank_seconds', 'is_paused')
  `);
  
  console.log('\nExisting rooms columns:', roomCols.rows.map(r => r.column_name));
  
  await pool.end();
}

checkState().catch(console.error);
