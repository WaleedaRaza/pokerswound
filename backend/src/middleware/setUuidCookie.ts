// middleware/setUuidCookie.ts
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

export function setUuidCookie(req: Request, res: Response, next: NextFunction) {
  if (!req.cookies.player_id) {
    const newUuid = uuidv4();
    res.cookie('player_id', newUuid, {
      httpOnly: true,
      secure: false, // Set to true in production (HTTPS)
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    });
    req.cookies.player_id = newUuid;
  }
  next();
}
