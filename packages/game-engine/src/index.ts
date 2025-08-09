import { GameState, Player, PlayerAction, GamePhase, Card, GameSettings } from './types'
import { CardUtils } from './card'
import { EntropyShuffler } from './simple-shuffler'
import { HandEvaluator } from './hand-evaluator'

// Game State Schema
interface GameStateSchema {
  // Core game state
  phase: GamePhase
  handNumber: number
  pot: number
  currentBet: number
  minRaise: number
  smallBlind: number
  bigBlind: number
  
  // Player management
  players: Player[]
  currentPlayerIndex: number
  dealerIndex: number
  
  // Deck and cards
  deck: Card[]
  communityCards: Card[]
  
  // Hand results
  winners?: Player[]
  winningHand?: string
  lastAction?: {
    playerId: string
    action: PlayerAction
    amount?: number
  }
}

export class PokerGameEngine {
  private state: GameStateSchema
  private shuffler: EntropyShuffler
  private settings: GameSettings

  constructor(settings: GameSettings) {
    this.settings = settings
    this.shuffler = new EntropyShuffler()
    
    this.state = {
      players: [],
      communityCards: [],
      pot: 0,
      currentBet: 0,
      phase: 'waiting',
      handNumber: 0,
      dealerIndex: 0,
      currentPlayerIndex: 0,
      smallBlind: settings.smallBlind,
      bigBlind: settings.bigBlind,
      minRaise: settings.bigBlind,
      deck: []
    }
  }

  /**
   * Start a new game with the given players
   */
  async startNewGame(players: Omit<Player, 'cards' | 'bet' | 'folded' | 'allIn' | 'isDealer' | 'isSmallBlind' | 'isBigBlind' | 'isCurrentPlayer' | 'lastAction' | 'timeBank'>[]): Promise<GameState> {
    if (players.length < 2) {
      throw new Error('Need at least 2 players to start a game')
    }

    console.log('🎮 GAME ENGINE: Starting new game with entropy shuffling')

    // Initialize players with proper state
    this.state.players = players.map((player, index) => ({
      ...player,
      cards: [],
      bet: 0,
      folded: false,
      allIn: false,
      isDealer: index === 0,
      isSmallBlind: index === 1,
      isBigBlind: index === 2,
      isCurrentPlayer: false,
      lastAction: undefined,
      timeBank: this.settings.timeBank
    }))

    // Start first hand
    await this.startNewHand()
    
    return this.getState()
  }

  /**
   * Start a new hand (for continuous play)
   */
  public async startNewHand(): Promise<GameState> {
    console.log('🔄 GAME ENGINE: Starting new hand...')
    
    // Rotate dealer
    this.state.dealerIndex = (this.state.dealerIndex + 1) % this.state.players.length
    
    // Reset all players for new hand
    this.state.players.forEach((player, index) => {
      player.cards = []
      player.bet = 0
      player.folded = false
      player.allIn = false
      player.lastAction = undefined
      player.isDealer = index === this.state.dealerIndex
      player.isSmallBlind = index === (this.state.dealerIndex + 1) % this.state.players.length
      player.isBigBlind = index === (this.state.dealerIndex + 2) % this.state.players.length
    })

    // Create and shuffle new deck
    const { deck, seed } = await this.shuffler.createAndShuffleDeck()
    this.state.deck = deck

    // Reset game state for new hand
    this.state.communityCards = []
    this.state.pot = 0
    this.state.currentBet = 0
    this.state.minRaise = this.settings.bigBlind
    this.state.winners = undefined
    this.state.winningHand = undefined
    this.state.lastAction = undefined
    
    console.log('🔄 GAME ENGINE: Reset game state for new hand:', {
      communityCards: this.state.communityCards.length,
      pot: this.state.pot,
      phase: this.state.phase
    })

    // Deal cards to players
    this.dealCards()

    // Post blinds
    this.postBlinds()

    // Start preflop
    this.state.phase = 'preflop'
    this.state.handNumber++
    this.state.currentPlayerIndex = this.getNextActivePlayerIndex(2) // Start after big blind

    console.log('🔄 GAME ENGINE: New hand started:', {
      handNumber: this.state.handNumber,
      phase: this.state.phase,
      dealer: this.state.players[this.state.dealerIndex].name,
      currentPlayer: this.state.players[this.state.currentPlayerIndex].name,
      pot: this.state.pot
    })

    return this.getState()
  }

  /**
   * Post small and big blinds
   */
  private postBlinds(): void {
    const smallBlindPlayer = this.state.players.find(p => p.isSmallBlind)
    const bigBlindPlayer = this.state.players.find(p => p.isBigBlind)

    if (smallBlindPlayer) {
      const smallBlindAmount = Math.min(this.settings.smallBlind, smallBlindPlayer.chips)
      smallBlindPlayer.chips -= smallBlindAmount
      smallBlindPlayer.bet = smallBlindAmount
      this.state.pot += smallBlindAmount
      console.log(`💰 GAME ENGINE: ${smallBlindPlayer.name} posted small blind: $${smallBlindAmount}`)
    }

    if (bigBlindPlayer) {
      const bigBlindAmount = Math.min(this.settings.bigBlind, bigBlindPlayer.chips)
      bigBlindPlayer.chips -= bigBlindAmount
      bigBlindPlayer.bet = bigBlindAmount
      this.state.pot += bigBlindAmount
      this.state.currentBet = bigBlindAmount
      console.log(`💰 GAME ENGINE: ${bigBlindPlayer.name} posted big blind: $${bigBlindAmount}`)
    }

    console.log(`💰 GAME ENGINE: Blinds posted, pot: $${this.state.pot}, current bet: $${this.state.currentBet}`)
  }

  /**
   * Handle a player action
   */
  handlePlayerAction(playerId: string, action: PlayerAction, amount?: number): GameState {
    console.log(`🎯 GAME ENGINE: handlePlayerAction called with:`, { playerId, action, amount })
    
    const player = this.state.players.find(p => p.id === playerId)
    if (!player) {
      throw new Error(`Player ${playerId} not found`)
    }

    console.log(`🎯 GAME ENGINE: Found player: ${player.name}, folded: ${player.folded}, allIn: ${player.allIn}`)

    if (player.folded || player.allIn) {
      throw new Error(`Player ${playerId} cannot act (folded or all-in)`)
    }

    // Validate action
    this.validateAction(player, action, amount)

    // Execute action
    this.executeAction(player, action, amount)

    // Move to next player or next phase
    this.advanceGame()

    const newState = this.getState()
    console.log(`🎯 GAME ENGINE: Returning new state:`, {
      phase: newState.phase,
      pot: newState.pot,
      currentPlayer: newState.players[newState.currentPlayerIndex]?.name,
      currentPlayerIndex: newState.currentPlayerIndex
    })

    return newState
  }

  /**
   * Validate if an action is legal
   */
  private validateAction(player: Player, action: PlayerAction, amount?: number): void {
    const canCheck = player.bet === this.state.currentBet
    const callAmount = this.state.currentBet - player.bet

    switch (action) {
      case 'fold':
        // Always valid
        break
      case 'check':
        if (!canCheck) {
          throw new Error('Cannot check when there is a bet to call')
        }
        break
      case 'call':
        if (callAmount > player.chips) {
          throw new Error('Not enough chips to call')
        }
        break
      case 'bet':
      case 'raise':
        if (!amount || amount <= 0) {
          throw new Error('Bet/raise amount must be positive')
        }
        if (amount > player.chips) {
          throw new Error('Not enough chips for this bet/raise')
        }
        if (action === 'raise' && amount <= this.state.currentBet) {
          throw new Error('Raise must be higher than current bet')
        }
        break
      case 'allIn':
        // Always valid
        break
      default:
        throw new Error(`Unknown action: ${action}`)
    }
  }

  /**
   * Execute a player action
   */
  private executeAction(player: Player, action: PlayerAction, amount?: number): void {
    console.log(`🎯 GAME ENGINE: ${player.name} executing action:`, { action, amount, currentBet: this.state.currentBet, playerBet: player.bet })
    
    switch (action) {
      case 'fold':
        player.folded = true
        console.log(`🎯 GAME ENGINE: ${player.name} folded`)
        break
      case 'check':
        console.log(`🎯 GAME ENGINE: ${player.name} checked`)
        break
      case 'call':
        const callAmount = this.state.currentBet - player.bet
        player.chips -= callAmount
        player.bet = this.state.currentBet
        this.state.pot += callAmount
        console.log(`🎯 GAME ENGINE: ${player.name} called ${callAmount}, pot now ${this.state.pot}`)
        break
      case 'bet':
      case 'raise':
        if (amount) {
          player.chips -= amount
          player.bet += amount
          this.state.pot += amount
          this.state.currentBet = player.bet
          this.state.minRaise = amount
          console.log(`🎯 GAME ENGINE: ${player.name} ${action === 'bet' ? 'bet' : 'raised'} ${amount}, pot now ${this.state.pot}, current bet ${this.state.currentBet}`)
        }
        break
      case 'allIn':
        const allInAmount = player.chips
        player.chips = 0
        player.bet += allInAmount
        this.state.pot += allInAmount
        player.allIn = true
        if (player.bet > this.state.currentBet) {
          this.state.currentBet = player.bet
        }
        console.log(`🎯 GAME ENGINE: ${player.name} went all-in with ${allInAmount}, pot now ${this.state.pot}`)
        break
    }

    player.lastAction = action
    this.state.lastAction = { playerId: player.id, action, amount }
  }

  /**
   * Advance the game to the next player or phase
   */
  private advanceGame(): void {
    // Check if only one player remains (others folded)
    const activePlayers = this.state.players.filter(p => !p.folded && !p.allIn)
    
    console.log('🔄 GAME ENGINE: Advancing game:', {
      activePlayers: activePlayers.length,
      totalPlayers: this.state.players.length,
      phase: this.state.phase,
      currentPlayer: this.state.players[this.state.currentPlayerIndex].name
    })
    
    if (activePlayers.length <= 1) {
      // Only one player left, go directly to showdown
      console.log('🏆 GAME ENGINE: Only one player remaining, going to showdown')
      this.showdown()
      return
    }

    // Move to next player
    this.state.currentPlayerIndex = this.getNextActivePlayerIndex(this.state.currentPlayerIndex)

    // Check if betting round is complete
    if (this.isBettingRoundComplete()) {
      console.log('✅ GAME ENGINE: Betting round complete, waiting for manual phase advancement')
      // Don't auto-advance phases - let UI handle it manually
    }
  }

  /**
   * Check if the current betting round is complete
   */
  private isBettingRoundComplete(): boolean {
    const activePlayers = this.state.players.filter(p => !p.folded && !p.allIn)
    if (activePlayers.length <= 1) return true

    // Check if all active players have acted and bets are equal
    const allBetsEqual = activePlayers.every(p => p.bet === this.state.currentBet)
    const allPlayersActed = activePlayers.every(p => p.lastAction)

    console.log('🔍 GAME ENGINE: Checking betting round completion:', {
      activePlayers: activePlayers.length,
      allBetsEqual,
      allPlayersActed,
      currentBet: this.state.currentBet,
      playerBets: activePlayers.map(p => ({ name: p.name, bet: p.bet }))
    })

    return allBetsEqual && allPlayersActed
  }

  /**
   * Advance to the next game phase
   */
  private advancePhase(): void {
    switch (this.state.phase) {
      case 'preflop':
        this.dealFlop()
        break
      case 'flop':
        this.dealTurn()
        break
      case 'turn':
        this.dealRiver()
        break
      case 'river':
        this.showdown()
        break
      default:
        throw new Error(`Cannot advance from phase: ${this.state.phase}`)
    }
  }

  /**
   * Deal the flop (first 3 community cards)
   */
  public dealFlop(): void {
    if (this.state.phase !== 'preflop') {
      throw new Error('Can only deal flop in preflop phase')
    }

    const { cards, remainingDeck } = this.shuffler.dealCards(this.state.deck, 3)
    this.state.communityCards = cards
    this.state.deck = remainingDeck
    this.state.phase = 'flop'

    console.log('🃏 GAME ENGINE: Dealt flop:', {
      cards: cards.map(c => `${c.rank}${c.suit}`),
      remainingDeck: remainingDeck.length
    })

    this.resetBettingRound()
  }

  /**
   * Deal the turn (4th community card)
   */
  public dealTurn(): void {
    if (this.state.phase !== 'flop') {
      throw new Error('Can only deal turn in flop phase')
    }

    const { cards, remainingDeck } = this.shuffler.dealCards(this.state.deck, 1)
    this.state.communityCards.push(...cards)
    this.state.deck = remainingDeck
    this.state.phase = 'turn'

    console.log('🃏 GAME ENGINE: Dealt turn:', {
      card: cards[0] ? `${cards[0].rank}${cards[0].suit}` : 'none',
      remainingDeck: remainingDeck.length
    })

    this.resetBettingRound()
  }

  /**
   * Deal the river (5th community card)
   */
  public dealRiver(): void {
    if (this.state.phase !== 'turn') {
      throw new Error('Can only deal river in turn phase')
    }

    const { cards, remainingDeck } = this.shuffler.dealCards(this.state.deck, 1)
    this.state.communityCards.push(...cards)
    this.state.deck = remainingDeck
    this.state.phase = 'river'

    console.log('🃏 GAME ENGINE: Dealt river:', {
      card: cards[0] ? `${cards[0].rank}${cards[0].suit}` : 'none',
      remainingDeck: remainingDeck.length
    })

    this.resetBettingRound()
  }

  /**
   * Reset betting round for new phase
   */
  private resetBettingRound(): void {
    console.log('🔄 GAME ENGINE: Resetting betting round for new phase')
    
    this.state.currentBet = 0
    this.state.minRaise = this.settings.bigBlind
    this.state.currentPlayerIndex = this.getNextActivePlayerIndex(this.state.dealerIndex)

    // Reset player bets for new round
    this.state.players.forEach(player => {
      player.bet = 0
      player.lastAction = undefined
    })
    
    console.log('🔄 GAME ENGINE: Betting round reset:', {
      currentBet: this.state.currentBet,
      minRaise: this.state.minRaise,
      currentPlayer: this.state.players[this.state.currentPlayerIndex].name
    })
  }

  /**
   * Determine winners and award pot
   */
  private showdown(): void {
    const activePlayers = this.state.players.filter(p => !p.folded)
    
    console.log('🏆 GAME ENGINE: Starting showdown:', {
      activePlayers: activePlayers.map(p => ({ name: p.name, cards: p.cards.map(c => `${c.rank}${c.suit}`) })),
      communityCards: this.state.communityCards.map(c => `${c.rank}${c.suit}`),
      pot: this.state.pot
    })

    if (activePlayers.length === 1) {
      // Only one player left, they win
      console.log('🏆 GAME ENGINE: Single player wins by default')
      this.awardPot([activePlayers[0]])
    } else {
      // Evaluate hands
      const playerHands = activePlayers.map(player => {
        const hand = HandEvaluator.evaluateHand(player.cards, this.state.communityCards)
        console.log(`🎯 GAME ENGINE: ${player.name} hand:`, {
          cards: player.cards.map(c => `${c.rank}${c.suit}`),
          hand: hand.name,
          rank: hand.rank
        })
        return { player, hand }
      })

      // Find winners
      const winners = this.findWinners(playerHands)
      console.log('🏆 GAME ENGINE: Winners determined:', winners.map(w => w.name))
      this.awardPot(winners)
    }

    this.state.phase = 'handComplete'
    console.log('✅ GAME ENGINE: Hand complete, phase set to handComplete')
  }

  /**
   * Find the winning players
   */
  private findWinners(playerHands: Array<{ player: Player; hand: any }>): Player[] {
    if (playerHands.length === 0) return []

    // Sort by hand rank (higher is better)
    playerHands.sort((a, b) => b.hand.rank - a.hand.rank)

    const bestRank = playerHands[0].hand.rank
    const winners = playerHands.filter(ph => ph.hand.rank === bestRank).map(ph => ph.player)

    return winners
  }

  /**
   * Award pot to winners
   */
  private awardPot(winners: Player[]): void {
    if (winners.length === 0) return

    const potPerWinner = Math.floor(this.state.pot / winners.length)
    const remainder = this.state.pot % winners.length
    
    winners.forEach((winner, index) => {
      // Give remainder to first winner
      const amount = potPerWinner + (index === 0 ? remainder : 0)
      winner.chips += amount
      console.log(`💰 GAME ENGINE: ${winner.name} awarded ${amount} chips`)
    })

    console.log('🏆 GAME ENGINE: Pot awarded:', {
      winners: winners.map(w => w.name),
      potAmount: this.state.pot,
      potPerWinner: potPerWinner,
      remainder: remainder
    })

    // Store winners for state
    this.state.winners = winners
    this.state.winningHand = winners.length > 0 ? winners[0].name : undefined

    this.state.pot = 0
  }

  /**
   * Get the next active player index
   */
  private getNextActivePlayerIndex(currentIndex: number): number {
    let nextIndex = (currentIndex + 1) % this.state.players.length
    let attempts = 0

    while (attempts < this.state.players.length) {
      const player = this.state.players[nextIndex]
      if (!player.folded && !player.allIn) {
        return nextIndex
      }
      nextIndex = (nextIndex + 1) % this.state.players.length
      attempts++
    }

    return currentIndex // Fallback
  }

  /**
   * Update the current player
   */
  private updateCurrentPlayer(): void {
    this.state.players.forEach((player, index) => {
      player.isCurrentPlayer = index === this.state.currentPlayerIndex
    })
  }

  /**
   * Deal cards to players
   */
  dealCards(): void {
    console.log('🎴 GAME ENGINE: Starting to deal cards, deck size:', this.state.deck.length)
    
    this.state.players.forEach((player, index) => {
      const { cards, remainingDeck } = this.shuffler.dealCards(this.state.deck, 2)
      player.cards = cards
      this.state.deck = remainingDeck
      
      console.log(`🎴 GAME ENGINE: Dealt to ${player.name}:`, {
        cards: cards.map(c => `${c.rank}${c.suit}`),
        remainingDeck: remainingDeck.length
      })
    })

    console.log('🎴 GAME ENGINE: All cards dealt, final deck size:', this.state.deck.length)
  }

  /**
   * Get the current game state
   */
  getState(): GameState {
    this.updateCurrentPlayer()
    return { ...this.state }
  }

  /**
   * Get entropy statistics
   */
  getEntropyStats() {
    return this.shuffler.getEntropyStats()
  }
}

// Export all the utilities and types
export { CardUtils } from './card'
export { EntropyShuffler } from './simple-shuffler'
export { HandEvaluator } from './hand-evaluator'
export * from './types' 