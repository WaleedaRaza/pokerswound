import { Card, Suit, Rank } from '../types/card';
import { RANK_VALUES, SUITS, RANKS } from './constants';

/**
 * Creates a standard 52-card deck
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        suit: suit as Suit,
        rank: rank as Rank,
        value: RANK_VALUES[rank]
      });
    }
  }
  
  return deck;
}

/**
 * Shuffles a deck using Fisher-Yates algorithm
 * Note: This is a basic implementation. The actual shuffling will be done
 * server-side with cryptographically secure randomness.
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    // This will be replaced with crypto.randomInt() on the server
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Deals a specified number of cards from the deck
 */
export function dealCards(deck: Card[], count: number): { cards: Card[]; remainingDeck: Card[] } {
  if (count > deck.length) {
    throw new Error(`Cannot deal ${count} cards from deck with ${deck.length} cards`);
  }
  
  const cards = deck.slice(0, count);
  const remainingDeck = deck.slice(count);
  
  return { cards, remainingDeck };
}

/**
 * Formats a card for display
 */
export function formatCard(card: Card): string {
  return `${card.rank}${getSuitSymbol(card.suit)}`;
}

/**
 * Gets the Unicode symbol for a suit
 */
export function getSuitSymbol(suit: Suit): string {
  const symbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  };
  return symbols[suit];
}

/**
 * Gets the color class for a suit (for styling)
 */
export function getSuitColor(suit: Suit): 'red' | 'black' {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}

/**
 * Compares two cards by value
 */
export function compareCards(a: Card, b: Card): number {
  return b.value - a.value; // Higher value first
}

/**
 * Sorts cards by value (highest first)
 */
export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort(compareCards);
}

/**
 * Checks if two cards are equal
 */
export function cardsEqual(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

/**
 * Removes cards from a deck
 */
export function removeCards(deck: Card[], cardsToRemove: Card[]): Card[] {
  return deck.filter(card => 
    !cardsToRemove.some(removeCard => cardsEqual(card, removeCard))
  );
} 