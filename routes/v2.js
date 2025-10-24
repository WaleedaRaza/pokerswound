// V2 ROUTER - CQRS-style endpoints
// Extracted from sophisticated-engine-server.js

const express = require('express');
const router = express.Router();

// GET /api/v2/game/:gameId - Get game state (CQRS Query)
router.get('/game/:gameId', async (req, res) => {
  const { gameApplicationService } = req.app.locals;
  
  try {
    if (!gameApplicationService) {
      return res.status(503).json({ error: 'Application service not initialized' });
    }

    const { gameId } = req.params;
    const gameState = await gameApplicationService.getGameState(gameId);

    if (!gameState) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json({
      gameId: gameState.id,
      status: gameState.status,
      pot: gameState.pot.totalPot,
      currentStreet: gameState.currentStreet,
      players: Array.from(gameState.players.values()).map(p => ({
        id: p.uuid,
        name: p.name,
        stack: p.stack,
        seatIndex: p.seatIndex
      }))
    });
  } catch (error) {
    console.error('Error fetching game state:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v2/room/:roomId - Get room info (CQRS Query)
router.get('/room/:roomId', async (req, res) => {
  const { gameApplicationService } = req.app.locals;
  
  try {
    if (!gameApplicationService) {
      return res.status(503).json({ error: 'Application service not initialized' });
    }

    const { roomId } = req.params;
    const roomInfo = await gameApplicationService.getRoomInfo(roomId);

    if (!roomInfo) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json(roomInfo);
  } catch (error) {
    console.error('Error fetching room info:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v2/game/:gameId/action - Process player action (CQRS Command)
router.post('/game/:gameId/action', async (req, res) => {
  const { gameApplicationService, games } = req.app.locals;
  
  try {
    if (!gameApplicationService) {
      return res.status(503).json({ error: 'Application service not initialized' });
    }

    const { gameId } = req.params;
    const { playerId, action, amount } = req.body;

    const result = await gameApplicationService.processPlayerAction(
      gameId,
      playerId,
      action,
      amount
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Update game state in store
    games.set(gameId, result.newState);

    res.json({
      success: true,
      gameId,
      action,
      amount: amount || 0,
      pot: result.newState.pot.totalPot,
      toAct: result.newState.toAct
    });
  } catch (error) {
    console.error('Error processing action:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

