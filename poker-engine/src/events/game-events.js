/**
 * Poker Game Event Types
 * These are atomic events that represent things that happened in the game
 * 
 * Design Philosophy:
 * - Events are FACTS (what happened), not commands (what to do)
 * - Events are immutable and ordered
 * - Frontend decides when/how to display events
 * - All events are replayable
 */

const GameEventType = {
  // Hand lifecycle
  HAND_STARTED: 'HAND_STARTED',
  HAND_ENDED: 'HAND_ENDED',
  
  // Player actions
  PLAYER_FOLDED: 'PLAYER_FOLDED',
  PLAYER_CHECKED: 'PLAYER_CHECKED',
  PLAYER_CALLED: 'PLAYER_CALLED',
  PLAYER_RAISED: 'PLAYER_RAISED',
  PLAYER_BET: 'PLAYER_BET',
  PLAYER_WENT_ALL_IN: 'PLAYER_WENT_ALL_IN',
  
  // Chips movement (CRITICAL for animation)
  CHIPS_COMMITTED_TO_POT: 'CHIPS_COMMITTED_TO_POT',           // Player → Pot
  CHIPS_TRANSFERRED_TO_WINNER: 'CHIPS_TRANSFERRED_TO_WINNER', // Pot → Winner
  
  // Street progression (CRITICAL for all-in runout)
  STREET_ADVANCED: 'STREET_ADVANCED',
  FLOP_REVEALED: 'FLOP_REVEALED',
  TURN_REVEALED: 'TURN_REVEALED',
  RIVER_REVEALED: 'RIVER_REVEALED',
  
  // Showdown
  SHOWDOWN_STARTED: 'SHOWDOWN_STARTED',
  HAND_EVALUATED: 'HAND_EVALUATED',
  WINNER_DETERMINED: 'WINNER_DETERMINED',
  POT_AWARDED: 'POT_AWARDED',
  
  // Turn management
  TURN_STARTED: 'TURN_STARTED',
  TURN_ENDED: 'TURN_ENDED',
  
  // Special scenarios
  ALL_IN_RUNOUT_STARTED: 'ALL_IN_RUNOUT_STARTED',
  SIDE_POT_CREATED: 'SIDE_POT_CREATED',
  
  // System events
  PLAYER_JOINED: 'PLAYER_JOINED',
  PLAYER_LEFT: 'PLAYER_LEFT',
  PLAYER_DISCONNECTED: 'PLAYER_DISCONNECTED',
  PLAYER_RECONNECTED: 'PLAYER_RECONNECTED'
};

/**
 * Create a game event with consistent structure
 * @param {string} type - Event type from GameEventType
 * @param {object} data - Event-specific data
 * @param {object} metadata - Additional metadata (gameId, roomId, etc.)
 * @returns {object} Structured event
 */
function createGameEvent(type, data = {}, metadata = {}) {
  return {
    type,
    data,
    timestamp: Date.now(),
    metadata: {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...metadata
    }
  };
}

module.exports = {
  GameEventType,
  createGameEvent
};

