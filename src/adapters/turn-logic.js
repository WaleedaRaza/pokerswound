/**
 * TURN LOGIC MODULE
 * 
 * Purpose: Turn rotation and betting round completion
 * Responsibilities:
 * - Determine if betting round is complete
 * - Rotate to next player
 * - Reset to first actor after street change
 * - Track last aggressor
 * - Check if player can act
 * 
 * Architecture: Based on TS TurnManager patterns
 */

/**
 * CHECK IF PLAYER CAN ACT
 * ARCHITECTURAL TRUTH: Only players with chips > 0 AND status !== 'ALL_IN' can act
 * Full all-ins (chips === 0 && status === 'ALL_IN') can NEVER act
 */
function canPlayerAct(gameState, player) {
  if (player.folded) return false;
  
  // ARCHITECTURAL FIX: Full all-in players (0 chips, ALL_IN status) can NEVER act
  // This is the fundamental poker rule - once you're all-in with 0 chips, you're done acting
  if (player.status === 'ALL_IN' && player.chips === 0) {
    return false;
  }
  
  // Player has chips and is not all-in - can act
  if (player.chips > 0) return true;
  
  // ARCHITECTURAL FIX: If player has 0 chips, they cannot act
  // The only exception is if they're not ALL_IN yet (shouldn't happen, but defensive)
  // If they have 0 chips, they've already gone all-in and are done acting
  if (player.chips === 0) {
    return false; // Player has no chips - cannot act
  }
  
  return false;
}

/**
 * GET PLAYERS WHO CAN BET
 * ARCHITECTURAL TRUTH: Players who can bet = chips > 0 AND status !== 'ALL_IN'
 * This is distinct from canPlayerAct() which includes partial all-ins who can still "act"
 * Used for runout detection: if no one can bet, trigger runout
 */
function playersWhoCanBet(gameState) {
  const activePlayers = gameState.players.filter(p => !p.folded);
  
  // Players who can bet: have chips AND are not all-in
  return activePlayers.filter(p => {
    return p.chips > 0 && p.status !== 'ALL_IN';
  });
}

/**
 * GET LAST AGGRESSOR
 * Track last player to raise for betting round completion
 * FIXED: Uses betThisStreet to track raises on current street only
 */
function getLastAggressor(gameState) {
  // Use stored lastAggressor if available (set by betting logic on full raises)
  if (gameState.lastAggressor) {
    return gameState.lastAggressor;
  }
  
  const actionsThisStreet = (gameState.actionHistory || []).filter(
    a => a.street === gameState.street && (a.action === 'RAISE' || a.action === 'ALL_IN')
  );
  
  if (actionsThisStreet.length === 0) return null;
  
  // Find the action that created the highest currentBet on this street
  // Track by betThisStreet values, not cumulative bet
  let maxBetThisStreet = 0;
  let lastAggressor = null;
  
  // Reconstruct betting history to find last raise
  for (let i = actionsThisStreet.length - 1; i >= 0; i--) {
    const action = actionsThisStreet[i];
    const player = gameState.players.find(p => p.userId === action.userId);
    
    if (player && (action.action === 'RAISE' || action.action === 'ALL_IN')) {
      // Check if this action raised the bet on this street
      const playerBetThisStreet = player.betThisStreet || 0;
      if (playerBetThisStreet > maxBetThisStreet) {
        maxBetThisStreet = playerBetThisStreet;
        lastAggressor = action.userId;
      }
    }
  }
  
  return lastAggressor;
}

/**
 * CHECK IF BETTING ROUND COMPLETE
 * PRODUCTION-GRADE: Based on TS TurnManager pattern
 * FIXED: Proper order - check allMatched FIRST, then playersWhoCanBet
 */
function isBettingRoundComplete(gameState) {
  const allActivePlayers = gameState.players.filter(p => !p.folded);
  
  // If only 1 active player left (others folded), betting is done
  if (allActivePlayers.length <= 1) {
    return true;
  }
  
  const currentBet = gameState.currentBet || 0;
  
  // STEP 1: Check if anyone can still bet (PRIORITY FIX for runout detection)
  // ARCHITECTURAL TRUTH: Runout happens when NO ONE can bet, not when everyone is all-in
  // A player can have chips > 0 but be marked ALL_IN (partial all-in from previous street)
  const playersWhoCanBetList = playersWhoCanBet(gameState);
  
  if (playersWhoCanBetList.length === 0 && allActivePlayers.length > 1) {
    console.log('✅ [TURN] No players can bet - betting round complete (will runout)', {
      activePlayers: allActivePlayers.length,
      playersWhoCanBet: 0
    });
    return true;
  }
  
  // STEP 1B: Separate all-in and non-all-in players (TS TurnManager pattern)
  const nonAllInPlayers = allActivePlayers.filter(p => 
    !(p.status === 'ALL_IN' && p.chips === 0)
  );
  const allInPlayers = allActivePlayers.filter(p => 
    p.status === 'ALL_IN' && p.chips === 0
  );
  
  // STEP 2: Get players who CAN ACT (chips > 0, not all-in)
  const playersWhoCanAct = nonAllInPlayers.filter(p => canPlayerAct(gameState, p));
  
  // ARCHITECTURAL TRUTH: If only 1 player can BET and everyone else is all-in,
  // round completes IMMEDIATELY when that player has matched the bet
  // This prevents asking a player to act again after they've already matched an all-in
  // FIX: Use playersWhoCanBet (not playersWhoCanAct) for solo player check
  if (playersWhoCanBetList.length === 1 && allInPlayers.length > 0) {
    const soloPlayer = playersWhoCanBetList[0];
    const soloPlayerBetThisStreet = soloPlayer.betThisStreet || 0;
    const actionsThisStreet = (gameState.actionHistory || []).filter(
      a => a.street === gameState.street && a.userId === soloPlayer.userId
    );
    
    // ARCHITECTURAL PRINCIPLE: If solo player has matched the bet, round is complete
    // This handles: P1 goes all-in, P2 calls → round completes immediately (no need for P2 to check)
    if (soloPlayerBetThisStreet >= currentBet && actionsThisStreet.length > 0) {
      console.log('✅ [TURN] Only 1 player can bet, they matched bet - round complete (will runout)', {
        soloPlayer: soloPlayer.userId?.substr(0, 8),
        soloPlayerBet: soloPlayerBetThisStreet,
        currentBet,
        allInCount: allInPlayers.length
      });
      return true;
    }
    
    // ARCHITECTURAL PRINCIPLE: If checking round (currentBet === 0) and solo player acted, round complete
    if (currentBet === 0 && actionsThisStreet.length > 0) {
      console.log('✅ [TURN] Only 1 player can bet, they checked - round complete (will runout)', {
        soloPlayer: soloPlayer.userId?.substr(0, 8),
        allInCount: allInPlayers.length
      });
      return true;
    }
  }
  
  // STEP 3: Check if all non-all-in players have matched the current bet (TS pattern)
  // FIX: Use betThisStreet for street-scoped matching (cumulative bet persists across streets)
  let allBetsMatched = true;
  for (const player of nonAllInPlayers) {
    const playerBetThisStreet = player.betThisStreet || 0;
    
    // Player hasn't matched the current bet on this street - round NOT complete
    if (playerBetThisStreet < currentBet) {
      allBetsMatched = false;
      break;
    }
  }
  
  if (!allBetsMatched) {
    console.log(`🔄 [TURN] Not all players matched - round NOT complete`, {
      currentBet,
      nonAllInPlayers: nonAllInPlayers.map(p => ({
        seat: p.seatIndex,
        userId: p.userId?.substr(0, 8),
        betThisStreet: p.betThisStreet || 0,
        bet: p.bet,
        chips: p.chips
      }))
    });
    return false;
  }
  
  // ARCHITECTURAL PRINCIPLE: Check "all acted" FIRST, before any other completion conditions
  // This ensures we never complete a round before all players have acted
  // STEP 4: Check if all players who CAN ACT have acted
  const actionsThisStreet = (gameState.actionHistory || []).filter(
    a => a.street === gameState.street
  );
  const playersWhoActed = new Set(actionsThisStreet.map(a => a.userId));
  const allActed = playersWhoCanAct.length > 0 && playersWhoCanAct.every(p => playersWhoActed.has(p.userId));
  
  // RULE 3: CHECKING ROUND (currentBet === 0)
  // Complete ONLY when ALL non-all-in players have acted
  // No other conditions matter - this is the architectural truth
  if (currentBet === 0) {
    if (!allActed || playersWhoCanAct.length === 0) {
      console.log(`🔄 [TURN] Checking round NOT complete: ${playersWhoCanAct.length} can act, ${playersWhoActed.size} acted`);
      return false;
    }
    console.log('✅ [TURN] Checking round complete: All players checked');
    return true;
  }
  
  // RULE 4: BETTING ROUND (currentBet > 0)
  // Complete when: all matched AND all acted AND (action returned OR didn't reopen OR aggressor all-in)
  
  // First check: All players must have acted (ARCHITECTURAL REQUIREMENT)
  if (!allActed || playersWhoCanAct.length === 0) {
    console.log(`🔄 [TURN] Betting round NOT complete: ${playersWhoCanAct.length} can act, ${playersWhoActed.size} acted, allBetsMatched=${allBetsMatched}`);
    return false;
  }
  
  // Second check: Action completion conditions (one must be true)
  const lastAggressor = getLastAggressor(gameState);
  let actionComplete = false;
  
  // Condition 4a: Action returned to aggressor
  if (lastAggressor) {
    const aggressor = allActivePlayers.find(p => p.userId === lastAggressor);
    if (aggressor && !aggressor.folded) {
      // If aggressor is all-in, action can't return to them, but round is complete
      if (aggressor.status === 'ALL_IN' && aggressor.chips === 0) {
        actionComplete = true;
        console.log('✅ [TURN] All bets matched, last aggressor is all-in - betting round complete');
      } else {
        // Check if action returned to aggressor (they matched the bet they created)
        const aggressorBetThisStreet = aggressor.betThisStreet || 0;
        if (aggressorBetThisStreet === currentBet) {
          actionComplete = true;
          console.log('✅ [TURN] Action returned to last aggressor, betting round complete');
        }
      }
    }
  }
  
  // Condition 4b: Action didn't reopen (short all-in)
  if (!actionComplete && gameState.reopensAction === false) {
    actionComplete = true;
    console.log('✅ [TURN] All bets matched and action did not reopen - betting round complete');
  }
  
  // Condition 4c: Special case - all-in players + 1 non-all-in who matched
  if (!actionComplete && allInPlayers.length > 0 && nonAllInPlayers.length === 1) {
    actionComplete = true;
    console.log('✅ [TURN] All-in players + 1 matched player - betting round complete');
  }
  
  // Final result: All bets matched AND all acted AND action complete
  const finalResult = allBetsMatched && allActed && actionComplete;
  
  if (!finalResult) {
    console.log('🔍 [TURN] Betting round NOT complete:', {
      street: gameState.street,
      currentBet,
      allBetsMatched,
      allActed,
      actionComplete,
      playersWhoCanAct: playersWhoCanAct.length,
      playersWhoActed: playersWhoActed.size,
      lastAggressor: lastAggressor?.substr(0, 8) || null,
      reopensAction: gameState.reopensAction
    });
  }
  
  return finalResult;
  
}

/**
 * ROTATE TO NEXT ACTIVE PLAYER
 * ARCHITECTURAL TRUTH: currentActorSeat must ALWAYS point to a player who can act, or be null
 * This function enforces that truth - if no one can act, set to null
 */
function rotateToNextPlayer(gameState) {
  const players = gameState.players;
  const currentIndex = players.findIndex(p => p.seatIndex === gameState.currentActorSeat);
  
  let nextIndex = (currentIndex + 1) % players.length;
  let attempts = 0;
  
  // Find next player who can act
  while (attempts < players.length) {
    const nextPlayer = players[nextIndex];
    
    // ARCHITECTURAL TRUTH: Only set currentActorSeat to players who can act
    if (!nextPlayer.folded && canPlayerAct(gameState, nextPlayer)) {
      gameState.currentActorSeat = nextPlayer.seatIndex;
      console.log(`🔄 [TURN] Rotated to Seat ${nextPlayer.seatIndex} (can act)`);
      return;
    }
    
    nextIndex = (nextIndex + 1) % players.length;
    attempts++;
  }
  
  // ARCHITECTURAL TRUTH: If no one can act, currentActorSeat MUST be null
  // This prevents invalid states where currentActorSeat points to a player who can't act
  gameState.currentActorSeat = null;
  console.log('🔄 [TURN] No players can act - set currentActorSeat to null (will trigger betting round completion)');
}

/**
 * RESET TO FIRST ACTOR (after street change)
 * Delegates to seat-manager module for proper seat/blind management
 * Maintains backward compatibility
 */
function resetToFirstActor(gameState) {
  const seatManager = require('./seat-manager');
  seatManager.resetToFirstActor(gameState);
}

/**
 * PROGRESS TO NEXT STREET
 * Advances game to next betting round AND DEALS COMMUNITY CARDS
 * Uses state machine for validation
 * CRITICAL FIX: Now deals cards when advancing streets
 */
function progressToNextStreet(gameState) {
  const stateMachine = require('./state-machine');
  
  // Use state machine to validate and transition
  const result = stateMachine.transitionToNextStreet(gameState);
  
  if (!result.success) {
    console.error(`❌ [TURN] Street transition failed: ${result.error}`);
    // Fallback to old behavior for backward compatibility (but log error)
    const streetOrder = ['PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'];
    const currentIndex = streetOrder.indexOf(gameState.street);
    if (currentIndex < streetOrder.length - 1) {
      gameState.street = streetOrder[currentIndex + 1];
      console.log(`🔄 [TURN] Advanced to ${gameState.street} (fallback)`);
    }
    // Still need to deal cards even in fallback
    dealCommunityCardsForStreet(gameState);
    return;
  }
  
  // Transition successful (already mutated by stateMachine)
  console.log(`🔄 [TURN] Advanced to ${gameState.street}`);
  
  // ARCHITECTURAL FIX: If transitioning to SHOWDOWN, handle showdown immediately
  // This determines winners and broadcasts hand_complete, then players can show/muck
  if (gameState.street === 'SHOWDOWN') {
    console.log('🏆 [TURN] Transitioned to SHOWDOWN - handling showdown');
    // Delegate to game-logic module for showdown handling
    const gameLogic = require('./game-logic');
    gameLogic.handleShowdown(gameState);
    // handleShowdown sets status to COMPLETED and determines winners
    // Frontend will show SHOW/MUCK buttons based on status === 'COMPLETED' && street === 'SHOWDOWN'
    return;
  }
  
  // ARCHITECTURAL FIX: Calculate side pots AFTER betting round completes
  // This ensures frontend always has correct mainPot vs totalPot during the hand
  // CRITICAL: Must calculate BEFORE resetting betThisStreet (needs cumulative bets)
  // HOTFIX 2: Side pots already calculated in game-logic.js when betting completed
  // Don't recalculate here - just use existing values
  // This prevents pot jumps in UI and ensures consistency
  console.log(`💰 [TURN] Using pre-calculated side pots for ${gameState.street}:`, {
    mainPot: gameState.mainPot,
    sidePotsCount: gameState.sidePots?.length || 0,
    totalPot: gameState.totalPot,
    rawPot: gameState.pot
  });
  
  // DEFENSIVE: Ensure pot values exist (shouldn't be needed if Hotfix 1 works)
  if (gameState.totalPot === undefined) {
    console.warn('⚠️ [TURN] totalPot not set - calculating now (should not happen)');
    const potLogic = require('./pot-logic');
    potLogic.calculateSidePots(gameState);
  }
  
  // CRITICAL FIX: Deal community cards for the new street
  dealCommunityCardsForStreet(gameState);
  
  // Reset betting state for new street
  gameState.players.forEach(p => {
    if (!p.folded && p.status !== 'ALL_IN') {
      // bet stays cumulative (for side pot calculation)
      // betThisStreet resets to 0 for new street
      p.betThisStreet = 0;
    } else if (p.status === 'ALL_IN') {
      // All-in players: bet stays (cumulative), betThisStreet stays 0 (they can't bet more)
      p.betThisStreet = 0;
    }
  });
  gameState.currentBet = 0;
  gameState.minRaise = 0; // Reset min raise for new street
  // FIX: Reset raise tracking at street advance
  gameState.lastRaiseSize = 0;
  gameState.lastAggressor = null;
  gameState.reopensAction = false;

  // ARCHITECTURAL TRUTH: Check if anyone can bet BEFORE resetting first actor
  // CRITICAL: Only trigger runout if NO ONE can bet (not just "can act")
  // If someone can bet, let them act first on the new street - don't prematurely runout
  const allActivePlayers = gameState.players.filter(p => !p.folded);
  const playersWhoCanBetList = playersWhoCanBet(gameState);
  
  // ARCHITECTURAL TRUTH: If no one can bet, trigger runout
  // This matches the logic in isBettingRoundComplete() and processAction()
  if (playersWhoCanBetList.length === 0 && allActivePlayers.length > 1) {
    console.log('🃏 [TURN] No players can bet - dealing out remaining streets', {
      activePlayers: allActivePlayers.length,
      playersWhoCanBet: 0
    });
    const gameLogic = require('./game-logic');
    gameLogic.handleAllInRunout(gameState);
    return;
  }
  
  // Keep playersWhoCanAct for solo player logic below
  const playersWhoCanAct = allActivePlayers.filter(p => canPlayerAct(gameState, p));
  const allInPlayers = allActivePlayers.filter(p => p.status === 'ALL_IN' && p.chips === 0);
  
  // ARCHITECTURAL PRINCIPLE: If only 1 player can act and everyone else is all-in,
  // check if that player has already matched the bet on the PREVIOUS street
  // If they have, trigger runout immediately (don't ask them to act again)
  if (playersWhoCanAct.length === 1 && allInPlayers.length > 0 && allInPlayers.length === allActivePlayers.length - 1) {
    const soloPlayer = playersWhoCanAct[0];
    const soloPlayerBet = soloPlayer.bet || 0;
    
    // Check if solo player has already matched all all-in bets
    // If all all-in players have bet <= solo player's bet, solo player has matched
    const allInBets = allInPlayers.map(p => p.bet || 0);
    const maxAllInBet = Math.max(...allInBets, 0);
    
    // If solo player's cumulative bet >= max all-in bet, they've matched → trigger runout
    if (soloPlayerBet >= maxAllInBet) {
      console.log('🃏 [TURN] Only 1 player can act, they matched all-in bets - triggering runout', {
        soloPlayer: soloPlayer.userId?.substr(0, 8),
        soloPlayerBet,
        maxAllInBet,
        allInCount: allInPlayers.length
      });
      const gameLogic = require('./game-logic');
      gameLogic.handleAllInRunout(gameState);
      return;
    }
    
    // Otherwise, solo player hasn't matched yet → let them act on new street
    console.log('🔄 [TURN] Only 1 player can act, but they haven\'t matched all-in bets yet - allowing action', {
      soloPlayer: soloPlayer.userId?.substr(0, 8),
      soloPlayerBet,
      maxAllInBet
    });
  }
  
  // Reset to first actor (will skip all-in players automatically via canPlayerAct check)
  resetToFirstActor(gameState);
  
  // ARCHITECTURAL TRUTH: After resetting, verify currentActorSeat points to a player who can act
  // If it doesn't (shouldn't happen, but defensive), trigger runout
  if (gameState.currentActorSeat !== null) {
    const actorPlayer = gameState.players.find(p => p.seatIndex === gameState.currentActorSeat);
    if (actorPlayer && !canPlayerAct(gameState, actorPlayer)) {
      console.warn('⚠️ [TURN] currentActorSeat points to player who cannot act - triggering runout', {
        seat: gameState.currentActorSeat,
        player: actorPlayer.userId?.substr(0, 8),
        chips: actorPlayer.chips,
        status: actorPlayer.status
      });
      const gameLogic = require('./game-logic');
      gameLogic.handleAllInRunout(gameState);
      return;
    }
  }
}

/**
 * DEAL COMMUNITY CARDS FOR CURRENT STREET
 * Deals flop (3 cards), turn (1 card), or river (1 card) based on street
 * Handles sandbox mode (predefined cards) vs normal mode (deck)
 */
function dealCommunityCardsForStreet(gameState) {
  if (!gameState.communityCards) {
    gameState.communityCards = [];
  }
  
  const street = gameState.street;
  const useSandboxCards = gameState.sandboxBoardCards && gameState.sandboxBoardCards.length > 0;
  
  if (street === 'FLOP') {
    // Deal flop (3 cards)
    if (useSandboxCards && gameState.sandboxBoardCards.length >= 3) {
      // SANDBOX: Use predefined flop cards
      gameState.communityCards = [...gameState.sandboxBoardCards.slice(0, 3)];
      console.log(`🃏 [TURN] Flop dealt (sandbox): ${gameState.communityCards.join(', ')}`);
    } else if (gameState.deck && gameState.deck.length >= 4) {
      // NORMAL: Burn 1, deal 3
      gameState.deck.pop(); // burn card
      gameState.communityCards = [
        gameState.deck.pop(),
        gameState.deck.pop(),
        gameState.deck.pop()
      ];
      console.log(`🃏 [TURN] Flop dealt: ${gameState.communityCards.join(', ')}`);
    } else {
      console.error('❌ [TURN] Cannot deal flop - deck missing or insufficient cards');
    }
  } else if (street === 'TURN') {
    // Deal turn (1 card)
    if (useSandboxCards && gameState.sandboxBoardCards.length >= 4) {
      // SANDBOX: Use predefined turn card
      gameState.communityCards.push(gameState.sandboxBoardCards[3]);
      console.log(`🃏 [TURN] Turn dealt (sandbox): ${gameState.communityCards[3]}`);
    } else if (gameState.deck && gameState.deck.length >= 2) {
      // NORMAL: Burn 1, deal 1
      gameState.deck.pop(); // burn card
      gameState.communityCards.push(gameState.deck.pop());
      console.log(`🃏 [TURN] Turn dealt: ${gameState.communityCards[3]}`);
    } else {
      console.error('❌ [TURN] Cannot deal turn - deck missing or insufficient cards');
    }
  } else if (street === 'RIVER') {
    // Deal river (1 card)
    if (useSandboxCards && gameState.sandboxBoardCards.length >= 5) {
      // SANDBOX: Use predefined river card
      gameState.communityCards.push(gameState.sandboxBoardCards[4]);
      console.log(`🃏 [TURN] River dealt (sandbox): ${gameState.communityCards[4]}`);
    } else if (gameState.deck && gameState.deck.length >= 2) {
      // NORMAL: Burn 1, deal 1
      gameState.deck.pop(); // burn card
      gameState.communityCards.push(gameState.deck.pop());
      console.log(`🃏 [TURN] River dealt: ${gameState.communityCards[4]}`);
    } else {
      console.error('❌ [TURN] Cannot deal river - deck missing or insufficient cards');
    }
  }
  // PREFLOP and SHOWDOWN don't need cards dealt
}

module.exports = {
  canPlayerAct,
  playersWhoCanBet,
  getLastAggressor,
  isBettingRoundComplete,
  rotateToNextPlayer,
  resetToFirstActor,
  progressToNextStreet,
  dealCommunityCardsForStreet
};

