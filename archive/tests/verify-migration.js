// Verify migration completed successfully
require('dotenv').config({ path: './test.env' });
const { Pool } = require('pg');

async function verifyMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🔍 Verifying database migration...');
    console.log('');
    
    // Check if all expected tables exist
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const tables = result.rows.map(row => row.table_name);
    const expectedTables = [
      'users',
      'user_sessions', 
      'rejoin_tokens',
      'rooms',
      'room_seats',
      'room_spectators', 
      'games',
      'hands',
      'chips_transactions',
      'game_events',
      'game_snapshots'
    ];
    
    console.log('📋 Tables found:');
    tables.forEach(table => {
      const isExpected = expectedTables.includes(table);
      console.log(`   ${isExpected ? '✅' : '❓'} ${table}`);
    });
    
    console.log('');
    
    const missingTables = expectedTables.filter(table => !tables.includes(table));
    if (missingTables.length === 0) {
      console.log('🎉 Migration verification successful!');
      console.log('✅ All expected tables are present');
      console.log('🚀 Database is ready for production use');
    } else {
      console.log('⚠️  Some tables are missing:');
      missingTables.forEach(table => console.log(`   ❌ ${table}`));
      console.log('');
      console.log('💡 Please run the migration in Supabase SQL Editor');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    await pool.end();
  }
}

verifyMigration();
