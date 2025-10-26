"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = void 0;
exports.initializeDatabase = initializeDatabase;
exports.getDatabase = getDatabase;
exports.query = query;
exports.transaction = transaction;
exports.testConnection = testConnection;
exports.checkSchema = checkSchema;
exports.runMigrations = runMigrations;
exports.getPoolStats = getPoolStats;
exports.closeDatabase = closeDatabase;
exports.healthCheck = healthCheck;
const pg_1 = require("pg");
const simple_environment_1 = require("../config/simple-environment");
let pool = null;
function initializeDatabase() {
    if (pool) {
        return pool;
    }
    console.log('🗄️ Initializing database connection pool...');
    pool = new pg_1.Pool({
        connectionString: simple_environment_1.dbConfig.url,
        ssl: simple_environment_1.dbConfig.ssl,
        connectionTimeoutMillis: simple_environment_1.dbConfig.connectionTimeoutMillis,
        idleTimeoutMillis: simple_environment_1.dbConfig.idleTimeoutMillis,
        max: simple_environment_1.dbConfig.max,
        application_name: 'poker-engine',
    });
    pool.on('connect', (client) => {
        console.log('✅ Database client connected');
    });
    pool.on('error', (err) => {
        console.error('❌ Database pool error:', err);
    });
    pool.on('remove', (client) => {
        console.log('🗑️ Database client removed from pool');
    });
    console.log('✅ Database connection pool initialized');
    return pool;
}
function getDatabase() {
    if (!pool) {
        return initializeDatabase();
    }
    return pool;
}
exports.getDb = getDatabase;
async function query(text, params) {
    const db = getDatabase();
    const start = Date.now();
    try {
        const result = await db.query(text, params);
        const duration = Date.now() - start;
        if (simple_environment_1.config.LOG_LEVEL === 'debug') {
            console.log(`🔍 Database query executed in ${duration}ms:`, {
                query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                params: params?.length ? `[${params.length} params]` : 'no params',
                rows: result.rowCount,
            });
        }
        return result;
    }
    catch (error) {
        const duration = Date.now() - start;
        console.error(`❌ Database query failed after ${duration}ms:`, {
            query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            params: params?.length ? `[${params.length} params]` : 'no params',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
}
async function transaction(callback) {
    const db = getDatabase();
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        console.log('🔄 Database transaction started');
        const result = await callback(client);
        await client.query('COMMIT');
        console.log('✅ Database transaction committed');
        return result;
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('🔄 Database transaction rolled back:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
async function testConnection() {
    try {
        console.log('🔍 Testing database connection...');
        const result = await query('SELECT NOW() as current_time, version() as pg_version');
        const { current_time, pg_version } = result.rows[0];
        console.log('✅ Database connection successful:', {
            time: current_time,
            version: pg_version.split(' ')[0] + ' ' + pg_version.split(' ')[1],
        });
        return true;
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
}
async function checkSchema() {
    try {
        console.log('🔍 Checking database schema...');
        const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'rooms', 'chips_transactions', 'room_seats')
      ORDER BY table_name
    `);
        const existingTables = result.rows.map(row => row.table_name);
        const requiredTables = ['users', 'rooms', 'chips_transactions', 'room_seats'];
        const missingTables = requiredTables.filter(table => !existingTables.includes(table));
        if (missingTables.length > 0) {
            console.warn('⚠️ Missing database tables:', missingTables);
            console.log('💡 Run database migrations to create missing tables');
            return false;
        }
        console.log('✅ Database schema validated - all required tables exist');
        return true;
    }
    catch (error) {
        console.error('❌ Database schema check failed:', error);
        return false;
    }
}
async function runMigrations() {
    try {
        console.log('🚀 Running database migrations...');
        await query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
        const result = await query(`
      SELECT migration_name FROM schema_migrations ORDER BY executed_at
    `);
        const executedMigrations = result.rows.map(row => row.migration_name);
        console.log('📋 Previously executed migrations:', executedMigrations);
        if (!executedMigrations.includes('001_initial_schema')) {
            console.log('⚠️ Initial schema migration needed');
            console.log('💡 Please run the migration file: database/migrations/001_initial_schema.sql');
            return false;
        }
        console.log('✅ Database migrations up to date');
        return true;
    }
    catch (error) {
        console.error('❌ Database migration check failed:', error);
        return false;
    }
}
function getPoolStats() {
    if (!pool) {
        return { status: 'not_initialized' };
    }
    return {
        status: 'active',
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
    };
}
async function closeDatabase() {
    if (pool) {
        console.log('🛑 Closing database connection pool...');
        await pool.end();
        pool = null;
        console.log('✅ Database connection pool closed');
    }
}
async function healthCheck() {
    try {
        const connectionTest = await testConnection();
        const schemaTest = await checkSchema();
        const poolStats = getPoolStats();
        const isHealthy = connectionTest && schemaTest;
        return {
            status: isHealthy ? 'healthy' : 'unhealthy',
            details: {
                connection: connectionTest,
                schema: schemaTest,
                pool: poolStats,
                timestamp: new Date().toISOString(),
            },
        };
    }
    catch (error) {
        return {
            status: 'unhealthy',
            details: {
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            },
        };
    }
}
