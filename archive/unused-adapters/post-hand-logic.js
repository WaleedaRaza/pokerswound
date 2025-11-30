/**
 * POST-HAND LOGIC MODULE
 * 
 * Purpose: Handle post-hand cleanup and setup
 * Responsibilities:
 * - Rotate dealer button
 * - Remove busted players
 * - Handle dead blinds
 * - Reset game state for next hand
 * 
 * Architecture: Post-hand orchestration (matches PokerLogic spec)
 * Maintains backward compatibility with existing gameState structure
 */

const seatManager = require('./seat-manager');

/**
 * HANDLE POST-HAND CLEANUP
 * Main entry point for post-hand processing
 * 
 * @param {Object} gameState - Completed game state
 * @param {Array} activePlayers - Array of active player seat indices
 * @returns {Object} - { success: boolean, nextHandState?: Object, errors?: string[] }
 */
function handlePostHandCleanup(gameState, activePlayers) {
  const errors = [];

  if (!gameState) {
    return { success: false, errors: ['Game state is null'] };
  }

  if (!activePlayers || activePlayers.length === 0) {
    return { success: false, errors: ['No active players'] };
  }

  // Step 1: Remove busted players
  const bustedPlayers = gameState.players.filter(p => p.chips <= 0 && p.status !== 'FOLDED');
  bustedPlayers.forEach(player => {
    console.log(`💀 [POST-HAND] Player ${player.userId.substr(0, 8)} busted (${player.chips} chips)`);
    player.status = 'BUSTED';
    // Note: Don't remove from players array - they can rejoin
  });

  // Step 2: Check for dead blinds
  const deadBlindInfo = checkDeadBlinds(gameState, bustedPlayers);
  if (deadBlindInfo.hasDeadBlind) {
    console.log(`💀 [POST-HAND] Dead blind detected: ${deadBlindInfo.deadBlindType}`);
  }

  // Step 3: Rotate dealer button
  const remainingActivePlayers = activePlayers.filter(seatIndex => {
    const player = gameState.players.find(p => p.seatIndex === seatIndex);
    return player && player.chips > 0 && player.status !== 'BUSTED';
  });

  if (remainingActivePlayers.length < 2) {
    return {
      success: false,
      errors: ['Not enough players for next hand'],
      nextHandState: null
    };
  }

  // Rotate button to next active player
  seatManager.rotateDealerButton(gameState, remainingActivePlayers);

  // Step 4: Assign new blinds
  seatManager.assignBlinds(gameState);

  // Step 5: Reset player states for next hand
  resetPlayerStatesForNextHand(gameState);

  // Step 6: Reset game state
  const nextHandState = resetGameStateForNextHand(gameState);

  console.log(`✅ [POST-HAND] Cleanup complete - Next hand ready`);

  return {
    success: true,
    nextHandState,
    deadBlindInfo
  };
}

/**
 * CHECK DEAD BLINDS
 * Checks if SB or BB busted (dead blind scenario)
 * 
 * @param {Object} gameState - Game state
 * @param {Array} bustedPlayers - Array of busted player objects
 * @returns {Object} - { hasDeadBlind: boolean, deadBlindType: 'SB' | 'BB' | null }
 */
function checkDeadBlinds(gameState, bustedPlayers) {
  const bustedSeats = bustedPlayers.map(p => p.seatIndex);
  
  const sbBusted = bustedSeats.includes(gameState.sbPosition);
  const bbBusted = bustedSeats.includes(gameState.bbPosition);

  if (sbBusted) {
    return { hasDeadBlind: true, deadBlindType: 'SB' };
  }

  if (bbBusted) {
    return { hasDeadBlind: true, deadBlindType: 'BB' };
  }

  return { hasDeadBlind: false, deadBlindType: null };
}

/**
 * RESET PLAYER STATES FOR NEXT HAND
 * Resets player betting states but keeps chips
 * 
 * @param {Object} gameState - Game state (mutated)
 */
function resetPlayerStatesForNextHand(gameState) {
  gameState.players.forEach(player => {
    // Reset betting states
    player.bet = 0;
    player.betThisStreet = 0;
    player.folded = false;
    
    // Reset status (unless busted)
    if (player.status !== 'BUSTED') {
      player.status = 'ACTIVE';
    }
    
    // Clear all-in flag
    player.allInAmount = undefined;
    
    // Clear shown cards
    player.shownCards = undefined;
  });
}

/**
 * RESET GAME STATE FOR NEXT HAND
 * Resets game state fields for new hand
 * 
 * @param {Object} gameState - Game state (mutated)
 * @returns {Object} - Reset game state
 */
function resetGameStateForNextHand(gameState) {
  // Increment hand number
  gameState.handNumber = (gameState.handNumber || 0) + 1;

  // Reset street and betting
  gameState.street = 'PREFLOP';
  gameState.status = 'IN_PROGRESS';
  gameState.pot = 0;
  gameState.currentBet = 0;
  gameState.minRaise = 0;

  // Reset betting tracking
  gameState.lastRaiseSize = 0;
  gameState.lastAggressor = null;
  gameState.reopensAction = false;

  // Reset community cards
  gameState.communityCards = [];

  // Reset action history
  gameState.actionHistory = [];

  // Reset sequence (or increment for new hand)
  gameState.actionSeq = 0;

  // Reset all-in runout flags
  gameState.needsProgressiveReveal = false;
  gameState.allInRunoutStreets = [];

  // Reset timers
  gameState.timers = {};

  // Clear winners
  gameState.winners = [];

  return gameState;
}

/**
 * GET ACTIVE PLAYERS
 * Gets list of active player seat indices
 * 
 * @param {Object} gameState - Game state
 * @returns {Array} - Array of active seat indices
 */
function getActivePlayers(gameState) {
  return gameState.players
    .filter(p => p.chips > 0 && p.status !== 'BUSTED' && p.status !== 'FOLDED')
    .map(p => p.seatIndex)
    .sort((a, b) => a - b);
}

/**
 * CAN START NEXT HAND
 * Checks if conditions are met for next hand
 * 
 * @param {Object} gameState - Game state
 * @returns {boolean} - True if can start next hand
 */
function canStartNextHand(gameState) {
  const activePlayers = getActivePlayers(gameState);
  return activePlayers.length >= 2;
}

module.exports = {
  handlePostHandCleanup,
  checkDeadBlinds,
  resetPlayerStatesForNextHand,
  resetGameStateForNextHand,
  getActivePlayers,
  canStartNextHand
};

