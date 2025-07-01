import { Express, json, urlencoded } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';        // ← must parse cookies
import authRoutes from '../routes/auth';

export function setupMiddleware(app: Express): void {
  /* ─── Security / compression ─── */
  app.use(helmet());
  app.use(compression());

  /* ─── CORS (allow cookies) ─── */
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,            // ←  allow Cookie / Authorization headers
    })
  );

  /* ─── Cookie + Body parsers ─── */
  app.use(cookieParser());          // ←  must run BEFORE your routes
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  /* ─── Simple request logger ─── */
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });

  /* ─── Routes ─── */
  app.use('/api', authRoutes);      // yields /api/auth/login, /api/auth/me, …
}
