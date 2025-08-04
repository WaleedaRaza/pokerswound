import { Pot, PotCalculation, PotDistribution, BettingRound } from './types';

export class PotManager {
  /**
   * Calculates the main pot and side pots based on player bets and all-in situations
   */
  static calculatePots(playerBets: Record<string, number>, allInPlayers: string[]): PotCalculation {
    const pots: Pot[] = [];
    const sortedBetAmounts = [...new Set(Object.values(playerBets))].sort((a, b) => a - b);
    
    let previousBet = 0;
    let eligiblePlayers = Object.keys(playerBets);
    
    // Create side pots for each all-in level
    for (const betAmount of sortedBetAmounts) {
      if (betAmount === 0) continue;
      
      const potAmount = (betAmount - previousBet) * eligiblePlayers.length;
      
      if (potAmount > 0) {
        const pot: Pot = {
          id: `pot_${pots.length}`,
          amount: potAmount,
          eligiblePlayers: [...eligiblePlayers],
          type: pots.length === 0 ? 'main' : 'side',
          allInPlayers: allInPlayers.filter(playerId => 
            playerBets[playerId] === betAmount
          )
        };
        
        pots.push(pot);
      }
      
      // Remove players who went all-in at this level
      eligiblePlayers = eligiblePlayers.filter(playerId => 
        playerBets[playerId] > betAmount
      );
      
      previousBet = betAmount;
    }
    
    const mainPot = pots[0] || { id: 'main_pot', amount: 0, eligiblePlayers: [], type: 'main' as const, allInPlayers: [] };
    const sidePots = pots.slice(1);
    const totalAmount = pots.reduce((sum, pot) => sum + pot.amount, 0);
    
    return {
      mainPot,
      sidePots,
      totalAmount
    };
  }

  /**
   * Distributes pots to winners based on hand rankings
   */
  static distributePots(
    pots: Pot[],
    winners: Array<{ playerId: string; handRank: number; handScore: number }>
  ): PotDistribution[] {
    const distributions: PotDistribution[] = [];
    
    for (const pot of pots) {
      if (pot.amount === 0) continue;
      
      // Find eligible winners for this pot
      const eligibleWinners = winners.filter(winner => 
        pot.eligiblePlayers.includes(winner.playerId)
      );
      
      if (eligibleWinners.length === 0) continue;
      
      // Sort winners by hand strength (descending)
      eligibleWinners.sort((a, b) => {
        if (a.handRank !== b.handRank) {
          return b.handRank - a.handRank;
        }
        return b.handScore - a.handScore;
      });
      
      // Find the best hand(s)
      const bestHandRank = eligibleWinners[0].handRank;
      const bestHandScore = eligibleWinners[0].handScore;
      
      const bestWinners = eligibleWinners.filter(winner => 
        winner.handRank === bestHandRank && winner.handScore === bestHandScore
      );
      
      // Distribute pot among winners
      const amountPerWinner = Math.floor(pot.amount / bestWinners.length);
      const remainder = pot.amount % bestWinners.length;
      
      bestWinners.forEach((winner, index) => {
        const amount = amountPerWinner + (index < remainder ? 1 : 0);
        if (amount > 0) {
          distributions.push({
            playerId: winner.playerId,
            amount,
            potId: pot.id,
            reason: bestWinners.length > 1 ? 'split' : 'winner'
          });
        }
      });
    }
    
    return distributions;
  }

  /**
   * Validates that pot calculations are correct
   */
  static validatePotCalculation(
    playerBets: Record<string, number>,
    potCalculation: PotCalculation
  ): boolean {
    const totalBets = Object.values(playerBets).reduce((sum, bet) => sum + bet, 0);
    return totalBets === potCalculation.totalAmount;
  }

  /**
   * Gets the current betting round information
   */
  static getBettingRoundInfo(
    playerBets: Record<string, number>,
    currentBet: number,
    minRaise: number,
    allInPlayers: string[]
  ): BettingRound {
    return {
      round: 'preflop', // This should be passed in from game state
      currentBet,
      minRaise,
      playerBets,
      allInPlayers
    };
  }

  /**
   * Calculates the minimum raise amount based on current betting
   */
  static calculateMinRaise(
    currentBet: number,
    lastRaise: number,
    bigBlind: number
  ): number {
    if (currentBet === 0) {
      return bigBlind;
    }
    
    return Math.max(lastRaise, bigBlind);
  }

  /**
   * Checks if a raise is valid
   */
  static isValidRaise(
    raiseAmount: number,
    currentBet: number,
    minRaise: number,
    playerChips: number
  ): { valid: boolean; reason?: string } {
    if (raiseAmount > playerChips) {
      return { valid: false, reason: 'Insufficient chips' };
    }
    
    if (raiseAmount <= currentBet) {
      return { valid: false, reason: 'Raise must be greater than current bet' };
    }
    
    if (raiseAmount < currentBet + minRaise) {
      return { valid: false, reason: 'Raise must be at least the minimum raise amount' };
    }
    
    return { valid: true };
  }

  /**
   * Creates side pots when players are all-in
   */
  static createSidePots(players: Array<{ id: string; chips: number; currentBet: number; isAllIn: boolean }>): Pot[] {
    const pots: Pot[] = [];
    
    // Sort players by their current bet amount
    const sortedPlayers = [...players].sort((a, b) => a.currentBet - b.currentBet);
    
    let previousBet = 0;
    let eligiblePlayers: string[] = [];
    let allInPlayers: string[] = [];
    
    for (const player of sortedPlayers) {
      if (player.currentBet > previousBet) {
        // Create a pot for the difference
        const potAmount = (player.currentBet - previousBet) * eligiblePlayers.length;
        
        if (potAmount > 0) {
          pots.push({
            id: `pot-${pots.length}`,
            amount: potAmount,
            eligiblePlayers: [...eligiblePlayers],
            type: eligiblePlayers.length === 1 ? 'main' : 'side',
            allInPlayers: [...allInPlayers]
          });
        }
        
        previousBet = player.currentBet;
      }
      
      // Add player to eligible list for future pots
      eligiblePlayers.push(player.id);
      
      // Track all-in players
      if (player.isAllIn) {
        allInPlayers.push(player.id);
      }
    }
    
    // Create final pot with remaining players
    const finalPotAmount = sortedPlayers.reduce((total, player) => total + player.currentBet, 0);
    if (finalPotAmount > 0) {
      pots.push({
        id: `pot-${pots.length}`,
        amount: finalPotAmount,
        eligiblePlayers: sortedPlayers.map(p => p.id),
        type: 'main',
        allInPlayers: [...allInPlayers]
      });
    }
    
    return pots;
  }

  /**
   * Distributes side pots to winners
   */
  static distributeSidePots(
    pots: Pot[],
    winners: Array<{ playerId: string; handRank: number; handScore: number }>
  ): PotDistribution[] {
    const distributions: PotDistribution[] = [];
    
    for (const pot of pots) {
      if (pot.amount === 0) continue;
      
      // Find eligible winners for this pot
      const eligibleWinners = winners.filter(winner => 
        pot.eligiblePlayers.includes(winner.playerId)
      );
      
      if (eligibleWinners.length === 0) continue;
      
      // Sort winners by hand strength (descending)
      eligibleWinners.sort((a, b) => {
        if (a.handRank !== b.handRank) {
          return b.handRank - a.handRank;
        }
        return b.handScore - a.handScore;
      });
      
      // Find the best hand(s)
      const bestHandRank = eligibleWinners[0].handRank;
      const bestHandScore = eligibleWinners[0].handScore;
      
      const bestWinners = eligibleWinners.filter(winner => 
        winner.handRank === bestHandRank && winner.handScore === bestHandScore
      );
      
      // Distribute pot among winners
      const amountPerWinner = Math.floor(pot.amount / bestWinners.length);
      const remainder = pot.amount % bestWinners.length;
      
      bestWinners.forEach((winner, index) => {
        const amount = amountPerWinner + (index < remainder ? 1 : 0);
        if (amount > 0) {
          distributions.push({
            playerId: winner.playerId,
            amount,
            potId: pot.id,
            reason: bestWinners.length > 1 ? 'split' : 'winner'
          });
        }
      });
    }
    
    return distributions;
  }
} 