import { Card } from './card';
import { Suit, ALL_SUITS } from './suit';
import { Rank, ALL_RANKS_ASC } from './rank';

export type RandomFn = () => number; // [0,1)

export class Deck {
  private readonly original: ReadonlyArray<Card>;
  private cards: Card[];
  private rng: RandomFn;

  constructor(rng: RandomFn = Math.random) {
    this.rng = rng;
    this.original = buildOrderedDeck();
    this.cards = [...this.original];
  }

  public shuffle(): void {
    fisherYates(this.cards, this.rng);
  }

  public drawOne(): Card {
    if (this.cards.length === 0) throw new Error('Deck is empty');
    return this.cards.pop() as Card;
  }

  public drawMany(count: number): Card[] {
    if (count < 0) throw new Error('Count must be >= 0');
    if (this.cards.length < count) throw new Error('Not enough cards');
    const out: Card[] = new Array(count);
    for (let i = 0; i < count; i += 1) out[i] = this.drawOne();
    return out;
  }

  public size(): number {
    return this.cards.length;
  }

  public restore(): void {
    this.cards = [...this.original];
  }
}

function buildOrderedDeck(): ReadonlyArray<Card> {
  const deck: Card[] = [];
  for (const suit of ALL_SUITS) {
    for (const rank of ALL_RANKS_ASC) {
      deck.push(new Card(suit as Suit, rank as Rank));
    }
  }
  return deck;
}

function fisherYates<T>(arr: T[], rng: RandomFn): void {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i] as T;
    arr[i] = arr[j] as T;
    arr[j] = tmp as T;
  }
}
