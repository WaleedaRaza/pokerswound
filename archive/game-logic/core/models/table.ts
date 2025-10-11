import { Deck } from '../card';
import type { SeatIndex, UUID } from '../../types';
import type { Card } from '../card/card';

export class TableModel {
  public dealerButton: SeatIndex = 0 as SeatIndex;
  public smallBlindPosition: SeatIndex = 0 as SeatIndex;
  public bigBlindPosition: SeatIndex = 0 as SeatIndex;
  
  // Alias for compatibility
  public get dealerPosition(): SeatIndex {
    return this.dealerButton;
  }
  
  public set dealerPosition(value: SeatIndex) {
    this.dealerButton = value;
  }
  public community: Card[] = [];
  public readonly deck: Deck;
  public seats: (UUID | null)[] = [];

  constructor(deck?: Deck) {
    this.deck = deck ?? new Deck();
    // lazy-init seats; caller should size it against MAX_PLAYERS_PER_TABLE
    this.seats = [];
  }

  public reset(): void {
    this.community = [];
    this.deck.restore();
  }

  public initSeats(size: number): void {
    if (size <= 0) throw new Error('Seat size must be > 0');
    this.seats = new Array(size).fill(null);
  }

  public seatPlayer(player: any): void {
    if (!this.seats.length) this.initSeats(10); // Auto-initialize if needed
    const index = player.seatIndex as number;
    if (index < 0 || index >= this.seats.length) throw new Error('Invalid seat index');
    if (this.seats[index]) throw new Error('Seat already occupied');
    if (this.seats.includes(player.uuid)) throw new Error('Player already seated');
    this.seats[index] = player.uuid;
  }

  public unseatPlayer(player: any): void {
    const idx = this.seats.findIndex((s) => s === player.uuid);
    if (idx >= 0) this.seats[idx] = null;
  }

  public rotateDealer(): void {
    if (!this.seats.length) throw new Error('Seats not initialized');
    const n = this.seats.length;
    const current = this.dealerButton as unknown as number;
    this.dealerButton = ((current + 1) % n) as SeatIndex;
  }

  public setBlinds(sbIndex: SeatIndex, bbIndex: SeatIndex): void {
    this.smallBlindPosition = sbIndex;
    this.bigBlindPosition = bbIndex;
  }

  public addCommunity(card: Card): void {
    if (this.community.length >= 5) throw new Error('Community already full');
    this.community.push(card);
  }
}
