export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'
  rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'
  id: string
}

export interface Player {
  id: string
  name: string
  chips: number
  cards: Card[]
  isDealer: boolean
  isActive: boolean
  currentBet: number
  isFolded: boolean
  isAllIn: boolean
}

export type GamePhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'

export interface GameState {
  phase: GamePhase
  pot: number
  currentBet: number
  communityCards: Card[]
  players: Player[]
  dealer: number
  currentPlayer: number
}

export type PlayerAction = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in'

export interface GameAction {
  type: PlayerAction
  amount?: number
} 