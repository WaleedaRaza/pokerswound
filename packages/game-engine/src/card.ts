import { Card, Suit, Rank } from './types'

export class CardUtils {
  static readonly SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
  static readonly RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
  
  static readonly RANK_VALUES: Record<Rank, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14
  }

  /**
   * Create a standard 52-card deck
   */
  static createDeck(): Card[] {
    const deck: Card[] = []
    
    for (const suit of this.SUITS) {
      for (const rank of this.RANKS) {
        deck.push({
          suit,
          rank,
          value: this.RANK_VALUES[rank],
          id: `${suit}_${rank}`
        })
      }
    }
    
    return deck
  }

  /**
   * Create a card from string representation (e.g., "AS" for Ace of Spades)
   */
  static fromString(cardStr: string): Card {
    if (cardStr.length !== 2) {
      throw new Error(`Invalid card string: ${cardStr}`)
    }
    
    const rankChar = cardStr[0].toUpperCase()
    const suitChar = cardStr[1].toLowerCase()
    
    const rankMap: Record<string, Rank> = {
      '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
      'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A'
    }
    
    const suitMap: Record<string, Suit> = {
      'h': 'hearts', 'd': 'diamonds', 'c': 'clubs', 's': 'spades'
    }
    
    const rank = rankMap[rankChar]
    const suit = suitMap[suitChar]
    
    if (!rank || !suit) {
      throw new Error(`Invalid card string: ${cardStr}`)
    }
    
    return {
      suit,
      rank,
      value: this.RANK_VALUES[rank],
      id: `${suit}_${rank}`
    }
  }

  /**
   * Convert card to string representation
   */
  static toString(card: Card): string {
    const rankMap: Record<Rank, string> = {
      '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
      '10': 'T', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A'
    }
    
    const suitMap: Record<Suit, string> = {
      'hearts': 'h', 'diamonds': 'd', 'clubs': 'c', 'spades': 's'
    }
    
    return `${rankMap[card.rank]}${suitMap[card.suit].toUpperCase()}`
  }

  /**
   * Compare two cards by value (for sorting)
   */
  static compareCards(a: Card, b: Card): number {
    return b.value - a.value // Descending order (high to low)
  }

  /**
   * Check if two cards are equal
   */
  static areEqual(a: Card, b: Card): boolean {
    return a.suit === b.suit && a.rank === b.rank
  }

  /**
   * Get the display name of a card
   */
  static getDisplayName(card: Card): string {
    const rankNames: Record<Rank, string> = {
      '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
      '10': '10', 'J': 'Jack', 'Q': 'Queen', 'K': 'King', 'A': 'Ace'
    }
    
    const suitNames: Record<Suit, string> = {
      'hearts': 'Hearts', 'diamonds': 'Diamonds', 'clubs': 'Clubs', 'spades': 'Spades'
    }
    
    return `${rankNames[card.rank]} of ${suitNames[card.suit]}`
  }

  /**
   * Get the symbol for a suit
   */
  static getSuitSymbol(suit: Suit): string {
    const symbols: Record<Suit, string> = {
      'hearts': '♥',
      'diamonds': '♦',
      'clubs': '♣',
      'spades': '♠'
    }
    return symbols[suit]
  }

  /**
   * Check if a card is a face card (J, Q, K)
   */
  static isFaceCard(card: Card): boolean {
    return card.rank === 'J' || card.rank === 'Q' || card.rank === 'K'
  }

  /**
   * Check if a card is an Ace
   */
  static isAce(card: Card): boolean {
    return card.rank === 'A'
  }
} 