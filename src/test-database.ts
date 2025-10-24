import dotenv from 'dotenv';
import { testConnection, checkSchema, runMigrations, healthCheck, initializeDatabase, closeDatabase } from './database/connection';

// Load environment variables from test.env
const envResult = dotenv.config({ path: './test.env' });
if (envResult.error) {
  console.error('❌ Failed to load test.env file:', envResult.error);
  console.log('💡 Make sure test.env exists with valid configuration');
  process.exit(1);
}

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection');
  console.log('===============================');
  
  try {
    // Initialize database
    console.log('1. Initializing database pool...');
    initializeDatabase();
    
    // Test basic connection
    console.log('\n2. Testing connection...');
    const connectionOk = await testConnection();
    
    if (!connectionOk) {
      console.log('❌ Database connection failed. Check your DATABASE_URL in test.env');
      console.log('💡 Example: postgresql://username:password@localhost:5432/database_name');
      return;
    }
    
    // Check schema
    console.log('\n3. Checking database schema...');
    const schemaOk = await checkSchema();
    
    if (!schemaOk) {
      console.log('💡 To create the schema, run this SQL file against your database:');
      console.log('   database/migrations/001_initial_schema.sql');
      console.log('');
      console.log('💡 Using psql:');
      console.log('   psql postgresql://username:password@localhost:5432/database_name -f database/migrations/001_initial_schema.sql');
    }
    
    // Check migrations
    console.log('\n4. Checking migrations...');
    const migrationsOk = await runMigrations();
    
    // Health check
    console.log('\n5. Running health check...');
    const health = await healthCheck();
    console.log('Health status:', health.status);
    console.log('Health details:', JSON.stringify(health.details, null, 2));
    
    console.log('\n✅ Database test completed');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    // Clean up
    await closeDatabase();
  }
}

// Run the test
if (require.main === module) {
  testDatabaseConnection()
    .then(() => {
      console.log('🎉 Test finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test crashed:', error);
      process.exit(1);
    });
}

export { testDatabaseConnection };
