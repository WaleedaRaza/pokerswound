#!/usr/bin/env node
/**
 * Database Migration Runner
 * Runs SQL migration files against the configured database
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Supabase
  }
});

async function runMigration(filePath) {
  const fileName = path.basename(filePath);
  console.log(`\n📂 Reading migration: ${fileName}`);
  
  const sql = fs.readFileSync(filePath, 'utf8');
  
  console.log(`🚀 Executing migration...`);
  
  try {
    const result = await pool.query(sql);
    console.log(`✅ Migration completed successfully!`);
    
    // If migration returns a status message, show it
    if (result.rows && result.rows.length > 0 && result.rows[0].status) {
      console.log(`📋 ${result.rows[0].status}`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Migration failed:`, error.message);
    console.error(`\nFull error:`, error);
    return false;
  }
}

async function listTables() {
  console.log(`\n📊 Checking created tables...`);
  
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    if (result.rows.length === 0) {
      console.log(`⚠️  No tables found`);
    } else {
      console.log(`\n✅ Found ${result.rows.length} tables:`);
      result.rows.forEach((row, i) => {
        console.log(`   ${i + 1}. ${row.table_name}`);
      });
    }
    
    return result.rows;
  } catch (error) {
    console.error(`❌ Failed to list tables:`, error.message);
    return [];
  }
}

async function testConnection() {
  console.log(`\n🔌 Testing database connection...`);
  
  try {
    const result = await pool.query('SELECT NOW() as current_time, current_database() as database');
    console.log(`✅ Connected to database: ${result.rows[0].database}`);
    console.log(`   Server time: ${result.rows[0].current_time}`);
    return true;
  } catch (error) {
    console.error(`❌ Connection failed:`, error.message);
    return false;
  }
}

async function countUsers() {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`👥 Users in database: ${result.rows[0].count}`);
  } catch (error) {
    // Table might not exist yet, that's ok
  }
}

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎰 POKER ENGINE - DATABASE MIGRATION`);
  console.log(`${'='.repeat(60)}`);
  
  // Test connection first
  const connected = await testConnection();
  if (!connected) {
    console.log(`\n❌ Cannot proceed without database connection`);
    console.log(`   Check your DATABASE_URL in .env file`);
    process.exit(1);
  }
  
  // Run migration
  const migrationPath = path.join(__dirname, 'database/migrations/001_initial_schema.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`\n❌ Migration file not found: ${migrationPath}`);
    process.exit(1);
  }
  
  const success = await runMigration(migrationPath);
  
  if (!success) {
    console.log(`\n❌ Migration failed - please fix errors and try again`);
    process.exit(1);
  }
  
  // Verify results
  await listTables();
  await countUsers();
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ DATABASE SETUP COMPLETE!`);
  console.log(`${'='.repeat(60)}`);
  console.log(`\nYou can now:`);
  console.log(`  1. Start the server: npm run dev`);
  console.log(`  2. Test auth: POST http://localhost:3000/auth/register`);
  console.log(`  3. View tables in Supabase dashboard`);
  console.log(`\nDefault admin account:`);
  console.log(`  Email: admin@poker.local`);
  console.log(`  Password: admin123`);
  console.log(`  ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!\n`);
  
  await pool.end();
}

main().catch(error => {
  console.error(`\n💥 Fatal error:`, error);
  process.exit(1);
});
