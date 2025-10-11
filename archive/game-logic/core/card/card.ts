import { Suit } from './suit';
import { Rank } from './rank';
import type { CardCode } from '../../types';

export class Card {
  public readonly suit: Suit;
  public readonly rank: Rank;
  public readonly code: CardCode;

  constructor(suit: Suit, rank: Rank) {
    this.suit = suit;
    this.rank = rank;
    this.code = `${suit}${rankToCode(rank)}` as CardCode; // e.g., 'C2', 'HA'
  }

  public toString(): string {
    return this.code;
  }
}

export function rankToCode(rank: Rank): string {
  if (rank >= Rank.Two && rank <= Rank.Nine) return String(rank);
  switch (rank) {
    case Rank.Ten:
      return 'T';
    case Rank.Jack:
      return 'J';
    case Rank.Queen:
      return 'Q';
    case Rank.King:
      return 'K';
    case Rank.Ace:
      return 'A';
    default:
      return String(rank);
  }
}
