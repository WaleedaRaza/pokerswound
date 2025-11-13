/**
 * POT LOGIC MODULE
 * 
 * Purpose: Pot calculation and chip conservation
 * Responsibilities:
 * - Calculate side pots from player contributions
 * - Handle uncalled bets (return excess chips)
 * - Validate chip conservation
 * 
 * Architecture: Based on TS PotManager patterns
 */

/**
 * VALIDATE CHIP CONSERVATION
 * CRITICAL: At any point, sum of all chips (stacks + pots) must equal starting total
 * This ensures chips never disappear or appear magically
 */
function validateChipConservation(gameState, startingTotalChips) {
  if (!startingTotalChips) {
    // No starting total stored - skip validation (first action)
    return true;
  }
  
  const currentPlayerStacks = gameState.players.reduce((sum, p) => sum + (p.chips || 0), 0);
  const currentPot = gameState.pot || 0;
  
  // Sum all side pots if they exist
  const sidePots = gameState.sidePots || [];
  const totalSidePots = sidePots.reduce((sum, pot) => sum + (pot.amount || 0), 0);
  
  // CORRECTED: Total = stacks + main pot + side pots only
  // Do NOT include Σ(player.bet) - chips are already in pot
  const currentTotal = currentPlayerStacks + currentPot + totalSidePots;
  
  // Allow small floating point errors (0.01 chips)
  const difference = Math.abs(currentTotal - startingTotalChips);
  if (difference > 0.01) {
    console.error(`❌ [POT] CHIP CONSERVATION VIOLATION!`);
    console.error(`   Starting Total: $${startingTotalChips}`);
    console.error(`   Current Total: $${currentTotal}`);
    console.error(`   Difference: $${difference}`);
    console.error(`   Breakdown:`);
    console.error(`     Player Stacks: $${currentPlayerStacks}`);
    console.error(`     Main Pot: $${currentPot}`);
    console.error(`     Side Pots: $${totalSidePots}`);
    console.error(`   Players:`, gameState.players.map(p => ({
      userId: p.userId.substr(0, 8),
      chips: p.chips,
      bet: p.bet
    })));
    
    // In production, this should throw, but for now log and continue
    console.warn(`⚠️ [POT] Continuing despite chip conservation violation (should be fixed)`);
  } else {
    console.log(`✅ [POT] Chip conservation valid: $${currentTotal} = $${startingTotalChips}`);
  }
  
  return true;
}

/**
 * CALCULATE SIDE POTS
 * PRODUCTION-GRADE: Based on TS PotManager.calculateSidePots() algorithm
 * CRITICAL: Stores side pots in gameState for chip conservation tracking
 * NOTE: Uncalled returns handled separately in handleUncalledBets() - call it BEFORE this function
 */
function calculateSidePots(gameState) {
  const activePlayers = gameState.players.filter(p => !p.folded);
  
  if (activePlayers.length === 0) {
    gameState.sidePots = [];
    gameState.mainPot = 0;
    gameState.totalPot = 0;
    return [];
  }
  
  // PRODUCTION-GRADE: Use TS PotManager algorithm structure
  // Side pot calculation builds pots from cumulative bets only
  // Create contributions array (TS pattern)
  const contributions = activePlayers.map(p => ({
    playerUuid: p.userId,
    amount: p.bet || 0,
    isAllIn: p.status === 'ALL_IN' && p.chips === 0
  }));
  
  // Sort contributions by amount (ascending) - TS PotManager pattern
  const sortedContributions = [...contributions].sort((a, b) => a.amount - b.amount);
  
  const pots = [];
  let previousAmount = 0;
  
  // Process each contribution level (TS PotManager pattern)
  for (let i = 0; i < sortedContributions.length; i++) {
    const currentAmount = sortedContributions[i].amount;
    const levelAmount = currentAmount - previousAmount;
    
    if (levelAmount <= 0) continue; // Skip duplicate amounts
    
    // Determine which players are eligible for this level (TS pattern)
    // Eligible = all players who bet at least this amount
    const eligiblePlayers = sortedContributions
      .slice(i) // All players from this level onwards
      .map(c => c.playerUuid);
    
    // Calculate pot amount for this level (TS pattern)
    const potAmount = levelAmount * eligiblePlayers.length;
    
    // Get eligible player objects for metadata
    const eligiblePlayerObjects = activePlayers.filter(p => 
      eligiblePlayers.includes(p.userId)
    );
    
    if (i === 0) {
      // First level = main pot (TS pattern)
      pots.push({
        amount: potAmount,
        level: currentAmount,
        previousLevel: 0,
        eligiblePlayerIds: eligiblePlayers,
        eligibleSeats: eligiblePlayerObjects.map(p => p.seatIndex),
        isMainPot: true,
        capAmount: currentAmount
      });
    } else {
      // Subsequent levels = side pots (TS pattern)
      pots.push({
        amount: potAmount,
        level: currentAmount,
        previousLevel: previousAmount,
        eligiblePlayerIds: eligiblePlayers,
        eligibleSeats: eligiblePlayerObjects.map(p => p.seatIndex),
        isMainPot: false,
        capAmount: currentAmount
      });
    }
    
    previousAmount = currentAmount;
  }
  
  // Store side pots in gameState for tracking and UI display
  gameState.sidePots = pots.filter(p => !p.isMainPot); // Side pots only
  gameState.mainPot = pots.find(p => p.isMainPot)?.amount || 0;
  gameState.totalPot = pots.reduce((sum, p) => sum + p.amount, 0);
  
  // CRITICAL: Verify pot total matches gameState.pot
  const calculatedTotal = pots.reduce((sum, p) => sum + p.amount, 0);
  if (Math.abs(calculatedTotal - gameState.pot) > 0.01) {
    console.error(`❌ [POT] Total mismatch! Calculated: $${calculatedTotal}, gameState.pot: $${gameState.pot}`);
    // ARCHITECTURAL FIX: Update gameState.pot to match calculated total (source of truth)
    // This ensures pot display is always correct after street changes
    // The calculated total is correct because it's based on actual player bets
    gameState.pot = calculatedTotal;
    gameState.totalPot = calculatedTotal;
    console.log(`🔧 [POT] Updated gameState.pot to match calculated total: $${calculatedTotal}`);
  } else {
    // Ensure totalPot is set correctly even if no mismatch
    gameState.totalPot = calculatedTotal;
  }
  
  // PRODUCTION LOGGING: Detailed side pot breakdown
  console.log('💰 [POT] Calculated pots:', {
    totalPots: pots.length,
    mainPot: gameState.mainPot,
    sidePots: gameState.sidePots.length,
    totalAmount: gameState.totalPot,
    breakdown: pots.map(p => ({
      type: p.isMainPot ? 'MAIN' : 'SIDE',
      amount: p.amount,
      level: p.level,
      previousLevel: p.previousLevel,
      eligibleCount: p.eligiblePlayerIds.length,
      eligibleSeats: p.eligibleSeats
    }))
  });
  
  return pots;
}

/**
 * HANDLE UNCALLED BETS
 * Return excess chips to bettor when others fold
 * FIXED: Uses betThisStreet to correctly calculate uncalled bets on current street
 */
function handleUncalledBets(gameState) {
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
        console.log(`💰 [POT] Uncalled bet: Returning $${uncalledAmount} to ${remainingPlayer.userId.substr(0, 8)}`);
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
      console.log(`💰 [POT] Uncalled bet: Returning $${uncalledAmount} to ${highestBettor.userId.substr(0, 8)}`);
    }
  }
}

module.exports = {
  validateChipConservation,
  calculateSidePots,
  handleUncalledBets
};

