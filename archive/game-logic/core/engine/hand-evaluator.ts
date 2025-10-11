import { Card } from '../card/card';
// import { Suit } from '../card/suit';
import { Rank } from '../card/rank';
import type { Hole2 } from '../../types/card.types';

export enum HandRanking {
  HighCard = 1,
  Pair = 2,
  TwoPair = 3,
  ThreeOfAKind = 4,
  Straight = 5,
  Flush = 6,
  FullHouse = 7,
  FourOfAKind = 8,
  StraightFlush = 9,
  RoyalFlush = 10,
}

export interface HandRank {
  ranking: HandRanking;
  primaryRank: number;   // Main rank (e.g., pair rank, straight high card)
  secondaryRank: number; // Secondary rank (e.g., kicker, second pair)
  kickers: number[];     // Remaining kickers in descending order
  cards: Card[];         // The 5 cards that make the hand
}

export interface PlayerHand {
  playerUuid: string;
  hole: Hole2;
  handRank: HandRank;
}

export interface WinnerResult {
  winners: string[];     // Player UUIDs (can be multiple for ties)
  handRank: HandRank;
  description: string;   // Human readable description
}

export class HandEvaluator {
  private static readonly RANK_VALUES: Record<Rank, number> = {
    [Rank.Two]: 2,
    [Rank.Three]: 3,
    [Rank.Four]: 4,
    [Rank.Five]: 5,
    [Rank.Six]: 6,
    [Rank.Seven]: 7,
    [Rank.Eight]: 8,
    [Rank.Nine]: 9,
    [Rank.Ten]: 10,
    [Rank.Jack]: 11,
    [Rank.Queen]: 12,
    [Rank.King]: 13,
    [Rank.Ace]: 14,
  };

  private static readonly HAND_DESCRIPTIONS: Record<HandRanking, string> = {
    [HandRanking.HighCard]: 'High Card',
    [HandRanking.Pair]: 'Pair',
    [HandRanking.TwoPair]: 'Two Pair',
    [HandRanking.ThreeOfAKind]: 'Three of a Kind',
    [HandRanking.Straight]: 'Straight',
    [HandRanking.Flush]: 'Flush',
    [HandRanking.FullHouse]: 'Full House',
    [HandRanking.FourOfAKind]: 'Four of a Kind',
    [HandRanking.StraightFlush]: 'Straight Flush',
    [HandRanking.RoyalFlush]: 'Royal Flush',
  };

  /**
   * Evaluates the best 5-card hand from 7 cards (2 hole + 5 community)
   */
  public evaluateHand(hole: Hole2, community: Card[]): HandRank {
    if (hole.length !== 2) {
      throw new Error('Hole cards must be exactly 2 cards');
    }
    if (community.length !== 5) {
      throw new Error('Community cards must be exactly 5 cards');
    }

    const allCards = [...hole, ...community];
    return this.findBestHand(allCards);
  }

  /**
   * Compares two hands. Returns:
   * > 0 if hand1 wins
   * < 0 if hand2 wins  
   * = 0 if tie
   */
  public compareHands(hand1: HandRank, hand2: HandRank): number {
    // Compare by ranking first
    if (hand1.ranking !== hand2.ranking) {
      return hand1.ranking - hand2.ranking;
    }

    // Same ranking, compare primary rank
    if (hand1.primaryRank !== hand2.primaryRank) {
      return hand1.primaryRank - hand2.primaryRank;
    }

    // Same primary, compare secondary
    if (hand1.secondaryRank !== hand2.secondaryRank) {
      return hand1.secondaryRank - hand2.secondaryRank;
    }

    // Compare kickers in order
    for (let i = 0; i < Math.max(hand1.kickers.length, hand2.kickers.length); i++) {
      const k1 = hand1.kickers[i] || 0;
      const k2 = hand2.kickers[i] || 0;
      if (k1 !== k2) {
        return k1 - k2;
      }
    }

    return 0; // Perfect tie
  }

  /**
   * Finds winners from multiple player hands
   */
  public findWinners(playerHands: PlayerHand[]): WinnerResult {
    if (playerHands.length === 0) {
      throw new Error('No player hands to evaluate');
    }

    let bestHand = playerHands[0]!.handRank;
    let winners = [playerHands[0]!.playerUuid];

    for (let i = 1; i < playerHands.length; i++) {
      const comparison = this.compareHands(playerHands[i]!.handRank, bestHand);
      
      if (comparison > 0) {
        // New best hand
        bestHand = playerHands[i]!.handRank;
        winners = [playerHands[i]!.playerUuid];
      } else if (comparison === 0) {
        // Tie with current best
        winners.push(playerHands[i]!.playerUuid);
      }
    }

    return {
      winners,
      handRank: bestHand,
      description: this.getHandDescription(bestHand),
    };
  }

  /**
   * Finds the best 5-card hand from 7 cards
   */
  private findBestHand(cards: Card[]): HandRank {
    if (cards.length !== 7) {
      throw new Error('Must evaluate exactly 7 cards');
    }

    let bestHand: HandRank | null = null;

    // Try all combinations of 5 cards from 7
    const combinations = this.getCombinations(cards, 5);
    
    for (const combo of combinations) {
      const handRank = this.evaluateFiveCards(combo);
      
      if (!bestHand || this.compareHands(handRank, bestHand) > 0) {
        bestHand = handRank;
      }
    }

    if (!bestHand) {
      throw new Error('Failed to evaluate hand');
    }

    return bestHand;
  }

  /**
   * Evaluates exactly 5 cards to determine hand ranking
   */
  private evaluateFiveCards(cards: Card[]): HandRank {
    if (cards.length !== 5) {
      throw new Error('Must evaluate exactly 5 cards');
    }

    // Sort cards by rank (descending)
    const sortedCards = [...cards].sort((a, b) => 
      HandEvaluator.RANK_VALUES[b.rank] - HandEvaluator.RANK_VALUES[a.rank]
    );

    const ranks = sortedCards.map(c => HandEvaluator.RANK_VALUES[c.rank]);
    const suits = sortedCards.map(c => c.suit);

    // Check for flush
    const isFlush = suits.every(suit => suit === suits[0]);

    // Check for straight
    const isStraight = this.isStraight(ranks);
    const isLowStraight = this.isLowStraight(ranks); // A-2-3-4-5

    // Royal flush: A-K-Q-J-10 suited
    if (isFlush && isStraight && ranks[0] === 14) {
      return {
        ranking: HandRanking.RoyalFlush,
        primaryRank: 14,
        secondaryRank: 0,
        kickers: [],
        cards: sortedCards,
      };
    }

    // Straight flush
    if (isFlush && (isStraight || isLowStraight)) {
      return {
        ranking: HandRanking.StraightFlush,
        primaryRank: isLowStraight ? 5 : ranks[0]!, // Low straight high card is 5
        secondaryRank: 0,
        kickers: [],
        cards: sortedCards,
      };
    }

    // Count rank frequencies
    const rankCounts = new Map<number, number>();
    ranks.forEach(rank => {
      rankCounts.set(rank, (rankCounts.get(rank) || 0) + 1);
    });

    const counts = Array.from(rankCounts.values()).sort((a, b) => b - a);
    const ranksByCount = Array.from(rankCounts.entries())
      .sort((a, b) => b[1] - a[1] || b[0] - a[0])
      .map(([rank]) => rank);

    // Four of a kind
    if (counts[0] === 4) {
      return {
        ranking: HandRanking.FourOfAKind,
        primaryRank: ranksByCount[0]!,
        secondaryRank: 0,
        kickers: [ranksByCount[1]!],
        cards: sortedCards,
      };
    }

    // Full house
    if (counts[0] === 3 && counts[1] === 2) {
      return {
        ranking: HandRanking.FullHouse,
        primaryRank: ranksByCount[0]!,
        secondaryRank: ranksByCount[1]!,
        kickers: [],
        cards: sortedCards,
      };
    }

    // Flush
    if (isFlush) {
      return {
        ranking: HandRanking.Flush,
        primaryRank: ranks[0]!,
        secondaryRank: 0,
        kickers: ranks.slice(1),
        cards: sortedCards,
      };
    }

    // Straight
    if (isStraight || isLowStraight) {
      return {
        ranking: HandRanking.Straight,
        primaryRank: isLowStraight ? 5 : ranks[0]!,
        secondaryRank: 0,
        kickers: [],
        cards: sortedCards,
      };
    }

    // Three of a kind
    if (counts[0] === 3) {
      return {
        ranking: HandRanking.ThreeOfAKind,
        primaryRank: ranksByCount[0]!,
        secondaryRank: 0,
        kickers: ranksByCount.slice(1),
        cards: sortedCards,
      };
    }

    // Two pair
    if (counts[0] === 2 && counts[1] === 2) {
      return {
        ranking: HandRanking.TwoPair,
        primaryRank: Math.max(ranksByCount[0]!, ranksByCount[1]!),
        secondaryRank: Math.min(ranksByCount[0]!, ranksByCount[1]!),
        kickers: [ranksByCount[2]!],
        cards: sortedCards,
      };
    }

    // One pair
    if (counts[0] === 2) {
      return {
        ranking: HandRanking.Pair,
        primaryRank: ranksByCount[0]!,
        secondaryRank: 0,
        kickers: ranksByCount.slice(1),
        cards: sortedCards,
      };
    }

    // High card
    return {
      ranking: HandRanking.HighCard,
      primaryRank: ranks[0]!,
      secondaryRank: 0,
      kickers: ranks.slice(1),
      cards: sortedCards,
    };
  }

  /**
   * Checks if ranks form a straight (consecutive)
   */
  private isStraight(ranks: number[]): boolean {
    const uniqueRanks = [...new Set(ranks)].sort((a, b) => b - a);
    if (uniqueRanks.length !== 5) return false;

    for (let i = 1; i < uniqueRanks.length; i++) {
      if (uniqueRanks[i-1]! - uniqueRanks[i]! !== 1) {
        return false;
      }
    }
    return true;
  }

  /**
   * Checks for low straight (A-2-3-4-5)
   */
  private isLowStraight(ranks: number[]): boolean {
    const uniqueRanks = [...new Set(ranks)].sort((a, b) => a - b);
    return uniqueRanks.length === 5 && 
           uniqueRanks[0] === 2 && uniqueRanks[1] === 3 && 
           uniqueRanks[2] === 4 && uniqueRanks[3] === 5 && 
           uniqueRanks[4] === 14; // Ace
  }

  /**
   * Gets all combinations of k items from array
   */
  private getCombinations<T>(arr: T[], k: number): T[][] {
    if (k === 1) return arr.map(item => [item]);
    if (k === arr.length) return [arr];
    
    const result: T[][] = [];
    
    for (let i = 0; i <= arr.length - k; i++) {
      const head = arr[i];
      const tailCombos = this.getCombinations(arr.slice(i + 1), k - 1);
      
      for (const tailCombo of tailCombos) {
        result.push([head!, ...tailCombo]);
      }
    }
    
    return result;
  }

  /**
   * Gets human-readable description of a hand
   */
  private getHandDescription(hand: HandRank): string {
    const baseDesc = HandEvaluator.HAND_DESCRIPTIONS[hand.ranking];
    
    switch (hand.ranking) {
      case HandRanking.Pair:
        return `Pair of ${this.rankToString(hand.primaryRank)}s`;
      case HandRanking.TwoPair:
        return `Two Pair, ${this.rankToString(hand.primaryRank)}s and ${this.rankToString(hand.secondaryRank)}s`;
      case HandRanking.ThreeOfAKind:
        return `Three ${this.rankToString(hand.primaryRank)}s`;
      case HandRanking.Straight:
        return `Straight, ${this.rankToString(hand.primaryRank)} high`;
      case HandRanking.Flush:
        return `Flush, ${this.rankToString(hand.primaryRank)} high`;
      case HandRanking.FullHouse:
        return `Full House, ${this.rankToString(hand.primaryRank)}s full of ${this.rankToString(hand.secondaryRank)}s`;
      case HandRanking.FourOfAKind:
        return `Four ${this.rankToString(hand.primaryRank)}s`;
      case HandRanking.StraightFlush:
        return `Straight Flush, ${this.rankToString(hand.primaryRank)} high`;
      case HandRanking.RoyalFlush:
        return 'Royal Flush';
      default:
        return `${baseDesc}, ${this.rankToString(hand.primaryRank)} high`;
    }
  }

  /**
   * Converts numeric rank to string
   */
  private rankToString(rank: number): string {
    switch (rank) {
      case 2: return 'Two';
      case 3: return 'Three';
      case 4: return 'Four';
      case 5: return 'Five';
      case 6: return 'Six';
      case 7: return 'Seven';
      case 8: return 'Eight';
      case 9: return 'Nine';
      case 10: return 'Ten';
      case 11: return 'Jack';
      case 12: return 'Queen';
      case 13: return 'King';
      case 14: return 'Ace';
      default: return rank.toString();
    }
  }
}