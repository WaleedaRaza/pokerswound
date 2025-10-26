"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const user_repository_1 = require("../database/repositories/user-repository");
const password_service_1 = require("./password-service");
const jwt_service_1 = require("./jwt-service");
class AuthService {
    constructor(pool) {
        this.pool = pool;
        this.userRepository = new user_repository_1.UserRepository(pool);
    }
    async register(data, deviceInfo = {}) {
        try {
            const validationErrors = await this.validateRegistrationData(data);
            if (validationErrors.length > 0) {
                return {
                    success: false,
                    errors: validationErrors
                };
            }
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
            const passwordHash = await password_service_1.PasswordService.hashPassword(data.password);
            const userData = {
                email: data.email.toLowerCase(),
                username: data.username,
                password_hash: passwordHash,
                display_name: data.displayName || data.username
            };
            const user = await this.userRepository.createUser(userData);
            const tokens = jwt_service_1.JWTService.generateTokenPair({
                userId: user.id,
                email: user.email,
                username: user.username,
                role: user.role
            });
            await this.userRepository.createSession({
                user_id: user.id,
                refresh_token_hash: jwt_service_1.JWTService.hashRefreshToken(tokens.refreshToken),
                device_info: deviceInfo,
                expires_at: tokens.refreshTokenExpiresAt
            });
            await this.userRepository.updateLastLogin(user.id);
            return {
                success: true,
                user: this.sanitizeUser(user),
                tokens
            };
        }
        catch (error) {
            console.error('Registration error:', error);
            return {
                success: false,
                error: 'Registration failed. Please try again.'
            };
        }
    }
    async login(data, deviceInfo = {}) {
        try {
            const user = await this.findUserByEmailOrUsername(data.emailOrUsername);
            if (!user) {
                return {
                    success: false,
                    error: 'Invalid credentials'
                };
            }
            const isPasswordValid = await password_service_1.PasswordService.verifyPassword(data.password, user.password_hash);
            if (!isPasswordValid) {
                return {
                    success: false,
                    error: 'Invalid credentials'
                };
            }
            if (!user.is_active) {
                return {
                    success: false,
                    error: 'Account is deactivated. Please contact support.'
                };
            }
            const tokens = jwt_service_1.JWTService.generateTokenPair({
                userId: user.id,
                email: user.email,
                username: user.username,
                role: user.role
            });
            await this.userRepository.createSession({
                user_id: user.id,
                refresh_token_hash: jwt_service_1.JWTService.hashRefreshToken(tokens.refreshToken),
                device_info: deviceInfo,
                expires_at: tokens.refreshTokenExpiresAt
            });
            await this.userRepository.updateLastLogin(user.id);
            return {
                success: true,
                user: this.sanitizeUser(user),
                tokens
            };
        }
        catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: 'Login failed. Please try again.'
            };
        }
    }
    async refreshToken(refreshToken) {
        try {
            const tokenData = jwt_service_1.JWTService.verifyRefreshToken(refreshToken);
            if (!tokenData) {
                return {
                    success: false,
                    error: 'Invalid refresh token'
                };
            }
            const tokenHash = jwt_service_1.JWTService.hashRefreshToken(refreshToken);
            const session = await this.userRepository.findSessionByTokenHash(tokenHash);
            if (!session) {
                return {
                    success: false,
                    error: 'Session not found or expired'
                };
            }
            const user = await this.userRepository.findById(tokenData.userId);
            if (!user || !user.is_active) {
                return {
                    success: false,
                    error: 'User not found or inactive'
                };
            }
            const newTokens = jwt_service_1.JWTService.generateTokenPair({
                userId: user.id,
                email: user.email,
                username: user.username,
                role: user.role
            });
            await this.userRepository.revokeSession(session.id);
            await this.userRepository.createSession({
                user_id: user.id,
                refresh_token_hash: jwt_service_1.JWTService.hashRefreshToken(newTokens.refreshToken),
                device_info: session.device_info,
                expires_at: newTokens.refreshTokenExpiresAt
            });
            await this.userRepository.updateSessionLastUsed(session.id);
            return {
                success: true,
                tokens: newTokens
            };
        }
        catch (error) {
            console.error('Token refresh error:', error);
            return {
                success: false,
                error: 'Token refresh failed'
            };
        }
    }
    async logout(refreshToken) {
        try {
            const tokenHash = jwt_service_1.JWTService.hashRefreshToken(refreshToken);
            const session = await this.userRepository.findSessionByTokenHash(tokenHash);
            if (session) {
                await this.userRepository.revokeSession(session.id);
            }
            return { success: true };
        }
        catch (error) {
            console.error('Logout error:', error);
            return {
                success: false,
                error: 'Logout failed'
            };
        }
    }
    async logoutAll(userId) {
        try {
            await this.userRepository.revokeAllUserSessions(userId);
            return { success: true };
        }
        catch (error) {
            console.error('Logout all error:', error);
            return {
                success: false,
                error: 'Logout all failed'
            };
        }
    }
    async verifyAccessToken(token) {
        try {
            const payload = jwt_service_1.JWTService.verifyAccessToken(token);
            if (!payload) {
                return { user: null, payload: null };
            }
            const user = await this.userRepository.findById(payload.userId);
            if (!user || !user.is_active) {
                return { user: null, payload: null };
            }
            return { user: this.sanitizeUser(user), payload };
        }
        catch (error) {
            console.error('Token verification error:', error);
            return { user: null, payload: null };
        }
    }
    async validateRegistrationData(data) {
        const errors = [];
        if (!data.email) {
            errors.push('Email is required');
        }
        else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
                errors.push('Invalid email format');
            }
        }
        if (!data.username) {
            errors.push('Username is required');
        }
        else {
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
        if (!data.password) {
            errors.push('Password is required');
        }
        else {
            const passwordValidation = password_service_1.PasswordService.validatePasswordStrength(data.password);
            if (!passwordValidation.isValid) {
                errors.push(...passwordValidation.errors);
            }
        }
        return errors;
    }
    async findUserByEmailOrUsername(emailOrUsername) {
        if (emailOrUsername.includes('@')) {
            return this.userRepository.findByEmail(emailOrUsername.toLowerCase());
        }
        else {
            return this.userRepository.findByUsername(emailOrUsername);
        }
    }
    sanitizeUser(user) {
        const { password_hash, ...sanitizedUser } = user;
        return sanitizedUser;
    }
    async cleanupExpiredSessions() {
        return this.userRepository.cleanupExpiredSessions();
    }
}
exports.AuthService = AuthService;
