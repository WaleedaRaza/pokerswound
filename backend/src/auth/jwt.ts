import jwt from 'jsonwebtoken';
import { UserRecord } from './userStore';

const {
  JWT_SECRET,
  JWT_EXPIRES_IN = '15m',
  REFRESH_EXPIRES_IN = '7d',
} = process.env;

export interface JwtPayload {
  sub: string;       // user id
  email: string;
}

export function signAccessToken(user: UserRecord) {
  return jwt.sign(
    { sub: user.id, email: user.email } as JwtPayload,
    JWT_SECRET!,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function signRefreshToken(user: UserRecord) {
  return jwt.sign(
    { sub: user.id } as JwtPayload,
    JWT_SECRET!,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET!) as JwtPayload;
}
