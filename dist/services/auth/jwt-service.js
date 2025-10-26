"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWTService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const environment_1 = require("../../config/environment");
class JWTService {
    static generateTokenPair(payload) {
        const sessionId = crypto_1.default.randomUUID();
        const fullPayload = { ...payload, sessionId };
        const accessToken = jsonwebtoken_1.default.sign(fullPayload, environment_1.config.JWT_SECRET, {
            expiresIn: '15m',
            issuer: 'poker-engine',
            audience: 'poker-client'
        });
        const refreshToken = jsonwebtoken_1.default.sign({
            userId: payload.userId,
            sessionId,
            type: 'refresh'
        }, environment_1.config.JWT_SECRET, {
            expiresIn: '7d',
            issuer: 'poker-engine',
            audience: 'poker-client'
        });
        const now = new Date();
        const accessTokenExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);
        const refreshTokenExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return {
            accessToken,
            refreshToken,
            accessTokenExpiresAt,
            refreshTokenExpiresAt
        };
    }
    static verifyAccessToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, environment_1.config.JWT_SECRET, {
                issuer: 'poker-engine',
                audience: 'poker-client'
            });
            return decoded;
        }
        catch (error) {
            console.error('Access token verification failed:', error);
            return null;
        }
    }
    static verifyRefreshToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, environment_1.config.JWT_SECRET, {
                issuer: 'poker-engine',
                audience: 'poker-client'
            });
            if (decoded.type !== 'refresh') {
                return null;
            }
            return {
                userId: decoded.userId,
                sessionId: decoded.sessionId
            };
        }
        catch (error) {
            console.error('Refresh token verification failed:', error);
            return null;
        }
    }
    static extractTokenFromHeader(authHeader) {
        if (!authHeader) {
            return null;
        }
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return null;
        }
        return parts[1];
    }
    static hashRefreshToken(refreshToken) {
        return crypto_1.default
            .createHash('sha256')
            .update(refreshToken)
            .digest('hex');
    }
    static generateRejoinToken(userId, gameId, roomId) {
        const payload = {
            userId,
            gameId,
            roomId,
            type: 'rejoin',
            timestamp: Date.now()
        };
        return jsonwebtoken_1.default.sign(payload, environment_1.config.JWT_SECRET, {
            expiresIn: '1h',
            issuer: 'poker-engine',
            audience: 'poker-client'
        });
    }
    static verifyRejoinToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, environment_1.config.JWT_SECRET, {
                issuer: 'poker-engine',
                audience: 'poker-client'
            });
            if (decoded.type !== 'rejoin') {
                return null;
            }
            return {
                userId: decoded.userId,
                gameId: decoded.gameId,
                roomId: decoded.roomId
            };
        }
        catch (error) {
            console.error('Rejoin token verification failed:', error);
            return null;
        }
    }
}
exports.JWTService = JWTService;
