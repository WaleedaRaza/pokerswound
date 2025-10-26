#!/usr/bin/env node

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkGameStates() {
  console.log('🔍 Checking game_states table...\n');
  
  // Get all columns
  const columns = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_name = 'game_states'
    ORDER BY ordinal_position
  `);
  
  console.log('game_states columns:');
  columns.rows.forEach(col => {
    console.log(`  - ${col.column_name} (${col.data_type})`);
  });
  
  // Check if version exists and its type
  const versionCol = columns.rows.find(col => col.column_name === 'version');
  if (versionCol) {
    console.log(`\nVersion column type: ${versionCol.data_type}`);
  }
  
  await pool.end();
}

checkGameStates().catch(console.error);
