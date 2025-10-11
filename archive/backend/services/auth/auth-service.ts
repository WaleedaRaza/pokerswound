import { Pool } from 'pg';
import { UserRepository, User, CreateUserData } from '../database/repositories/user-repository';
import { PasswordService } from './password-service';
import { JWTService, TokenPair, JWTPayload } from './jwt-service';

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

export interface LoginData {
  emailOrUsername: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  tokens?: TokenPair;
  error?: string;
  errors?: string[];
}

export interface RefreshResult {
  success: boolean;
  tokens?: TokenPair;
  error?: string;
}

export class AuthService {
  private userRepository: UserRepository;

  constructor(private pool: Pool) {
    this.userRepository = new UserRepository(pool);
  }

  /**
   * Register a new user
   */
  async register(data: RegisterData, deviceInfo: any = {}): Promise<AuthResult> {
    try {
      // Validate input
      const validationErrors = await this.validateRegistrationData(data);
      if (validationErrors.length > 0) {
        return {
          success: false,
          errors: validationErrors
        };
      }

      // Check if user already exists
      const [emailExists, usernameExists] = await Promise.all([
        this.userRepository.emailExists(data.email),
        this.userRepository.usernameExists(data.username)
      ]);

      if (emailExists) {
        return {
          success: false,
          error: 'Email is already registered'
        };
      }

      if (usernameExists) {
        return {
          success: false,
          error: 'Username is already taken'
        };
      }

      // Hash password
      const passwordHash = await PasswordService.hashPassword(data.password);

      // Create user
      const userData: CreateUserData = {
        email: data.email.toLowerCase(),
        username: data.username,
        password_hash: passwordHash,
        display_name: data.displayName || data.username
      };

      const user = await this.userRepository.createUser(userData);

      // Generate tokens
      const tokens = JWTService.generateTokenPair({
        userId: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      });

      // Store refresh token
      await this.userRepository.createSession({
        user_id: user.id,
        refresh_token_hash: JWTService.hashRefreshToken(tokens.refreshToken),
        device_info: deviceInfo,
        expires_at: tokens.refreshTokenExpiresAt
      });

      // Update last login
      await this.userRepository.updateLastLogin(user.id);

      return {
        success: true,
        user: this.sanitizeUser(user),
        tokens
      };

    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Registration failed. Please try again.'
      };
    }
  }

  /**
   * Login user
   */
  async login(data: LoginData, deviceInfo: any = {}): Promise<AuthResult> {
    try {
      // Find user by email or username
      const user = await this.findUserByEmailOrUsername(data.emailOrUsername);
      
      if (!user) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // Verify password
      const isPasswordValid = await PasswordService.verifyPassword(
        data.password,
        user.password_hash
      );

      if (!isPasswordValid) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // Check if user is active
      if (!user.is_active) {
        return {
          success: false,
          error: 'Account is deactivated. Please contact support.'
        };
      }

      // Generate tokens
      const tokens = JWTService.generateTokenPair({
        userId: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      });

      // Store refresh token
      await this.userRepository.createSession({
        user_id: user.id,
        refresh_token_hash: JWTService.hashRefreshToken(tokens.refreshToken),
        device_info: deviceInfo,
        expires_at: tokens.refreshTokenExpiresAt
      });

      // Update last login
      await this.userRepository.updateLastLogin(user.id);

      return {
        success: true,
        user: this.sanitizeUser(user),
        tokens
      };

    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Login failed. Please try again.'
      };
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<RefreshResult> {
    try {
      // Verify refresh token
      const tokenData = JWTService.verifyRefreshToken(refreshToken);
      if (!tokenData) {
        return {
          success: false,
          error: 'Invalid refresh token'
        };
      }

      // Check if session exists and is valid
      const tokenHash = JWTService.hashRefreshToken(refreshToken);
      const session = await this.userRepository.findSessionByTokenHash(tokenHash);
      
      if (!session) {
        return {
          success: false,
          error: 'Session not found or expired'
        };
      }

      // Get user
      const user = await this.userRepository.findById(tokenData.userId);
      if (!user || !user.is_active) {
        return {
          success: false,
          error: 'User not found or inactive'
        };
      }

      // Generate new tokens
      const newTokens = JWTService.generateTokenPair({
        userId: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      });

      // Update session with new refresh token
      await this.userRepository.revokeSession(session.id);
      await this.userRepository.createSession({
        user_id: user.id,
        refresh_token_hash: JWTService.hashRefreshToken(newTokens.refreshToken),
        device_info: session.device_info,
        expires_at: newTokens.refreshTokenExpiresAt
      });

      // Update session last used
      await this.userRepository.updateSessionLastUsed(session.id);

      return {
        success: true,
        tokens: newTokens
      };

    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        error: 'Token refresh failed'
      };
    }
  }

  /**
   * Logout user (revoke session)
   */
  async logout(refreshToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      const tokenHash = JWTService.hashRefreshToken(refreshToken);
      const session = await this.userRepository.findSessionByTokenHash(tokenHash);
      
      if (session) {
        await this.userRepository.revokeSession(session.id);
      }

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        error: 'Logout failed'
      };
    }
  }

  /**
   * Logout all sessions for a user
   */
  async logoutAll(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.userRepository.revokeAllUserSessions(userId);
      return { success: true };
    } catch (error) {
      console.error('Logout all error:', error);
      return {
        success: false,
        error: 'Logout all failed'
      };
    }
  }

  /**
   * Verify access token and get user
   */
  async verifyAccessToken(token: string): Promise<{ user: User | null; payload: JWTPayload | null }> {
    try {
      const payload = JWTService.verifyAccessToken(token);
      if (!payload) {
        return { user: null, payload: null };
      }

      const user = await this.userRepository.findById(payload.userId);
      if (!user || !user.is_active) {
        return { user: null, payload: null };
      }

      return { user: this.sanitizeUser(user), payload };
    } catch (error) {
      console.error('Token verification error:', error);
      return { user: null, payload: null };
    }
  }

  /**
   * Validate registration data
   */
  private async validateRegistrationData(data: RegisterData): Promise<string[]> {
    const errors: string[] = [];

    // Email validation
    if (!data.email) {
      errors.push('Email is required');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push('Invalid email format');
      }
    }

    // Username validation
    if (!data.username) {
      errors.push('Username is required');
    } else {
      if (data.username.length < 3) {
        errors.push('Username must be at least 3 characters long');
      }
      if (data.username.length > 50) {
        errors.push('Username must be less than 50 characters');
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(data.username)) {
        errors.push('Username can only contain letters, numbers, underscores, and hyphens');
      }
    }

    // Password validation
    if (!data.password) {
      errors.push('Password is required');
    } else {
      const passwordValidation = PasswordService.validatePasswordStrength(data.password);
      if (!passwordValidation.isValid) {
        errors.push(...passwordValidation.errors);
      }
    }

    return errors;
  }

  /**
   * Find user by email or username
   */
  private async findUserByEmailOrUsername(emailOrUsername: string): Promise<User | null> {
    // Check if it's an email (contains @)
    if (emailOrUsername.includes('@')) {
      return this.userRepository.findByEmail(emailOrUsername.toLowerCase());
    } else {
      return this.userRepository.findByUsername(emailOrUsername);
    }
  }

  /**
   * Remove sensitive data from user object
   */
  private sanitizeUser(user: User): User {
    const { password_hash, ...sanitizedUser } = user;
    return sanitizedUser as User;
  }

  /**
   * Clean up expired sessions (should be run periodically)
   */
  async cleanupExpiredSessions(): Promise<number> {
    return this.userRepository.cleanupExpiredSessions();
  }
}
