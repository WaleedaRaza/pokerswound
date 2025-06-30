import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../auth/jwt';

export interface AuthedRequest extends Request {
  user?: { id: string; email: string };
}

export function requireAuth(
  req: AuthedRequest, res: Response, next: NextFunction
) {
  const auth = req.headers.authorization?.split(' ');
  if (!auth || auth[0] !== 'Bearer') return res.sendStatus(401);

  try {
    const payload = verifyToken(auth[1]);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    return res.sendStatus(401);
  }
}
