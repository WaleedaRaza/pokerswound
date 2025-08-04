import { Card } from '../deck/types';
import { HandEvaluation } from '../hand-eval/types';

export enum GamePhase {
  WAITING_FOR_PLAYERS = 'waiting_for_players',
  PREFLOP = 'preflop',
  FLOP = 'flop',
  TURN = 'turn',
  RIVER = 'river',
  SHOWDOWN = 'showdown',
  HAND_COMPLETE = 'hand_complete'
}

export enum PlayerAction {
  FOLD = 'fold',
  CHECK = 'check',
  CALL = 'call',
  BET = 'bet',
  RAISE = 'raise',
  ALL_IN = 'all_in'
}

export interface PlayerState {
  id: string;
  name: string;
  chips: number;
  holeCards: Card[];
  isActive: boolean;
  isFolded: boolean;
  isAllIn: boolean;
  currentBet: number;
  lastAction?: PlayerAction;
  lastActionAmount?: number;
  position: number; // Seat position at table
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
}

export interface GameState {
  id: string;
  phase: GamePhase;
  players: PlayerState[];
  communityCards: Card[];
  pot: number;
  sidePots: SidePot[];
  currentPlayerId?: string;
  dealerPosition: number;
  smallBlindPosition: number;
  bigBlindPosition: number;
  smallBlindAmount: number;
  bigBlindAmount: number;
  currentBet: number;
  minRaise: number;
  deck: any; // Deck state
  handHistory: HandHistoryEntry[];
  startTime: number;
  lastActionTime: number;
  turnTimeout: number; // seconds
}

export interface SidePot {
  amount: number;
  eligiblePlayers: string[]; // Player IDs
}

export interface HandHistoryEntry {
  playerId: string;
  action: PlayerAction;
  amount?: number;
  timestamp: number;
  phase: GamePhase;
}

export interface GameAction {
  type: 'player_action' | 'phase_change' | 'player_join' | 'player_leave';
  playerId?: string;
  action?: PlayerAction;
  amount?: number;
  phase?: GamePhase;
  timestamp: number;
}

export interface GameResult {
  winners: Winner[];
  handEvaluations: Record<string, HandEvaluation>;
  potDistribution: PotDistribution[];
  handHistory: HandHistoryEntry[];
}

export interface Winner {
  playerId: string;
  amount: number;
  hand: HandEvaluation;
  position: number; // 1 = winner, 2 = runner up, etc.
}

export interface PotDistribution {
  playerId: string;
  amount: number;
  reason: string; // 'winner', 'side_pot_winner', etc.
} 