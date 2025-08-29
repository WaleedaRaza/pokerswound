import { pokerBridge } from '../../bridge/poker-engine-bridge';
import type { Card } from '../card/card';
import type { Hole2 } from '../../types/card.types';

export interface EnhancedHandRank {
  strength: string;
  score: number;
  high: number;
  low: number;
  description: string;
}

export interface EnhancedPlayerHand {
  playerUuid: string;
  hole: Hole2;
  handRank: EnhancedHandRank;
}

export interface EnhancedWinnerResult {
  winners: string[];
  handRank: EnhancedHandRank;
  description: string;
}

/**
 * Enhanced HandEvaluator that uses existing PyPokerEngine for heavy lifting
 * This replaces our custom implementation with battle-tested poker logic
 */
export class EnhancedHandEvaluator {
  
  /**
   * Evaluates the best hand using PyPokerEngine's proven evaluator
   */
  async evaluateHand(hole: Hole2, community: Card[]): Promise<EnhancedHandRank> {
    const result = await pokerBridge.evaluateHand(hole, community);
    
    if (!result.success || !result.hand_info) {
      throw new Error(`Hand evaluation failed: ${result.error}`);
    }

    return {
      strength: result.strength || 'UNKNOWN',
      score: result.score || 0,
      high: result.hand_info.hand.high,
      low: result.hand_info.hand.low,
      description: this.getHandDescription(result.strength || 'UNKNOWN', result.hand_info.hand.high)
    };
  }

  /**
   * Compares two hands using PyPokerEngine's comparison logic
   */
  async compareHands(hand1: EnhancedHandRank, hand2: EnhancedHandRank): Promise<number> {
    // PyPokerEngine uses higher scores for better hands
    if (hand1.score > hand2.score) return 1;
    if (hand2.score > hand1.score) return -1;
    return 0;
  }

  /**
   * Finds winners from multiple player hands using existing engine
   */
  async findWinners(playerHands: EnhancedPlayerHand[]): Promise<EnhancedWinnerResult> {
    if (playerHands.length === 0) {
      throw new Error('No player hands to evaluate');
    }

    if (playerHands.length === 1) {
      return {
        winners: [playerHands[0].playerUuid],
        handRank: playerHands[0].handRank,
        description: `${playerHands[0].handRank.description} wins`
      };
    }

    // For multiple hands, we need to compare them pairwise
    // This is simplified - in production you'd want more sophisticated comparison
    let bestHand = playerHands[0];
    let winners = [playerHands[0].playerUuid];

    for (let i = 1; i < playerHands.length; i++) {
      const comparison = await this.compareHands(playerHands[i].handRank, bestHand.handRank);
      
      if (comparison > 0) {
        // New best hand
        bestHand = playerHands[i];
        winners = [playerHands[i].playerUuid];
      } else if (comparison === 0) {
        // Tie with current best
        winners.push(playerHands[i].playerUuid);
      }
    }

    return {
      winners,
      handRank: bestHand.handRank,
      description: winners.length > 1 
        ? `${bestHand.handRank.description} (${winners.length}-way tie)`
        : `${bestHand.handRank.description} wins`
    };
  }

  /**
   * Batch evaluate multiple hands efficiently
   */
  async evaluateMultipleHands(
    playerHoles: Array<{ playerUuid: string; hole: Hole2 }>,
    community: Card[]
  ): Promise<EnhancedPlayerHand[]> {
    const results: EnhancedPlayerHand[] = [];

    // Evaluate each hand (could be parallelized for better performance)
    for (const playerHole of playerHoles) {
      try {
        const handRank = await this.evaluateHand(playerHole.hole, community);
        results.push({
          playerUuid: playerHole.playerUuid,
          hole: playerHole.hole,
          handRank
        });
      } catch (error) {
        console.error(`Failed to evaluate hand for ${playerHole.playerUuid}:`, error);
        // Add a default losing hand
        results.push({
          playerUuid: playerHole.playerUuid,
          hole: playerHole.hole,
          handRank: {
            strength: 'HIGHCARD',
            score: 0,
            high: 2,
            low: 0,
            description: 'High Card (evaluation failed)'
          }
        });
      }
    }

    return results;
  }

  /**
   * Quick hand strength comparison without full evaluation
   */
  async quickCompare(
    hand1Hole: Hole2,
    hand2Hole: Hole2,
    community: Card[]
  ): Promise<{ winner: number; hand1: EnhancedHandRank; hand2: EnhancedHandRank }> {
    const result = await pokerBridge.compareHands(hand1Hole, hand2Hole, community);
    
    if (!result.success) {
      throw new Error(`Hand comparison failed: ${result.error}`);
    }

    const hand1Rank: EnhancedHandRank = {
      strength: result.hand1?.strength || 'UNKNOWN',
      score: result.hand1?.score || 0,
      high: result.hand1?.hand_info?.hand.high || 0,
      low: result.hand1?.hand_info?.hand.low || 0,
      description: this.getHandDescription(result.hand1?.strength || 'UNKNOWN', result.hand1?.hand_info?.hand.high || 0)
    };

    const hand2Rank: EnhancedHandRank = {
      strength: result.hand2?.strength || 'UNKNOWN',
      score: result.hand2?.score || 0,
      high: result.hand2?.hand_info?.hand.high || 0,
      low: result.hand2?.hand_info?.hand.low || 0,
      description: this.getHandDescription(result.hand2?.strength || 'UNKNOWN', result.hand2?.hand_info?.hand.high || 0)
    };

    return {
      winner: result.winner || 0,
      hand1: hand1Rank,
      hand2: hand2Rank
    };
  }

  /**
   * Get human-readable hand description
   */
  private getHandDescription(strength: string, high: number): string {
    const rankNames: Record<number, string> = {
      2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven',
      8: 'Eight', 9: 'Nine', 10: 'Ten', 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace'
    };

    const rankName = rankNames[high] || high.toString();

    switch (strength) {
      case 'HIGHCARD': return `${rankName} High`;
      case 'ONEPAIR': return `Pair of ${rankName}s`;
      case 'TWOPAIR': return `Two Pair, ${rankName}s high`;
      case 'THREECARD': return `Three ${rankName}s`;
      case 'STRAIGHT': return `Straight, ${rankName} high`;
      case 'FLASH': return `Flush, ${rankName} high`;
      case 'FULLHOUSE': return `Full House, ${rankName}s full`;
      case 'FOURCARD': return `Four ${rankName}s`;
      case 'STRAIGHTFLASH': return `Straight Flush, ${rankName} high`;
      default: return `${strength} (${rankName} high)`;
    }
  }
}

// Singleton instance for easy use
export const enhancedHandEvaluator = new EnhancedHandEvaluator();