#!/usr/bin/env node

/**
 * Run Auth System Migration
 * This script runs the 010_auth_system.sql migration
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runAuthSystemMigration() {
  console.log('🔧 Running Auth System Migration...');
  
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.log('Please add DATABASE_URL to your .env file');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false
  });

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database', 'migrations', '010_auth_system.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Executing migration: 010_auth_system.sql');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Auth System migration completed successfully!');
    console.log('');
    console.log('🎉 Created tables:');
    console.log('   - users (authentication & profiles)');
    console.log('   - user_sessions (session tracking)');
    console.log('   - user_tokens (email verification & password reset)');
    console.log('');
    console.log('🔧 Set up:');
    console.log('   - Auto-update timestamps');
    console.log('   - Session cleanup functions');
    console.log('   - Token management functions');
    console.log('');
    console.log('📊 Indexes created for performance');
    console.log('');
    console.log('🧪 Sample users created:');
    console.log('   - test@example.com / testuser / password123');
    console.log('   - admin@example.com / admin / password123');
    console.log('');
    console.log('⚠️  Next steps:');
    console.log('   1. Install bcrypt: npm install bcrypt @types/bcrypt');
    console.log('   2. Create auth middleware');
    console.log('   3. Test auth functionality');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runAuthSystemMigration().catch(console.error);

