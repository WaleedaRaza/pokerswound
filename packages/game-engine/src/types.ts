export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'

export interface Card {
  suit: Suit
  rank: Rank
  value: number // 2-14 (Ace = 14)
  id: string
}

export interface Player {
  id: string
  name: string
  chips: number
  bet: number
  folded: boolean
  allIn: boolean
  cards: Card[]
  isDealer: boolean
  isSmallBlind: boolean
  isBigBlind: boolean
  isCurrentPlayer: boolean
  lastAction?: PlayerAction
  timeBank: number
  position: number
}

export type GamePhase = 
  | 'waiting' 
  | 'preflop' 
  | 'flop' 
  | 'turn' 
  | 'river' 
  | 'showdown' 
  | 'handComplete'

export type PlayerAction = 
  | 'fold' 
  | 'check' 
  | 'call' 
  | 'bet' 
  | 'raise' 
  | 'allIn'

export interface GameState {
  players: Player[]
  communityCards: Card[]
  pot: number
  currentBet: number
  phase: GamePhase
  handNumber: number
  dealerIndex: number
  currentPlayerIndex: number
  smallBlind: number
  bigBlind: number
  minRaise: number
  deck: Card[]
  lastAction?: {
    playerId: string
    action: PlayerAction
    amount?: number
  }
  winners?: Player[]
  winningHand?: string
}

export interface HandRank {
  rank: number // 1-10 (1 = High Card, 10 = Royal Flush)
  name: string
  cards: Card[]
  kickers: Card[]
}

export interface GameSettings {
  smallBlind: number
  bigBlind: number
  startingChips: number
  timeBank: number
  autoFoldDelay: number
}

export interface ShuffleSeed {
  seed: string
  entropyHash: string
  timestamp: number
  sources: string[]
  proof: string
} 