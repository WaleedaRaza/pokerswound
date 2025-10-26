"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthRateLimit = exports.AuthMiddleware = void 0;
const jwt_service_1 = require("../services/auth/jwt-service");
class AuthMiddleware {
    constructor(authService) {
        this.authService = authService;
        this.requireAuth = async (req, res, next) => {
            try {
                const token = jwt_service_1.JWTService.extractTokenFromHeader(req.headers.authorization);
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
            }
            catch (error) {
                console.error('Auth middleware error:', error);
                return res.status(500).json({
                    success: false,
                    error: 'Authentication error'
                });
            }
        };
        this.optionalAuth = async (req, res, next) => {
            try {
                const token = jwt_service_1.JWTService.extractTokenFromHeader(req.headers.authorization);
                if (token) {
                    const { user, payload } = await this.authService.verifyAccessToken(token);
                    if (user && payload) {
                        req.user = user;
                        req.tokenPayload = payload;
                    }
                }
                next();
            }
            catch (error) {
                console.error('Optional auth middleware error:', error);
                next();
            }
        };
        this.requireRole = (roles) => {
            return async (req, res, next) => {
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
        this.requireAdmin = this.requireRole(['admin']);
        this.requireModerator = this.requireRole(['admin', 'moderator']);
        this.requireActive = async (req, res, next) => {
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
        this.requireOwnershipOrAdmin = (userIdParam = 'userId') => {
            return async (req, res, next) => {
                if (!req.user) {
                    return res.status(401).json({
                        success: false,
                        error: 'Authentication required'
                    });
                }
                const resourceUserId = req.params[userIdParam];
                if (req.user.role === 'admin' || req.user.id === resourceUserId) {
                    next();
                }
                else {
                    return res.status(403).json({
                        success: false,
                        error: 'Access denied'
                    });
                }
            };
        };
    }
}
exports.AuthMiddleware = AuthMiddleware;
const createAuthRateLimit = (windowMs = 15 * 60 * 1000, max = 5) => {
    const rateLimit = require('express-rate-limit');
    return rateLimit({
        windowMs,
        max,
        message: {
            success: false,
            error: 'Too many authentication attempts, please try again later'
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
};
exports.createAuthRateLimit = createAuthRateLimit;
