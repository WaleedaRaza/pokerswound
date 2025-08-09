import { PrismaClient, Game, Hand, HandAction, PlayerAction, HandPhase } from '@prisma/client'
import { Server } from 'socket.io'
import { PokerGameEngine, GameSettings } from '@entropoker/game-engine'

interface GameState {
  game: Game
  currentHand: Hand | null
  players: Array<{
    id: string
    userId: string
    username: string
    position: number
    chips: number
    isDealer: boolean
    isActive: boolean
    holeCards?: string[]
    currentBet: number
    lastAction?: PlayerAction
  }>
  communityCards: string[]
  pot: number
  currentBet: number
  phase: HandPhase
  currentPlayerId?: string
  handNumber: number
}

interface PlayerActionResult {
  success: boolean
  error?: string
  gameState?: GameState
}

export class GameManager {
  private gameEngines: Map<string, PokerGameEngine> = new Map()
  private prisma: PrismaClient
  private io: Server

  constructor(prisma: PrismaClient, io: Server) {
    this.prisma = prisma
    this.io = io
  }

  /**
   * Create a new game
   */
  async createGame(data: {
    name: string
    maxPlayers: number
    buyIn: number
    smallBlind: number
    bigBlind: number
    createdBy: string
  }): Promise<Game> {
    const game = await this.prisma.game.create({
      data: {
        name: data.name,
        maxPlayers: data.maxPlayers,
        buyIn: data.buyIn,
        smallBlind: data.smallBlind,
        bigBlind: data.bigBlind,
        status: 'WAITING'
      }
    })

    // Add creator as first player
    await this.prisma.gamePlayer.create({
      data: {
        gameId: game.id,
        userId: data.createdBy,
        position: 0,
        chips: data.buyIn,
        isDealer: true,
        isActive: true
      }
    })

    console.log(`🎮 Created new game: ${game.name} (${game.id})`)
    return game
  }

  /**
   * Join a game
   */
  async joinGame(gameId: string, userId: string): Promise<boolean> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { players: true }
    })

    if (!game || game.status !== 'WAITING') {
      return false
    }

    if (game.players.length >= game.maxPlayers) {
      return false
    }

    // Find next available position
    const positions = game.players.map(p => p.position).sort()
    const nextPosition = positions.length > 0 ? Math.max(...positions) + 1 : 0

    await this.prisma.gamePlayer.create({
      data: {
        gameId,
        userId,
        position: nextPosition,
        chips: game.buyIn,
        isActive: true
      }
    })

    console.log(`🎮 User ${userId} joined game ${gameId} at position ${nextPosition}`)
    return true
  }

  /**
   * Start a game
   */
  async startGame(gameId: string): Promise<boolean> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { players: { include: { user: true } } }
    })

    if (!game || game.players.length < 2) {
      return false
    }

    // Update game status
    await this.prisma.game.update({
      where: { id: gameId },
      data: { 
        status: 'PLAYING',
        startedAt: new Date()
      }
    })

    // Create first hand
    await this.createNewHand(gameId)

    console.log(`🎮 Game ${gameId} started with ${game.players.length} players`)
    return true
  }

  /**
   * Create a new hand
   */
  async createNewHand(gameId: string): Promise<Hand> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { players: true, hands: { orderBy: { handNumber: 'desc' }, take: 1 } }
    })

    if (!game) {
      throw new Error('Game not found')
    }

    const handNumber = game.hands.length > 0 ? game.hands[0].handNumber + 1 : 1

    // Create entropy-seeded shuffle
    const entropyHash = await this.generateEntropyHash()

    const hand = await this.prisma.hand.create({
      data: {
        gameId,
        handNumber,
        phase: 'PREFLOP',
        pot: 0,
        communityCards: [],
        entropyHash,
        shuffleTimestamp: new Date()
      }
    })

    // Initialize game engine for this hand
    const settings: GameSettings = {
      smallBlind: game.smallBlind,
      bigBlind: game.bigBlind,
      startingChips: game.buyIn,
      timeBank: 30,
      autoFoldDelay: 10
    }

    const engine = new PokerGameEngine(settings)
    this.gameEngines.set(gameId, engine)

    console.log(`🃏 Created new hand ${handNumber} for game ${gameId}`)
    return hand
  }

  /**
   * Get current game state
   */
  async getGameState(gameId: string): Promise<GameState> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: {
        players: {
          include: { user: true },
          orderBy: { position: 'asc' }
        },
        hands: {
          where: { endedAt: null },
          orderBy: { handNumber: 'desc' },
          take: 1
        }
      }
    })

    if (!game) {
      throw new Error('Game not found')
    }

    const currentHand = game.hands[0] || null

    return {
      game,
      currentHand,
      players: game.players.map(p => ({
        id: p.id,
        userId: p.userId,
        username: p.user.username,
        position: p.position,
        chips: p.chips,
        isDealer: p.isDealer,
        isActive: p.isActive,
        currentBet: 0, // Will be calculated from actions
        lastAction: undefined
      })),
      communityCards: currentHand?.communityCards || [],
      pot: currentHand?.pot || 0,
      currentBet: 0, // Will be calculated from actions
      phase: currentHand?.phase || 'PREFLOP',
      handNumber: currentHand?.handNumber || 0
    }
  }

  /**
   * Handle player action
   */
  async handlePlayerAction(gameId: string, userId: string, action: string, amount?: number): Promise<PlayerActionResult> {
    try {
      // Get current hand
      const currentHand = await this.prisma.hand.findFirst({
        where: { gameId, endedAt: null },
        include: { actions: { orderBy: { timestamp: 'asc' } } }
      })

      if (!currentHand) {
        return { success: false, error: 'No active hand' }
      }

      // Get player
      const player = await this.prisma.gamePlayer.findFirst({
        where: { gameId, userId, isActive: true }
      })

      if (!player) {
        return { success: false, error: 'Player not found' }
      }

      // Record action
      await this.prisma.handAction.create({
        data: {
          handId: currentHand.id,
          userId,
          action: action as PlayerAction,
          amount: amount || 0,
          position: player.position
        }
      })

      // Update hand state based on action
      await this.updateHandState(currentHand.id, action, amount)

      console.log(`🎯 Action recorded: ${userId} -> ${action}${amount ? ` ($${amount})` : ''}`)

      return { success: true }

    } catch (error) {
      console.error('❌ Error handling player action:', error)
      return { success: false, error: 'Failed to process action' }
    }
  }

  /**
   * Update hand state based on action
   */
  private async updateHandState(handId: string, action: string, amount?: number): Promise<void> {
    const hand = await this.prisma.hand.findUnique({
      where: { id: handId },
      include: { actions: { orderBy: { timestamp: 'asc' } } }
    })

    if (!hand) return

    let newPot = hand.pot
    let newPhase = hand.phase

    // Calculate new pot based on action
    if (action === 'BET' || action === 'RAISE' || action === 'CALL') {
      newPot += amount || 0
    }

    // Check if betting round is complete
    const bettingRoundComplete = this.isBettingRoundComplete(hand.actions)
    
    if (bettingRoundComplete) {
      // Advance to next phase
      switch (hand.phase) {
        case 'PREFLOP':
          newPhase = 'FLOP'
          break
        case 'FLOP':
          newPhase = 'TURN'
          break
        case 'TURN':
          newPhase = 'RIVER'
          break
        case 'RIVER':
          newPhase = 'SHOWDOWN'
          break
      }
    }

    // Update hand
    await this.prisma.hand.update({
      where: { id: handId },
      data: {
        pot: newPot,
        phase: newPhase
      }
    })
  }

  /**
   * Check if betting round is complete
   */
  private isBettingRoundComplete(actions: HandAction[]): boolean {
    // Simple logic: if all players have acted and bets are equal
    // This is a simplified version - in production you'd need more complex logic
    return actions.length >= 3 // At least 3 actions (small blind, big blind, first action)
  }

  /**
   * Generate entropy hash for shuffling
   */
  private async generateEntropyHash(): Promise<string> {
    // In production, this would use your entropy-core package
    const timestamp = Date.now()
    const random = Math.random()
    return `entropy_${timestamp}_${random.toString(36)}`
  }

  /**
   * Clean up game engine when hand ends
   */
  async endHand(gameId: string): Promise<void> {
    this.gameEngines.delete(gameId)
    
    await this.prisma.hand.updateMany({
      where: { gameId, endedAt: null },
      data: { endedAt: new Date() }
    })
  }
} 