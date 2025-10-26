"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthRoutes = createAuthRoutes;
const express_1 = __importDefault(require("express"));
const auth_service_1 = require("../services/auth/auth-service");
const auth_middleware_1 = require("../middleware/auth-middleware");
function createAuthRoutes(pool) {
    const router = express_1.default.Router();
    const authService = new auth_service_1.AuthService(pool);
    const authMiddleware = new auth_middleware_1.AuthMiddleware(authService);
    const authRateLimit = (0, auth_middleware_1.createAuthRateLimit)(15 * 60 * 1000, 5);
    const refreshRateLimit = (0, auth_middleware_1.createAuthRateLimit)(5 * 60 * 1000, 10);
    router.post('/register', authRateLimit, async (req, res) => {
        try {
            const { email, username, password, displayName } = req.body;
            if (!email || !username || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Email, username, and password are required'
                });
            }
            const deviceInfo = {
                userAgent: req.headers['user-agent'],
                ip: req.ip,
                timestamp: new Date().toISOString()
            };
            const result = await authService.register({ email, username, password, displayName }, deviceInfo);
            if (!result.success) {
                return res.status(400).json(result);
            }
            res.cookie('refreshToken', result.tokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });
            res.status(201).json({
                success: true,
                message: 'Registration successful',
                user: result.user,
                accessToken: result.tokens.accessToken,
                expiresAt: result.tokens.accessTokenExpiresAt
            });
        }
        catch (error) {
            console.error('Registration endpoint error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    });
    router.post('/login', authRateLimit, async (req, res) => {
        try {
            const { emailOrUsername, password } = req.body;
            if (!emailOrUsername || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Email/username and password are required'
                });
            }
            const deviceInfo = {
                userAgent: req.headers['user-agent'],
                ip: req.ip,
                timestamp: new Date().toISOString()
            };
            const result = await authService.login({ emailOrUsername, password }, deviceInfo);
            if (!result.success) {
                return res.status(401).json(result);
            }
            res.cookie('refreshToken', result.tokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });
            res.json({
                success: true,
                message: 'Login successful',
                user: result.user,
                accessToken: result.tokens.accessToken,
                expiresAt: result.tokens.accessTokenExpiresAt
            });
        }
        catch (error) {
            console.error('Login endpoint error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    });
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
                res.clearCookie('refreshToken');
                return res.status(401).json(result);
            }
            res.cookie('refreshToken', result.tokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });
            res.json({
                success: true,
                message: 'Token refreshed successfully',
                accessToken: result.tokens.accessToken,
                expiresAt: result.tokens.accessTokenExpiresAt
            });
        }
        catch (error) {
            console.error('Refresh endpoint error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    });
    router.post('/logout', authMiddleware.requireAuth, async (req, res) => {
        try {
            const refreshToken = req.cookies.refreshToken;
            if (refreshToken) {
                await authService.logout(refreshToken);
            }
            res.clearCookie('refreshToken');
            res.json({
                success: true,
                message: 'Logout successful'
            });
        }
        catch (error) {
            console.error('Logout endpoint error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    });
    router.post('/logout-all', authMiddleware.requireAuth, async (req, res) => {
        try {
            await authService.logoutAll(req.user.id);
            res.clearCookie('refreshToken');
            res.json({
                success: true,
                message: 'Logged out from all sessions'
            });
        }
        catch (error) {
            console.error('Logout all endpoint error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    });
    router.get('/me', authMiddleware.requireAuth, async (req, res) => {
        try {
            res.json({
                success: true,
                user: req.user
            });
        }
        catch (error) {
            console.error('Me endpoint error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    });
    router.post('/validate', authMiddleware.requireAuth, async (req, res) => {
        try {
            res.json({
                success: true,
                valid: true,
                user: req.user,
                tokenPayload: req.tokenPayload
            });
        }
        catch (error) {
            console.error('Validate endpoint error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    });
    return router;
}
