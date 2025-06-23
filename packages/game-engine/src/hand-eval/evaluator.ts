import { Card, Rank, Suit } from '../deck/types';
import { HandRank, HandEvaluation, HandComparison, HandRanking } from './types';

export class HandEvaluator {
  /**
   * Evaluates the best 5-card hand from 7 cards (hole cards + community cards)
   */
  static evaluateHand(holeCards: Card[], communityCards: Card[]): HandEvaluation {
    const allCards = [...holeCards, ...communityCards];
    
    if (allCards.length < 5) {
      throw new Error('Need at least 5 cards to evaluate a hand');
    }
    
    // Get all possible 5-card combinations
    const combinations = this.getCombinations(allCards, 5);
    
    // Evaluate each combination and find the best one
    let bestHand = this.evaluateFiveCards(combinations[0]);
    
    for (let i = 1; i < combinations.length; i++) {
      const currentHand = this.evaluateFiveCards(combinations[i]);
      if (this.compareHands(currentHand, bestHand) > 0) {
        bestHand = currentHand;
      }
    }
    
    return bestHand;
  }

  /**
   * Evaluates a 5-card hand
   */
  static evaluateFiveCards(cards: Card[]): HandEvaluation {
    // Sort cards by rank (descending)
    const sortedCards = [...cards].sort((a, b) => b.rank - a.rank);
    
    // Check for each hand type from highest to lowest
    if (this.isRoyalFlush(sortedCards)) {
      return this.createHandEvaluation(HandRank.ROYAL_FLUSH, sortedCards, 'Royal Flush');
    }
    
    if (this.isStraightFlush(sortedCards)) {
      return this.createHandEvaluation(HandRank.STRAIGHT_FLUSH, sortedCards, 'Straight Flush');
    }
    
    if (this.isFourOfAKind(sortedCards)) {
      return this.createHandEvaluation(HandRank.FOUR_OF_A_KIND, sortedCards, 'Four of a Kind');
    }
    
    if (this.isFullHouse(sortedCards)) {
      return this.createHandEvaluation(HandRank.FULL_HOUSE, sortedCards, 'Full House');
    }
    
    if (this.isFlush(sortedCards)) {
      return this.createHandEvaluation(HandRank.FLUSH, sortedCards, 'Flush');
    }
    
    if (this.isStraight(sortedCards)) {
      return this.createHandEvaluation(HandRank.STRAIGHT, sortedCards, 'Straight');
    }
    
    if (this.isThreeOfAKind(sortedCards)) {
      return this.createHandEvaluation(HandRank.THREE_OF_A_KIND, sortedCards, 'Three of a Kind');
    }
    
    if (this.isTwoPair(sortedCards)) {
      return this.createHandEvaluation(HandRank.TWO_PAIR, sortedCards, 'Two Pair');
    }
    
    if (this.isPair(sortedCards)) {
      return this.createHandEvaluation(HandRank.PAIR, sortedCards, 'Pair');
    }
    
    // High card
    return this.createHandEvaluation(HandRank.HIGH_CARD, sortedCards, 'High Card');
  }

  /**
   * Compares two hands and returns the winner
   */
  static compareHands(hand1: HandEvaluation, hand2: HandEvaluation): number {
    // First compare by hand rank
    if (hand1.rank !== hand2.rank) {
      return hand1.rank - hand2.rank;
    }
    
    // If same rank, compare by score
    return hand1.score - hand2.score;
  }

  /**
   * Ranks multiple players' hands and returns the winner(s)
   */
  static rankHands(players: Array<{ playerId: string; holeCards: Card[] }>, communityCards: Card[]): HandRanking[] {
    const evaluations = players.map(player => ({
      playerId: player.playerId,
      hand: this.evaluateHand(player.holeCards, communityCards)
    }));
    
    // Sort by hand strength (descending)
    evaluations.sort((a, b) => this.compareHands(b.hand, a.hand));
    
    // Assign positions (handle ties)
    const rankings: HandRanking[] = [];
    let currentPosition = 1;
    
    for (let i = 0; i < evaluations.length; i++) {
      if (i > 0 && this.compareHands(evaluations[i].hand, evaluations[i - 1].hand) !== 0) {
        currentPosition = i + 1;
      }
      
      rankings.push({
        playerId: evaluations[i].playerId,
        hand: evaluations[i].hand,
        position: currentPosition
      });
    }
    
    return rankings;
  }

  // Helper methods for hand detection (to be implemented)
  private static isRoyalFlush(cards: Card[]): boolean {
    // TODO: Implement royal flush detection
    return false;
  }

  private static isStraightFlush(cards: Card[]): boolean {
    // TODO: Implement straight flush detection
    return false;
  }

  private static isFourOfAKind(cards: Card[]): boolean {
    // TODO: Implement four of a kind detection
    return false;
  }

  private static isFullHouse(cards: Card[]): boolean {
    // TODO: Implement full house detection
    return false;
  }

  private static isFlush(cards: Card[]): boolean {
    // TODO: Implement flush detection
    return false;
  }

  private static isStraight(cards: Card[]): boolean {
    // TODO: Implement straight detection
    return false;
  }

  private static isThreeOfAKind(cards: Card[]): boolean {
    // TODO: Implement three of a kind detection
    return false;
  }

  private static isTwoPair(cards: Card[]): boolean {
    // TODO: Implement two pair detection
    return false;
  }

  private static isPair(cards: Card[]): boolean {
    // TODO: Implement pair detection
    return false;
  }

  private static createHandEvaluation(rank: HandRank, cards: Card[], description: string): HandEvaluation {
    return {
      rank,
      cards,
      kickers: [], // TODO: Implement kicker logic
      score: this.calculateScore(rank, cards),
      description
    };
  }

  private static calculateScore(rank: HandRank, cards: Card[]): number {
    // TODO: Implement proper scoring algorithm
    return rank * 1000000 + cards.reduce((sum, card) => sum + card.rank, 0);
  }

  private static getCombinations<T>(arr: T[], size: number): T[][] {
    // TODO: Implement combination generation
    return [arr.slice(0, size)]; // Placeholder
  }
} 