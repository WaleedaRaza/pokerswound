/**
 * SOCKET EVENT BUILDER MODULE
 * 
 * Purpose: Standardize socket events with consistent structure
 * Responsibilities:
 * - Build standardized event payloads
 * - Include sequence numbers for idempotency
 * - Add timestamps for debugging
 * - Ensure consistent event structure
 * 
 * Architecture: Event builder layer (doesn't emit, just builds payloads)
 * Maintains backward compatibility with existing socket events
 */

/**
 * BUILD ACTION PROCESSED EVENT
 * Standardized event for action completion
 * 
 * @param {Object} gameState - Updated game state
 * @param {string} userId - Player who acted
 * @param {string} action - Action type
 * @param {number} amount - Action amount
 * @returns {Object} - Standardized event payload
 */
function buildActionProcessedEvent(gameState, userId, action, amount = 0) {
  return {
    type: 'action_processed',
    seq: gameState.actionSeq || 0,
    timestamp: new Date().toISOString(),
    payload: {
      userId,
      action,
      amount,
      gameState: {
        street: gameState.street,
        pot: gameState.pot,
        currentBet: gameState.currentBet,
        currentActorSeat: gameState.currentActorSeat,
        players: gameState.players.map(p => ({
          userId: p.userId,
          seatIndex: p.seatIndex,
          chips: p.chips,
          bet: p.bet,
          betThisStreet: p.betThisStreet,
          folded: p.folded,
          status: p.status
        })),
        communityCards: gameState.communityCards || []
      }
    }
  };
}

/**
 * BUILD HAND STARTED EVENT
 * Standardized event for hand start
 * 
 * @param {Object} gameState - New game state
 * @returns {Object} - Standardized event payload
 */
function buildHandStartedEvent(gameState) {
  return {
    type: 'hand_started',
    seq: gameState.actionSeq || 0,
    timestamp: new Date().toISOString(),
    payload: {
      handNumber: gameState.handNumber || 1,
      gameState: {
        street: gameState.street,
        pot: gameState.pot,
        currentBet: gameState.currentBet,
        dealerPosition: gameState.dealerPosition,
        sbPosition: gameState.sbPosition,
        bbPosition: gameState.bbPosition,
        currentActorSeat: gameState.currentActorSeat,
        communityCards: gameState.communityCards || [],
        players: gameState.players.map(p => ({
          userId: p.userId,
          seatIndex: p.seatIndex,
          chips: p.chips,
          bet: p.bet,
          betThisStreet: p.betThisStreet,
          folded: p.folded,
          status: p.status
          // holeCards intentionally omitted (private)
        }))
      }
    }
  };
}

/**
 * BUILD HAND COMPLETE EVENT
 * Standardized event for hand completion
 * 
 * @param {Object} gameState - Completed game state
 * @param {Array} winners - Array of winner objects
 * @returns {Object} - Standardized event payload
 */
function buildHandCompleteEvent(gameState, winners = []) {
  return {
    type: 'hand_complete',
    seq: gameState.actionSeq || 0,
    timestamp: new Date().toISOString(),
    payload: {
      handNumber: gameState.handNumber || 1,
      winners: winners.map(w => ({
        userId: w.userId,
        seatIndex: w.seatIndex,
        amount: w.amount,
        handDescription: w.handDescription
      })),
      gameState: {
        street: gameState.street,
        pot: gameState.pot,
        players: gameState.players.map(p => ({
          userId: p.userId,
          seatIndex: p.seatIndex,
          chips: p.chips,
          bet: p.bet,
          folded: p.folded,
          status: p.status,
          shownCards: p.shownCards || undefined
        })),
        communityCards: gameState.communityCards || []
      }
    }
  };
}

/**
 * BUILD STREET REVEAL EVENT
 * Standardized event for all-in runout street reveals
 * 
 * @param {Object} gameState - Current game state
 * @param {string} street - Street being revealed
 * @param {Array} cards - Cards revealed
 * @returns {Object} - Standardized event payload
 */
function buildStreetRevealEvent(gameState, street, cards) {
  return {
    type: 'street_reveal',
    seq: gameState.actionSeq || 0,
    timestamp: new Date().toISOString(),
    payload: {
      street,
      cards,
      gameState: {
        street: gameState.street,
        pot: gameState.pot,
        currentBet: gameState.currentBet,
        communityCards: gameState.communityCards || []
      }
    }
  };
}

/**
 * BUILD GAME STATE UPDATE EVENT
 * Standardized event for general state updates
 * 
 * @param {Object} gameState - Updated game state
 * @param {string} updateType - Type of update (e.g., 'turn_change', 'street_change')
 * @returns {Object} - Standardized event payload
 */
function buildGameStateUpdateEvent(gameState, updateType) {
  return {
    type: 'game_state_update',
    seq: gameState.actionSeq || 0,
    timestamp: new Date().toISOString(),
    payload: {
      updateType,
      gameState: {
        street: gameState.street,
        pot: gameState.pot,
        currentBet: gameState.currentBet,
        currentActorSeat: gameState.currentActorSeat,
        players: gameState.players.map(p => ({
          userId: p.userId,
          seatIndex: p.seatIndex,
          chips: p.chips,
          bet: p.bet,
          betThisStreet: p.betThisStreet,
          folded: p.folded,
          status: p.status
        })),
        communityCards: gameState.communityCards || []
      }
    }
  };
}

/**
 * BUILD ERROR EVENT
 * Standardized event for errors
 * 
 * @param {string} errorType - Type of error
 * @param {string} message - Error message
 * @param {Object} context - Additional context
 * @returns {Object} - Standardized event payload
 */
function buildErrorEvent(errorType, message, context = {}) {
  return {
    type: 'error',
    seq: context.actionSeq || 0,
    timestamp: new Date().toISOString(),
    payload: {
      errorType,
      message,
      context
    }
  };
}

/**
 * BUILD TIMER UPDATE EVENT
 * Standardized event for timer updates
 * 
 * @param {string} userId - Player whose timer is updating
 * @param {number} remainingSeconds - Remaining seconds
 * @returns {Object} - Standardized event payload
 */
function buildTimerUpdateEvent(userId, remainingSeconds) {
  return {
    type: 'timer_update',
    seq: 0, // Timer events don't increment actionSeq
    timestamp: new Date().toISOString(),
    payload: {
      userId,
      remainingSeconds
    }
  };
}

module.exports = {
  buildActionProcessedEvent,
  buildHandStartedEvent,
  buildHandCompleteEvent,
  buildStreetRevealEvent,
  buildGameStateUpdateEvent,
  buildErrorEvent,
  buildTimerUpdateEvent
};

