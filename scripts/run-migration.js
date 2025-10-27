const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Rocker26@localhost:5432/poker_engine'
});

async function runMigration() {
  try {
    console.log('🔄 Running production architecture migration...');
    
    const migrationPath = path.join(__dirname, '../database/migrations/038_production_architecture.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Run migration
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('\n📋 Verifying changes...');
    
    // Verify columns
    const verifyColumns = await pool.query(`
      SELECT column_name, data_type, table_name
      FROM information_schema.columns
      WHERE table_name IN ('room_seats', 'room_spectators', 'rejoin_tokens')
        AND column_name IN ('display_name', 'last_seen_at', 'role', 'token_hash')
      ORDER BY table_name, column_name;
    `);
    
    console.log('\n✅ Columns added:');
    verifyColumns.rows.forEach(row => {
      console.log(`   - ${row.table_name}.${row.column_name} (${row.data_type})`);
    });
    
    // Verify indexes
    const verifyIndexes = await pool.query(`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE tablename IN ('room_seats', 'room_spectators', 'rejoin_tokens')
        AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname;
    `);
    
    console.log('\n✅ Indexes created:');
    verifyIndexes.rows.forEach(row => {
      console.log(`   - ${row.indexname} on ${row.tablename}`);
    });
    
    // Verify functions
    const verifyFunctions = await pool.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_name IN ('cleanup_expired_tokens', 'mark_disconnected_users')
      ORDER BY routine_name;
    `);
    
    console.log('\n✅ Functions created:');
    verifyFunctions.rows.forEach(row => {
      console.log(`   - ${row.routine_name}()`);
    });
    
    console.log('\n🎉 Production architecture ready!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
