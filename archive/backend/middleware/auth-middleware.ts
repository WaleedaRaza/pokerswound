import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth/auth-service';
import { JWTService } from '../services/auth/jwt-service';
import { User } from '../services/database/repositories/user-repository';
import { JWTPayload } from '../services/auth/jwt-service';

// Extend Express Request to include user data
declare global {
  namespace Express {
    interface Request {
      user?: User;
      tokenPayload?: JWTPayload;
    }
  }
}

export class AuthMiddleware {
  constructor(private authService: AuthService) {}

  /**
   * Middleware to require authentication
   */
  requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = JWTService.extractTokenFromHeader(req.headers.authorization);
      
      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Access token required'
        });
      }

      const { user, payload } = await this.authService.verifyAccessToken(token);
      
      if (!user || !payload) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }

      req.user = user;
      req.tokenPayload = payload;
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authentication error'
      });
    }
  };

  /**
   * Middleware to optionally include user data if authenticated
   */
  optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = JWTService.extractTokenFromHeader(req.headers.authorization);
      
      if (token) {
        const { user, payload } = await this.authService.verifyAccessToken(token);
        if (user && payload) {
          req.user = user;
          req.tokenPayload = payload;
        }
      }

      next();
    } catch (error) {
      console.error('Optional auth middleware error:', error);
      // Don't fail on optional auth, just continue without user
      next();
    }
  };

  /**
   * Middleware to require specific role
   */
  requireRole = (roles: string | string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const userRoles = Array.isArray(roles) ? roles : [roles];
      
      if (!userRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      next();
    };
  };

  /**
   * Middleware to require admin role
   */
  requireAdmin = this.requireRole(['admin']);

  /**
   * Middleware to require moderator or admin role
   */
  requireModerator = this.requireRole(['admin', 'moderator']);

  /**
   * Middleware to ensure user is not suspended
   */
  requireActive = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (req.user.role === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'Account is suspended'
      });
    }

    if (!req.user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    next();
  };

  /**
   * Middleware to ensure user owns the resource or is admin
   */
  requireOwnershipOrAdmin = (userIdParam: string = 'userId') => {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const resourceUserId = req.params[userIdParam];
      
      if (req.user.role === 'admin' || req.user.id === resourceUserId) {
        next();
      } else {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
    };
  };
}

/**
 * Rate limiting middleware for auth endpoints
 */
export const createAuthRateLimit = (windowMs: number = 15 * 60 * 1000, max: number = 5) => {
  const rateLimit = require('express-rate-limit');
  
  return rateLimit({
    windowMs, // 15 minutes by default
    max, // limit each IP to 5 requests per windowMs
    message: {
      success: false,
      error: 'Too many authentication attempts, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};
