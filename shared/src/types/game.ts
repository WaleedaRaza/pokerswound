import { Card, Hand } from './card';
import { Player } from './player';

export type GamePhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'finished';

export type GameStatus = 'waiting' | 'playing' | 'paused' | 'finished';

export interface GameState {
  id: string;
  phase: GamePhase;
  status: GameStatus;
  players: Player[];
  communityCards: Card[];
  pot: number;
  currentBet: number;
  dealerIndex: number;
  currentPlayerIndex: number;
  smallBlind: number;
  bigBlind: number;
  deck: Card[];
  winners: Player[];
  handHistory: HandHistory[];
  roundNumber: number;
  provableFairness?: ProvableFairnessData;
}

export interface HandHistory {
  roundNumber: number;
  winners: Player[];
  winningHand: Hand;
  pot: number;
  actions: GameAction[];
}

export interface GameAction {
  playerId: string;
  action: string;
  amount?: number;
  timestamp: number;
}

export interface ProvableFairnessData {
  clientSeed: string;
  serverSeed: string;
  deckHash: string;
  revealed: boolean;
}

export interface GameSettings {
  smallBlind: number;
  bigBlind: number;
  maxPlayers: number;
  minPlayers: number;
  timeBank: number; // seconds
  enableProvableFairness: boolean;
} 