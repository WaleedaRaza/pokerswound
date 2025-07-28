export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'
export type PlayerAction = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in'
export type GamePhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'complete'

export interface Card {
  suit: Suit
  rank: Rank
  id: string
}

export interface Player {
  id: string
  name: string
  chips: number
  cards: Card[]
  currentBet: number
  isFolded: boolean
  isAllIn: boolean
  isDealer: boolean
  isSmallBlind: boolean
  isBigBlind: boolean
  lastAction?: PlayerAction
  lastActionAmount?: number
  position: number // Seat position at table
  isActive: boolean
  isOnline: boolean
  timeBank: number // Time remaining for this player's turn
  avatar?: string
  totalHandsPlayed: number
  totalWinnings: number
  biggestPot: number
}

export interface GameState {
  id: string
  phase: GamePhase
  pot: number
  sidePots: SidePot[]
  currentBet: number
  minRaise: number
  maxRaise: number
  communityCards: Card[]
  players: Player[]
  dealer: number
  currentPlayer: number
  smallBlindAmount: number
  bigBlindAmount: number
  deck: any // Deck state for entropy tracking
  entropyHash?: string
  shuffleTimestamp?: number
  handNumber: number
  startTime: number
  lastActionTime: number
  turnTimeout: number // seconds
  gameHistory: GameHistoryEntry[]
}

export interface SidePot {
  id: string
  amount: number
  eligiblePlayers: string[] // Player IDs who can win this pot
  type: 'main' | 'side'
  allInPlayers: string[] // Players who went all-in to create this pot
}

export interface GameHistoryEntry {
  playerId: string
  action: PlayerAction
  amount?: number
  phase: GamePhase
  timestamp: number
}

export interface HandEvaluation {
  rank: string
  cards: Card[]
  kickers: Card[]
  score: number
  description: string
}

export interface GameResult {
  winners: Array<{
    playerId: string
    amount: number
    hand: HandEvaluation
    position: number
  }>
  handEvaluations: Record<string, HandEvaluation>
  potDistribution: Array<{
    playerId: string
    amount: number
    reason: string
  }>
  handHistory: GameHistoryEntry[]
}

// Socket.IO event types for your friend's integration
export interface SocketEvents {
  // Game state updates
  'game-state-update': GameState
  'player-joined': { playerId: string; player: Player }
  'player-left': { playerId: string }
  'player-action': { playerId: string; action: PlayerAction; amount?: number }
  'phase-change': { phase: GamePhase; communityCards?: Card[] }
  'showdown-results': GameResult
  
  // Player actions
  'fold': { playerId: string }
  'check': { playerId: string }
  'call': { playerId: string; amount: number }
  'bet': { playerId: string; amount: number }
  'raise': { playerId: string; amount: number }
  'all-in': { playerId: string; amount: number }
  
  // Chat and social
  'chat-message': { playerId: string; message: string; timestamp: number }
  'player-typing': { playerId: string; isTyping: boolean }
  
  // Game management
  'game-created': { gameId: string; gameState: GameState }
  'game-started': { gameId: string; gameState: GameState }
  'game-ended': { gameId: string; results: GameResult }
  'hand-complete': { handNumber: number; results: GameResult }
  
  // Entropy and fairness
  'entropy-update': { 
    totalEntropyBits: number
    sources: Array<{ id: string; name: string; entropyBits: number; status: string }>
    lastUpdate: number
  }
  'shuffle-proof': { 
    entropyHash: string
    timestamp: number
    sources: string[]
    proof: string
  }
}

// Room management types for your friend
export interface GameRoom {
  id: string
  name: string
  status: 'waiting' | 'playing' | 'finished' | 'cancelled'
  maxPlayers: number
  minPlayers: number
  buyIn: number
  smallBlind: number
  bigBlind: number
  createdAt: number
  startedAt?: number
  endedAt?: number
  gameState: GameState
  players: Player[]
  spectators: string[] // Player IDs who are watching
  settings: GameSettings
}

export interface GameSettings {
  turnTimeout: number
  autoDeal: boolean
  allowSpectators: boolean
  maxSpectators: number
  chatEnabled: boolean
  showHandEvaluations: boolean
  provablyFair: boolean
}

// Player session management
export interface PlayerSession {
  playerId: string
  socketId: string
  isConnected: boolean
  lastPing: number
  reconnectToken?: string
  gameId?: string
  position?: number
}

// Database models that match Prisma schema
export interface DatabaseGame {
  id: string
  name: string
  status: 'WAITING' | 'PLAYING' | 'FINISHED' | 'CANCELLED'
  maxPlayers: number
  minPlayers: number
  smallBlind: number
  bigBlind: number
  buyIn: number
  createdAt: Date
  updatedAt: Date
  startedAt?: Date
  endedAt?: Date
  entropyHash?: string
  shuffleTimestamp?: Date
}

export interface DatabasePlayer {
  id: string
  userId: string
  gameId: string
  position: number
  chips: number
  isActive: boolean
  isDealer: boolean
  joinedAt: Date
  leftAt?: Date
}

export interface DatabaseHand {
  id: string
  gameId: string
  handNumber: number
  phase: 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN' | 'COMPLETE'
  pot: number
  communityCards: string[] // JSON array of card IDs
  entropyHash?: string
  shuffleTimestamp?: Date
  createdAt: Date
  endedAt?: Date
} 