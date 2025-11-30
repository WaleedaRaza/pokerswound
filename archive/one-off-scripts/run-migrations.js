// Run database migrations
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Connected!');

    // Read migration files in order
    const migrations = [
      'database/migrations/001_initial_schema_fixed.sql',
      'database/migrations/0002_state_extensions.sql',
      'database/migrations/0003_robustness_fixes.sql',
      'database/migrations/004_add_rebuy_system.sql',
      'database/migrations/005_add_hand_history.sql'
    ];

    for (const migrationFile of migrations) {
      const migrationPath = path.join(__dirname, migrationFile);
      
      if (!fs.existsSync(migrationPath)) {
        console.log(`⏭️  Skipping ${migrationFile} (not found)`);
        continue;
      }

      console.log(`\n📝 Running migration: ${migrationFile}`);
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      try {
        await client.query(sql);
        console.log(`✅ Completed: ${migrationFile}`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`⏭️  Skipped (already exists): ${migrationFile}`);
        } else {
          console.error(`❌ Error in ${migrationFile}:`, err.message);
          throw err;
        }
      }
    }

    console.log('\n✅ All migrations completed!');
    
    // Check tables created
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📊 Database tables:');
    result.rows.forEach(row => console.log(`  - ${row.table_name}`));

    client.release();
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();

