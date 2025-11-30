/**
 * Verify database migrations
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase.co') 
    ? { rejectUnauthorized: false } 
    : undefined
});

async function main() {
  console.log('\n🔍 Verifying database migrations...\n');
  
  try {
    // Check game_states table
    const gameStatesResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'game_states'
      ORDER BY ordinal_position
    `);
    
    console.log('✅ game_states table:');
    console.table(gameStatesResult.rows);
    
    // Check game_events table
    const gameEventsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'game_events'
      ORDER BY ordinal_position
    `);
    
    console.log('\n✅ game_events table:');
    console.table(gameEventsResult.rows);
    
    // Check indexes
    const indexesResult = await pool.query(`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE tablename IN ('game_states', 'game_events')
      ORDER BY tablename, indexname
    `);
    
    console.log('\n✅ Indexes:');
    console.table(indexesResult.rows.map(r => ({
      table: r.tablename,
      index: r.indexname
    })));
    
    // Check row counts
    const gsCount = await pool.query('SELECT COUNT(*) as count FROM game_states');
    const geCount = await pool.query('SELECT COUNT(*) as count FROM game_events');
    
    console.log('\n📊 Data:');
    console.log(`  game_states: ${gsCount.rows[0].count} rows`);
    console.log(`  game_events: ${geCount.rows[0].count} rows`);
    
    console.log('\n✅ All migrations verified successfully!\n');
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

