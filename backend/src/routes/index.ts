import { Express } from 'express';
<<<<<<< Updated upstream
import authRoutes from './auth';
=======
import games from './games';
import { setUuidCookie } from '../middleware/setUuidCookie';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';
import gamePlayers from './gamePlayers';
>>>>>>> Stashed changes

export function setupRoutes(app: Express): void {

  app.use(cookieParser());
  app.use(setUuidCookie)

  app.get('/api/getadminuuid', (req, res) => {
  const adminUuid = uuidv4();
  console.log('Generated admin UUID:', adminUuid);
  return res.status(200).json({ adminUuid });
});

  app.use('/api/player', gamePlayers);

  app.use('/api/game', games);

  // API routes
  app.use('/api/auth', authRoutes);
  
  
  app.use('/api/players', (req, res) => {
    res.json({ message: 'Player routes - TODO' });
  });
  
  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
} 
