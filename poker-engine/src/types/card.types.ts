import type { CardCode } from './common.types';

export enum Suit {
  Clubs = 'C',
  Diamonds = 'D',
  Hearts = 'H',
  Spades = 'S',
}

export enum Rank {
  Two = 2,
  Three = 3,
  Four = 4,
  Five = 5,
  Six = 6,
  Seven = 7,
  Eight = 8,
  Nine = 9,
  Ten = 10,
  Jack = 11,
  Queen = 12,
  King = 13,
  Ace = 14,
}

export interface Card {
  suit: Suit;
  rank: Rank;
  code: CardCode; // e.g., 'AS', 'TD'
}

export type Hand5 = readonly [Card, Card, Card, Card, Card];
export type Hole2 = readonly [Card, Card];
export type Community = readonly Card[]; // 0..5
