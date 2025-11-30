/**
 * GAME LOGIC MODULE (ORCHESTRATOR)
 * 
 * Purpose: Main game flow orchestration
 * Responsibilities:
 * - Process player actions
 * - Coordinate betting, pot, and turn logic
 * - Handle fold wins
 * - Handle showdown
 * - Handle all-in runouts
 * 
 * Architecture: Orchestrates betting-logic, pot-logic, turn-logic, and rules-ranks modules
 */

const { validateAction, applyAction } = require('./betting-logic');
const { validateChipConservation, calculateSidePots, handleUncalledBets } = require('./pot-logic');
const { 
  isBettingRoundComplete, 
  rotateToNextPlayer, 
  progressToNextStreet 
} = require('./turn-logic');
const { evaluateHand } = require('./rules-ranks');
const { evaluatePokerHand, compareHands } = require('./simple-hand-evaluator');
const { logActionSummary, logActionDetail } = require('../utils/action-logger');

/**
 * PROCESS ACTION
 * Main entry point for processing player actions
 * 
 * @param {Object} gameState - Current game state
 * @param {string} userId - Player making action
 * @param {string} action - Action type (FOLD, CHECK, CALL, RAISE, ALL_IN)
 * @param {number} amount - Bet amount (for RAISE)
 * @returns {Object} Result with success flag and updated gameState
 */
function processAction(gameState, userId, action, amount = 0, expectedSeq = null) {
  logActionSummary({
    phase: 'action',
    roomId: gameState.roomId,
    handNumber: gameState.handNumber,
    playerId: userId,
    action,
    amount,
    street: gameState.street,
    pot: gameState.pot,
    currentBet: gameState.currentBet,
    nextActorSeat: gameState.currentActorSeat
  });
  
  // FIX: Validate action sequence (prevents duplicate/out-of-order actions)
  if (expectedSeq !== null) {
    const currentSeq = gameState.actionSeq || 0;
    if (expectedSeq !== currentSeq) {
      console.warn(`❌ [GAME] Action sequence mismatch: expected ${expectedSeq}, current ${currentSeq}`);
      return { success: false, error: `Action sequence mismatch: expected ${expectedSeq}, current ${currentSeq}` };
    }
  }
  
  // SHOWDOWN CHECK: No actions allowed during showdown!
  if (gameState.street === 'SHOWDOWN') {
    console.warn(`❌ [GAME] Hand complete, action rejected`);
    return { success: false, error: 'Hand is complete, no actions allowed' };
  }
  
  // 1. VALIDATE: Is it this player's turn?
  const player = gameState.players.find(p => p.userId === userId);
  if (!player) {
    console.warn(`❌ [GAME] Player ${userId.substr(0, 8)} not in hand`);
    return { success: false, error: 'Player not in hand' };
  }

  const currentSeat = gameState.players.find(p => p.seatIndex === gameState.currentActorSeat);
  if (!currentSeat || currentSeat.userId !== userId) {
    console.warn(`❌ [GAME] Not player's turn. Current actor: ${currentSeat?.userId?.substr(0, 8) || 'NONE'}, Attempted: ${userId.substr(0, 8)}`);
    return { success: false, error: 'Not your turn' };
  }

  if (player.folded) {
    console.warn(`❌ [GAME] Player ${userId.substr(0, 8)} already folded`);
    return { success: false, error: 'You have already folded' };
  }

  // 2. VALIDATE ACTION LEGALITY (production logic - TS BettingEngine pattern)
  const validation = validateAction(gameState, player, action, amount);
  if (!validation.isValid) {
    console.warn(`❌ [GAME] Action rejected: ${validation.error}`);
    return { success: false, error: validation.error };
  }

  // 2B. APPLY VALIDATION ADJUSTMENTS (TS pattern - use adjustedAmount if provided)
  const adjustedAmount = validation.adjustedAmount || amount;
  const isAllIn = validation.isAllIn || false;
  
  // Log warnings if validation adjusted the action
  if (validation.warning) {
    logActionDetail('game.validationWarning', { warning: validation.warning });
  }
  
  if (adjustedAmount !== amount) {
    logActionDetail('game.amountAdjusted', { from: amount, to: adjustedAmount });
  }

  // 3. APPLY ACTION (production logic - use adjusted amount)
  logActionDetail('game.applyAction', {
    playerId: userId,
    action,
    amount: adjustedAmount,
    street: gameState.street
  });
  const updatedState = applyAction(
    gameState, 
    player, 
    action, 
    adjustedAmount, 
    isAllIn,
    validateChipConservation // Pass chip conservation validator
  );

  // 3B. CHECK FOR FOLD WIN (Critical: If only 1 player left, end immediately)
  if (action === 'FOLD') {
    const activePlayers = updatedState.players.filter(p => !p.folded && p.status !== 'ALL_IN');
    
    if (activePlayers.length === 1) {
      logActionSummary({
        phase: 'action',
        handNumber: gameState.handNumber,
        metadata: { event: 'foldWin', remainingPlayers: activePlayers.length }
      });
      handleFoldWin(updatedState, activePlayers[0]);
      return { success: true, gameState: updatedState };
    }
  }

  // 4. CHECK BETTING ROUND COMPLETE (production logic)
  const bettingComplete = isBettingRoundComplete(updatedState);
  
  // CRITICAL: Log betting round status for debugging
  const activePlayers = updatedState.players.filter(p => !p.folded);
  const playersWithChips = activePlayers.filter(p => (p.chips || 0) > 0);
  // ARCHITECTURAL TRUTH: Full all-in = status === 'ALL_IN' AND chips === 0
  const allInPlayers = activePlayers.filter(p => p.status === 'ALL_IN' && p.chips === 0);
  const playersWhoCanAct = activePlayers.filter(p => {
    const turnLogic = require('./turn-logic');
    return turnLogic.canPlayerAct(updatedState, p);
  });
  
  logActionDetail('game.roundCheck', {
    bettingComplete,
    activePlayers: activePlayers.length,
    playersWithChips: playersWithChips.length,
    allInPlayers: allInPlayers.length,
    playersWhoCanAct: playersWhoCanAct.length,
    currentBet: updatedState.currentBet,
    street: updatedState.street,
    currentActorSeat: updatedState.currentActorSeat,
    playerStatuses: activePlayers.map(p => ({
      seat: p.seatIndex,
      userId: p.userId,
      chips: p.chips,
      bet: p.bet,
      betThisStreet: p.betThisStreet || 0,
      status: p.status,
      isFullAllIn: p.status === 'ALL_IN' && p.chips === 0,
      canAct: playersWhoCanAct.includes(p)
    }))
  });
  
  if (bettingComplete) {
    // HOTFIX 1: Calculate side pots IMMEDIATELY when betting completes
    // This ensures pot state is correct BEFORE any decisions about progression
    // Prevents pot display issues and chip conservation violations
    const potLogic = require('./pot-logic');
    logActionDetail('game.roundComplete', { stage: 'preProgression' });
    potLogic.handleUncalledBets(updatedState);
    potLogic.calculateSidePots(updatedState);
    logActionDetail('game.potState', {
      mainPot: updatedState.mainPot,
      sidePots: updatedState.sidePots?.length || 0,
      totalPot: updatedState.totalPot
    });
    
    // ARCHITECTURAL PRINCIPLE: Check if anyone can still bet (PRIORITY FIX)
    // Runout happens when NO ONE can bet, not when everyone is fully all-in
    // This matches the check in isBettingRoundComplete (turn-logic.js)
    const turnLogic = require('./turn-logic');
    const playersWhoCanBetList = turnLogic.playersWhoCanBet(updatedState);
    
    if (playersWhoCanBetList.length === 0 && activePlayers.length > 1) {
      logActionDetail('game.runoutTriggered', { activePlayers: activePlayers.length });
      handleAllInRunout(updatedState);
    } else {
      logActionDetail('game.streetAdvance', { from: updatedState.street });
      progressToNextStreet(updatedState);
    }
  } else {
    // Betting round not complete - rotate to next player
    // ARCHITECTURAL TRUTH: rotateToNextPlayer will set currentActorSeat to null if no one can act
    logActionDetail('game.rotatePlayer', {});
    rotateToNextPlayer(updatedState);
    
    // ARCHITECTURAL TRUTH: If currentActorSeat is null after rotation, no one can act
    // This should trigger betting round completion (defensive check)
    if (updatedState.currentActorSeat === null) {
      console.warn('⚠️ [GAME] currentActorSeat is null after rotation - checking if round should complete');
      const recheckComplete = isBettingRoundComplete(updatedState);
      if (recheckComplete) {
        logActionDetail('game.streetAdvance', { reason: 'noActor' });
        progressToNextStreet(updatedState);
      } else {
        console.error('❌ [GAME] INCONSISTENT STATE: No one can act but round not complete!', {
          activePlayers: activePlayers.length,
          allInPlayers: allInPlayers.length,
          playersWhoCanAct: playersWhoCanAct.length
        });
      }
    }
  }

  logActionDetail('game.actionProcessed', {
    street: updatedState.street,
    currentBet: updatedState.currentBet,
    nextActorSeat: updatedState.currentActorSeat
  });
  return { success: true, gameState: updatedState };
}

/**
 * HANDLE FOLD WIN
 * When all players fold except one
 * FIXED: Handle uncalled bets before awarding pot
 */
function handleFoldWin(gameState, winner) {
  logActionSummary({
    phase: 'action',
    handNumber: gameState.handNumber,
    playerId: winner.userId,
    seatIndex: winner.seatIndex,
    action: 'WIN_BY_FOLD',
    amount: gameState.pot
  });
  
  // Handle uncalled bets first (return excess to winner if they had highest bet)
  handleUncalledBets(gameState);
  
  const potAmount = gameState.pot;
  
  // Award pot to winner
  winner.chips += potAmount;
  
  // Set winner info
  gameState.winners = [{
    userId: winner.userId,
    seatIndex: winner.seatIndex,
    amount: potAmount,
    handDescription: 'Win by fold'
  }];
  
  // ARCHITECTURAL FIX: Clear pots after fold win (chips are now in winner's stack)
  gameState.pot = 0;
  gameState.mainPot = 0;
  gameState.sidePots = [];
  gameState.totalPot = 0;
  
  // Use state machine for status transition
  const stateMachine = require('./state-machine');
  stateMachine.setStatus(gameState, 'COMPLETED');
  stateMachine.transitionToShowdown(gameState); // Set to showdown so UI knows hand is over
  
  logActionSummary({
    phase: 'action',
    handNumber: gameState.handNumber,
    playerId: winner.userId,
    seatIndex: winner.seatIndex,
    action: 'HAND_COMPLETE',
    amount: potAmount
  });
}

/**
 * HANDLE ALL-IN RUNOUT
 * When all players are all-in, deal out all remaining streets to showdown
 * FIXED: Works with side pots - bets stay, just deal cards
 */
function handleAllInRunout(gameState) {
  logActionDetail('game.dealRunout', {
    street: gameState.street,
    board: gameState.communityCards || []
  });
  
  const streetOrder = ['PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'];
  const currentIndex = streetOrder.indexOf(gameState.street);
  const previousCards = gameState.communityCards ? [...gameState.communityCards] : [];
  
  // Track streets that need progressive reveals
  gameState.allInRunoutStreets = [];
  gameState.needsProgressiveReveal = true;
  
  // Check if sandbox board cards are available
  const useSandboxCards = gameState.sandboxBoardCards && gameState.sandboxBoardCards.length > 0;
  
  // Deal out all remaining streets based on current street
  if (currentIndex < 1) {
    // Preflop - deal flop, turn, river
    logActionDetail('game.runoutSequence', { sequence: 'FLOP, TURN, RIVER' });
    if (!gameState.communityCards) gameState.communityCards = [];
    
    if (useSandboxCards) {
      // SANDBOX: For preflop all-ins, deal FLOP (3 cards), then TURN, then RIVER progressively
      // ARCHITECTURAL FIX: Each street is revealed progressively, so store cards separately
      const flopCards = gameState.sandboxBoardCards.slice(0, 3);
      // Store flop cards separately (will be revealed first)
      gameState.allInRunoutStreets.push({
        street: 'FLOP',
        cards: [...flopCards] // Only flop cards (3 cards)
      });
      
      if (gameState.sandboxBoardCards.length >= 4) {
        const turnCard = gameState.sandboxBoardCards[3];
        const turnCards = [...flopCards, turnCard]; // Flop + turn (4 cards total)
        gameState.allInRunoutStreets.push({
          street: 'TURN',
          cards: [...turnCards] // Flop + turn (4 cards)
        });
      }
      
      if (gameState.sandboxBoardCards.length >= 5) {
        const turnCards = [...flopCards, gameState.sandboxBoardCards[3]];
        const riverCard = gameState.sandboxBoardCards[4];
        const riverCards = [...turnCards, riverCard]; // Flop + turn + river (5 cards total)
        gameState.allInRunoutStreets.push({
          street: 'RIVER',
          cards: [...riverCards] // All 5 cards
        });
      }
      
      // Set final state to RIVER with all 5 cards
      if (gameState.sandboxBoardCards.length >= 5) {
        gameState.communityCards = [...flopCards, gameState.sandboxBoardCards[3], gameState.sandboxBoardCards[4]];
        gameState.street = 'RIVER';
      } else if (gameState.sandboxBoardCards.length >= 4) {
        gameState.communityCards = [...flopCards, gameState.sandboxBoardCards[3]];
        gameState.street = 'TURN';
      } else {
        gameState.communityCards = [...flopCards];
        gameState.street = 'FLOP';
      }
    } else {
      // NORMAL: For preflop all-ins, deal FLOP (3 cards), then TURN, then RIVER
      // ARCHITECTURAL FIX: Each street is revealed progressively, so store cards separately
      // First: FLOP (3 cards)
      gameState.deck.pop(); // burn
      const flopCards = [
        gameState.deck.pop(),
        gameState.deck.pop(),
        gameState.deck.pop()
      ];
      // Store flop cards separately (will be revealed first)
      gameState.allInRunoutStreets.push({
        street: 'FLOP',
        cards: [...flopCards] // Only flop cards (3 cards)
      });
      
      // Second: TURN (1 card added to flop)
      gameState.deck.pop(); // burn
      const turnCard = gameState.deck.pop();
      const turnCards = [...flopCards, turnCard]; // Flop + turn (4 cards total)
      gameState.allInRunoutStreets.push({
        street: 'TURN',
        cards: [...turnCards] // Flop + turn (4 cards)
      });
      
      // Third: RIVER (1 card added to turn)
      gameState.deck.pop(); // burn
      const riverCard = gameState.deck.pop();
      const riverCards = [...turnCards, riverCard]; // Flop + turn + river (5 cards total)
      gameState.allInRunoutStreets.push({
        street: 'RIVER',
        cards: [...riverCards] // All 5 cards
      });
      
      // Set final state to RIVER with all 5 cards
      gameState.communityCards = [...riverCards];
      gameState.street = 'RIVER';
    }
  } else if (currentIndex === 1) {
    // Flop - deal turn, river
    logActionDetail('game.runoutSequence', { sequence: 'TURN, RIVER' });
    if (!gameState.communityCards) gameState.communityCards = [];
    
    if (useSandboxCards && gameState.sandboxBoardCards.length >= 4) {
      gameState.communityCards.push(gameState.sandboxBoardCards[3]);
      gameState.street = 'TURN';
      gameState.allInRunoutStreets.push({
        street: 'TURN',
        cards: [...gameState.communityCards]
      });
      
      if (gameState.sandboxBoardCards.length >= 5) {
        gameState.communityCards.push(gameState.sandboxBoardCards[4]);
        gameState.street = 'RIVER';
        gameState.allInRunoutStreets.push({
          street: 'RIVER',
          cards: [...gameState.communityCards]
        });
      }
    } else {
      // ARCHITECTURAL FIX: For flop all-ins, deal TURN then RIVER progressively
      // First: TURN (1 card added to existing flop)
      gameState.deck.pop(); // burn
      const turnCard = gameState.deck.pop();
      const turnCards = [...gameState.communityCards, turnCard]; // Flop + turn (4 cards)
      gameState.allInRunoutStreets.push({
        street: 'TURN',
        cards: [...turnCards] // Flop + turn (4 cards)
      });
      
      // Second: RIVER (1 card added to turn)
      gameState.deck.pop(); // burn
      const riverCard = gameState.deck.pop();
      const riverCards = [...turnCards, riverCard]; // Flop + turn + river (5 cards)
      gameState.allInRunoutStreets.push({
        street: 'RIVER',
        cards: [...riverCards] // All 5 cards
      });
      
      // Set final state to RIVER with all 5 cards
      gameState.communityCards = [...riverCards];
      gameState.street = 'RIVER';
    }
  } else if (currentIndex === 2) {
    // Turn - deal river
    logActionDetail('game.runoutSequence', { sequence: 'RIVER' });
    if (!gameState.communityCards) gameState.communityCards = [];
    
    if (useSandboxCards && gameState.sandboxBoardCards.length >= 5) {
      gameState.communityCards.push(gameState.sandboxBoardCards[4]);
      gameState.street = 'RIVER';
      gameState.allInRunoutStreets.push({
        street: 'RIVER',
        cards: [...gameState.communityCards]
      });
    } else {
      // Burn card, then river
      gameState.deck.pop(); // burn
      gameState.communityCards.push(gameState.deck.pop());
      gameState.street = 'RIVER';
      gameState.allInRunoutStreets.push({
        street: 'RIVER',
        cards: [...gameState.communityCards]
      });
    }
  }
  
  // ARCHITECTURAL PRINCIPLE: Don't call handleShowdown here
  // The bridge (game-engine-bridge.js) will handle progressive reveals with delays,
  // then call handleShowdown after all cards are revealed to players
  // This ensures smooth UX: cards reveal progressively, then winner is announced
  
  // Ensure we're at RIVER (final street before showdown)
  const stateMachine = require('./state-machine');
  const riverResult = stateMachine.transitionToNextStreet(gameState, 'RIVER');
  if (!riverResult.success) {
    // Fallback: ensure we're at RIVER
    gameState.street = 'RIVER';
  }
  
  logActionSummary({
    phase: 'action',
    handNumber: gameState.handNumber,
    metadata: { event: 'allInRunoutPrepared', streets: gameState.allInRunoutStreets.length }
  });
  logActionDetail('game.allInRunoutStreets', gameState.allInRunoutStreets.map(s => s.street));
  // Note: handleShowdown will be called by the bridge after progressive reveals
}

/**
 * HANDLE SHOWDOWN
 * FIXED: Uses side pot distribution, handles uncalled bets, odd chip rule
 */
function handleShowdown(gameState) {
  logActionDetail('game.showdownStart', { board: gameState.communityCards });
  
  // CRITICAL: Capture snapshot BEFORE any mutations for accurate extraction
  const snapshotBeforeShowdown = {
    pot: gameState.pot,
    players: gameState.players.map(p => ({
      userId: p.userId,
      seatIndex: p.seatIndex,
      chips: p.chips,
      bet: p.bet,
      betThisStreet: p.betThisStreet || 0,
      holeCards: p.holeCards ? [...p.holeCards] : null,
      folded: p.folded,
      status: p.status
    })),
    communityCards: gameState.communityCards ? [...gameState.communityCards] : [],
    dealerPosition: gameState.dealerPosition,
    sbPosition: gameState.sbPosition,
    bbPosition: gameState.bbPosition,
    actionHistory: gameState.actionHistory ? [...gameState.actionHistory] : []
  };
  
  // Store snapshot in gameState for extraction later
  gameState.snapshotBeforeShowdown = snapshotBeforeShowdown;
  
  // Use state machine for transition (declare once at function scope)
  const stateMachine = require('./state-machine');
  stateMachine.transitionToShowdown(gameState);
  
  // Get all players who didn't fold
  const showdownPlayers = gameState.players.filter(p => !p.folded);
  
  if (showdownPlayers.length === 1) {
    // Only one player - they win everything (after uncalled bet handling)
    const winner = showdownPlayers[0];
    
    // Handle uncalled bets first
    handleUncalledBets(gameState);
    
    winner.chips += gameState.pot;
    
    gameState.winners = [{
      userId: winner.userId,
      seatIndex: winner.seatIndex,
      amount: gameState.pot,
      handDescription: 'Last player standing'
    }];
    
    gameState.pot = 0;
    // Reuse stateMachine already declared above
    stateMachine.setStatus(gameState, 'COMPLETED');
    logActionSummary({
      phase: 'action',
      handNumber: gameState.handNumber,
      playerId: winner.userId,
      seatIndex: winner.seatIndex,
      action: 'WINNER_LAST_STANDING',
      amount: gameState.pot
    });
    return;
  }
  
  // CRITICAL: Handle uncalled bets FIRST (before side pot calculation)
  handleUncalledBets(gameState);
  
  // Validate chip conservation after uncalled bet handling
  validateChipConservation(gameState, gameState.startingTotalChips);
  
  // Evaluate all hands
  const playerHands = [];
  
  logActionDetail('game.showdownEvaluate', { players: showdownPlayers.length });
  
  for (const player of showdownPlayers) {
    if (player.holeCards && player.holeCards.length === 2 && gameState.communityCards.length === 5) {
      const handEval = evaluatePokerHand(player.holeCards, gameState.communityCards);
      
      logActionDetail('game.showdownPlayer', {
        playerId: player.userId,
        seatIndex: player.seatIndex,
        hand: handEval.name
      });
      
      playerHands.push({
        player,
        handEval,
        holeCards: player.holeCards
      });
    }
  }
  
  // Calculate side pots and distribute
  const pots = calculateSidePots(gameState);
  const distributions = distributePots(gameState, playerHands, gameState.dealerPosition);
  
  // Set winners
  gameState.winners = distributions.map(d => ({
    userId: d.userId,
    seatIndex: d.seatIndex,
    amount: d.amount,
    handDescription: d.handDescription
  }));
  
  // ARCHITECTURAL FIX: Clear pots after distribution (chips are now in player stacks)
  // This prevents double-counting in chip conservation validation
  gameState.pot = 0;
  gameState.mainPot = 0;
  gameState.sidePots = [];
  gameState.totalPot = 0;
  
  // Validate chip conservation after distribution
  validateChipConservation(gameState, gameState.startingTotalChips);
  
  // Reuse stateMachine already declared above
  stateMachine.setStatus(gameState, 'COMPLETED');
  
  logActionDetail('game.showdownComplete', {});
}

/**
 * DISTRIBUTE POTS
 * Distribute side pots to winners based on hand strength
 */
function distributePots(gameState, playerHands, dealerPosition) {
  const pots = calculateSidePots(gameState);
  const distributions = [];
  
  if (pots.length === 0) {
    console.warn('⚠️ [GAME] No side pots calculated');
    return distributions;
  }
  
  // Evaluate hands for each pot
  for (const pot of pots) {
    // Get eligible players for this pot
    const eligiblePlayers = playerHands.filter(ph => 
      pot.eligiblePlayerIds.includes(ph.player.userId)
    );
    
    if (eligiblePlayers.length === 0) {
      console.warn(`⚠️ [GAME] No eligible players for pot level ${pot.level}`);
      continue;
    }
    
    // Sort by hand strength (best first)
    eligiblePlayers.sort((a, b) => compareHands(a.handEval, b.handEval));
    
    // Find winners (players with best hand)
    const bestHand = eligiblePlayers[0].handEval;
    const winners = eligiblePlayers.filter(h => 
      compareHands(h.handEval, bestHand) === 0
    );
    
    // Distribute pot among winners
    const potAmount = pot.amount;
    const shareAmount = Math.floor(potAmount / winners.length);
    const remainder = potAmount % winners.length;
    
    // FIX: ODD CHIP RULE - Sort winners by distance left of dealer (clockwise)
    // Calculate distance from dealer for each winner
    const winnersWithDistance = winners.map(w => ({
      winner: w,
      distance: (w.player.seatIndex - dealerPosition + gameState.players.length) % gameState.players.length
    }));
    
    // Sort by distance (closest left of dealer first)
    winnersWithDistance.sort((a, b) => a.distance - b.distance);
    
    // Distribute pot with odd chips going to winners left of dealer
    winnersWithDistance.forEach((w, index) => {
      const amount = shareAmount + (index < remainder ? 1 : 0);
      const winner = w.winner;
      
      if (amount > 0) {
        winner.player.chips += amount;
        distributions.push({
          userId: winner.player.userId,
          seatIndex: winner.player.seatIndex,
          amount: amount,
          potLevel: pot.level,
          handDescription: winner.handEval.name
        });
        
        logActionDetail('game.potDistribution', {
          potLevel: pot.level,
          userId: winner.player.userId,
          seatIndex: winner.player.seatIndex,
          amount,
          hand: winner.handEval.name,
          oddChip: index < remainder
        });
      }
    });
  }
  
  return distributions;
}

module.exports = {
  processAction,
  handleFoldWin,
  handleAllInRunout,
  handleShowdown,
  distributePots
};

