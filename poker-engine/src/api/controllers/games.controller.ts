
const { getSupabaseServiceClient } = require('../../services/database/supabase');
const { GameService } = require('../../services/game-service');
const { ActionType } = require('../../types/common.types');

// Initialize game service
function getGameService() {
  const client = getSupabaseServiceClient();
  return new GameService(client);
}

// Broadcast events via WebSocket
function broadcastEvent(gameId, event) {
  try {
    const { getIo } = require('../../websocket/server');
    const io = getIo();
    if (gameId) {
      io.to(`game:${gameId}`).emit(event.type, event.data);
    }
  } catch (e) {
    console.warn('Failed to broadcast event:', e.message);
  }
}

async function postCreateGame(req, res) {
  try {
    const { small_blind, big_blind, max_players, min_players, turn_time_limit } = req.body || {};
    
    if (!small_blind || !big_blind || !max_players) {
      return res.status(400).json({ 
        error: 'Missing required fields: small_blind, big_blind, max_players' 
      });
    }

    const gameService = getGameService();
    const result = await gameService.createGame({
      smallBlind: small_blind,
      bigBlind: big_blind,
      maxPlayers: max_players,
      minPlayers: min_players,
      turnTimeLimit: turn_time_limit
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Broadcast game created event
    if (result.events) {
      result.events.forEach(event => broadcastEvent(result.data.gameId, event));
    }

    res.status(201).json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function postJoinGame(req, res) {
  try {
    const gameId = req.params['id'];
    const { player_id, player_name, buy_in_amount, seat_index } = req.body || {};
    
    if (!player_id || !player_name || !buy_in_amount) {
      return res.status(400).json({ 
        error: 'Missing required fields: player_id, player_name, buy_in_amount' 
      });
    }

    const gameService = getGameService();
    const result = await gameService.joinGame({
      gameId,
      playerId: player_id,
      playerName: player_name,
      buyInAmount: buy_in_amount,
      seatIndex: seat_index
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Broadcast player joined event
    if (result.events) {
      result.events.forEach(event => broadcastEvent(gameId, event));
    }

    res.status(201).json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function postStartHand(req, res) {
  try {
    const gameId = req.params['id'];

    const gameService = getGameService();
    const result = await gameService.startHand(gameId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Broadcast hand started event
    if (result.events) {
      result.events.forEach(event => broadcastEvent(gameId, event));
    }

    res.status(201).json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function postPlayerAction(req, res) {
  try {
    const gameId = req.params['id'];
    const { player_id, action, amount } = req.body || {};
    
    if (!player_id || !action) {
      return res.status(400).json({ 
        error: 'Missing required fields: player_id, action' 
      });
    }

    // Validate action type
    if (!Object.values(ActionType).includes(action)) {
      return res.status(400).json({ 
        error: `Invalid action type: ${action}` 
      });
    }

    const gameService = getGameService();
    const result = await gameService.processPlayerAction({
      gameId,
      playerId: player_id,
      actionType: action,
      amount
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Broadcast player action event
    if (result.events) {
      result.events.forEach(event => broadcastEvent(gameId, event));
    }

    res.status(201).json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getGameState(req, res) {
  try {
    const gameId = req.params['id'];

    const gameService = getGameService();
    const result = await gameService.getGameState(gameId);

    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    res.json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getLegalActions(req, res) {
  try {
    const gameId = req.params['id'];
    const playerId = req.query['player_id'];

    if (!playerId) {
      return res.status(400).json({ 
        error: 'Missing required query parameter: player_id' 
      });
    }

    const gameService = getGameService();
    const result = await gameService.getLegalActions(gameId, playerId);

    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    res.json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { 
  postCreateGame, 
  postJoinGame,
  postStartHand, 
  postPlayerAction,
  getGameState,
  getLegalActions
};
