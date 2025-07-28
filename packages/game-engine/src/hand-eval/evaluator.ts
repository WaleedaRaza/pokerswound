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

  // Hand detection methods
  private static isRoyalFlush(cards: Card[]): boolean {
    return this.isStraightFlush(cards) && cards[0].rank === Rank.ACE;
  }

  private static isStraightFlush(cards: Card[]): boolean {
    return this.isFlush(cards) && this.isStraight(cards);
  }

  private static isFourOfAKind(cards: Card[]): boolean {
    const rankCounts = this.getRankCounts(cards);
    return Object.values(rankCounts).some(count => count === 4);
  }

  private static isFullHouse(cards: Card[]): boolean {
    const rankCounts = this.getRankCounts(cards);
    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    return counts.length === 2 && counts[0] === 3 && counts[1] === 2;
  }

  private static isFlush(cards: Card[]): boolean {
    const suit = cards[0].suit;
    return cards.every(card => card.suit === suit);
  }

  private static isStraight(cards: Card[]): boolean {
    // Check for regular straight
    for (let i = 0; i < cards.length - 1; i++) {
      if (cards[i].rank - cards[i + 1].rank !== 1) {
        return false;
      }
    }
    return true;
  }

  private static isThreeOfAKind(cards: Card[]): boolean {
    const rankCounts = this.getRankCounts(cards);
    return Object.values(rankCounts).some(count => count === 3);
  }

  private static isTwoPair(cards: Card[]): boolean {
    const rankCounts = this.getRankCounts(cards);
    const pairs = Object.values(rankCounts).filter(count => count === 2);
    return pairs.length === 2;
  }

  private static isPair(cards: Card[]): boolean {
    const rankCounts = this.getRankCounts(cards);
    return Object.values(rankCounts).some(count => count === 2);
  }

  private static createHandEvaluation(rank: HandRank, cards: Card[], description: string): HandEvaluation {
    const kickers = this.getKickers(cards, rank);
    return {
      rank,
      cards,
      kickers,
      score: this.calculateScore(rank, cards),
      description
    };
  }

  private static calculateScore(rank: HandRank, cards: Card[]): number {
    // Base score from hand rank
    let score = rank * 1000000;
    
    // Add card values (higher cards get more weight)
    for (let i = 0; i < cards.length; i++) {
      score += cards[i].rank * Math.pow(100, cards.length - 1 - i);
    }
    
    return score;
  }

  private static getCombinations<T>(arr: T[], size: number): T[][] {
    if (size === 0) return [[]];
    if (arr.length === 0) return [];
    
    const [first, ...rest] = arr;
    const withoutFirst = this.getCombinations(rest, size);
    const withFirst = this.getCombinations(rest, size - 1).map(combo => [first, ...combo]);
    
    return [...withoutFirst, ...withFirst];
  }

  private static getRankCounts(cards: Card[]): Record<number, number> {
    const counts: Record<number, number> = {};
    cards.forEach(card => {
      counts[card.rank] = (counts[card.rank] || 0) + 1;
    });
    return counts;
  }

  private static getKickers(cards: Card[], rank: HandRank): Card[] {
    // Implement proper kicker logic based on hand type
    const sortedCards = [...cards].sort((a, b) => b.rank - a.rank);
    
    switch (rank) {
      case HandRank.ROYAL_FLUSH:
      case HandRank.STRAIGHT_FLUSH:
      case HandRank.STRAIGHT:
        // No kickers needed - straight is determined by highest card
        return [];
        
      case HandRank.FOUR_OF_A_KIND:
        // Kicker is the remaining card
        const fourRank = this.getFourOfAKindRank(sortedCards);
        return sortedCards.filter(card => card.rank !== fourRank);
        
      case HandRank.FULL_HOUSE:
        // Kickers are the three-of-a-kind cards
        const threeRank = this.getThreeOfAKindRank(sortedCards);
        return sortedCards.filter(card => card.rank === threeRank);
        
      case HandRank.FLUSH:
        // No kickers needed - flush is determined by highest cards
        return [];
        
      case HandRank.THREE_OF_A_KIND:
        // Kickers are the two remaining cards
        const threeRank2 = this.getThreeOfAKindRank(sortedCards);
        return sortedCards.filter(card => card.rank !== threeRank2);
        
      case HandRank.TWO_PAIR:
        // Kicker is the remaining card
        const pairRanks = this.getTwoPairRanks(sortedCards);
        return sortedCards.filter(card => !pairRanks.includes(card.rank));
        
      case HandRank.PAIR:
        // Kickers are the three remaining cards
        const pairRank = this.getPairRank(sortedCards);
        return sortedCards.filter(card => card.rank !== pairRank);
        
      case HandRank.HIGH_CARD:
        // All cards are kickers
        return sortedCards;
        
      default:
        return sortedCards;
    }
  }

  // Helper methods for kicker logic
  private static getFourOfAKindRank(cards: Card[]): number {
    const rankCounts = this.getRankCounts(cards);
    for (const [rank, count] of Object.entries(rankCounts)) {
      if (count === 4) return parseInt(rank);
    }
    throw new Error('No four of a kind found');
  }

  private static getThreeOfAKindRank(cards: Card[]): number {
    const rankCounts = this.getRankCounts(cards);
    for (const [rank, count] of Object.entries(rankCounts)) {
      if (count === 3) return parseInt(rank);
    }
    throw new Error('No three of a kind found');
  }

  private static getTwoPairRanks(cards: Card[]): number[] {
    const rankCounts = this.getRankCounts(cards);
    const pairs: number[] = [];
    for (const [rank, count] of Object.entries(rankCounts)) {
      if (count === 2) pairs.push(parseInt(rank));
    }
    return pairs.sort((a, b) => b - a); // Higher pairs first
  }

  private static getPairRank(cards: Card[]): number {
    const rankCounts = this.getRankCounts(cards);
    for (const [rank, count] of Object.entries(rankCounts)) {
      if (count === 2) return parseInt(rank);
    }
    throw new Error('No pair found');
  }
} 