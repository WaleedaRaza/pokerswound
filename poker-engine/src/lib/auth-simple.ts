/**
 * Simple Authentication System
 * Works with existing database schema
 */

import * as bcrypt from 'bcrypt'
import * as jwt from 'jsonwebtoken'
import { Pool } from 'pg'

// Types for our existing database schema
export interface User {
  id: string
  email: string
  username: string
  password_hash: string
  display_name?: string
  avatar_url?: string
  total_chips?: number
  is_active?: boolean
  is_verified?: boolean
  role?: string
  created_at?: string
  updated_at?: string
  last_login?: string
  email_verified_at?: string
}

export interface AuthResult {
  success: boolean
  user?: User
  token?: string
  refreshToken?: string
  error?: string
}

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : false
})

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-development-only'
const JWT_EXPIRES_IN = '7d'
const REFRESH_TOKEN_EXPIRES_IN = '30d'

export class AuthService {
  /**
   * Register a new user
   */
  async signup(email: string, username: string, password: string, displayName?: string): Promise<AuthResult> {
    try {
      // Check if email already exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      )

      if (existingUser.rows.length > 0) {
        return { success: false, error: 'Email already registered' }
      }

      // Check if username already exists
      const existingUsername = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      )

      if (existingUsername.rows.length > 0) {
        return { success: false, error: 'Username already taken' }
      }

      // Validate username
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return { success: false, error: 'Username can only contain letters, numbers, and underscores' }
      }

      if (username.length < 3 || username.length > 20) {
        return { success: false, error: 'Username must be between 3 and 20 characters' }
      }

      // Hash password
      const saltRounds = 12
      const passwordHash = await bcrypt.hash(password, saltRounds)

      // Create user
      const result = await pool.query(
        `INSERT INTO users (email, username, password_hash, display_name, is_active, is_verified, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING id, email, username, display_name, avatar_url, total_chips, is_active, is_verified, role, created_at, updated_at`,
        [
          email,
          username,
          passwordHash,
          displayName || username,
          true,
          false, // Email verification not implemented yet
          'user'
        ]
      )

      const user = result.rows[0]

      // Generate tokens
      const payload = { userId: user.id, email: user.email }
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

      const refreshToken = this.generateRefreshToken()
      const refreshTokenHash = await bcrypt.hash(refreshToken, saltRounds)

      // Create session
      await pool.query(
        `INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at, created_at, last_used)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [
          user.id,
          refreshTokenHash,
          new Date(Date.now() + this.parseExpiresIn(REFRESH_TOKEN_EXPIRES_IN))
        ]
      )

      return {
        success: true,
        user: {
          ...user,
          password_hash: undefined // Don't return password hash
        } as User,
        token,
        refreshToken
      }

    } catch (error) {
      console.error('Signup error:', error)
      return { success: false, error: 'Registration failed' }
    }
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<AuthResult> {
    try {
      // Find user by email
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      )

      if (result.rows.length === 0) {
        return { success: false, error: 'Invalid email or password' }
      }

      const user = result.rows[0]

      // Check if user is active
      if (!user.is_active) {
        return { success: false, error: 'Account is deactivated' }
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash)

      if (!isValidPassword) {
        return { success: false, error: 'Invalid email or password' }
      }

      // Update last login
      await pool.query(
        'UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1',
        [user.id]
      )

      // Generate tokens
      const payload = { userId: user.id, email: user.email }
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

      const refreshToken = this.generateRefreshToken()
      const refreshTokenHash = await bcrypt.hash(refreshToken, 12)

      // Create session
      await pool.query(
        `INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at, created_at, last_used)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [
          user.id,
          refreshTokenHash,
          new Date(Date.now() + this.parseExpiresIn(REFRESH_TOKEN_EXPIRES_IN))
        ]
      )

      return {
        success: true,
        user: {
          ...user,
          password_hash: undefined // Don't return password hash
        } as User,
        token,
        refreshToken
      }

    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Login failed' }
    }
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<User | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any

      // Get user from database
      const result = await pool.query(
        'SELECT * FROM users WHERE id = $1 AND is_active = true',
        [decoded.userId]
      )

      if (result.rows.length === 0) {
        return null
      }

      const user = result.rows[0]
      return {
        ...user,
        password_hash: undefined // Don't return password hash
      } as User

    } catch (error) {
      console.error('Token verification error:', error)
      return null
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE id = $1 AND is_active = true',
        [userId]
      )

      if (result.rows.length === 0) {
        return null
      }

      const user = result.rows[0]
      return {
        ...user,
        password_hash: undefined // Don't return password hash
      } as User

    } catch (error) {
      console.error('Get user error:', error)
      return null
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: Partial<User>): Promise<User | null> {
    try {
      const allowedFields = ['display_name', 'avatar_url', 'username']
      const updateFields = []
      const values = []
      let paramCount = 1

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updateFields.push(`${key} = $${paramCount}`)
          values.push(value)
          paramCount++
        }
      }

      if (updateFields.length === 0) {
        return this.getUserById(userId)
      }

      updateFields.push(`updated_at = $${paramCount}`)
      values.push(new Date().toISOString())
      values.push(userId)

      const result = await pool.query(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount + 1} RETURNING *`,
        values
      )

      if (result.rows.length === 0) {
        return null
      }

      const user = result.rows[0]
      return {
        ...user,
        password_hash: undefined // Don't return password hash
      } as User

    } catch (error) {
      console.error('Update profile error:', error)
      return null
    }
  }

  /**
   * Generate secure refresh token
   */
  private generateRefreshToken(): string {
    return require('crypto').randomBytes(32).toString('hex')
  }

  /**
   * Parse expires in string to milliseconds
   */
  private parseExpiresIn(expiresIn: string): number {
    const unit = expiresIn.slice(-1)
    const value = parseInt(expiresIn.slice(0, -1))

    switch (unit) {
      case 'd': return value * 24 * 60 * 60 * 1000
      case 'h': return value * 60 * 60 * 1000
      case 'm': return value * 60 * 1000
      case 's': return value * 1000
      default: return 30 * 24 * 60 * 60 * 1000 // 30 days default
    }
  }
}

// Export singleton instance
export const authService = new AuthService()
