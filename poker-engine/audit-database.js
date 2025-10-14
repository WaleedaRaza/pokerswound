// Complete database audit
require('dotenv').config();
const { Pool } = require('pg');

async function auditDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 DATABASE AUDIT\n');
    
    // 1. List all tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📊 EXISTING TABLES:');
    const existingTables = tablesResult.rows.map(r => r.table_name);
    existingTables.forEach(t => console.log(`  ✅ ${t}`));
    
    // 2. Check for missing tables the code expects
    const expectedTables = [
      'users',
      'user_sessions',
      'rooms',
      'room_seats',
      'room_players',  // For lobby system
      'room_spectators',
      'games',
      'players',
      'hands',
      'actions',
      'pots',
      'chips_transactions',
      'hand_history',
      'rejoin_tokens',
      'audit_log'
    ];
    
    console.log('\n❓ MISSING TABLES:');
    const missingTables = expectedTables.filter(t => !existingTables.includes(t));
    if (missingTables.length === 0) {
      console.log('  (none - all expected tables exist)');
    } else {
      missingTables.forEach(t => console.log(`  ❌ ${t}`));
    }
    
    // 3. Check columns for each existing table
    console.log('\n📋 TABLE SCHEMAS:\n');
    
    for (const table of existingTables) {
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      
      console.log(`${table}:`);
      columnsResult.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        console.log(`  - ${col.column_name} (${col.data_type}, ${nullable})`);
      });
      console.log('');
    }
    
    // 4. Check what rooms table has
    console.log('\n🏠 ROOMS TABLE COLUMNS:');
    const roomsColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns
      WHERE table_name = 'rooms'
      ORDER BY ordinal_position
    `);
    roomsColumns.rows.forEach(r => console.log(`  - ${r.column_name}`));
    
    // 5. Check what code expects from rooms
    console.log('\n📝 ROOMS COLUMNS CODE EXPECTS:');
    const expectedRoomsColumns = [
      'id',
      'name',
      'small_blind',
      'big_blind',
      'min_buy_in',
      'max_buy_in',
      'max_players',
      'is_private',
      'invite_code',
      'host_user_id',
      'lobby_status',
      'game_id',
      'status',
      'created_at'
    ];
    
    const actualRoomsColumns = roomsColumns.rows.map(r => r.column_name);
    expectedRoomsColumns.forEach(col => {
      const exists = actualRoomsColumns.includes(col);
      console.log(`  ${exists ? '✅' : '❌'} ${col}`);
    });
    
    await pool.end();
  } catch (err) {
    console.error('❌ Audit failed:', err.message);
    await pool.end();
    process.exit(1);
  }
}

auditDatabase();

