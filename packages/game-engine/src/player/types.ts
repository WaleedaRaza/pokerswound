import { Card } from '../deck/types';

export interface Player {
  id: string;
  name: string;
  avatar?: string;
  chips: number;
  isOnline: boolean;
  isReady: boolean;
  lastSeen: number;
  totalHandsPlayed: number;
  totalWinnings: number;
  biggestPot: number;
  joinTime: number;
}

export interface PlayerInGame extends Player {
  position: number; // Seat position at table
  holeCards: Card[];
  isActive: boolean;
  isFolded: boolean;
  isAllIn: boolean;
  currentBet: number;
  lastAction?: string;
  lastActionAmount?: number;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  timeBank: number; // Time remaining for this player's turn
}

export interface PlayerStats {
  playerId: string;
  handsPlayed: number;
  handsWon: number;
  totalWinnings: number;
  biggestPot: number;
  averageBet: number;
  foldRate: number;
  vpip: number; // Voluntarily Put Money In Pot
  pfr: number; // Pre-Flop Raise
  af: number; // Aggression Factor
}

export interface PlayerAction {
  playerId: string;
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all_in';
  amount?: number;
  timestamp: number;
}

export interface PlayerConnection {
  playerId: string;
  socketId: string;
  isConnected: boolean;
  lastPing: number;
  reconnectToken?: string;
} 