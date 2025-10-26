"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.dbConfig = void 0;
exports.dbConfig = {
    url: process.env.DATABASE_URL || '',
    ssl: process.env.DATABASE_URL?.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    max: 10
};
exports.config = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3000'),
    LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};
