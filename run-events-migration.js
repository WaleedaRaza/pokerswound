// Script to run the game_events migration
require('dotenv').config({ path: 'test.env' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('supabase.co') 
      ? { rejectUnauthorized: false } 
      : undefined
  });

  try {
    console.log('🔗 Connecting to database...');
    await pool.query('SELECT NOW()');
    console.log('✅ Connected!');

    // Check if game_events table already exists
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'game_events'
      );
    `);

    if (checkTable.rows[0].exists) {
      console.log('⚠️  Table game_events already exists');
      console.log('💡 To recreate: DROP TABLE game_events CASCADE;');
      process.exit(0);
    }

    console.log('📄 Reading migration file...');
    const migrationPath = path.join(__dirname, 'database/migrations/add-game-events-table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Running migration...');
    await pool.query(migrationSQL);
    
    console.log('✅ Migration complete!');
    
    // Verify table was created
    const verify = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'game_events'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📊 Table structure:');
    verify.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    console.log('\n🎉 Event persistence is now enabled!');
    console.log('✅ USE_EVENT_PERSISTENCE=true can be used');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

