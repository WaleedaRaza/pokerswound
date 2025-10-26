import type { UUID, Chips, SeatIndex } from './common.types';
import type { Street, ActionType } from './common.types';
import type { Card, Hole2 } from './card.types';

export interface PlayerSnapshot {
  uuid: UUID;
  name: string;
  stack: Chips;
  seatIndex: SeatIndex;
  hole?: Hole2 | undefined; // present if owned/view privilege
  hasFolded: boolean;
  isAllIn: boolean;
  lastAction?: ActionType;
  betThisStreet: Chips;
}

export interface PotBreakdown {
  main: Chips;
  sidePots: Chips[]; // order: earliest side pot first
}

export interface Action {
  player: UUID;
  type: ActionType;
  amount?: Chips; // for bet/raise/call/ante/blinds
  timestamp: string; // ISO
}

export interface TableSnapshot {
  dealerPosition: SeatIndex;
  smallBlindPosition: SeatIndex;
  bigBlindPosition: SeatIndex;
  community: ReadonlyArray<Card>;
  currentStreet: Street;
  toAct: UUID | null;
}

export interface GameStateSnapshot {
  id: string;
  createdAt: string;
  updatedAt: string;
  players: ReadonlyArray<PlayerSnapshot>;
  table: TableSnapshot;
  pot: PotBreakdown;
  actionHistory: ReadonlyArray<Action>;
}

/**
 * Domain Event types for event sourcing
 */
export interface DomainEvent {
  id?: string;
  gameId: string;
  eventType: string;
  eventData: any;
  version?: number;
  userId?: string;
  timestamp?: Date;
  sequence?: number;
  metadata?: any;
}

export interface GameEvent extends DomainEvent {
  eventType: 
    | 'GAME_CREATED'
    | 'HAND_STARTED'
    | 'PLAYER_JOINED'
    | 'PLAYER_ACTION'
    | 'STREET_ADVANCED'
    | 'HAND_COMPLETED'
    | 'GAME_ENDED';
}
