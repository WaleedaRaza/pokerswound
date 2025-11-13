/**
 * BETTING LOGIC MODULE
 * 
 * Purpose: Betting validation and action application
 * Responsibilities:
 * - Validate player actions (FOLD, CHECK, CALL, RAISE, ALL_IN)
 * - Apply actions to game state
 * - Handle all-in conversions
 * - Track action history
 * 
 * Architecture: Based on TS ActionValidator and BettingEngine patterns
 */

/**
 * VALIDATE ACTION
 * Enhanced with TS ActionValidator patterns
 * Returns ValidationResult with adjustedAmount and isAllIn flags
 */
function validateAction(gameState, player, action, amount) {
  // Basic validations first (TS ActionValidator pattern)
  if (!player) {
    return { isValid: false, error: 'Player not found' };
  }

  if (player.folded) {
    return { isValid: false, error: 'Player has already folded' };
  }

  if (player.status === 'ALL_IN' && action !== 'FOLD') {
    return { isValid: false, error: 'Player is already all-in' };
  }

  const { currentBet, pot } = gameState;
  const playerBetThisStreet = player.betThisStreet || 0;
  const playerChips = player.chips || 0;
  // FIX: Use lastRaiseSize for min-raise (or bigBlind if no previous raise)
  const lastRaiseSize = gameState.lastRaiseSize || 0;
  const bigBlind = gameState.bigBlind || (gameState.bbPosition ? 10 : 0); // Fallback if not set
  const minRaise = lastRaiseSize || bigBlind; // Bootstrap with bigBlind on preflop

  // EDGE CASE: Zero-chip player (PokerLogic line 315-317, 488)
  // If player has 0 chips, they can only fold or check (free check/free fold)
  if (playerChips === 0 && action !== 'FOLD' && action !== 'CHECK') {
    return { 
      isValid: false, 
      error: 'Player has 0 chips - can only fold or check' 
    };
  }

  switch (action) {
    case 'FOLD':
      // EDGE CASE: Player can fold when facing no action (PokerLogic line 156)
      return { isValid: true };

    case 'CHECK':
      // FIX: Use betThisStreet for new street validation (cumulative bet persists across streets)
      // EDGE CASE: Zero-chip free check (PokerLogic line 315-317)
      if (playerChips === 0 && currentBet === 0) {
        return { isValid: true }; // Free check with 0 chips when no bet
      }
      if (currentBet > playerBetThisStreet) {
        return { isValid: false, error: 'Cannot check when facing a bet' };
      }
      if (currentBet === 0 && playerBetThisStreet === 0) {
        return { isValid: true }; // Can check when no bet
      }
      if (playerBetThisStreet === currentBet) {
        return { isValid: true }; // Already matched, can check
      }
      return { isValid: false, error: 'Cannot check - bet mismatch' };

    case 'CALL': {
      // FIX: Use betThisStreet for call calculation (cumulative bet persists across streets)
      const playerBetThisStreet = player.betThisStreet || 0;
      const callAmount = currentBet - playerBetThisStreet;
      
      // EDGE CASE: Free call with 0 chips (PokerLogic line 160)
      // Allowed only if no bet (callAmount === 0)
      if (playerChips === 0 && callAmount === 0) {
        return { isValid: true }; // Free call when no bet
      }
      
      if (callAmount <= 0) {
        return { isValid: false, error: 'No bet to call - check instead' };
      }
      
      // EDGE CASE: Zero-chip player cannot call a bet
      if (playerChips === 0) {
        return { isValid: false, error: 'Cannot call with 0 chips - fold instead' };
      }
      
      // Handle partial all-in calls (TS BettingEngine pattern)
      if (callAmount > playerChips && playerChips > 0) {
        // Auto-convert to all-in call
        return { 
          isValid: true, 
          adjustedAmount: playerChips,
          isAllIn: true,
          warning: `Call amount ${callAmount} exceeds stack ${playerChips}, converting to all-in`
        };
      }
      
      if (callAmount > playerChips) {
        return { isValid: false, error: 'Not enough chips to call' };
      }
      
      return { isValid: true };
    }

    case 'BET': {
      // ARCHITECTURAL FIX: BET action when no bet exists (currentBet === 0)
      if (!amount || amount <= 0) {
        return { isValid: false, error: 'Bet requires a positive amount' };
      }
      
      if (currentBet > 0) {
        return { isValid: false, error: 'Cannot bet when there is already a bet - raise instead' };
      }
      
      // BET validation: must be at least big blind
      const bigBlind = gameState.bigBlind || 10;
      if (amount < bigBlind) {
        return { isValid: false, error: `Minimum bet is ${bigBlind} (big blind)` };
      }
      
      // Handle all-in bet
      if (amount >= playerChips) {
        return { 
          isValid: true, 
          adjustedAmount: playerChips,
          isAllIn: true,
          reopens: true // All-in bet reopens action
        };
      }
      
      // Full bet - action reopens
      return { 
        isValid: true,
        reopens: true // Full bet reopens action
      };
    }

    case 'RAISE': {
      if (!amount || amount <= 0) {
        return { isValid: false, error: 'Raise requires a positive amount' };
      }
      
      if (currentBet === 0) {
        return { isValid: false, error: 'Cannot raise when there is no bet - bet instead' };
      }
      
      // EDGE CASE: Player cannot raise their own all-in (PokerLogic line 158, 486)
      // Check if currentBet was set by this player's all-in
      if (gameState.lastAggressor === player.userId && player.status === 'ALL_IN') {
        return { 
          isValid: false, 
          error: 'Cannot raise your own all-in' 
        };
      }
      
      // FIX: Interpret amount as target street total (new currentBet)
      const targetBet = amount;
      const toCall = currentBet - playerBetThisStreet;
      const raisePortion = targetBet - currentBet; // Raise portion above current bet
      
      if (targetBet <= currentBet) {
        return { isValid: false, error: `Raise must be higher than current bet ${currentBet}` };
      }
      
      // FIX: Enforce min-raise using lastRaiseSize (or bigBlind if no previous raise)
      if (raisePortion < minRaise && (playerChips - toCall) >= minRaise) {
        return { 
          isValid: false, 
          error: `Minimum raise is ${minRaise}, raise portion is ${raisePortion}` 
        };
      }
      
      // Handle all-in raise (less than min raise but all chips)
      const totalNeeded = targetBet - playerBetThisStreet;
      if (totalNeeded > playerChips) {
        return { isValid: false, error: 'Not enough chips for this raise - go all-in instead' };
      }
      
      // If raising with all chips but less than min raise, convert to all-in (short all-in)
      const isShortAllIn = (totalNeeded === playerChips && raisePortion < minRaise);
      if (isShortAllIn) {
        return { 
          isValid: true, 
          adjustedAmount: playerChips,
          isAllIn: true,
          reopens: false, // Short all-ins don't reopen action
          warning: 'Raise amount below minimum, converting to all-in'
        };
      }
      
      // Full raise - action reopens
      return { 
        isValid: true,
        reopens: true // Full raise reopens action
      };
    }

    case 'ALL_IN':
      if (playerChips <= 0) {
        return { isValid: false, error: 'Player has no chips to go all-in' };
      }
      return { 
        isValid: true, 
        adjustedAmount: playerChips,
        isAllIn: true 
      };

    default:
      return { isValid: false, error: `Unknown action: ${action}` };
  }
}

/**
 * APPLY ACTION TO STATE
 * PRODUCTION-GRADE: Enhanced with TS BettingEngine patterns
 * Uses adjustedAmount from validation (for all-in conversions)
 * 
 * @param {Object} gameState - Game state to modify
 * @param {Object} player - Player object (will be modified)
 * @param {string} action - Action type
 * @param {number} amount - Bet amount
 * @param {boolean} isAllInFromValidation - Whether validation converted to all-in
 * @param {Function} validateChipConservation - Chip conservation validator
 * @returns {Object} Modified gameState
 */
function applyAction(gameState, player, action, amount, isAllInFromValidation = false, validateChipConservation = null) {
  // HOTFIX 3: Reset reopensAction at start of every action
  // This prevents reopensAction from persisting across actions incorrectly
  // It will be set to true/false within this function based on the current action
  gameState.reopensAction = undefined;
  
  const playerBet = player.bet || 0;
  const playerBetThisStreet = player.betThisStreet || 0; // FIX: Add betThisStreet to scope
  const playerChips = player.chips || 0;
  const currentBet = gameState.currentBet || 0;

  switch (action) {
    case 'FOLD':
      player.folded = true;
      player.status = 'FOLDED';
      // FIX: Folds never reopen action
      if (gameState.reopensAction === undefined) {
        gameState.reopensAction = false;
      }
      break;

    case 'CHECK':
      // No state change, just log
      // FIX: Checks never reopen action
      if (gameState.reopensAction === undefined) {
        gameState.reopensAction = false;
      }
      break;

    case 'CALL': {
      // PRODUCTION: Use adjustedAmount from validation if provided (TS pattern)
      // FIX: Use betThisStreet for call calculation, always add delta (never overwrite)
      const callDelta = isAllInFromValidation 
        ? amount // Use adjusted amount from validation (partial all-in)
        : Math.min(currentBet - playerBetThisStreet, playerChips);
      
      // FIX: Always add delta to cumulative bet (never overwrite)
      player.bet += callDelta; // Cumulative bet
      player.betThisStreet += callDelta; // Street bet
      // CRITICAL: Clamp chips to 0 minimum (prevent negative balances)
      player.chips = Math.max(0, player.chips - callDelta);
      gameState.pot += callDelta;
      
      // FIX: Calls never reopen action
      gameState.reopensAction = false;
      
      // Validate chip conservation after chip movement
      if (validateChipConservation) {
        validateChipConservation(gameState, gameState.startingTotalChips);
      }
      
      // Mark as all-in if chips exhausted
      if (player.chips === 0) {
        player.status = 'ALL_IN';
        player.allInAmount = callDelta;
        if (player.betThisStreet < currentBet) {
          console.log(`💰 [BETTING] Partial all-in call: ${player.userId.substr(0, 8)} called ${callDelta} (needed ${currentBet - playerBetThisStreet})`);
        } else {
          console.log(`💰 [BETTING] Full all-in call: ${player.userId.substr(0, 8)} called ${callDelta}`);
        }
      }
      break;
    }

    case 'BET': {
      // ARCHITECTURAL FIX: BET action when no bet exists (currentBet === 0)
      // All-in matching rule applies to bets too
      
      // Interpret amount as target street total (new currentBet)
      const targetBet = amount; // Target street total (new currentBet)
      const betDelta = targetBet - playerBetThisStreet; // Delta to add (should equal amount when currentBet === 0)
      
      // FIX: Always add delta to cumulative bet (never overwrite)
      player.bet += betDelta; // Cumulative bet
      player.betThisStreet += betDelta; // Street bet
      player.chips = Math.max(0, player.chips - betDelta);
      gameState.pot += betDelta;
      
      const isAllInBet = player.chips === 0;
      
      // ARCHITECTURAL FIX: If this is an all-in bet, cap currentBet at what others can match
      if (isAllInBet) {
        const otherActivePlayers = gameState.players.filter(p => 
          !p.folded && p.userId !== player.userId
        );
        
        let maxMatchableBet = targetBet; // Default to target bet
        if (otherActivePlayers.length > 0) {
          const otherPlayerMaxBets = otherActivePlayers.map(p => {
            const playerMaxBet = (p.chips || 0) + (p.betThisStreet || 0);
            return playerMaxBet;
          });
          
          // CRITICAL: Use MINIMUM (not maximum) - this is what EVERYONE can match
          const minOtherPlayerBet = Math.min(...otherPlayerMaxBets);
          // currentBet is capped at what the smallest stack can match
          maxMatchableBet = Math.min(targetBet, minOtherPlayerBet);
        }
        
        // Set currentBet to maxMatchableBet (not targetBet)
        gameState.currentBet = maxMatchableBet;
        console.log(`💰 [BETTING] All-in bet: ${player.userId.substr(0, 8)} bet ${targetBet}, currentBet capped at ${maxMatchableBet} (min stack can match)`);
      } else {
        // Normal bet - set currentBet to targetBet
        gameState.currentBet = targetBet;
      }
      
      // BET always reopens action (creates a bet where none existed)
      const bigBlind = gameState.bigBlind || 10;
      const effectiveCurrentBet = isAllInBet ? gameState.currentBet : targetBet;
      const betPortion = effectiveCurrentBet; // Bet portion is the effective currentBet
      gameState.lastRaiseSize = betPortion >= bigBlind ? betPortion : bigBlind;
      gameState.lastAggressor = player.userId;
      gameState.reopensAction = true;
      
      // Mark as all-in if chips exhausted
      if (player.chips === 0) {
        player.status = 'ALL_IN';
        player.allInAmount = betDelta;
      }
      
      console.log(`🚀 [BETTING] Bet: ${player.userId.substr(0, 8)} bet ${targetBet}${isAllInBet ? ` (all-in, currentBet ${gameState.currentBet})` : ''}`);
      
      // Validate chip conservation after chip movement
      if (validateChipConservation) {
        validateChipConservation(gameState, gameState.startingTotalChips);
      }
      
      break;
    }

    case 'RAISE': {
      // ARCHITECTURAL FIX: All-in matching rule applies to raises too
      // If this raise is an all-in, currentBet must be capped at what others can match
      
      // FIX: Interpret amount as target street total, compute delta from betThisStreet
      const targetBet = amount; // Target street total (new currentBet)
      const raiseDelta = targetBet - playerBetThisStreet; // Delta to add
      
      // FIX: Always add delta to cumulative bet (never overwrite)
      player.bet += raiseDelta; // Cumulative bet
      player.betThisStreet += raiseDelta; // Street bet
      player.chips = Math.max(0, player.chips - raiseDelta);
      gameState.pot += raiseDelta;
      
      const isAllInRaise = player.chips === 0;
      
      // ARCHITECTURAL FIX: If this is an all-in raise, cap currentBet at what others can match
      if (isAllInRaise) {
        const otherActivePlayers = gameState.players.filter(p => 
          !p.folded && p.userId !== player.userId
        );
        
        let maxMatchableBet = targetBet; // Default to target bet
        if (otherActivePlayers.length > 0) {
          const otherPlayerMaxBets = otherActivePlayers.map(p => {
            const playerMaxBet = (p.chips || 0) + (p.betThisStreet || 0);
            return playerMaxBet;
          });
          
          // CRITICAL: Use MINIMUM (not maximum) - this is what EVERYONE can match
          const minOtherPlayerBet = Math.min(...otherPlayerMaxBets);
          // currentBet is capped at what the smallest stack can match
          maxMatchableBet = Math.min(targetBet, minOtherPlayerBet);
        }
        
        // Set currentBet to maxMatchableBet (not targetBet)
        gameState.currentBet = maxMatchableBet;
        console.log(`💰 [BETTING] All-in raise: ${player.userId.substr(0, 8)} raised to ${targetBet}, currentBet capped at ${maxMatchableBet} (min stack can match)`);
      } else {
        // Normal raise - set currentBet to targetBet
        gameState.currentBet = targetBet;
      }
      
      // FIX: Determine if this is a full raise or short all-in
      const effectiveCurrentBet = isAllInRaise ? gameState.currentBet : targetBet;
      const raisePortion = effectiveCurrentBet - currentBet; // Raise portion above previous currentBet
      const lastRaiseSize = gameState.lastRaiseSize || 0;
      const bigBlind = gameState.bigBlind || 10;
      const minRaiseSize = lastRaiseSize || bigBlind;
      const isFullRaise = raisePortion >= minRaiseSize;
      
      // FIX: Only update lastRaiseSize and lastAggressor on full raises
      if (isFullRaise && !isAllInRaise) {
        gameState.lastRaiseSize = raisePortion;
        gameState.lastAggressor = player.userId;
        gameState.reopensAction = true;
        console.log(`🚀 [BETTING] Full raise: ${player.userId.substr(0, 8)} raised to ${targetBet} (raise size: ${raisePortion})`);
      } else if (isFullRaise && isAllInRaise) {
        // Full all-in raise - still updates tracking
        gameState.lastRaiseSize = raisePortion;
        gameState.lastAggressor = player.userId;
        gameState.reopensAction = true;
        console.log(`🚀 [BETTING] Full all-in raise: ${player.userId.substr(0, 8)} raised to ${targetBet}, currentBet ${gameState.currentBet}`);
      } else {
        // Short all-in (less than min raise) - doesn't reopen
        gameState.reopensAction = false;
        console.log(`💰 [BETTING] Short all-in raise: ${player.userId.substr(0, 8)} raised to ${targetBet}, currentBet ${gameState.currentBet} (raise size: ${raisePortion} < min: ${minRaiseSize})`);
      }
      
      // Mark as all-in if chips exhausted
      if (player.chips === 0) {
        player.status = 'ALL_IN';
        player.allInAmount = raiseDelta;
      }
      
      // Validate chip conservation after chip movement
      if (validateChipConservation) {
        validateChipConservation(gameState, gameState.startingTotalChips);
      }
      
      break;
    }

    case 'ALL_IN': {
      // ARCHITECTURAL FIX: All-in matching rule
      // When a player goes all-in, currentBet is capped at the maximum OTHER players can match
      // Example: P1 has 990, P2 goes all-in with 2000 -> currentBet = 990 (not 2000)
      // P2's extra 1010 chips go into a side pot (handled by pot-logic.js)
      
      const allInDelta = playerChips;
      const newBetThisStreet = playerBetThisStreet + allInDelta;
      
      // CRITICAL: Calculate maximum bet that ALL OTHER players can match
      // ARCHITECTURAL TRUTH: currentBet must be capped at the MINIMUM stack (what everyone can match)
      // Example: P1 has 990, P2 has 2000, P3 has 5000
      // If P2 goes all-in with 2000, currentBet = 990 (not 2000) because P1 can only match 990
      const otherActivePlayers = gameState.players.filter(p => 
        !p.folded && p.userId !== player.userId
      );
      
      // Find the MINIMUM bet that all other players can match (the smallest stack)
      // This ensures EVERYONE can call, not just the player with the most chips
      let maxMatchableBet = newBetThisStreet; // Default to all-in amount
      if (otherActivePlayers.length > 0) {
        const otherPlayerMaxBets = otherActivePlayers.map(p => {
          // Player's maximum bet this street = remaining chips + already bet this street
          const playerMaxBet = (p.chips || 0) + (p.betThisStreet || 0);
          return playerMaxBet;
        });
        
        // CRITICAL: Use MINIMUM (not maximum) - this is what EVERYONE can match
        const minOtherPlayerBet = Math.min(...otherPlayerMaxBets);
        // currentBet is capped at what the smallest stack can match
        maxMatchableBet = Math.min(newBetThisStreet, minOtherPlayerBet);
        
        console.log(`💰 [BETTING] All-in matching: P${player.seatIndex} all-in ${allInDelta}, other players max bets: [${otherPlayerMaxBets.join(', ')}], min=${minOtherPlayerBet}, currentBet capped at ${maxMatchableBet}`);
      }
      
      // FIX: Always add delta to cumulative bet
      player.bet += allInDelta; // Cumulative bet
      player.betThisStreet += allInDelta; // Street bet (player's actual bet)
      player.chips = 0;
      gameState.pot += allInDelta;
      player.status = 'ALL_IN';
      player.allInAmount = allInDelta;
      
      // Validate chip conservation after chip movement
      if (validateChipConservation) {
        validateChipConservation(gameState, gameState.startingTotalChips);
      }
      
      // ARCHITECTURAL FIX: Set currentBet to maxMatchableBet (not newBetThisStreet)
      // This ensures other players can only call up to what they can match
      if (newBetThisStreet > currentBet) {
        // All-in creates a raise - set currentBet to what others can match
        gameState.currentBet = maxMatchableBet;
        const raisePortion = maxMatchableBet - currentBet;
        const lastRaiseSize = gameState.lastRaiseSize || 0;
        const bigBlind = gameState.bigBlind || 10;
        const minRaiseSize = lastRaiseSize || bigBlind;
        const isFullRaise = raisePortion >= minRaiseSize;
        
        // Only update lastRaiseSize and lastAggressor if full raise
        if (isFullRaise) {
          gameState.lastRaiseSize = raisePortion;
          gameState.lastAggressor = player.userId;
          gameState.reopensAction = true;
          console.log(`🚀 [BETTING] Full all-in raise: ${player.userId.substr(0, 8)} all-in ${allInDelta}, currentBet capped at ${maxMatchableBet} (others can match)`);
        } else {
          // Short all-in - doesn't reopen
          gameState.reopensAction = false;
          console.log(`💰 [BETTING] Short all-in raise: ${player.userId.substr(0, 8)} all-in ${allInDelta}, currentBet capped at ${maxMatchableBet} (raise size: ${raisePortion} < min: ${minRaiseSize})`);
        }
      } else {
        // All-in call (partial or full) - doesn't reopen
        gameState.reopensAction = false;
        console.log(`💰 [BETTING] All-in call: ${player.userId.substr(0, 8)} called ${allInDelta} (total bet: ${newBetThisStreet})`);
      }
      break;
    }
  }

  // FIX: Increment action sequence (monotonic counter for idempotency)
  if (gameState.actionSeq === undefined) {
    gameState.actionSeq = 0;
  }
  gameState.actionSeq++;
  
  // Record action in history
  if (!gameState.actionHistory) {
    gameState.actionHistory = [];
  }
  
  gameState.actionHistory.push({
    seq: gameState.actionSeq, // Store sequence number with action
    userId: player.userId,
    seatIndex: player.seatIndex,
    action,
    amount: amount || 0,
    timestamp: Date.now(),
    street: gameState.street
  });

  return gameState;
}

module.exports = {
  validateAction,
  applyAction
};

