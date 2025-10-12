// Quick Supabase setup verification script
const fs = require('fs');

console.log('🎯 SUPABASE SETUP CHECKLIST');
console.log('============================');

console.log('\n📋 Step-by-step instructions:');
console.log('1. Go to: https://supabase.com');
console.log('2. Create new project: "poker-engine"');
console.log('3. Copy DATABASE_URL from Settings → Database');
console.log('4. Update test.env with your real URL');
console.log('5. Run migration in Supabase SQL Editor');
console.log('6. Test with: node simple-db-test.js');

console.log('\n🔗 URLs you need:');
console.log('• Supabase: https://supabase.com');
console.log('• SQL Editor: [Your Project] → SQL Editor');

console.log('\n📁 Files to update:');
console.log('• test.env (line 8: DATABASE_URL)');

console.log('\n💾 Migration file to copy:');
console.log('• database/migrations/001_initial_schema.sql');

console.log('\n✅ Success indicators:');
console.log('• "Database connection successful!"');
console.log('• "All required tables exist"');
console.log('• Production server starts without errors');

// Check current setup
console.log('\n🔍 Current Status Check:');
require('dotenv').config({ path: './test.env' });

const dbUrl = process.env.DATABASE_URL;
if (dbUrl && dbUrl.includes('supabase.co')) {
  console.log('✅ DATABASE_URL looks like Supabase URL');
  console.log('📋 Next: Test connection with: node simple-db-test.js');
} else if (dbUrl && dbUrl.includes('localhost')) {
  console.log('⚠️  DATABASE_URL still points to localhost');
  console.log('📋 Next: Update test.env with your Supabase URL');
} else {
  console.log('❌ DATABASE_URL not configured');
  console.log('📋 Next: Get URL from Supabase and update test.env');
}

console.log('\n🚀 When ready, test with:');
console.log('   node simple-db-test.js');
console.log('   npx tsc && node dist/production-server.js');
