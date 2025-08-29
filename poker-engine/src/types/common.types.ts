export type Brand<T, B extends string> = T & { readonly __brand: B };

export type UUID = Brand<string, 'UUID'>;
export type Chips = Brand<number, 'Chips'>;
export type SeatIndex = Brand<number, 'SeatIndex'>; // 0-based index at table
export type CardCode = Brand<string, 'CardCode'>;   // e.g., 'As', 'Td'

export enum Street {
  Preflop = 'PREFLOP',
  Flop = 'FLOP',
  Turn = 'TURN',
  River = 'RIVER',
  Showdown = 'SHOWDOWN',
}

export enum ActionType {
  Fold = 'FOLD',
  Check = 'CHECK',
  Call = 'CALL',
  Bet = 'BET',
  Raise = 'RAISE',
  AllIn = 'ALL_IN',
  SmallBlind = 'SMALL_BLIND',
  BigBlind = 'BIG_BLIND',
  Ante = 'ANTE',
}

export enum Position {
  SB = 'SB',
  BB = 'BB',
  UTG = 'UTG',
  UTG1 = 'UTG1',
  MP = 'MP',
  HJ = 'HJ',
  CO = 'CO',
  BTN = 'BTN',
}

export interface Timestamped {
  createdAt: string; // ISO
  updatedAt: string; // ISO
}
