import { Card, HandRank } from './types'
import { CardUtils } from './card'

export class HandEvaluator {
  /**
   * Evaluate the best 5-card hand from 7 cards (2 hole cards + 5 community cards)
   */
  static evaluateHand(holeCards: Card[], communityCards: Card[]): HandRank {
    const allCards = [...holeCards, ...communityCards]
    
    if (allCards.length < 5) {
      throw new Error('Need at least 5 cards to evaluate a hand')
    }
    
    // Get all possible 5-card combinations
    const combinations = this.getCombinations(allCards, 5)
    
    // Evaluate each combination and find the best one
    let bestHand: HandRank | null = null
    
    for (const combination of combinations) {
      const handRank = this.evaluateFiveCardHand(combination)
      
      if (!bestHand || handRank.rank > bestHand.rank || 
          (handRank.rank === bestHand.rank && this.compareHands(handRank, bestHand) > 0)) {
        bestHand = handRank
      }
    }
    
    return bestHand!
  }

  /**
   * Evaluate a 5-card hand
   */
  private static evaluateFiveCardHand(cards: Card[]): HandRank {
    const sorted = [...cards].sort(CardUtils.compareCards)
    
    // Check for each hand type from highest to lowest
    if (this.isRoyalFlush(sorted)) {
      return { rank: 10, name: 'Royal Flush', cards: sorted, kickers: [] }
    }
    if (this.isStraightFlush(sorted)) {
      return { rank: 9, name: 'Straight Flush', cards: sorted, kickers: [] }
    }
    if (this.isFourOfAKind(sorted)) {
      return { rank: 8, name: 'Four of a Kind', cards: sorted, kickers: [] }
    }
    if (this.isFullHouse(sorted)) {
      return { rank: 7, name: 'Full House', cards: sorted, kickers: [] }
    }
    if (this.isFlush(sorted)) {
      return { rank: 6, name: 'Flush', cards: sorted, kickers: [] }
    }
    if (this.isStraight(sorted)) {
      return { rank: 5, name: 'Straight', cards: sorted, kickers: [] }
    }
    if (this.isThreeOfAKind(sorted)) {
      return { rank: 4, name: 'Three of a Kind', cards: sorted, kickers: [] }
    }
    if (this.isTwoPair(sorted)) {
      return { rank: 3, name: 'Two Pair', cards: sorted, kickers: [] }
    }
    if (this.isOnePair(sorted)) {
      return { rank: 2, name: 'One Pair', cards: sorted, kickers: [] }
    }
    
    return { rank: 1, name: 'High Card', cards: sorted, kickers: [] }
  }

  /**
   * Check for Royal Flush (A, K, Q, J, 10 of same suit)
   */
  private static isRoyalFlush(cards: Card[]): boolean {
    return this.isStraightFlush(cards) && cards[0].value === 14
  }

  /**
   * Check for Straight Flush (5 consecutive cards of same suit)
   */
  private static isStraightFlush(cards: Card[]): boolean {
    return this.isFlush(cards) && this.isStraight(cards)
  }

  /**
   * Check for Four of a Kind (4 cards of same rank)
   */
  private static isFourOfAKind(cards: Card[]): boolean {
    const groups = this.groupByRank(cards)
    return Object.values(groups).some(group => group.length === 4)
  }

  /**
   * Check for Full House (3 of a kind + 2 of a kind)
   */
  private static isFullHouse(cards: Card[]): boolean {
    const groups = this.groupByRank(cards)
    const groupSizes = Object.values(groups).map(group => group.length).sort((a, b) => b - a)
    return groupSizes.length === 2 && groupSizes[0] === 3 && groupSizes[1] === 2
  }

  /**
   * Check for Flush (5 cards of same suit)
   */
  private static isFlush(cards: Card[]): boolean {
    return cards.every(card => card.suit === cards[0].suit)
  }

  /**
   * Check for Straight (5 consecutive cards)
   */
  private static isStraight(cards: Card[]): boolean {
    const values = cards.map(c => c.value).sort((a, b) => a - b)
    
    // Check for regular straight
    for (let i = 0; i < values.length - 1; i++) {
      if (values[i + 1] - values[i] !== 1) {
        return false
      }
    }
    
    return true
  }

  /**
   * Check for Three of a Kind (3 cards of same rank)
   */
  private static isThreeOfAKind(cards: Card[]): boolean {
    const groups = this.groupByRank(cards)
    return Object.values(groups).some(group => group.length === 3)
  }

  /**
   * Check for Two Pair (2 pairs of different ranks)
   */
  private static isTwoPair(cards: Card[]): boolean {
    const groups = this.groupByRank(cards)
    const pairs = Object.values(groups).filter(group => group.length === 2)
    return pairs.length === 2
  }

  /**
   * Check for One Pair (2 cards of same rank)
   */
  private static isOnePair(cards: Card[]): boolean {
    const groups = this.groupByRank(cards)
    return Object.values(groups).some(group => group.length === 2)
  }

  /**
   * Group cards by rank
   */
  private static groupByRank(cards: Card[]): Record<number, Card[]> {
    const groups: Record<number, Card[]> = {}
    for (const card of cards) {
      if (!groups[card.value]) {
        groups[card.value] = []
      }
      groups[card.value].push(card)
    }
    return groups
  }

  /**
   * Get all possible combinations of n cards from the given cards
   */
  private static getCombinations(cards: Card[], n: number): Card[][] {
    if (n === 0) return [[]]
    if (cards.length === 0) return []
    
    const [first, ...rest] = cards
    const withoutFirst = this.getCombinations(rest, n)
    const withFirst = this.getCombinations(rest, n - 1).map(combo => [first, ...combo])
    
    return [...withoutFirst, ...withFirst]
  }

  /**
   * Compare two hands of the same rank
   */
  private static compareHands(a: HandRank, b: HandRank): number {
    // For now, just compare the highest card in each hand
    const aMax = Math.max(...a.cards.map(c => c.value))
    const bMax = Math.max(...b.cards.map(c => c.value))
    return aMax - bMax
  }

  /**
   * Get a human-readable description of a hand
   */
  static getHandDescription(hand: HandRank): string {
    return `${hand.name}: ${hand.cards.map(CardUtils.getDisplayName).join(', ')}`
  }
} 