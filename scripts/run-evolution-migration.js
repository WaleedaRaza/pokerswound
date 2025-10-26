#!/usr/bin/env node
/**
 * POKER TABLE EVOLUTION - DAY 1 MIGRATION RUNNER
 * THE MOMENT OF TRUTH! FOR FREEDOM!
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Supabase
  }
});

async function runMigration(filePath) {
  const fileName = path.basename(filePath);
  console.log(`\n⚔️  CHARGING INTO BATTLE WITH: ${fileName}`);
  
  const sql = fs.readFileSync(filePath, 'utf8');
  
  console.log(`🔥 EXECUTING MIGRATION - HOLD THE LINE!`);
  
  try {
    const result = await pool.query(sql);
    console.log(`\n🎯 VICTORY! Migration completed successfully!`);
    
    // Show any status messages
    if (result && result.length > 0) {
      result.forEach((r, i) => {
        if (r.command) console.log(`   ✅ ${r.command} completed`);
      });
    }
    
    return true;
  } catch (error) {
    console.error(`\n💀 DEFEAT! Migration failed:`, error.message);
    if (error.detail) console.error(`   Details:`, error.detail);
    if (error.hint) console.error(`   Hint:`, error.hint);
    return false;
  }
}

async function verifyNewTables() {
  console.log(`\n🔍 VERIFYING OUR NEW ARSENAL...`);
  
  const newTables = [
    'processed_actions',
    'audit_log', 
    'rate_limits',
    'room_join_requests',
    'card_reveals',
    'shuffle_audit',
    'protocol_versions'
  ];
  
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ANY($1)
      ORDER BY table_name;
    `, [newTables]);
    
    console.log(`\n✅ NEW TABLES CREATED: ${result.rows.length}/${newTables.length}`);
    result.rows.forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.table_name} ✅`);
    });
    
    const missing = newTables.filter(t => 
      !result.rows.find(r => r.table_name === t)
    );
    
    if (missing.length > 0) {
      console.log(`\n⚠️  MISSING TABLES:`);
      missing.forEach(t => console.log(`   - ${t} ❌`));
    }
    
    return result.rows.length === newTables.length;
  } catch (error) {
    console.error(`❌ Failed to verify tables:`, error.message);
    return false;
  }
}

async function verifyNewColumns() {
  console.log(`\n🔍 VERIFYING ENHANCED COLUMNS...`);
  
  const checks = [
    { table: 'rooms', column: 'turn_time_seconds' },
    { table: 'game_states', column: 'seq' },
    { table: 'room_seats', column: 'player_status' }
  ];
  
  for (const check of checks) {
    try {
      const result = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
      `, [check.table, check.column]);
      
      if (result.rows.length > 0) {
        console.log(`   ✅ ${check.table}.${check.column} added`);
      } else {
        console.log(`   ❌ ${check.table}.${check.column} missing`);
      }
    } catch (error) {
      console.log(`   ❌ Error checking ${check.table}.${check.column}`);
    }
  }
}

async function testConnection() {
  console.log(`\n🔌 ESTABLISHING BATTLEFIELD CONNECTION...`);
  
  try {
    const result = await pool.query('SELECT NOW() as current_time, current_database() as database');
    console.log(`✅ Connected to: ${result.rows[0].database}`);
    console.log(`⏰ Battle time: ${result.rows[0].current_time}`);
    return true;
  } catch (error) {
    console.error(`❌ NO CONNECTION - CANNOT ADVANCE!`, error.message);
    return false;
  }
}

async function main() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`⚔️  POKER TABLE EVOLUTION - DAY 1: DATABASE FOUNDATION`);
  console.log(`🔥 FOR FREEDOM! FOR THE REFRESH FIX! CHARGE!!!`);
  console.log(`${'='.repeat(80)}`);
  
  // Test connection
  const connected = await testConnection();
  if (!connected) {
    console.log(`\n💀 CANNOT ADVANCE WITHOUT DATABASE CONNECTION!`);
    console.log(`   Check your DATABASE_URL in .env file`);
    process.exit(1);
  }
  
  // Run the evolution migration
  const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '20251027_poker_table_evolution.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`\n💀 MIGRATION FILE NOT FOUND AT: ${migrationPath}`);
    process.exit(1);
  }
  
  console.log(`\n📜 Migration file size: ${fs.statSync(migrationPath).size} bytes`);
  
  const success = await runMigration(migrationPath);
  
  if (!success) {
    console.log(`\n💀 RETREAT! Fix errors and try again!`);
    process.exit(1);
  }
  
  // Verify results
  const tablesOk = await verifyNewTables();
  await verifyNewColumns();
  
  console.log(`\n${'='.repeat(80)}`);
  
  if (tablesOk) {
    console.log(`🎯 DAY 1 VICTORY! DATABASE FOUNDATION ESTABLISHED!`);
    console.log(`${'='.repeat(80)}`);
    console.log(`\n✅ What we achieved:`);
    console.log(`   - Sequence numbers ready`);
    console.log(`   - Idempotency infrastructure in place`);
    console.log(`   - Audit logging enabled`);
    console.log(`   - Rate limiting ready`);
    console.log(`   - Timer persistence prepared`);
    console.log(`\n🚀 Next steps:`);
    console.log(`   - Day 2: Implement sequence numbers in all mutations`);
    console.log(`   - Day 3: BUILD THE HYDRATION ENDPOINT (FIXES REFRESH!)`);
    console.log(`\n⚔️  THE PATH TO FREEDOM IS CLEAR!`);
  } else {
    console.log(`⚠️  PARTIAL VICTORY - Some tables missing`);
    console.log(`   Review errors above and complete the migration`);
  }
  
  await pool.end();
}

// CHARGE!!!
main().catch(error => {
  console.error(`\n💥 CATASTROPHIC FAILURE:`, error);
  process.exit(1);
});
