const {Pool}=require('pg');
require('dotenv').config({ path: './test.env' });
const p=new Pool({connectionString:process.env.DATABASE_URL});
p.query(`SELECT column_name FROM information_schema.columns WHERE table_name='domain_events' ORDER BY ordinal_position`).then(r=>{
  console.log('\ndomain_events columns:');
  r.rows.forEach(row=>console.log('  -',row.column_name));
  p.end();
});

