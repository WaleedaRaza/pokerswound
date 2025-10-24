import express from 'express';
import { Pool } from 'pg';
import { DisplayService } from '../services/game/DisplayService';

export function createGameDisplayRoutes(db: Pool): express.Router {
  const router = express.Router();
  const displayService = new DisplayService(db);
  
  router.get('/:gameId/players', async (req, res) => {
    try {
      const { gameId } = req.params;
      const displayMap = await displayService.getGamePlayerDisplays(gameId);
      const players = Array.from(displayMap.values());
      
      res.json({ players });
    } catch (error) {
      console.error('Error fetching game players:', error);
      res.status(500).json({ error: 'Failed to fetch game players' });
    }
  });
  
  router.post('/:gameId/alias', async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      
      const { gameId } = req.params;
      const { alias } = req.body;
      
      if (!alias) return res.status(400).json({ error: 'Alias is required' });
      
      const result = await displayService.setGameAlias(userId, gameId, alias);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json({ success: true, message: 'Game alias set' });
    } catch (error) {
      console.error('Error setting game alias:', error);
      res.status(500).json({ error: 'Failed to set game alias' });
    }
  });
  
  router.get('/:gameId/player/:userId/display', async (req, res) => {
    try {
      const { gameId, userId } = req.params;
      const display = await displayService.getPlayerDisplayName(userId, gameId);
      
      res.json({ display });
    } catch (error) {
      console.error('Error fetching player display:', error);
      res.status(500).json({ error: 'Failed to fetch player display' });
    }
  });
  
  return router;
}

