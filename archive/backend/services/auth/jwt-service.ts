import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../../config/environment';

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  role: string;
  sessionId: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

export class JWTService {
  /**
   * Generate access and refresh token pair
   */
  static generateTokenPair(payload: Omit<JWTPayload, 'sessionId'>): TokenPair {
    const sessionId = crypto.randomUUID();
    const fullPayload: JWTPayload = { ...payload, sessionId };

    // Access token (short-lived)
    const accessToken = jwt.sign(
      fullPayload,
      config.JWT_SECRET,
      { 
        expiresIn: '15m', // 15 minutes
        issuer: 'poker-engine',
        audience: 'poker-client'
      }
    );

    // Refresh token (long-lived)
    const refreshToken = jwt.sign(
      { 
        userId: payload.userId, 
        sessionId,
        type: 'refresh'
      },
      config.JWT_SECRET,
      { 
        expiresIn: '7d', // 7 days
        issuer: 'poker-engine',
        audience: 'poker-client'
      }
    );

    const now = new Date();
    const accessTokenExpiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
    const refreshTokenExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt
    };
  }

  /**
   * Verify and decode access token
   */
  static verifyAccessToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET, {
        issuer: 'poker-engine',
        audience: 'poker-client'
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      console.error('Access token verification failed:', error);
      return null;
    }
  }

  /**
   * Verify and decode refresh token
   */
  static verifyRefreshToken(token: string): { userId: string; sessionId: string } | null {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET, {
        issuer: 'poker-engine',
        audience: 'poker-client'
      }) as any;

      if (decoded.type !== 'refresh') {
        return null;
      }

      return {
        userId: decoded.userId,
        sessionId: decoded.sessionId
      };
    } catch (error) {
      console.error('Refresh token verification failed:', error);
      return null;
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Generate secure refresh token hash for storage
   */
  static hashRefreshToken(refreshToken: string): string {
    return crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');
  }

  /**
   * Generate rejoin token for game reconnection
   */
  static generateRejoinToken(userId: string, gameId: string, roomId: string): string {
    const payload = {
      userId,
      gameId,
      roomId,
      type: 'rejoin',
      timestamp: Date.now()
    };

    return jwt.sign(
      payload,
      config.JWT_SECRET,
      { 
        expiresIn: '1h', // 1 hour to rejoin
        issuer: 'poker-engine',
        audience: 'poker-client'
      }
    );
  }

  /**
   * Verify rejoin token
   */
  static verifyRejoinToken(token: string): {
    userId: string;
    gameId: string;
    roomId: string;
  } | null {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET, {
        issuer: 'poker-engine',
        audience: 'poker-client'
      }) as any;

      if (decoded.type !== 'rejoin') {
        return null;
      }

      return {
        userId: decoded.userId,
        gameId: decoded.gameId,
        roomId: decoded.roomId
      };
    } catch (error) {
      console.error('Rejoin token verification failed:', error);
      return null;
    }
  }
}
