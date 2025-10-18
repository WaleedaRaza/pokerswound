require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function analyzeDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 POKER ENGINE DATABASE ANALYSIS');
    console.log('=====================================\n');
    
    // 1. Table sizes and row counts
    console.log('📊 TABLE SIZES:');
    const tables = [
      'rooms', 'room_players', 'room_seats', 'room_spectators',
      'games', 'players', 'hands', 'actions', 'pots', 'hand_history',
      'user_profiles', 'audit_log', 'chips_transactions', 'chips_pending',
      'rejoin_tokens', 'table_stakes', 'user_sessions'
    ];
    
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`  ${table.padEnd(20)}: ${result.rows[0].count} rows`);
      } catch (error) {
        console.log(`  ${table.padEnd(20)}: TABLE NOT FOUND`);
      }
    }
    
    console.log('\n🔗 FOREIGN KEY CONSTRAINTS:');
    const fkQuery = `
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name, kcu.column_name;
    `;
    
    const fkResult = await client.query(fkQuery);
    fkResult.rows.forEach(row => {
      console.log(`  ${row.table_name}.${row.column_name} → ${row.foreign_table_name}.${row.foreign_column_name}`);
    });
    
    console.log('\n📈 INDEXES:');
    const indexQuery = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `;
    
    const indexResult = await client.query(indexQuery);
    const indexGroups = {};
    indexResult.rows.forEach(row => {
      if (!indexGroups[row.tablename]) {
        indexGroups[row.tablename] = [];
      }
      indexGroups[row.tablename].push(row.indexname);
    });
    
    Object.keys(indexGroups).forEach(table => {
      console.log(`  ${table}:`);
      indexGroups[table].forEach(index => {
        console.log(`    - ${index}`);
      });
    });
    
    console.log('\n🎯 SAMPLE DATA:');
    
    // Sample rooms
    const roomsResult = await client.query('SELECT id, name, host_user_id, lobby_status, created_at FROM rooms LIMIT 3');
    console.log('  ROOMS:');
    roomsResult.rows.forEach(room => {
      console.log(`    ${room.id} | ${room.name} | ${room.host_user_id} | ${room.lobby_status}`);
    });
    
    // Sample user profiles
    const profilesResult = await client.query('SELECT id, username, display_name, chips FROM user_profiles LIMIT 3');
    console.log('\n  USER_PROFILES:');
    profilesResult.rows.forEach(profile => {
      console.log(`    ${profile.id} | ${profile.username} | ${profile.display_name} | ${profile.chips}`);
    });
    
    // Sample games
    const gamesResult = await client.query('SELECT id, room_id, status, small_blind, big_blind FROM games LIMIT 3');
    console.log('\n  GAMES:');
    gamesResult.rows.forEach(game => {
      console.log(`    ${game.id} | ${game.room_id} | ${game.status} | ${game.small_blind}/${game.big_blind}`);
    });
    
    console.log('\n🔍 DATA QUALITY ISSUES:');
    
    // Check for orphaned data
    const orphanedRooms = await client.query(`
      SELECT COUNT(*) as count 
      FROM rooms r 
      LEFT JOIN auth.users u ON r.host_user_id = u.id 
      WHERE r.host_user_id IS NOT NULL AND u.id IS NULL
    `);
    console.log(`  Orphaned rooms (host not in auth.users): ${orphanedRooms.rows[0].count}`);
    
    const orphanedRoomPlayers = await client.query(`
      SELECT COUNT(*) as count 
      FROM room_players rp 
      LEFT JOIN auth.users u ON rp.user_id = u.id 
      WHERE u.id IS NULL
    `);
    console.log(`  Room players not in auth.users: ${orphanedRoomPlayers.rows[0].count}`);
    
    const orphanedRoomSeats = await client.query(`
      SELECT COUNT(*) as count 
      FROM room_seats rs 
      LEFT JOIN auth.users u ON rs.user_id = u.id 
      WHERE u.id IS NULL
    `);
    console.log(`  Room seats not in auth.users: ${orphanedRoomSeats.rows[0].count}`);
    
    // Check for data inconsistencies
    const duplicateUsernames = await client.query(`
      SELECT username, COUNT(*) as count 
      FROM user_profiles 
      GROUP BY username 
      HAVING COUNT(*) > 1
    `);
    console.log(`  Duplicate usernames: ${duplicateUsernames.rows.length}`);
    
    const invalidChips = await client.query(`
      SELECT COUNT(*) as count 
      FROM user_profiles 
      WHERE chips < 0
    `);
    console.log(`  Users with negative chips: ${invalidChips.rows[0].count}`);
    
    console.log('\n📋 RECOMMENDATIONS:');
    console.log('  1. Add foreign key constraints for user_id references');
    console.log('  2. Implement username uniqueness constraint');
    console.log('  3. Add data validation triggers');
    console.log('  4. Consider partitioning for high-volume tables');
    console.log('  5. Add composite indexes for common query patterns');
    console.log('  6. Implement soft deletes for audit trail');
    console.log('  7. Add data archiving strategy for old records');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

analyzeDatabase();
