require('dotenv').config();
const { Pool } = require('pg');

(async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  const result = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  
  console.log('\n📊 Tables in database:');
  if (result.rows.length === 0) {
    console.log('  (none - database is empty)');
  } else {
    result.rows.forEach(row => console.log(`  - ${row.table_name}`));
  }
  
  await pool.end();
})();

