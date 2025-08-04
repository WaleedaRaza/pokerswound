import { Card } from '../deck/types';

export enum HandRank {
  HIGH_CARD = 1,
  PAIR = 2,
  TWO_PAIR = 3,
  THREE_OF_A_KIND = 4,
  STRAIGHT = 5,
  FLUSH = 6,
  FULL_HOUSE = 7,
  FOUR_OF_A_KIND = 8,
  STRAIGHT_FLUSH = 9,
  ROYAL_FLUSH = 10
}

export interface HandEvaluation {
  rank: HandRank;
  cards: Card[];
  kickers: Card[]; // Cards used to break ties
  score: number; // Numeric score for comparison
  description: string;
}

export interface HandComparison {
  winner: 'player1' | 'player2' | 'tie';
  player1Hand: HandEvaluation;
  player2Hand: HandEvaluation;
  reason: string;
}

export interface HandRanking {
  playerId: string;
  hand: HandEvaluation;
  position: number; // 1 = winner, 2 = runner up, etc.
} 