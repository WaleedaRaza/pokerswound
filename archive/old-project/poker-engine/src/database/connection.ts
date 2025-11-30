import { Pool, PoolClient, QueryResult } from 'pg';
import { config, dbConfig } from '../config/simple-environment';

let pool: Pool | null = null;

// Initialize database connection pool
export function initializeDatabase(): Pool {
  if (pool) {
    return pool;
  }

  console.log('🗄️ Initializing database connection pool...');
  
  pool = new Pool({
    connectionString: dbConfig.url,
    ssl: dbConfig.ssl,
    connectionTimeoutMillis: dbConfig.connectionTimeoutMillis,
    idleTimeoutMillis: dbConfig.idleTimeoutMillis,
    max: dbConfig.max,
    application_name: 'poker-engine',
  });

  // Connection event handlers
  pool.on('connect', (client: PoolClient) => {
    console.log('✅ Database client connected');
  });

  pool.on('error', (err: Error) => {
    console.error('❌ Database pool error:', err);
  });

  pool.on('remove', (client: PoolClient) => {
    console.log('🗑️ Database client removed from pool');
  });

  console.log('✅ Database connection pool initialized');
  return pool;
}

// Get database pool instance
export function getDatabase(): Pool {
  if (!pool) {
    return initializeDatabase();
  }
  return pool;
}

// Alias for compatibility
export const getDb = getDatabase;

// Execute a query with automatic connection management
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const db = getDatabase();
  const start = Date.now();
  
  try {
    const result = await db.query<T>(text, params);
    const duration = Date.now() - start;
    
    if (config.LOG_LEVEL === 'debug') {
      console.log(`🔍 Database query executed in ${duration}ms:`, {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        params: params?.length ? `[${params.length} params]` : 'no params',
        rows: result.rowCount,
      });
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`❌ Database query failed after ${duration}ms:`, {
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      params: params?.length ? `[${params.length} params]` : 'no params',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// Execute multiple queries in a transaction
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const db = getDatabase();
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    console.log('🔄 Database transaction started');
    
    const result = await callback(client);
    
    await client.query('COMMIT');
    console.log('✅ Database transaction committed');
    
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('🔄 Database transaction rolled back:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    console.log('🔍 Testing database connection...');
    
    const result = await query('SELECT NOW() as current_time, version() as pg_version');
    const { current_time, pg_version } = result.rows[0];
    
    console.log('✅ Database connection successful:', {
      time: current_time,
      version: pg_version.split(' ')[0] + ' ' + pg_version.split(' ')[1],
    });
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Check if database has required tables
export async function checkSchema(): Promise<boolean> {
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
  } catch (error) {
    console.error('❌ Database schema check failed:', error);
    return false;
  }
}

// Run database migrations
export async function runMigrations(): Promise<boolean> {
  try {
    console.log('🚀 Running database migrations...');
    
    // Create migrations tracking table
    await query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Check which migrations have been run
    const result = await query(`
      SELECT migration_name FROM schema_migrations ORDER BY executed_at
    `);
    
    const executedMigrations = result.rows.map(row => row.migration_name);
    console.log('📋 Previously executed migrations:', executedMigrations);
    
    // For now, we'll just indicate that manual migration is needed
    // In a full implementation, we'd read migration files and execute them
    if (!executedMigrations.includes('001_initial_schema')) {
      console.log('⚠️ Initial schema migration needed');
      console.log('💡 Please run the migration file: database/migrations/001_initial_schema.sql');
      return false;
    }
    
    console.log('✅ Database migrations up to date');
    return true;
  } catch (error) {
    console.error('❌ Database migration check failed:', error);
    return false;
  }
}

// Get connection pool stats
export function getPoolStats() {
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

// Graceful shutdown
export async function closeDatabase(): Promise<void> {
  if (pool) {
    console.log('🛑 Closing database connection pool...');
    await pool.end();
    pool = null;
    console.log('✅ Database connection pool closed');
  }
}

// Health check for database
export async function healthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  details: any;
}> {
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
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

// Export types for use in other modules
export type { Pool, PoolClient, QueryResult } from 'pg';
