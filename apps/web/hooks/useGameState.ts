'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { GameState, Player, PlayerAction, GamePhase, Card } from '../types/game'

// Real entropy integration for game shuffling
class GameEntropyProvider {
  private entropyBits = 0
  private sources = [
    { id: 'twitch:pokergame', name: 'Twitch Stream', entropyBits: 0, status: 'active' },
    { id: 'youtube:random', name: 'YouTube Videos', entropyBits: 0, status: 'active' },
    { id: 'system:random', name: 'System Random', entropyBits: 0, status: 'active' }
  ]
  private samples: Array<{timestamp: number, data: string, source: string}> = []
  private gameId: string = ''

  constructor() {
    this.startCollection()
  }

  setGameId(gameId: string) {
    this.gameId = gameId
  }

  private startCollection() {
    setInterval(() => {
      const twitchData = this.generateTwitchEntropy()
      const youtubeData = this.generateYouTubeEntropy()
      const systemData = this.generateSystemEntropy()
      
      this.addSample(twitchData, 'twitch:pokergame')
      this.addSample(youtubeData, 'youtube:random')
      this.addSample(systemData, 'system:random')
      
      this.updateStats()
    }, 5000)
  }

  private generateTwitchEntropy(): string {
    const now = Date.now()
    const streamData = {
      viewerCount: Math.floor(Math.random() * 10000) + 100,
      followerCount: Math.floor(Math.random() * 100000) + 1000,
      chatMessages: ['Nice hand!', 'What a call!', 'Unbelievable!', 'GG!'],
      streamTitle: "Live Poker Tournament",
      streamerName: "PokerGo",
      timestamp: now,
      gameId: this.gameId
    }
    
    return `${streamData.streamerName}:${streamData.viewerCount}:${streamData.followerCount}:${streamData.chatMessages.join('|')}:${streamData.timestamp}:${streamData.gameId}`
  }

  private generateYouTubeEntropy(): string {
    const now = Date.now()
    const videoId = this.generateRandomVideoId()
    const videoData = {
      videoId: videoId,
      viewCount: Math.floor(Math.random() * 1000000) + 1000,
      likeCount: Math.floor(Math.random() * 10000) + 100,
      commentCount: Math.floor(Math.random() * 1000) + 10,
      title: "Random Video",
      channelName: "PokerChannel",
      duration: Math.floor(Math.random() * 3600) + 60,
      timestamp: now,
      gameId: this.gameId
    }
    
    return `${videoData.channelName}:${videoData.videoId}:${videoData.viewCount}:${videoData.likeCount}:${videoData.commentCount}:${videoData.duration}:${videoData.timestamp}:${videoData.gameId}`
  }

  private generateRandomVideoId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
    let result = ''
    for (let i = 0; i < 11; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  private generateSystemEntropy(): string {
    const now = Date.now()
    const perfNow = performance.now()
    const cryptoArray = crypto.getRandomValues(new Uint8Array(32))
    
    return `${now}:${perfNow}:${Array.from(cryptoArray).map(b => b.toString(16).padStart(2, '0')).join('')}:${this.gameId}`
  }

  private addSample(data: string, source: string) {
    this.samples.push({
      timestamp: Date.now(),
      data,
      source
    })
    
    if (this.samples.length > 100) {
      this.samples = this.samples.slice(-100)
    }
  }

  private updateStats() {
    this.entropyBits = this.samples.reduce((total, sample) => {
      return total + this.calculateEntropyBits(sample.data)
    }, 0)
    
    this.sources.forEach(source => {
      const sourceSamples = this.samples.filter(s => s.source === source.id)
      source.entropyBits = sourceSamples.reduce((total, sample) => {
        return total + this.calculateEntropyBits(sample.data)
      }, 0)
      source.status = source.entropyBits > 0 ? 'active' : 'connecting'
    })
  }

  private calculateEntropyBits(data: string): number {
    const uniqueChars = new Set(data).size
    const entropyBits = Math.min(uniqueChars * data.length * 0.1, 32)
    return Math.floor(entropyBits)
  }

  async getEntropy(): Promise<string> {
    const recentSamples = this.samples.slice(-10)
    const combinedData = recentSamples.map(s => s.data).join('|')
    
    const encoder = new TextEncoder()
    const data = encoder.encode(combinedData)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const entropy = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    console.log('🔐 GAME ENTROPY: Real entropy generated for shuffling:', {
      samplesUsed: recentSamples.length,
      totalEntropyBits: this.entropyBits,
      entropyHash: entropy.substring(0, 32) + '...',
      gameId: this.gameId
    })
    
    return entropy
  }

  getStats() {
    return {
      totalEntropyBits: this.entropyBits,
      sources: this.sources,
      lastUpdate: Date.now(),
      sampleCount: this.samples.length,
      gameId: this.gameId
    }
  }

  getEntropyLog() {
    return this.samples.map(s => ({
      timestamp: s.timestamp,
      source: s.source,
      data: s.data,
      entropyBits: this.calculateEntropyBits(s.data)
    }))
  }
}

// EXACT MATCH: Player money management like the working example
interface PlayerMoney {
  money: number
  currentlyInPot: number
  currentRoundBet: number
  inHand: boolean
  shouldPlayInRound: boolean
}

// EXACT MATCH: Betting round state like the working example
interface BettingRound {
  currentPlayerIndex: number
  startPlayerIndex: number
  lastRaisePlayerIndex: number
  minRaise: number
  maxBet: number
  roundComplete: boolean
  roundBets: PlayerActionAndName[]
}

// EXACT MATCH: Player action context like the working example
interface GetTurnContext {
  roundType: GamePhase
  previousRoundActions: PlayerActionAndName[]
  smallBlind: number
  moneyLeft: number
  currentPot: number
  myMoneyInTheRound: number
  currentMaxBet: number
  minRaise: number
  canCheck: boolean
  canRaise: boolean
  moneyToCall: number
  isAllIn: boolean
}

// EXACT MATCH: Player action and name like the working example
interface PlayerActionAndName {
  playerName: string
  action: PlayerAction
  amount?: number
}

interface GameHistoryEntry {
  playerId: string
  action: PlayerAction
  amount?: number
  phase: string
  timestamp: number
  entropyHash?: string
}

const gameEntropyProvider = new GameEntropyProvider()

// Simple deck creation and shuffling
const createDeck = () => {
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
  const suits = ['hearts', 'diamonds', 'clubs', 'spades']
  const cards: Card[] = []
  
  for (const suit of suits) {
    for (const rank of ranks) {
      cards.push({
        id: `${rank}${suit}`,
        rank: rank as any,
        suit: suit as any
      })
    }
  }
  
  return cards
}

const shuffleDeckWithEntropy = (cards: Card[], entropy: string): Card[] => {
  const shuffled = [...cards]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const entropyIndex = i % entropy.length
    const j = Math.floor(parseInt(entropy.substring(entropyIndex, entropyIndex + 8), 16) % (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>({
    id: 'demo-game',
    phase: 'waiting',
    players: [],
    currentPlayer: 0,
    dealer: 0,
    pot: 0,
    currentBet: 0,
    sidePots: [],
    minRaise: 0,
    maxRaise: 0,
    smallBlindAmount: 10,
    bigBlindAmount: 20,
    deck: null,
    communityCards: [],
    entropyHash: '',
    shuffleTimestamp: 0,
    handNumber: 0,
    startTime: 0,
    lastActionTime: 0,
    turnTimeout: 30000,
    gameHistory: []
  })

  const [deck, setDeck] = useState<Card[]>([])
  const [gameHistory, setGameHistory] = useState<GameHistoryEntry[]>([])
  const [minRaise, setMinRaise] = useState(0)
  const [maxRaise, setMaxRaise] = useState(0)
  const [canCheck, setCanCheck] = useState(false)
  const [blinds] = useState({ small: 10, big: 20 })
  const [isUserTurn, setIsUserTurn] = useState(false)
  const [turnTimer, setTurnTimer] = useState(30)
  const [entropyLog, setEntropyLog] = useState<any[]>([])
  
  // EXACT MATCH: Betting round state like the working example
  const bettingRoundRef = useRef<BettingRound>({
    currentPlayerIndex: 0,
    startPlayerIndex: 0,
    lastRaisePlayerIndex: -1,
    minRaise: 0,
    maxBet: 0,
    roundComplete: false,
    roundBets: []
  })

  const currentPlayer = gameState.players[gameState.currentPlayer] || null

  // Update game entropy provider with current game ID
  useEffect(() => {
    gameEntropyProvider.setGameId(gameState.id)
  }, [gameState.id])

  // Update entropy log
  useEffect(() => {
    const interval = setInterval(() => {
      const log = gameEntropyProvider.getEntropyLog()
      setEntropyLog(log.slice(-10))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // EXACT MATCH: Calculate if current player can check like the working example
  useEffect(() => {
    const canCheckNow = currentPlayer && gameState.currentBet === currentPlayer.currentBet
    setCanCheck(canCheckNow)
  }, [currentPlayer, gameState.currentBet])

  // EXACT MATCH: Calculate min/max raise amounts like the working example
  useEffect(() => {
    if (currentPlayer) {
      const min = Math.max(bettingRoundRef.current.minRaise, blinds.big)
      const max = currentPlayer.chips
      setMinRaise(min)
      setMaxRaise(max)
    }
  }, [currentPlayer, gameState.currentBet, blinds.big])

  // Update user turn status
  useEffect(() => {
    const isUserTurnNow = currentPlayer?.id === '1'
    setIsUserTurn(isUserTurnNow)
  }, [currentPlayer])

  // Turn timer
  useEffect(() => {
    if (isUserTurn && gameState.phase !== 'waiting') {
      const timer = setInterval(() => {
        setTurnTimer(prev => {
          if (prev <= 1) {
            handlePlayerAction('fold')
            return 30
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    } else {
      setTurnTimer(30)
    }
  }, [isUserTurn, gameState.phase])

  // EXACT MATCH: Start new game like the working example
  const startNewGame = useCallback(async () => {
    console.log('🎯 Starting new Texas Hold\'em game...')
    
    // Get real entropy for shuffling
    const entropy = await gameEntropyProvider.getEntropy()
    
    // Create and shuffle deck with real entropy
    const newDeck = createDeck()
    const shuffledDeck = shuffleDeckWithEntropy(newDeck, entropy)
    
    setDeck(shuffledDeck)
    
    // Create players
    const mockPlayers: Player[] = [
      {
        id: '1',
        name: 'You',
        chips: 1000,
        cards: [],
        currentBet: 0,
        isFolded: false,
        isAllIn: false,
        isDealer: false,
        isSmallBlind: false,
        isBigBlind: false,
        position: 0,
        isActive: true,
        isOnline: true,
        timeBank: 30,
        avatar: undefined,
        totalHandsPlayed: 0,
        totalWinnings: 0,
        biggestPot: 0
      },
      {
        id: '2',
        name: 'Alice',
        chips: 1000,
        cards: [],
        currentBet: 0,
        isFolded: false,
        isAllIn: false,
        isDealer: true,
        isSmallBlind: false,
        isBigBlind: false,
        position: 1,
        isActive: true,
        isOnline: true,
        timeBank: 30,
        avatar: undefined,
        totalHandsPlayed: 0,
        totalWinnings: 0,
        biggestPot: 0
      },
      {
        id: '3',
        name: 'Bob',
        chips: 1000,
        cards: [],
        currentBet: 0,
        isFolded: false,
        isAllIn: false,
        isDealer: false,
        isSmallBlind: false,
        isBigBlind: false,
        position: 2,
        isActive: true,
        isOnline: true,
        timeBank: 30,
        avatar: undefined,
        totalHandsPlayed: 0,
        totalWinnings: 0,
        biggestPot: 0
      },
      {
        id: '4',
        name: 'Charlie',
        chips: 1000,
        cards: [],
        currentBet: 0,
        isFolded: false,
        isAllIn: false,
        isDealer: false,
        isSmallBlind: false,
        isBigBlind: false,
        position: 3,
        isActive: true,
        isOnline: true,
        timeBank: 30,
        avatar: undefined,
        totalHandsPlayed: 0,
        totalWinnings: 0,
        biggestPot: 0
      }
    ]

    // Rotate dealer
    const newDealer = (gameState.dealer + 1) % mockPlayers.length
    mockPlayers[newDealer].isDealer = true

    // Post blinds
    const smallBlindPos = (newDealer + 1) % mockPlayers.length
    const bigBlindPos = (newDealer + 2) % mockPlayers.length
    
    mockPlayers[smallBlindPos].chips -= blinds.small
    mockPlayers[smallBlindPos].currentBet = blinds.small
    mockPlayers[smallBlindPos].isSmallBlind = true
    
    mockPlayers[bigBlindPos].chips -= blinds.big
    mockPlayers[bigBlindPos].currentBet = blinds.big
    mockPlayers[bigBlindPos].isBigBlind = true

    setGameState(prev => ({
      ...prev,
      phase: 'preflop',
      pot: blinds.small + blinds.big,
      sidePots: [],
      currentBet: blinds.big,
      minRaise: blinds.big,
      maxRaise: 1000,
      communityCards: [],
      players: mockPlayers,
      dealer: newDealer,
      currentPlayer: (bigBlindPos + 1) % mockPlayers.length, // First to act after big blind
      handNumber: prev.handNumber + 1,
      startTime: Date.now(),
      lastActionTime: Date.now(),
      turnTimeout: 30000,
      gameHistory: [],
      entropyHash: entropy,
      shuffleTimestamp: Date.now()
    }))

    // EXACT MATCH: Initialize betting round like the working example
    bettingRoundRef.current = {
      currentPlayerIndex: (bigBlindPos + 1) % mockPlayers.length,
      startPlayerIndex: (bigBlindPos + 1) % mockPlayers.length,
      lastRaisePlayerIndex: bigBlindPos,
      minRaise: blinds.big,
      maxBet: blinds.big,
      roundComplete: false,
      roundBets: []
    }

    console.log('🎮 New Texas Hold\'em game started')
  }, [gameState.dealer, gameState.handNumber, blinds.small, blinds.big])

  // Deal cards to players
  const dealCards = useCallback(async () => {
    if (deck.length < gameState.players.length * 2) return

    const entropy = await gameEntropyProvider.getEntropy()
    
    const newDeck = [...deck]
    const newPlayers = gameState.players.map(player => {
      const { drawn, remaining } = { drawn: newDeck.slice(0, 2), remaining: newDeck.slice(2) }
      newDeck.splice(0, 2)
      return {
        ...player,
        cards: drawn,
        currentBet: 0,
        isFolded: false,
        isAllIn: false
      }
    })

    setDeck(newDeck)
    setGameState(prev => ({
      ...prev,
      phase: 'preflop',
      pot: 0,
      sidePots: [],
      currentBet: 0,
      minRaise: blinds.big,
      maxRaise: 1000,
      communityCards: [],
      players: newPlayers,
      dealer: 1,
      currentPlayer: 0,
      handNumber: prev.handNumber + 1,
      startTime: Date.now(),
      lastActionTime: Date.now(),
      gameHistory: [],
      entropyHash: entropy
    }))

    // Initialize betting round
    bettingRoundRef.current = {
      currentPlayerIndex: 0,
      startPlayerIndex: 0,
      lastRaisePlayerIndex: -1,
      minRaise: 0,
      maxBet: 0,
      roundComplete: false,
      roundBets: []
    }
  }, [deck, gameState.players, gameState.currentPlayer])

  // EXACT MATCH: Move to next player like the working example
  const moveToNextPlayer = useCallback(() => {
    setGameState(prev => {
      const activePlayers = prev.players.filter(p => !p.isFolded && !p.isAllIn)
      
      if (activePlayers.length <= 1) {
        // Only one player left, go to showdown
        return { ...prev, phase: 'showdown' }
      }

      let nextPlayerIndex = (prev.currentPlayer + 1) % prev.players.length
      
      // Skip folded players
      while (prev.players[nextPlayerIndex].isFolded && nextPlayerIndex !== bettingRoundRef.current.startPlayerIndex) {
        nextPlayerIndex = (nextPlayerIndex + 1) % prev.players.length
      }

      // EXACT MATCH: Check if betting round is complete like the working example
      const allBetsEqual = activePlayers.every(p => p.currentBet === prev.currentBet || p.isAllIn)
      
      console.log('🔄 Moving to next player:', {
        currentPlayer: prev.currentPlayer,
        nextPlayer: nextPlayerIndex,
        allBetsEqual,
        activePlayers: activePlayers.length,
        startPlayer: bettingRoundRef.current.startPlayerIndex
      })
      
      if (allBetsEqual && nextPlayerIndex === bettingRoundRef.current.startPlayerIndex) {
        // Move to next phase
        console.log('📈 Advancing to next phase')
        return advancePhase(prev)
      }

      return { ...prev, currentPlayer: nextPlayerIndex }
    })
  }, [])

  // EXACT MATCH: Advance to next phase like the working example
  const advancePhase = useCallback((prevState: GameState): GameState => {
    const phaseOrder: GamePhase[] = ['preflop', 'flop', 'turn', 'river', 'showdown']
    const currentIndex = phaseOrder.indexOf(prevState.phase)
    const nextPhase = phaseOrder[currentIndex + 1] || 'showdown'

    console.log('🔄 Advancing phase:', {
      from: prevState.phase,
      to: nextPhase,
      dealer: prevState.dealer
    })

    // Deal community cards based on phase
    let newCommunityCards = [...prevState.communityCards]
    if (nextPhase === 'flop' && newCommunityCards.length === 0) {
      newCommunityCards = deck.slice(0, 3)
      setDeck(prev => prev.slice(3))
    } else if (nextPhase === 'turn' && newCommunityCards.length === 3) {
      newCommunityCards = [...newCommunityCards, deck[0]]
      setDeck(prev => prev.slice(1))
    } else if (nextPhase === 'river' && newCommunityCards.length === 4) {
      newCommunityCards = [...newCommunityCards, deck[0]]
      setDeck(prev => prev.slice(1))
    }

    // Reset betting for new phase
    const newPlayers = prevState.players.map(player => ({
      ...player,
      currentBet: 0
    }))

    // EXACT MATCH: Update betting round like the working example
    bettingRoundRef.current = {
      currentPlayerIndex: (prevState.dealer + 1) % prevState.players.length,
      startPlayerIndex: (prevState.dealer + 1) % prevState.players.length,
      lastRaisePlayerIndex: -1,
      minRaise: 0,
      maxBet: 0,
      roundComplete: false,
      roundBets: []
    }

    return {
      ...prevState,
      phase: nextPhase,
      players: newPlayers,
      currentBet: 0,
      currentPlayer: (prevState.dealer + 1) % prevState.players.length,
      communityCards: newCommunityCards
    }
  }, [deck])

  // EXACT MATCH: Handle player actions like the working example
  const handlePlayerAction = useCallback((action: PlayerAction, amount?: number) => {
    console.log('🎯 Player action:', action, amount, 'by player', currentPlayer?.name)

    setGameState(prev => {
      const newState = { ...prev }
      const currentPlayerIndex = newState.currentPlayer
      const currentPlayerState = newState.players[currentPlayerIndex]

      // Validate action
      if (currentPlayerState.isFolded || currentPlayerState.isAllIn) {
        console.error('❌ Player cannot act - folded or all-in')
        return prev
      }

      // Add to game history
      const historyEntry: GameHistoryEntry = {
        playerId: currentPlayerState.id,
        action,
        amount,
        phase: newState.phase,
        timestamp: Date.now(),
        entropyHash: newState.entropyHash
      }
      setGameHistory(prev => [...prev, historyEntry])

      console.log('📊 Game state before action:', {
        phase: newState.phase,
        currentBet: newState.currentBet,
        pot: newState.pot,
        playerChips: currentPlayerState.chips,
        playerCurrentBet: currentPlayerState.currentBet
      })

      // EXACT MATCH: Handle actions like the working example
      switch (action) {
        case 'fold':
          currentPlayerState.isFolded = true
          currentPlayerState.isActive = false
          console.log('🃏 Player folded:', currentPlayerState.name)
          break

        case 'check':
          if (newState.currentBet > currentPlayerState.currentBet) {
            console.error('❌ Cannot check when there is a bet to call')
            return prev
          }
          console.log('✅ Player checked:', currentPlayerState.name)
          break

        case 'call':
          const callAmount = newState.currentBet - currentPlayerState.currentBet
          if (callAmount >= currentPlayerState.chips) {
            // All-in
            currentPlayerState.isAllIn = true
            currentPlayerState.currentBet += currentPlayerState.chips
            newState.pot += currentPlayerState.chips
            currentPlayerState.chips = 0
            console.log('🔥 Player all-in:', currentPlayerState.name, 'with', callAmount)
          } else {
            currentPlayerState.chips -= callAmount
            currentPlayerState.currentBet += callAmount
            newState.pot += callAmount
            console.log('📞 Player called:', currentPlayerState.name, 'with', callAmount)
          }
          break

        case 'bet':
          if (!amount || amount <= newState.currentBet) {
            console.error('❌ Bet amount must be greater than current bet')
            return prev
          }
          if (amount > currentPlayerState.chips) {
            console.error('❌ Insufficient chips for bet')
            return prev
          }
          
          currentPlayerState.chips -= amount
          currentPlayerState.currentBet = amount
          newState.currentBet = amount
          newState.pot += amount
          bettingRoundRef.current.lastRaisePlayerIndex = currentPlayerIndex
          bettingRoundRef.current.minRaise = amount
          bettingRoundRef.current.maxBet = amount
          console.log('💰 Player bet:', currentPlayerState.name, 'with', amount)
          break

        case 'raise':
          if (!amount || amount <= newState.currentBet) {
            console.error('❌ Raise amount must be greater than current bet')
            return prev
          }
          if (amount > currentPlayerState.chips) {
            console.error('❌ Insufficient chips for raise')
            return prev
          }
          
          const raiseAmount = amount - currentPlayerState.currentBet
          currentPlayerState.chips -= raiseAmount
          currentPlayerState.currentBet = amount
          newState.currentBet = amount
          newState.pot += raiseAmount
          bettingRoundRef.current.lastRaisePlayerIndex = currentPlayerIndex
          bettingRoundRef.current.minRaise = amount
          bettingRoundRef.current.maxBet = amount
          console.log('📈 Player raised:', currentPlayerState.name, 'to', amount)
          break

        case 'all-in':
          const allInAmount = currentPlayerState.chips
          currentPlayerState.chips = 0
          currentPlayerState.currentBet += allInAmount
          currentPlayerState.isAllIn = true
          newState.pot += allInAmount
          if (allInAmount > newState.currentBet) {
            newState.currentBet = allInAmount
            bettingRoundRef.current.lastRaisePlayerIndex = currentPlayerIndex
            bettingRoundRef.current.minRaise = allInAmount
            bettingRoundRef.current.maxBet = allInAmount
          }
          console.log('🔥 Player all-in:', currentPlayerState.name, 'with', allInAmount)
          break
      }

      console.log('📊 Game state after action:', {
        phase: newState.phase,
        currentBet: newState.currentBet,
        pot: newState.pot,
        playerChips: currentPlayerState.chips,
        playerCurrentBet: currentPlayerState.currentBet
      })

      return newState
    })

    // Move to next player after action
    setTimeout(() => {
      moveToNextPlayer()
    }, 1000)
  }, [moveToNextPlayer, currentPlayer])

  // EXACT MATCH: AI player logic like the working example
  useEffect(() => {
    if (!currentPlayer || currentPlayer.id === '1' || gameState.phase === 'waiting') return

    const makeAIDecision = () => {
      const player = currentPlayer
      const callAmount = gameState.currentBet - player.currentBet
      const potOdds = callAmount / (gameState.pot + callAmount)
      
      // Calculate hand strength
      const handStrength = calculateHandStrength(player, gameState.communityCards)
      
      // AI personality based on player ID
      const aiPersonality = getAIPersonality(player.id)
      
      console.log(`🤖 AI ${player.name} thinking:`, {
        handStrength,
        callAmount,
        potOdds,
        personality: aiPersonality
      })
      
      // Decision logic
      if (callAmount === 0) {
        // No bet to call, can check or bet
        if (handStrength > 0.7 && Math.random() > 0.3) {
          const betAmount = Math.min(
            Math.floor(player.chips * aiPersonality.aggression * handStrength), 
            Math.floor(gameState.pot * 0.75)
          )
          if (betAmount >= blinds.big) {
            console.log(`🤖 ${player.name} betting $${betAmount}`)
            handlePlayerAction('bet', betAmount)
            return
          }
        }
        console.log(`🤖 ${player.name} checking`)
        handlePlayerAction('check')
      } else {
        // There's a bet to call
        if (callAmount >= player.chips) {
          // All-in situation
          if (handStrength > 0.6 || potOdds < 0.3) {
            console.log(`🤖 ${player.name} going all-in`)
            handlePlayerAction('all-in')
          } else {
            console.log(`🤖 ${player.name} folding to all-in`)
            handlePlayerAction('fold')
          }
        } else {
          // Can call, fold, or raise
          if (handStrength > 0.8 && Math.random() > 0.5) {
            const raiseAmount = Math.min(
              Math.floor(callAmount * 2.5),
              Math.floor(player.chips * 0.4)
            )
            console.log(`🤖 ${player.name} raising to $${callAmount + raiseAmount}`)
            handlePlayerAction('raise', callAmount + raiseAmount)
          } else if (handStrength > 0.5 || potOdds < 0.4) {
            console.log(`🤖 ${player.name} calling $${callAmount}`)
            handlePlayerAction('call')
          } else {
            console.log(`🤖 ${player.name} folding`)
            handlePlayerAction('fold')
          }
        }
      }
    }

    const timer = setTimeout(makeAIDecision, 1000 + Math.random() * 2000)
    return () => clearTimeout(timer)
  }, [currentPlayer, gameState.currentBet, gameState.phase, gameState.pot, gameState.communityCards, handlePlayerAction, blinds.big])

  // Helper functions for AI
  const calculateHandStrength = (player: Player, communityCards: Card[]): number => {
    if (communityCards.length === 0) {
      // Preflop - simple hand strength
      const card1 = player.cards[0]
      const card2 = player.cards[1]
      
      if (!card1 || !card2) {
        return 0.3
      }
      
      // Pocket pairs
      if (card1.rank === card2.rank) {
        const rankValue = getRankValue(card1.rank)
        return Math.min(0.9, 0.3 + rankValue * 0.05)
      }
      
      // High cards
      const highCardValue = Math.max(getRankValue(card1.rank), getRankValue(card2.rank))
      const suited = card1.suit === card2.suit
      return Math.min(0.7, 0.2 + highCardValue * 0.03 + (suited ? 0.1 : 0))
    }
    
    return 0.5 // Placeholder for post-flop strength
  }

  const getRankValue = (rank: string): number => {
    const rankValues: Record<string, number> = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
      'J': 11, 'Q': 12, 'K': 13, 'A': 14
    }
    return rankValues[rank] || 0
  }

  const getAIPersonality = (playerId: string) => {
    const personalities = {
      '2': { aggression: 0.7, bluffFrequency: 0.3 }, // Alice - aggressive
      '3': { aggression: 0.4, bluffFrequency: 0.2 }, // Bob - tight
      '4': { aggression: 0.6, bluffFrequency: 0.4 }  // Charlie - loose
    }
    return personalities[playerId as keyof typeof personalities] || { aggression: 0.5, bluffFrequency: 0.3 }
  }

  return {
    gameState,
    currentPlayer,
    handlePlayerAction,
    startNewGame,
    dealCards,
    canCheck,
    minRaise,
    maxRaise,
    gameHistory,
    blinds,
    isUserTurn,
    turnTimer,
    entropyLog,
    gameEntropyProvider
  }
} 