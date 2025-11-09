/**
 * MINIMAL ENGINE BRIDGE
 * 
 * Purpose: Use production engine logic with sandbox JSONB format
 * Strategy: Thin adapter - call engine methods, keep JSONB storage
 * 
 * This avoids:
 * - Building throwaway logic
 * - Full class conversion overhead
 * - Technical debt accumulation
 */

/**
 * BETTING ENGINE ADAPTER
 * Uses production betting logic with minimal state conversion
 */
class MinimalBettingAdapter {
  /**
   * Process a player action using production engine logic
   * @param {Object} gameState - Sandbox JSONB format
   * @param {string} userId - Player making action
   * @param {string} action - 'FOLD', 'CALL', 'RAISE', etc.
   * @param {number} amount - Bet amount (for RAISE)
   * @returns {Object} Updated game state + validation result
   */
  static processAction(gameState, userId, action, amount = 0) {
    // SHOWDOWN CHECK: No actions allowed during showdown!
    if (gameState.street === 'SHOWDOWN') {
      return { success: false, error: 'Hand is complete, no actions allowed' };
    }
    
    // 1. VALIDATE: Is it this player's turn?
    const player = gameState.players.find(p => p.userId === userId);
    if (!player) {
      return { success: false, error: 'Player not in hand' };
    }

    const currentSeat = gameState.players.find(p => p.seatIndex === gameState.currentActorSeat);
    if (!currentSeat || currentSeat.userId !== userId) {
      return { success: false, error: 'Not your turn' };
    }

    if (player.folded) {
      return { success: false, error: 'You have already folded' };
    }

    // 2. VALIDATE ACTION LEGALITY (production logic)
    const validation = this.validateAction(gameState, player, action, amount);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    // 3. APPLY ACTION (production logic)
    const updatedState = this.applyAction(gameState, player, action, amount);

    // 3B. CHECK FOR FOLD WIN (Critical: If only 1 player left, end immediately)
    if (action === 'FOLD') {
      const activePlayers = updatedState.players.filter(p => !p.folded && p.status !== 'ALL_IN');
      
      if (activePlayers.length === 1) {
        console.log('🏆 [FOLD WIN] Only 1 player remaining, ending hand immediately');
        this.handleFoldWin(updatedState, activePlayers[0]);
        return { success: true, gameState: updatedState };
      }
    }

    // 4. CHECK BETTING ROUND COMPLETE (production logic)
    const bettingComplete = this.isBettingRoundComplete(updatedState);
    
    if (bettingComplete) {
      // Check if all players are all-in (need to deal out remaining streets)
      const activePlayers = updatedState.players.filter(p => !p.folded);
      const allInPlayers = activePlayers.filter(p => p.status === 'ALL_IN');
      
      if (allInPlayers.length === activePlayers.length && activePlayers.length > 1) {
        // ALL PLAYERS ALL-IN - Deal out all remaining streets immediately
        console.log(`🃏 ALL PLAYERS ALL-IN (${allInPlayers.length} players) - Dealing out remaining streets`);
        this.handleAllInRunout(updatedState);
      } else {
        console.log('✅ Betting round complete, advancing street');
        this.progressToNextStreet(updatedState);
      }
    } else {
      // Just rotate turn
      console.log('🔄 Betting round not complete, rotating to next player');
      this.rotateToNextPlayer(updatedState);
    }

    return { success: true, gameState: updatedState };
  }

  /**
   * PRODUCTION BETTING VALIDATION
   * Based on BettingEngine.validateAction()
   */
  static validateAction(gameState, player, action, amount) {
    const { currentBet, pot } = gameState;
    const playerBet = player.bet || 0;
    const playerChips = player.chips || 0;

    switch (action) {
      case 'FOLD':
        return { isValid: true };

      case 'CHECK':
        if (playerBet < currentBet) {
          return { isValid: false, error: 'Cannot check - must call or raise' };
        }
        return { isValid: true };

      case 'CALL':
        const callAmount = currentBet - playerBet;
        // Allow partial all-in calls (player can call with remaining chips)
        if (callAmount > playerChips && playerChips > 0) {
          // This will be handled as a partial all-in call in applyAction
          return { isValid: true };
        }
        if (callAmount === 0) {
          return { isValid: false, error: 'Already matched bet - check instead' };
        }
        return { isValid: true };

      case 'RAISE':
        const totalBet = amount;
        const raiseAmount = totalBet - playerBet;
        
        if (totalBet <= currentBet) {
          return { isValid: false, error: 'Raise must be higher than current bet' };
        }
        
        // FIX: Min raise = currentBet + last raise amount (or big blind if no previous raise)
        // For MVP, use double current bet, but track minRaise properly
        const lastRaiseAmount = gameState.minRaise || (currentBet || 0);
        const minRaise = currentBet + lastRaiseAmount;
        
        if (totalBet < minRaise && raiseAmount < playerChips) {
          return { isValid: false, error: `Minimum raise is ${minRaise} (current bet ${currentBet} + raise ${lastRaiseAmount})` };
        }
        
        if (raiseAmount > playerChips) {
          return { isValid: false, error: 'Not enough chips (go all-in instead)' };
        }
        
        return { isValid: true };

      case 'ALL_IN':
        return { isValid: true };

      default:
        return { isValid: false, error: `Unknown action: ${action}` };
    }
  }

  /**
   * APPLY ACTION TO STATE
   * FIXED: Proper all-in handling, partial all-ins, bet calculation
   */
  static applyAction(gameState, player, action, amount) {
    const playerBet = player.bet || 0;
    const playerChips = player.chips || 0;
    const currentBet = gameState.currentBet || 0;

    switch (action) {
      case 'FOLD':
        player.folded = true;
        player.status = 'FOLDED';
        break;

      case 'CHECK':
        // No state change, just log
        break;

      case 'CALL': {
        // FIX: Handle partial all-in calls
        const callAmount = Math.min(currentBet - playerBet, playerChips);
        const totalBetAfterCall = playerBet + callAmount;
        
        // Track street bet separately
        const currentBetThisStreet = player.betThisStreet || 0;
        const callAmountThisStreet = callAmount; // All of call is on current street
        
        player.bet = totalBetAfterCall; // Cumulative bet
        player.betThisStreet = currentBetThisStreet + callAmountThisStreet; // Street bet
        player.chips -= callAmount;
        gameState.pot += callAmount;
        
        // Mark as all-in if chips exhausted
        if (player.chips === 0) {
          player.status = 'ALL_IN';
          player.allInAmount = callAmount;
          if (totalBetAfterCall < currentBet) {
            console.log(`💰 Partial all-in call: ${player.userId.substr(0, 8)} called ${callAmount} (needed ${currentBet - playerBet})`);
          } else {
            console.log(`💰 Full all-in call: ${player.userId.substr(0, 8)} called ${callAmount}`);
          }
        }
        break;
      }

      case 'RAISE': {
        const raiseAmount = amount - playerBet;
        if (raiseAmount > playerChips) {
          // Should have been caught in validation, but handle gracefully
          console.warn(`⚠️ Raise amount ${raiseAmount} exceeds chips ${playerChips}, treating as all-in`);
          // Fall through to ALL_IN logic
          const allInAmountRaise = playerChips;
          const totalBetAfterAllInRaise = playerBet + allInAmountRaise;
          const currentBetThisStreetRaise = player.betThisStreet || 0;
          const raiseAmountThisStreetRaise = allInAmountRaise; // All chips go to this street
          
          player.bet = totalBetAfterAllInRaise; // Cumulative bet
          player.betThisStreet = currentBetThisStreetRaise + raiseAmountThisStreetRaise; // Street bet
          player.chips = 0;
          gameState.pot += allInAmountRaise;
          player.status = 'ALL_IN';
          player.allInAmount = allInAmountRaise;
          
          if (totalBetAfterAllInRaise > currentBet) {
            gameState.currentBet = totalBetAfterAllInRaise;
            const previousBet = currentBet;
            gameState.minRaise = totalBetAfterAllInRaise - previousBet;
            console.log(`🚀 All-in raise: ${player.userId.substr(0, 8)} raised to ${totalBetAfterAllInRaise}`);
          }
        } else {
          const currentBetThisStreetRaise = player.betThisStreet || 0;
          const raiseAmountThisStreetRaise = raiseAmount; // Raise is on current street
          
          player.bet = amount; // Cumulative bet
          player.betThisStreet = currentBetThisStreetRaise + raiseAmountThisStreetRaise; // Street bet
          player.chips -= raiseAmount;
          gameState.pot += raiseAmount;
          gameState.currentBet = amount;
          
          // Update min raise (size of THIS raise)
          const previousBet = currentBet;
          gameState.minRaise = amount - previousBet;
          
          if (player.chips === 0) {
            player.status = 'ALL_IN';
            player.allInAmount = raiseAmount;
          }
        }
        break;
      }

      case 'ALL_IN': {
        // FIX: Correct all-in bet calculation - SET total bet, don't ADD
        const allInAmountFinal = playerChips;
        const totalBetAfterAllInFinal = playerBet + allInAmountFinal;
        const currentBetThisStreetFinal = player.betThisStreet || 0;
        const allInAmountThisStreetFinal = allInAmountFinal; // All chips go to this street
        
        // Move all chips to bet
        player.bet = totalBetAfterAllInFinal; // Cumulative bet
        player.betThisStreet = currentBetThisStreetFinal + allInAmountThisStreetFinal; // Street bet
        player.chips = 0;
        gameState.pot += allInAmountFinal;
        player.status = 'ALL_IN';
        player.allInAmount = allInAmountFinal;
        
        // If all-in creates a raise, update currentBet and minRaise
        if (totalBetAfterAllInFinal > currentBet) {
          gameState.currentBet = totalBetAfterAllInFinal;
          const previousBet = currentBet;
          gameState.minRaise = totalBetAfterAllInFinal - previousBet;
          console.log(`🚀 All-in raise: ${player.userId.substr(0, 8)} raised to ${totalBetAfterAllInFinal}`);
        } else {
          // All-in call (partial or full)
          console.log(`💰 All-in call: ${player.userId.substr(0, 8)} called ${allInAmountFinal} (total bet: ${totalBetAfterAllInFinal})`);
        }
        break;
      }
    }

    // Record action in history
    if (!gameState.actionHistory) {
      gameState.actionHistory = [];
    }
    
    gameState.actionHistory.push({
      userId: player.userId,
      seatIndex: player.seatIndex,
      action,
      amount: amount || 0,
      timestamp: Date.now(),
      street: gameState.street
    });

    return gameState;
  }

  /**
   * CHECK IF PLAYER CAN ACT
   * FIX: Proper action eligibility with partial all-ins
   */
  static canPlayerAct(gameState, player) {
    if (player.folded) return false;
    if (player.chips > 0) return true;
    
    // Partial all-in: can still "act" (their all-in is their action, but betting may continue)
    if (player.chips === 0 && player.bet < (gameState.currentBet || 0)) {
      return true; // They've acted (all-in), but others may still need to act
    }
    
    return false;
  }

  /**
   * GET LAST AGGRESSOR
   * Track last player to raise for betting round completion
   * FIXED: Properly detect raises by comparing bet amounts before/after action
   */
  static getLastAggressor(gameState) {
    const actionsThisStreet = (gameState.actionHistory || []).filter(
      a => a.street === gameState.street && (a.action === 'RAISE' || a.action === 'ALL_IN')
    );
    
    if (actionsThisStreet.length === 0) return null;
    
    // Find the action that created the highest currentBet
    // We need to track what the bet was before each action
    let maxBet = 0;
    let lastAggressor = null;
    
    // Reconstruct betting history to find last raise
    for (let i = actionsThisStreet.length - 1; i >= 0; i--) {
      const action = actionsThisStreet[i];
      const player = gameState.players.find(p => p.userId === action.userId);
      
      if (player && (action.action === 'RAISE' || action.action === 'ALL_IN')) {
        // Check if this action raised the bet
        if (player.bet > maxBet) {
          maxBet = player.bet;
          lastAggressor = action.userId;
        }
      }
    }
    
    return lastAggressor;
  }

  /**
   * CHECK IF BETTING ROUND COMPLETE
   * FIXED: Handle partial all-ins, last aggressor, proper completion logic
   */
  static isBettingRoundComplete(gameState) {
    const allActivePlayers = gameState.players.filter(p => !p.folded);
    
    // If only 1 active player left (others folded), betting is done
    if (allActivePlayers.length <= 1) {
      return true;
    }
    
    // Get players who can still act (have chips OR partial all-in)
    const playersWhoCanAct = allActivePlayers.filter(p => this.canPlayerAct(gameState, p));
    
    // If no one can act, check if we need all-in runout
    if (playersWhoCanAct.length === 0) {
      const allInPlayers = allActivePlayers.filter(p => p.status === 'ALL_IN');
      // All-in runout: All active players are all-in (partial or full)
      // This handles: full all-ins, partial all-ins, and mixed scenarios
      if (allInPlayers.length === allActivePlayers.length && allActivePlayers.length > 1) {
        // All players all-in - need to deal remaining streets
        console.log('✅ All players all-in - betting round complete (will runout)');
        return true;
      }
      // Everyone matched or folded (but not all all-in)
      return true;
    }
    
    // Check if all players who can act have matched the bet
    const currentBet = gameState.currentBet || 0;
    const allMatched = playersWhoCanAct.every(p => {
      // Matched if: bet equals currentBet OR all-in for less (they've done all they can)
      return p.bet === currentBet || (p.status === 'ALL_IN' && p.chips === 0);
    });
    
    // Check if all players who can act have acted this street
    const actionsThisStreet = (gameState.actionHistory || []).filter(
      a => a.street === gameState.street
    );
    const playersWhoActed = new Set(actionsThisStreet.map(a => a.userId));
    const allActed = playersWhoCanAct.every(p => playersWhoActed.has(p.userId));
    
    // Special case: If action has returned to the last aggressor and all matched
    const lastAggressor = this.getLastAggressor(gameState);
    if (lastAggressor && allMatched) {
      const aggressor = allActivePlayers.find(p => p.userId === lastAggressor);
      if (aggressor && aggressor.bet === currentBet) {
        console.log('✅ Action returned to last aggressor, betting round complete');
        return true;
      }
    }
    
    // Special case: On RIVER, if all bets are 0 and all players have acted, force completion
    if (gameState.street === 'RIVER' && currentBet === 0 && allMatched && allActed) {
      console.log('✅ RIVER complete: All players acted and bets matched');
      return true;
    }

    console.log('🔍 Betting round check:', {
      street: gameState.street,
      playersWhoCanAct: playersWhoCanAct.length,
      playersWhoActed: playersWhoActed.size,
      allMatched,
      allActed,
      currentBet,
      lastAggressor: lastAggressor ? lastAggressor.substr(0, 8) : null,
      playerBets: playersWhoCanAct.map(p => ({ 
        seat: p.seatIndex, 
        bet: p.bet, 
        chips: p.chips,
        status: p.status,
        userId: p.userId.substr(0, 8) 
      }))
    });

    return allMatched && allActed;
  }

  /**
   * HANDLE ALL-IN RUNOUT
   * When all players are all-in, deal out all remaining streets to showdown
   * FIXED: Works with side pots - bets stay, just deal cards
   */
  static handleAllInRunout(gameState) {
    console.log('🃏 [ALL-IN RUNOUT] Dealing out remaining streets');
    console.log('   Current street:', gameState.street);
    console.log('   Current board:', gameState.communityCards || []);
    
    const streetOrder = ['PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'];
    const currentIndex = streetOrder.indexOf(gameState.street);
    
    // Deal out all remaining streets based on current street
    if (currentIndex < 1) {
      // Preflop - deal flop, turn, river
      console.log('  Dealing: FLOP, TURN, RIVER');
      if (!gameState.communityCards) gameState.communityCards = [];
      
      // Burn card, then flop (3 cards)
      gameState.deck.pop(); // burn
      gameState.communityCards = [
        gameState.deck.pop(),
        gameState.deck.pop(),
        gameState.deck.pop()
      ];
      gameState.street = 'FLOP';
      
      // Burn card, then turn
      gameState.deck.pop(); // burn
      gameState.communityCards.push(gameState.deck.pop());
      gameState.street = 'TURN';
      
      // Burn card, then river
      gameState.deck.pop(); // burn
      gameState.communityCards.push(gameState.deck.pop());
      gameState.street = 'RIVER';
    } else if (currentIndex === 1) {
      // Flop - deal turn, river
      console.log('  Dealing: TURN, RIVER');
      if (!gameState.communityCards) gameState.communityCards = [];
      
      // Burn card, then turn
      gameState.deck.pop(); // burn
      gameState.communityCards.push(gameState.deck.pop());
      gameState.street = 'TURN';
      
      // Burn card, then river
      gameState.deck.pop(); // burn
      gameState.communityCards.push(gameState.deck.pop());
      gameState.street = 'RIVER';
    } else if (currentIndex === 2) {
      // Turn - deal river
      console.log('  Dealing: RIVER');
      if (!gameState.communityCards) gameState.communityCards = [];
      
      // Burn card, then river
      gameState.deck.pop(); // burn
      gameState.communityCards.push(gameState.deck.pop());
      gameState.street = 'RIVER';
    }
    
    // IMPORTANT: Don't reset bets - they're needed for side pot calculation
    // All players are all-in, so currentBet can be set to 0 for display
    gameState.currentBet = 0;
    
    // Go directly to showdown (side pots will be calculated there)
    console.log('  Final board:', gameState.communityCards.join(', '));
    console.log('  Player bets (for side pots):', gameState.players.filter(p => !p.folded).map(p => ({
      seat: p.seatIndex,
      bet: p.bet,
      userId: p.userId.substr(0, 8)
    })));
    
    this.handleShowdown(gameState);
  }

  /**
   * PROGRESS TO NEXT STREET
   * Based on RoundManager.advanceStreet()
   */
  static progressToNextStreet(gameState) {
    const streetOrder = ['PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'];
    const currentIndex = streetOrder.indexOf(gameState.street);
    
    console.log(`🔄 Progressing street: ${gameState.street} (index ${currentIndex})`);
    
    // CRITICAL FIX: If we're already on RIVER, go directly to SHOWDOWN
    if (gameState.street === 'RIVER') {
      console.log('🏆 Already on RIVER, going directly to SHOWDOWN');
      this.handleShowdown(gameState);
      return;
    }
    
    if (currentIndex === -1 || currentIndex >= streetOrder.length - 1) {
      // End of hand - go to showdown
      console.log('🏆 End of hand, going to showdown');
      this.handleShowdown(gameState);
      return;
    }

    const nextStreet = streetOrder[currentIndex + 1];
    console.log(`📈 Advancing to ${nextStreet}`);
    gameState.street = nextStreet;

    // CRITICAL: If next street is SHOWDOWN, handle it immediately
    if (nextStreet === 'SHOWDOWN') {
      console.log('🏆 Reached SHOWDOWN after RIVER, evaluating hands');
      this.handleShowdown(gameState);
      return;
    }

    // Deal community cards
    switch (nextStreet) {
      case 'FLOP':
        // Deal 3 cards from deck
        gameState.communityCards = [
          gameState.deck.pop(),
          gameState.deck.pop(),
          gameState.deck.pop()
        ];
        break;
      case 'TURN':
        // Deal 1 card
        gameState.communityCards.push(gameState.deck.pop());
        break;
      case 'RIVER':
        // Deal 1 card
        gameState.communityCards.push(gameState.deck.pop());
        break;
    }

    // Reset bets for new round
    // CRITICAL: Roll betThisStreet into cumulative bet, then reset betThisStreet
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

    // First to act: first active player after dealer
    this.resetToFirstActor(gameState);
  }

  /**
   * ROTATE TO NEXT ACTIVE PLAYER
   * FIXED: Use canPlayerAct to properly skip all-ins
   */
  static rotateToNextPlayer(gameState) {
    const players = gameState.players;
    const currentIndex = players.findIndex(p => p.seatIndex === gameState.currentActorSeat);
    
    let nextIndex = (currentIndex + 1) % players.length;
    let attempts = 0;
    
    // Find next player who can act
    while (attempts < players.length) {
      const nextPlayer = players[nextIndex];
      
      // Can act if: not folded AND (has chips OR partial all-in)
      if (!nextPlayer.folded && this.canPlayerAct(gameState, nextPlayer)) {
        gameState.currentActorSeat = nextPlayer.seatIndex;
        return;
      }
      
      nextIndex = (nextIndex + 1) % players.length;
      attempts++;
    }
    
    // No one can act - advance street
    this.progressToNextStreet(gameState);
  }

  /**
   * RESET TO FIRST ACTOR (after street change)
   * FIXED: Use canPlayerAct to properly find first actor
   */
  static resetToFirstActor(gameState) {
    // First to act is first active player after dealer
    const dealerIndex = gameState.players.findIndex(p => p.seatIndex === gameState.dealerPosition);
    
    let nextIndex = (dealerIndex + 1) % gameState.players.length;
    let attempts = 0;
    
    while (attempts < gameState.players.length) {
      const player = gameState.players[nextIndex];
      
      // Can act if: not folded AND (has chips OR partial all-in)
      if (!player.folded && this.canPlayerAct(gameState, player)) {
        gameState.currentActorSeat = player.seatIndex;
        return;
      }
      
      nextIndex = (nextIndex + 1) % gameState.players.length;
      attempts++;
    }
    
    // No one can act - should not happen, but handle gracefully
    console.warn('⚠️ No players can act after street change');
  }

  /**
   * HANDLE FOLD WIN
   * When all players fold except one
   * FIXED: Handle uncalled bets before awarding pot
   */
  static handleFoldWin(gameState, winner) {
    console.log(`🏆 [FOLD WIN] Player ${winner.userId.substr(0, 8)} (Seat ${winner.seatIndex}) wins by fold`);
    
    // Handle uncalled bets first (return excess to winner if they had highest bet)
    this.handleUncalledBets(gameState);
    
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
    
    // Mark hand as complete
    gameState.pot = 0;
    gameState.status = 'COMPLETED';
    gameState.street = 'SHOWDOWN'; // Set to showdown so UI knows hand is over
    
    console.log(`✅ [FOLD WIN] Hand complete - ${winner.userId.substr(0, 8)} wins $${potAmount}`);
  }

  /**
   * CALCULATE SIDE POTS
   * Creates side pots from different bet amounts
   */
  static calculateSidePots(gameState) {
    const activePlayers = gameState.players.filter(p => !p.folded);
    
    if (activePlayers.length === 0) {
      return [];
    }
    
    // Get all unique bet amounts (sorted ascending)
    const betAmounts = [...new Set(activePlayers.map(p => p.bet || 0))].sort((a, b) => a - b);
    
    const pots = [];
    let previousLevel = 0;
    
    // Create a pot for each bet level
    for (const potLevel of betAmounts) {
      const potSize = (potLevel - previousLevel) * activePlayers.filter(p => (p.bet || 0) >= potLevel).length;
      
      if (potSize > 0) {
        // Eligible players are those who bet at least this amount
        const eligiblePlayers = activePlayers.filter(p => (p.bet || 0) >= potLevel);
        
        pots.push({
          amount: potSize,
          level: potLevel,
          previousLevel: previousLevel,
          eligiblePlayerIds: eligiblePlayers.map(p => p.userId),
          eligibleSeats: eligiblePlayers.map(p => p.seatIndex)
        });
      }
      
      previousLevel = potLevel;
    }
    
    console.log('💰 Side pots calculated:', pots.map(p => ({
      amount: p.amount,
      level: p.level,
      eligible: p.eligiblePlayerIds.length,
      eligibleSeats: p.eligibleSeats
    })));
    
    return pots;
  }

  /**
   * HANDLE UNCALLED BETS
   * Return excess chips to bettor when others fold
   * FIXED: Uses betThisStreet to correctly calculate uncalled bets on current street
   */
  static handleUncalledBets(gameState) {
    const activePlayers = gameState.players.filter(p => !p.folded);
    
    if (activePlayers.length <= 1) {
      // Only one player left - they may have uncalled bet THIS STREET
      const remainingPlayer = activePlayers[0];
      if (remainingPlayer && remainingPlayer.betThisStreet > 0) {
        // Find what others matched THIS STREET before folding
        const allPlayers = gameState.players;
        const maxMatchedBetThisStreet = Math.max(...allPlayers
          .filter(p => p.userId !== remainingPlayer.userId)
          .map(p => p.betThisStreet || 0), 0);
        
        if (remainingPlayer.betThisStreet > maxMatchedBetThisStreet) {
          const uncalledAmount = remainingPlayer.betThisStreet - maxMatchedBetThisStreet;
          remainingPlayer.chips += uncalledAmount;
          remainingPlayer.bet -= uncalledAmount; // Reduce cumulative bet
          remainingPlayer.betThisStreet -= uncalledAmount; // Reduce street bet
          gameState.pot -= uncalledAmount;
          console.log(`💰 Uncalled bet: Returning $${uncalledAmount} to ${remainingPlayer.userId.substr(0, 8)}`);
        }
      }
      return;
    }
    
    // Multiple players - check for uncalled bets THIS STREET
    const maxBetThisStreet = Math.max(...activePlayers.map(p => p.betThisStreet || 0));
    const highestBettors = activePlayers.filter(p => (p.betThisStreet || 0) === maxBetThisStreet);
    
    if (highestBettors.length === 1) {
      const highestBettor = highestBettors[0];
      const secondHighestBetThisStreet = Math.max(...activePlayers
        .filter(p => p.userId !== highestBettor.userId)
        .map(p => p.betThisStreet || 0), 0);
      
      if (maxBetThisStreet > secondHighestBetThisStreet) {
        const uncalledAmount = maxBetThisStreet - secondHighestBetThisStreet;
        highestBettor.chips += uncalledAmount;
        highestBettor.bet -= uncalledAmount; // Reduce cumulative bet
        highestBettor.betThisStreet -= uncalledAmount; // Reduce street bet
        gameState.pot -= uncalledAmount;
        console.log(`💰 Uncalled bet: Returning $${uncalledAmount} to ${highestBettor.userId.substr(0, 8)}`);
      }
    }
  }

  /**
   * DISTRIBUTE POTS WITH SIDE POT LOGIC
   * Handles side pots, odd chip rule, and proper winner determination
   */
  static distributePots(gameState, playerHands, dealerPosition) {
    const pots = this.calculateSidePots(gameState);
    const distributions = [];
    
    if (pots.length === 0) {
      console.warn('⚠️ No side pots calculated');
      return distributions;
    }
    
    // Evaluate hands for each pot
    for (const pot of pots) {
      // Get eligible players for this pot
      const eligiblePlayers = playerHands.filter(ph => 
        pot.eligiblePlayerIds.includes(ph.player.userId)
      );
      
      if (eligiblePlayers.length === 0) {
        console.warn(`⚠️ No eligible players for pot level ${pot.level}`);
        continue;
      }
      
      // Find best hand(s) among eligible players
      const { compareHands } = require('./simple-hand-evaluator');
      
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
      
      // ODD CHIP RULE: Leftover chips go to player closest to left of dealer
      const winnerSeats = winners.map(w => w.player.seatIndex).sort((a, b) => {
        // Calculate distance from dealer (wrapping around)
        const distA = (a - dealerPosition + gameState.players.length) % gameState.players.length;
        const distB = (b - dealerPosition + gameState.players.length) % gameState.players.length;
        return distA - distB;
      });
      
      winners.forEach((winner, index) => {
        const amount = shareAmount + (index < remainder ? 1 : 0);
        
        if (amount > 0) {
          winner.player.chips += amount;
          distributions.push({
            userId: winner.player.userId,
            seatIndex: winner.player.seatIndex,
            amount: amount,
            potLevel: pot.level,
            handDescription: winner.handEval.name
          });
          
          console.log(`💰 Pot ${pot.level}: ${winner.player.userId.substr(0, 8)} wins $${amount} (${winner.handEval.name})`);
        }
      });
    }
    
    return distributions;
  }

  /**
   * HANDLE SHOWDOWN
   * FIXED: Uses side pot distribution, handles uncalled bets, odd chip rule
   */
  static handleShowdown(gameState) {
    console.log('🏆 [SHOWDOWN] Starting with side pot calculation');
    console.log('   Community cards:', gameState.communityCards);
    
    // CRITICAL: Capture snapshot BEFORE any mutations for accurate extraction
    // This ensures pot size, chip counts, and bets are preserved for hand history
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
    
    gameState.street = 'SHOWDOWN';
    
    // Get all players who didn't fold
    const showdownPlayers = gameState.players.filter(p => !p.folded);
    
    if (showdownPlayers.length === 1) {
      // Only one player - they win everything (after uncalled bet handling)
      const winner = showdownPlayers[0];
      
      // Handle uncalled bets first
      this.handleUncalledBets(gameState);
      
      winner.chips += gameState.pot;
      
      gameState.winners = [{
        userId: winner.userId,
        seatIndex: winner.seatIndex,
        amount: gameState.pot,
        handDescription: 'Last player standing'
      }];
      
      gameState.pot = 0;
      gameState.status = 'COMPLETED';
      console.log('✅ [GAME] Winner (last standing):', winner.userId.substr(0, 8));
      return;
    }
    
    // Handle uncalled bets first (before side pot calculation)
    this.handleUncalledBets(gameState);
    
    // Evaluate all hands
    const { evaluatePokerHand } = require('./simple-hand-evaluator');
    const playerHands = [];
    
    console.log(`🔍 [GAME] Evaluating ${showdownPlayers.length} players`);
    
    for (const player of showdownPlayers) {
      console.log(`   Player ${player.userId.substr(0, 8)} (Seat ${player.seatIndex}):`, player.holeCards);
      
      if (player.holeCards && player.holeCards.length === 2 && gameState.communityCards.length === 5) {
        const handEval = evaluatePokerHand(player.holeCards, gameState.communityCards);
        
        console.log(`   → ${handEval.name}`);
        
        playerHands.push({
          player,
          handEval,
          description: handEval.name
        });
      } else {
        console.error(`   ❌ Invalid hand: holeCards=${player.holeCards?.length}, communityCards=${gameState.communityCards.length}`);
      }
    }
    
    if (playerHands.length === 0) {
      // No valid hands - split pot evenly
      console.error('❌ No valid hands to evaluate - splitting pot');
      const potShare = Math.floor(gameState.pot / showdownPlayers.length);
      const remainder = gameState.pot % showdownPlayers.length;
      
      // Odd chip rule: distribute remainder to players closest to dealer
      const dealerPosition = gameState.dealerPosition || 0;
      const sortedPlayers = [...showdownPlayers].sort((a, b) => {
        const distA = (a.seatIndex - dealerPosition + gameState.players.length) % gameState.players.length;
        const distB = (b.seatIndex - dealerPosition + gameState.players.length) % gameState.players.length;
        return distA - distB;
      });
      
      gameState.winners = sortedPlayers.map((player, index) => {
        const amount = potShare + (index < remainder ? 1 : 0);
        player.chips += amount;
        return {
          userId: player.userId,
          seatIndex: player.seatIndex,
          amount: amount,
          handDescription: 'No valid hands'
        };
      });
      
      gameState.pot = 0;
      gameState.status = 'COMPLETED';
      return;
    }
    
    // Distribute pots with side pot logic
    const finalPotSize = gameState.pot;
    const dealerPosition = gameState.dealerPosition || 0;
    const distributions = this.distributePots(gameState, playerHands, dealerPosition);
    
    // Group distributions by player
    const winnersMap = new Map();
    distributions.forEach(d => {
      if (!winnersMap.has(d.userId)) {
        winnersMap.set(d.userId, {
          userId: d.userId,
          seatIndex: d.seatIndex,
          amount: 0,
          handDescription: d.handDescription,
          pots: []
        });
      }
      const winner = winnersMap.get(d.userId);
      winner.amount += d.amount;
      winner.pots.push({ level: d.potLevel, amount: d.amount });
    });
    
    gameState.winners = Array.from(winnersMap.values());
    gameState.finalPotSize = finalPotSize;
    gameState.pot = 0;
    gameState.status = 'COMPLETED';
    
    console.log('✅ [SHOWDOWN] Complete - Winners:', gameState.winners.map(w => ({
      userId: w.userId.substr(0, 8),
      amount: w.amount,
      pots: w.pots.length,
      hand: w.handDescription
    })));
  }
  
  /**
   * Parse card string (e.g., "Ah") to Card object
   */
  static parseCard(cardStr, CardClass) {
    const rank = cardStr.substr(0, cardStr.length - 1);
    const suitChar = cardStr.substr(-1);
    
    const Rank = require('../../dist/core/card/rank').Rank;
    const Suit = require('../../dist/core/card/suit').Suit;
    
    const rankMap = {
      '2': Rank.Two, '3': Rank.Three, '4': Rank.Four, '5': Rank.Five,
      '6': Rank.Six, '7': Rank.Seven, '8': Rank.Eight, '9': Rank.Nine,
      'T': Rank.Ten, 'J': Rank.Jack, 'Q': Rank.Queen, 'K': Rank.King, 'A': Rank.Ace
    };
    
    const suitMap = {
      'h': Suit.Hearts, 'd': Suit.Diamonds, 'c': Suit.Clubs, 's': Suit.Spades
    };
    
    return new CardClass(rankMap[rank], suitMap[suitChar]);
  }
  
  /**
   * Get human-readable hand description
   */
  static getHandDescription(handRank) {
    const HandRanking = require('../../dist/core/engine/hand-evaluator').HandRanking;
    
    const descriptions = {
      [HandRanking.HighCard]: 'High Card',
      [HandRanking.Pair]: 'Pair',
      [HandRanking.TwoPair]: 'Two Pair',
      [HandRanking.ThreeOfAKind]: 'Three of a Kind',
      [HandRanking.Straight]: 'Straight',
      [HandRanking.Flush]: 'Flush',
      [HandRanking.FullHouse]: 'Full House',
      [HandRanking.FourOfAKind]: 'Four of a Kind',
      [HandRanking.StraightFlush]: 'Straight Flush',
      [HandRanking.RoyalFlush]: 'Royal Flush'
    };
    
    return descriptions[handRank.ranking] || 'Unknown Hand';
  }
}

module.exports = { MinimalBettingAdapter };

