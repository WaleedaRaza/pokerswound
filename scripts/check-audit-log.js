#!/usr/bin/env node
/**
 * Check existing audit_log structure
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkAuditLog() {
  console.log('🔍 Checking existing audit_log table...\n');
  
  // Get all columns
  const columns = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_name = 'audit_log'
    ORDER BY ordinal_position
  `);
  
  console.log('Existing audit_log columns:');
  columns.rows.forEach(col => {
    console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
  });
  
  // Check for trace_id specifically
  const hasTraceId = columns.rows.some(col => col.column_name === 'trace_id');
  console.log(`\nHas trace_id column: ${hasTraceId}`);
  
  await pool.end();
}

checkAuditLog().catch(console.error);
