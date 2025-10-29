import type { UUID, Chips, Hole2 } from '../../types';

export class PlayerModel {
  public readonly uuid: UUID;
  public userId?: string; // Link to user_profiles for hydration matching
  public name: string;
  public stack: Chips;
  public seatIndex: number;
  public hole?: Hole2;
  
  // Alias for compatibility
  public get holeCards(): Hole2 | undefined {
    return this.hole;
  }
  
  public set holeCards(value: Hole2 | undefined) {
    this.hole = value;
  }
  public hasFolded = false;
  public isAllIn = false;
  public isActive = true;
  public hasLeft = false;
  public betThisStreet = 0 as Chips;

  constructor(params: { uuid: UUID; name: string; stack: Chips; seatIndex?: number }) {
    this.uuid = params.uuid;
    this.name = params.name;
    this.stack = params.stack;
    this.seatIndex = params.seatIndex ?? 0;
  }

  public addHole(cards: Hole2): void {
    if (this.hole && this.hole.length > 0) throw new Error('Hole cards already set');
    if (cards.length !== 2) throw new Error('Hole must be exactly 2 cards');
    this.hole = cards;
  }

  public collectBet(amount: Chips): void {
    const n = amount as unknown as number;
    if (n < 0) throw new Error('Bet amount must be >= 0');
    const stackNum = this.stack as unknown as number;
    if (stackNum < n) throw new Error('Insufficient stack');
    this.stack = (stackNum - n) as Chips;
    this.betThisStreet = ((this.betThisStreet as unknown as number) + n) as Chips;
    if ((this.stack as unknown as number) === 0) this.isAllIn = true;
  }

  public appendChips(amount: Chips): void {
    const n = amount as unknown as number;
    if (n < 0) throw new Error('Append amount must be >= 0');
    this.stack = ((this.stack as unknown as number) + n) as Chips;
  }

  public fold(): void {
    this.hasFolded = true;
  }

  public allIn(): void {
    const stackNum = this.stack as unknown as number;
    if (stackNum > 0) {
      this.betThisStreet = ((this.betThisStreet as unknown as number) + stackNum) as Chips;
      this.stack = 0 as Chips;
    }
    this.isAllIn = true;
  }

  public resetForNewStreet(): void {
    this.betThisStreet = 0 as Chips;
  }

  public resetForNewHand(): void {
    this.hasFolded = false;
    this.isAllIn = false;
    this.betThisStreet = 0 as Chips;
    this.hole = undefined;
  }

  public addHoleCard(card: any): void {
    if (!this.hole) this.hole = [] as any;
    (this.hole as any).push(card);
  }

  public setStack(amount: Chips): void {
    this.stack = amount;
  }

  public toSnapshot(): any {
    return {
      uuid: this.uuid,
      userId: this.userId, // Link to user for hole cards matching
      name: this.name,
      stack: this.stack,
      seatIndex: this.seatIndex,
      hasFolded: this.hasFolded,
      isAllIn: this.isAllIn,
      isActive: this.isActive,
      hasLeft: this.hasLeft,
      betThisStreet: this.betThisStreet,
      hole: this.hole,
      holeCards: this.hole // Alias for hydration compatibility
    };
  }

  public static fromSnapshot(data: any): PlayerModel {
    const player = new PlayerModel({
      uuid: data.uuid,
      name: data.name,
      stack: data.stack,
      seatIndex: data.seatIndex
    });
    player.userId = data.userId; // Restore userId link
    player.hasFolded = data.hasFolded || false;
    player.isAllIn = data.isAllIn || false;
    player.isActive = data.isActive !== undefined ? data.isActive : true;
    player.hasLeft = data.hasLeft || false;
    player.betThisStreet = data.betThisStreet || 0;
    player.hole = data.hole || data.holeCards; // Support both property names
    return player;
  }
}
