import express from 'express';
import { AuthService } from '../services/auth/auth-service';
import { AuthMiddleware, createAuthRateLimit } from '../middleware/auth-middleware';
import { Pool } from 'pg';

export function createAuthRoutes(pool: Pool) {
  const router = express.Router();
  const authService = new AuthService(pool);
  const authMiddleware = new AuthMiddleware(authService);

  // Rate limiting for auth endpoints
  const authRateLimit = createAuthRateLimit(15 * 60 * 1000, 5); // 5 attempts per 15 minutes
  const refreshRateLimit = createAuthRateLimit(5 * 60 * 1000, 10); // 10 refresh attempts per 5 minutes

  /**
   * POST /auth/register
   * Register a new user
   */
  router.post('/register', authRateLimit, async (req, res) => {
    try {
      const { email, username, password, displayName } = req.body;

      // Basic validation
      if (!email || !username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email, username, and password are required'
        });
      }

      // Get device info
      const deviceInfo = {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        timestamp: new Date().toISOString()
      };

      const result = await authService.register(
        { email, username, password, displayName },
        deviceInfo
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', result.tokens!.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        user: result.user,
        accessToken: result.tokens!.accessToken,
        expiresAt: result.tokens!.accessTokenExpiresAt
      });

    } catch (error) {
      console.error('Registration endpoint error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * POST /auth/login
   * Login user
   */
  router.post('/login', authRateLimit, async (req, res) => {
    try {
      const { emailOrUsername, password } = req.body;

      if (!emailOrUsername || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email/username and password are required'
        });
      }

      // Get device info
      const deviceInfo = {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        timestamp: new Date().toISOString()
      };

      const result = await authService.login(
        { emailOrUsername, password },
        deviceInfo
      );

      if (!result.success) {
        return res.status(401).json(result);
      }

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', result.tokens!.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({
        success: true,
        message: 'Login successful',
        user: result.user,
        accessToken: result.tokens!.accessToken,
        expiresAt: result.tokens!.accessTokenExpiresAt
      });

    } catch (error) {
      console.error('Login endpoint error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * POST /auth/refresh
   * Refresh access token
   */
  router.post('/refresh', refreshRateLimit, async (req, res) => {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          error: 'Refresh token required'
        });
      }

      const result = await authService.refreshToken(refreshToken);

      if (!result.success) {
        // Clear invalid refresh token cookie
        res.clearCookie('refreshToken');
        return res.status(401).json(result);
      }

      // Set new refresh token as httpOnly cookie
      res.cookie('refreshToken', result.tokens!.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        accessToken: result.tokens!.accessToken,
        expiresAt: result.tokens!.accessTokenExpiresAt
      });

    } catch (error) {
      console.error('Refresh endpoint error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * POST /auth/logout
   * Logout user (revoke current session)
   */
  router.post('/logout', authMiddleware.requireAuth, async (req, res) => {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      // Clear refresh token cookie
      res.clearCookie('refreshToken');

      res.json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      console.error('Logout endpoint error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * POST /auth/logout-all
   * Logout from all sessions
   */
  router.post('/logout-all', authMiddleware.requireAuth, async (req, res) => {
    try {
      await authService.logoutAll(req.user!.id);

      // Clear refresh token cookie
      res.clearCookie('refreshToken');

      res.json({
        success: true,
        message: 'Logged out from all sessions'
      });

    } catch (error) {
      console.error('Logout all endpoint error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * GET /auth/me
   * Get current user info
   */
  router.get('/me', authMiddleware.requireAuth, async (req, res) => {
    try {
      res.json({
        success: true,
        user: req.user
      });
    } catch (error) {
      console.error('Me endpoint error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * POST /auth/validate
   * Validate access token
   */
  router.post('/validate', authMiddleware.requireAuth, async (req, res) => {
    try {
      res.json({
        success: true,
        valid: true,
        user: req.user,
        tokenPayload: req.tokenPayload
      });
    } catch (error) {
      console.error('Validate endpoint error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  return router;
}
