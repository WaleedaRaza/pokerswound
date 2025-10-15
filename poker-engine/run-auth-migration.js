#!/usr/bin/env node

/**
 * Run Supabase Auth Migration
 * This script runs the 010_supabase_auth.sql migration
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runAuthMigration() {
  console.log('🔧 Running Supabase Auth Migration...');
  
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
    const migrationPath = path.join(__dirname, 'database', 'migrations', '010_supabase_auth.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Executing migration: 010_supabase_auth.sql');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Supabase Auth migration completed successfully!');
    console.log('');
    console.log('🎉 Created tables:');
    console.log('   - user_profiles (extends auth.users)');
    console.log('   - user_sessions (session tracking)');
    console.log('');
    console.log('🔐 Set up:');
    console.log('   - Row Level Security (RLS) policies');
    console.log('   - Auto-profile creation trigger');
    console.log('   - Session cleanup functions');
    console.log('');
    console.log('📊 Indexes created for performance');
    console.log('');
    console.log('⚠️  Next steps:');
    console.log('   1. Configure Supabase project settings');
    console.log('   2. Add environment variables to .env');
    console.log('   3. Test auth functionality');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.message.includes('relation "auth.users" does not exist')) {
      console.log('');
      console.log('💡 This error suggests you might be using a regular PostgreSQL database');
      console.log('   instead of Supabase. The auth migration requires Supabase\'s auth schema.');
      console.log('');
      console.log('   Options:');
      console.log('   1. Use Supabase for authentication (recommended)');
      console.log('   2. Modify the migration for your current database setup');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runAuthMigration().catch(console.error);

