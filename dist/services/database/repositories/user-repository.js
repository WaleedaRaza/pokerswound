"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
class UserRepository {
    constructor(pool) {
        this.pool = pool;
    }
    async createUser(userData) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`INSERT INTO users (email, username, password_hash, display_name, avatar_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`, [
                userData.email,
                userData.username,
                userData.password_hash,
                userData.display_name || userData.username,
                userData.avatar_url
            ]);
            return result.rows[0];
        }
        finally {
            client.release();
        }
    }
    async findByEmail(email) {
        const client = await this.pool.connect();
        try {
            const result = await client.query('SELECT * FROM users WHERE email = $1 AND is_active = true', [email]);
            return result.rows[0] || null;
        }
        finally {
            client.release();
        }
    }
    async findByUsername(username) {
        const client = await this.pool.connect();
        try {
            const result = await client.query('SELECT * FROM users WHERE username = $1 AND is_active = true', [username]);
            return result.rows[0] || null;
        }
        finally {
            client.release();
        }
    }
    async findById(id) {
        const client = await this.pool.connect();
        try {
            const result = await client.query('SELECT * FROM users WHERE id = $1 AND is_active = true', [id]);
            return result.rows[0] || null;
        }
        finally {
            client.release();
        }
    }
    async updateLastLogin(userId) {
        const client = await this.pool.connect();
        try {
            await client.query('UPDATE users SET last_login = NOW() WHERE id = $1', [userId]);
        }
        finally {
            client.release();
        }
    }
    async emailExists(email) {
        const client = await this.pool.connect();
        try {
            const result = await client.query('SELECT 1 FROM users WHERE email = $1', [email]);
            return result.rows.length > 0;
        }
        finally {
            client.release();
        }
    }
    async usernameExists(username) {
        const client = await this.pool.connect();
        try {
            const result = await client.query('SELECT 1 FROM users WHERE username = $1', [username]);
            return result.rows.length > 0;
        }
        finally {
            client.release();
        }
    }
    async createSession(sessionData) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`INSERT INTO user_sessions (user_id, refresh_token_hash, device_info, ip_address, user_agent, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`, [
                sessionData.user_id,
                sessionData.refresh_token_hash,
                sessionData.device_info,
                sessionData.ip_address,
                sessionData.user_agent,
                sessionData.expires_at
            ]);
            return result.rows[0];
        }
        finally {
            client.release();
        }
    }
    async findSessionByTokenHash(tokenHash) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`SELECT * FROM user_sessions 
         WHERE refresh_token_hash = $1 
         AND expires_at > NOW() 
         AND is_revoked = false`, [tokenHash]);
            return result.rows[0] || null;
        }
        finally {
            client.release();
        }
    }
    async updateSessionLastUsed(sessionId) {
        const client = await this.pool.connect();
        try {
            await client.query('UPDATE user_sessions SET last_used = NOW() WHERE id = $1', [sessionId]);
        }
        finally {
            client.release();
        }
    }
    async revokeSession(sessionId) {
        const client = await this.pool.connect();
        try {
            await client.query('UPDATE user_sessions SET is_revoked = true WHERE id = $1', [sessionId]);
        }
        finally {
            client.release();
        }
    }
    async revokeAllUserSessions(userId) {
        const client = await this.pool.connect();
        try {
            await client.query('UPDATE user_sessions SET is_revoked = true WHERE user_id = $1', [userId]);
        }
        finally {
            client.release();
        }
    }
    async cleanupExpiredSessions() {
        const client = await this.pool.connect();
        try {
            const result = await client.query('DELETE FROM user_sessions WHERE expires_at < NOW()');
            return result.rowCount || 0;
        }
        finally {
            client.release();
        }
    }
    async getUserActiveSessionsCount(userId) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`SELECT COUNT(*) as count FROM user_sessions 
         WHERE user_id = $1 
         AND expires_at > NOW() 
         AND is_revoked = false`, [userId]);
            return parseInt(result.rows[0].count);
        }
        finally {
            client.release();
        }
    }
}
exports.UserRepository = UserRepository;
