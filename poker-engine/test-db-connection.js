const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.curkkakmkiyrimqsafps:RWorange124%3F@aws-0-us-east-2.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT NOW(), current_database()')
  .then(result => {
    console.log('✅ Database connected successfully!');
    console.log('   Current time:', result.rows[0].now);
    console.log('   Database:', result.rows[0].current_database);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Database connection failed:');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    process.exit(1);
  });

