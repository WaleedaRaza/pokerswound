/**
 * SEAT MANAGER MODULE
 * 
 * Purpose: Dealer button, blinds, seat assignment, turn order
 * Responsibilities:
 * - Rotate dealer button each HAND_END
 * - Assign SB and BB positions
 * - Apply heads-up blind rules (Button = SB, BB acts first pre-flop)
 * - Handle dead blinds (busted SB/BB)
 * - Determine first actor (pre-flop vs post-flop)
 * 
 * Architecture: Extracted from turn-logic.js to match PokerLogic spec
 * Maintains backward compatibility with existing gameState structure
 */

// Import canPlayerAct from turn-logic (circular dependency handled)
// Note: turn-logic imports seat-manager, so we require it lazily
let canPlayerAct = null;
function getCanPlayerAct() {
  if (!canPlayerAct) {
    canPlayerAct = require('./turn-logic').canPlayerAct;
  }
  return canPlayerAct;
}

/**
 * ROTATE DEALER BUTTON
 * Moves button clockwise to next active player
 * 
 * @param {Object} gameState - Current game state (mutated)
 * @param {Array} activePlayers - Array of active player seat indices
 * @returns {void}
 */
function rotateDealerButton(gameState, activePlayers) {
  if (!activePlayers || activePlayers.length === 0) {
    console.warn('⚠️ [SEAT] No active players for button rotation');
    return;
  }
  
  const currentDealer = gameState.dealerPosition;
  const dealerIndex = activePlayers.indexOf(currentDealer);
  
  // Find next active player clockwise
  const nextDealerIndex = (dealerIndex + 1) % activePlayers.length;
  gameState.dealerPosition = activePlayers[nextDealerIndex];
  
  console.log(`🔄 [SEAT] Dealer button rotated: Seat ${currentDealer} → Seat ${gameState.dealerPosition}`);
}

/**
 * ASSIGN BLINDS
 * Sets SB and BB positions based on dealer position
 * Handles heads-up special case
 * 
 * @param {Object} gameState - Current game state (mutated)
 * @returns {void}
 */
function assignBlinds(gameState) {
  const activePlayers = gameState.players
    .filter(p => !p.folded && p.status !== 'BUSTED')
    .map(p => p.seatIndex)
    .sort((a, b) => a - b);
  
  if (activePlayers.length === 0) {
    console.warn('⚠️ [SEAT] No active players for blind assignment');
    return;
  }
  
  const dealerIndex = activePlayers.indexOf(gameState.dealerPosition);
  
  if (activePlayers.length === 2) {
    // HEADS-UP SPECIAL CASE (PokerLogic line 71-79)
    // Button posts SB, BB is to the left of SB
    // Pre-flop: BB acts first
    // Post-flop: SB/Button acts first
    gameState.sbPosition = gameState.dealerPosition; // Button = SB
    const bbIndex = (dealerIndex + 1) % activePlayers.length;
    gameState.bbPosition = activePlayers[bbIndex];
    console.log(`🎯 [SEAT] Heads-up blinds: SB=Seat ${gameState.sbPosition}, BB=Seat ${gameState.bbPosition}`);
  } else {
    // Standard 3+ players (PokerLogic line 65-69)
    // Button → SB → BB order
    const sbIndex = (dealerIndex + 1) % activePlayers.length;
    const bbIndex = (dealerIndex + 2) % activePlayers.length;
    gameState.sbPosition = activePlayers[sbIndex];
    gameState.bbPosition = activePlayers[bbIndex];
    console.log(`🎯 [SEAT] Standard blinds: SB=Seat ${gameState.sbPosition}, BB=Seat ${gameState.bbPosition}`);
  }
}

/**
 * GET FIRST ACTOR
 * Determines who acts first based on street and number of players
 * Handles heads-up special case
 * 
 * @param {Object} gameState - Current game state
 * @returns {number|null} - Seat index of first actor, or null if none
 */
function getFirstActor(gameState) {
  const activePlayers = gameState.players.filter(p => !p.folded);
  const isHeadsUp = activePlayers.length === 2;
  
  let firstActorSeat;
  
  if (isHeadsUp) {
    // HEADS-UP RULES (PokerLogic line 71-79)
    if (gameState.street === 'PREFLOP') {
      // Pre-flop: BB acts first (after blinds)
      firstActorSeat = gameState.bbPosition;
    } else {
      // Post-flop: SB acts first (or dealer if no SB)
      firstActorSeat = gameState.sbPosition || gameState.dealerPosition;
    }
    
    // ARCHITECTURAL FIX: If positional first actor can't act (all-in), find next player who can
    const firstPlayer = gameState.players.find(p => p.seatIndex === firstActorSeat);
    if (firstPlayer && !getCanPlayerAct()(gameState, firstPlayer)) {
      // First actor is all-in, find next player who can act
      const firstIndex = gameState.players.findIndex(p => p.seatIndex === firstActorSeat);
      let nextIndex = (firstIndex + 1) % gameState.players.length;
      let attempts = 0;
      while (attempts < gameState.players.length) {
        const player = gameState.players[nextIndex];
        if (!player.folded && getCanPlayerAct()(gameState, player)) {
          firstActorSeat = player.seatIndex;
          break;
        }
        nextIndex = (nextIndex + 1) % gameState.players.length;
        attempts++;
      }
    }
  } else {
    // STANDARD RULES (PokerLogic line 174-183)
    if (gameState.street === 'PREFLOP') {
      // Pre-flop: first to act is after BB
      const bbIndex = gameState.players.findIndex(p => p.seatIndex === gameState.bbPosition);
      let nextIndex = (bbIndex + 1) % gameState.players.length;
      let attempts = 0;
      
      while (attempts < gameState.players.length) {
        const player = gameState.players[nextIndex];
        if (!player.folded && getCanPlayerAct()(gameState, player)) {
          firstActorSeat = player.seatIndex;
          break;
        }
        nextIndex = (nextIndex + 1) % gameState.players.length;
        attempts++;
      }
    } else {
      // Post-flop: first active player after dealer (SB position)
      const sbIndex = gameState.players.findIndex(p => p.seatIndex === gameState.sbPosition);
      let nextIndex = sbIndex !== -1 ? sbIndex : ((gameState.players.findIndex(p => p.seatIndex === gameState.dealerPosition) + 1) % gameState.players.length);
      let attempts = 0;
      
      while (attempts < gameState.players.length) {
        const player = gameState.players[nextIndex];
        if (!player.folded && getCanPlayerAct()(gameState, player)) {
          firstActorSeat = player.seatIndex;
          break;
        }
        nextIndex = (nextIndex + 1) % gameState.players.length;
        attempts++;
      }
    }
  }
  
  return firstActorSeat || null;
}

/**
 * RESET TO FIRST ACTOR
 * Sets currentActorSeat to first actor for new street
 * Maintains backward compatibility with turn-logic.js
 * 
 * @param {Object} gameState - Current game state (mutated)
 * @returns {void}
 */
function resetToFirstActor(gameState) {
  const firstActorSeat = getFirstActor(gameState);
  
  if (firstActorSeat !== undefined && firstActorSeat !== null) {
    gameState.currentActorSeat = firstActorSeat;
    console.log(`👉 [SEAT] First actor on ${gameState.street}: Seat ${firstActorSeat}`);
  } else {
    console.warn('⚠️ [SEAT] No first actor found - all players may be folded/all-in');
  }
}

/**
 * HANDLE DEAD BLIND
 * Handles scenario where SB or BB busts
 * Next hand may temporarily skip a blind (PokerLogic line 91-93)
 * 
 * @param {Object} gameState - Current game state
 * @param {number} bustedSeatIndex - Seat index of busted player
 * @returns {Object} - { hasDeadBlind: boolean, deadBlindType: 'SB' | 'BB' | null }
 */
function handleDeadBlind(gameState, bustedSeatIndex) {
  const isSB = gameState.sbPosition === bustedSeatIndex;
  const isBB = gameState.bbPosition === bustedSeatIndex;
  
  if (isSB || isBB) {
    console.log(`💀 [SEAT] Dead blind detected: ${isSB ? 'SB' : 'BB'} at Seat ${bustedSeatIndex}`);
    return {
      hasDeadBlind: true,
      deadBlindType: isSB ? 'SB' : 'BB'
    };
  }
  
  return { hasDeadBlind: false, deadBlindType: null };
}

/**
 * APPLY DEAD BLIND
 * Applies dead blind logic - skips blind posting for busted SB/BB
 * 
 * @param {Object} gameState - Game state (mutated)
 * @param {string} deadBlindType - 'SB' or 'BB'
 * @param {number} smallBlind - Small blind amount
 * @param {number} bigBlind - Big blind amount
 * @returns {Object} - { skipped: boolean, message: string }
 */
function applyDeadBlind(gameState, deadBlindType, smallBlind, bigBlind) {
  if (!deadBlindType) {
    return { skipped: false, message: 'No dead blind' };
  }

  // Dead blind means the blind position is empty (busted)
  // The blind is "dead" - no one posts it, but it still counts toward the pot
  // In practice, this means we skip posting that blind but still track it
  
  if (deadBlindType === 'SB') {
    // SB is dead - skip SB posting, but BB still posts
    console.log(`💀 [SEAT] Dead SB - skipping SB post, BB still posts`);
    
    // Mark dead blind in gameState for tracking
    gameState.deadBlind = {
      type: 'SB',
      amount: smallBlind,
      seatIndex: gameState.sbPosition
    };
    
    // Add dead blind amount to pot (it's "dead money")
    gameState.pot = (gameState.pot || 0) + smallBlind;
    
    return {
      skipped: true,
      message: `Dead SB ($${smallBlind}) added to pot, BB still posts`
    };
  }
  
  if (deadBlindType === 'BB') {
    // BB is dead - skip BB posting, but SB still posts
    console.log(`💀 [SEAT] Dead BB - skipping BB post, SB still posts`);
    
    // Mark dead blind in gameState for tracking
    gameState.deadBlind = {
      type: 'BB',
      amount: bigBlind,
      seatIndex: gameState.bbPosition
    };
    
    // Add dead blind amount to pot (it's "dead money")
    gameState.pot = (gameState.pot || 0) + bigBlind;
    
    return {
      skipped: true,
      message: `Dead BB ($${bigBlind}) added to pot, SB still posts`
    };
  }
  
  return { skipped: false, message: 'Invalid dead blind type' };
}

/**
 * HANDLE MISSED BLINDS
 * Player returning must post BB or wait for BB (PokerLogic line 87-89)
 * 
 * @param {Object} gameState - Current game state
 * @param {string} userId - Returning player's user ID
 * @param {number} bigBlind - Big blind amount
 * @returns {Object} - { mustPost: boolean, amount: number, reason: string }
 */
function handleMissedBlinds(gameState, userId, bigBlind) {
  const player = gameState.players?.find(p => p.userId === userId);
  
  if (!player) {
    return { mustPost: false, amount: 0, reason: 'Player not found' };
  }
  
  // Check if player has missed blinds flag (set when they leave during blinds)
  // For now, we'll check if they're sitting out and returning
  // In production, you'd track this in player state or database
  
  // If player is returning and it's not their turn to post blinds, they must post BB
  const isSB = player.seatIndex === gameState.sbPosition;
  const isBB = player.seatIndex === gameState.bbPosition;
  
  if (!isSB && !isBB) {
    // Player is not in blind position - they must post BB to return
    console.log(`💰 [SEAT] Player ${userId.substr(0, 8)} returning - must post BB ($${bigBlind})`);
    return {
      mustPost: true,
      amount: bigBlind,
      reason: 'Returning player must post big blind'
    };
  }
  
  // If they're in blind position, they'll post normally
  return { mustPost: false, amount: 0, reason: 'Player in blind position' };
}

/**
 * POST MISSED BLIND
 * Posts missed blind for returning player
 * 
 * @param {Object} gameState - Game state (mutated)
 * @param {string} userId - Returning player's user ID
 * @param {number} amount - Amount to post (usually BB)
 * @returns {Object} - { success: boolean, error?: string }
 */
function postMissedBlind(gameState, userId, amount) {
  const player = gameState.players.find(p => p.userId === userId);
  
  if (!player) {
    return { success: false, error: 'Player not found' };
  }
  
  if (player.chips < amount) {
    return { success: false, error: 'Not enough chips to post missed blind' };
  }
  
  // Post the blind
  player.chips = Math.max(0, player.chips - amount);
  player.bet = (player.bet || 0) + amount;
  player.betThisStreet = (player.betThisStreet || 0) + amount;
  
  // Add to pot
  gameState.pot = (gameState.pot || 0) + amount;
  
  console.log(`💰 [SEAT] Player ${userId.substr(0, 8)} posted missed blind: $${amount}`);
  
  return { success: true };
}

module.exports = {
  rotateDealerButton,
  assignBlinds,
  getFirstActor,
  resetToFirstActor,
  handleDeadBlind,
  applyDeadBlind,
  handleMissedBlinds,
  postMissedBlind
};

