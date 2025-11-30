/**
 * TIMER LOGIC MODULE
 * 
 * Purpose: Disconnect/timeout handling, forced actions
 * Responsibilities:
 * - Track player action timers
 * - Handle disconnect timeouts (forced fold/check)
 * - Manage turn timers based on timestamps
 * - Force actions when timer expires
 * 
 * Architecture: Matches PokerLogic spec (line 297-298)
 * Maintains backward compatibility with existing gameState structure
 */

/**
 * FORCE ACTION ON TIMEOUT
 * Forces fold or check when player timer expires
 * 
 * @param {Object} gameState - Current game state (mutated)
 * @param {string} userId - Player who timed out
 * @param {number} timeoutSeconds - Timeout duration in seconds
 * @returns {Object} - { success: boolean, action: string, error?: string }
 */
function forceActionOnTimeout(gameState, userId, timeoutSeconds = 30) {
  const player = gameState.players.find(p => p.userId === userId);
  
  if (!player) {
    return { success: false, error: 'Player not found' };
  }
  
  if (player.folded) {
    return { success: false, error: 'Player already folded' };
  }
  
  if (player.status === 'ALL_IN') {
    return { success: false, error: 'Player is all-in, no action needed' };
  }
  
  // Check if it's actually this player's turn
  const currentSeat = gameState.players.find(p => p.seatIndex === gameState.currentActorSeat);
  if (!currentSeat || currentSeat.userId !== userId) {
    return { success: false, error: 'Not player\'s turn' };
  }
  
  const currentBet = gameState.currentBet || 0;
  const playerBetThisStreet = player.betThisStreet || 0;
  
  // Determine forced action (PokerLogic line 297-298)
  // If facing a bet, force fold; otherwise force check
  let forcedAction;
  if (currentBet > playerBetThisStreet) {
    forcedAction = 'FOLD'; // Facing a bet - must fold
  } else {
    forcedAction = 'CHECK'; // No bet - can check
  }
  
  console.log(`⏰ [TIMER] Player ${userId.substr(0, 8)} timed out after ${timeoutSeconds}s - forcing ${forcedAction}`);
  
  return {
    success: true,
    action: forcedAction,
    reason: `Timeout after ${timeoutSeconds} seconds`
  };
}

/**
 * CHECK TIMER EXPIRY
 * Checks if a player's turn timer has expired
 * 
 * @param {Object} gameState - Current game state
 * @param {string} userId - Player to check
 * @param {number} timeoutSeconds - Timeout duration in seconds
 * @returns {boolean} - True if timer expired
 */
function isTimerExpired(gameState, userId, timeoutSeconds = 30) {
  // Check if gameState has timer tracking
  if (!gameState.timers || !gameState.timers[userId]) {
    return false; // No timer set, not expired
  }
  
  const timerStart = gameState.timers[userId];
  const now = Date.now();
  const elapsedSeconds = (now - timerStart) / 1000;
  
  return elapsedSeconds >= timeoutSeconds;
}

/**
 * START TIMER
 * Starts action timer for a player
 * 
 * @param {Object} gameState - Current game state (mutated)
 * @param {string} userId - Player starting their turn
 * @returns {void}
 */
function startTimer(gameState, userId) {
  if (!gameState.timers) {
    gameState.timers = {};
  }
  
  gameState.timers[userId] = Date.now();
  console.log(`⏰ [TIMER] Started timer for player ${userId.substr(0, 8)}`);
}

/**
 * CLEAR TIMER
 * Clears action timer for a player
 * 
 * @param {Object} gameState - Current game state (mutated)
 * @param {string} userId - Player whose timer to clear
 * @returns {void}
 */
function clearTimer(gameState, userId) {
  if (gameState.timers && gameState.timers[userId]) {
    delete gameState.timers[userId];
    console.log(`⏰ [TIMER] Cleared timer for player ${userId.substr(0, 8)}`);
  }
}

/**
 * HANDLE DISCONNECT
 * Handles player disconnect during their turn
 * Forces action based on current betting situation
 * 
 * @param {Object} gameState - Current game state (mutated)
 * @param {string} userId - Disconnected player
 * @returns {Object} - { success: boolean, action: string, error?: string }
 */
function handleDisconnect(gameState, userId) {
  const player = gameState.players.find(p => p.userId === userId);
  
  if (!player) {
    return { success: false, error: 'Player not found' };
  }
  
  // If it's their turn, force action
  const currentSeat = gameState.players.find(p => p.seatIndex === gameState.currentActorSeat);
  if (currentSeat && currentSeat.userId === userId) {
    return forceActionOnTimeout(gameState, userId, 0); // Immediate timeout on disconnect
  }
  
  // Not their turn - just mark as disconnected (don't force action)
  console.log(`🔌 [TIMER] Player ${userId.substr(0, 8)} disconnected (not their turn)`);
  return { success: true, action: null, reason: 'Disconnected but not their turn' };
}

/**
 * GET REMAINING TIME
 * Gets remaining time for a player's turn
 * 
 * @param {Object} gameState - Current game state
 * @param {string} userId - Player to check
 * @param {number} timeoutSeconds - Timeout duration in seconds
 * @returns {number} - Remaining seconds, or null if no timer
 */
function getRemainingTime(gameState, userId, timeoutSeconds = 30) {
  if (!gameState.timers || !gameState.timers[userId]) {
    return null;
  }
  
  const timerStart = gameState.timers[userId];
  const now = Date.now();
  const elapsedSeconds = (now - timerStart) / 1000;
  const remaining = Math.max(0, timeoutSeconds - elapsedSeconds);
  
  return Math.floor(remaining);
}

module.exports = {
  forceActionOnTimeout,
  isTimerExpired,
  startTimer,
  clearTimer,
  handleDisconnect,
  getRemainingTime
};

