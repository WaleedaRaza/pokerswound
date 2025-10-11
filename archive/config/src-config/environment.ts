import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config({ path: './test.env' });

// Environment validation schema
const envSchema = z.object({
  // Server configuration
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  HOST: z.string().default('0.0.0.0'),
  
  // Database
  DATABASE_URL: z.string().url('Invalid DATABASE_URL'),
  SUPABASE_URL: z.string().url('Invalid SUPABASE_URL').optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  
  // Redis (for sessions and caching)
  REDIS_URL: z.string().url('Invalid REDIS_URL').optional(),
  
  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),
  
  // Game engine
  SERVER_SECRET: z.string().min(32, 'SERVER_SECRET must be at least 32 characters for RNG seeding'),
  DEFAULT_STARTING_CHIPS: z.string().default('1000').transform(Number),
  MAX_GAMES_PER_USER: z.string().default('5').transform(Number),
  
  // External APIs
  YOUTUBE_API_KEY: z.string().optional(),
  RANDOM_ORG_API_KEY: z.string().optional(),
  
  // Security
  BCRYPT_ROUNDS: z.string().default('12').transform(Number),
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number), // 1 minute
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),
  
  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3001'),
  CORS_CREDENTIALS: z.string().default('true').transform(val => val === 'true'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // Monitoring
  SENTRY_DSN: z.string().optional(),
  ENABLE_METRICS: z.string().default('true').transform(val => val === 'true'),
  
  // Features
  ENABLE_REGISTRATION: z.string().default('true').transform(val => val === 'true'),
  ENABLE_YOUTUBE_ENTROPY: z.string().default('false').transform(val => val === 'true'),
  ENABLE_SPECTATOR_MODE: z.string().default('true').transform(val => val === 'true'),
});

// Parse and validate environment
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment configuration:');
  parseResult.error.issues.forEach(issue => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const config = parseResult.data;

// Runtime environment checks
export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
export const isStaging = config.NODE_ENV === 'staging';

// Database configuration
export const dbConfig = {
  url: config.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 20, // max connections in pool
};

// Redis configuration
export const redisConfig = config.REDIS_URL ? {
  url: config.REDIS_URL,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
} : null;

// JWT configuration
export const jwtConfig = {
  secret: config.JWT_SECRET,
  expiresIn: config.JWT_EXPIRES_IN,
  refreshExpiresIn: config.REFRESH_TOKEN_EXPIRES_IN,
  algorithm: 'HS256' as const,
  issuer: 'poker-engine',
  audience: 'poker-players',
};

// Game configuration
export const gameConfig = {
  defaultStartingChips: config.DEFAULT_STARTING_CHIPS,
  maxGamesPerUser: config.MAX_GAMES_PER_USER,
  serverSecret: config.SERVER_SECRET,
  enableYoutubeEntropy: config.ENABLE_YOUTUBE_ENTROPY,
  enableSpectatorMode: config.ENABLE_SPECTATOR_MODE,
};

// Security configuration
export const securityConfig = {
  bcryptRounds: config.BCRYPT_ROUNDS,
  rateLimitWindowMs: config.RATE_LIMIT_WINDOW_MS,
  rateLimitMaxRequests: config.RATE_LIMIT_MAX_REQUESTS,
  corsOrigin: config.CORS_ORIGIN,
  corsCredentials: config.CORS_CREDENTIALS,
};

// Validation helper
export function validateRequiredEnvVars() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET', 
    'SERVER_SECRET'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Export config for easy access
export default config;
