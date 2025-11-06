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
    if (this.isBettingRoundComplete(updatedState)) {
      this.progressToNextStreet(updatedState);
    } else {
      // Just rotate turn
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
        if (callAmount > playerChips) {
          return { isValid: false, error: 'Not enough chips to call (go all-in instead)' };
        }
        return { isValid: true };

      case 'RAISE':
        const totalBet = amount;
        const raiseAmount = totalBet - playerBet;
        
        if (totalBet <= currentBet) {
          return { isValid: false, error: 'Raise must be higher than current bet' };
        }
        
        const minRaise = currentBet * 2; // Minimum raise = double current bet
        if (totalBet < minRaise && raiseAmount < playerChips) {
          return { isValid: false, error: `Minimum raise is ${minRaise}` };
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
   * Based on BettingEngine.applyAction()
   */
  static applyAction(gameState, player, action, amount) {
    const playerBet = player.bet || 0;
    const playerChips = player.chips || 0;

    switch (action) {
      case 'FOLD':
        player.folded = true;
        player.status = 'FOLDED';
        break;

      case 'CHECK':
        // No state change, just log
        break;

      case 'CALL':
        const callAmount = gameState.currentBet - playerBet;
        player.bet = gameState.currentBet;
        player.chips -= callAmount;
        gameState.pot += callAmount;
        break;

      case 'RAISE':
        const raiseAmount = amount - playerBet;
        player.bet = amount;
        player.chips -= raiseAmount;
        gameState.pot += raiseAmount;
        gameState.currentBet = amount;
        break;

      case 'ALL_IN':
        const allInAmount = playerChips;
        player.bet += allInAmount;
        player.chips = 0;
        gameState.pot += allInAmount;
        if (player.bet > gameState.currentBet) {
          gameState.currentBet = player.bet;
        }
        player.status = 'ALL_IN';
        break;
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
   * CHECK IF BETTING ROUND COMPLETE
   * Based on RoundManager.isBettingRoundComplete()
   */
  static isBettingRoundComplete(gameState) {
    const activePlayers = gameState.players.filter(p => !p.folded && p.status !== 'ALL_IN');
    
    // If only 1 active player left, betting is done
    if (activePlayers.length <= 1) {
      return true;
    }

    // Check if all active players have acted and matched the current bet
    const allMatched = activePlayers.every(p => p.bet === gameState.currentBet);
    
    // Check if all players have acted this street
    // NEW LOGIC: Count unique userId actions this street
    const actionsThisStreet = (gameState.actionHistory || []).filter(
      a => a.street === gameState.street
    );
    
    const playersWhoActed = new Set(actionsThisStreet.map(a => a.userId));
    const allActed = activePlayers.every(p => playersWhoActed.has(p.userId));

    console.log('🔍 Betting round check:', {
      street: gameState.street,
      activePlayers: activePlayers.length,
      playersWhoActed: playersWhoActed.size,
      allMatched,
      allActed,
      currentBet: gameState.currentBet,
      playerBets: activePlayers.map(p => ({ seat: p.seatIndex, bet: p.bet }))
    });

    return allMatched && allActed;
  }

  /**
   * PROGRESS TO NEXT STREET
   * Based on RoundManager.advanceStreet()
   */
  static progressToNextStreet(gameState) {
    const streetOrder = ['PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'];
    const currentIndex = streetOrder.indexOf(gameState.street);
    
    if (currentIndex === -1 || currentIndex >= streetOrder.length - 1) {
      // End of hand - go to showdown
      console.log('🏆 End of hand, going to showdown');
      this.handleShowdown(gameState);
      return;
    }

    const nextStreet = streetOrder[currentIndex + 1];
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
    gameState.players.forEach(p => {
      if (!p.folded && p.status !== 'ALL_IN') {
        p.bet = 0;
      }
    });
    gameState.currentBet = 0;

    // First to act: first active player after dealer
    this.resetToFirstActor(gameState);
  }

  /**
   * ROTATE TO NEXT ACTIVE PLAYER
   * Based on TurnManager.rotateToNext()
   */
  static rotateToNextPlayer(gameState) {
    const players = gameState.players;
    const currentIndex = players.findIndex(p => p.seatIndex === gameState.currentActorSeat);
    
    let nextIndex = (currentIndex + 1) % players.length;
    let attempts = 0;
    
    // Find next active player
    while (attempts < players.length) {
      const nextPlayer = players[nextIndex];
      if (!nextPlayer.folded && nextPlayer.status !== 'ALL_IN') {
        gameState.currentActorSeat = nextPlayer.seatIndex;
        return;
      }
      nextIndex = (nextIndex + 1) % players.length;
      attempts++;
    }
    
    // No active players - end round
    this.progressToNextStreet(gameState);
  }

  /**
   * RESET TO FIRST ACTOR (after street change)
   */
  static resetToFirstActor(gameState) {
    // First to act is first active player after dealer
    const dealerIndex = gameState.players.findIndex(p => p.seatIndex === gameState.dealerPosition);
    
    let nextIndex = (dealerIndex + 1) % gameState.players.length;
    let attempts = 0;
    
    while (attempts < gameState.players.length) {
      const player = gameState.players[nextIndex];
      if (!player.folded && player.status !== 'ALL_IN') {
        gameState.currentActorSeat = player.seatIndex;
        return;
      }
      nextIndex = (nextIndex + 1) % gameState.players.length;
      attempts++;
    }
  }

  /**
   * HANDLE FOLD WIN
   * When all players fold except one
   */
  static handleFoldWin(gameState, winner) {
    console.log(`🏆 [FOLD WIN] Player ${winner.userId.substr(0, 8)} (Seat ${winner.seatIndex}) wins $${gameState.pot} by fold`);
    
    // Award pot to winner
    winner.chips += gameState.pot;
    
    // Set winner info
    gameState.winners = [{
      userId: winner.userId,
      seatIndex: winner.seatIndex,
      amount: gameState.pot,
      handDescription: 'Win by fold'
    }];
    
    // Mark hand as complete
    gameState.pot = 0;
    gameState.status = 'COMPLETED';
    gameState.street = 'SHOWDOWN'; // Set to showdown so UI knows hand is over
    
    console.log('✅ [FOLD WIN] Hand complete');
  }

  /**
   * HANDLE SHOWDOWN
   * Uses production HandEvaluator
   */
  static handleShowdown(gameState) {
    console.log('🏆 [GAME] SHOWDOWN - Evaluating hands');
    console.log('   Community cards:', gameState.communityCards);
    
    gameState.street = 'SHOWDOWN';
    
    // Get all players who didn't fold
    const showdownPlayers = gameState.players.filter(p => !p.folded);
    
    if (showdownPlayers.length === 1) {
      // Only one player left - they win
      const winner = showdownPlayers[0];
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

    // Use SIMPLE WORKING hand evaluator
    const { evaluatePokerHand, compareHands } = require('./simple-hand-evaluator');
    
    const playerHands = [];
    
    console.log(`🔍 [GAME] Evaluating ${showdownPlayers.length} players`);
    
    // Evaluate each player's hand
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
      console.error('❌ No valid hands to evaluate - splitting pot');
      const potShare = Math.floor(gameState.pot / showdownPlayers.length);
      
      showdownPlayers.forEach(player => {
        player.chips += potShare;
      });
      
      gameState.winners = showdownPlayers.map(p => ({
        userId: p.userId,
        seatIndex: p.seatIndex,
        amount: potShare,
        handDescription: 'No valid hands'
      }));
      
      gameState.pot = 0;
      gameState.status = 'COMPLETED';
      return;
    }
    
    // Sort by hand strength (best first)
    playerHands.sort((a, b) => compareHands(a.handEval, b.handEval));
    
    // Find winners (players with the best hand)
    const bestHand = playerHands[0];
    const winners = playerHands.filter(hand => 
      compareHands(hand.handEval, bestHand.handEval) === 0
    );
    
    console.log(`🏆 [GAME] Winner(s): ${winners.length === 1 ? 'Single winner' : `${winners.length}-way tie`}`);
    winners.forEach(w => {
      console.log(`   ${w.player.userId.substr(0, 8)} (Seat ${w.player.seatIndex}): ${w.description}`);
    });
    
    // ✅ CAPTURE POT BEFORE DISTRIBUTION (for data extraction)
    const finalPotSize = gameState.pot;
    
    // Split pot among winners
    const potShare = Math.floor(gameState.pot / winners.length);
    
    gameState.winners = winners.map(winner => {
      winner.player.chips += potShare;
      
      return {
        userId: winner.player.userId,
        seatIndex: winner.player.seatIndex,
        amount: potShare,
        handDescription: winner.description
      };
    });
    
    // Zero pot after distribution
    gameState.pot = 0;
    
    // ✅ STORE FINAL POT SIZE FOR EXTRACTION
    gameState.finalPotSize = finalPotSize;
    
    gameState.status = 'COMPLETED';
    
    console.log('✅ [GAME] Showdown complete, chips awarded');
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

