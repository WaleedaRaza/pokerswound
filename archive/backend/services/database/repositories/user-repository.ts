import { Pool, PoolClient } from 'pg';

export interface User {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  display_name?: string;
  avatar_url?: string;
  total_chips: number;
  is_active: boolean;
  is_verified: boolean;
  role: 'player' | 'admin' | 'moderator' | 'suspended';
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
  email_verified_at?: Date;
}

export interface CreateUserData {
  email: string;
  username: string;
  password_hash: string;
  display_name?: string;
  avatar_url?: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  device_info: any;
  ip_address?: string;
  user_agent?: string;
  expires_at: Date;
  created_at: Date;
  last_used: Date;
  is_revoked: boolean;
}

export class UserRepository {
  constructor(private pool: Pool) {}

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserData): Promise<User> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO users (email, username, password_hash, display_name, avatar_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          userData.email,
          userData.username,
          userData.password_hash,
          userData.display_name || userData.username,
          userData.avatar_url
        ]
      );

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM users WHERE email = $1 AND is_active = true',
        [email]
      );

      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM users WHERE username = $1 AND is_active = true',
        [username]
      );

      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM users WHERE id = $1 AND is_active = true',
        [id]
      );

      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [userId]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT 1 FROM users WHERE email = $1',
        [email]
      );

      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  /**
   * Check if username exists
   */
  async usernameExists(username: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT 1 FROM users WHERE username = $1',
        [username]
      );

      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  /**
   * Create user session
   */
  async createSession(sessionData: {
    user_id: string;
    refresh_token_hash: string;
    device_info: any;
    ip_address?: string;
    user_agent?: string;
    expires_at: Date;
  }): Promise<UserSession> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO user_sessions (user_id, refresh_token_hash, device_info, ip_address, user_agent, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          sessionData.user_id,
          sessionData.refresh_token_hash,
          sessionData.device_info,
          sessionData.ip_address,
          sessionData.user_agent,
          sessionData.expires_at
        ]
      );

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Find session by refresh token hash
   */
  async findSessionByTokenHash(tokenHash: string): Promise<UserSession | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM user_sessions 
         WHERE refresh_token_hash = $1 
         AND expires_at > NOW() 
         AND is_revoked = false`,
        [tokenHash]
      );

      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * Update session last used timestamp
   */
  async updateSessionLastUsed(sessionId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        'UPDATE user_sessions SET last_used = NOW() WHERE id = $1',
        [sessionId]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Revoke session
   */
  async revokeSession(sessionId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        'UPDATE user_sessions SET is_revoked = true WHERE id = $1',
        [sessionId]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Revoke all user sessions
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        'UPDATE user_sessions SET is_revoked = true WHERE user_id = $1',
        [userId]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM user_sessions WHERE expires_at < NOW()'
      );

      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  /**
   * Get user's active sessions count
   */
  async getUserActiveSessionsCount(userId: string): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT COUNT(*) as count FROM user_sessions 
         WHERE user_id = $1 
         AND expires_at > NOW() 
         AND is_revoked = false`,
        [userId]
      );

      return parseInt(result.rows[0].count);
    } finally {
      client.release();
    }
  }
}
