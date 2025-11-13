/**
 * GAME STATE TRANSLATOR MODULE
 * 
 * Purpose: Convert engine state to frontend format
 * Responsibilities:
 * - Transform gameState for frontend consumption
 * - Separate public vs private data (hole cards)
 * - Format data for UI rendering
 * - Ensure consistent frontend state structure
 * 
 * Architecture: Translation layer between engine and frontend
 * Maintains backward compatibility with existing frontend expectations
 */

/**
 * TRANSLATE TO PUBLIC STATE
 * Converts gameState to public format (no hole cards)
 * 
 * @param {Object} gameState - Engine game state
 * @param {string} requestingUserId - User requesting state (for hole cards)
 * @returns {Object} - Public game state
 */
function translateToPublicState(gameState, requestingUserId = null) {
  if (!gameState) {
    return null;
  }
  
  // Create public state (no hole cards)
  const publicState = {
    // Core state
    street: gameState.street,
    status: gameState.status,
    pot: gameState.pot,
    currentBet: gameState.currentBet,
    minRaise: gameState.minRaise || 0,
    
    // Community cards (public)
    communityCards: gameState.communityCards || [],
    
    // Positions
    dealerPosition: gameState.dealerPosition,
    sbPosition: gameState.sbPosition,
    bbPosition: gameState.bbPosition,
    currentActorSeat: gameState.currentActorSeat,
    
    // Betting tracking
    lastRaiseSize: gameState.lastRaiseSize || 0,
    reopensAction: gameState.reopensAction || false,
    
    // Blinds
    smallBlind: gameState.smallBlind || 0,
    bigBlind: gameState.bigBlind || 0,
    
    // Players (public data only)
    players: gameState.players.map(player => ({
      userId: player.userId,
      seatIndex: player.seatIndex,
      chips: player.chips || 0,
      bet: player.bet || 0,
      betThisStreet: player.betThisStreet || 0,
      folded: player.folded || false,
      status: player.status || 'ACTIVE',
      allInAmount: player.allInAmount,
      // Hole cards: only include if requesting user owns them
      holeCards: (requestingUserId && player.userId === requestingUserId) 
        ? (player.holeCards || [])
        : undefined,
      // Show cards only if revealed (for showdown)
      shownCards: player.shownCards || undefined
    })),
    
    // Action history (public)
    actionHistory: (gameState.actionHistory || []).map(action => ({
      seq: action.seq,
      userId: action.userId,
      action: action.action,
      amount: action.amount,
      street: action.street,
      timestamp: action.timestamp
    })),
    
    // Sequence tracking
    actionSeq: gameState.actionSeq || 0,
    
    // Metadata
    handNumber: gameState.handNumber || 1,
    roomId: gameState.roomId
  };
  
  return publicState;
}

/**
 * TRANSLATE TO FRONTEND FORMAT
 * Converts gameState to frontend-optimized format
 * Includes computed fields for UI rendering
 * 
 * @param {Object} gameState - Engine game state
 * @param {string} userId - Current user's ID
 * @returns {Object} - Frontend-optimized state
 */
function translateToFrontendFormat(gameState, userId) {
  const publicState = translateToPublicState(gameState, userId);
  
  if (!publicState) {
    return null;
  }
  
  // Find current user's player object
  const myPlayer = publicState.players.find(p => p.userId === userId);
  
  // Compute frontend-specific fields
  const frontendState = {
    ...publicState,
    
    // Current user's data
    myPlayer: myPlayer || null,
    myHoleCards: myPlayer?.holeCards || [],
    isMyTurn: myPlayer ? (gameState.currentActorSeat === myPlayer.seatIndex) : false,
    
    // Computed UI fields
    canCheck: myPlayer ? canPlayerCheck(gameState, myPlayer) : false,
    canCall: myPlayer ? canPlayerCall(gameState, myPlayer) : false,
    canRaise: myPlayer ? canPlayerRaise(gameState, myPlayer) : false,
    callAmount: myPlayer ? calculateCallAmount(gameState, myPlayer) : 0,
    minRaiseAmount: calculateMinRaiseAmount(gameState),
    
    // Pot display
    mainPot: gameState.pot || 0,
    sidePots: gameState.sidePots || [],
    totalPot: calculateTotalPot(gameState),
    
    // Timer info (if available)
    timerRemaining: gameState.timers && gameState.timers[userId] 
      ? calculateTimerRemaining(gameState.timers[userId])
      : null
  };
  
  return frontendState;
}

/**
 * CAN PLAYER CHECK
 * Helper to determine if player can check
 */
function canPlayerCheck(gameState, player) {
  const currentBet = gameState.currentBet || 0;
  const playerBetThisStreet = player.betThisStreet || 0;
  return currentBet === 0 || playerBetThisStreet >= currentBet;
}

/**
 * CAN PLAYER CALL
 * Helper to determine if player can call
 */
function canPlayerCall(gameState, player) {
  const currentBet = gameState.currentBet || 0;
  const playerBetThisStreet = player.betThisStreet || 0;
  const callAmount = currentBet - playerBetThisStreet;
  return callAmount > 0 && player.chips >= callAmount;
}

/**
 * CAN PLAYER RAISE
 * Helper to determine if player can raise
 */
function canPlayerRaise(gameState, player) {
  const currentBet = gameState.currentBet || 0;
  const playerBetThisStreet = player.betThisStreet || 0;
  const minRaise = gameState.lastRaiseSize || gameState.bigBlind || 0;
  const callAmount = currentBet - playerBetThisStreet;
  const chipsAfterCall = player.chips - callAmount;
  return currentBet > 0 && chipsAfterCall >= minRaise;
}

/**
 * CALCULATE CALL AMOUNT
 * Helper to calculate call amount for player
 */
function calculateCallAmount(gameState, player) {
  const currentBet = gameState.currentBet || 0;
  const playerBetThisStreet = player.betThisStreet || 0;
  const callAmount = currentBet - playerBetThisStreet;
  return Math.max(0, Math.min(callAmount, player.chips || 0));
}

/**
 * CALCULATE MIN RAISE AMOUNT
 * Helper to calculate minimum raise amount
 */
function calculateMinRaiseAmount(gameState) {
  const currentBet = gameState.currentBet || 0;
  const minRaise = gameState.lastRaiseSize || gameState.bigBlind || 0;
  return currentBet + minRaise;
}

/**
 * CALCULATE TOTAL POT
 * Helper to calculate total pot (main + side pots)
 */
function calculateTotalPot(gameState) {
  const mainPot = gameState.pot || 0;
  const sidePots = gameState.sidePots || [];
  const sidePotTotal = sidePots.reduce((sum, pot) => sum + (pot.amount || 0), 0);
  return mainPot + sidePotTotal;
}

/**
 * CALCULATE TIMER REMAINING
 * Helper to calculate remaining time
 */
function calculateTimerRemaining(timerStart, timeoutSeconds = 30) {
  const now = Date.now();
  const elapsedSeconds = (now - timerStart) / 1000;
  const remaining = Math.max(0, timeoutSeconds - elapsedSeconds);
  return Math.floor(remaining);
}

/**
 * EXTRACT PLAYER HOLE CARDS
 * Extracts hole cards for a specific player
 * 
 * @param {Object} gameState - Engine game state
 * @param {string} userId - Player's user ID
 * @returns {string[]} - Array of hole card codes
 */
function extractPlayerHoleCards(gameState, userId) {
  const player = gameState.players?.find(p => p.userId === userId);
  return player?.holeCards || [];
}

module.exports = {
  translateToPublicState,
  translateToFrontendFormat,
  extractPlayerHoleCards,
  canPlayerCheck,
  canPlayerCall,
  canPlayerRaise,
  calculateCallAmount,
  calculateMinRaiseAmount,
  calculateTotalPot
};

