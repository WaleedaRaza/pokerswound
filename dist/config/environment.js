"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityConfig = exports.gameConfig = exports.jwtConfig = exports.redisConfig = exports.dbConfig = exports.isStaging = exports.isProduction = exports.isDevelopment = exports.config = void 0;
exports.validateRequiredEnvVars = validateRequiredEnvVars;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config({ path: './test.env' });
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'staging', 'production']).default('development'),
    PORT: zod_1.z.string().default('3000').transform(Number),
    HOST: zod_1.z.string().default('0.0.0.0'),
    DATABASE_URL: zod_1.z.string().url('Invalid DATABASE_URL'),
    SUPABASE_URL: zod_1.z.string().url('Invalid SUPABASE_URL').optional(),
    SUPABASE_ANON_KEY: zod_1.z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string().optional(),
    REDIS_URL: zod_1.z.string().url('Invalid REDIS_URL').optional(),
    JWT_SECRET: zod_1.z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: zod_1.z.string().default('15m'),
    REFRESH_TOKEN_EXPIRES_IN: zod_1.z.string().default('30d'),
    SERVER_SECRET: zod_1.z.string().min(32, 'SERVER_SECRET must be at least 32 characters for RNG seeding'),
    DEFAULT_STARTING_CHIPS: zod_1.z.string().default('1000').transform(Number),
    MAX_GAMES_PER_USER: zod_1.z.string().default('5').transform(Number),
    YOUTUBE_API_KEY: zod_1.z.string().optional(),
    RANDOM_ORG_API_KEY: zod_1.z.string().optional(),
    BCRYPT_ROUNDS: zod_1.z.string().default('12').transform(Number),
    RATE_LIMIT_WINDOW_MS: zod_1.z.string().default('60000').transform(Number),
    RATE_LIMIT_MAX_REQUESTS: zod_1.z.string().default('100').transform(Number),
    CORS_ORIGIN: zod_1.z.string().default('http://localhost:3001'),
    CORS_CREDENTIALS: zod_1.z.string().default('true').transform(val => val === 'true'),
    LOG_LEVEL: zod_1.z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    SENTRY_DSN: zod_1.z.string().optional(),
    ENABLE_METRICS: zod_1.z.string().default('true').transform(val => val === 'true'),
    ENABLE_REGISTRATION: zod_1.z.string().default('true').transform(val => val === 'true'),
    ENABLE_YOUTUBE_ENTROPY: zod_1.z.string().default('false').transform(val => val === 'true'),
    ENABLE_SPECTATOR_MODE: zod_1.z.string().default('true').transform(val => val === 'true'),
});
const parseResult = envSchema.safeParse(process.env);
if (!parseResult.success) {
    console.error('❌ Invalid environment configuration:');
    parseResult.error.issues.forEach(issue => {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
}
exports.config = parseResult.data;
exports.isDevelopment = exports.config.NODE_ENV === 'development';
exports.isProduction = exports.config.NODE_ENV === 'production';
exports.isStaging = exports.config.NODE_ENV === 'staging';
exports.dbConfig = {
    url: exports.config.DATABASE_URL,
    ssl: exports.isProduction ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    max: 20,
};
exports.redisConfig = exports.config.REDIS_URL ? {
    url: exports.config.REDIS_URL,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
} : null;
exports.jwtConfig = {
    secret: exports.config.JWT_SECRET,
    expiresIn: exports.config.JWT_EXPIRES_IN,
    refreshExpiresIn: exports.config.REFRESH_TOKEN_EXPIRES_IN,
    algorithm: 'HS256',
    issuer: 'poker-engine',
    audience: 'poker-players',
};
exports.gameConfig = {
    defaultStartingChips: exports.config.DEFAULT_STARTING_CHIPS,
    maxGamesPerUser: exports.config.MAX_GAMES_PER_USER,
    serverSecret: exports.config.SERVER_SECRET,
    enableYoutubeEntropy: exports.config.ENABLE_YOUTUBE_ENTROPY,
    enableSpectatorMode: exports.config.ENABLE_SPECTATOR_MODE,
};
exports.securityConfig = {
    bcryptRounds: exports.config.BCRYPT_ROUNDS,
    rateLimitWindowMs: exports.config.RATE_LIMIT_WINDOW_MS,
    rateLimitMaxRequests: exports.config.RATE_LIMIT_MAX_REQUESTS,
    corsOrigin: exports.config.CORS_ORIGIN,
    corsCredentials: exports.config.CORS_CREDENTIALS,
};
function validateRequiredEnvVars() {
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
exports.default = exports.config;
