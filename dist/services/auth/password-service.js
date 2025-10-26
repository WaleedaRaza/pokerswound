"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const environment_1 = require("../../config/environment");
class PasswordService {
    static async hashPassword(password) {
        const saltRounds = environment_1.config.BCRYPT_ROUNDS;
        return bcryptjs_1.default.hash(password, saltRounds);
    }
    static async verifyPassword(password, hash) {
        return bcryptjs_1.default.compare(password, hash);
    }
    static validatePasswordStrength(password) {
        const errors = [];
        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }
        if (password.length > 128) {
            errors.push('Password must be less than 128 characters');
        }
        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        if (!/[0-9]/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }
        if (/(.)\1{2,}/.test(password)) {
            errors.push('Password cannot contain more than 2 consecutive identical characters');
        }
        const commonPasswords = [
            'password', '123456', '123456789', 'qwerty', 'abc123',
            'password123', 'admin', 'letmein', 'welcome', 'monkey'
        ];
        if (commonPasswords.includes(password.toLowerCase())) {
            errors.push('Password is too common, please choose a more secure password');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
exports.PasswordService = PasswordService;
