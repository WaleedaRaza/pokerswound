import { Express } from 'express';
import authRoutes from './auth';

export function setupRoutes(app: Express): void {
  // API routes
  app.use('/api/auth', authRoutes);
  
  app.use('/api/games', (req, res) => {
    res.json({ message: 'Game routes - TODO' });
  });
  
  app.use('/api/players', (req, res) => {
    res.json({ message: 'Player routes - TODO' });
  });
  
  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
} 