import { Card } from './card';

export type PlayerStatus = 'waiting' | 'ready' | 'playing' | 'folded' | 'all-in' | 'disconnected';

export type PlayerAction = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

export interface Player {
  id: string;
  name: string;
  chips: number;
  bet: number;
  hand: Card[];
  status: PlayerStatus;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  isCurrentTurn: boolean;
  lastAction?: PlayerAction;
  lastActionAmount?: number;
  connected: boolean;
  avatar?: string;
}

export interface PlayerActionRequest {
  playerId: string;
  action: PlayerAction;
  amount?: number; // For raise/all-in
}

export interface PlayerStats {
  handsPlayed: number;
  handsWon: number;
  totalWinnings: number;
  biggestPot: number;
} 