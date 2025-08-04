export enum Suit {
  HEARTS = 'hearts',
  DIAMONDS = 'diamonds',
  CLUBS = 'clubs',
  SPADES = 'spades'
}

export enum Rank {
  TWO = 2,
  THREE = 3,
  FOUR = 4,
  FIVE = 5,
  SIX = 6,
  SEVEN = 7,
  EIGHT = 8,
  NINE = 9,
  TEN = 10,
  JACK = 11,
  QUEEN = 12,
  KING = 13,
  ACE = 14
}

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // Unique identifier for each card
}

export interface Deck {
  cards: Card[];
  entropyHash?: string; // Hash of entropy used for shuffling
  shuffleTimestamp?: number;
}

export interface ShuffleResult {
  deck: Deck;
  entropyHash: string;
  shuffleTimestamp: number;
  serverSeed?: string; // For provably fair mode
  clientSeed?: string; // For provably fair mode
} 