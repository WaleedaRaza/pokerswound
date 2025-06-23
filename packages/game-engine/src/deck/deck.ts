import { Card, Suit, Rank, Deck } from './types';

export class DeckManager {
  /**
   * Creates a standard 52-card deck
   */
  static createDeck(): Deck {
    const cards: Card[] = [];
    
    Object.values(Suit).forEach(suit => {
      Object.values(Rank).forEach(rank => {
        cards.push({
          suit,
          rank,
          id: `${suit}_${rank}`
        });
      });
    });
    
    return { cards };
  }

  /**
   * Validates that a deck contains exactly 52 unique cards
   */
  static validateDeck(deck: Deck): boolean {
    if (deck.cards.length !== 52) return false;
    
    const cardIds = new Set(deck.cards.map(card => card.id));
    return cardIds.size === 52;
  }

  /**
   * Returns the number of cards remaining in the deck
   */
  static getRemainingCards(deck: Deck): number {
    return deck.cards.length;
  }

  /**
   * Draws a specified number of cards from the deck
   */
  static drawCards(deck: Deck, count: number): { drawn: Card[], remaining: Deck } {
    if (count > deck.cards.length) {
      throw new Error(`Cannot draw ${count} cards from deck with ${deck.cards.length} cards`);
    }
    
    const drawn = deck.cards.slice(0, count);
    const remaining = {
      ...deck,
      cards: deck.cards.slice(count)
    };
    
    return { drawn, remaining };
  }

  /**
   * Returns a single card from the deck
   */
  static drawCard(deck: Deck): { card: Card, remaining: Deck } {
    const result = this.drawCards(deck, 1);
    return {
      card: result.drawn[0],
      remaining: result.remaining
    };
  }
} 