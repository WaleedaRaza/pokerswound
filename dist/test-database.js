"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testDatabaseConnection = testDatabaseConnection;
const dotenv_1 = __importDefault(require("dotenv"));
const connection_1 = require("./database/connection");
const envResult = dotenv_1.default.config({ path: './test.env' });
if (envResult.error) {
    console.error('❌ Failed to load test.env file:', envResult.error);
    console.log('💡 Make sure test.env exists with valid configuration');
    process.exit(1);
}
async function testDatabaseConnection() {
    console.log('🔍 Testing Database Connection');
    console.log('===============================');
    try {
        console.log('1. Initializing database pool...');
        (0, connection_1.initializeDatabase)();
        console.log('\n2. Testing connection...');
        const connectionOk = await (0, connection_1.testConnection)();
        if (!connectionOk) {
            console.log('❌ Database connection failed. Check your DATABASE_URL in test.env');
            console.log('💡 Example: postgresql://username:password@localhost:5432/database_name');
            return;
        }
        console.log('\n3. Checking database schema...');
        const schemaOk = await (0, connection_1.checkSchema)();
        if (!schemaOk) {
            console.log('💡 To create the schema, run this SQL file against your database:');
            console.log('   database/migrations/001_initial_schema.sql');
            console.log('');
            console.log('💡 Using psql:');
            console.log('   psql postgresql://username:password@localhost:5432/database_name -f database/migrations/001_initial_schema.sql');
        }
        console.log('\n4. Checking migrations...');
        const migrationsOk = await (0, connection_1.runMigrations)();
        console.log('\n5. Running health check...');
        const health = await (0, connection_1.healthCheck)();
        console.log('Health status:', health.status);
        console.log('Health details:', JSON.stringify(health.details, null, 2));
        console.log('\n✅ Database test completed');
    }
    catch (error) {
        console.error('❌ Database test failed:', error);
    }
    finally {
        await (0, connection_1.closeDatabase)();
    }
}
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
