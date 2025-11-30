/**
 * Simple migration runner for executing SQL migrations
 * Usage: node run-migration.js <path-to-sql-file>
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration(sqlFilePath) {
  const client = await pool.connect();
  
  try {
    // Read SQL file
    const absolutePath = path.resolve(sqlFilePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Migration file not found: ${absolutePath}`);
    }
    
    const sql = fs.readFileSync(absolutePath, 'utf8');
    console.log(`📄 Running migration: ${sqlFilePath}`);
    
    // Start transaction
    await client.query('BEGIN');
    
    // Execute migration
    await client.query(sql);
    
    // Log migration to tracking table (if exists)
    try {
      await client.query(
        `INSERT INTO migrations (filename, executed_at) 
         VALUES ($1, NOW()) 
         ON CONFLICT (filename) DO NOTHING`,
        [path.basename(sqlFilePath)]
      );
    } catch (e) {
      // Migrations table might not exist, that's ok
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log(`✅ Migration completed successfully: ${sqlFilePath}`);
    
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error(`❌ Migration failed: ${error.message}`);
    throw error;
    
  } finally {
    client.release();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node run-migration.js <path-to-sql-file>');
    console.error('Example: node run-migration.js database/migrations/037_create_player_sessions.sql');
    process.exit(1);
  }
  
  const migrationPath = args[0];
  
  try {
    await runMigration(migrationPath);
    process.exit(0);
  } catch (error) {
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runMigration };