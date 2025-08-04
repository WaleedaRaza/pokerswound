// Core types for the poker application

export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  tokenBalance: number;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Game {
  id: string;
  name: string;
  gameType: GameType;
  maxPlayers: number;
  minBet: number;
  maxBet: number;
  status: GameStatus;
  currentHand?: Hand;
  createdAt: Date;
  updatedAt: Date;
  players: GamePlayer[];
}

export interface GamePlayer {
  id: string;
  userId: string;
  gameId: string;
  seat: number;
  chips: number;
  isDealer: boolean;
  isActive: boolean;
  joinedAt: Date;
  user: User;
  holeCards?: string[]; // Private cards for current hand
  currentBet?: number; // Current bet in this round
  hasActed?: boolean; // Whether player has acted in current round
}

export interface Hand {
  id: string;
  gameId: string;
  handNumber: number;
  pot: number;
  communityCards: string[];
  winnerIds: string[];
  entropy?: string;
  entropySources: string[];
  startedAt: Date;
  endedAt?: Date;
  actions: HandAction[];
  currentRound: PokerRound;
  currentPlayer?: string; // ID of player whose turn it is
  lastAction?: HandAction;
}

export interface HandAction {
  id: string;
  handId: string;
  userId: string;
  actionType: ActionType;
  amount?: number;
  cards?: string[];
  timestamp: Date;
}

export interface ChatMessage {
  id: string;
  userId: string;
  gameId?: string;
  message: string;
  createdAt: Date;
  user: User;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  description: string;
  reference?: string;
  createdAt: Date;
}

export interface Friendship {
  id: string;
  userId: string;
  friendId: string;
  status: FriendshipStatus;
  createdAt: Date;
  updatedAt: Date;
  user: User;
  friend: User;
}

// Enums
export enum GameType {
  TEXAS_HOLDEM = 'TEXAS_HOLDEM',
  OMAHA = 'OMAHA',
  SEVEN_CARD_STUD = 'SEVEN_CARD_STUD'
}

export enum GameStatus {
  WAITING = 'WAITING',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED'
}

export enum ActionType {
  FOLD = 'FOLD',
  CHECK = 'CHECK',
  CALL = 'CALL',
  BET = 'BET',
  RAISE = 'RAISE',
  ALL_IN = 'ALL_IN',
  SHOW = 'SHOW'
}

export enum TransactionType {
  PURCHASE = 'PURCHASE',
  WIN = 'WIN',
  LOSS = 'LOSS',
  BONUS = 'BONUS',
  REFUND = 'REFUND'
}

export enum FriendshipStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  BLOCKED = 'BLOCKED'
}

export enum PokerRound {
  PREFLOP = 'PREFLOP',
  FLOP = 'FLOP',
  TURN = 'TURN',
  RIVER = 'RIVER',
  SHOWDOWN = 'SHOWDOWN'
}

// Socket.IO event types
export interface SocketEvents {
  // Client to Server
  'join-game': { gameId: string };
  'leave-game': { gameId: string };
  'player-action': {
    gameId: string;
    handId: string;
    action: ActionType;
    amount?: number;
    cards?: string[];
  };
  'chat-message': { gameId: string; message: string };
  'typing': { gameId: string; isTyping: boolean };

  // Server to Client
  'game-updated': { game: Game };
  'hand-started': { hand: Hand };
  'hand-ended': { hand: Hand; winners: string[] };
  'player-joined': { player: GamePlayer };
  'player-left': { userId: string; seat: number };
  'action-performed': { action: HandAction };
  'chat-message-received': { message: ChatMessage };
  'error': { message: string; code?: string };
  'notification': { message: string; type: 'info' | 'success' | 'warning' | 'error' };
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface GameListResponse {
  games: Game[];
  total: number;
  page: number;
  limit: number;
}

// Entropy and randomness types
export interface EntropySource {
  type: 'youtube' | 'twitch';
  data: any;
  timestamp: Date;
}

export interface EntropyResult {
  hash: string;
  sources: EntropySource[];
  timestamp: Date;
}

// Card types
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  value: number; // Numeric value for comparison
}

export type CardString = `${Rank}${Suit[0].toUpperCase()}`; // e.g., "AS", "KH", "10D"

// Game state management
export interface GameState {
  game: Game;
  currentHand?: Hand;
  players: Map<string, GamePlayer>;
  deck: Card[];
  pot: number;
  currentBet: number;
  currentPlayer?: string;
  round: PokerRound;
  lastAction?: HandAction;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface TokenPurchaseRequest {
  amount: number;
  paymentMethod: string;
  paymentToken: string;
}

// WebSocket connection types
export interface SocketUser {
  id: string;
  username: string;
  gameId?: string;
  isAuthenticated: boolean;
}

// Error types
export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  isOperational?: boolean;
}

// Configuration types
export interface AppConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  redisUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  youtubeApiKey: string;
  twitchClientId: string;
  twitchClientSecret: string;
  corsOrigin: string[];
} 