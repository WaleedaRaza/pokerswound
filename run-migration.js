// Quick script to run the game_states migration
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

    // Check if game_states table already exists
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'game_states'
      );
    `);

    if (checkTable.rows[0].exists) {
      console.log('⚠️  Table game_states already exists');
      console.log('💡 To recreate: DROP TABLE game_states CASCADE;');
      process.exit(0);
    }

    console.log('📄 Reading migration file...');
    const migrationPath = path.join(__dirname, 'database/migrations/add-game-states-table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Running migration...');
    await pool.query(migrationSQL);
    
    console.log('✅ Migration complete!');
    
    // Verify table was created
    const verify = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'game_states'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📊 Table structure:');
    verify.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    console.log('\n🎉 Ready to enable USE_DB_REPOSITORY=true');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

