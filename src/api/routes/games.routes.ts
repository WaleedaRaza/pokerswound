
const { Router } = require('express');
const { 
  postCreateGame, 
  postJoinGame,
  postStartHand, 
  postPlayerAction,
  getGameState,
  getLegalActions
} = require('../controllers/games.controller');

const gamesRouter = Router();

// Game management
gamesRouter.post('/api/games', postCreateGame);
gamesRouter.get('/api/games/:id', getGameState);
gamesRouter.post('/api/games/:id/join', postJoinGame);
gamesRouter.post('/api/games/:id/start-hand', postStartHand);

// Player actions
gamesRouter.post('/api/games/:id/actions', postPlayerAction);
gamesRouter.get('/api/games/:id/legal-actions', getLegalActions);

module.exports = { gamesRouter };
